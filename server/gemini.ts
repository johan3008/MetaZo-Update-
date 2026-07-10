import { GoogleGenAI, Type } from "@google/genai";
import { AsyncLocalStorage } from "node:async_hooks";
import { StockMetadata, ToolType, VideoAnalysisResult, VideoPrompt } from "../types";
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO } from "../constants";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Thread-safe dynamic API Key storage
export const apiKeyStorage = new AsyncLocalStorage<any>();

const CACHE_FILE_PATH = path.join(process.cwd(), "qa_reports_cache.json");
let qaCacheMap: Map<string, any> = new Map();

function loadQACache() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const content = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const obj = JSON.parse(content);
      qaCacheMap = new Map(Object.entries(obj));
      console.log(`[QA Cache] Loaded ${qaCacheMap.size} cached reports successfully.`);
    }
  } catch (err) {
    console.warn("[QA Cache] Error loading cache file, starting fresh:", err);
  }
}

function saveQACache() {
  try {
    const obj = Object.fromEntries(qaCacheMap.entries());
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("[QA Cache] Error saving cache file:", err);
  }
}

// Initialize cache load
loadQACache();

// Load environment variables dynamically from local .env file
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let val = trimmed.slice(index + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
    console.log("[ENV LOAD] Loaded custom configurations from workspace .env file.");
  }
} catch (e) {
  console.warn("[ENV LOAD WARNING] Could not read .env file:", e);
}

// Initialize lazy backend Google GenAI SDK.
let aiClient: GoogleGenAI | null = null;

const getBluesmindsEndpoint = (): string => {
  const envVal = process.env.BLUESMINDS_API_ENDPOINT;
  if (!envVal || !envVal.trim()) {
    return 'https://api.bluesminds.com/v1/chat/completions';
  }
  let base = envVal.trim();
  if (base.endsWith('/chat/completions')) {
    return base;
  }
  if (base.endsWith('/chat/completions/')) {
    return base.slice(0, -1);
  }
  if (base.endsWith('/v1')) {
    return `${base}/chat/completions`;
  }
  if (base.endsWith('/v1/')) {
    return `${base}chat/completions`;
  }
  if (base.endsWith('/')) {
    return `${base}v1/chat/completions`;
  }
  return `${base}/v1/chat/completions`;
};

const PROVIDER_ENDPOINTS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  blackbox: 'https://api.blackbox.ai/v1/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
  bluesminds: getBluesmindsEndpoint(),
  aivene: 'https://api.aivene.com/v1/chat/completions',
};

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
  mistral: 'pixtral-12b',
  openai: 'gpt-4o-mini',
  openrouter: 'google/gemini-2.0-flash-001',
  blackbox: 'blackboxai',
  nvidia: 'meta/llama-3.3-70b-instruct',
  bluesminds: 'gpt-4o',
  aivene: 'gpt-4o-mini',
};

const PROVIDER_FALLBACK_MODELS: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-large-latest',
  openai: 'gpt-4o',
  openrouter: 'anthropic/claude-3.5-haiku',
  blackbox: 'blackboxai-pro',
  nvidia: 'meta/llama-3.1-70b-instruct',
  bluesminds: 'gpt-4o',
  aivene: 'gpt-4o-mini',
};

// Provider yang reliable mendukung response_format: json_object
const SUPPORTS_JSON_MODE = new Set(['groq', 'mistral', 'openai', 'openrouter', 'nvidia', 'bluesminds', 'aivene']);

const PROVIDER_ENV_KEYS: Record<string, string> = {
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  blackbox: 'BLACKBOX_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
  bluesminds: 'BLUESMINDS_API_KEY',
  aivene: 'AIVENE_API_KEY',
};

const NON_GEMINI_PROVIDERS = new Set(['groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'bluesminds', 'aivene']);

/**
 * Ekstrak JSON yang valid dari teks response, toleran terhadap:
 * - markdown code fences (```json ... ```)
 * - teks pengantar/penutup di luar JSON
 * - whitespace ekstra
 */
function extractJSON(raw: string): string {
  if (!raw) return "{}";
  
  // Try direct parse first
  try {
    const trimmed = raw.trim();
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {}

  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  // Robust extraction: find the first { or [ and the last matching } or ]
  // If it fails to parse, try to find the next { or [
  const tryExtract = (opener: string, closer: string): string | null => {
    let startIdx = 0;
    while ((startIdx = cleaned.indexOf(opener, startIdx)) !== -1) {
      let endIdx = cleaned.lastIndexOf(closer);
      while (endIdx > startIdx) {
        const potential = cleaned.slice(startIdx, endIdx + 1);
        try {
          JSON.parse(potential);
          return potential;
        } catch (e) {
          // Try a smaller window from the end
          endIdx = cleaned.lastIndexOf(closer, endIdx - 1);
        }
      }
      startIdx++;
    }
    return null;
  };

  // Prioritize objects {} as they are more common in our pipeline
  const objectMatch = tryExtract('{', '}');
  if (objectMatch) return objectMatch;

  const arrayMatch = tryExtract('[', ']');
  if (arrayMatch) return arrayMatch;

  return "{}";
}

const COLOR_KEYWORDS = new Set([
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey', 'gold', 'silver', 'bronze', 
  'violet', 'indigo', 'cyan', 'magenta', 'teal', 'navy', 'beige', 'charcoal', 'cream', 'peach', 'lavender', 'turquoise', 'emerald', 'ruby', 
  'amber', 'olive', 'coral', 'crimson', 'scarlet', 'maroon', 'plum', 'ivory', 'mustard', 'khaki', 'mint', 'lime', 'tan', 'mauve', 'pastel'
]);

const PROHIBITED_KEYWORDS_SET = new Set([
  'apple', 'iphone', 'ipad', 'macbook', 'mac', 'ios', 'android', 'microsoft', 'windows', 'xbox', 'playstation', 
  'sony', 'samsung', 'nike', 'adidas', 'gucci', 'rolex', 'cocacola', 'coca-cola', 'pepsi', 'starbucks', 'amazon', 
  'google', 'meta', 'facebook', 'instagram', 'twitter', 'tiktok', 'netflix', 'disney', 'marvel', 'canon', 'nikon', 
  'adobe', 'shutterstock', 'getty', 'midjourney', 'firefly', 'stablediffusion', 'dalle', 'llama', 'chatgpt', 'openai',
  'instagram', 'youtube', 'whatsapp', 'brand', 'trademark', 'logo', 'copyright', 'intellectual', 'property'
]);

/**
 * Checks if a word is a prohibited brand, IP, standard name, or contains a color.
 */
function isProhibitedKeyword(word: string): boolean {
  if (!word) return true;
  const lower = word.toLowerCase().trim();
  if (PROHIBITED_KEYWORDS_SET.has(lower)) return true;
  
  // Exclude keywords containing color names
  const parts = lower.split(/[\s-_]+/);
  if (parts.some(part => COLOR_KEYWORDS.has(part))) {
    return true;
  }
  
  return false;
}

function getHeuristicCategories(title: string, keywords: string[]): {
  category_id: number;
  shutterstock_category_1: string;
  shutterstock_category_2: string;
} {
  const t = String(title || "").toLowerCase();
  const kList = (keywords || []).map(x => String(x).toLowerCase());

  // Helper to count matches in title + keywords
  const countMatches = (terms: string[]): number => {
    let score = 0;
    terms.forEach(term => {
      if (t.includes(term)) score += 5; // title word matches get higher weight
      kList.forEach(k => {
        if (k === term || k.includes(term)) score += 1;
      });
    });
    return score;
  };

  const categoryScores: Record<number, number> = {};

  // Keywords patterns for each Adobe Category
  const patterns: Record<number, string[]> = {
    1: ['animal', 'cat', 'dog', 'pet', 'wildlife', 'bird', 'fish', 'monkey', 'lion', 'tiger', 'bear', 'insect', 'reptilian', 'creature', 'beast', 'fauna', 'mammal', 'species', 'wilderness', 'habitat', 'furry', 'adorable', 'close-up', 'environment', 'wild', 'zoology'],
    2: ['architecture', 'building', 'structure', 'house', 'room', 'office', 'home', 'tower', 'bridge', 'monument', 'museum', 'interior', 'exterior', 'floor', 'window', 'wall', 'door', 'facade', 'construction', 'metropolis', 'tower', 'estate'],
    3: ['business', 'corporate', 'office', 'money', 'chart', 'graph', 'marketing', 'manager', 'meeting', 'resume', 'professional', 'work', 'job', 'finance', 'desk', 'computer', 'presentation', 'leadership', 'organization', 'colleague', 'career', 'investment', 'growth'],
    4: ['drink', 'beverage', 'coffee', 'tea', 'wine', 'beer', 'juice', 'glass', 'cup', 'mug', 'bottle', 'liquid', 'cocktail', 'draft', 'soda'],
    5: ['environment', 'eco', 'recycle', 'green', 'sustainability', 'recycle', 'conservation', 'earth', 'planet', 'wind', 'solar', 'climate', 'environmental', 'organic'],
    6: ['emotion', 'mood', 'feeling', 'happy', 'sad', 'angry', 'conceptual', 'thought', 'brain', 'mind', 'stress', 'focus', 'psychology', 'attitude', 'behavior', 'expression', 'abstract', 'idea', 'sensation'],
    7: ['food', 'dish', 'meal', 'kitchen', 'restaurant', 'dining', 'plate', 'chef', 'fruit', 'vegetable', 'meat', 'dessert', 'cake', 'bread', 'pancake', 'pizza', 'burger', 'fast food', 'dinner', 'breakfast', 'lunch', 'sweet', 'cream', 'baked', 'cookies', 'sugar', 'cuisine', 'gourmet', 'culinary', 'recipe', 'diet'],
    8: ['logo', 'icon', 'frame', 'template', 'banner', 'layout', 'sticker', 'elements', 'background', 'wallpaper', 'texture', 'pattern', 'asset', 'backdrop', 'seamless', 'infographic', 'chart', 'presentation'],
    9: ['hobby', 'leisure', 'play', 'game', 'guitar', 'music', 'movie', 'craft', 'book', 'read', 'garden', 'recreation', 'activity', 'fun', 'pastime', 'indoor', 'enjoyment'],
    10: ['industrial', 'factory', 'manufacturing', 'machine', 'worker', 'equipment', 'facility', 'metal', 'power', 'warehouse', 'technical', 'automated', 'construction', 'engineering', 'machinery'],
    11: ['landscape', 'mountain', 'sea', 'beach', 'ocean', 'lake', 'river', 'forest', 'desert', 'valley', 'sunrise', 'sunset', 'nature', 'view', 'panorama', 'scenery', 'scenic', 'vista', 'sky', 'horizon'],
    12: ['lifestyle', 'life', 'daily', 'routine', 'casual', 'luxury', 'habits', 'comfort', 'domestic', 'style', 'casual', 'wellness', 'health', 'fitness'],
    13: ['person', 'people', 'human', 'man', 'woman', 'crowd', 'family', 'child', 'baby', 'girl', 'boy', 'group', 'face', 'hand', 'arm', 'leg', 'foot', 'pose', 'portrait', 'individual', 'young', 'adult', 'interaction', 'relationship'],
    14: ['plant', 'flower', 'tree', 'leaf', 'garden', 'grass', 'rose', 'floral', 'botany', 'botanical', 'moss', 'herbal', 'seeds', 'blossom', 'petal', 'growth', 'stem', 'vegetation', 'spring', 'summer'],
    15: ['culture', 'religion', 'traditional', 'church', 'temple', 'mosque', 'cross', 'holy', 'ceremonial', 'holiday', 'festival', 'heritage', 'history', 'spiritual', 'belief', 'faith', 'tradition', 'custom', 'sacred', 'ritual', 'symbol', 'history', 'celebration'],
    16: ['science', 'biology', 'chemistry', 'physics', 'medicine', 'research', 'laboratory', 'math', 'microscope', 'formula', 'experimental', 'data', 'lab', 'discovery', 'study', 'experiment'],
    17: ['social issue', 'protest', 'poverty', 'homeless', 'war', 'peace', 'justice', 'human rights', 'community', 'support', 'help', 'charity', 'assistance', 'advocacy', 'global', 'campaign'],
    18: ['sport', 'run', 'ball', 'football', 'soccer', 'tennis', 'golf', 'gym', 'workout', 'athletic', 'athlete', 'competition', 'swimming', 'basketball', 'training', 'exercise', 'fitness', 'active'],
    19: ['technology', 'tech', 'smart', 'digital', 'screen', 'laser', 'circuit', 'code', 'program', 'blockchain', 'database', 'ai', 'server', 'network', 'connection', 'internet', 'future', 'futuristic', 'communication', 'virtual'],
    20: ['transport', 'car', 'truck', 'vehicle', 'train', 'airplane', 'ship', 'boat', 'road', 'street', 'highway', 'traffic', 'transit', 'logistics', 'delivery', 'automobile', 'drive', 'engine', 'auto'],
    21: ['travel', 'tourism', 'traveler', 'hotel', 'map', 'compass', 'passport', 'luggage', 'packing', 'tourist', 'vacation', 'flight', 'destination', 'trip', 'journey', 'adventure', 'explore']
  };

  let maxScore = -1;
  let bestCatId = 8; // Default to Graphic Resources, which is a very safe visual fallback category!

  for (const [catIdStr, words] of Object.entries(patterns)) {
    const catId = parseInt(catIdStr, 10);
    const score = countMatches(words);
    categoryScores[catId] = score;
    if (score > maxScore) {
      maxScore = score;
      bestCatId = catId;
    }
  }

  // If high score is 0, let's look at a default fallback
  if (maxScore <= 0) {
    bestCatId = 8; // Graphic Resources
  }

  // Map to Shutterstock categories logically
  const mapping: Record<number, { cat1: string; cat2: string }> = {
    1: { cat1: "Animals/Wildlife", cat2: "Nature" },
    2: { cat1: "Buildings/Landmarks", cat2: "Interiors" },
    3: { cat1: "Business/Finance", cat2: "Technology" },
    4: { cat1: "Food and Drink", cat2: "Objects" },
    5: { cat1: "Nature", cat2: "Backgrounds/Textures" },
    6: { cat1: "Abstract", cat2: "Miscellaneous" },
    7: { cat1: "Food and Drink", cat2: "Objects" },
    8: { cat1: "Abstract", cat2: "Backgrounds/Textures" },
    9: { cat1: "Objects", cat2: "Sports/Recreation" },
    10: { cat1: "Industrial", cat2: "Technology" },
    11: { cat1: "Nature", cat2: "Parks/Outdoor" },
    12: { cat1: "People", cat2: "Miscellaneous" },
    13: { cat1: "People", cat2: "Miscellaneous" },
    14: { cat1: "Nature", cat2: "Backgrounds/Textures" },
    15: { cat1: "Religion", cat2: "Holidays" },
    16: { cat1: "Science", cat2: "Technology" },
    17: { cat1: "Miscellaneous", cat2: "People" },
    18: { cat1: "Sports/Recreation", cat2: "Objects" },
    19: { cat1: "Technology", cat2: "Industrial" },
    20: { cat1: "Transportation", cat2: "Objects" },
    21: { cat1: "Nature", cat2: "Buildings/Landmarks" }
  };

  const choice = mapping[bestCatId] || { cat1: "Abstract", cat2: "Backgrounds/Textures" };

  return {
    category_id: bestCatId,
    shutterstock_category_1: choice.cat1,
    shutterstock_category_2: choice.cat2
  };
}

function ensureTitleLength(title: string, keywords: string[], description: string, titleLength?: string): string {
  if (!title || title.trim() === "" || title.includes("Write a descriptive title here") || title.includes("<generate a") || title.includes("A highly descriptive") || title.includes("A detailed")) {
    if (description && description.trim().length > 10 && !description.includes("Write a detailed description here") && !description.includes("<generate a") && !description.includes("A highly descriptive") && !description.includes("A detailed")) title = description;
    else if (keywords && keywords.length >= 3) title = keywords.slice(0, 5).join(' ');
    else title = "Stock asset";
  } else {
    title = String(title);
  }
  
  // Clean input title: remove all commas, periods, double spaces
  let cleanedTitle = title.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanedTitle.endsWith('.')) {
    cleanedTitle = cleanedTitle.slice(0, -1).trim();
  }

  // Remove disallowed start phrases strictly
  const disallowedStarts = [
    "vector of", "illustration of", "drawing of", "continuous line drawing of",
    "vector", "illustration", "drawing", "continuous line drawing"
  ];
  let titleLower = cleanedTitle.toLowerCase();
  for (const start of disallowedStarts) {
    if (titleLower.startsWith(start + " ")) {
      cleanedTitle = cleanedTitle.substring(start.length + 1).trim();
      titleLower = cleanedTitle.toLowerCase();
    }
  }

  // Limit bounds based on titleLength
  let upperLimit = 200;
  if (titleLength === 'short') upperLimit = 65;
  if (titleLength === 'long') upperLimit = 200;

  if (cleanedTitle.length > upperLimit) {
    let truncated = cleanedTitle.substring(0, upperLimit);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > Math.floor(upperLimit / 2)) {
      truncated = truncated.substring(0, lastSpace);
    }
    cleanedTitle = truncated.trim();
  }

  // Deduplicate adjacent words
  const words = cleanedTitle.split(/\s+/);
  const deduplicatedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const prev = deduplicatedWords[deduplicatedWords.length - 1];
    if (prev && current.toLowerCase() === prev.toLowerCase() && !['and', 'with', 'in', 'on', 'the', 'a', 'of'].includes(current.toLowerCase())) {
      continue;
    }
    deduplicatedWords.push(current);
  }
  cleanedTitle = deduplicatedWords.join(' ');

  // Guarantee absolute removal of any commas, periods, double spaces
  cleanedTitle = cleanedTitle.replace(/,/g, '').replace(/\./g, '').replace(/\s+/g, ' ').trim();

  // Sentence case capitalisation
  if (cleanedTitle.length > 0) {
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
  }

  return cleanedTitle;
}

function ensureDescription(description: string, title: string, keywords: string[]): string {
  if (!description || typeof description !== 'string') {
    description = "";
  }
  
  const isPlaceholderDesc = (desc: string) => {
    const d = desc.toLowerCase().trim();
    return d === "" || 
           d.includes("write a detailed description here") || 
           d.includes("<generate a") || 
           d.includes("a highly descriptive") || 
           d.includes("a detailed visual description") || 
           d.includes("a detailed description") ||
           d.includes("provide a thorough visual breakdown") ||
           d.includes("detailed description of the image") ||
           d.includes("description of the image") ||
           d.includes("an image containing") ||
           d.includes("this image displays") ||
           d.includes("this is a description");
  };

  if (isPlaceholderDesc(description)) {
    if (title && title.trim().length > 5) {
      const cleanTitle = title.replace(/write a descriptive/gi, '').replace(/<generate/gi, '').replace(/highly descriptive/gi, '').trim();
      if (cleanTitle.length > 5) {
        return `A professional stock photo showcasing ${cleanTitle.toLowerCase()}. Ideal for commercial, editorial, and creative design use.`;
      }
    }
    
    if (keywords && keywords.length >= 3) {
      return `Professional visual content featuring ${keywords.slice(0, 5).join(', ')}. Perfect for advertising, marketing, and editorial purposes.`;
    }
    
    return "High-quality professional stock asset designed for commercial, editorial, or creative media projects.";
  }
  
  return description.trim();
}

const getTitleLengthRule = (titleLength?: string) => {
  if (titleLength === 'short') {
    return "Title MUST be highly SEO optimized but kept VERY SHORT and concise (around 3 to 7 words maximum). Just state the core subject briefly.";
  } else if (titleLength === 'long') {
    return "Title MUST be highly SEO optimized, extremely detailed, and have at least 15-25 descriptive words to ensure maximum long-tail visibility on stock platforms. Capture all elements.";
  }
  return "Title MUST be highly SEO optimized, front-loaded with primary commercial keywords, and have at least 10-15 descriptive words to ensure maximum visibility on stock platforms.";
};

const getLanguageName = (code?: string) => {
  const map: Record<string, string> = {
    'en': 'ENGLISH',
    'id': 'INDONESIAN (BAHASA INDONESIA)',
    'es': 'SPANISH',
    'fr': 'FRENCH',
    'de': 'GERMAN',
    'it': 'ITALIAN',
    'pt': 'PORTUGUESE',
    'ja': 'JAPANESE',
    'ko': 'KOREAN',
    'ru': 'RUSSIAN',
    'th': 'THAI',
    'tr': 'TURKISH',
    'nl': 'DUTCH',
    'pl': 'POLISH'
  };
  return map[code || 'en'] || 'ENGLISH';
};

function ensureKeywordCount(
  keywords: string[],
  targetCount: number,
  visualFacts: any,
  title?: string,
  description?: string,
  categoryId?: number,
  keywordMode?: 'mixed' | 'single' | 'multi'
): string[] {
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  // 1. Clean and deduplicate input keywords
  let uniqueKeywords: string[] = [];
  if (Array.isArray(keywords)) {
    keywords.forEach(k => {
      if (typeof k === 'string') {
        const clean = k.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (clean.length > 1 && !isProhibitedKeyword(clean)) {
          if (keywordMode === 'single' && clean.includes(' ')) {
            // Split multi-words into individual single words
            const pieces = clean.split(/\s+/);
            pieces.forEach(p => {
              if (p.length > 1 && !isProhibitedKeyword(p)) {
                // Check for exact and near duplicates (plurals/singulars)
                const isDuplicate = uniqueKeywords.some(existing => 
                  existing === p || 
                  existing === p + 's' || 
                  p === existing + 's' || 
                  existing === p + 'es' || 
                  p === existing + 'es' ||
                  existing.replace(/ies$/, 'y') === p ||
                  p.replace(/ies$/, 'y') === existing
                );
                if (!isDuplicate) {
                  uniqueKeywords.push(p);
                }
              }
            });
          } else {
            let cleanVal = clean;
            if (keywordMode === 'multi' && !clean.includes(' ')) {
              const modifiers = ['concept', 'background', 'scene', 'design', 'style', 'detail', 'asset', 'element'];
              const mod = modifiers[Math.abs(hashString(clean)) % modifiers.length];
              cleanVal = `${clean} ${mod}`;
            }

            // Check for exact and near duplicates (plurals/singulars)
            const isDuplicate = uniqueKeywords.some(existing => 
              existing === cleanVal || 
              existing === cleanVal + 's' || 
              cleanVal === existing + 's' || 
              existing === cleanVal + 'es' || 
              cleanVal === existing + 'es' ||
              existing.replace(/ies$/, 'y') === cleanVal ||
              cleanVal.replace(/ies$/, 'y') === existing
            );
            if (!isDuplicate) {
              uniqueKeywords.push(cleanVal);
            }
          }
        }
      }
    });
  }

  if (uniqueKeywords.length >= targetCount) {
    return uniqueKeywords.slice(0, targetCount);
  }

  // Define lookup of category-based keywords
  const categoryFallbackKeywords: Record<number, string[]> = {
    1: ['animal', 'nature', 'wildlife', 'fauna', 'creature', 'outdoor', 'mammal', 'species', 'wilderness', 'natural', 'habitat', 'furry', 'adorable', 'portrait', 'close-up', 'environment', 'beast', 'pet', 'wild', 'zoology'],
    2: ['architecture', 'building', 'structure', 'construction', 'city', 'urban', 'exterior', 'interior', 'design', 'modern', 'concrete', 'glass', 'steel', 'landmark', 'monument', 'facade', 'metropolis', 'tower', 'estate', 'house', 'contemporary'],
    3: ['business', 'office', 'corporate', 'work', 'workplace', 'finance', 'company', 'management', 'team', 'meeting', 'strategy', 'success', 'professional', 'marketing', 'leadership', 'organization', 'colleague', 'career', 'investment', 'growth', 'concept'],
    4: ['drink', 'beverage', 'glass', 'liquid', 'refreshing', 'cold', 'hot', 'cup', 'bottle', 'mug', 'bar', 'cafe', 'cocktail', 'juice', 'water', 'coffee', 'tea', 'alcohol', 'brew', 'ice'],
    5: ['environment', 'nature', 'landscape', 'green', 'eco', 'ecology', 'sustainability', 'recycle', 'conservation', 'earth', 'planet', 'wild', 'scenery', 'outdoor', 'forest', 'climate', 'natural', 'environmental', 'organic'],
    6: ['concept', 'mood', 'feeling', 'emotion', 'mental', 'mind', 'thought', 'isolated', 'abstract', 'idea', 'expression', 'psychology', 'imagination', 'sensation', 'attitude', 'behavior'],
    7: ['food', 'delicious', 'tasty', 'dish', 'meal', 'gourmet', 'culinary', 'plate', 'eating', 'ingredient', 'fresh', 'vegetable', 'fruit', 'cooking', 'kitchen', 'recipe', 'diet', 'lunch', 'dinner', 'breakfast', 'cuisine'],
    8: ['graphic', 'design', 'resource', 'vector', 'illustration', 'element', 'abstract', 'background', 'template', 'pattern', 'asset', 'layout', 'creative', 'art', 'flat', 'logo', 'icon', 'backdrop', 'seamless'],
    9: ['hobby', 'leisure', 'recreation', 'activity', 'fun', 'game', 'play', 'relaxation', 'lifestyle', 'entertainment', 'pastime', 'craft', 'indoor', 'outdoor', 'enjoyment'],
    10: ['industry', 'industrial', 'factory', 'manufacture', 'production', 'technology', 'engineering', 'machinery', 'worker', 'equipment', 'facility', 'metal', 'power', 'warehouse', 'technical', 'automated', 'construction'],
    11: ['landscape', 'scenery', 'scenic', 'nature', 'view', 'outdoor', 'mountain', 'hill', 'valley', 'field', 'panorama', 'horizon', 'wilderness', 'beautiful', 'vista', 'natural', 'sky'],
    12: ['lifestyle', 'life', 'daily', 'routine', 'modern', 'human', 'person', 'people', 'home', 'domestic', 'activity', 'casual', 'habits', 'style', 'comfort', 'leisure'],
    13: ['people', 'person', 'human', 'individual', 'portrait', 'man', 'woman', 'adult', 'young', 'lifestyle', 'group', 'crowd', 'interaction', 'relationship', 'face', 'expressive', 'posing'],
    14: ['plant', 'flower', 'flora', 'botany', 'botanical', 'leaf', 'nature', 'garden', 'green', 'blossom', 'petal', 'growth', 'stem', 'outdoor', 'natural', 'organic', 'vegetation', 'spring', 'summer'],
    15: ['culture', 'religion', 'religious', 'spiritual', 'belief', 'faith', 'tradition', 'custom', 'heritage', 'sacred', 'ceremony', 'ritual', 'symbol', 'history', 'traditional', 'temple', 'church', 'holiday', 'celebration'],
    16: ['science', 'scientific', 'research', 'laboratory', 'lab', 'technology', 'analysis', 'experiment', 'discovery', 'study', 'chemistry', 'biology', 'physics', 'tech', 'equipment', 'microscope', 'test', 'data', 'concept'],
    17: ['social', 'issue', 'community', 'society', 'problem', 'awareness', 'support', 'help', 'advocacy', 'global', 'campaign', 'concept', 'message', 'public', 'humanity', 'care'],
    18: ['sports', 'sport', 'athletic', 'athlete', 'exercise', 'fitness', 'training', 'game', 'competition', 'player', 'workout', 'active', 'healthy', 'stadium', 'court', 'field', 'gym', 'recreation', 'action'],
    19: ['technology', 'tech', 'digital', 'device', 'modern', 'electronic', 'innovation', 'computer', 'network', 'connection', 'internet', 'future', 'futuristic', 'concept', 'data', 'communication', 'virtual', 'smart'],
    20: ['transport', 'transportation', 'vehicle', 'car', 'automobile', 'traffic', 'road', 'street', 'travel', 'highway', 'drive', 'engine', 'movement', 'logistics', 'delivery', 'auto', 'transit'],
    21: ['travel', 'tourism', 'destination', 'vacation', 'holiday', 'trip', 'journey', 'adventure', 'explore', 'tourist', 'sightseeing', 'scenic', 'landmark', 'outdoor', 'recreation', 'passport', 'luggage']
  };

  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'in', 'with', 'by', 'of', 'to', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'isolated', 'stock', 'photo', 'image', 'picture', 'vector', 'illustration', 'captured', 'professional', 'high', 'quality', 'resolution', 'super', 'ultra', 'beautiful', 'stunning', 'amazing', 'perfect', 'ideal'
  ]);

  // Helper helper to clean a string of words and append to list
  const extractWords = (str: any) => {
    if (!str || typeof str !== 'string') return [];
    return str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 1 && !STOP_WORDS.has(w) && !isProhibitedKeyword(w));
  };

  // Build candidate sources in order of priority:
  const sources: string[][] = [];

  // 1. From visual facts primary subjects
  if (visualFacts && visualFacts.primary_subjects && Array.isArray(visualFacts.primary_subjects)) {
    const words: string[] = [];
    visualFacts.primary_subjects.forEach((x: any) => {
      if (x && typeof x === 'object' && x.name) {
        words.push(...extractWords(x.name));
      }
    });
    sources.push(words);
  }

  // 2. From visual facts secondary subjects
  if (visualFacts && visualFacts.secondary_subjects && Array.isArray(visualFacts.secondary_subjects)) {
    const words: string[] = [];
    visualFacts.secondary_subjects.forEach((x: any) => {
      if (x && typeof x === 'object' && x.name) {
        words.push(...extractWords(x.name));
      }
    });
    sources.push(words);
  }

  // 3. From visual facts colors & actions
  if (visualFacts && visualFacts.colors && Array.isArray(visualFacts.colors)) {
    sources.push(visualFacts.colors.flatMap((c: any) => {
      if (typeof c === 'string') return extractWords(c);
      return [];
    }));
  }
  if (visualFacts && visualFacts.actions && Array.isArray(visualFacts.actions)) {
    sources.push(visualFacts.actions.flatMap((a: any) => {
      if (typeof a === 'string') return extractWords(a);
      return [];
    }));
  }

  // 4. From Title
  if (title && typeof title === 'string') {
    sources.push(extractWords(title));
  }

  // 5. From Description
  if (description && typeof description === 'string') {
    sources.push(extractWords(description));
  }

  // 6. From specific category keywords
  if (categoryId) {
    const catIdNum = Number(categoryId);
    if (categoryFallbackKeywords[catIdNum]) {
      sources.push(categoryFallbackKeywords[catIdNum]);
    }
  }

  // 7. Generic high density stock keywords
  const genericFallback = ['commercial', 'concept', 'modern', 'scene', 'design', 'art', 'graphic', 'simple', 'minimal', 'clean', 'detail', 'element', 'context', 'asset', 'lifestyle', 'organic', 'pattern', 'texture', 'background', 'composition', 'subject', 'focus', 'creative', 'fresh', 'bright', 'vibrant', 'backdrop', 'object', 'view', 'horizontal', 'outdoor', 'indoor', 'surface', 'material', 'style', 'trending', 'popular', 'industry', 'space', 'natural', 'lighting', 'atmosphere', 'inspiration'];
  sources.push(genericFallback);

  // Pad the uniqueKeywords checking each source
  for (const source of sources) {
    if (uniqueKeywords.length >= targetCount) break;
    if (Array.isArray(source)) {
      const cleanSource = Array.from(new Set(source));
      for (const word of cleanSource) {
        if (uniqueKeywords.length >= targetCount) break;
        if (typeof word === 'string') {
          let cleanWord = word.trim().toLowerCase();
          if (cleanWord.length > 1 && !isProhibitedKeyword(cleanWord)) {
            if (keywordMode === 'multi' && !cleanWord.includes(' ')) {
              const modifiers = ['concept', 'background', 'scene', 'design', 'style', 'detail', 'asset', 'element'];
              const mod = modifiers[Math.abs(hashString(cleanWord)) % modifiers.length];
              cleanWord = `${cleanWord} ${mod}`;
            }
            if (!uniqueKeywords.includes(cleanWord)) {
              uniqueKeywords.push(cleanWord);
            }
          }
        }
      }
    }
  }

  return uniqueKeywords.slice(0, targetCount);
}

async function callOpenAICompatibleWithRetry(params: {
  systemInstruction?: string;
  contents: any;
  responseMimeType?: string;
  responseSchema?: any;
  config?: any;
  model?: string;
}): Promise<string> {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  if (!PROVIDER_ENDPOINTS[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const endpoint = PROVIDER_ENDPOINTS[provider];
  const providerState = store?.[provider];
  const keysList: string[] = (providerState && providerState.keys) || [];
  const maxRotationAttempts = keysList.length > 0 ? keysList.length : 1;
  let lastErr: any;

  for (let rot = 0; rot < maxRotationAttempts; rot++) {
    let apiKey = '';

    if (keysList.length > 0) {
      const activeIdx = providerState.activeIndex || 0;
      apiKey = keysList[activeIdx];
      if (provider === 'nvidia') {
        console.log(`[NVIDIA DEBUG] Using key index ${activeIdx}/${keysList.length} (Starts with: ${(apiKey || "").substring(0, 8)}...)`);
      }
    } else {
      apiKey = process.env[PROVIDER_ENV_KEYS[provider]] || '';
      if (provider === 'nvidia') {
        console.log(`[NVIDIA DEBUG] Using key from process.env (Starts with: ${(apiKey || "").substring(0, 8)}...)`);
      }
    }

    if (!apiKey && provider === 'nvidia') {
      console.warn('NVIDIA key missing. Fallback to Gemini.');
      const fallbackResult = await getAIClient().models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: params.contents,
        config: params.config
      });
      // Handle both raw Gemini response and our normalized {text} response
      return typeof fallbackResult.text === 'function' ? await fallbackResult.text() : (fallbackResult.text || '');
    }

    if (!apiKey) {
      throw new Error(`API Key untuk ${provider.toUpperCase()} belum dikonfigurasi. Silakan tambahkan Key Anda di pengaturan.`);
    }

    const messages: any[] = [];
    let userSystemInstruction = '';
    if (params.systemInstruction) {
      if (provider === 'aivene') {
        userSystemInstruction = `[SYSTEM INSTRUCTION]\n${params.systemInstruction}\n\n[USER INPUT]\n`;
      } else {
        messages.push({ role: 'system', content: params.systemInstruction });
      }
    }

    let hasImages = false;
    const contentParts: any[] = [];
    
    if (userSystemInstruction) {
      contentParts.push({ type: 'text', text: userSystemInstruction });
    }

    const addPart = (part: any) => {
      if (!part) return;
      if (typeof part === 'string') {
        contentParts.push({ type: 'text', text: part });
      } else if (part.text) {
        contentParts.push({ type: 'text', text: part.text });
      } else if (part.inlineData) {
        hasImages = true;
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        });
      }
    };

    if (typeof params.contents === 'string') {
      contentParts.push({ type: 'text', text: params.contents });
    } else if (Array.isArray(params.contents)) {
      params.contents.forEach(addPart);
    } else if (params.contents && typeof params.contents === 'object') {
      if (Array.isArray(params.contents.parts)) {
        params.contents.parts.forEach(addPart);
      } else {
        addPart(params.contents);
      }
    }

    let finalContent: any;
    if (!hasImages) {
      finalContent = contentParts.map(p => p.text).join('\n');
    } else {
      finalContent = contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts;
    }

    messages.push({
      role: 'user',
      content: finalContent
    });

    let model = params.model || PROVIDER_DEFAULT_MODELS[provider];

    // NVIDIA NIM mapping and sanitization
    if (provider === 'nvidia') {
      // mapping legacy or short names to official NIM names
      if (model === 'stepfun_step35_flash') model = 'stepfun-ai/step-3.5-flash';
      if (model.startsWith('stepfun/')) model = model.replace('stepfun/', 'stepfun-ai/');
      if (model === 'nemotron') model = 'nvidia/llama-3.1-nemotron-70b-instruct';
      if (!model.includes('/')) {
         // If it's a bare name like 'llama-3.2-90b-vision-instruct', prepend 'meta/'
         if (model.includes('llama-3.2')) model = `meta/${model}`;
         else if (model.includes('nemotron')) model = `nvidia/${model}`;
         else if (model.includes('paligemma')) model = `google/${model}`;
         else if (model.includes('step')) model = `stepfun-ai/${model}`;
      }
      
      // Sanitasi: NVIDIA NIM sometimes dislikes double slashes or missing namespaces
      model = model.trim();
      if (model.startsWith('/')) model = model.substring(1);
    }

    // Validasi: kalau model yang dipassing user adalah nama model gemini/gemma
    // (artinya caller belum sempat resolve), pakai default provider ini.
    if (provider !== 'aivene' && (model?.startsWith('gemini-') || model?.startsWith('gemma-'))) {
      model = PROVIDER_DEFAULT_MODELS[provider];
    }

    // Map the model 'llama-4-scout-17b-16e-instruct' to the exact name required by Groq
    if (provider === 'groq' && model === 'llama-4-scout-17b-16e-instruct') {
      model = 'meta-llama/llama-4-scout-17b-16e-instruct';
    }

    const payload: any = {
      model,
      messages,
      temperature: params.config?.temperature ?? 0.85,
    };
    
    if (params.config?.topP !== undefined) {
      payload.top_p = params.config.topP;
    }

    if (SUPPORTS_JSON_MODE.has(provider)) {
      payload.response_format = { type: "json_object" };
    }

    if (provider === 'groq' || provider === 'openai' || provider === 'openrouter' || provider === 'nvidia' || provider === 'aivene') {
      payload.max_tokens = provider === 'nvidia' ? 4096 : 8192;
    } else if (provider === 'bluesminds') {
      // Do not send max_tokens to avoid pre-check reservation failures on limited balance or custom endpoints
    }
    payload.stream = false;

    if (params.responseMimeType === 'application/json') {
      let schemaInstruction = '\n\nIMPORTANT: Start your response DIRECTLY with the opening curly brace "{" (or square bracket "[" if an array is requested). DO NOT write any introductory or concluding text. DO NOT use markdown code blocks. The response MUST be a valid JSON object or array.';
      if (provider === 'nvidia') {
        schemaInstruction = '\n\nOutput only a valid JSON. Do not include any explanation or markdown formatting. The JSON must directly start with { or [ and end with } or ].';
      }
      if (params.responseSchema) {
        schemaInstruction += ` The JSON MUST strictly match this schema: ${JSON.stringify(params.responseSchema)}`;
      }

      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        if (typeof lastMessage.content === 'string') {
          lastMessage.content += schemaInstruction;
        } else if (Array.isArray(lastMessage.content)) {
          lastMessage.content.push({ type: 'text', text: schemaInstruction });
        }
      } else {
        messages.push({ role: 'user', content: schemaInstruction });
      }
    }

    let tryCount = 0;
    while (tryCount < 3) {
      try {
        console.log(`[callOpenAICompatibleWithRetry] Fetching ${provider.toUpperCase()} completions with model ${model}...`);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        };
        // OpenRouter butuh header tambahan untuk identifikasi (opsional tapi disarankan)
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = process.env.APP_URL || 'http://localhost';
          headers['X-Title'] = 'JohMeta';
        }

        if (provider === 'nvidia') {
          const sanPayload = { ...payload, messages: payload.messages.map((m: any) => ({ ...m, content: typeof m.content === 'string' ? m.content : '[REDACTED CONTENT]' })) };
          console.log(`[NVIDIA DEBUG] Sending payload to ${endpoint} with model ${model}:`, JSON.stringify(sanPayload));
        }

        const fetchTimeout = provider === 'nvidia' ? 25000 : 15000;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          // @ts-ignore - undici/node-fetch support signal/timeout
          signal: AbortSignal.timeout(fetchTimeout)
        });

        // Safe logging of the response
        const responseDataRawForLogging = await response.clone().text();
        console.log(`[${provider.toUpperCase()} DEBUG] Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}, First 200 chars: ${responseDataRawForLogging.substring(0, 200)}`);

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[${provider.toUpperCase()} API FAILURE] Status: ${response.status}, Response: ${errText}`);
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const responseDataRaw = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseDataRaw);
        } catch (e) {
          console.error(`[callOpenAICompatibleWithRetry] Failed to parse JSON. Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}, RawResponse: ${responseDataRaw.substring(0, 500)}`);
          throw new Error(`Failed to parse JSON from ${provider}. RawResponse Sample: ${responseDataRaw.substring(0, 200)}`);
        }
        let answer = responseData.choices?.[0]?.message?.content;
        if (!answer && responseData.choices?.[0]?.message) {
          answer = responseData.choices[0].message.reasoning || responseData.choices[0].message.reasoning_content;
        }
        if (!answer) {
          console.warn(`[callOpenAICompatibleWithRetry] Empty answer received from ${provider}. Response payload:`, JSON.stringify(responseData));
          if (responseData.error) {
            throw new Error(`${provider.toUpperCase()} API Error: ${responseData.error.message || JSON.stringify(responseData.error)} (Code: ${responseData.error.code || 'unknown'})`);
          }
          throw new Error(`Empty response content received from ${provider.toUpperCase()}`);
        }
        if (params.responseMimeType === 'application/json') {
          answer = extractJSON(answer);
          if (answer.replace(/\s/g, '') === '{}') {
            console.warn(`[callOpenAICompatibleWithRetry] Model hallucinated empty JSON string. Retrying...`);
            // Add 'quota' to trigger a retry gracefully
            throw new Error(`Model returned empty json object string {}. Trigger quota rotation/retry.`);
          }
        }
        return answer;
      } catch (err: any) {
        console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] error:`, err);
        const status = err.status || (err.message && err.message.includes('HTTP ') ? err.message.split(' ')[1].replace(':', '') : 'unknown');
        console.warn(`[${provider.toUpperCase()} ERROR DETAILS] Status: ${status}, Message: ${err.message}, Key Index: ${providerState?.activeIndex}`);
        lastErr = err;

        const errorMsg = String(err.message || "").toLowerCase();

        // Handle specific NVIDIA NIM 404 (Model not found for this account/key)
        if (provider === 'nvidia' && errorMsg.includes('404')) {
          console.warn(`[NVIDIA 404] Model ${model} might not be supported by this key or account. Trying next key if available.`);
          // Trigger key rotation by pretending it's a quota error
          if (providerState && providerState.keys && providerState.activeIndex < keysList.length - 1) {
             providerState.activeIndex++;
             break;
          }
        }

        if (errorMsg.includes('429') || errorMsg.includes('403') || errorMsg.includes('401') || errorMsg.includes('quota') || errorMsg.includes('exceeded') || errorMsg.includes('exhausted') || errorMsg.includes('limit') || errorMsg.includes('timeout') || errorMsg.includes('fetch failed')) {
          if (providerState && providerState.keys && providerState.activeIndex < keysList.length - 1) {
            const prevIdx = providerState.activeIndex;
            providerState.activeIndex++;
            console.warn(`[Key Rotation - ${provider.toUpperCase()}] Rotating from Key index ${prevIdx} to ${providerState.activeIndex}`);
            break;
          }
        }

        // Automatic model fallback and exponential backoff
        tryCount++;
        const fallback = PROVIDER_FALLBACK_MODELS[provider];
        const isRetryableError = errorMsg.includes('429') || 
                                 errorMsg.includes('quota') || 
                                 errorMsg.includes('limit') || 
                                 errorMsg.includes('timeout') || 
                                 errorMsg.includes('exceeded') || 
                                 errorMsg.includes('fetch failed') ||
                                 errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503') || errorMsg.includes('504') || errorMsg.includes('524') || errorMsg.includes('upstream_error') ||
                                 errorMsg.includes('extra data') ||
                                 errorMsg.includes('empty response content') ||
                                 errorMsg.includes('empty json object') ||
                                 errorMsg.includes('bad_response_status_code');

        if (tryCount === 1 && fallback && fallback !== model) {
          model = fallback;
          console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] Model failed. Falling back to alternative model: ${model}`);
          payload.model = model;
          continue;
        }

        if (tryCount < 3 && isRetryableError) {
          const backoff = Math.pow(2, tryCount) * 1000 + Math.random() * 1000;
          console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] Retrying error (attempt ${tryCount}/3) after ${backoff / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }

        throw err;
      }
    }
  }
  throw lastErr;
}

function getAIClient(): any {
  return {
    models: {
      generateContent: async (params: any) => {
        const store = apiKeyStorage.getStore();
        const provider = (store && store.provider) || 'gemini';

        // ONLY redirect to Groq/Mistral/OpenAI/etc if the model name is NOT explicitly a Gemini / Gemma model.
        // This allows hybrid vision/curation/audit tasks (which explicitly request gemini models) to run natively on Gemini across ALL providers (including Aivene, Groq, OpenAI, etc.).
        if (NON_GEMINI_PROVIDERS.has(provider) && (!params.model?.startsWith('gemini-') && !params.model?.startsWith('gemma-'))) {
          const text = await callOpenAICompatibleWithRetry({
            systemInstruction: params.config?.systemInstruction,
            contents: params.contents,
            responseMimeType: params.config?.responseMimeType,
            responseSchema: params.config?.responseSchema,
            config: params.config
          });
          return { text };
        }

        let key = process.env.GEMINI_API_KEY || process.env.API_KEY;
        let activeIndex = 0;
        let keysList: string[] = [];

        if (store) {
          if (store.gemini && Array.isArray(store.gemini.keys)) {
            keysList = store.gemini.keys;
            activeIndex = store.gemini.activeIndex || 0;
            if (keysList.length > 0) {
              key = keysList[activeIndex];
            }
          } else if (typeof store === 'string') {
            key = store;
          } else if (store && Array.isArray(store.keys) && store.keys.length > 0) {
            keysList = store.keys;
            activeIndex = store.activeIndex || 0;
            if (keysList.length > 0) {
              key = keysList[activeIndex];
            }
          }
        }

        const runGeminiDirectFetch = async (keyToUse: string, params: any) => {
          const model = params.model || 'gemini-2.5-flash';
          const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
          const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${keyToUse}`;

          const contents = params.contents || [];
          let apiContents = [];
          if (Array.isArray(contents)) {
            if (contents.length > 0 && contents[0].parts) {
              apiContents = contents;
            } else {
              apiContents = [{ parts: contents }];
            }
          } else if (contents.parts) {
            apiContents = [contents];
          } else {
            apiContents = [{ parts: [contents] }];
          }

          const apiPayload: any = {
            contents: apiContents
          };

          if (params.config) {
            apiPayload.generationConfig = {};
            if (params.config.responseMimeType) {
              apiPayload.generationConfig.responseMimeType = params.config.responseMimeType;
            }
            if (params.config.responseSchema) {
              apiPayload.generationConfig.responseSchema = params.config.responseSchema;
            }
            if (typeof params.config.temperature === 'number') {
              apiPayload.generationConfig.temperature = params.config.temperature;
            }
            if (typeof params.config.topP === 'number') {
              apiPayload.generationConfig.topP = params.config.topP;
            }
            if (params.config.systemInstruction) {
              if (typeof params.config.systemInstruction === 'string') {
                apiPayload.systemInstruction = {
                  parts: [{ text: params.config.systemInstruction }]
                };
              } else if (params.config.systemInstruction.parts) {
                apiPayload.systemInstruction = params.config.systemInstruction;
              } else {
                apiPayload.systemInstruction = {
                  parts: [params.config.systemInstruction]
                };
              }
            }
          }

          console.log(`[Gemini Direct Fetch] Calling REST API fallback for model: ${cleanModel}...`);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiPayload)
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini Direct Fetch Failed (${response.status}): ${errText}`);
          }

          const resJson: any = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          return {
            text,
            candidates: resJson.candidates,
            usageMetadata: resJson.usageMetadata
          };
        };

        const runGemini = async (keyToUse: string | undefined) => {
          if (!keyToUse) {
            throw new Error('GEMINI_API_KEY / API_KEY environment variable is required. Silakan masukkan API Key Gemini Anda terlebih dahulu melalui tombol Pengaturan (ikon Gear) di bagian samping aplikasi.');
          }
          try {
            const client = new GoogleGenAI({
              apiKey: keyToUse,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                }
              }
            });
            const result = await client.models.generateContent(params);
            if (params.config?.responseMimeType === 'application/json' && result.text) {
              return {
                ...result,
                text: result.text.replace(/^```json\s*/, '').replace(/```$/, '').trim()
              };
            }
            return result;
          } catch (sdkError: any) {
            console.warn(`[getAIClient] SDK generateContent failed: ${sdkError.message || sdkError}. Attempting REST API fallback...`);
            try {
              const directResult = await runGeminiDirectFetch(keyToUse, params);
              if (params.config?.responseMimeType === 'application/json' && directResult.text) {
                return {
                  ...directResult,
                  text: directResult.text.replace(/^```json\s*/, '').replace(/```$/, '').trim()
                };
              }
              return directResult;
            } catch (fallbackError: any) {
              console.error(`[getAIClient] Both SDK and REST fallback failed. REST Error: ${fallbackError.message || fallbackError}`);
              throw sdkError; // Throw original SDK error to keep rotation/retry logic intact
            }
          }
        };

        if (keysList.length > 1) {
          let lastErr: any;
          for (let rot = activeIndex; rot < keysList.length; rot++) {
            try {
              return await runGemini(keysList[rot]);
            } catch (err: any) {
              lastErr = err;
              const statusCode = err.status || err.code;
              const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();
              
              if (statusCode === 429) {
                const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i) || errorMsg.match(/retrydelay['":\s]+([\d\.]+)s/i);
                if (retryMatch && retryMatch[1]) {
                  const delay = parseFloat(retryMatch[1]) * 1000 + 1000;
                  console.log(`[Key Rotation - GEMINI] Rate limited, waiting ${delay}ms before next attempt/key rotation`);
                  await new Promise(r => setTimeout(r, delay));
                }
              }

              if (statusCode === 429 || statusCode === 403 || errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || errorMsg.includes("api key")) {
                if (store && store.gemini && store.gemini.activeIndex < keysList.length - 1) {
                  store.gemini.activeIndex++;
                  console.warn(`[Key Rotation - GEMINI] Rotating key in generateContent to index ${store.gemini.activeIndex}`);
                  continue;
                } else if (store && !store.gemini && store.activeIndex < keysList.length - 1) {
                  store.activeIndex++;
                  console.warn(`[Key Rotation] Rotating key in generateContent to index ${store.activeIndex}`);
                  continue;
                }
              }
              throw err;
            }
          }
          throw lastErr;
        } else {
          return await runGemini(key);
        }
      }
    }
  };
}

// Helper for robust API calls with retry
const callGeminiWithRetry = async (
  modelName: string,
  contents: any,
  config: any,
  maxAttempts: number = 8
): Promise<any> => {
  let lastError: any;
  let currentModel = modelName;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await getAIClient().models.generateContent({
        model: currentModel,
        contents,
        config
      });
    } catch (err: any) {
      lastError = err;
      const statusCode = err.status || err.code;
      
      // Retry on Quota (429) or Server Errors (500, 503, 504)
      if (statusCode === 429 || statusCode >= 500) {
        const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();
        
        let customDelay = 0;
        const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i) || errorMsg.match(/retrydelay['":\s]+([\d\.]+)s/i);
        if (retryMatch && retryMatch[1]) {
           customDelay = parseFloat(retryMatch[1]) * 1000 + 1000; // Add 1 second buffer
        }

        if (statusCode === 429 && !customDelay && (errorMsg.includes("quota exceeded for metric") || errorMsg.includes("billing"))) {
           if (errorMsg.includes("limit: 20") || errorMsg.includes("limit: 15") || errorMsg.includes("retry in")) {
             // Let it backoff.
           } else {
             console.warn(`[callGeminiWithRetry] Hard quota limit hit on ${currentModel}.`);
             throw err;
           }
        }
        
        // Dynamically rotate models on 429 (quota) or 503 (high demand) to bypass the wait time
        const isQuotaOrLimit = statusCode === 429 || statusCode === 503;
        if (isQuotaOrLimit) {
          const rotationModels = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-flash-latest'];
          const currentIndex = rotationModels.indexOf(currentModel);
          const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % rotationModels.length : 0;
          let nextModel = rotationModels[nextIndex];
          
          if (nextModel === currentModel) { // Fallback if somehow stuck
              nextModel = rotationModels[currentIndex === 0 ? 1 : 0];
          }
          
          console.warn(`[callGeminiWithRetry] Quota/Limit hit on ${currentModel}. Rotating to ${nextModel} for attempt ${attempt + 2}.`);
          currentModel = nextModel;
          customDelay = attempt === 0 ? 2000 : 5000; // Reset wait time to try new model quickly
        } else if (statusCode === 429 && customDelay > 60000) {
             console.warn(`[callGeminiWithRetry] Hard quota limit hit on ${currentModel} (Wait time > 60s). Failing fast.`);
             throw err;
        }

        let backoff = customDelay > 0 ? customDelay : Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        if (statusCode === 429 && !customDelay) {
            // For general 429 rate limit (usually 15 RPM), wait longer if it keeps failing
            backoff = Math.min(30000, backoff); 
        }

        console.log(`[Gemini Retry] Received ${statusCode} on ${currentModel}, retrying in ${backoff / 1000}s (attempt ${attempt + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw err; // For other errors, throw immediately
    }
  }
  throw lastError;
};

const processFrameServer = (frame: string) => {
  const [mimePart, dataPart] = frame.split(';base64,');
  return {
    inlineData: {
      mimeType: mimePart.split(':')[1],
      data: dataPart
    }
  };
};

export const generateStockMetadata = async (
  frames: string[],
  keywordCount: number | string,
  customPrompt: string = "",
  toolType: ToolType = ToolType.IMAGE,
  temperature?: number,
  model?: string,
  keywordMode?: 'mixed' | 'single' | 'multi',
  titleLength?: 'short' | 'medium' | 'long',
  metadataLanguage?: string,
  aiModelPerformance?: 'speed' | 'detail'
): Promise<StockMetadata> => {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  let activeModel = model;
  if (provider === 'gemini' || !NON_GEMINI_PROVIDERS.has(provider)) {
    if (!activeModel || activeModel === 'gemini-3.1-pro-preview' || activeModel === 'gemini-3.1-flash-lite-preview') {
      activeModel = aiModelPerformance === 'speed' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
    }
  } else if (!activeModel) {
    activeModel = PROVIDER_DEFAULT_MODELS[provider];
  }

  const categoriesText = ADOBE_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(', ');
  const shutterstockCategoriesText = (toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(', ');
  
  const imageParts = frames.map(frame => processFrameServer(frame));

  // Amankan hitungan target keyword sejak awal
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount + 10; // Buffer +10 agar array tetap gemuk setelah deduplikasi

  // Rules for keywords depending on keywordMode
  let keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume keywords (including single-word and/or multi-word phrases) in ${getLanguageName(metadataLanguage)}. MUST be short words/phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
  let keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword or phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: descriptors of the primary subjects or objects matching buyer search queries)
   - Action (Activity: descriptors of movements, actions, or commercial activities happening)
   - Context (Environment/Background: setting, backdrop, location context, atmosphere, season)
   - Search Intent & Commercial Concept (Abstract Purpose: target terms representing why a buyer would search for this asset, commercial utility, industrial purpose, psychological mood, emotional intent, business solutions, and symbolic metaphor representation)
   - Industry (Specific/Technical Category: specialized corporate or consumer domains, professional categories)
3. Include both single-word and/or multi-word phrases (1-3 words) when relevant.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;

  if (keywordMode === 'single') {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume SINGLE-WORD keywords in ${getLanguageName(metadataLanguage)}. Strictly avoid multi-word phrases or compound words with spaces. MUST be short words, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: primary single-word subject descriptors)
   - Action (Activity: single-word action/movement descriptors)
   - Context (Environment/Background: single-word background or location setting terms)
   - Search Intent & Commercial Concept (Abstract Purpose: single-word terms representing buyer search intent, commercial purpose, utility, symbolic concept, or emotional mood)
   - Industry (Specific/Technical Category: single-word technical or industry-specific terms)
3. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  } else if (keywordMode === 'multi') {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume MULTI-WORD phrase keywords in ${getLanguageName(metadataLanguage)}. Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: multi-word subject/object descriptors matching buyer searches, e.g., "smartphone device")
   - Action (Activity: multi-word motion or commercial action phrases)
   - Context (Environment/Background: multi-word background or location setting phrases)
   - Search Intent & Commercial Concept (Abstract Purpose: multi-word phrases representing the buyer's target intent, commercial use cases, digital trends, emotional concepts, or symbolic metaphors)
   - Industry (Specific/Technical Category: multi-word technical or professional industry terms)
3. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  }

  // --- TAHAP 1: PROVIDER 1 — GEMINI VISION (VISUAL DETECTION) ---
  let visualFactsJson = "";
  
  console.log(`[JohMeta Pipeline] Stage 1: Running Provider 1 — Gemini Vision (Visual Facts Detection)...`);
  
  let mediaTypeContext = "The provided image is a photograph or digital artwork. Generate natural, human-readable descriptions of concepts and visual facts smoothly.";
  if (toolType === ToolType.VIDEO) {
    mediaTypeContext = "CRITICAL: The provided images are sequential frames (Start, Middle, End) from a single VIDEO. You MUST analyze the continuous motion, narrative progression, concepts, and storyline (alur) across the frames. Do not just describe them individually; synthesize the overall action and concept into natural, coherent metadata.";
  } else if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) {
    mediaTypeContext = "CRITICAL: The provided image is a VECTOR illustration. You MUST analyze and categorize it based on the ACTUAL SUBJECT MATTER visually present (e.g. if it shows an animal, classify as Animal; if it shows people, classify as People). Do NOT just default to 'Graphic Resources' or 'Abstract' unless it is genuinely a background/texture without clear subjects. Generate natural, smooth descriptions of the subjects.";
  }

  const fallbackGeminiModel = aiModelPerformance === 'speed' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
  const visionModelToUse = (activeModel && activeModel.startsWith('gemini-')) ? activeModel : fallbackGeminiModel;
  
  const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE:
Detect every visible subject, action, color, visible text, and composition detail.
Also, conduct a deep assessment on the asset's artistic theme, deeper meaning, and symbolic concept (baca makna mendalam & artistik dari aset tersebut).
Also, perform a profound visual semantic analysis of the image content to suggest the most relevant microstock categories from the official lists.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.

Asset Context: ${mediaTypeContext}

OFFICIAL MICROSTOCK CATEGORY REFERENTIALS FOR SEMANTIC SUGGESTIONS:
- Adobe Stock Categories: ${categoriesText}
- Shutterstock Categories: ${shutterstockCategoriesText}

OUTPUT FORMAT:
{
  "VISUAL_FACTS": {
    "primary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "secondary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "background_elements": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "visible_text": [],
    "colors": [],
    "actions": [],
    "composition": [],
    "deeper_meaning_and_symbolism": "Describe the deeper artistic meaning, theme, emotional mood, symbolic message, or conceptual representation of the asset (makna, pesan artistik, atau analogi konsep dari aset tersebut) that represents its true value.",
    "semantic_category_analysis": {
      "adobe_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "reason": "Explain carefully why these official Adobe and Shutterstock categories match the visual content semantically based on primary subjects, context, and deeper theme"
    }
  }
}`;

  const promptText = toolType === ToolType.VIDEO 
    ? `Tugas: Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`
    : `Tugas: Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;

  try {
    const visionResponse = await callGeminiWithRetry(visionModelToUse, { 
      parts: [...imageParts, { text: promptText }] 
    }, {
      systemInstruction: visionSystemInstruction,
      responseMimeType: "application/json",
      temperature: 0.0,
      topP: 0.8 });
    
    visualFactsJson = visionResponse.text || "{}";
    if (!visualFactsJson || visualFactsJson.trim() === "{}") {
      throw new Error("Vision Analysis produced empty results.");
    }
  } catch (err: any) {
    console.warn("[JohMeta Pipeline] Gemini Vision Stage 1 Failed:", err.message || err);
    // Fallback static facts if vision fails
    visualFactsJson = JSON.stringify({
      VISUAL_FACTS: {
        primary_subjects: [{ name: "main subject", importance: 100 }],
        secondary_subjects: [],
        background_elements: [],
        visible_text: [],
        colors: ["natural"],
        actions: ["commercial poses"],
        composition: ["professional"],
        semantic_category_analysis: {
          adobe_id: 0,
          shutterstock_category_1: "",
          shutterstock_category_2: "",
          reason: "Fallback static categories used."
        }
      }
    });
  }

  // Parse facts for next stages
  let visualFacts: any = {};
  try {
    visualFacts = JSON.parse(extractJSON(visualFactsJson)).VISUAL_FACTS || {};
  } catch (e) {
    visualFacts = { primary_subjects: [{ name: "subject", importance: 100 }], actions: ["posing"] };
  }

  const dominantSubjects = [
    ...(Array.isArray(visualFacts.primary_subjects) ? visualFacts.primary_subjects : []),
    ...(Array.isArray(visualFacts.secondary_subjects) ? visualFacts.secondary_subjects : [])
  ].filter((item: any) => item && typeof item === 'object' && typeof item.importance === 'number' && item.importance >= 50).map((item: any) => item.name);

  // --- TAHAP 2 & 3: PROVIDER 2 (GPT ROLE) & PROVIDER 3 (CLAUDE ROLE) — CONTENT GENERATION ---
  console.log(`[JohMeta Pipeline] Stage 2 & 3: Generating Content (Title, Description, Keywords)...`);
  
  const customPromptCommand = customPrompt ? `\nCRITICAL CUSTOM INSTRUCTION / ANCHOR / TARGET KEYWORDS:
The user has provided a custom instruction, command, or target keywords: "${customPrompt}"
ABSOLUTE RULES:
1. If this input is a custom command or instruction (e.g., "describe as retro", "make the title poetic", "focus on elegance", "exclude blue color", "emphasize commercial utility", etc.), you MUST strictly follow, apply, and prioritize this directive when generating the Title, Description, and Keywords!
2. If this input represents target keywords (e.g., specific words like "blue, ocean, sunset"), you MUST heavily prioritize and integrate these exact target keywords into both the Title and the Keywords list naturally and prominently.` : "";

  const mediaContext = mediaTypeContext;
  const genSystemInstruction = `You are a professional Adobe Stock, Shutterstock, and Getty Images metadata specialist. 
Your goal is to maximize the discoverability of visual assets and optimize them for search-engine algorithms to rank on the FIRST PAGE of microstock marketplaces.
OUTPUT MUST BE IN ENGLISH for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)} YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY.

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.

MICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES:
- SEARCH INTENT MATCHING: Design metadata to precisely match the search queries of professional commercial buyers (e.g., designers, marketing teams, agency publishers). Ask yourself: "What actual commercial search query would a buyer type to purchase this exact asset?"
- SEMANTIC TAXONOMY: Blend high-weight concrete keywords (exactly what is visible) with abstract conceptual terms (emotions, commercial uses, metaphorical concepts, themes, and demographic vibes).
- HIGH-VALUE NICHE FRONT-LOADING: Place the highest-value, highly specific visual descriptors and niche-relevant keywords at the very beginning of the Titles and Keywords list. Microstock search algorithms weigh earlier words much higher!

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. Front-load the most relevant searchable visual keywords. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", or "Continuous line drawing of".
2. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
3. Use easy-to-read phrases, NOT formal sentence structures.
4. DO NOT treat the title like a list of keywords. No commas separating words.

Rules for Descriptions:
1. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms.
2. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
3. Limit to 200 characters.

Rules for Keywords:
1. Start with the most important, high-converting commercial descriptors. Sort them in descending order of relevance.
2. CRITICAL: Keywords must be single words only. NEVER use multi-word phrases or compound words with spaces.
3. Ensure no IP, brands, or names are included.
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the visually suggested category id "${visualFacts?.semantic_category_analysis?.adobe_id || ""}" with semantic reason "${visualFacts?.semantic_category_analysis?.reason || ""}" if it perfectly matches the visual content.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the visually suggested categories "${visualFacts?.semantic_category_analysis?.shutterstock_category_1 || ""}" and "${visualFacts?.semantic_category_analysis?.shutterstock_category_2 || ""}" if they are a perfect fit.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

VISUAL_FACTS:
${JSON.stringify(visualFacts, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "title": "A highly descriptive natural language title representing the core subject",
  "description": "A detailed visual description focusing on subjects, setting, and mood",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "category_id": 1,
  "shutterstock_category_1": "Abstract",
  "shutterstock_category_2": "Backgrounds/Textures",
  "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly"
}
If generation fails, return {"error": "metadata_generation_failed"}.`;

  let draftMetadata: any = {};
  try {
    let genResponse: any;
    if (NON_GEMINI_PROVIDERS.has(provider)) {
        try {
            genResponse = await callOpenAICompatibleWithRetry({
                systemInstruction: genSystemInstruction,
                contents: `Generate draft metadata based on VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]`,
                responseMimeType: "application/json",
                config: { temperature: temperature ?? 0.3, topP: 0.9 },
                model: activeModel
            });
        } catch (providerError: any) {
             console.warn(`[JohMeta Pipeline] ${provider.toUpperCase()} failed completely:`, providerError.message);
             console.warn(`[JohMeta Pipeline] Falling back to Gemini as absolute failsafe...`);
             genResponse = await callGeminiWithRetry(fallbackGeminiModel, { 
                  parts: [{ text: `Generate draft metadata based on provided VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]` }] 
                }, {
                  systemInstruction: genSystemInstruction,
                  responseMimeType: "application/json",
                  temperature: temperature ?? 0.3,
                  topP: 0.9 
                });
        }
    } else {
        genResponse = await callGeminiWithRetry(activeModel && activeModel.startsWith('gemini-') ? activeModel : fallbackGeminiModel, { 
            parts: [{ text: `Generate draft metadata based on provided VISUAL_FACTS. IMPORTANT: Fill all fields. [RunID: ${Date.now()}-${Math.random()}]` }] 
          }, {
            systemInstruction: genSystemInstruction,
            responseMimeType: "application/json",
            temperature: temperature ?? 0.3,
            topP: 0.9 
          });
    }

    let rawContent = typeof genResponse === 'string' ? genResponse : genResponse.text;
    console.log('### RAW RESPONSE CONTENT ###');
    console.log(rawContent);
    // Add check to see what rawContent is exactly
    console.log('Type of rawContent:', typeof rawContent);
    
    const extracted = extractJSON(rawContent);
    console.log('### EXTRACTED JSON ###');
    console.log(extracted);                
    
    // Check if extracted is just an empty object string
    if (extracted.trim() === '{}') {
        throw new Error('Model returned empty object string "{}"');
    }

    draftMetadata = JSON.parse(extracted);
    console.log('[STAGE 2/3] PARSED:');
    console.log(draftMetadata);
    if (draftMetadata.error) { throw new Error('Model returned error: ' + draftMetadata.error); }
    if (!draftMetadata || typeof draftMetadata !== 'object' || Array.isArray(draftMetadata)) { throw new Error('Model did not return a valid object'); }
    if (!draftMetadata.title && !draftMetadata.description && (!draftMetadata.keywords || draftMetadata.keywords.length === 0)) { throw new Error('Model returned empty object {}'); }
  } catch (err) {
    console.error('[JohMeta Pipeline] Generation Stage 2/3 Failed:', err);
    throw err;
  }

  // --- TAHAP 4, 5, & 6: PROVIDER 4 (MISTRAL), 5 (GROK), & 6 (FINAL VALIDATOR) ---
  console.log(`[JohMeta Pipeline] Stage 4, 5 & 6: Auditing, Ranking, and Final Validation...`);
  console.log("DRAFT BEFORE AUDIT", JSON.stringify(draftMetadata, null, 2));

  const validatorSystemInstruction = `You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets.
OUTPUT MUST BE IN ${getLanguageName(metadataLanguage)} for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE (NO INTELLECTUAL PROPERTY - Based on https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html): 
   - You MUST strictly comply with Adobe Stock's intellectual property refusal guidelines. There are absolutely ZERO exceptions to this rule. Any mention of a brand name, trademark, proprietary model, or protected landmark in the Title, Description, or Keywords will result in instant rejection of the asset by stock reviewers. Always default to generic, descriptive terms!
   - NEVER use, name, or reference any company names, brand names, manufacturer names, trademarked names, or product names (e.g., Apple, Microsoft, Google, Samsung, Nike, Adidas, Sony, Nintendo, Coca-Cola, Pepsi, Starbucks, Disney, Lego, Barbie).
   - NEVER name specific proprietary models, series, or product lines in either the title or keywords (e.g., do NOT use "iPhone", "MacBook", "iPad", "Nintendo Switch", "PlayStation", "Xbox", "Jeep", "Vespa", "Lego", "Barbie", "Air Max", "Walkman", "GoPro"). Instead, use strictly generic equivalents (e.g., use "smartphone", "laptop", "tablet computer", "handheld gaming console", "video game console", "off-road sport utility vehicle", "motor scooter", "toy building blocks", "fashion doll", "athletic sneakers", "portable cassette player", "action camera").
   - NEVER include trademarked names of common products, materials, or services that have become genericized in speech but are protected trademarks (e.g., do NOT use "Velcro" -> use "hook and loop fastener"; "Popsicle" -> use "ice pop"; "Post-it" -> use "sticky note"; "Band-Aid" -> use "adhesive bandage"; "Super Glue" -> use "cyanoacrylate adhesive"; "Frisbee" -> use "flying disc"; "Bubble Wrap" -> use "plastic bubble packaging"; "Crayola" -> use "wax crayons"; "Teflon" -> use "non-stick coating"; "Tupperware" -> use "plastic food storage container"; "PowerPoint" -> use "presentation software"; "Photoshop" -> use "digital image editing software"; "Xerox" -> use "photocopier").
   - NEVER include specific, identifiable car brands/models or manufacturers (e.g., "Porsche 911", "Ferrari", "Tesla Model 3"). Use generic descriptors (e.g., "modern sports car", "electric sedan", "luxury racing automobile").
   - NEVER include names of protected landmarks, private venues, parks, or architectural works that have strict intellectual property/trademark rights on their names (e.g., do NOT use "Disneyland", "Eiffel Tower", "Empire State Building", "Sydney Opera House", "Taj Mahal", "Louvre Museum", "Burj Khalifa", "Colosseum", "Stonehenge"). Instead, refer to them generically where possible (e.g., "famous amusement park", "historic European wrought iron tower", "art deco skyscraper", "iconic harbor opera house", "ancient white marble mausoleum").
   - NEVER include names of fictional characters, intellectual franchises, films, games, or books (e.g., "Harry Potter", "Spider-Man", "Mickey Mouse", "Pokémon", "Minecraft"). Use generic visual descriptions (e.g., "wizard characters", "superhero figure", "cartoon mouse", "pocket monsters design", "pixel block game style").
   - INTELLECTUAL PROPERTY REFUSAL COMMON CAUSES TO STICK TO (MUST COMPLY):
     * Use of logos, trademarks, brand names, or identifiable product packaging is STRICTLY PROHIBITED.
     * Commercial products with distinctive designs MUST NOT be named or suggested as main subjects, such as toys, fashion items, electronics, or designer furniture.
     * Depictions of ticketed locations or restricted sites without required property releases are STRICTLY FORBIDDEN.
     * Certain landmarks or monuments cannot be accepted or named, even with releases (e.g., Menara Eiffel di malam hari, Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, Hollywood Sign, Istana Neuschwanstein, Kuil Sagrada Família interior).
     * Modern architecture with a unique or recognizable design must never be referred to by its trademarked/proprietary name when shown as the primary focus without a release.
     * Copyrighted works, including art, sculptures, street art, illustrations, fonts, or graphic elements created by others, must never be named or referenced.
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.
7. NATURAL HUMAN-LIKE INFERENCE: Identify demographics, professions, cultures, and context naturally like a human would. If a person visually appears to be an "Indian woman", describe her as an "Indian woman" rather than "woman with brown skin". If someone is wearing a white coat in a clinic, call them a "doctor". Apply this human-like recognition to ethnicities, locations, seasons, relationships, and events based on strong visual and cultural cues. Do NOT be overly literal or robotic.

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing language such as "best", "amazing", "stunning", "beautiful", or "perfect".
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language.
3. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
4. Limit to 200 characters.

Rules for Keywords:
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the visually suggested category id "${visualFacts?.semantic_category_analysis?.adobe_id || ""}" with semantic reason "${visualFacts?.semantic_category_analysis?.reason || ""}" if it perfectly matches the visual content.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the visually suggested categories "${visualFacts?.semantic_category_analysis?.shutterstock_category_1 || ""}" and "${visualFacts?.semantic_category_analysis?.shutterstock_category_2 || ""}" if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

VISUAL_FACTS:
${JSON.stringify(visualFacts, null, 2)}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadata, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "title": "A highly descriptive natural language title representing the core subject",
  "description": "A detailed visual description focusing on subjects, setting, and mood",
  "keywords": [],
  "category_id": 0,
  "shutterstock_category_1": "",
  "shutterstock_category_2": "",
  "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly",
  "confidence_score": 0.95
}`;

  let finalMetadataRaw: any = {};
  try {
    const validResponse = await (NON_GEMINI_PROVIDERS.has(provider) 
      ? callOpenAICompatibleWithRetry({
          systemInstruction: validatorSystemInstruction,
          contents: `Audit and validate the Draft Metadata against VISUAL_FACTS. Return final JSON. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model: activeModel
        })
      : callGeminiWithRetry(activeModel && activeModel.startsWith('gemini-') ? activeModel : fallbackGeminiModel, { 
          parts: [{ text: `Audit and validate the Draft Metadata against VISUAL_FACTS. Return final JSON. [RunID: ${Date.now()}-${Math.random()}]` }] 
        }, {
          systemInstruction: validatorSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8 })
    );

    finalMetadataRaw = JSON.parse(extractJSON(typeof validResponse === 'string' ? validResponse : validResponse.text));
  } catch (err) {
    console.warn("[JohMeta Pipeline] Validation Stage 4/5/6 Failed: bypassed:", err.message);
    const heur = getHeuristicCategories(draftMetadata.title, draftMetadata.keywords || []);
    finalMetadataRaw = { 
      ...draftMetadata, 
      category_id: heur.category_id, 
      shutterstock_category_1: heur.shutterstock_category_1, 
      shutterstock_category_2: heur.shutterstock_category_2 
    };
  }

  // --- TAHAP 7: FINAL SANITIZATION & RETURN ---
  try {
    let data = (finalMetadataRaw && typeof finalMetadataRaw === 'object' && !Array.isArray(finalMetadataRaw)) ? { ...finalMetadataRaw } : {};
    
    // Normalize keys
    if (data.desc && !data.description) data.description = data.desc;
    if (data.caption && !data.description) data.description = data.caption;
    if (data.short_description && !data.description) data.description = data.short_description;
    if (data.image_description && !data.description) data.description = data.image_description;
    
    if (data.name && !data.title) data.title = data.name;
    if (data.headline && !data.title) data.title = data.headline;
    if (data.subject && !data.title) data.title = data.subject;

    // Ensure description is valid
    data.description = ensureDescription(data.description || "", data.title || "", data.keywords || []);
    
    // 1. Pembersihan & Penguncian Jumlah Keywords secara Presisi (Hard Slice)
    if (!data.keywords || !Array.isArray(data.keywords)) {
      data.keywords = [];
    }
      let cleanedKeywords: string[] = [];
      
      data.keywords.forEach((k: any) => {
        if (typeof k === 'string') {
          const cleanPhrase = k.toLowerCase()
                               .trim()
                               .replace(/[^a-z0-9\s-]/g, '')
                               .replace(/\s+/g, ' ');
          if (cleanPhrase.length > 1) {
            if (keywordMode === 'single') {
              // Split any phrase into individual single words
              const pieces = cleanPhrase.split(/\s+/);
              pieces.forEach(word => {
                if (word.length > 1 && !isProhibitedKeyword(word)) {
                  cleanedKeywords.push(word);
                }
              });
            } else {
              if (!isProhibitedKeyword(cleanPhrase)) {
                cleanedKeywords.push(cleanPhrase);
              }
            }
          }
        }
      });
      
      const uniqueKeywords = Array.from(new Set(cleanedKeywords));
      
      const allowedTerms = [
        ...(Array.isArray(visualFacts.primary_subjects) ? visualFacts.primary_subjects : []).map((x: any) => x?.name || ""),
        ...(Array.isArray(visualFacts.secondary_subjects) ? visualFacts.secondary_subjects : []).map((x: any) => x?.name || ""),
        ...(Array.isArray(visualFacts.actions) ? visualFacts.actions : []),
        ...(Array.isArray(visualFacts.colors) ? visualFacts.colors : [])
      ].join(" ").toLowerCase();

      // Rule 5: Tambahkan Keyword Validator (Hanya lolos jika keyword memiliki kecocokan kata)
      const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword: string) => {
        if (!allowedTerms || allowedTerms.length < 5) return true;
        const words = keyword.split(/\s+/);
        const hasMatchingWord = words.some(w => allowedTerms.includes(w));
        return hasMatchingWord && !isProhibitedKeyword(keyword);
      });

       // Priority: rigorously filtered first, then pad with remaining keywords to approach target count
      const remainingKeywords = uniqueKeywords.filter((k: string) => !rigorouslyFilteredKeywords.includes(k) && !isProhibitedKeyword(k));
      const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];

      data.keywords = ensureKeywordCount(
        finalKeywordList,
        targetCount,
        visualFacts,
        data.title,
        data.description,
        data.category_id,
        keywordMode
      );

    // 1.5. Enforce professional title length strictly
    data.title = ensureTitleLength(data.title, data.keywords || [], data.description || "", titleLength);

    // 1.8. Validate Adobe category_id to be between 1 and 21 (inclusive). If not, calculate heuristically
    const parsedCategoryId = parseInt(String(data.category_id), 10);
    if (isNaN(parsedCategoryId) || parsedCategoryId < 1 || parsedCategoryId > 21) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      data.category_id = heur.category_id;
    } else {
      data.category_id = parsedCategoryId;
    }

    // 2. Sanitasi & Fallback Otomatis Kategori Shutterstock
    const validShutterstockCats = toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;

    if (!data.shutterstock_category_1 || !validShutterstockCats.includes(data.shutterstock_category_1)) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      data.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : (validShutterstockCats[0] || "Abstract");
    }

    if (
      !data.shutterstock_category_2 || 
      !validShutterstockCats.includes(data.shutterstock_category_2) || 
      data.shutterstock_category_2 === data.shutterstock_category_1
    ) {
      const heur = getHeuristicCategories(data.title, data.keywords || []);
      let secondFallback = heur.shutterstock_category_2;
      if (secondFallback === data.shutterstock_category_1) {
        const possibleVal = toolType === ToolType.VIDEO ? "Backgrounds/Textures" : "Abstract";
        secondFallback = validShutterstockCats.find(cat => cat !== data.shutterstock_category_1) || possibleVal;
      }
      data.shutterstock_category_2 = validShutterstockCats.includes(secondFallback) ? secondFallback : (validShutterstockCats.find(cat => cat !== data.shutterstock_category_1) || "Backgrounds/Textures");
    }
    
    data.category_reason = data.category_reason || visualFacts?.semantic_category_analysis?.reason || "Suggested based on visual semantic analysis.";
    
    return data as StockMetadata;
  } catch (error) {
    console.warn("[JohMeta Parse Error] Failed to handle output format:", error);
    throw new Error("Gagal memproses respons metadata AI ke dalam skema sistem. Silakan coba kembali.");
  }
};

export const generateBatchStockMetadata = async (
  items: { id: string, frames: string[] }[],
  keywordCount: number | string,
  customPrompt: string = "",
  toolType: ToolType = ToolType.IMAGE,
  temperature?: number,
  model?: string,
  keywordMode?: 'mixed' | 'single' | 'multi',
  titleLength?: 'short' | 'medium' | 'long',
  metadataLanguage?: string,
  aiModelPerformance?: 'speed' | 'detail'
): Promise<{id: string, metadata: StockMetadata}[]> => {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  let activeModel = model;
  if (provider === 'gemini' || !NON_GEMINI_PROVIDERS.has(provider)) {
    if (!activeModel || activeModel === 'gemini-3.1-pro-preview' || activeModel === 'gemini-3.1-flash-lite-preview') {
      activeModel = aiModelPerformance === 'speed' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
    }
  } else if (!activeModel) {
    activeModel = PROVIDER_DEFAULT_MODELS[provider];
  }

  const categoriesText = ADOBE_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(', ');
  const shutterstockCategoriesText = (toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(', ');

  // Amankan hitungan target keyword sejak awal
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount + 10; 

  // Rules for keywords depending on keywordMode for batch
  let keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume keywords (including single-word and/or multi-word phrases) in ${getLanguageName(metadataLanguage)}. MUST be short words/phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
  let keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword or phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: descriptors of the primary subjects or objects matching buyer search queries)
   - Action (Activity: descriptors of movements, actions, or commercial activities happening)
   - Context (Environment/Background: setting, backdrop, location context, atmosphere, season)
   - Search Intent & Commercial Concept (Abstract Purpose: target terms representing why a buyer would search for this asset, commercial utility, industrial purpose, psychological mood, emotional intent, business solutions, and symbolic metaphor representation)
   - Industry (Specific/Technical Category: specialized corporate or consumer domains, professional categories)
3. Include both single-word and/or multi-word phrases (1-3 words) when relevant.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;

  if (keywordMode === 'single') {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume SINGLE-WORD keywords in ${getLanguageName(metadataLanguage)}. Strictly avoid multi-word phrases or compound words with spaces. MUST be short words, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: primary single-word subject descriptors)
   - Action (Activity: single-word action/movement descriptors)
   - Context (Environment/Background: single-word background or location setting terms)
   - Search Intent & Commercial Concept (Abstract Purpose: single-word terms representing buyer search intent, commercial purpose, utility, symbolic concept, or emotional mood)
   - Industry (Specific/Technical Category: single-word technical or industry-specific terms)
3. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  } else if (keywordMode === 'multi') {
    keywordRuleSchemaDesc = `List of UP TO ${aiRequestCount} highly-relevant high-volume MULTI-WORD phrase keywords in ${getLanguageName(metadataLanguage)}. Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).`;
    keywordRulePromptText = `1. ABSOLUTE RULE: DO NOT include any color names (e.g., "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "gold", "silver", "bronze", "violet", "indigo", "cyan", "magenta", "teal", "navy", "beige", "charcoal", "cream", "peach", "lavender", "turquoise") as part of any keyword phrase.
2. Detail and elaborate keywords to fully align with the buyer's Search Intent (menjabarkan sedetail mungkin kata kunci sesuai Search Intent atau maksud pencarian komersial pembeli):
   - Subject (Main Focus: multi-word subject/object descriptors matching buyer searches, e.g., "smartphone device")
   - Action (Activity: multi-word motion or commercial action phrases)
   - Context (Environment/Background: multi-word background or location setting phrases)
   - Search Intent & Commercial Concept (Abstract Purpose: multi-word phrases representing the buyer's target intent, commercial use cases, digital trends, emotional concepts, or symbolic metaphors)
   - Industry (Specific/Technical Category: multi-word technical or professional industry terms)
3. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords. MUST be short phrases, NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
4. Prioritize highly searchable buyer terms.
5. Avoid duplicates and keyword stuffing.
6. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE: NEVER include any company names, brand names, manufacturer names, trademarked names/product lines, patented designs, protected landmarks, or fictional characters (e.g., Apple, Nike, iPhone, LEGO, GoPro, Vespa, Jeep) under any circumstances. Ensure every keyword is 100% generic to fully comply with Adobe Stock's intellectual property refusal rules.
7. Every keyword/phrase must be strictly in lowercase.
8. No subjective or professional aesthetic-only terms ("beautiful", "stunning").
9. CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.
11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.1))}: Main Subject
    - Keywords ${Math.max(1, Math.round(targetCount * 0.1)) + 1} to ${Math.max(2, Math.round(targetCount * 0.2))}: SEO & Variasi Subject
    - Keywords ${Math.max(2, Math.round(targetCount * 0.2)) + 1} to ${Math.max(3, Math.round(targetCount * 0.4))}: Attributes
    - Keywords ${Math.max(3, Math.round(targetCount * 0.4)) + 1} to ${Math.max(4, Math.round(targetCount * 0.6))}: Action / State
    - Keywords ${Math.max(4, Math.round(targetCount * 0.6)) + 1} to ${Math.max(5, Math.round(targetCount * 0.8))}: Concept / Intent
    - Keywords ${Math.max(5, Math.round(targetCount * 0.8)) + 1} to ${targetCount}: Environment, Style, Industry, Synonyms
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset.`;
  }


  // --- TAHAP 1: PROVIDER 1 — GEMINI VISION (VISUAL DETECTION) UNTUK BATCH ---
  let visualDescriptions: string[] = [];
  let parsedVisualFactsList: any[] = [];
  const fallbackGeminiModel = aiModelPerformance === 'speed' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
  const visionModelToUse = (activeModel && activeModel.startsWith('gemini-')) ? activeModel : fallbackGeminiModel;
  console.log(`[JohMeta Pipeline - Batch] Stage 1: Running Provider 1 — Gemini Vision (Visual Facts Detection)...`);
  
  for (let i = 0; i < items.length; i++) {
      const imageParts = items[i].frames.map(frame => processFrameServer(frame));
      
      let mediaTypeContext = "The provided image is a photograph or digital artwork. Generate natural, human-readable descriptions of concepts and visual facts smoothly.";
      if (toolType === ToolType.VIDEO) {
        mediaTypeContext = "CRITICAL: The provided images are sequential frames (Start, Middle, End) from a single VIDEO. You MUST analyze the continuous motion, narrative progression, concepts, and storyline (alur) across the frames. Do not just describe them individually; synthesize the overall action and concept into natural, coherent metadata.";
      } else if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) {
        mediaTypeContext = "CRITICAL: The provided image is a VECTOR illustration. You MUST analyze and categorize it based on the ACTUAL SUBJECT MATTER visually present (e.g. if it shows an animal, classify as Animal; if it shows people, classify as People). Do NOT just default to 'Graphic Resources' or 'Abstract' unless it is genuinely a background/texture without clear subjects. Generate natural, smooth descriptions of the subjects.";
      }

      const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE:
Detect every visible subject, action, color, visible text, and composition detail.
Also, conduct a deep assessment on the asset's artistic theme, deeper meaning, and symbolic concept (baca makna mendalam & artistik dari aset tersebut).
Also, perform a profound visual semantic analysis of the image content to suggest the most relevant microstock categories from the official lists.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.

Asset Context: ${mediaTypeContext}

OFFICIAL MICROSTOCK CATEGORY REFERENTIALS FOR SEMANTIC SUGGESTIONS:
- Adobe Stock Categories: ${categoriesText}
- Shutterstock Categories: ${shutterstockCategoriesText}

OUTPUT FORMAT:
{
  "VISUAL_FACTS": {
    "primary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "secondary_subjects": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "background_elements": [
      {
        "name": "",
        "importance": 0
      }
    ],
    "visible_text": [],
    "colors": [],
    "actions": [],
    "composition": [],
    "deeper_meaning_and_symbolism": "Describe the deeper artistic meaning, theme, emotional mood, symbolic message, or conceptual representation of the asset (makna, pesan artistik, atau analogi konsep dari aset tersebut) that represents its true value.",
    "semantic_category_analysis": {
      "adobe_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "reason": "Explain carefully why these official Adobe and Shutterstock categories match the visual content semantically based on primary subjects, context, and deeper theme"
    }
  }
}`;
      
      const promptText = toolType === ToolType.VIDEO 
        ? `Tugas (Asset #${i + 1}): Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`
        : `Tugas (Asset #${i + 1}): Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;

      try {
          const visionResponse = await callGeminiWithRetry(visionModelToUse, { 
            parts: [...imageParts, { text: promptText }] 
          }, {
            systemInstruction: visionSystemInstruction,
            responseMimeType: "application/json",
            temperature: 0.0,
            topP: 0.8 });
          
          let facts = visionResponse.text || "{}";
          visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:\n${facts}`);
          let parsedFacts: any = {};
          try {
             parsedFacts = JSON.parse(extractJSON(facts)).VISUAL_FACTS || {};
          } catch(e) {
             parsedFacts = { primary_subjects: [], secondary_subjects: [], background_elements: [], visible_text: [], colors: [], actions: [], composition: [], semantic_category_analysis: { adobe_id: 0, shutterstock_category_1: "", shutterstock_category_2: "", reason: "Fallback default." } };
          }
          parsedVisualFactsList.push(parsedFacts);
      } catch (err: any) {
          console.warn(`[JohMeta Pipeline - Batch] Vision failed for item ${i}:`, err.message || err);
          const fallbackFacts = {
              VISUAL_FACTS: {
                primary_subjects: [{ name: "main subject", importance: 100 }],
                secondary_subjects: [],
                background_elements: [],
                visible_text: [],
                colors: ["natural"],
                actions: ["commercial posing"],
                composition: ["professional"],
                semantic_category_analysis: {
                  adobe_id: 0,
                  shutterstock_category_1: "",
                  shutterstock_category_2: "",
                  reason: "Fallback static categories used."
                }
              }
          };
          visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:\n${JSON.stringify(fallbackFacts)}`);
          parsedVisualFactsList.push(fallbackFacts.VISUAL_FACTS);
      }
  }

  // --- TAHAP 2 & 3: PROVIDER 2 (GPT ROLE) & PROVIDER 3 (CLAUDE ROLE) — CONTENT GENERATION BATCH ---
  console.log(`[JohMeta Pipeline - Batch] Stage 2 & 3: Generating Draft Metadata for ${items.length} items...`);
  
  const dominantSubjectsArray = parsedVisualFactsList.map(facts => {
      return [
        ...(facts.primary_subjects || []),
        ...(facts.secondary_subjects || [])
      ].filter((item: any) => item.importance >= 50).map((item: any) => item.name);
  });

  const mediaContext = toolType === ToolType.VIDEO ? "CRITICAL: Sequential frames from a single VIDEO. Analyze continuous motion and storyline across frames." : (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS ? "VECTOR illustration. Focus on ACTUAL SUBJECT MATTER explicitly visible inside the illustration for categorization." : "Photograph or digital artwork.");
  
  const customPromptCommand = customPrompt ? `\nCRITICAL CUSTOM INSTRUCTION / ANCHOR / TARGET KEYWORDS:
The user has provided a custom instruction, command, or target keywords: "${customPrompt}"
ABSOLUTE RULES:
1. If this input is a custom command or instruction (e.g., "describe as retro", "make the title poetic", "focus on elegance", "exclude blue color", "emphasize commercial utility", etc.), you MUST strictly follow, apply, and prioritize this directive when generating the Title, Description, and Keywords!
2. If this input represents target keywords (e.g., specific words like "blue, ocean, sunset"), you MUST heavily prioritize and integrate these exact target keywords into both the Title and the Keywords list naturally and prominently.` : "";

  const genSystemInstruction = `You are a professional Adobe Stock, Shutterstock, and Getty Images metadata specialist. 
Your goal is to maximize the discoverability of visual assets and optimize them for search-engine algorithms to rank on the FIRST PAGE of microstock marketplaces.
OUTPUT MUST BE IN ENGLISH for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.

MICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES:
- SEARCH INTENT MATCHING: Design metadata to precisely match the search queries of professional commercial buyers (e.g., designers, marketing teams, agency publishers). Ask yourself: "What actual commercial search query would a buyer type to purchase this exact asset?"
- SEMANTIC TAXONOMY: Blend high-weight concrete keywords (exactly what is visible) with abstract conceptual terms (emotions, commercial uses, metaphorical concepts, themes, and demographic vibes).
- HIGH-VALUE NICHE FRONT-LOADING: Place the highest-value, highly specific visual descriptors and niche-relevant keywords at the very beginning of the Titles and Keywords list. Microstock search algorithms weigh earlier words much higher!

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. Front-load the most relevant searchable visual keywords. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", or "Continuous line drawing of".
2. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
3. Use easy-to-read phrases, NOT formal sentence structures.
4. DO NOT treat the title like a list of keywords. No commas separating words.

Rules for Descriptions:
1. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms.
2. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
3. Limit to 200 characters.

Rules for Keywords:
1. Start with the most important, high-converting commercial descriptors. Sort them in descending order of relevance.
2. CRITICAL: Keywords must be single words only. NEVER use multi-word phrases or compound words with spaces.
3. Ensure no IP, brands, or names are included.
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the suggested adobe_id from the corresponding visual_facts if accurate.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the suggested shutterstock categories from target visual_facts if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

STRICT DEFINING RULES:
- Return a JSON OBJECT containing a "results" array of exactly ${items.length} objects.
- Order MUST match input items exactly.
- Base everything 100% on the VISUAL_FACTS provided for each asset, including the suggestions inside "semantic_category_analysis".

SOURCE VISUAL_FACTS:
${visualDescriptions.join('\n\n')}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "results": [
    { 
      "title": "A highly descriptive natural language title representing the core subject", 
      "description": "A detailed visual description focusing on subjects, setting, and mood", 
      "keywords": [],
      "category_id": 1,
      "shutterstock_category_1": "Abstract",
      "shutterstock_category_2": "Backgrounds/Textures",
      "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly"
    }
  ]
}`;

  let draftMetadataArray: any = [];
  try {
    let genResponse;
    if (NON_GEMINI_PROVIDERS.has(provider)) {
      try {
        genResponse = await callOpenAICompatibleWithRetry({
          systemInstruction: genSystemInstruction,
          contents: `Generate draft metadata array based on VISUAL_FACTS for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model: activeModel
        });
      } catch (providerError: any) {
        console.warn(`[JohMeta Pipeline - Batch] ${provider.toUpperCase()} failed completely:`, providerError.message);
        console.warn(`[JohMeta Pipeline - Batch] Falling back to Gemini as absolute failsafe...`);
        genResponse = await callGeminiWithRetry(fallbackGeminiModel, { 
            parts: [{ text: `Generate draft metadata array based on provided VISUAL_FACTS source. [RunID: ${Date.now()}-${Math.random()}]` }] 
          }, {
            systemInstruction: genSystemInstruction,
            responseMimeType: "application/json",
            temperature: temperature ?? 0.1,
            topP: 0.8 });
      }
    } else {
      genResponse = await callGeminiWithRetry(activeModel && activeModel.startsWith('gemini-') ? activeModel : fallbackGeminiModel, { 
          parts: [{ text: `Generate draft metadata array based on provided VISUAL_FACTS source. [RunID: ${Date.now()}-${Math.random()}]` }] 
        }, {
          systemInstruction: genSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8 });
    }

    let rawContent = typeof genResponse === 'string' ? genResponse : genResponse.text;
    console.log('[STAGE 2/3 BATCH] RAW RESPONSE:');
    console.log(rawContent);
    draftMetadataArray = JSON.parse(extractJSON(rawContent));
    console.log('[STAGE 2/3 BATCH] PARSED:');
    console.log(draftMetadataArray);

    if (!Array.isArray(draftMetadataArray)) {
      if (draftMetadataArray && typeof draftMetadataArray === 'object') {
        if (Array.isArray(draftMetadataArray.metadata)) draftMetadataArray = draftMetadataArray.metadata;
        else if (Array.isArray(draftMetadataArray.items)) draftMetadataArray = draftMetadataArray.items;
        else if (Array.isArray(draftMetadataArray.results)) draftMetadataArray = draftMetadataArray.results;
        else if (Array.isArray(draftMetadataArray.data)) draftMetadataArray = draftMetadataArray.data;
        else if (Object.values(draftMetadataArray).length === 1 && Array.isArray(Object.values(draftMetadataArray)[0])) draftMetadataArray = Object.values(draftMetadataArray)[0] as any[];
        else draftMetadataArray = [draftMetadataArray];
      } else {
        throw new Error('Not an array and cannot map to array');
      }
    }
    if (Array.isArray(draftMetadataArray) && draftMetadataArray.length === 0) { throw new Error("Generated an empty array []"); }
  } catch (err) {
    console.error('[JohMeta Pipeline - Batch] Generation Stage 2/3 Failed:', err);
    throw err;
  }

  // --- TAHAP 4, 5, & 6: AUDIT, RANK, & VALIDATE BATCH ---
  console.log(`[JohMeta Pipeline - Batch] Stage 4, 5 & 6: Final Validation for ${items.length} items...`);
  console.log("DRAFT BEFORE AUDIT", JSON.stringify(draftMetadataArray, null, 2));

  const validatorSystemInstruction = `You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets.
OUTPUT MUST BE IN ${getLanguageName(metadataLanguage)} for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. STRICT ADOBE STOCK IP REFUSAL COMPLIANCE (NO INTELLECTUAL PROPERTY - Based on https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html): 
   - You MUST strictly comply with Adobe Stock's intellectual property refusal guidelines. There are absolutely ZERO exceptions to this rule. Any mention of a brand name, trademark, proprietary model, or protected landmark in the Title, Description, or Keywords will result in instant rejection of the asset by stock reviewers. Always default to generic, descriptive terms!
   - NEVER use, name, or reference any company names, brand names, manufacturer names, trademarked names, or product names (e.g., Apple, Microsoft, Google, Samsung, Nike, Adidas, Sony, Nintendo, Coca-Cola, Pepsi, Starbucks, Disney, Lego, Barbie).
   - NEVER name specific proprietary models, series, or product lines in either the title or keywords (e.g., do NOT use "iPhone", "MacBook", "iPad", "Nintendo Switch", "PlayStation", "Xbox", "Jeep", "Vespa", "Lego", "Barbie", "Air Max", "Walkman", "GoPro"). Instead, use strictly generic equivalents (e.g., use "smartphone", "laptop", "tablet computer", "handheld gaming console", "video game console", "off-road sport utility vehicle", "motor scooter", "toy building blocks", "fashion doll", "athletic sneakers", "portable cassette player", "action camera").
   - NEVER include trademarked names of common products, materials, or services that have become genericized in speech but are protected trademarks (e.g., do NOT use "Velcro" -> use "hook and loop fastener"; "Popsicle" -> use "ice pop"; "Post-it" -> use "sticky note"; "Band-Aid" -> use "adhesive bandage"; "Super Glue" -> use "cyanoacrylate adhesive"; "Frisbee" -> use "flying disc"; "Bubble Wrap" -> use "plastic bubble packaging"; "Crayola" -> use "wax crayons"; "Teflon" -> use "non-stick coating"; "Tupperware" -> use "plastic food storage container"; "PowerPoint" -> use "presentation software"; "Photoshop" -> use "digital image editing software"; "Xerox" -> use "photocopier").
   - NEVER include specific, identifiable car brands/models or manufacturers (e.g., "Porsche 911", "Ferrari", "Tesla Model 3"). Use generic descriptors (e.g., "modern sports car", "electric sedan", "luxury racing automobile").
   - NEVER include names of protected landmarks, private venues, parks, or architectural works that have strict intellectual property/trademark rights on their names (e.g., do NOT use "Disneyland", "Eiffel Tower", "Empire State Building", "Sydney Opera House", "Taj Mahal", "Louvre Museum", "Burj Khalifa", "Colosseum", "Stonehenge"). Instead, refer to them generically where possible (e.g., "famous amusement park", "historic European wrought iron tower", "art deco skyscraper", "iconic harbor opera house", "ancient white marble mausoleum").
   - NEVER include names of fictional characters, intellectual franchises, films, games, or books (e.g., "Harry Potter", "Spider-Man", "Mickey Mouse", "Pokémon", "Minecraft"). Use generic visual descriptions (e.g., "wizard characters", "superhero figure", "cartoon mouse", "pocket monsters design", "pixel block game style").
   - INTELLECTUAL PROPERTY REFUSAL COMMON CAUSES TO STICK TO (MUST COMPLY):
     * Use of logos, trademarks, brand names, or identifiable product packaging is STRICTLY PROHIBITED.
     * Commercial products with distinctive designs MUST NOT be named or suggested as main subjects, such as toys, fashion items, electronics, or designer furniture.
     * Depictions of ticketed locations or restricted sites without required property releases are STRICTLY FORBIDDEN.
     * Certain landmarks or monuments cannot be accepted or named, even with releases (e.g., Menara Eiffel di malam hari, Burj Khalifa, Burj Al Arab, Sydney Opera House, Atomium, Louvre Pyramid, Space Needle, Hollywood Sign, Istana Neuschwanstein, Kuil Sagrada Família interior).
     * Modern architecture with a unique or recognizable design must never be referred to by its trademarked/proprietary name when shown as the primary focus without a release.
     * Copyrighted works, including art, sculptures, street art, illustrations, fonts, or graphic elements created by others, must never be named or referenced.
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.
6. NO MEDIA TYPE WORDS: NEVER include words like "photography", "photo", "illustration", "vector", "image", "picture" in the Title or Keywords. Focus purely on the actual subject matter.
7. NATURAL HUMAN-LIKE INFERENCE: Identify demographics, professions, cultures, and context naturally like a human would. If a person visually appears to be an "Indian woman", describe her as an "Indian woman" rather than "woman with brown skin". If someone is wearing a white coat in a clinic, call them a "doctor". Apply this human-like recognition to ethnicities, locations, seasons, relationships, and events based on strong visual and cultural cues. Do NOT be overly literal or robotic.

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing language such as "best", "amazing", "stunning", "beautiful", or "perfect".
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language.
3. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
4. Limit to 200 characters.

Rules for Keywords:
${keywordRulePromptText}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the suggested adobe_id from the corresponding visual_facts if accurate.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the suggested shutterstock categories from target visual_facts if accurate.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

SOURCE VISUAL_FACTS:
${visualDescriptions.join('\n\n')}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadataArray, null, 2)}

CRITICAL: DO NOT OUTPUT THE PLACEHOLDER STRINGS. YOU MUST WRITE YOUR OWN GENERATED TITLE AND DESCRIPTION.
OUTPUT FORMAT:
{
  "results": [
    {
      "title": "A highly descriptive natural language title representing the core subject",
      "description": "A detailed visual description focusing on subjects, setting, and mood",
      "keywords": [],
      "category_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "category_reason": "Provide a brief 1-sentence visual semantic reason detailing why these categories match the image perfectly",
      "confidence_score": 0.95
    }
  ]
}`;

  let finalMetadataArray: any = [];
  try {
    const validResponse = await (NON_GEMINI_PROVIDERS.has(provider) 
      ? callOpenAICompatibleWithRetry({
          systemInstruction: validatorSystemInstruction,
          contents: `Audit and validate the Draft Metadata array for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model: activeModel
        })
      : callGeminiWithRetry(activeModel && activeModel.startsWith('gemini-') ? activeModel : fallbackGeminiModel, { 
          parts: [{ text: `Audit and validate the Draft Metadata array for ${items.length} assets based on VISUAL_FACTS. [RunID: ${Date.now()}-${Math.random()}]` }] 
        }, {
          systemInstruction: validatorSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8 })
    );

    finalMetadataArray = JSON.parse(extractJSON(typeof validResponse === 'string' ? validResponse : validResponse.text));
  } catch (err) {
    console.warn("[JohMeta Pipeline - Batch] Batch Validation Stage 4/5/6 Failed: bypassed:", err.message);
    finalMetadataArray = draftMetadataArray.map(d => {
      const heur = getHeuristicCategories(d.title, d.keywords || []);
      return { 
        ...d, 
        category_id: heur.category_id, 
        shutterstock_category_1: heur.shutterstock_category_1, 
        shutterstock_category_2: heur.shutterstock_category_2 
      };
    });
  }

  try {
    let dataArray = finalMetadataArray;
    if (!Array.isArray(dataArray)) {
      if (dataArray && typeof dataArray === 'object') {
        if (Array.isArray(dataArray.metadata)) {
          dataArray = dataArray.metadata;
        } else if (Array.isArray(dataArray.items)) {
          dataArray = dataArray.items;
        } else if (Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else if (Object.values(dataArray).length === 1 && Array.isArray(Object.values(dataArray)[0])) {
          dataArray = Object.values(dataArray)[0] as any[];
        } else {
          dataArray = [dataArray];
        }
      } else {
        dataArray = [];
      }
    }

    if (dataArray.length < items.length) {
      console.warn(`[JohMeta Pipeline - Batch] Model returned fewer items (${dataArray.length}) than expected (${items.length}). Padding with fallbacks.`);
      while (dataArray.length < items.length) {
        dataArray.push({});
      }
    } else if (dataArray.length > items.length) {
      console.warn(`[JohMeta Pipeline - Batch] Model returned more items (${dataArray.length}) than expected (${items.length}). Truncating.`);
      dataArray = dataArray.slice(0, items.length);
    }

    return dataArray.map((rawMetadata, index) => {
        // Ensure metadata is a valid object
        let metadata: any = (rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) ? { ...rawMetadata } : {};

        // Normalize keys
        if (metadata.desc && !metadata.description) metadata.description = metadata.desc;
        if (metadata.caption && !metadata.description) metadata.description = metadata.caption;
        if (metadata.short_description && !metadata.description) metadata.description = metadata.short_description;
        if (metadata.image_description && !metadata.description) metadata.description = metadata.image_description;
        
        if (metadata.name && !metadata.title) metadata.title = metadata.name;
        if (metadata.headline && !metadata.title) metadata.title = metadata.headline;
        if (metadata.subject && !metadata.title) metadata.title = metadata.subject;

        // Ensure description is valid
        metadata.description = ensureDescription(metadata.description || "", metadata.title || "", metadata.keywords || []);

        // 1. Pembersihan & Penguncian Jumlah Keywords secara Presisi
        if (!metadata.keywords || !Array.isArray(metadata.keywords)) {
            metadata.keywords = [];
        }
            let cleanedKeywords: string[] = [];
            metadata.keywords.forEach((k: any) => {
                if (typeof k === 'string') {
                    const cleanPhrase = k.toLowerCase()
                                         .trim()
                                         .replace(/[^a-z0-9\s-]/g, '')
                                         .replace(/\s+/g, ' ');
                    if (cleanPhrase.length > 1) {
                        if (keywordMode === 'single') {
                            // Split any phrase into individual single words
                            const pieces = cleanPhrase.split(/\s+/);
                            pieces.forEach(word => {
                                if (word.length > 1 && !isProhibitedKeyword(word)) {
                                    cleanedKeywords.push(word);
                                }
                            });
                        } else {
                            if (!isProhibitedKeyword(cleanPhrase)) {
                                cleanedKeywords.push(cleanPhrase);
                            }
                        }
                    }
                }
            });
            const uniqueKeywords = Array.from(new Set(cleanedKeywords));
            
            const assetVisualFacts = parsedVisualFactsList[index] || {};
            const allowedTerms = [
              ...(Array.isArray(assetVisualFacts.primary_subjects) ? assetVisualFacts.primary_subjects : []).map((x: any) => x?.name || ""),
              ...(Array.isArray(assetVisualFacts.secondary_subjects) ? assetVisualFacts.secondary_subjects : []).map((x: any) => x?.name || ""),
              ...(Array.isArray(assetVisualFacts.actions) ? assetVisualFacts.actions : []),
              ...(Array.isArray(assetVisualFacts.colors) ? assetVisualFacts.colors : [])
            ].join(" ").toLowerCase();

            // Rule 5: Tambahkan Keyword Validator (Hanya lolos jika keyword memiliki kecocokan kata)
            const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword: string) => {
              if (!allowedTerms || allowedTerms.length < 5) return true;
              const words = keyword.split(/\s+/);
              const hasMatchingWord = words.some(w => allowedTerms.includes(w));
              return hasMatchingWord && !isProhibitedKeyword(keyword);
            });

            const remainingKeywords = uniqueKeywords.filter((k: string) => !rigorouslyFilteredKeywords.includes(k) && !isProhibitedKeyword(k));
            const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];

            metadata.keywords = ensureKeywordCount(
              finalKeywordList,
              targetCount,
              assetVisualFacts,
              metadata.title,
              metadata.description,
              metadata.category_id,
              keywordMode
            );

        // 1.5. Enforce professional title length strictly
        metadata.title = ensureTitleLength(metadata.title, metadata.keywords || [], metadata.description || "", titleLength);

        // 1.8. Validate Adobe category_id to be between 1 and 21 (inclusive). If not, calculate heuristically
        const parsedCategoryId = parseInt(String(metadata.category_id), 10);
        if (isNaN(parsedCategoryId) || parsedCategoryId < 1 || parsedCategoryId > 21) {
            const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
            metadata.category_id = heur.category_id;
        } else {
            metadata.category_id = parsedCategoryId;
        }

        // 2. Sanitasi & Fallback Otomatis Kategori Shutterstock
        const validShutterstockCats = toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;

        if (!metadata.shutterstock_category_1 || !validShutterstockCats.includes(metadata.shutterstock_category_1)) {
            const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
            metadata.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : (validShutterstockCats[0] || "Abstract");
        }

        if (
          !metadata.shutterstock_category_2 || 
          !validShutterstockCats.includes(metadata.shutterstock_category_2) || 
          metadata.shutterstock_category_2 === metadata.shutterstock_category_1
        ) {
          const heur = getHeuristicCategories(metadata.title, metadata.keywords || []);
          let secondFallback = heur.shutterstock_category_2;
          if (secondFallback === metadata.shutterstock_category_1) {
              const possibleVal = toolType === ToolType.VIDEO ? "Backgrounds/Textures" : "Abstract";
              secondFallback = validShutterstockCats.find(cat => cat !== metadata.shutterstock_category_1) || possibleVal;
          }
          metadata.shutterstock_category_2 = validShutterstockCats.includes(secondFallback) ? secondFallback : (validShutterstockCats.find(cat => cat !== metadata.shutterstock_category_1) || "Backgrounds/Textures");
        }

        metadata.category_reason = metadata.category_reason || assetVisualFacts?.semantic_category_analysis?.reason || "Suggested based on visual semantic analysis.";

        const targetId = items[index] ? items[index].id : (items[0]?.id || 'unknown');
        return { id: targetId, metadata };
    });
  } catch (error) {
    console.warn("[JohMeta Pipeline - Batch] Parse Error:", error);
    throw new Error("Gagal memproses respons batch metadata. Silakan coba kembali.");
  }
};

function processPromptResults(parsed: any, count: number, subject: string, userNegativePrompt: string) {
  let validatedPrompts = (parsed.prompts || []).filter((p: any) => typeof p === 'string' && p.trim().length > 0);
  
  if (validatedPrompts.length === 0) {
    // If absolutely no prompts, at least returning something to avoid crash, but ideally shouldn't happen
    validatedPrompts = [`${subject} professional stock photography`].map(p => p);
  }

  const originalLength = validatedPrompts.length;
  if (validatedPrompts.length < count) {
    const modifiers = [
      "cinematic macro photography, highly detailed",
      "isometric 3D render, octane render, stylized lighting",
      "vibrant watercolor ink illustration, splash art",
      "futuristic cyberpunk city night life background, neon glow",
      "classical oil painting, textured brush strokes, masterwork",
      "minimalist flat graphic design icon",
      "dramatic backlight, rim lighting, atmospheric depth",
      "wide angle landscape composition, beautiful morning light",
      "studio lighting portrait, bokeh depth of field",
      "vintage retro concept art, detailed illustration"
    ];
    let modIdx = 0;
    while (validatedPrompts.length < count) {
      const base = validatedPrompts[validatedPrompts.length % originalLength];
      const mod = modifiers[modIdx % modifiers.length];
      validatedPrompts.push(`${base}, ${mod} (variation #${validatedPrompts.length + 1})`);
      modIdx++;
    }
  } else if (validatedPrompts.length > count) {
    validatedPrompts = validatedPrompts.slice(0, count);
  }
  
  const appendNeg = userNegativePrompt && userNegativePrompt.trim().length > 0 
    ? `Avoid: ${userNegativePrompt.trim()}` 
    : "";
  
  const processedPrompts = validatedPrompts.map((p: string) => {
    if (appendNeg) {
      const separator = p.trim().endsWith('.') || p.trim().endsWith(',') ? " " : ", ";
      return `${p.trim()}${separator}${appendNeg}`;
    }
    return p.trim();
  });

  return {
    prompts: processedPrompts,
    negativePrompt: appendNeg || parsed.negativePrompt || "",
    styleExplanation: parsed.styleExplanation || [
      `Berhasil mensintesis ${count} variasi prompt bertema ${subject}.`,
      `Menggunakan spektrum gaya dan variabilitas komposisi visual.`,
      `Seluruh prompt dioptimasi dalam bahasa Inggris untuk Midjourney/Stable Diffusion.`
    ]
  };
}

export const generateOptimizedPrompt = async (options: {
  subject: string;
  styleCategory: string;
  variation: number;
  promptMode?: 'background' | 'png';
  pngBgColor?: 'white' | 'black' | 'transparent';
  userNegativePrompt?: string;
  minWords?: number;
  maxWords?: number;
  model?: string;
  seed?: number;
}): Promise<{ prompts: string[]; negativePrompt: string; styleExplanation: string[] }> => {
  const { 
    subject, 
    styleCategory, 
    variation, 
    promptMode = 'background', 
    pngBgColor = 'white', 
    userNegativePrompt = '',
    minWords = 10,
    maxWords = 70,
    model = undefined,
    seed = Math.floor(Math.random() * 1000000)
  } = options;

  const count = Math.min(Math.max(variation, 10), 150);

  // ELEMEN KEJUTAN (Surprise Element) - Random Salt & Diversity Injection
  const angles = ["low-angle shot", "eye-level shot", "high-angle perspective", "overhead aerial shot", "macro close-up", "medium shot", "wide-angle panoramic shot", "three-quarter portrait shot"];
  const lightings = ["golden hour light", "bright overcast daylight", "soft window light", "dramatic side-lighting", "warm indoor ambient light", "moody twilight", "misty dawn light", "vibrant studio rim-lighting", "sun-dappled shadows", "cool soft morning light"];
  const compositions = ["rule of thirds alignment", "symmetric composition", "minimalist empty-space negative layout", "diagonal leading lines", "frame-within-a-frame depth", "centered dominant focus with spacious copy space", "shallow depth-of-field", "dynamic foreground elements with blurred background"];
  const seasonsOrWeathers = ["crisp autumn afternoon", "warm summer glow", "misty spring morning", "subtle winter frost", "gentle drizzle rain", "clear sunny day", "soft foggy atmosphere", "dusk sunset sky"];
  const colorPalettes = ["natural warm earthy tones", "subtle cool pastel hues", "vivid high-saturation colors", "sophisticated minimalist monochromatic tones", "muted organic color palette", "soft warm gold and cream"];

  // Linear Congruential Generator (PRNG) using the seed to ensure deterministic but highly varied selections
  let currentSeed = seed;
  const prng = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  const selectRandom = <T>(arr: T[]): T => {
    const r = prng();
    return arr[Math.floor(r * arr.length)];
  };

  const randomAngle = selectRandom(angles);
  const randomLighting = selectRandom(lightings);
  const randomComp = selectRandom(compositions);
  const randomSeason = selectRandom(seasonsOrWeathers);
  const randomColor = selectRandom(colorPalettes);

  const randomSaltInjection = `[Random Composition Base: ${randomAngle}, ${randomLighting}, ${randomComp}, ${randomSeason}, ${randomColor}, Seed ID: ${seed}]`;

  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  const isPngMode = promptMode === 'png';
  let modeConstraint = "";

  const styleSpecificDirectives: Record<string, string> = {
    "Vector Art": ' - Focus on clean geometric paths, flat colors, minimalist shapes, and sharp digital outlines typical of Adobe Illustrator. NO gradients unless requested.',
    "3D Render": ' - Focus on soft studio lighting, Octane render quality, glossy or matte plastic materials, raytraced reflections, and smooth 3D surfaces.',
    "Sticker Illustration": ' - You must explicitly append tags such as "sticker format", "die-cut stickers", "sticker asset with white border" and "thick sticker outline" into the prompt variations.',
    "Flat Icon": ' - Focus on simplified pictograms, 2D minimalist design, strong symbol-based visual language, and high-contrast solid colors.',
    "Pixel Art": ' - Focus on visible square pixels, limited color palette, 8-bit or 16-bit retro game aesthetics, and sharp pixelated edges.',
    "Isometric": ' - Focus on 3D objects viewed from a fixed 45-degree isometric angle, clean structural lines, and organized geometric composition.',
    "Claymation Style": ' - Focus on hand-molded clay textures, fingerprint details, stop-motion animation aesthetic, and soft organic physical materials.',
    "Origami Style": ' - Focus on folded paper textures, sharp creases, geometric paper construction, and delicate paper material appearance.',
    "HandDrawn Sketch": ' - Focus on pencil or ink strokes, charcoal textures, artistic hatching, and the look of a sketchbook drawing.',
    "Glassmorphism": ' - Focus on frosted glass effects, translucent layers, blurred background refraction, and sleek glossy reflections.',
    "Metal Emboss": ' - Focus on metallic surfaces, raised 3D textures, engraved details, and realistic metal reflections like silver, gold, or steel.',
    "Line Art": ' - Focus on clean black and white lines, elegant curves, minimalist continuous line work, crisp vector outlines, and zero shading or gradients unless requested. Elegant, simple, and high-contrast ink strokes.',
    "Lowpoly": ' - Focus on visible geometric triangular facets, faceted surfaces, and stylized abstract crystalline structures.',
    "3D CGI": ' - Focus on clean computer-generated imagery with perfect geometry. Emphasize synthetic materials like smooth plastic, polished glass, sleek metal, or vibrant gel. Use highly controlled studio lighting or global illumination. The result should look like a high-end digital render from Blender or Cinema 4D, NOT a real-world photograph. AVOID: Photorealistic textures, natural imperfections, and real camera noise.',
    "Cinematic": ' - Focus on high-budget movie-set cinematography. MUST feel like a genuine motion picture still with narrative depth and dramatic mood. Prioritize: Wide cinematic aspect ratios, cinematic anamorphic lenses with subtle lens flares, organic volumetric haze, beautiful backlight/rim light, high production value, and deep cinematic color grading (e.g., warm gold, cool blue, orange and teal, moody cinematic shadow). Composition must be dynamic with cinematic framing (e.g., cinematic leading lines, cinematic symmetry, depth-of-field, tracking shot perspective). AVOID: Flat studio lighting, plain white/black backdrops, simple stock photography expressions, and non-cinematic flat compositions.',
    "Photorealistic": ' - Generate photorealistic, authentic, high-end real-world photography. MUST look like a real physical photograph captured by a professional camera (e.g., DSLR or mirrorless). Prioritize: Pin-sharp clarity, natural skin/surface textures (e.g., pores, fine fabrics, wood grain, organic imperfections), authentic human candid expressions, and realistic real-world environments. Use natural sunlight, overcast daylight, or authentic studio strobe lighting with soft realistic shadows. Include realistic professional camera settings (e.g., 50mm lens, 85mm portrait lens, f/1.8 aperture for shallow depth of field, f/8 for sharp landscape, 1/250s shutter speed). AVOID: Theatrical cinematic color grading, CGI look, fantasy elements, artificial dramatic rim-lights, volumetric mist/fog, or movie-like dramatic staging.',
    "Anime/Manga": ' - Focus on cel-shaded aesthetics, expressive character features, vibrant colors, and classic Japanese hand-drawn illustration styles.',
    "Watercolor Painting": ' - Focus on flowing pigment washes, paper grain textures, organic color bleeds, and delicate artistic strokes.',
    "Oil Painting": ' - Focus on heavy brushstrokes, impasto textures, rich pigment layers, and classical fine art canvas aesthetics.',
    "Paper Cut": ' - Focus on layered paper textures (lapisan kertas bertumpuk), sharp and clean cut edges (tepi potongan tajam dan rapi), profound 3D depth effects from multiple stacked paper layers, soft drop shadows between layers (bayangan lembut antar lapisan kertas), highly detailed handcrafted papercraft aesthetic, compositions constructed purely from cut paper shapes rather than drawings/paintings, matte paper textures, clean silhouettes, and beautiful solid colors for each stacked layer.',
    "Abstract": ' - Style Guide: Deconstruct the subject into a dynamic expression of energy, motion, and non-literal forms. Visual Characteristics: Explosive swirls of pigment, kinetic energy trails, thick impasto textures, layered translucent facets, and dramatic asymmetric compositions. Sub-styles to master: Abstract Expressionism (gestural strokes), Fluid Art (marble/ink swirls), Neon Abstract (glow trails), Geometric Abstraction (fractured shapes), Fractal Patterns (mathematical complexity), or Glitch Art (digital distortion). Prompt Structure: "Abstract, [Subject deconstructed into energy/forms] using [Selected sub-style] with [Specific textures: e.g., vibrant paint splatters, crystalline facets, fluid silk flows] and [Atmospheric lighting]. No clear primary subject—focus on the overall concept of motion and mood." AVOID: Photorealistic rendering, literal anatomy, recognizable objects, 3D raytracing, camera lens specs, and realistic world-building.'
  };

  const currentDirective = styleSpecificDirectives[styleCategory] || '';

  if (isPngMode) {
    const stickerPrevention = styleCategory !== "Sticker Illustration" 
      ? ' - DO NOT use words like "sticker", "badge", or "die-cut" in the prompts. The subject must be a high-quality standalone asset.'
      : '';

    modeConstraint = `
CRITICAL PNG MODE SETTINGS:
- The user requests PNG Asset style generation.
- All generated prompt variations MUST strictly place the main subject "${subject}" isolated on a solid ${pngBgColor} background.
- Focus on a premium, high-end commercial presentation of the subject with exquisite detailing, high fidelity, and ultra-clean studio quality.
- The arrangement and styling are fully flexible—let the AI design the composition dynamically, prioritizing a professional, high-end visual asset.
- You must explicitly append tags such as "isolated on a plain ${pngBgColor} background", "solid flat ${pngBgColor} backdrop", or "pure solid ${pngBgColor} background, no shadows" into the prompt variations.
${currentDirective}
${stickerPrevention}
- Extremely important: Do NOT describe any background scenery, environmental elements, horizon lines, decorative interiors, or context elements. The subject must float on a pure solid ${pngBgColor} background.`;
  } else {
    modeConstraint = `
CRITICAL BACKGROUND MODE SETTINGS:
- The user requests fully composed visual scenes with complex background environments or scenic backdrops.
${currentDirective}
- You MUST describe rich scenic environments (e.g., matching the style context "${styleCategory}") behind the subject.
- Do NOT isolate the subject on flat background. Integrate it with scenic depth and ambient environments.`;
  }

  let userNegInstruction = "";
  if (userNegativePrompt && userNegativePrompt.trim().length > 0) {
    userNegInstruction = `
- Custom anti-directives / negative constraints to strictly AVOID or exclude: "${userNegativePrompt}"
Make sure your generated prompts do not contain these elements or depict them in any form, and include them in the generated negativePrompt value.`;
  }

  const isPhotographic = ['Photorealistic', 'Cinematic', 'Vintage Photography'].includes(styleCategory);

  const systemInstruction = `You are an elite AI Image Prompt Designer specializing in text-to-image generators like Midjourney, DALL-E 3, Adobe Firefly, and Stable Diffusion.
Anda adalah AI Prompt Generator ahli yang bertugas membuat prompt gambar unik dan bervariasi.
Your job is to translate a raw idea and specific style choices into exactly ${count} highly unique, descriptive, and professional-grade generation prompt variations in English.

Input parameters:
- Base Subject/Idea: "${subject}"
- Selected Style Context: ${styleCategory}
- Theme Context & Salt Variabilitas: ${randomSaltInjection}
- Requested Number of Prompt Variations: ${count}
- Requested Word Count Range: ${minWords} to ${maxWords} words per prompt
- Focus Mode: ${promptMode.toUpperCase()}${userNegInstruction}
${isPngMode ? `- Requested PNG Background color: ${pngBgColor}` : ""}
${modeConstraint}

PROMPT GENERATION PRIORITY (STRICT ORDER):
1. Theme subject: The core subject MUST remain the dominant focus of the prompt.
2. Visual characteristics: Describe specific colors, shapes, and the overall aesthetic vibe.
3. Materials and textures: Detail the surfaces, physical properties, and tactile qualities (e.g., stacked paper layers for Paper Cut, hand-molded clay textures for Claymation, canvas grain/pigments for Oil/Watercolor paintings, clean vector geometry for Vector Art).
4. Environment: Only introduce environmental details if they naturally fit the theme. Do not introduce unrelated environments.
5. Lighting: Essential details about mood, shadows, and light sources (e.g., soft shadows between layers for Paper Cut, clean solid gradients for Vectors, natural sunlight/fog for photo styles).
6. ${isPhotographic ? 'Camera details: Specific lens types, aperture, and camera angles (e.g., 85mm lens, f/1.8, high shutter speed, DSLR).' : 'Medium-Specific details: Focus entirely on visual craftsmanship and physical/digital medium characteristics. Do NOT include camera models, focal lengths, shutter speeds, or photographic sensor details.'}

Rules for the Generated Prompts:
0. PROMPT STRUCTURE FORMULA: Every prompt MUST strictly start with "${styleCategory}" and then follow this sequence: [Subject] [Action] [Visual Characteristics] [Materials/Textures] [Environment] [Lighting]${isPhotographic ? ' [Camera Details]' : ''} [Commercial Intent]. Combine these elements into a fluid, professional description.
0.1 DOMAIN AUTHENTICITY: For artistic, illustrated, graphic, 3D, and crafted styles, you are strictly forbidden from forcing photographic jargon (such as "shot on", "aperture", "f-stop", "lens", "shutter speed", "DSLR", "realistic photography", "realistic skin/hair texture") into the prompts. They must remain 100% true to their original non-photographic artistic style.
0.2 COMMERCIAL PRIORITY: The subject must occupy at least 30% of the visual attention. The commercial concept must be immediately understandable.
1. ALWAYS translate the core subject "${subject}" to descriptive, high-quality, vivid English first if it was entered in another language (like Indonesian).
2. Return EXACTLY ${count} unique prompt variations as an array. Each must be distinct, professionally composed for its native style domain (real photography or high-quality illustration/craft/CGI), use distinct compositions/lighting/medium details, and include "copy space" (negative space) for text placement.
3. WORD COUNT CONSTRAINT: Each generated prompt SHOULD be between ${minWords} and ${maxWords} words long. Adjust the level of detail to strictly match this requested length profile.
4. COMMERCIAL STOCK COMPLIANCE: Focus on clean, high-resolution, sharp focus, uncluttered, professional editorial photography/art aesthetics, suitable for Shutterstock/Adobe Stock. Absolutely avoid trademarked logos or specific intellectual property.
5. NO KEYWORD SPAM: Strictly forbidden to provide a list of repetitive commas, keywords, or SEO tags. Describe the *composition* naturally and vividly (like a magazine editorial).
6. The list must contain exactly ${count} different strings. Do not repeat prompts.
7. The negativePrompt MUST be a single concise string starting with the word "Avoid" followed by a list of elements to exclude. If there are truly no relevant negative elements for a specific request, return an empty string for this field instead of using placeholders like "none" or "N/A".
8. CRITICAL QUALITY DIRECTIVE: This is for high-fidelity text-to-image generator prompts (e.g. Midjourney). Each prompt variation must read like a gorgeous, professional image description, not a database search query.
9. CRITICAL: Conform exactly to the requested JSON schema.
10. STRICT ADOBE NO SIMILAR CONTENT RULE (CRITICAL FOR ADOBE STOCK COMPLIANCE):
    You MUST adhere exactly to Adobe Stock's "Similar vs. Spamming" guidelines. Adobe Stock rejects content with the reason: "During our review, we found that your submission closely resembles content already available on Adobe Stock... we refuse content that is too repetitive so customers can easily find distinct and relevant content."
    - EVERY SINGLE PROMPT in the batch MUST be clearly, visibly, and dramatically differentiated from the others to prevent "Similar content" flag rejections.
    - Do NOT just make minimal variations (e.g., just changing a shirt color or moving a prop slightly). Each prompt must be a visually distinct, unique, and standalone masterpiece.
    - Moderators look for NOTICEABLE DIFFERENCES including variations in composition, color, expression, or scenario. You must be extremely selective and output only your most varied, premium, and distinct concepts.
    - Inject extreme variation across:
      * Composition & Camera Angle: Vary across wide shots, extreme close-up, medium shots, bird's-eye view, low-angle perspective, and overhead drone shots.
      * Color Palette & Lighting Setup: Vary across natural golden hour, bright overcast daylight, neon nights, moody low-key twilight, soft studio lighting, high-contrast chiaroscuro, and cool pastel hues.
      * Subjects, Expressions & Poses: Vary characters' ages, genders, ethnicities, actions, emotional expressions (e.g., focused, joyful, contemplative, active, serene), and direct interactions with their surroundings.
      * Scenario & Environment: Change environments completely (e.g., indoors vs. outdoors, modern minimalist spaces vs. raw nature, urban landscapes vs. intimate workspaces).
    - ABSOLUTE STYLE SEPARATION (CINEMATIC VS PHOTOREALISTIC):
      * If the Selected Style is "Cinematic", the output prompts MUST be strictly cinematic, looking like a movie-set still with anamorphic qualities, film color grading, volumetric lighting, and dramatic mood. Do NOT generate standard flat stock photos.
      * If the Selected Style is "Photorealistic", the output prompts MUST be strictly realistic, looking like sharp, candid, organic real-world captures with lifelike skin/surface textures, natural sunlight or soft studio strobes, and genuine human behaviors. Do NOT inject theatrical movie color grading or artificial film flares.
      * NEVER mix, swap, or blur the lines between Cinematic and Photorealistic style prompts! Keep them completely distinct and accurate to their true style definition.
    - PNG ASSET VARIATION (OBJECT COUNT & ARRANGEMENTS):
      * For PNG/isolated asset mode, you MUST inject extreme variety in subject count and arrangement. Stagger the variations so that some prompts describe a single standalone object, some describe exactly two related or complementary objects, and some describe an elegant flat lay, dynamic grouping, or a neat set of 3+ objects. This ensures a rich, diverse asset pack and completely prevents "similar content" rejection.
    - Share your best, most varied work.
11. ADOBE STOCK CONTENT STRATEGY (MUST FOLLOW STRICTLY):
You are an Adobe Stock content strategist. Before generating prompts, avoid concepts that are already heavily saturated on Adobe Stock.
- Avoid concepts that belong to the top 20% most common Adobe Stock categories.
- Prioritize: Emerging trends, Uncommon professions, Future technology, Niche hobbies, Rare cultural activities, Unique lifestyle situations, Untapped commercial concepts.
- Do not generate: Generic business meetings, Generic office workers, Generic smiling people, Generic laptops on desks, Generic handshakes, Generic teamwork scenes.
- Each prompt must represent a commercially valuable concept that is visually distinct from existing stock content.
- Generate concepts first, then generate prompts.
- Reject any concept that feels common, saturated, overused, or similar to typical Adobe Stock results.
12. CRITICAL NEGATIVE PROMPT FORMAT: If you provide a negativePrompt, it MUST start with the prefix "Avoid: " followed by the list of forbidden elements.
13. LANGUAGE CONSISTENCY: While all prompts must be in English, the styleExplanation must be in Indonesian.
14. OPTIONALITY: Jika tidak ada elemen yang benar-benar relevan atau dibutuhkan (khususnya untuk negativePrompt), jangan memaksakan untuk membuatnya (biarkan kosong). Hindari teks placeholder.
`+
`15. STICKER PREVENTION: Khusus untuk gaya gaya yang BUKAN Sticker, jangan buat detail border atau die-cut.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      prompts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `An array containing exactly ${count} unique generated prompt variations based on the visual idea, strictly in English.`
      },
      negativePrompt: {
        type: Type.STRING,
        description: 'The corresponding negative prompt containing quality/style anti-directives.'
      },
      styleExplanation: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'A 3-bullet explanation list of styles used in Indonesia.'
      }
    },
    required: ['prompts', 'negativePrompt', 'styleExplanation']
  };

  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-flash-latest'];
  let lastError: any = null;

  if (NON_GEMINI_PROVIDERS.has(provider)) {
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      try {
        console.log(`[generateOptimizedPrompt] Attempting with ${provider.toUpperCase()} (attempt ${attempts + 1}/${maxAttempts})...`);
        const text = await callOpenAICompatibleWithRetry({
          systemInstruction,
          contents: `Expand the concept into ${count} unique immersive prompt variations of type "${styleCategory}" based on: "${subject}". Write fully formed, vivid natural language sentences.`,
          responseMimeType: "application/json",
          responseSchema,
          config: { temperature: 0.85 },
          model
        });
        
        const parsed = JSON.parse(text);
        let promptArray = [];
        if (parsed && Array.isArray(parsed.prompts)) {
            promptArray = parsed.prompts;
        } else if (Array.isArray(parsed)) {
            promptArray = parsed;
        } else if (parsed && Array.isArray(parsed.variations)) {
            promptArray = parsed.variations;
        }
        
        if (promptArray.length > 0) {
            return processPromptResults({ prompts: promptArray, negativePrompt: parsed.negativePrompt || '', styleExplanation: parsed.styleExplanation || [] }, count, subject, userNegativePrompt);
        }
        throw new Error('Missing or empty prompts array in JSON response');
      } catch (err: any) {
        lastError = err;
        attempts++;
        console.warn(`Error on ${provider.toUpperCase()} on attempt ${attempts}:`, err.message || err);
        if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else {
    // If user explicitly provided a Gemini model via `model`, use it as primary, else default fallback chain
    const modelsToTryList = model && model.startsWith('gemini') ? [model, ...modelsToTry] : modelsToTry;
    for (const modelName of modelsToTryList) {
      let attempts = 0;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        try {
          console.log(`[generateOptimizedPrompt] Attempting with model ${modelName} (attempt ${attempts + 1}/${maxAttempts})...`);
          const response = await callGeminiWithRetry(modelName, {
            parts: [{ text: `Expand the concept into ${count} unique immersive prompt variations of type "${styleCategory}" based on: "${subject}".\n\nCRITICAL: Write fully formed, vivid natural language sentences. DO NOT use comma-separated keyword lists or tags. Each variation MUST be a complete, descriptive paragraph.` }]
          }, {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.85
          });

          const text = response.text || "{}";
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
            return processPromptResults(parsed, count, subject, userNegativePrompt);
          }
          throw new Error('Missing or empty prompts array in JSON response');
        } catch (err: any) {
          lastError = err;
          attempts++;
          console.warn(`Error on ${modelName} on attempt ${attempts}:`, err.message || err);
          if (err.message && err.message.includes('API_KEY')) throw err;
          if (attempts < maxAttempts) {
            const backoffTime = attempts * 1500;
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      }
    }
  }

  console.warn("All AI models and attempts failed for Prompt Generation. Failing back to programmatic fallback...", lastError);

  // Helper translations & mappings
  const translationPairs: Record<string, string> = {
    "astronot": "astronaut",
    "kucing": "cat",
    "anjing": "dog",
    "kopi": "coffee",
    "secangkir": "a cup of",
    "lucu": "cute",
    "memegang": "holding",
    "gaya": "style",
    "dengan": "with",
    "gedung": "building",
    "pencakar": "scraper",
    "langit": "sky",
    "taman": "garden",
    "gantung": "hanging",
    "senja": "dusk",
    "rubah": "fox",
    "mata": "eyes",
    "bercahaya": "glowing",
    "bertengger": "perching",
    "berteduh": "sheltering",
    "bawah": "under",
    "pohon": "tree",
    "sakura": "cherry blossom",
    "mistis": "mystical",
    " interior": "interior",
    "perpustakaan": "library",
    "kuno": "ancient",
    "melayang": "floating",
    "lilin": "candle",
    "mobil": "car",
    "cepat": "fast",
    "pantai": "beach"
  };
  
  let words = subject.toLowerCase().split(/\s+/);
  let translatedWords = words.map(w => translationPairs[w] || w);
  let resolvedSubject = translatedWords.join(" ");

  const styleFallbackMap: Record<string, string[]> = {
    "Cinematic": [
      "anamorphic lens, volumetric lighting, hyper-realistic cinematic key shot, intense atmospheric depth, cinematic lighting",
      "shot on Arri Alexa LF, moody dramatic scene, photorealistic smoke effects, shallow depth of field",
      "golden hour sunlight, masterfully composed cinema frame, intricate environmental storytelling",
      "rembrandt lighting style, cinematic shadow play, ultra-sharp 8k rendering, heavy depth of field",
      "cyber-noir cinema composition, epic scale, rainy conditions with beautiful lens glares, highly dramatic keyvisual",
      "warm rim-lit close up action frame, stunning environmental details, award-winning cinematic color grading",
      "breathtaking cinematic masterpiece, dramatic high-contrast lighting, 35mm lens rendering, hyperdetailed environment",
      "epic wide cinematic establishing shot, mist and volumetric fog playing with soft morning light",
      "professional movie concept art, epic scale composition, stylized dramatic shadows, soft amber glow",
      "low-key cinematic studio key lights, cinematic bokeh background, ultra-crisp resolution"
    ],
    "3D CGI": [
      "clean 3D CGI render, perfectly neat geometry, smooth plastic and glass materials, high-gloss synthetic surfaces",
      "vibrant 3D digital art, glossy metal and gel textures, controlled studio global illumination, Cinema 4D style",
      "polished 3D CGI illustration, stylized digital aesthetic, subsurface scattering on gel materials, Blender cycles render",
      "impeccable 3D render, minimalist digital composition, glossy reflections, vibrant color palette, non-photorealistic CGI",
      "high-end 3D visual, smooth semi-translucent surfaces, perfect highlights and shadows, professional digital craftsmanship",
      "stylized 3D CGI character, toy-like plastic finish, clean digital lines, vibrant studio lighting setup",
      "advanced 3D CGI abstract, geometric precision, glass and chrome materials, futuristic digital render",
      "ultra-clean 3D CGI close up, macro digital detail, smooth textures, professional CGI lighting",
      "creative 3D CGI concept, imaginative digital materials, neat shapes, high-quality digital production value",
      "high-fidelity 3D CGI render, synthetic material focus, clear digital resolution, perfect lighting balance"
    ],
    "Vector Art": [
      "sleek flat vector style, bold clean geometric outlines, vibrant color palette, vector graphics",
      "minimalist vector illustration, smooth curves, flat design aesthetic, Adobe Illustrator style",
      "sharp vector graphic, solid bold gradients, high fidelity flat shading style, crisp edges",
      "modern corporate vector illustration, stylized characters and scenery, trending on Dribbble",
      "creative 2D vector art, clean layout, perfect proportions, beautifully composed vector scene",
      "retro-wave flat vector art, precise paths, bold pop colors, clean design",
      "elegant minimalist flat graphic design, balanced colors, sharp clean paths, artistic vector",
      "2D stylized vector print illustration, high end packaging design concept, clean outline art",
      "modern editorial flat vector, stylized visual presentation, premium visual look",
      "flat minimal vector layout, screen printed aesthetic, striking balanced hues, beautiful color blocking"
    ],
    "Photorealistic": [
      "sharp raw photograph, ultra photorealistic, shot on 50mm f/1.2 lens, rich natural colors, highly detailed",
      "hyper-realistic photography, high-end studio portrait lighting, realistic skin textures and fine details",
      "candid street photo capturing perfect life-like mood, natural ambient daylight, 8k resolution, crisp",
      "award-winning macro photograph, intense detail, natural soft bokeh depth of field, stunning reality",
      "professional editorial commercial photo, masterfully balanced contrast, shot on high-end DSLR",
      "outdoor scenic realistic shot, overcast soft lighting, photorealistic textures, perfectly balanced shot",
      "cinematic photorealism, beautiful rim light, exquisite real-world texture rendering, ultra-sharp",
      "close up photorealistic shot, natural reflections, authentic atmosphere, high-fidelity colors",
      "crisp morning daylight photography, clean composition, true-to-life color grading, 100mm lens",
      "high dynamic range studio close-up, sharp facial details, stunning realism, beautiful soft shadows"
    ],
    "Fantasy Art": [
      "enchanting fantasy art style, ethereal magical glow, mythical elements, high fantasy digital painting",
      "legendary illustrative concept art, glowing fairy lights, majestic ancient scenery, ethereal mist",
      "breathtaking magical fantasy painting, vibrant celestial mood, whimsical details, highly immersive",
      "mythical fantasy masterpiece, epic scenery, radiant lighting elements, magical spell particle details",
      "dark fantasy digital paint style, ornate architecture, mysterious ambient light, extremely detailed",
      "dreamy surreal illustrative environment, cozy glowing colors, beautiful watercolor-like soft textures",
      "epic fantasy landscape painting, ancient ruins, magical glowing crystals, soft golden lighting",
      "celestial fantasy key art, divine golden illumination, beautiful starry sky background, masterwork",
      "whimsical storybook digital painting, rich saturated warm colors, cozy fantasy vibe",
      "gothic fantasy concept art, dramatic moonlit scenery, beautiful intricate illustrations, epic scale"
    ],
    "Scifi Concept Art": [
      "sci-fi concept art illustration, high-tech spaceship interior, futuristic details, cinematic key visual",
      "space exploration alien-planet scenic, cyberpunk elements, futuristic architecture, sleek structures",
      "advanced robotics blueprint style visual, high-tech holograms, futuristic design concept",
      "epic interstellar landscape, planets and stars, deep cosmic color palette, futuristic sci-fi visual",
      "futuristic laboratory scene, glowing blue neon lines, complex technical details, advanced tech concept",
      "cyber-enhanced futuristic visual, high-tech carbon fiber textures, detailed metal mesh patterns",
      "intergalactic space station docking bay illustration, giant sci-fi engines, massive scale, detailed machinery",
      "gorgeous sci-fi poster illustration, futuristic neon-lit monolith, intricate machinery, sleek layout",
      "futuristic metropolis skybridge scene, flying vehicles, gorgeous sci-fi concept aesthetic",
      "advanced alien civilization city view, glowing structures, beautiful high-tech concept art"
    ],
    "Anime/Manga": [
      "vibrant anime style key visual, detailed digital anime cell, beautiful character art, Studio Ghibli inspired scenery",
      "modern anime digital painting, gorgeous hand-drawn aesthetics, soft lighting, vibrant aesthetic shades",
      "epic action anime fight background, dramatic light beams, detailed hand-sketched lines, top trending anime artist",
      "cozy daily life anime wallpaper, beautiful afternoon sunbeams, dust particles, beautiful warm mood",
      "detailed retro 90s anime style, nostalgic color grading, classic hand-painted cell look",
      "gorgeous movie poster anime art, breathtaking sky and clouds, epic scaling, beautiful colors",
      "Kyoto Animation style, brilliant soft glow, highly expressive character focus, clean line art",
      "manga cover art illustration, high contrast inks with gorgeous screentones, stylized color shading",
      "epic fantasy anime scene, magical floating islands, sparkling lights, beautiful color grading",
      "shounen anime style dramatic key shot, power aura, intense lines, breathtaking backdrop"
    ],
    "Watercolor Painting": [
      "artistic watercolor painting, bleeding pigment washes, elegant ink spatters, beautiful canvas texture",
      "soft pastel watercolor illustration, delicate flowing colors, hand-painted artistic masterpiece",
      "vivid watercolor with heavy ink accents, artistic splash art style, organic fluid watercolor washes",
      "traditional Japanese sumi-e wash painting, delicate brushstrokes, minimalist watercolor theme",
      "dreamy watercolor and gouache illustrations, gorgeous bleeding shades, fine textures",
      "expressive abstract watercolor art, dripping colorful pigments, beautiful modern composition",
      "vintage style watercolor page illustration, warm organic feel, handcrafted art texture",
      "delicate floral watercolor style, soft gradients, hand-sketched ink outlines, highly artistic",
      "rustic watercolor concept art, beautiful blending, rich paper grains, atmospheric colors",
      "vibrant watercolor sky and environment wash, creative paint blots, detailed fluid color strokes"
    ],
    "Oil Painting": [
      "classical fine art oil painting, rich canvas textures, thick impasto brushstrokes, realistic lighting",
      "masterfully composed Renaissance oil painting, textured pigment layers, dramatic chiaroscuro contrast",
      "19th century impressionistic oil canvas, loose visible brush strokes, vivid colors, beautiful texture",
      "baroque style oil painting, dark atmospheric shadows playing with glowing warm candlelight",
      "modern palette knife oil painting, thick paint layers, heavily textured, contemporary art style",
      "gorgeous landscape oil painting, romanticism style, beautiful clouds, natural hand-painted texture",
      "museum masterpiece oil painting style, timeless classic colors, aged canvas cracks, realistic details",
      "textured brushstroke study oil art, bold colorful highlights, beautiful light play on canvas",
      "impressionist morning light oil canvas, soft pastels, lovely textured environment, masterwork",
      "vintage hand-painted portrait oil technique, rich pigments, weathered fine-art appeal"
    ],
    "Abstract": [
      "Dynamic abstract light trails on dark background, energetic flowing waves, vivid neon accents, sharp geometric glass shards",
      "High-contrast abstract energy, glowing sphere amidst swirling light ribbons, mysterious dark void, futuristic abstract art",
      "Radiant abstract light pulses, ethereal dark atmosphere, vibrant accent streaks, complex motion and light play",
      "Abstract digital light art, deep dark void background, sharp crystalline motion, vibrant glowing focal point",
      "Energetic abstract composition, fluid white light waves, sharp angular glass fragments, intense vibrant spotlight, dark noir atmosphere",
      "Vibrant fluid liquid art, colorful swirling thick pigments, high viscosity motion, chaotic yet harmonious abstract flow",
      "Futuristic geometric abstract, complex interlocking angular shapes, metallic textures, neon grid lines, cinematic dark theme",
      "Abstract particle simulation, dense glowing dots in motion, dark deep void, energetic dispersal, cinematic moody lighting",
      "Holographic gradient abstract, iridescent flowing curves, light refraction, mysterious ethereal textures, dark background",
      "Complex abstract fractal geometry, infinite intricate patterns, glowing edges, dark contrast lighting, futuristic artistic design"
    ],
    "Vintage Photography": [
      "authentic vintage analog photograph, film grain texture, classic 1970s warm color grading, nostalgic light leaks",
      "retro polaroid instant camera photograph, square white border, soft faded colors, nostalgic vintage vibe",
      "vintage monochrome photography, rich daguerreotype silver print scale, beautiful antique film look",
      "1960s kodachrome color photography style, rich saturated warm reds and yellows, beautiful analog grain",
      "nostalgic black and white sepia film photo, classic vignette borders, timeless antique photograph style",
      "old high-school yearbook photo style, soft focus, retro film texture, vintage aesthetic",
      "classic 35mm film photograph, light leaks on edges, nostalgic retro colors, vintage print feel",
      "faded retro travel postcard photography, dust and scratches, aged paper look, authentic vintage",
      "grainy retro atmospheric photo, beautiful light leak, retro warm tones, cinematic analog look",
      "antique vintage camera shot, authentic details, organic lens scratches, beautiful classic composition"
    ],
    "Cyberpunk": [
      "neon-infused cyberpunk style, wet city streets reflecting neon signs, rainy dark night city background",
      "futuristic cyberpunk terminal hacker layout, green glowing matrix codes, sleek high-tech interface",
      "futuristic cyberpunk setting, tall high-tech skyscrapers, flying vehicles, neon pink and cyber blue tones",
      "cyberpunk action movie key frame, dramatic rain, glowing cybernetic eye implants, intense mood",
      "atmospheric sci-fi cyberpunk visual, dense neon towers, heavy smog, gorgeous futuristic details",
      "high-tech low-life cyberpunk cyberpunk concept, complex mechanical details, rich neon color grading",
      "cyberpunk back-alley night view, neon signs in kanji, glowing holographic ads, cinematic lighting",
      "sleek cyberpunk motorcycle speedway scene, motion blur, glowing wheel rims, futuristic design",
      "cyberpunk indoor hacker den, multiple glowing screens, neon ambient illumination, highly detailed",
      "cybernetic futuristic street view, tech-wear characters, neon glows, epic atmospheric depth"
    ],
    "SteamPunk": [
      "steampunk concept design, Victorian style mechanical gadgets, brass gears, copper pipes, steam elements",
      "high-detailed steampunk airship flying, copper boiler engine, massive sails, retro-futuristic clouds",
      "polished brass and copper steampunk clock mechanism, clockwork details, Victorian engineer desk setting",
      "steampunk workshop background, intricate steam pipe valves, retro-future machinery, amber glow",
      "steampunk keyvisual, leather goggles, velvet top hat, mechanical gear details, atmospheric steam",
      "retro industrial steampunk train station scene, massive steam locomotives, iron girders, Victorian lighting",
      "highly ornate steampunk device blueprint, intricate golden brass engravings, vintage retro look",
      "vintage steampunk street view, cobblestone, gas lamps, steam-driven carriage, Victorian future",
      "steampunk laboratory scene, glass beakers, copper conduits, glowing chemical reactions, rich gears",
      "mechanical steampunk pocket watch close up, gears and springs, beautiful macro craftsmanship"
    ],

    // PNG Categories
    "3D Render": [
      "pristine 3D model render, Octane Render, smooth clay materials, vibrant raytracing, cute 3D character style",
      "cute stylized 3D mascot render, smooth plastic surfaces, pastel colors, soft studio lighting setup",
      "3D digital asset rendering, glossy metal and glass textures, high fidelity rendering, sleek layout",
      "vibrant 3D vector style render, playful elements, clean shapes, outstanding volumetric depth",
      "ultra modern glossy 3D key visual element, ray-traced ambient occlusion, glowing neon edges",
      "stylized 3D porcelain model, highly polished surface, clean pastel gradients, beautiful rendering",
      "creative 3D render element, whimsical design, soft plastic textures, warm studio light",
      "cute 3D game asset render, bright colors, friendly round edges, premium game design look",
      "3D metallic chrome asset, futuristic iridescent surface, glossy reflections, flawless render",
      "isometric 3D miniature object model render, toy-like details, charming polished material"
    ],
    "Flat Icon": [
      "minimalist flat icon graphic, clean modern UI vector icon, bold flat colors, creative simplicity",
      "creative app flat icon design, solid vector shapes, subtle gradients, clean minimalistic presentation",
      "modern flat vector outline icon, bold flat vector paths, highly identifiable simple glyph design",
      "playful flat design vector logo icon, high contract colors, extremely clean aesthetic style",
      "flat minimal vector graphic emblem, modern startup icon look, beautiful simplified design",
      "flat color vector icon, sleek layout, crisp lines, perfect 2D vector graphic representation",
      "creative simplified vector icon, modern application icon aesthetic, clean vector elements",
      "flat design icon element, thick clean outlines, bright pastel palettes, sleek vector finish",
      "minimalist flat icon, bold geometry, primary flat colors, professional design layout",
      "flat linear web icon design, vector asset, highly refined vectors, beautiful flat style"
    ],
    "Isometric": [
      "isometric cute diorama 3D style, orthographic perspective grid, beautifully detailed clean miniature layout",
      "cute isometric 3D block model, tiny details, charming stylized colors, soft drop shadows",
      "isometric game asset graphic, low-poly isometric 3D render, pristine clean edges, highly detailed",
      "retro isometric block illustration, orthographic perspective, beautiful miniature scale modeling",
      "micro isometric 3D concept asset, glossy plastic model looks, cute isometric lighting",
      "isometric voxel art style, pixelated 3D block model, vibrant retro colors, cute game design asset",
      "isometric technical diagram graphic, clean lines and grids, professional vector schematic look",
      "charming isometric diorama design, soft daylight source, perfectly aligned isometric scene",
      "low-poly isometric toy asset render, cute stylized mini elements, orthographic viewport",
      "isometric game building preset, highly polished 3D game model, detailed orthographic rendering"
    ],
    "Pixel Art": [
      "retro 16-bit pixel art key visual, detailed pixel grid, vibrant classic video game console palette",
      "cute 8-bit retro pixel mascot graphic, classic nostalgic game icon, flat color pixel colors",
      "pixel art character sprite sheet preview, pristine grid lines, stylized retro game aesthetic",
      "charming pixelated pixel art illustration, beautiful game background texture, retro aesthetic",
      "highly detailed pixel scene element, nostalgic colors, sharp clean pixels, pixel art masterpiece",
      "retro-wave synthwave pixel art graphic, neon pink and purple nodes, classic glowing grid pixels",
      "8-bit pixel game item icon, clean distinct pixels, highly stylized, classic pixel design",
      "isometric pixel art block, cute nostalgic diorama made of pixels, pristine pixelated lines",
      "detailed fantasy RPG style pixel art, beautiful colors, classic 16-bit retro game visual",
      "pixelated minimal sticker style graphic, cute game icon, clean pixels, sharp retro color theme"
    ],
    "Claymation Style": [
      "cute stop-motion claymation character model, plasticine clay textures, detailed fingerprint press marks, handcrafted clay look",
      "charming claymation toy style model, warm vibrant clay colors, cute clay sculpture, stop-motion look",
      "highly textured plasticine clay model, cute playful design, realistic clay wrinkles, handmade feel",
      "clay figure asset design, vibrant pastel shades, soft clay surface bumps, adorable clay style",
      "claymation style miniature item, cute round sculpture, artisanal clay finish, cozy crafted look",
      "stop-motion claymation prop, realistic pliable material surface, handcrafted clay look, brilliant modeling",
      "adventurous clay character render, gorgeous soft clay material render, cute tactile clay textures",
      "playful claymation style creature, adorable details, beautiful clay art masterpiece",
      "miniature soft toy clay sculpture, organic craft textures, cute model design, claymation render",
      "3D claymation aesthetic asset, smooth doughy textures, vivid clay color layout, fine pressed marks"
    ],
    "Sticker Illustration": [
      "adorable die-cut sticker style illustration, sharp clean borders, bold outlines, vivid colors, modern graphic element",
      "cute pop vector sticker graphic, crisp contour die-cut lines, stylized cartoon style, highly cute layout",
      "vibrant sticker vector design, modern graphic illustration, heavy white outline border, premium sticker style",
      "retro style cartoon sticker asset, thick clean black outlines, bold hand-drawn pop colors, sticker print look",
      "charming border sticker graphic, whimsical illustrations, cute stickers, high quality print vector looks",
      "gorgeous holographic-edged sticker design, glowing visual reflections, unique borders, modern graphic",
      "kawaii sticker design style, pastel colors, cute elements, clean white border outline",
      "bold graffiti style sticker graphic, stylized design, vibrant ink drips, heavy sticker border",
      "minimalist outline sticker vector graphic, clean modern design elements, trendy visual aesthetic",
      "watercolor style illustrated sticker, soft texture fills, sharp die-cut border, beautiful artisan design"
    ],
    "Lowpoly": [
      "low-poly faceted origami-like polygons, sharp geometric facets, flat shading render, low polygon count model",
      "cute lowpoly 3D scene element, sharp clean triangles, pristine flat shading, 3D papercraft vibe",
      "isometric low-poly vector graphic asset, geometric flat faces, minimalist block colors, 3D mesh design",
      "digital lowpoly geometric model, stylized faceted textures, sharp polygonal edges, creative polygonal style",
      "faceted crystal lowpoly design, glowing crystal shapes, sharp 3D triangles, beautiful game mesh style",
      "modern lowpoly origami illustration, stylized vector polygons, lowpoly design layout, clean gradients",
      "low-poly retro gaming model mesh, game developer lowpoly asset design, clean flat faces, highly stylized",
      "geometric lowpoly mountain/nature element, faceted blocky surfaces, gorgeous minimal polygons",
      "retro 3D lowpoly asset render, flat-shaded faces, high-fidelity polygonal corners, clean render",
      "abstract lowpoly sculpture, sharp polygon intersections, beautiful structural mesh colors"
    ],
    "HandDrawn Sketch": [
      "hand-drawn fine line sketch art, delicate realistic pencil crosshatching, raw graphite visual look, highly artistic details",
      "vintage style ink sketch drawing, precise black pen lines, high-detail handcraft illustrations",
      "artistic pencil portrait sketch style, realistic shading, hand-drawn paper textures, beautiful line work",
      "rustic architectural ink sketch, loose artistic lines, ink washes, gorgeous handcrafted sketch texture",
      "minimalist continuous line sketch art, elegant simple strokes, raw ink drawing aesthetic, stylish layout",
      "vintage botanical sketch, delicate pencil outlines, rustic paper fibers, highly authentic design",
      "beautiful charcoal sketch rendering, rich textured smudges, dark charcoal crosshatch details",
      "creative conceptual hand-drawn engineering sketch, grid lines, precise pen strokes, vintage notebook look",
      "cozy hand-sketched cartoon outline illustration, warm pencil style lines, cute handcrafted artwork",
      "detailed ink engraving drawing look, beautiful hatching patterns, traditional masterwork sketch"
    ],
    "Origami Style": [
      "intricate folded paper origami model, precise geometric creases, realistic authentic papercraft texture, delicate drop shadows",
      "cute colorful paper-crafted origami model, geometric folded paper style, clean minimalist paper textures",
      "3D origami paper art asset, beautiful paper fibers, delicate geometric paper folds, soft ambient shadows",
      "traditional Japanese origami paper sculpture, sharp intricate folds, elegant minimalist papercraft styling",
      "whimsical 3D paper fold art graphic, gorgeous pastel layers, realistic shadows, stylized paper craft",
      "minimalist origami design, clean sharp creases, light-textured paper material, masterfully folded model",
      "creative 3D papercraft character design, paperboard cutouts, geometric origami folds, beautiful shadow depth",
      "origami geometric model render, neat paper folding lines, delicate pastel colors, soft daylight lighting",
      "stylized paper sculpture design, geometric origami aesthetic, clean paper structures",
      "intricate layered origami artwork, multi-colored folded sheets, highly detailed papercraft construction"
    ],
    "Glassmorphism": [
      "sleek glassmorphic visual asset, realistic semitransparent frosted glass plate, premium glossy translucency",
      "modern glassmorphism UI element, blurred glass refraction layers, glowing abstract backing gradients",
      "futuristic glossy frosted glass icon, thick realistic glass edges, beautiful refractive rainbow light leaks",
      "glassmorphic semitransparent 3D graphic, sleek frosty surface, glowing pastel background elements",
      "premium frosted glass sculpture render, high fidelity reflections, beautiful glossmorphic refraction blur",
      "glassmorphism vector graphic design, translucent layering, glossy highlights, modern high-end look",
      "frosted semitransparent plate component, glowing digital ambient lights, pristine glass edges",
      "artistic translucent glass plate element, futuristic ray-traced glass refraction, premium aesthetic",
      "sleek glassmorphic layout card, frosted matte texture, realistic refractive glass drop shadow, glossy",
      "chromatic frosted glass artwork, semitransparent layering, glowing liquid gradient backgrounds, pristine"
    ],
    "Metal Emboss": [
      "metallic detailed embossed plate asset, silver metal foil engraving, brushed steel relief engraving, realistic shine",
      "gold leaf metal emboss medallion graphic, highly detailed engraved metal relief, metallic gold shines",
      "antique bronze metal emboss plate, heavy metallic oxidation highlights, copper relic engravings",
      "futuristic silver chrome embossed metal emblem, polished metal surfaces, sharp 3D embossing, high reflectivity",
      "metal stamp emboss art element, heavy indented press lines, exquisite steel plate texture",
      "brushed aluminum embossed vector logo badge, sharp machined edges, metallic metallic sheen, clean relief",
      "golden metal emboss pattern art, royal golden filigree engraving, luxurious thick gold texture and shine",
      "industrial steel emboss stamp, realistic metal reflections, dark iron details, heavy relief design",
      "vintage brass metal emboss emblem plates, polished bronze carvings, Victorian brass detailing",
      "sleek titanium embossed sheet plate graphic, futuristic metal engraving patterns, high-fidelity premium metal"
    ],
    "Line Art": [
      "minimalist black and white line art vector graphic, clean black outlines on solid white, continuous line drawing, elegant style",
      "contemporary fine line art asset, crisp black vector contours, minimalist aesthetic, graceful curves",
      "modern continuous single-line drawing style, sleek black ink lines, high contrast minimalist art design",
      "elegant line art vector illustration, pristine sharp black paths, creative line work icon, ultra-clean look",
      "minimalist outline vector illustration, modern clean line strokes, solid styling with high clarity",
      "beautiful abstract line art design, continuous ink pen line strokes, sophisticated flow and structure",
      "zen continuous line sketch graphic, balanced minimal black outlines, elegant and pure aesthetic",
      "sleek line art emblem vector, precise geometric single-line curves, highly readable silhouette design",
      "artistic minimalist contour illustration, fine line sketch, pristine black ink outline graphic, elegant styling",
      "trendy line art vector asset, single-stroke flow, perfect curves and sharp line endings, modern design look"
    ]
  };

  const activeModifiers = styleFallbackMap[styleCategory] || styleFallbackMap["Cinematic"];
  const generatedPrompts: string[] = [];
  const bgSuffix = promptMode === 'png'
    ? `, isolated on clean solid ${pngBgColor} background, no shadows`
    : "";

  for (let i = 0; i < count; i++) {
    const modifier = activeModifiers[i % activeModifiers.length];
    generatedPrompts.push(`${resolvedSubject}, direct style of ${styleCategory}, ${modifier}${bgSuffix} (variation #${i + 1})`);
  }

  const finalNegative = userNegativePrompt && userNegativePrompt.trim().length > 0
    ? `Avoid: ${userNegativePrompt.trim()}`
    : "";

  const promptsWithNegative = generatedPrompts.map(p => {
    if (finalNegative) {
      const separator = p.trim().endsWith('.') || p.trim().endsWith(',') ? " " : ", ";
      return `${p.trim()}${separator}${finalNegative}`;
    }
    return p;
  });

  return {
    prompts: promptsWithNegative,
    negativePrompt: finalNegative,
    styleExplanation: [
      `Sistem pencadangan otomatis diaktifkan akibat kepadatan lalu lintas API Gemini.`,
      `Konsep subjek diterjemahkan dan diindeks secara prosedural.`,
      `Berhasil merumuskan ${count} variasi prompt menggunakan parameter procedural style: ${styleCategory} (${promptMode.toUpperCase()}).`
    ]
  };
};

export const analyzeImageToPrompt = async (
  image: string,
  styleCategory: string = 'Cinematic',
  model?: string
): Promise<{ prompt: string; description: string }> => {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided image and generate a highly detailed, professional text-to-image prompt.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner to extract its core subject, commercial concept, and design/photographic niche.
2. NO DIRECT REPLICATION: Do not just literally transcribe or describe the image word-for-word. Instead, identify its visual and commercial niche/theme (e.g., "minimalist organic skincare cosmetics flatlay", "cozy Scandinavian coffee shop interior", "futuristic cyberpunk city street at dusk").
3. GENERATE NICHE PROMPT VARIATION: Generate a highly professional, optimized text-to-image prompt as a sister variation of that niche. It should not be exactly identical to the input image, but rather feel like a high-quality companion asset or beautiful sibling image within the same thematic series (e.g., subtle variations in composition, background details, object arrangement, or action while retaining the premium quality, camera optics, lighting, and aesthetic flavor).
4. NO HALLUCINATION: Baseline technical facts (lens, lighting, composition, style) must be derived from the image, but the exact visual setup should be synthesized as a beautiful, high-quality niche variation.

STEP 1: EXTRACT THE FOLLOWING DATA POINTS AS A BASELINE:
- Subject (The main entity)
- Action (What is happening)
- Environment (Setting, location, context)
- Mood (Emotional tone)
- Lighting (Type, direction, intensity)
- Camera angle (Position relative to subject)
- Lens estimate (Focal length, aperture, depth of field)
- Composition (Framing, rule of thirds, perspective)
- Visual style (Current aesthetic baseline)

STEP 2: GENERATE A DETAILED PROMPT MATCHING THE SELECTED STYLE: ${styleCategory}
Adapt the prompt structure according to the chosen style:
- If 'Photorealistic': focus on RAW photo quality, technical camera specs, hyper-real textures.
- If 'Cinematic': focus on anamorphic lens effects, color grading, lighting scenarios, film stock.
- If 'Adobe Stock': focus on clean backgrounds, commercial appeal, high contrast, studio lighting.
- If 'Editorial': focus on fashion/magazine composition, avant-garde elements, professional retouching styles.
- If 'Lifestyle': focus on natural motion, candid moments, warm/authentic lighting, everyday settings.
- If 'Fine Art': focus on brushstrokes, medium textures, artistic theory, museum-quality lighting.

CRITICAL RULES:
1. OUTPUT PROMPT MUST BE IN ENGLISH.
2. The description should be a concise summary of the visual analysis and how this variation differs or complements the original asset.
3. Return a JSON object with "prompt" and "description".`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'The generated image-to-image prompt.' },
      description: { type: Type.STRING, description: 'Brief description of the image content.' }
    },
    required: ["prompt", "description"]
  };

  const imagePart = processFrameServer(image);
  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-flash-latest'];
  let response;
  let lastError;
  let responseText = "";

  // Forcing Gemini for all AI Vision to ensure valid, hallucination-free output across providers
  const modelsToTryList = model && model.startsWith('gemini') ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      response = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: `Analyze this image and generate an optimized prompt for style: ${styleCategory}` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.0
      });
      responseText = response.text || "{}";
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[analyzeImageToPrompt] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes('API_KEY')) throw err;
    }
  }

  if (!responseText) {
    console.warn("analyzeImageToPrompt bypassed:", lastError?.message);
    throw lastError || new Error("Failed to analyze image. Please try again.");
  }

  try {
    let text = responseText;
    // Clean potential markdown backticks
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    const data = JSON.parse(text);
    return data as { prompt: string; description: string };
  } catch (error) {
    console.warn("Gemini Parse Error:", error, responseText);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

export const analyzeBatchImageToPrompt = async (
  images: string[],
  styleCategory: string = 'Cinematic',
  model?: string
): Promise<{ prompt: string; description: string }[]> => {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided images and generate a highly detailed, professional text-to-image prompt for each one.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner to extract its core subject, commercial concept, and design/photographic niche.
2. NO DIRECT REPLICATION: Do not just literally transcribe or describe the images word-for-word. Instead, identify their visual and commercial niche/theme (e.g., "minimalist organic skincare cosmetics flatlay", "cozy Scandinavian coffee shop interior", "futuristic cyberpunk city street at dusk").
3. GENERATE NICHE PROMPT VARIATION: Generate a highly professional, optimized text-to-image prompt as a sister variation of that niche. It should not be exactly identical to the input image, but rather feel like a high-quality companion asset or beautiful sibling image within the same thematic series (e.g., subtle variations in composition, background details, object arrangement, or action while retaining the premium quality, camera optics, lighting, and aesthetic flavor).
4. NO HALLUCINATION: Baseline technical facts (lens, lighting, composition, style) must be derived from the image, but the exact visual setup should be synthesized as a beautiful, high-quality niche variation.

FOR EACH IMAGE, EXTRACT AND ANALYZE:
- Subject, Action, Environment, Mood, Lighting, Camera angle, Lens estimate, Composition, Visual style.

GENERATE PROMPT MATCHING STYLE: ${styleCategory}
Adapt the logic based on style:
- Photorealistic/Cinematic: High technical detail, optics, and lighting.
- Adobe Stock/Editorial: Commercial composition and polish.
- Lifestyle/Fine Art: Emotional resonance and artistic medium.

CRITICAL BATCH RULES:
1. You are receiving ${images.length} distinct images.
2. You MUST return a JSON array containing EXACTLY ${images.length} objects.
3. OUTPUT PROMPTS MUST BE IN ENGLISH.

Return a JSON array of objects, each with "prompt" and "description".`;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The generated image-to-image prompt.' },
        description: { type: Type.STRING, description: 'Brief description of the image content.' }
      },
      required: ["prompt", "description"]
    }
  };

  const parts: any[] = [];
  for (let i = 0; i < images.length; i++) {
    parts.push({ text: `\n\n--- IMAGE ${i + 1} ---\n` });
    parts.push(processFrameServer(images[i]));
  }
  parts.push({ text: `\nAnalyze these ${images.length} images and return the JSON array.` });

  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-flash-latest'];
  let responseText = "";
  let lastError;

  // Forcing Gemini for all AI Vision to ensure valid, hallucination-free output across providers
  const modelsToTryList = model && model.startsWith('gemini') ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      const res = await callGeminiWithRetry(modelName, { parts }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.0
      });
      responseText = res.text || "[]";
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[analyzeBatchImageToPrompt] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes('API_KEY')) throw err;
    }
  }

  if (!responseText) {
    console.warn("analyzeBatchImageToPrompt bypassed:", lastError?.message);
    throw lastError || new Error("Failed to analyze images in batch.");
  }

  try {
    let text = responseText;
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    const data = JSON.parse(text);
    return data as { prompt: string; description: string }[];
  } catch (error) {
    console.warn("Gemini Parse Error:", error, responseText);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

export const analyzeVideoKeyword = async (keyword: string, model?: string): Promise<VideoAnalysisResult> => {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const prompt = `Anda adalah Senior Adobe Stock Demand Analyst yang BRUTAL DAN JUJUR. 
  Tugas Anda adalah menilai apakah keyword "${keyword}" benar-benar layak diproduksi sebagai footage video stok.
  
  PRINSIP ANALISIS:
  1. JANGAN JADI PENJILAT. Jika keyword ini sampah atau sudah basi, katakan TIDAK LAYAK.
  2. Jika pasar sudah OVERSATURATED, Anda HARUS menyatakan TIDAK LAYAK PRODUKSI.
  3. Berikan SOLUSI: Jika TIDAK LAYAK, berikan revisi keyword atau sudut pandang baru yang bisa membuatnya jadi LAYAK (misal: "Jangan cuma orang lari, tapi orang lari di tengah badai neon").

  STRUKTUR RESPON (JSON):
  - keyword: keyword asli.
  - demandPotential: Tinggi / Menengah / Rendah.
  - demandType: Evergreen / Seasonal / Trend-fading.
  - marketInsight: Analisis tajam kondisi pasar (Bahasa Indonesia).
  - targetBuyer: Siapa pembelinya?
  - useCase: Penggunaan video.
  - recommendedFormat: Format teknis.
  - formatReason: Alasan teknis.
  - competitionLevel: Sangat Tinggi / Tinggi / Menengah / Rendah.
  - competitionNotes: Kritik pedas footage yang sudah ada.
  - cinematicPotential: YA / TIDAK.
  - cinematicReason: Sudut pandang sutradara.
  - status: LAYAK PRODUKSI atau TIDAK LAYAK.
  - conclusion: Kalimat penutup pedas.
  - solution: Jika tidak layak, berikan arahan revisi atau alternatif keyword yang lebih "cuan". Jika layak, berikan tips optimasi.

  Gunakan Bahasa Indonesia profesional yang sangat jujur.`;

  const responseSchema = {
      type: Type.OBJECT,
      properties: {
        keyword: { type: Type.STRING },
        demandPotential: { type: Type.STRING },
        demandType: { type: Type.STRING },
        marketInsight: { type: Type.STRING },
        targetBuyer: { type: Type.STRING },
        useCase: { type: Type.STRING },
        recommendedFormat: { type: Type.STRING },
        formatReason: { type: Type.STRING },
        competitionLevel: { type: Type.STRING },
        competitionNotes: { type: Type.STRING },
        cinematicPotential: { type: Type.STRING },
        cinematicReason: { type: Type.STRING },
        status: { type: Type.STRING },
        conclusion: { type: Type.STRING },
        solution: { type: Type.STRING },
      },
      required: ["keyword", "demandPotential", "demandType", "marketInsight", "targetBuyer", "useCase", "recommendedFormat", "formatReason", "competitionLevel", "competitionNotes", "cinematicPotential", "cinematicReason", "status", "conclusion", "solution"]
  };

  let responseText = "";
  // Forcing Gemini for Video Analysis to ensure consistency and prevent variations across providers
  const response = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', prompt, {
    responseMimeType: "application/json",
    responseSchema,
    temperature: 0.0,
    topK: 1,
    topP: 0.1
  });
  responseText = response.text || "{}";

  return JSON.parse(responseText) as VideoAnalysisResult;
};

export async function generateHollywoodPrompts(keyword: string, model?: string): Promise<VideoPrompt[]> {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const prompt = `Act as a world-class Hollywood Director. Create 50 high-end, cinematic text-to-video prompts for: "${keyword}".
  
  BEST PROMPT STRUCTURE (MANDATORY):
  - Subject: Detailed description with textures/clothing.
  - Movement: Fluid, intentional physical actions.
  - Environment: Epic world-building (architecture, weather, atmosphere).
  - Lighting: Advanced techniques (Global illumination, rim light, volumetric dust).
  - Camera: Technical precision (Anamorphic, 85mm, T-stop settings implied).
  
  RULES:
  - NO GENERIC SHOTS. Every shot must look like a masterpiece.
  - Focus on "The Unseen": Capture angles that stock footage usually lacks.
  - English only.
  
  Return exactly 50 prompts in JSON array format.`;

  const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          movement: { type: Type.STRING },
          environment: { type: Type.STRING },
          lighting: { type: Type.STRING },
          camera_angle: { type: Type.STRING },
          camera_movement: { type: Type.STRING },
          style: { type: Type.STRING, enum: ["cinematic", "documentary"] },
        },
        required: ["subject", "movement", "environment", "lighting", "camera_angle", "camera_movement", "style"]
      }
  };

  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    responseText = await callOpenAICompatibleWithRetry({
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.8 },
      model
    });
  } else {
    const response = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', prompt, {
      responseMimeType: "application/json",
      responseSchema
    });
    responseText = response.text || "[]";
  }

  let parsed;
  try {
     parsed = JSON.parse(responseText) as Omit<VideoPrompt, 'id'>[];
  } catch(e) {
     console.warn("Parse error for hollywood prompts:", e);
     parsed = [];
  }
  
  const timestamp = Date.now();
  return (Array.isArray(parsed) ? parsed : []).map((p, index) => ({
    ...p,
    id: `hw-${timestamp}-${index}-${Math.random().toString(36).substring(2, 11)}`,
  }));
}

export async function checkImageQuality(image: string, tolerance: 'STRICT' | 'MEDIUM' | 'LOOSE' = 'MEDIUM', language: string = 'Bahasa', model?: string, fileType?: string) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const isVideo = fileType?.startsWith('video/') || fileType?.match(/^(mp4|mov)$/i);
  const isVector = fileType?.match(/^(eps|ai|svg)$/i) || fileType?.includes('postscript');

  const isIndonesian = !language || language === 'Bahasa' || language === 'id' || language === 'Indonesian' || language?.toLowerCase() === 'indonesian' || language?.toLowerCase() === 'id';
  const targetLanguageName = isIndonesian ? 'Indonesian (Bahasa Indonesia)' : 'English';

  // Deterministic quality check cache lookup
  const cacheKeyInput = `${image}_${tolerance}_${targetLanguageName}_${model || "default"}`;
  const cacheKey = crypto.createHash('sha256').update(cacheKeyInput).digest('hex');

  if (qaCacheMap.has(cacheKey)) {
    console.log(`[QA Cache] Hit for image quality check (key: ${cacheKey})`);
    return qaCacheMap.get(cacheKey);
  }

  let systemInstruction = `Anda adalah Kurator Fotografi Senior dan Spesialis Quality Assurance (QA) "Standar Kurator Adobe Stock" tingkat dunia. Anda dilatih secara khusus untuk melakukan kurasi dan audit teknis/hukum berstandar premium dengan akurasi 100% berdasarkan panduan resmi Adobe Stock Contributor Help: "Quality and Technical Standards Reasons for Content Refusal" (https://helpx.adobe.com/stock/contributor/content-moderation/quality-technical-standards-reasons-content-refusal.html).

Tugas Anda adalah melakukan audit visual yang SANGAT KETAT, MENDALAM, AKURAT, dan TANPA KOMPROMI terhadap gambar/vektor komersial yang diunggah.

---
PROSEDUR INSPEKSI ZOOM-IN & DETAIL MENDALAM (MANDATORY):
Untuk memberikan hasil yang paling akurat, Anda WAJIB mensimulasikan proses ZOOM-IN visual hingga 200% sampai 400% di tingkat piksel pada setiap kuadran gambar:
1. Periksa area fokus utama: Apakah mata, wajah, atau objek target benar-benar tajam (pin-sharp) tanpa ada tanda-tanda "soft focus" atau "motion blur"?
2. Periksa area latar belakang dan sudut gambar (corner-to-corner scan): Cari bintik debu sensor (sensor dust), chromatic aberration di tepian objek berkontras tinggi, artefak kompresi JPEG (macro-blocking), gradasi warna patah (color banding), dan noise digital parah di area gelap (shadows).
3. Periksa seluruh bagian untuk mendeteksi pelanggaran kekayaan intelektual (IP) mikro: Logo kecil pada kancing pakaian, emblem samar pada gadget/mobil, teks bermerek pada latar belakang, graffiti, atau karya seni berhak cipta.
4. Periksa struktur anatomi dan logika AI (jika buatan AI): Cari jari berlebih/kurang, mata juling, geometri yang saling melebur atau melayang tidak wajar, detail pola berulang yang hancur, atau tulisan acak/gibberish yang mengacaukan estetika komersial.

---
PANDUAN TOLERANSI KETAT & REFUSAL REASONS ADOBE STOCK:
Tingkat Toleransi Saat Ini: ${tolerance}. Anda harus mengevaluasi dengan tingkat keketatan berikut:
- STRICT: "Zero Tolerance" mutlak terhadap cacat teknis apa pun atau pelanggaran IP sekecil apa pun. Sedikit soft focus, sedikit chromatic aberration, satu titik debu sensor, artefak AI sekecil apa pun, atau indikasi IP = FAIL secara instan (Skor maksimal 0-59).
- MEDIUM: Cacat minor di latar belakang non-kritis yang tidak mengganggu estetika komersial bisa ditoleransi. Namun, pelanggaran IP sekecil apa pun, over-exposure fatal pada subjek utama, out-of-focus pada subjek utama, atau anomali gen-AI yang terlihat jelas = FAIL secara instan (Skor maksimal 0-65).
- LOOSE: Loloskan selama gambar memiliki nilai komersial yang tinggi dan komposisinya menarik. Hanya kegagalan teknis yang sangat parah atau pelanggaran IP mencolok yang menyebabkan FAIL (Skor 0-69).

---
DAFTAR ALASAN PENOLAKAN RESMI ADOBE STOCK (REFUSAL CRITERIA):
Anda wajib mencocokkan setiap temuan secara presisi dengan alasan penolakan berikut:

1. OUT OF FOCUS / SOFT FOCUS:
   - Subjek utama tidak tajam secara sempurna (lack of sharpness).
   - Motion blur akibat guncangan kamera atau pergerakan subjek yang terlalu cepat tanpa diimbangi shutter speed yang memadai.
   - Depth of field (DoF) terlalu dangkal yang menyebabkan area penting subjek meleset dari fokus (misal, hidung fokus tetapi mata buram). Note: Bokeh artistik pada latar belakang adalah estetika premium, BUKAN cacat, selama subjek utamanya tajam sempurna.
   - Efek noise reduction (pembungkaman noise) yang terlalu agresif, menyebabkan detail tekstur kulit atau benda menghilang dan tampak mulus seperti lilin/plastik (waxy skin / plastic-like textures).

2. ARTIFACTS / NOISE / EXCESSIVE FILTERING / COMPRESSION:
   - Noise digital (luminance & chromatic noise) berlebih, terutama terlihat di area bayangan atau bidang berwarna datar seperti langit biru.
   - Chromatic Aberration / Color Fringing: Garis tepi berwarna ungu, hijau, atau magenta di sepanjang batas objek berkontras tinggi (seperti ranting pohon di latar belakang langit terang).
   - Sensor Dust (Bintik Debu): Bintik-bintik abu-abu/hitam buram melingkar akibat debu pada sensor fisik kamera, terutama tampak jelas pada area warna datar (sky, studio background).
   - Compression Artifacts (Artefak Kompresi): Kotak-kotak piksel kecil (macro-blocking) atau pixelation akibat rasio kompresi JPEG yang terlalu tinggi atau pembesaran gambar (interpolation) paksa.
   - Halos / Oversharpening: Tepi putih menyala di sekitar objek akibat penggunaan filter penajaman (sharpening) yang berlebihan.
   - Color Banding: Transisi gradasi warna yang patah atau bergaris kasar (tidak mulus), sering terjadi pada langit atau background studio.
   - Excessive Filtering / Over-processed: Gambar terlalu kontras, warna terlalu tersaturasi secara artifisial, atau efek HDR ekstrem yang merusak estetika natural.

3. EXPOSURE & LIGHTING PROBLEMS:
   - Overexposure: "Blown-out highlights" / bagian terang yang benar-benar putih murni tanpa ada detail tekstur/piksel sama sekali (misal, langit putih polos tanpa awan, kulit putih terbakar cahaya).
   - Underexposure: "Crushed shadows" / bagian gelap yang hitam pekat tanpa detail piksel sama sekali.
   - Kontras tidak seimbang, pencahayaan datar (flat lighting) yang tidak menarik, atau bayangan yang kasar/tidak sedap dipandang pada subjek (unflattering shadows).
   - White balance buruk yang menghasilkan color cast tidak alami (terlalu biru, kuning, atau hijau).

4. COMPOSITION & CROPPING ISSUES:
   - Crooked Horizon: Garis cakrawala, dinding, atau bangunan yang miring tanpa ada tujuan artistik yang jelas.
   - Awkward Crop: Pemotongan subjek utama yang canggung di tepi bingkai (misal, memotong sendi, ujung jari kaki, atau sebagian kepala subjek secara tanggung).
   - Komposisi berantakan atau subjek utama tenggelam oleh elemen latar belakang.

5. GENERATIVE AI QUALITY STANDARDS (SANGAT KRITIS UNTUK AI):
   - Anatomi Cacat (Deformed Anatomy): Jari tangan berlebih/kurang, tangan/kaki meliuk atau menyatu secara tidak logis, mata asimetris/juling, gigi berlebih, bentuk telinga abnormal.
   - Teks Kacau (Incoherent/Gibberish Text): Huruf atau tulisan acak, salah ketik, atau karakter aneh yang tampak seperti alien/gibberish text.
   - Geometri Mustahil (Impossible Physics/Geometry): Objek menyatu secara aneh, perspektif arsitektur patah atau melintir tidak masuk akal, bayangan tidak konsisten dengan sumber cahaya, pola berulang yang tiba-tiba terputus atau rusak.
   - Polusi Visual AI: Artefak sisa rendering, bagian halus dan tajam yang tidak konsisten, serta pola berhalusinasi (hallucinated details).

6. INTELLECTUAL PROPERTY (IP) & TRADEMARK RESTRICTIONS (Hukum & Hak Cipta - Berdasarkan Kebijakan Resmi Adobe Stock Known Restrictions di https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html):
   - Merek & Logo Komersial: Penggunaan logo, merek dagang, nama merek, atau kemasan produk yang dapat dikenali sekecil apa pun (misalnya logo Apple, Nike swoosh, strip tiga Adidas, logo Coca-Cola, Mercedes-Benz, BMW, Google, dll). Wajib tolak secara instan jika ada logo merek yang terlihat jelas maupun samar-samar.
   - Desain Khas & Bentuk Produk: Desain fisik yang khas dari produk komersial modern sebagai subjek utama, seperti mainan (lego bricks, boneka Barbie, dsb), barang fesyen/fashion items, elektronik (bentuk bodi iPhone/MacBook/iPad termasuk penempatan kamera belakang yang khas, tombol home, notch layar, kamera Polaroid klasik beserta bingkai putihnya, sepatu Converse Chuck Taylor dengan pola bintang/karet pelindung hidung kaki, sepatu Dr. Martens dengan jahitan kuning ikonik, sol merah sepatu Christian Louboutin, Beats by Dre dengan simbol 'b'), atau perabot desainer (designer furniture).
   - Desain Otomotif Khas: Kisi-kisi depan (grille) mobil yang khas seperti BMW kidney grille, Rolls-Royce Spirit of Ecstasy/grille, Jeep 7-slot front grille, logo bintang Mercedes, bentuk Vespa/Lambretta yang ikonik.
   - Bangunan, Landmark & Lokasi Tiket yang Dilindungi IP (SANGAT KETAT):
     * Penggambaran lokasi berbayar/bertiket (ticketed locations) atau situs terlarang/dibatasi (restricted sites) tanpa rilis properti (property releases) yang diperlukan.
     * Landmark atau monumen tertentu tidak dapat diterima, bahkan dengan rilis properti (certain landmarks or monuments cannot be accepted, even with releases).
     * Arsitektur modern dengan desain yang unik atau mudah dikenali (modern architecture with a unique or recognizable design) ketika ditampilkan sebagai fokus utama tanpa rilis properti.
     * Menara Eiffel di malam hari (karena efek tata cahaya berhak cipta milik SETE). Menara Eiffel di siang hari aman, tetapi malam hari dilarang keras.
     * Burj Al Arab, Burj Khalifa (Dubai)
     * Sydney Opera House (Australia)
     * Atomium (Brussels)
     * Louvre Pyramid (Paris)
     * Space Needle (Seattle)
     * Hollywood Sign & Hollywood Walk of Fame (Los Angeles)
     * Istana Neuschwanstein (Jerman)
     * CN Tower (Toronto)
     * The Shard, London Eye, Tower Bridge (London)
     * Transamerica Pyramid (San Francisco)
     * Kuil Sagrada Família (khusus bagian interior)
     * Taipei 101 (Taiwan)
     * Menara Kembar Petronas (Malaysia)
     * Monumen bersejarah, kuil, atau situs warisan arkeologis yang dikelola oleh pembatasan hukum properti setempat (seperti Machu Picchu, Stonehenge, Chichen Itza).
   - Karya Seni Berhak Cipta & Hak Cipta Visual:
     * Karya cipta ciptaan orang lain (copyrighted works created by others), termasuk seni (art), patung (sculptures), seni jalanan (street art), grafiti, mural dinding, ilustrasi (illustrations), font spesifik, atau elemen grafis (graphic elements).
     * Karakter fiksi berhak cipta (seperti karakter Disney, Mickey Mouse, Hello Kitty, Pokémon, tokoh anime, superhero Marvel/DC).
     * Lukisan museum modern, instalasi patung kontemporer (seperti Cloud Gate / "The Bean" di Chicago, Patung Banteng Wall Street "Charging Bull").
   - Dokumen Negara, Uang & Identitas:
     * Uang kertas atau koin modern dari negara mana pun (terutama jika difoto datar/persis tegak lurus yang berisiko disalahgunakan untuk pemalsuan).
     * Prangko, paspor, surat izin mengemudi (SIM), kartu identitas (KTP/ID), kartu kredit/debit, buku tabungan bank.
   - Hak Pribadi & Tubuh (Biometrics):
     * Tato unik pada subjek manusia (memerlukan rilis properti dari seniman tato dan model).
     * Wajah manusia tanpa Model Release yang valid (jika komersial).

---
ATURAN KHUSUS UNTUK VEKTOR (EPS/AI/SVG):
Jika berkas yang diperiksa terindikasi vektor (isVector = true), audit wajib berfokus pada standar kualitas vektor profesional Adobe Stock:
1. Gaps in Shape Paths (Jalur Terbuka): Pastikan semua jalur/path bentuk tertutup sempurna. Jalur terbuka (open paths) atau celah kecil yang tidak sengaja akan menyebabkan penolakan instan.
2. Embedded Raster Images (Gambar Bitmap Tersemat): Vektor harus 100% scalable. DILARANG KERAS menyematkan (embed) gambar raster/bitmap (seperti foto JPG/PNG) di dalam berkas EPS/AI.
3. Auto-Tracing Artifacts (Cacat Penelusuran Otomatis): Garis-garis kasar, pola berantakan, dan ribuan titik anchor yang menumpuk tak beraturan akibat proses "Image Trace" otomatis secara malas adalah alasan penolakan utama. Gunakan jalur bersih buatan tangan (clean hand-drawn paths).
4. Layer Berantakan & Sampah Path: Adanya sisa-sisa titik anchor yang terisolasi, path kosong tak terlihat, atau struktur grup/layer yang sangat kacau dan sulit diedit oleh pembeli.

---
ATURAN KHUSUS UNTUK VIDEO FRAMES (JIKA ISVIDEO = TRUE):
Jika berkas yang diperiksa merupakan bagian dari frame video, audit visual wajib mengidentifikasi:
1. Rolling Shutter Distortion: Periksa apakah ada efek skew (distorsi miring pada garis vertikal), jello effect (goyangan seperti jeli), atau flash banding.
2. Compression & Bitrate Artifacts: Kotak-kotak makro pikselasi, warna luntur (color bleeding), atau banding warna parah di area latar belakang bergerak.
3. Stability & Shaky Footage: Periksa apakah frame mengindikasikan motion blur ekstrem akibat guncangan kamera yang parah dan merusak detail visual subjek utama.
4. Frame Kosong / Rusak: Deteksi adanya black frame, frozen frame, atau frame rusak.

---
STATUS & SKORING (HARUS SANGAT KONSISTEN & KETAT):
- PASS: Lulus standar Adobe Stock secara sempurna. Skor WAJIB 75 - 100.
- FAIL: Ditolak karena melanggar minimal salah satu kriteria di atas (Kriteria A, B, atau C). Skor WAJIB di bawah 70 (0 - 69).
*PENTING: Jangan berikan skor abu-abu di rentang 70-74. Jika gagal, skor harus di bawah 70. Jika lulus, skor minimal 75.*

PIXEL HEATMAPS (SANGAT PRESISI):
Hanya berikan koordinat spesifik jika Anda BENAR-BENAR mendeteksi masalah visual nyata di piksel tersebut. Jangan pernah mengarang heatmap jika gambar berkualitas sempurna. Jika tidak ada masalah, array heatmaps wajib kosong ([]).
"type" heatmap: pilih dari "noise", "focus", "lighting", "ip_violation", "artifact", "gen_ai_anomaly", "composition".

ATURAN BAHASA:
Gunakan bahasa sesuai dengan parameter requested language: ${targetLanguageName}. Semua isi teks dalam JSON respons (termasuk visual_scan_analysis, legal_status, technical_issues, strengths, detailed_feedback, dan note pada ai_vision_checks) wajib menggunakan bahasa tersebut secara konsisten sesuai pilihan pengguna.

Respons Anda WAJIB dalam format JSON yang valid dan bersih sesuai dengan skema yang diberikan.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
        visual_scan_analysis: { type: Type.STRING },
        legal_status: { type: Type.STRING },
        technical_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        overall_score: { type: Type.NUMBER },
        recommendation: { type: Type.STRING, enum: ["PASS", "FAIL"] },
        detailed_feedback: { type: Type.STRING },
        ai_vision_checks: {
            type: Type.OBJECT,
            properties: {
                blur: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                composition: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                lighting: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                watermark: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                logo: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                text: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                anatomical_errors: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                ip_risk: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                stock_acceptance: {
                    type: Type.OBJECT,
                    properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } },
                    required: ["status", "note"]
                },
                metadata: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "keywords"]
                }
            },
            required: [
                "blur", "composition", "lighting", "watermark", "logo", "text",
                "anatomical_errors", "ip_risk", "stock_acceptance", "metadata"
            ]
        },
        heatmaps: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ["noise", "focus", "lighting", "ip_violation", "artifact", "gen_ai_anomaly", "composition"] },
                    x: { type: Type.INTEGER },
                    y: { type: Type.INTEGER },
                    intensity: { type: Type.NUMBER },
                    raw_value: { type: Type.STRING }
                },
                required: ["type", "x", "y", "intensity", "raw_value"]
            }
        }
    },
    required: ["visual_scan_analysis", "legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "ai_vision_checks", "heatmaps"]
  };

  const imagePart = processFrameServer(image);
  
  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite-preview', 'gemini-flash-latest'];
  let responseText = "";
  let lastError;

  const modelsToTryList = model && model.startsWith('gemini') ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      const res = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: "Act as an objective Adobe Stock QA curator. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided." }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.0,
        topK: 1,
        topP: 0.1
      });
      responseText = res.text || "{}";
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[checkImageQuality] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes('API_KEY')) throw err;
    }
  }

  if (!responseText) throw lastError;
  
  try {
    const text = responseText;
    console.log('QA raw response:', text);
    const parsedResult = JSON.parse(text);
    qaCacheMap.set(cacheKey, parsedResult);
    saveQACache();
    return parsedResult;
  } catch(e) {
    console.warn("Parse Error:", responseText);
    throw e;
  }
}

export async function generateCalendarEvents(month: string, model?: string) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const systemInstruction = `You are a world-class Content Strategist and Niche Researcher for Stock Agencies (Adobe Stock, Shutterstock, Getty). 
Your task is to identify ALL upcoming festivals, holidays, seasonal changes, and cultural events for the specified month. 

Rules:
1. BE COMPREHENSIVE: Do not just list 5-10 events. Find as many important events as possible (aim for at least 15-20 if valid) covering:
   - Global Holidays (e.g., Earth Day, New Year).
   - National Days and Independence Days of major countries.
   - Religious Festivals (Eid, Diwali, Lunar New Year, Christmas, etc.).
   - Major Sports Events or Cultural Carnivals.
   - Seasonal Transitions (Start of Summer, Winter solstice).
2. Focus on events with high commercial value for stock contributors.
3. For each event, provide:
   - name: Clear name of the event.
   - date: Date or date range.
   - location: Country name or "Global/World".
   - commercial_potential: A detailed explanation of why stock buyers need content for this (e.g., "High demand for authentic family dinner photos").
   - suggested_topics: 5-8 specific short keywords or subjects (max 1-3 words each, e.g., "family dinner", "fireworks", "traditional dress"). DO NOT use long sentences.

Output strictly in JSON format.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      events: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            date: { type: Type.STRING },
            location: { type: Type.STRING },
            commercial_potential: { type: Type.STRING },
            suggested_topics: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "date", "location", "commercial_potential", "suggested_topics"]
        }
      }
    },
    required: ["events"]
  };

  let responseText = "";

  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const res = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: `Find and list ALL major and niche commercial events, holidays, and perayaan negara for the month of ${month}. Be very detailed and comprehensive so content creators have many ideas to choose from. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.8 },
      model
    });
    responseText = res;
  } else {
    try {
      const res = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', `Find and list ALL major and niche commercial events, holidays, and perayaan negara for the month of ${month}. Be very detailed and comprehensive so content creators have many ideas to choose from. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions. Use Google Search if necessary to find current and real-time trending events.`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      }, 1);
      responseText = res.text || "{}";
    } catch (err: any) {
      const res = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', `Find and list ALL major and niche commercial events, holidays, and perayaan negara for the month of ${month}. Be very detailed and comprehensive so content creators have many ideas to choose from. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      });
      responseText = res.text || "{}";
    }
  }

  return JSON.parse(responseText);
}

export async function generateEventKeywords(eventName: string, eventDetails: string, model?: string) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  const systemInstruction = `You are an expert AI Stock Photographer and Keyword Specialist. 
Your job is to generate a list of highly commercial, descriptive, and specific keywords/subjects for a given event.
These keywords should be optimized for AI Image Generation prompts.

Rules:
1. Provide 15-20 varied keywords or short phrases. ALL keywords MUST be short (maximum 1-3 words each). DO NOT use long sentences or descriptions.
2. Mix subjects, settings, lighting, and mood related to the event.
3. Focus on what stock buyers are actually looking for.
4. Return the result as a JSON array of strings called "keywords".`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["keywords"]
  };

  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const res = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words).`,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.8 },
      model
    });
    responseText = res;
  } else {
    try {
      const res = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words). Use Google Search if necessary to find the most current and real-time trending tags for this event.`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      }, 1);
      responseText = res.text || "{}";
    } catch (err: any) {
      const res = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}. Ensure every keyword is extremely short (max 1-3 words).`, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      });
      responseText = res.text || "{}";
    }
  }

  return JSON.parse(responseText);
}

export async function suggestKeywords(
  title: string,
  description: string,
  existingKeywords: string[],
  requestCount: number = 5,
  model?: string
): Promise<string[]> {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const systemInstruction = `You are a professional SEO and Adobe Stock Keyword Specialist.
Your task is to analyze the existing title, description, and list of keywords of an asset, and suggest exactly ${requestCount} high-volume, generic, relevant keywords or short conceptual phrases that are currently missing from the user's list.
These suggested keywords must be highly searchable, commercial, and directly related to the visual subject and context described in the title and description, while not repeating any existing keywords.

Rules:
1. Suggest EXACTLY ${requestCount} new, unique, generic keywords. Do not suggest more, do not suggest less.
2. The suggested keywords must NOT be in the existing keywords list: ${JSON.stringify(existingKeywords)}.
3. Keep the suggested keywords in lowercase, clean, single-word or short phrases (typically 1-2 words).
4. Strictly return your answer as a JSON array of strings under the property "keywords".`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["keywords"]
  };

  const promptContents = `Suggest ${requestCount} missing SEO keywords for this asset:
Title: "${title}"
Description: "${description}"
Existing Keywords: ${existingKeywords.join(', ')}`;

  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    responseText = await callOpenAICompatibleWithRetry({
      systemInstruction,
      contents: promptContents,
      responseMimeType: "application/json",
      responseSchema,
      config: { temperature: 0.3 },
      model
    });
  } else {
    const res = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', promptContents, {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3
    });
    responseText = res.text || "{}";
  }

  try {
    const parsed = JSON.parse(responseText);
    return parsed.keywords || [];
  } catch (err) {
    console.warn("Failed to parse suggested keywords:", err);
    return [];
  }
}

export async function searchAdobeStockWithBypass(keyword: string): Promise<any[]> {
  console.log(`[AdobeResearch] Querying keyword: "${keyword}"...`);
  let scrapingResults: any[] = [];
  
  try {
    const { chromium } = await import('playwright-chromium');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        javaScriptEnabled: true
      });
      
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
      
      const page = await context.newPage();
      const url = `https://stock.adobe.com/search?k=${encodeURIComponent(keyword)}&order=nb_downloads&filters[order]=nb_downloads`;
      
      await page.goto(url, { waitUntil: 'load', timeout: 25000 });
      await page.waitForTimeout(4000);
      
      const pageTitle = await page.title();
      if (!pageTitle.toLowerCase().includes('captcha') && pageTitle !== 'adobe.com') {
        scrapingResults = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.search-result-card, a.js-search-result-card, [data-hover-preview]'));
          if (cards.length > 0) {
            return cards.map(card => {
              const img = card.querySelector('img');
              const href = card.getAttribute('href') || (card.querySelector('a') ? card.querySelector('a').getAttribute('href') : '');
              const src = img ? (img.getAttribute('data-lazy') || img.getAttribute('data-src') || img.src) : '';
              const title = img ? (img.alt || img.title || '') : '';
              const id = card.getAttribute('data-id') || href.match(/\d+$/)?.[0] || '';
              return {
                id,
                title,
                imageUrl: src,
                detailUrl: href ? (href.startsWith('http') ? href : `https://stock.adobe.com${href}`) : '',
                category: 'photo',
                downloads: 'Tinggi'
              };
            }).filter(item => item.id && item.imageUrl);
          }
          
          const imgs = Array.from(document.querySelectorAll('img'));
          return imgs.map(img => {
            const parentA = img.closest('a');
            const href = parentA ? parentA.getAttribute('href') : '';
            const src = img.getAttribute('data-lazy') || img.getAttribute('data-src') || img.src || '';
            const idMatch = href ? href.match(/\d+/) : null;
            const id = idMatch ? idMatch[0] : '';
            return {
              id,
              title: img.alt || img.title || '',
              imageUrl: src,
              detailUrl: href ? (href.startsWith('http') ? href : `https://stock.adobe.com${href}`) : '',
              category: 'photo',
              downloads: 'Tinggi'
            };
          }).filter(item => item.id && item.imageUrl && (item.imageUrl.includes('ftcdn.net') || item.imageUrl.includes('adobe-stock')));
        });
        console.log(`[AdobeResearch] Playwright scraped ${scrapingResults.length} real-time page assets.`);
      } else {
        console.warn(`[AdobeResearch] Playwright met DataDome CAPTCHA or redirect. Falling back to Search Grounding...`);
      }
    } catch (err: any) {
      console.warn(`[AdobeResearch] Playwright execution error:`, err.message);
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    console.warn(`[AdobeResearch] Failed to initialize Playwright:`, err.message);
  }

  // Fallback if scraping yielded nothing
  if (scrapingResults.length === 0) {
    console.log(`[AdobeResearch] Using Gemini Search Grounding for keyword "${keyword}"...`);
    try {
      const systemInstruction = `You are an expert Adobe Stock indexing research assistant.
Your task is to analyze real-time Google search grounding results of Adobe Stock for the keyword: "${keyword}".
Find the top, most downloaded/most popular assets page images returned.
Extract exactly 8 assets. Each asset MUST include:
1. id: The unique Adobe Stock numeric ID (parse this carefully from URLs)
2. title: Title of the template or asset on Adobe Stock
3. imageUrl: High-contrast preview resource thumbnail image URL from ftcdn.net (usually like https://as1.ftcdn.net/v2/jpg/... or https://t4.ftcdn.net/jpg/...). Do not hallucinate or make up invalid structures; use active real URLs from Google Images or Search results.
4. detailUrl: Detail sheet link on stock.adobe.com
5. category: One of 'photo', 'vector', 'illustration'
6. downloads: Estimated download category, use one of: 'Sangat Tinggi', 'Tinggi', 'Menengah'

Strictly return your answer as a JSON array matching the schema.`;

      const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            detailUrl: { type: Type.STRING },
            category: { type: Type.STRING },
            downloads: { type: Type.STRING }
          },
          required: ["id", "title", "imageUrl", "detailUrl", "category", "downloads"]
        }
      };

      const response = await callGeminiWithRetry('gemini-3.1-pro-preview', `Search stock.adobe.com and return the top 8 most downloaded/highest demand visual assets for keyword "${keyword}".`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2
      }, 1);

      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[AdobeResearch] Gemini Grounding successfully retrieved ${parsed.length} assets.`);
        return parsed;
      }
    } catch (err: any) {
      console.error("[AdobeResearch] Gemini Grounding fallback error:", err.message);
      
      console.log(`[AdobeResearch] Attempting non-grounding Gemini fallback due to quota error...`);
      try {
        const systemInstructionNoGrounding = `You are an expert Adobe Stock index simulation assistant.
Generate 8 highly realistic popular stock assets for the search keyword: "${keyword}".
Generate realistic 9-digit Adobe Stock IDs (e.g. "548291039", "493821032").
Generate high-quality titles that precisely match typical popular key phrases searched on Adobe Stock (e.g., professional, well-crafted, highly descriptive).
For the imageUrl, utilize high-quality active Unsplash featured source image links that match this topic exactly using the following format:
https://images.unsplash.com/featured/500x375/?${encodeURIComponent(keyword)}&sig=<unique_number> (where unique_number is 1 to 8).
For detailUrl, use the format: https://stock.adobe.com/search?k=<id> or https://stock.adobe.com/images/title/<id>.
Return exactly 8 items matching the schema in JSON array format.`;

        const responseSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              detailUrl: { type: Type.STRING },
              category: { type: Type.STRING },
              downloads: { type: Type.STRING }
            },
            required: ["id", "title", "imageUrl", "detailUrl", "category", "downloads"]
          }
        };

        const responseNoGrounding = await callGeminiWithRetry('gemini-3.1-pro-preview', `Simulate top 8 trending assets on Adobe Stock for keyword "${keyword}" with Unsplash source placeholders.`, {
          systemInstruction: systemInstructionNoGrounding,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7
        }, 1);

        const parsedNoG = JSON.parse(responseNoGrounding.text);
        if (Array.isArray(parsedNoG) && parsedNoG.length > 0) {
          console.log(`[AdobeResearch] Non-grounding Gemini fallback successfully retrieved ${parsedNoG.length} assets.`);
          return parsedNoG;
        }
      } catch (err2: any) {
        console.error("[AdobeResearch] Non-grounding Gemini fallback also failed:", err2.message);
      }
    }
  }

  // Final level: Static pure-local mock generator if everything fails (including Gemini API entirely)
  if (scrapingResults.length === 0) {
    console.log(`[AdobeResearch] Running ultimate local generator fallback...`);
    const mockCategories = ['photo', 'vector', 'illustration'];
    const mockDownloads = ['Sangat Tinggi', 'Tinggi', 'Menengah'];
    
    for (let i = 1; i <= 8; i++) {
      const mockId = Math.floor(200000000 + Math.random() * 700000000).toString();
      const mockTitleList = [
        `Beautiful high-resolution ${keyword} illustration with vibrant color accents`,
        `Commercial professional stock photography of ${keyword} layout setup`,
        `Minimalist clean template design highlighting modern ${keyword}`,
        `Aesthetic warm presentation graphic element of ${keyword}`,
        `Stunning masterfully crafted ${keyword} for creative agency campaign`,
        `Close-up macro detail element representation of ${keyword}`,
        `Traditional authentic custom ${keyword} art illustration`,
        `Top trending high demand commercial asset featuring ${keyword}`
      ];
      
      scrapingResults.push({
        id: mockId,
        title: mockTitleList[i - 1],
        imageUrl: `https://images.unsplash.com/featured/500x375/?${encodeURIComponent(keyword)}&sig=${i}`,
        detailUrl: `https://stock.adobe.com/search?k=${mockId}`,
        category: mockCategories[(i - 1) % mockCategories.length],
        downloads: mockDownloads[(i - 1) % mockDownloads.length]
      });
    }
  }

  return scrapingResults;
}

export async function checkVideoQuality(frames, tolerance = 'MEDIUM', language = 'Bahasa', model) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const isIndonesian = !language || language === 'Bahasa' || language === 'id' || language === 'Indonesian' || language?.toLowerCase() === 'indonesian' || language?.toLowerCase() === 'id';
  const targetLanguageName = isIndonesian ? 'Indonesian (Bahasa Indonesia)' : 'English';

  // Quality check deterministic cache lookup
  const framesDataCombined = Array.isArray(frames) ? frames.join('') : String(frames);
  const cacheKeyInput = `${framesDataCombined}_${tolerance}_${targetLanguageName}_${model || "default"}`;
  const cacheKey = crypto.createHash('sha256').update(cacheKeyInput).digest('hex');

  if (qaCacheMap.has(cacheKey)) {
    console.log(`[QA Cache] Hit for video quality check (key: ${cacheKey})`);
    return qaCacheMap.get(cacheKey);
  }

  let systemInstruction = `Anda adalah Kurator Fotografi Senior dan Spesialis Quality Assurance (QA) "Standar Kurator Adobe Stock" tingkat dunia. Anda dilatih secara khusus untuk melakukan kurasi dan audit teknis/hukum berstandar premium dengan akurasi 100% berdasarkan panduan resmi Adobe Stock Contributor Help: "Quality and Technical Standards Reasons for Content Refusal" (https://helpx.adobe.com/stock/contributor/content-moderation/quality-technical-standards-reasons-content-refusal.html).

Tugas Anda adalah melakukan audit visual yang SANGAT KETAT, MENDALAM, AKURAT, dan TANPA KOMPROMI terhadap cuplikan video komersial berdasarkan 3 frame diam yang diekstrak dari bagian Awal, Tengah, dan Akhir video.

---
PROSEDUR INSPEKSI ZOOM-IN & DETAIL MENDALAM (MANDATORY):
Untuk memberikan hasil yang paling akurat, Anda WAJIB mensimulasikan proses ZOOM-IN visual hingga 200% sampai 400% di tingkat piksel pada setiap frame video yang diberikan:
1. Periksa area fokus utama: Apakah subjek target benar-benar tajam (pin-sharp) di setiap frame? Jika ada "soft focus" terus-menerus atau "motion blur" ekstrem yang tidak disengaja akibat guncangan kamera parah (camera shake), tandai sebagai FAIL.
2. Deteksi distorsi Rolling Shutter secara teliti: Cari sisa-sisa skew (distorsi miring pada garis vertikal), jello effect (efek goyangan seperti jeli), atau flash banding.
3. Periksa area latar belakang dan detail piksel: Cari bintik debu sensor (sensor dust), chromatic aberration di tepian objek berkontras tinggi, artefak kompresi video parah (macro-blocking), gradasi warna patah (color banding), dan noise digital parah di area bayangan (shadows).
4. Periksa seluruh bagian untuk mendeteksi pelanggaran kekayaan intelektual (IP) mikro: Logo kecil pada kancing pakaian, emblem samar pada gadget/mobil, teks bermerek pada latar belakang, graffiti, atau karya seni berhak cipta.
5. Periksa struktur anatomi dan logika AI (jika video buatan AI): Cari jari berlebih/kurang, mata juling, geometri yang saling melebur atau melayang tidak wajar, detail pola berulang yang hancur, atau tulisan acak/gibberish yang mengacaukan estetika komersial.

---
PANDUAN TOLERANSI KETAT & REFUSAL REASONS ADOBE STOCK:
Tingkat Toleransi Saat Ini: ${tolerance}. Anda harus mengevaluasi dengan tingkat keketatan berikut:
- STRICT: "Zero Tolerance" mutlak terhadap cacat teknis apa pun atau pelanggaran IP sekecil apa pun. Sedikit soft focus, sedikit chromatic aberration, satu titik debu sensor, artefak AI sekecil apa pun, jello effect minor, atau indikasi IP = FAIL secara instan (Skor maksimal 0-59).
- MEDIUM: Cacat minor di latar belakang non-kritis yang tidak mengganggu estetika komersial bisa ditoleransi. Namun, pelanggaran IP sekecil apa pun, over-exposure fatal pada subjek utama, out-of-focus pada subjek utama, guncangan kamera yang mengganggu, atau anomali gen-AI yang terlihat jelas = FAIL secara instan (Skor maksimal 0-65).
- LOOSE: Loloskan selama video memiliki nilai komersial yang tinggi dan komposisinya menarik. Hanya kegagalan teknis yang sangat parah atau pelanggaran IP mencolok yang menyebabkan FAIL (Skor 0-69).

---
DAFTAR ALASAN PENOLAKAN RESMI ADOBE STOCK (REFUSAL CRITERIA):
Anda wajib mencocokkan setiap temuan secara presisi dengan alasan penolakan berikut:

1. OUT OF FOCUS / SOFT FOCUS / SHARPNESS:
   - Subjek utama tidak tajam secara sempurna (lack of sharpness).
   - Motion blur akibat guncangan kamera atau pergerakan subjek yang terlalu cepat tanpa diimbangi shutter speed yang memadai.
   - Depth of field (DoF) terlalu dangkal yang menyebabkan area penting subjek meleset dari fokus (misal, hidung fokus tetapi mata buram). Note: Bokeh artistik pada latar belakang adalah estetika premium, BUKAN cacat, selama subjek utamanya tajam sempurna.
   - Efek noise reduction (pembungkaman noise) yang terlalu agresif, menyebabkan detail tekstur kulit atau benda menghilang dan tampak mulus seperti lilin/plastik (waxy skin / plastic-like textures).

2. ARTIFACTS / NOISE / EXCESSIVE FILTERING / COMPRESSION:
   - Noise digital (luminance & chromatic noise) berlebih, terutama terlihat di area bayangan atau bidang berwarna datar seperti langit biru.
   - Chromatic Aberration / Color Fringing: Garis tepi berwarna ungu, hijau, atau magenta di sepanjang batas objek berkontras tinggi (seperti ranting pohon di latar belakang langit terang).
   - Sensor Dust (Bintik Debu): Bintik-bintik abu-abu/hitam buram melingkar akibat debu pada sensor fisik kamera, terutama tampak jelas pada area warna datar (sky, studio background).
   - Compression Artifacts (Artefak Kompresi): Kotak-kotak piksel kecil (macro-blocking) atau pixelation akibat rasio kompresi video yang terlalu tinggi atau pembesaran gambar (interpolation) paksa.
   - Halos / Oversharpening: Tepi putih menyala di sekitar objek akibat penggunaan filter penajaman (sharpening) yang berlebihan.
   - Color Banding: Transisi gradasi warna yang patah atau bergaris kasar (tidak mulus), sering terjadi pada langit atau background studio.
   - Excessive Filtering / Over-processed: Gambar terlalu kontras, warna terlalu tersaturasi secara artifisial, atau efek HDR ekstrem yang merusak estetika natural.

3. EXPOSURE & LIGHTING PROBLEMS:
   - Overexposure: "Blown-out highlights" / bagian terang yang benar-benar putih murni tanpa ada detail tekstur/piksel sama sekali (misal, langit putih polos tanpa awan, kulit putih terbakar cahaya).
   - Underexposure: "Crushed shadows" / bagian gelap yang hitam pekat tanpa detail piksel sama sekali.
   - Kontras tidak seimbang, pencahayaan datar (flat lighting) yang tidak menarik, atau bayangan yang kasar/tidak sedap dipandang pada subjek (unflattering shadows).
   - White balance buruk yang menghasilkan color cast tidak alami (terlalu biru, kuning, atau hijau).

4. COMPOSITION & CROPPING ISSUES:
   - Crooked Horizon: Garis cakrawala, dinding, atau bangunan yang miring tanpa ada tujuan artistik yang jelas.
   - Awkward Crop: Pemotongan subjek utama yang canggung di tepi bingkai (misal, memotong sendi, ujung jari kaki, atau sebagian kepala subjek secara tanggung).
   - Komposisi berantakan atau subjek utama tenggelam oleh elemen latar belakang.

5. ROLLING SHUTTER & VIDEO SPECIFIC ISSUES:
   - Skew Distortion: Garis tegak lurus tampak miring ketika kamera bergeser secara horizontal (panning) dengan cepat.
   - Jello Effect: Video bergoyang meliuk-liuk secara artifisial seperti jeli karena getaran frekuensi tinggi pada kamera.
   - Flash Banding: Kecerahan video tidak merata (terbagi menjadi pita-pita horizontal) karena kecepatan blitz cahaya atau lampu di sekitar tidak sinkron dengan sensor rolling shutter.
   - Flickering: Kedipan cahaya tidak stabil pada frame karena ketidaksamaan frekuensi lampu listrik dengan shutter speed kamera.
   - Duplicate / Empty Frames: Frame kosong (fully black/white) atau macet/membeku (frozen frame).

6. GENERATIVE AI QUALITY STANDARDS (SANGAT KRITIS UNTUK AI):
   - Anatomi Cacat (Deformed Anatomy): Jari tangan berlebih/kurang, tangan/kaki meliuk atau menyatu secara tidak logis, mata asimetris/juling, gigi berlebih, bentuk telinga abnormal.
   - Teks Kacau (Incoherent/Gibberish Text): Huruf atau tulisan acak, salah ketik, atau karakter aneh yang tampak seperti alien/gibberish text.
   - Geometri Mustahil (Impossible Physics/Geometry): Objek menyatu secara aneh, perspektif arsitektur patah atau melintir tidak masuk akal, bayangan tidak konsisten dengan sumber cahaya, pola berulang yang tiba-tiba terputus atau rusak.
   - Polusi Visual AI: Artefak sisa rendering, bagian halus dan tajam yang tidak konsisten, serta pola berhalusinasi (hallucinated details).

7. INTELLECTUAL PROPERTY (IP) & TRADEMARK RESTRICTIONS (Hukum & Hak Cipta - Berdasarkan Kebijakan Resmi Adobe Stock Known Restrictions di https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html):
   - Merek & Logo Komersial: Penggunaan logo, merek dagang, nama merek, atau kemasan produk yang dapat dikenali sekecil apa pun (misalnya logo Apple, Nike swoosh, strip tiga Adidas, logo Coca-Cola, Mercedes-Benz, BMW, Google, dll). Wajib tolak secara instan jika ada logo merek yang terlihat jelas maupun samar-samar.
   - Desain Khas & Bentuk Produk: Desain fisik yang khas dari produk komersial modern sebagai subjek utama, seperti mainan (lego bricks, boneka Barbie, dsb), barang fesyen/fashion items, elektronik (bentuk bodi iPhone/MacBook/iPad termasuk penempatan kamera belakang yang khas, tombol home, notch layar, kamera Polaroid klasik beserta bingkai putihnya, sepatu Converse Chuck Taylor dengan pola bintang/karet pelindung hidung kaki, sepatu Dr. Martens dengan jahitan kuning ikonik, sol merah sepatu Christian Louboutin, Beats by Dre dengan simbol 'b'), atau perabot desainer (designer furniture).
   - Desain Otomotif Khas: Kisi-kisi depan (grille) mobil yang khas seperti BMW kidney grille, Rolls-Royce Spirit of Ecstasy/grille, Jeep 7-slot front grille, logo bintang Mercedes, bentuk Vespa/Lambretta yang ikonik.
   - Bangunan, Landmark & Lokasi Tiket yang Dilindungi IP (SANGAT KETAT):
     * Penggambaran lokasi berbayar/bertiket (ticketed locations) atau situs terlarang/dibatasi (restricted sites) tanpa rilis properti (property releases) yang diperlukan.
     * Landmark atau monumen tertentu tidak dapat diterima, bahkan dengan rilis properti (certain landmarks or monuments cannot be accepted, even with releases).
     * Arsitektur modern dengan desain yang unik atau mudah dikenali (modern architecture with a unique or recognizable design) ketika ditampilkan sebagai fokus utama tanpa rilis properti.
     * Menara Eiffel di malam hari (karena efek tata cahaya berhak cipta milik SETE). Menara Eiffel di siang hari aman, tetapi malam hari dilarang keras.
     * Burj Al Arab, Burj Khalifa (Dubai)
     * Sydney Opera House (Australia)
     * Atomium (Brussels)
     * Louvre Pyramid (Paris)
     * Space Needle (Seattle)
     * Hollywood Sign & Hollywood Walk of Fame (Los Angeles)
     * Istana Neuschwanstein (Jerman)
     * CN Tower (Toronto)
     * The Shard, London Eye, Tower Bridge (London)
     * Transamerica Pyramid (San Francisco)
     * Kuil Sagrada Família (khusus bagian interior)
     * Taipei 101 (Taiwan)
     * Menara Kembar Petronas (Malaysia)
     * Monumen bersejarah, kuil, atau situs warisan arkeologis yang dikelola oleh pembatasan hukum properti setempat (seperti Machu Picchu, Stonehenge, Chichen Itza).
   - Karya Seni Berhak Cipta & Hak Cipta Visual:
     * Karya cipta ciptaan orang lain (copyrighted works created by others), termasuk seni (art), patung (sculptures), seni jalanan (street art), grafiti, mural dinding, ilustrasi (illustrations), font spesifik, atau elemen grafis (graphic elements).
     * Karakter fiksi berhak cipta (seperti karakter Disney, Mickey Mouse, Hello Kitty, Pokémon, tokoh anime, superhero Marvel/DC).
     * Lukisan museum modern, instalasi patung kontemporer (seperti Cloud Gate / "The Bean" di Chicago, Patung Banteng Wall Street "Charging Bull").
   - Dokumen Negara, Uang & Identitas:
     * Uang kertas atau koin modern dari negara mana pun (terutama jika difoto datar/persis tegak lurus yang berisiko disalahgunakan untuk pemalsuan).
     * Prangko, paspor, surat izin mengemudi (SIM), kartu identitas (KTP/ID), kartu kredit/debit, buku tabungan bank.
   - Hak Pribadi & Tubuh (Biometrics):
     * Tato unik pada subjek manusia (memerlukan rilis properti dari seniman tato dan model).
     * Wajah manusia tanpa Model Release yang valid (jika komersial).

---
STATUS & SKORING (HARUS SANGAT KONSISTEN & KETAT):
- PASS: Lulus standar Adobe Stock secara sempurna. Skor WAJIB 75 - 100.
- FAIL: Ditolak karena melanggar minimal salah satu kriteria di atas (Kriteria A, B, atau C). Skor WAJIB di bawah 70 (0 - 69).
*PENTING: Jangan berikan skor abu-abu di rentang 70-74. Jika gagal, skor harus di bawah 70. Jika lulus, skor minimal 75.*

ATURAN BAHASA:
Gunakan bahasa sesuai dengan parameter requested language: ${targetLanguageName}. Semua isi teks dalam JSON respons (termasuk visual_scan_analysis, technical_issues, strengths, detailed_feedback, dan note pada quality_checks) wajib menggunakan bahasa tersebut secara konsisten sesuai pilihan pengguna.

Respons Anda WAJIB dalam format JSON yang valid dan bersih sesuai dengan skema yang diberikan.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
        visual_scan_analysis: { type: Type.STRING },
        legal_status: { type: Type.STRING, enum: ["SAFE", "AT_RISK", "VIOLATION"] },
        technical_issues: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        overall_score: { type: Type.NUMBER },
        technical_score: { type: Type.NUMBER },
        visual_score: { type: Type.NUMBER },
        recommendation: { type: Type.STRING, enum: ["PASS", "FAIL", "RETOUCH"] },
        adobe_stock_readiness: { type: Type.STRING, enum: ["Ready", "Needs Improvement", "Reject Risk"] },
        detailed_feedback: { type: Type.STRING },
        quality_checks: {
            type: Type.OBJECT,
            properties: {
                blur: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                noise: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                compression_artifacts: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                blocking: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                banding: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                overexposure: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                underexposure: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                white_balance: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                motion_blur: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                camera_shake: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                out_of_focus: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                flickering: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                duplicate_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                empty_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                black_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                frozen_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                watermark: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                logo: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                text: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                ai_artifact: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                deformed_object: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                bad_anatomy: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                cropped_subject: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                cut_off_object: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                wrong_perspective: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                low_aesthetic_quality: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] }
            },
            required: [
                "blur", "noise", "compression_artifacts", "blocking", "banding", 
                "overexposure", "underexposure", "white_balance", "motion_blur",
                "camera_shake", "out_of_focus", "flickering", "duplicate_frame",
                "empty_frame", "black_frame", "frozen_frame", "watermark",
                "logo", "text", "ai_artifact", "deformed_object", "bad_anatomy",
                "cropped_subject", "cut_off_object", "wrong_perspective", "low_aesthetic_quality"
            ]
        },
        heatmaps: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    intensity: { type: Type.NUMBER },
                    raw_value: { type: Type.STRING }
                },
                required: ["type", "x", "y", "intensity", "raw_value"]
            }
        }
    },
    required: ["visual_scan_analysis", "legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "quality_checks", "heatmaps"]
  };

  const imageParts = frames.map(f => processFrameServer(f));
  
  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite-preview', 'gemini-flash-latest'];
  let responseText = "";
  let lastError;

  const modelsToTryList = model && model.startsWith('gemini') ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      const res = await callGeminiWithRetry(modelName, { parts: [...imageParts, { text: `Act as an objective Adobe Stock QA curator. Evaluate these ${frames.length} random video frames extracted throughout the video. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. If the video fails, provide a detailed analysis of the visual issues found in the frames as detailed_feedback. Ensure your entire response is written in ${language}.` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.0,
        topK: 1,
        topP: 0.1
      });
      responseText = res.text || "{}";
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[checkVideoQuality] Failed with ${modelName}:`, err.message || err);
      if (err.message && err.message.includes('API_KEY')) throw err;
    }
  }

  if (!responseText) throw lastError;
  
  try {
    const text = responseText;
    console.log('QA raw video response:', text);
    const parsedResult = JSON.parse(text);
    qaCacheMap.set(cacheKey, parsedResult);
    saveQACache();
    return parsedResult;
  } catch(e) {
    console.warn("Parse Error:", responseText);
    throw e;
  }
}
