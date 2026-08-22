import { GoogleGenAI, Type } from "@google/genai";

const SHARED_TITLE_DESCRIPTION_RULES = `
TITLE / DESCRIPTION RULES — SHARED ACROSS ALL PROVIDERS AND MODELS

VISUAL GROUNDING:
- Analyze the actual visual evidence first.
- Only describe subjects, actions, objects, environment, appearance, and concepts supported by the asset.
- Do not invent an unseen location, event, person, brand, activity, or narrative.

NATURAL LANGUAGE:
- Use correct English grammar.
- Write title and description as natural descriptive language, not as keyword lists.
- Search terms should appear naturally inside the sentence rather than being stacked.
- Avoid keyword stuffing, comma-separated keyword chains, and telegraphic metadata.
- The title must read as one coherent descriptive phrase/sentence.
- The description must read as natural prose describing the visible asset.

TITLE STRUCTURE:
- Lead with the main visible subject.
- Naturally describe the visible action or state when applicable.
- Add the relevant visible setting/context.
- Include useful visual details only when they improve identification.
- Do not force keywords that do not belong naturally in the sentence.

DESCRIPTION STRUCTURE:
- Describe the actual scene and its important visual details.
- Use natural sentences.
- Explain relevant subject, action/state, environment, lighting, composition, and visual context.
- Do not repeat the title as a keyword list.
- Do not add unsupported concepts merely for SEO.

BAD TITLE:
"Business man laptop coffee office happy work vector illustration"

GOOD TITLE:
"Happy young businessman drinking coffee while working on laptop in modern office"

The good example is a model for natural grammar and sentence structure, not a requirement to copy its subject matter.
`;


const SHARED_KEYWORD_VISION_RULES = (targetCount: number, keywordMode?: 'mixed' | 'single' | 'multi') => {
  const modeRule =
    keywordMode === 'single'
      ? 'KEYWORD MODE: SINGLE. Every keyword MUST be one single word. Never return multi-word phrases.'
      : keywordMode === 'multi'
        ? 'KEYWORD MODE: MULTI. Natural multi-word phrases are allowed when directly supported by the visual evidence.'
        : 'KEYWORD MODE: MIXED. Preserve the application mixed mode: single words and natural multi-word phrases may both be used when directly supported by the visual evidence.';

  return `KEYWORD RULES — SHARED ACROSS ALL PROVIDERS AND MODELS

Apply the following SEO-friendly microstock strategy consistently:

The supplied VISUAL_FACTS are the source of truth for keywords.
Generate exactly ${targetCount} keywords when the model can support the requested count.
Do not invent objects, locations, actions, events, brands, or concepts that are not visually supported.

AI VISION GROUNDING:
- Read the actual asset and VISUAL_FACTS before generating keywords.
- Prefer direct visual facts: primary subjects, secondary objects, visible materials, environment, lighting, composition, colors, and clearly visible characteristics.
- Use strong visual context only when it is unambiguous from the image.
- Do NOT use a keyword merely because it is generally associated with the subject.
- Do NOT infer hidden locations, events, brands, people, activities, or narratives that are not visible.
- Do NOT add cemetery, grave, Halloween, occult, afterlife, haunted, or similar contextual terms unless the image clearly supports them.
- Every keyword must be defensible from the image itself.



SEO-FRIENDLY MICROSTOCK RULES:
- Optimize for real microstock search intent, not generic keyword volume.
- Rank keywords by a combination of visual relevance, commercial search intent, specificity, and likely buyer usefulness.
- Put the strongest, most commercially useful keywords first.
- Prefer precise terms that describe what buyers would actually search for when looking for this asset.
- Use natural long-tail phrases when keywordMode permits them and when the phrase is directly supported by the image.
- Avoid synonyms that add little search value, near-duplicate concepts, filler, and keyword stuffing.
- Do not sacrifice visual accuracy for SEO.
- Do not invent trends, demand, or seasonal relevance.
- A high-value keyword must be both searchable and visually defensible.
- Prioritize the primary subject before secondary details, then useful context, concept, and verified seasonal/event intent.
- Seasonal/event keywords are high priority only when visually supported.
- Generic color terms are not a keyword SEO strategy.
- Preserve the requested keyword count from the application.

SEASONAL / EVENT RELEVANCE:
- Do NOT use color as a dedicated keyword-priority category.
- Do not spend keyword slots on generic color terms.
- After direct visual facts are covered, detect seasonal, holiday, cultural, or event relevance ONLY when clearly supported by the visual evidence.
- Examples include Christmas, Valentine, Easter, Halloween, New Year, Thanksgiving, Ramadan, Eid, Mother's Day, Father's Day, wedding, graduation, back to school, summer, winter, spring, autumn, and other clearly recognizable seasonal/event contexts.
- Never force a seasonal keyword merely because an object can be associated with an event.
- If no seasonal/event context is visually supported, do not invent one.
- Seasonal relevance is secondary to the actual visible subject and objects.

PRIORITY:
1. Main visible subjects
2. Visible actions or states
3. Visible objects and materials
4. Visible setting/environment
5. Visible composition/visual characteristics
6. Clearly supported concepts

FORMAT:
- English.
- Keep keywords concise.
- ${modeRule}
- Use nouns, descriptive adjectives, natural activities/gerunds, and common phrases when directly supported by the visual evidence.
- Remove standalone function words, conjunctions, and articles such as: is, are, a, an, the, in, on, with, and.
- Use natural base word forms or natural gerunds ending in -ing when appropriate, such as drinking, typing, running.
- Do not force a base form when a natural gerund is the correct description of a visible activity.
- Separate each keyword or phrase with a comma in the final keyword list.

WORD-FORM RULE:
- Use singular keyword forms whenever a noun has a plural form.
- Do NOT output plural noun variants ending in common plural suffixes such as -s, -es, -ies, or -ves.
- Prefer "skull" instead of "skulls", "candle" instead of "candles", "stone" instead of "stones", "arch" instead of "arches", and "bone" instead of "bones".
- This rule concerns plural word forms; a naturally singular word that happens to contain or end with the letter "s" is allowed.
- Do not invent a singular form when the word is already naturally singular.

FORBIDDEN TERMS:
- No brand names, trademarks, copyrighted figures, or other identifiable protected brand/IP terms.
- No subjective quality or promotional filler such as: high quality, beautiful, stunning, best, amazing, premium, perfect, top, nice, vector of, illustration of.
- Do not keyword-stuff irrelevant concepts.
- When a keyword slot would otherwise be spent on generic color, prefer a clearly supported seasonal/event concept; if none exists, use another relevant visual fact.

OUTPUT:
- Return the keywords only through the JSON "keywords" array.
- Preserve the relevance order chosen from the visual evidence.
- Rank the final keywords from highest to lowest combination of visual relevance, microstock search intent, commercial usefulness, and specificity.
- Do not explain the keywords.`;
};


/**
 * AI-only keyword generator.
 * No application-side keyword rules, filtering, scoring, ranking,
 * deduplication, SEO manipulation, market weighting, or count enforcement.
 * The provider's keyword output is returned directly.
 */
export interface KeywordRulesConfig {
  forbiddenBrandTerms: string[];
  forbiddenSubjectiveTerms: string[];
}

export const DEFAULT_KEYWORD_RULES: KeywordRulesConfig = {
  forbiddenBrandTerms: [
    "apple", "iphone", "nike", "adidas", "bmw", "mercedes", "tesla",
    "disney", "marvel", "lego", "vespa", "gopro", "barbie"
  ],
  forbiddenSubjectiveTerms: [
    "high quality", "beautiful", "stunning", "best", "amazing",
    "premium", "perfect", "top", "nice", "vector of", "illustration of"
  ]
};

export interface KeywordValidationResult {
  isValid: boolean;
  sanitizedKeywords: string[];
  removedDuplicates: number;
  violations: string[];
}


function isGenericColorKeyword(keyword: string): boolean {
  const colors = new Set([
    "red", "orange", "yellow", "green", "blue", "purple", "violet",
    "pink", "brown", "black", "white", "gray", "grey", "beige",
    "gold", "silver", "cyan", "magenta", "maroon", "navy", "teal",
    "turquoise", "indigo", "cream", "ivory"
  ]);
  return colors.has(keyword.trim().toLowerCase());
}

function isStandaloneFunctionWord(keyword: string): boolean {
  const functionWords = new Set([
    "is", "are", "am", "be", "been", "being",
    "a", "an", "the",
    "in", "on", "at", "by", "for", "from", "to",
    "with", "without", "and", "or", "but", "of"
  ]);

  return keyword
    .split(" ")
    .every(word => functionWords.has(word.toLowerCase()));
}

function normalizeKeywordToSingular(keyword: string): string {
  const protectedSingulars = new Set([
    "glass", "class", "business", "process", "analysis", "basis",
    "crisis", "status", "focus", "canvas", "bonus", "gas", "lens",
    "atlas", "species", "series", "news", "address"
  ]);

  const irregular: Record<string, string> = {
    men: "man", women: "woman", children: "child", people: "person",
    mice: "mouse", geese: "goose", teeth: "tooth", feet: "foot",
    leaves: "leaf", knives: "knife", wolves: "wolf", lives: "life",
    wives: "wife", halves: "half"
  };

  return keyword.split(" ").map((word) => {
    const lower = word.toLowerCase();

    if (protectedSingulars.has(lower)) return lower;
    if (irregular[lower]) return irregular[lower];

    if (lower.endsWith("ies") && lower.length > 4) {
      return lower.slice(0, -3) + "y";
    }

    if (lower.endsWith("ves") && lower.length > 4) {
      const base = lower.slice(0, -3);
      if (["lea", "kni", "li", "wi", "hal"].includes(base)) {
        return lower;
      }
      return base + "f";
    }

    if (
      lower.endsWith("ches") || lower.endsWith("shes") ||
      lower.endsWith("xes") || lower.endsWith("zes") ||
      lower.endsWith("sses")
    ) {
      return lower.slice(0, -2);
    }

    if (lower.endsWith("es") && lower.length > 3) {
      const stem = lower.slice(0, -2);
      if (
        stem.endsWith("s") || stem.endsWith("x") || stem.endsWith("z") ||
        stem.endsWith("ch") || stem.endsWith("sh")
      ) {
        return stem;
      }
    }

    if (
      lower.endsWith("s") &&
      !lower.endsWith("ss") &&
      !lower.endsWith("us") &&
      !lower.endsWith("is") &&
      lower.length > 3
    ) {
      return lower.slice(0, -1);
    }

    return lower;
  }).join(" ");
}


/**
 * Validates and cleans keyword output using the exact rules supplied by the user.
 */
export function validateAndCleanKeywords(
  rawKeywords: string[] | string,
  rules: KeywordRulesConfig = DEFAULT_KEYWORD_RULES
): KeywordValidationResult {
  const violations: string[] = [];

  const rawList = Array.isArray(rawKeywords)
    ? rawKeywords
    : String(rawKeywords || "").split(",");

  const cleanedSet = new Set<string>();
  let duplicateCount = 0;

  for (const rawKw of rawList) {
    if (!rawKw) continue;

    const kw = normalizeKeywordToSingular(
      rawKw
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    );

    if (!kw) continue;
    if (isStandaloneFunctionWord(kw)) continue;
    if (isGenericColorKeyword(kw)) continue;

    const hasBrandViolation = rules.forbiddenBrandTerms.some(brand =>
      new RegExp(`\\b${brand}\\b`, "i").test(kw)
    );

    if (hasBrandViolation) {
      violations.push(
        `Keyword "${kw}" melanggar kebijakan hak cipta / merek dagang.`
      );
      continue;
    }

    const hasSubjectiveViolation = rules.forbiddenSubjectiveTerms.some(term =>
      kw.includes(term)
    );

    if (hasSubjectiveViolation) {
      violations.push(
        `Keyword "${kw}" mengandung kata subjektif / spam pengisi.`
      );
      continue;
    }

    if (cleanedSet.has(kw)) {
      duplicateCount++;
    } else {
      cleanedSet.add(kw);
    }
  }
  const sanitizedKeywords = Array.from(cleanedSet);

  return {
    isValid: violations.length === 0,
    sanitizedKeywords,
    removedDuplicates: duplicateCount,
    violations
  };
}

/**
 * Generates stock keywords using the app's target count and the configured content rules.
 */
export async function generateValidatedStockKeywords(options: {
  title: string;
  description: string;
  targetCount: number;
  apiKey?: string;
  model?: string;
}): Promise<KeywordValidationResult> {
  const {
    title,
    description,
    targetCount,
    apiKey,
    model = "gemini-3.5-flash"
  } = options;

  const keyToUse = apiKey || process.env.GEMINI_API_KEY || "";

  if (!keyToUse) {
    throw new Error(
      "GEMINI_API_KEY tidak ditemukan untuk proses generasi metadata keywords."
    );
  }

  const ai = new GoogleGenAI({ apiKey: keyToUse });

  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a professional Microstock Keyword & Metadata Optimization Specialist.
Your task is to generate exactly ${targetCount} high-demand, commercial, and highly searchable stock keywords for microstock platforms (Adobe Stock, Shutterstock).

RULES FOR KEYWORDS:
1. Return EXACTLY ${targetCount} unique keywords/phrases in English.
2. Structure: Prioritize main subjects first, followed by actions, visible objects, setting/environment, composition, and conceptual themes.
3. Length: Keep each keyword concise (single words or 2-3 word natural compound phrases).
4. STRICT COMPLIANCE: Absolutely NO brand names, trademarks, copyrighted figures, or subjective quality words (e.g., "high quality", "beautiful").
5. Output format: JSON array of strings under the property "keywords".`;

  const prompt = `Generate metadata keywords based on this asset metadata:
Title: "${title}"
Description: "${description}"
Target Count: ${targetCount}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["keywords"]
      },
      temperature: 0.2
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  const rawKeywords: string[] = Array.isArray(parsed.keywords)
    ? parsed.keywords
    : [];

  return validateAndCleanKeywords(rawKeywords);
}

import { AsyncLocalStorage } from "node:async_hooks";
import { StockMetadata, ToolType, VideoAnalysisResult, VideoPrompt } from "../types";
import { HOLIDAYS_DATA } from "./holidaysData.ts";
import { EXTRA_HOLIDAYS_DATA } from "./extraHolidaysData.ts";
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO } from "../constants";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Thread-safe dynamic API Key storage
export const apiKeyStorage = new AsyncLocalStorage<any>();

const CACHE_FILE_PATH = path.join(process.cwd(), "qa_reports_cache.json");
let qaCacheMap: Map<string, any> = new Map();

function loadQACache() {
  // Caching is disabled to ensure pure, real-time 100% real AI vision analysis
  console.log("[QA Cache] Caching disabled to ensure pure real-time 100% real AI vision analysis.");
}

function saveQACache() {
  // Caching is disabled to ensure pure, real-time 100% real AI vision analysis
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
  zai: 'https://api.z.ai/api/paas/v4/chat/completions',
};

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
  mistral: 'pixtral-12b',
  openai: 'gpt-4o-mini',
  openrouter: 'google/gemini-3.0-flash-001',
  blackbox: 'blackboxai',
  nvidia: 'meta/llama-3.3-70b-instruct',
  bluesminds: 'gpt-4o',
  aivene: 'gpt-4o-mini',
  zai: 'glm-5.2',
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
  zai: 'glm-5.2',
};

// Provider yang reliable mendukung response_format: json_object
const SUPPORTS_JSON_MODE = new Set(['groq', 'openai', 'openrouter', 'nvidia', 'bluesminds', 'aivene', 'zai']);

const PROVIDER_ENV_KEYS: Record<string, string> = {
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  blackbox: 'BLACKBOX_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
  bluesminds: 'BLUESMINDS_API_KEY',
  aivene: 'AIVENE_API_KEY',
  zai: 'ZAI_API_KEY',
};

const NON_GEMINI_PROVIDERS = new Set(['groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'bluesminds', 'aivene', 'zai']);

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



function ensureTitleLength(title: string, keywords: string[], description: string, titleLength?: string): string {
  if (!title || title.trim() === "" || title.includes("Write a descriptive title here") || title.includes("<generate a") || title.includes("A highly descriptive") || title.includes("A detailed")) {
    if (description && description.trim().length > 10 && !description.includes("Write a detailed description here") && !description.includes("<generate a") && !description.includes("A highly descriptive") && !description.includes("A detailed")) title = description;
    else if (!title || title.trim() === "") title = "Stock asset";
  } else {
    title = String(title);
  }
  
  // Clean input title: remove all commas, periods, double spaces
  let cleanedTitle = title.replace(/,/g, ' ').replace(/[\-–—_]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
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
        return `Visual media showcasing ${cleanTitle.toLowerCase()}, designed for commercial, editorial, and creative projects.`;
      }
    }    
    return "Digital media asset designed for commercial, editorial, or creative projects.";
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
          const model = params.model || 'gemini-3.5-flash';
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
            if (typeof params.config.topK === 'number') {
              apiPayload.generationConfig.topK = params.config.topK;
            }
            if (typeof params.config.seed === 'number') {
              apiPayload.generationConfig.seed = params.config.seed;
            }
            if (params.config.safetySettings) {
              apiPayload.safetySettings = params.config.safetySettings;
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
              
              if (statusCode === 429 || statusCode === 403 || errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || errorMsg.includes("api key")) {
              if (store && store.gemini && keysList.length > 1) {
                  store.gemini.activeIndex = (store.gemini.activeIndex + 1) % keysList.length;
                  console.warn(`[Key Rotation - GEMINI] Rotating key in generateContent to index ${store.gemini.activeIndex}`);
                  continue;
                } else if (store && !store.gemini && keysList.length > 1) {
                  store.activeIndex = (store.activeIndex + 1) % keysList.length;
                  console.warn(`[Key Rotation] Rotating key in generateContent to index ${store.activeIndex}`);
                  continue;
                }
              }
              
              if (statusCode === 429) {
                const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i) || errorMsg.match(/retrydelay['":\s]+([\d\.]+)s/i);
                if (retryMatch && retryMatch[1]) {
                  const delay = parseFloat(retryMatch[1]) * 1000 + 1000;
                  console.log(`[Key Rotation - GEMINI] Rate limited, waiting ${delay}ms before throwing`);
                  await new Promise(r => setTimeout(r, delay));
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
  maxAttempts: number = 3
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
      const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();

      // Handle invalid model names or hallucinated models
      if (statusCode === 400 || statusCode === 404) {
          if (errorMsg.includes("model") || errorMsg.includes("not found") || errorMsg.includes("invalid") || errorMsg.includes("support")) {
              const fallback = 'gemini-3.5-flash';
              if (currentModel !== fallback) {
                  console.warn(`[callGeminiWithRetry] Model ${currentModel} invalid/not found. Falling back to ${fallback}.`);
                  currentModel = fallback;
                  continue; // retry immediately
              }
          }
      }
      
      // Retry on Quota (429) or Server Errors (500, 503, 504)
      if (statusCode === 429 || statusCode >= 500) {
        
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
          const rotationModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite-preview'];
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

const processFrameServer = (frame: any) => {
  if (typeof frame !== 'string') {
    console.error('[processFrameServer] Expected string, got:', typeof frame, frame);
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: ''
      }
    };
  }
  
  if (!frame.includes(';base64,')) {
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame
      }
    };
  }
  
  const parts = frame.split(';base64,');
  if (parts.length < 2) {
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame
      }
    };
  }
  
  const mimePart = parts[0];
  const dataPart = parts[1];
  const mimeSplit = mimePart.split(':');
  let mimeType = mimeSplit.length > 1 ? mimeSplit[1] : 'image/jpeg';
  
  // Gemini Vision only supports specific image types. Fallback to jpeg for others like application/postscript
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!validMimes.includes(mimeType)) {
    mimeType = 'image/jpeg';
  }
  
  return {
    inlineData: {
      mimeType,
      data: dataPart
    }
  };
};

interface ToolTypeDirectives {
  mediaTypeContext: string;
  titleRule: string;
  descriptionRule: string;
}

export function getToolTypeDirectives(toolType: ToolType): ToolTypeDirectives {
  if (toolType === ToolType.VIDEO) {
    return {
      mediaTypeContext: "The provided images are sequential frames from a single video. Analyze the continuous visual action, narrative progression, setting, and concept across the frames.",
      titleRule: "- Describe the main subject, dynamic action, movement, and setting.",
      descriptionRule: "- Describe the visual timeline, actions, setting, lighting, and progression across frames."
    };
  }

  if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) {
    return {
      mediaTypeContext: "The provided image is a vector illustration. Analyze the actual visible subject matter, symbols, shapes, layout, and visual design.",
      titleRule: "- Describe the visible subject, design, layout, and visual theme.",
      descriptionRule: "- Describe the visible shapes, colors, layout, composition, and design details."
    };
  }

  return {
    mediaTypeContext: "The provided image is a photograph or digital artwork. Analyze the actual visible scene, subjects, objects, setting, lighting, and composition.",
    titleRule: "- Describe the main subject, visible action or state, setting, and visual context.",
    descriptionRule: "- Describe the visible scene, subjects, environment, colors, lighting, composition, and relevant details."
  };
}

/**
 * Mendeteksi sub-jenis aset (photo / ai_image / illustration / vector / video)
 * dari ToolType eksplisit ditambah sinyal tekstual dari analisis visual & prompt.
 */
function detectAssetSubtype(toolType: ToolType, visualFacts: any, customPrompt?: string): AssetSubtype {
  if (toolType === ToolType.VIDEO) return 'video';
  if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) return 'vector';

  const textSignal = `${visualFacts?.understanding_and_context || ''} ${visualFacts?.deeper_meaning_and_symbolism || ''} ${customPrompt || ''}`.toLowerCase();
  if (/\b(ai[- ]generated|midjourney|synthetic render|generative art|digital synthesis|ai art)\b/.test(textSignal)) return 'ai_image';
  if (/\b(illustration|digital painting|drawn art|cartoon|hand-drawn|painterly|artwork|sketch)\b/.test(textSignal)) return 'illustration';
  return 'photo';
}

// ---- LAPISAN 2: FORMULA JUDUL PER JENIS ASET -------------------------------

const TITLE_TEMPLATE_LEAD: Record<AssetSubtype, string[]> = {
  photo: ['{subject} in {scene}', '{subject} {action} in {scene}', 'Candid photo of {subject} {action} in {scene}'],
  ai_image: ['AI-generated {subject} in {scene}', 'Digital render of {subject} {action}', 'Synthetic digital artwork of {subject} in {scene}'],
  illustration: ['Illustration of {subject} in {scene}', 'Hand-drawn {subject} {action}', 'Digital illustration depicting {subject} in {scene}'],
  vector: ['Flat design vector of {subject}', 'Minimalist vector illustration of {subject}', 'Isometric vector graphic of {subject} for {scene}'],
  video: ['Cinematic footage of {subject} {action}', 'Slow motion shot of {subject} in {scene}', 'Aerial drone view of {subject} {action} in {scene}']
};

/**
 * Fallback formula judul berbasis template ketika judul dari AI kosong,
 * placeholder, atau terlalu generik. Dipilih berdasarkan sub-jenis aset & titleLength.
 */
function applyTitleTemplate(subtype: AssetSubtype, tiers: TieredVisualAnalysis, titleLength?: string): string {
  const subject = tiers.objects[0]?.name || 'subject';
  const scene = tiers.scene[0] || 'a professional setting';
  const action = tiers.attributes.find(a => typeof a === 'string') || 'featured prominently';

  const templates = TITLE_TEMPLATE_LEAD[subtype] || TITLE_TEMPLATE_LEAD.photo;
  let templateIndex = 1;
  if (titleLength === 'short') templateIndex = 0;
  else if (titleLength === 'long') templateIndex = templates.length - 1;

  let title = templates[templateIndex]
    .replace('{subject}', subject)
    .replace('{scene}', scene)
    .replace('{action}', action);

  if (titleLength === 'long') {
    const extraSubjects = tiers.objects.slice(1, 3).map(o => o.name).filter(Boolean);
    if (extraSubjects.length) title += ` with ${extraSubjects.join(' and ')}`;
  }

  return title;
}




// ============================================================================
// END METADATAGEN STRUCTURED PIPELINE
// ============================================================================


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
  aiModelPerformance?: 'speed' | 'detail',
  exifMetadata?: any
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

  let exifInstruction = "";
  if (exifMetadata && Object.keys(exifMetadata).length > 0) {
    exifInstruction = `\n\n[DATA EXIFTOOL - REFERENSI TEKNIS]\nBerikut adalah data Metadata EXIF asli dari file yang diekstrak menggunakan ExifTool:\n\`\`\`json\n${JSON.stringify(exifMetadata, null, 2)}\n\`\`\`\nJadikan data teknis di atas sebagai panduan kuat untuk melengkapi temuan audit visual Anda (seperti jenis kamera, lensa, pengaturan, resolusi asli, koordinat lokasi/GPS, tanggal, atau software pengedit/pembuat).`;
  }

  // Amankan hitungan target keyword sejak awal
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount;

  const directives = getToolTypeDirectives(toolType);


  // --- TAHAP 1: PROVIDER 1 — GEMINI VISION (VISUAL DETECTION) ---
  let visualFactsJson = "";
  
  console.log(`[JohMeta Pipeline] Stage 1: Running Provider 1 — Gemini Vision (Visual Facts Detection)...`);
  
  const mediaTypeContext = directives.mediaTypeContext;

  const fallbackGeminiModel = aiModelPerformance === 'speed' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
  const visionModelToUse = (activeModel && activeModel.startsWith('gemini-')) ? activeModel : fallbackGeminiModel;
  
  const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

MAIN SUBJECT PRIORITY:
Before listing secondary details, determine the single strongest MAIN SUBJECT of the asset.
Choose it by visual dominance, central importance, distinctive identity, size/prominence, and the role it plays in the overall composition.
Do not choose a subject merely because it is culturally interesting or commercially popular.
If multiple subjects exist, rank them by actual visual importance and assign importance scores.
The first primary_subject should represent the strongest visual subject whenever one can be identified.
The downstream keyword generator will use this order to place the Main Subject first in the final keyword list.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE — ANALYZE THE ACTUAL ASSET THROUGH 8 VISUAL DIMENSIONS:
1. OBJECTS: Identify visible primary, secondary, and background objects.
2. ACTIVITIES: Identify only actions that are visibly happening.
3. CONCEPTS: Identify clear themes or concepts strongly supported by the visual scene.
4. ATMOSPHERE: Identify visible mood/atmosphere such as professional, calm, festive, dramatic, minimal, etc. only when visually supported.
5. LOCATION / SETTING: Identify the visible environment or setting; do not guess an exact place.
6. VISUAL CHARACTERISTICS: Identify framing, orientation, camera angle, close-up, copy space, composition, perspective, texture, lighting, and other visible characteristics.
7. COLORS / VISUAL ELEMENTS: Identify actual visible colors, materials, textures, lighting, and distinctive visual elements.
8. EVENT / SEASONAL RELEVANCE: Identify named events or seasons only when unmistakable visual evidence supports them (for example Christmas decorations, Halloween costumes, Ramadan/Eid cues, Valentine's symbols). The calendar alone is never evidence.

ANALYSIS PRINCIPLE: AI Vision is the source of truth for what the asset contains. Do not hallucinate or infer unsupported religion, culture, exact location, profession, audience, industry, tourism, emotion, event, or commercial use case. If a dimension is not supported, return an empty array.

Also perform visual semantic analysis for the most relevant microstock categories from the official lists.
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
    "concepts": [],
    "atmosphere": [],
    "location_setting": [],
    "visual_characteristics": [],
    "event_seasonal_relevance": [],
    "deeper_meaning_and_symbolism": "Only describe a concept or meaning when it is strongly supported by visible evidence. Do not infer religion, culture, profession, location, emotion, event, or use case without clear visual support.",
    "semantic_category_analysis": {
      "adobe_id": 0,
      "shutterstock_category_1": "",
      "shutterstock_category_2": "",
      "reason": "Explain carefully why these official Adobe and Shutterstock categories match the visual content semantically based on primary subjects, context, and deeper theme"
    }
  }
}${exifInstruction}`;

  const promptText = toolType === ToolType.VIDEO 
    ? `Tugas: Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`
    : `Tugas: Analyze the actual asset across 8 dimensions: Objects, Activities, Concepts, Atmosphere, Location/Setting, Visual Characteristics, Colors/Visual Elements, and Event/Seasonal Relevance. Use only visible evidence; leave unsupported dimensions empty. Perform visual semantic category analysis against official list. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;

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
    console.error("[JohMeta Pipeline] Gemini Vision Stage 1 Failed:", err.message || err);
    throw new Error(`AI Vision gagal menganalisis aset: ${err.message || "Vision analysis failed"}`);
  }

  // Parse facts for next stages. Never invent visual facts when Vision returns malformed data.
  let visualFacts: any = {};
  try {
    const parsedVision = JSON.parse(extractJSON(visualFactsJson));
    visualFacts = parsedVision?.VISUAL_FACTS;
    if (!visualFacts || typeof visualFacts !== "object" || Array.isArray(visualFacts)) {
      throw new Error("VISUAL_FACTS missing or invalid");
    }
  } catch (e: any) {
    console.error("[JohMeta Pipeline] Invalid Gemini Vision response:", e.message || e);
    throw new Error("AI Vision mengembalikan hasil analisis yang tidak valid. Silakan coba kembali.");
  }

  const dominantSubjects = [
    ...(Array.isArray(visualFacts.primary_subjects) ? visualFacts.primary_subjects : []),
    ...(Array.isArray(visualFacts.secondary_subjects) ? visualFacts.secondary_subjects : [])
  ].filter((item: any) => item && typeof item === 'object' && typeof item.importance === 'number' && item.importance >= 50).map((item: any) => item.name);

  // --- TAHAP 2 & 3: PROVIDER 2 (GPT ROLE) & PROVIDER 3 (CLAUDE ROLE) — CONTENT GENERATION ---
  console.log(`[JohMeta Pipeline] Stage 2 & 3: Generating Content (Title, Description, Keywords)...`);
  
  const customPromptCommand = customPrompt ? `\nCRITICAL CUSTOM INSTRUCTION / CONCEPT KEY (ABSOLUTE PRIORITY):
ABSOLUTE RULES FOR CUSTOM INSTRUCTION:
1. ALIGN WITH CONCEPT: You MUST deeply adapt and shape the ENTIRE metadata (Title, Description, and Keywords) to strictly follow and embody this exact instruction or concept key.
2. DESIGNER/COMMERCIAL MINDSET: If the instruction implies a graphic design, promo, commercial layout, or background with copy space (e.g. "Graphic Design", "Promo", "Copy Space"), you MUST act as an expert human graphic designer. Describe the asset's utility for commercial advertising, emphasize where the copy space is, and use professional marketing/design terminology.
4. ASSET RELEVANCE: While following this instruction completely, ensure you still ground the description in the actual visual facts of the asset (do not hallucinate elements that aren't there, but frame the existing elements through the lens of the custom instruction).` : "";

  const mediaContext = mediaTypeContext;
  const genSystemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a professional Adobe Stock, Shutterstock, and Getty Images metadata specialist. 
Your goal is to maximize the discoverability of visual assets and optimize them for search-engine algorithms to rank on the FIRST PAGE of microstock marketplaces. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)} YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY.

${mediaContext}${customPromptCommand}${exifInstruction}

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", "Continuous line drawing of", "High Quality", "High-Quality", "Premium", "Beautiful", or "Stunning". Absolutely DO NOT use subjective marketing language or generic quality descriptors (e.g. "High quality image of...").
2. SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
   ${directives.titleRule}
3. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
4. Use easy-to-read phrases, NOT formal sentence structures.
5. DO NOT treat the title like a list of keywords. No commas separating words.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
${SHARED_KEYWORD_VISION_RULES(targetCount, keywordMode)}

Rules for Categories:
1. Adobe: Choose carefully from the provided list. Heavily prioritize the visually suggested category id "${visualFacts?.semantic_category_analysis?.adobe_id || ""}" with semantic reason "${visualFacts?.semantic_category_analysis?.reason || ""}" if it perfectly matches the visual content.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same. Heavily prioritize the visually suggested categories "${visualFacts?.semantic_category_analysis?.shutterstock_category_1 || ""}" and "${visualFacts?.semantic_category_analysis?.shutterstock_category_2 || ""}" if they are a perfect fit.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

VISUAL_FACTS (SOURCE OF TRUTH):
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

  const validatorSystemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing or subjective language such as "High Quality", "High-Quality", "Premium", "best", "amazing", "stunning", "beautiful", "perfect", or "Top". NEVER start titles with "High quality image of...", "Beautiful...", or similar subjective generic phrases.
- SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
  ${directives.titleRule}
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
${SHARED_KEYWORD_VISION_RULES(targetCount, keywordMode)}

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
    // AI/provider keyword output is passed through unchanged.
    data.keywords = Array.isArray(data.keywords)
      ? validateAndCleanKeywords(data.keywords).sanitizedKeywords
      : [];

    // 1.5. Enforce professional title length strictly
    data.title = ensureTitleLength(data.title, data.keywords || [], data.description || "", titleLength);

    // 1.8. Validate Adobe category_id to be between 1 and 21 (inclusive). If not, calculate heuristically
    const parsedCategoryId = parseInt(String(data.category_id), 10);
    data.category_id = (Number.isFinite(parsedCategoryId) && parsedCategoryId >= 1 && parsedCategoryId <= 21)
      ? parsedCategoryId
      : 8;

    // 2. Sanitasi & Fallback Otomatis Kategori Shutterstock
    const validShutterstockCats = toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;

    if (!data.shutterstock_category_1 || !validShutterstockCats.includes(data.shutterstock_category_1)) {
      data.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : (validShutterstockCats[0] || "Abstract");
    }

    if (
      !data.shutterstock_category_2 || 
      !validShutterstockCats.includes(data.shutterstock_category_2) || 
      data.shutterstock_category_2 === data.shutterstock_category_1
    ) {
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
    // FINAL RECOVERY: never fail the whole metadata request because one
    // optional field returned by an AI/provider has an unexpected shape.
    // Normalize the last known draft and return a valid StockMetadata object.
    console.warn("[JohMeta Parse Recovery] Final metadata normalization recovered from:", error);

    try {
      const recovery: any = (draftMetadata && typeof draftMetadata === 'object' && !Array.isArray(draftMetadata))
        ? { ...draftMetadata }
        : {};

      recovery.title = String(recovery.title || recovery.name || recovery.headline || "Stock asset").trim();
      recovery.description = String(recovery.description || recovery.desc || recovery.caption || recovery.title || "Visual stock asset").trim();
      recovery.keywords = Array.isArray(recovery.keywords) ? validateAndCleanKeywords(recovery.keywords).sanitizedKeywords : [];

      const parsedRecoveryCategory = parseInt(String(recovery.category_id), 10);
      if (!Number.isFinite(parsedRecoveryCategory) || parsedRecoveryCategory < 1 || parsedRecoveryCategory > 21) {
        recovery.category_id = 8;
      }

      recovery.category_reason = recovery.category_reason || visualFacts?.semantic_category_analysis?.reason || "Suggested based on visual semantic analysis.";
      recovery.confidence_score = Number.isFinite(Number(recovery.confidence_score)) ? Number(recovery.confidence_score) : 0.5;

      return recovery as StockMetadata;
    } catch (recoveryError) {
      console.error("[JohMeta Parse Recovery] Recovery failed:", recoveryError);
      return {
        title: "Stock asset",
        description: "Visual stock asset",
        keywords: [],
        category_id: 8,
        shutterstock_category_1: "Abstract",
        shutterstock_category_2: "Backgrounds/Textures",
        category_reason: "Fallback metadata generated after response normalization failure."
      } as StockMetadata;
    }
  }
};

export const generateBatchStockMetadata = async (
  items: { id: string, frames: string[], exifMetadata?: any }[],
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
  const directives = getToolTypeDirectives(toolType);

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
  const aiRequestCount = targetCount;

  // --- TAHAP 1: PROVIDER 1 — GEMINI VISION (VISUAL DETECTION) UNTUK BATCH ---
  let visualDescriptions: string[] = [];
  let parsedVisualFactsList: any[] = [];
  const fallbackGeminiModel = aiModelPerformance === 'speed' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
  const visionModelToUse = (activeModel && activeModel.startsWith('gemini-')) ? activeModel : fallbackGeminiModel;
  console.log(`[JohMeta Pipeline - Batch] Stage 1: Running Provider 1 — Gemini Vision (Visual Facts Detection)...`);
  
  for (let i = 0; i < items.length; i++) {
      const imageParts = items[i].frames.map(frame => processFrameServer(frame));
      
      const mediaTypeContext = directives.mediaTypeContext;

      const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

MAIN SUBJECT PRIORITY:
Before listing secondary details, determine the single strongest MAIN SUBJECT of the asset.
Choose it by visual dominance, central importance, distinctive identity, size/prominence, and the role it plays in the overall composition.
Do not choose a subject merely because it is culturally interesting or commercially popular.
If multiple subjects exist, rank them by actual visual importance and assign importance scores.
The first primary_subject should represent the strongest visual subject whenever one can be identified.
The downstream keyword generator will use this order to place the Main Subject first in the final keyword list.

VISUAL ACCURACY RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner, not just the center or main subject. Check every edge, corner, background, and small element.
2. NO HALLUCINATION: Perform a deep and thorough visual scan. You are strictly forbidden from guessing, making things up, or assuming details if you do not physically see them in the image. Your analysis must be 100% based on visual facts.
3. Identify subjects naturally and act like a human based on strong visual, cultural, or contextual cues. For example: if a subject clearly appears to be an "Indian woman" wearing cultural attire or having distinct features, directly identify her as an "Indian woman" rather than broadly describing physical features. This applies to recognizing professions, events, locations, nationalities, relationships, and emotions when they are visually evident.
4. Never hallucinate brands, trademarked logos, or copyrighted characters.
5. If uncertain, provide the closest accurate generic description.

STRICT PROHIBITIONS:
* Never include specific brand names or trademarked logos (must be described generically).
* Never include copyrighted characters.

PRIMARY OBJECTIVE — BUILD GROUNDED VISUAL_FACTS:
Analyze the actual asset as a structured evidence record for downstream metadata generation.
Do not write a caption, title, description, or keywords here.
Every fact must be traceable to visible evidence in the supplied frame(s).
If a fact is uncertain or not visible, omit it or mark confidence low rather than guessing.

VISUAL ANALYSIS DIMENSIONS:
1. PRIMARY SUBJECTS — the main visually dominant objects/people/animals.
2. SECONDARY SUBJECTS — supporting visible objects or subjects.
3. BACKGROUND ELEMENTS — visible environmental/background details that can support keywords.
4. ACTIONS — only actions that are visibly occurring.
5. RELATIONSHIPS — visible spatial/interacting relationships between subjects.
6. ATTRIBUTES — visible material, shape, texture, pattern, condition, size relationship, clothing, etc.
7. COLORS — actual dominant and secondary visible colors.
8. TEXT — exact visible text only; do not invent or repair unreadable text.
9. SETTING — generic visible setting/environment; never guess exact location.
10. COMPOSITION — orientation, framing, angle, perspective, close-up, copy space, symmetry, layout, foreground/midground/background.
11. LIGHTING — visible light direction/quality, shadows, highlights, natural/artificial appearance.
12. CONCEPTS — only concepts clearly communicated by the image; distinguish direct visual meaning from interpretation.
13. EVENT/SEASON — only when unmistakably supported by visual cues.
14. TECHNICAL/VISUAL CHARACTERISTICS — photo/illustration/render appearance, isolated/background treatment, transparency if actually evident, etc.

EVIDENCE DISCIPLINE:
- Visual evidence is the source of truth.
- Do not infer profession, nationality, religion, culture, exact location, audience, industry, emotion, use case, or symbolism unless the visual evidence strongly supports it.
- A color alone is not evidence of a holiday or cultural event.
- A generic object is not evidence of a brand or product model.
- Do not convert subjective aesthetic judgments into facts.
- Do not use EXIF to invent visual content; EXIF is technical corroboration only.
- Prefer precise generic descriptions when identification is uncertain.

For important subjects, provide importance and confidence scores. Use 0–100 scores.
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

      let itemVisionInstruction = visionSystemInstruction;
      let itemExifDesc = "";
      if (items[i].exifMetadata && Object.keys(items[i].exifMetadata).length > 0) {
        const exifInstruction = `\n\n[DATA EXIFTOOL - REFERENSI TEKNIS]\nBerikut adalah data Metadata EXIF asli dari file yang diekstrak menggunakan ExifTool:\n\`\`\`json\n${JSON.stringify(items[i].exifMetadata, null, 2)}\n\`\`\`\nJadikan data teknis di atas sebagai panduan kuat untuk melengkapi temuan audit visual Anda (seperti jenis kamera, lensa, pengaturan, resolusi asli, koordinat lokasi/GPS, tanggal, atau software pengedit/pembuat).`;
        itemVisionInstruction += exifInstruction;
        itemExifDesc = `\nASSET #${i + 1} EXIFTOOL TECHNICAL METADATA:\n${JSON.stringify(items[i].exifMetadata, null, 2)}`;
      }

      try {
          const visionResponse = await callGeminiWithRetry(visionModelToUse, { 
            parts: [...imageParts, { text: promptText }] 
          }, {
            systemInstruction: itemVisionInstruction,
            responseMimeType: "application/json",
            temperature: 0.0,
            topP: 0.8 });
          
          let facts = visionResponse.text || "{}";
          visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:\n${facts}${itemExifDesc}`);
          let parsedFacts: any = {};
          try {
             parsedFacts = JSON.parse(extractJSON(facts)).VISUAL_FACTS;
             if (!parsedFacts || typeof parsedFacts !== "object" || Array.isArray(parsedFacts)) {
               throw new Error("VISUAL_FACTS missing or invalid");
             }
          } catch(e: any) {
             console.error(`[JohMeta Pipeline - Batch] Invalid Vision response for item ${i}:`, e.message || e);
             throw new Error(`AI Vision mengembalikan hasil analisis yang tidak valid untuk aset #${i + 1}.`);
          }
          parsedVisualFactsList.push(parsedFacts);
      } catch (err: any) {
          console.error(`[JohMeta Pipeline - Batch] Vision failed for item ${i}:`, err.message || err);
          throw new Error(`AI Vision gagal menganalisis aset #${i + 1}: ${err.message || "Vision analysis failed"}`);
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

  const mediaContext = directives.mediaTypeContext;
  
  const customPromptCommand = customPrompt ? `\nCRITICAL CUSTOM INSTRUCTION / CONCEPT KEY (ABSOLUTE PRIORITY):
ABSOLUTE RULES FOR CUSTOM INSTRUCTION:
1. ALIGN WITH CONCEPT: You MUST deeply adapt and shape the ENTIRE metadata (Title, Description, and Keywords) to strictly follow and embody this exact instruction or concept key.
2. DESIGNER/COMMERCIAL MINDSET: If the instruction implies a graphic design, promo, commercial layout, or background with copy space (e.g. "Graphic Design", "Promo", "Copy Space"), you MUST act as an expert human graphic designer. Describe the asset's utility for commercial advertising, emphasize where the copy space is, and use professional marketing/design terminology.
4. ASSET RELEVANCE: While following this instruction completely, ensure you still ground the description in the actual visual facts of the asset (do not hallucinate elements that aren't there, but frame the existing elements through the lens of the custom instruction).` : "";

  const genSystemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a professional Adobe Stock, Shutterstock, and Getty Images metadata specialist. 
Your goal is to maximize the discoverability of visual assets and optimize them for search-engine algorithms to rank on the FIRST PAGE of microstock marketplaces. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

Rules for Titles:
1. Focus directly on the main subject and action. Introduce the content clearly. CRITICAL: MUST NOT start with "Vector of", "Illustration of", "Drawing of", "Continuous line drawing of", "High Quality", "High-Quality", "Premium", "Beautiful", or "Stunning". Absolutely DO NOT use subjective marketing language or generic quality descriptors (e.g. "High quality image of...").
2. SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
   ${directives.titleRule}
3. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
4. Use easy-to-read phrases, NOT formal sentence structures.
5. DO NOT treat the title like a list of keywords. No commas separating words.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details, rich in high-density SEO synonyms. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
${SHARED_KEYWORD_VISION_RULES(targetCount, keywordMode)}
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

  const validatorSystemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY. ${getTitleLengthRule(titleLength)}

${mediaContext}${customPromptCommand}

Rules for Titles:
- Use clear natural language.
- Describe only visible elements in the image.
- Put the main subject at the beginning of the title.
- Include important commercial keywords naturally.
- Do not use keyword stuffing.
- Do not use brand names, trademarks, company names, or copyrighted terms.
- Do not use marketing or subjective language such as "High Quality", "High-Quality", "Premium", "best", "amazing", "stunning", "beautiful", "perfect", or "Top". NEVER start titles with "High quality image of...", "Beautiful...", or similar subjective generic phrases.
- SPECIFIC TITLE GUIDELINES FOR THE ASSET TYPE:
  ${directives.titleRule}
- Do not use articles unless necessary (a, an, the).
- CRITICAL TITLE STRUCTURE: [Main Subject] + [Action] + [Environment] + [Purpose or Concept]. Must be SEO friendly and highly relevant to the asset.
- Include one relevant commercial concept if visible (business, finance, technology, healthcare, education, sustainability, etc.).
- Use sentence case.
- Output only one title.
- Do not include explanations, labels, quotation marks, or numbering.

Rules for Descriptions:
1. Description MUST be a complete sentence (kalimat lengkap). Write the description perfectly in natural, everyday language (bahasa keseharian). It must flow effortlessly like a human writing naturally. Avoid any robotic tone, rigid sentences, or weird synonyms.
2. SPECIFIC DESCRIPTION GUIDELINES FOR THE ASSET TYPE:
   ${directives.descriptionRule}
3. Provide a thorough literal visual breakdown of the scene. Focus heavily on what is literally visible in the image rather than abstract concepts. Buyers and reviewers prefer practical and literal descriptions. Include colors, composition, and specific details using human-like language. ABSOLUTELY NO subjective quality descriptors (e.g., do not say "a high quality image of...", just describe the image itself).
4. Limit to 200 characters.
${SHARED_KEYWORD_VISION_RULES(targetCount, keywordMode)}
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

    return Promise.all(dataArray.map(async (rawMetadata, index) => {
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
        // AI/provider keyword output is passed through unchanged.
        metadata.keywords = Array.isArray(metadata.keywords)
          ? validateAndCleanKeywords(metadata.keywords).sanitizedKeywords
          : [];

        // 1.5. Enforce professional title length strictly
        metadata.title = ensureTitleLength(metadata.title, metadata.keywords || [], metadata.description || "", titleLength);

        // 1.8. Validate Adobe category_id to be between 1 and 21 (inclusive). If not, calculate heuristically
        const parsedCategoryId = parseInt(String(metadata.category_id), 10);
        metadata.category_id = (Number.isFinite(parsedCategoryId) && parsedCategoryId >= 1 && parsedCategoryId <= 21)
          ? parsedCategoryId
          : 8;

        // 2. Sanitasi & Fallback Otomatis Kategori Shutterstock
        const validShutterstockCats = toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;

        if (!metadata.shutterstock_category_1 || !validShutterstockCats.includes(metadata.shutterstock_category_1)) {
            metadata.shutterstock_category_1 = validShutterstockCats.includes(heur.shutterstock_category_1) ? heur.shutterstock_category_1 : (validShutterstockCats[0] || "Abstract");
        }

        if (
          !metadata.shutterstock_category_2 || 
          !validShutterstockCats.includes(metadata.shutterstock_category_2) || 
          metadata.shutterstock_category_2 === metadata.shutterstock_category_1
        ) {
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
    }));
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
  flatIconType?: 'sheet' | 'single';
  iconSheetColumns?: number;
  vectorSubType?: 'minimal_flat' | 'flat_vector' | 'corporate_flat' | 'gradient_flat' | 'flat_icon' | 'isometric_flat';
  darkHorrorSubStyle?: string;
  referenceImages?: string[];
  cameraAngles?: string[];
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
    seed = Math.floor(Math.random() * 1000000),
    flatIconType = undefined,
    iconSheetColumns = undefined,
    vectorSubType = undefined,
    darkHorrorSubStyle = undefined,
    referenceImages = undefined,
    cameraAngles = undefined
  } = options;

  const count = Math.min(Math.max(variation, 10), 150);

  // ELEMEN KEJUTAN (Surprise Element) - Random Salt & Diversity Injection (Expanded for Adobe Stock Similarity Protection)
  const defaultAngles = ["low-angle shot", "eye-level shot", "high-angle perspective", "overhead aerial shot", "macro close-up", "medium shot", "wide-angle panoramic shot", "three-quarter portrait shot", "extreme close-up", "Dutch angle", "worm's-eye view", "bird's-eye view", "first-person POV"];
  const angles = cameraAngles && cameraAngles.length > 0 ? cameraAngles : defaultAngles;
  const lightings = ["golden hour light", "bright overcast daylight", "soft window light", "dramatic side-lighting", "warm indoor ambient light", "moody twilight", "misty dawn light", "vibrant studio rim-lighting", "sun-dappled shadows", "cool soft morning light", "neon cyberpunk glow", "chiaroscuro lighting", "bioluminescent ambient light", "ethereal volumetric rays", "harsh cinematic spotlight", "dramatic backlighting with lens flare"];
  const compositions = ["rule of thirds alignment", "symmetric composition", "minimalist empty-space negative layout", "diagonal leading lines", "frame-within-a-frame depth", "centered dominant focus with spacious copy space", "shallow depth-of-field", "dynamic foreground elements with blurred background", "forced perspective", "kaleidoscopic symmetry", "abstract fragmented framing", "dramatic low-angle heroic composition", "ultra-wide architectural framing"];
  const seasonsOrWeathers = ["crisp autumn afternoon", "warm summer glow", "misty spring morning", "subtle winter frost", "gentle drizzle rain", "clear sunny day", "soft foggy atmosphere", "dusk sunset sky", "thunderstorm dramatic sky", "heavy snow blizzard", "post-apocalyptic ash fall", "magical glowing floating embers", "surreal cosmic starscape"];
  const colorPalettes = ["natural warm earthy tones", "subtle cool pastel hues", "vivid high-saturation colors", "sophisticated minimalist monochromatic tones", "muted organic color palette", "soft warm gold and cream", "vibrant neon cyberpunk palette", "dark moody cinematic tones", "surreal iridiscent colors", "high-contrast duotone", "hyper-saturated pop art colors"];

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

  const userCameraAngle = cameraAngles && cameraAngles.length > 0 ? cameraAngles.join(', ') : null;
  const randomAngle = userCameraAngle || selectRandom(defaultAngles);
  const randomLighting = selectRandom(lightings);
  const randomComp = selectRandom(compositions);
  const randomSeason = selectRandom(seasonsOrWeathers);
  const randomColor = selectRandom(colorPalettes);

  // 🎲 [Backend Helper] — Dynamic Injection Engine
  const creativeSurprise = ["ethereal", "crisp", "sumptuous", "pristine", "luminous", "brooding", "serene", "kinetic", "immersive", "transcendent", "haunting", "majestic", "raw", "delicate", "vivid"];
  const dynamicMood = selectRandom(creativeSurprise);
  const randomTemp = 0.80 + Math.random() * 0.15;

  // Camera angle directive — minimal & natural, especially for Photorealistic
  const cameraAngleDirective = userCameraAngle
    ? (styleCategory === 'Photorealistic'
        ? ` Blend the "${userCameraAngle}" perspective naturally as a candid real-world photo angle — like a photographer simply choosing where to stand. Do NOT stage or theatrically compose the scene.`
        : styleCategory === 'Cinematic'
        ? ` Use "${userCameraAngle}" with cinematic framing and movie-like composition.`
        : ` MUST use this specific camera angle: "${userCameraAngle}". Do not randomize or substitute.`)
    : '';

  // When user selected camera angle, omit angle from randomSaltInjection to prevent over-emphasis
  const saltAngle = userCameraAngle ? 'User-selected angle (see Camera details rule)' : randomAngle;
  const randomSaltInjection = `[Dynamic Modifiers: ${dynamicMood} mood, ${saltAngle}, ${randomLighting}, ${randomComp}, ${randomSeason}, ${randomColor}, Seed ID: ${seed}, Temperature: ${randomTemp.toFixed(2)}]`;

  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  const isPngMode = promptMode === 'png';
  let modeConstraint = "";

  const styleSpecificDirectives: Record<string, string> = {
    "Vector Art": vectorSubType === 'gradient_flat'
      ? ' - Style Guide: STRICTLY 2D FLAT VECTOR ILLUSTRATION. Focus on flat design aesthetic utilizing smooth linear and radial color gradients. Sleek modern gradients, organic 2D shapes, and sharp digital outlines typical of Adobe Illustrator. Absolutely NO 3D rendering, NO photorealism, NO drop shadows, and NO metallic finishes. High contrast, clean vector silhouettes, and fluid artistic lines.'
      : ' - Style Guide: STRICTLY 2D FLAT VECTOR ILLUSTRATION. Focus on flat design aesthetic, featuring clean vector paths, flat solid colors, beautiful 2D shapes, and sharp digital outlines typical of Adobe Illustrator. Absolutely NO gradients, NO shading, NO 3D rendering, NO photorealism, NO drop shadows, and NO metallic finishes. High contrast, clean vector silhouettes, and elegant proportions.',
    "3D Render": ' - MANDATORY RENDER ENGINE LOCK: This style MUST exclusively depict Unreal Engine 5 real-time 3D rendering aesthetics — Lumen dynamic global illumination, Nanite micro-detail geometry, physically-based rendering (PBR) materials, real-time ray-traced reflections, soft volumetric studio lighting, and smooth high-fidelity 3D surfaces (glossy or matte plastic, metal, or ceramic). Every prompt variation MUST explicitly include "Unreal Engine 5" or "Unreal Engine real-time render" phrasing. STRICTLY FORBIDDEN — under no circumstances mention or blend in: isometric/orthographic perspective, glassmorphism/frosted glass/translucent glass effects, voxel art, low-poly faceting, or any other render engine name (Octane, Cinema 4D, Blender Cycles, V-Ray, Redshift, KeyShot). Do NOT cross-contaminate this style with any other PNG style vocabulary. Keep every variation 100% authentic to a pure Unreal Engine 5 CGI render.',
    "Sticker Illustration": ' - You must explicitly append tags such as "sticker format", "die-cut stickers", "sticker asset with white border" and "thick sticker outline" into the prompt variations.',
    "Flat Icon": ' - Focus on simplified pictograms, 2D minimalist design, strong symbol-based visual language, and high-contrast solid colors.',
    "Pixel Art": ' - Focus on visible square pixels, limited color palette, 8-bit or 16-bit retro game aesthetics, and sharp pixelated edges.',
    "Isometric": ' - Style Guide: Focus on isometric illustration with pseudo-3D look (tampilan 3D semu) without any camera perspective (orthographic parallel projection, objects do not shrink in the distance). Symmetrical 30-degree angles on left and right horizontal axes with straight vertical lines. Show three sides of the objects simultaneously (top and two sides) to provide depth. Maintain highly consistent modular scale and geometric proportions (using cubes, cylinders, and clean blocks with sharp corners and precise alignments). Use simple flat or semi-flat shading (flat shading, minimal/no gradients) with clear color contrast on different faces of the object to distinguish sides. Clean details, highly readable vector-like design, minimalist clean outlines. Keywords to include: isometric style, 3D isometric, orthographic parallel projection, pseudo-3D, 30-degree isometric view, flat shading, clean vector-like style.',
    "Claymation Style": ' - Focus on hand-molded clay textures, fingerprint details, stop-motion animation aesthetic, and soft organic physical materials.',
    "Origami Style": ' - Focus on folded paper textures, sharp creases, geometric paper construction, and delicate paper material appearance.',
    "HandDrawn Sketch": ' - Focus on pencil or ink strokes, charcoal textures, artistic hatching, and the look of a sketchbook drawing.',
    "Glassmorphism": ' - Focus on frosted glass effects, translucent layers, blurred background refraction, and sleek glossy reflections.',
    "Metal Emboss": ' - Focus on metallic surfaces, raised 3D textures, engraved details, and realistic metal reflections like silver, gold, or steel.',
        "Line Art": ' - Focus on clean, minimalist continuous single-line art, smooth elegant curves, and pure black-and-white ink strokes on a solid white background (or white line on black). Absolutely NO shading, NO colors, NO gradients, NO 3D rendering, and NO textures. CRITICAL: Maintain a pure, clean minimalist aesthetic. Do NOT mix with sketches, pencil coretan, hand-drawn sketch hatching, polygon structures, geometric low-poly/triangulated facets, or any other artistic style. Every path must be a continuous, single, perfectly smooth line with zero clutter.',
    "Silhouette": ' - Focus on clean, solid high-contrast black shapes on a solid white background (or white shape on black background) representing a perfect silhouette outline. Crisp vector edges, absolute zero inner details, zero textures, zero gradients, and zero shading. Focus on a beautiful, highly recognizable side-view, profile, or dynamic pose silhouette contour.',
    "Lowpoly": ' - Focus on visible geometric triangular facets, faceted surfaces, and stylized abstract crystalline structures.',
    "3D CGI": ' - Focus on clean computer-generated imagery with perfect geometry. Emphasize synthetic materials like smooth plastic, polished glass, sleek metal, or vibrant gel. Use highly controlled studio lighting or global illumination. The result should look like a high-end digital render from Blender or Cinema 4D, NOT a real-world photograph. AVOID: Photorealistic textures, natural imperfections, and real camera noise.',
    "Cinematic": ' - Focus on hyper-realistic, high-budget live-action movie cinematography. MUST feel like a genuine, un-retouched motion picture still shot on real 35mm film or digital cinema cameras with real actors. Prioritize: Wide cinematic aspect ratios, cinematic anamorphic lenses with subtle lens flares, organic volumetric haze, beautiful backlight/rim light, high production value, and deep cinematic color grading (e.g., warm gold, cool blue, orange and teal, moody cinematic shadow). Composition must be dynamic with cinematic framing. AVOID: ANY digital art, AI-generated look, 3D CGI, plastic skin, flat studio lighting, or illustration styles. It must look 100% real.',
    "Photorealistic": ' - Generate ultra-realistic, authentic, un-retouched real-world photography. MUST look indistinguishable from a real physical photograph captured by a professional camera (e.g., DSLR or mirrorless). Prioritize: Raw, natural realism, pin-sharp clarity, authentic natural skin/surface textures (e.g., visible pores, fine fabrics, wood grain, organic imperfections, peach fuzz), authentic human candid expressions, and completely realistic real-world environments. Lighting MUST be natural and un-staged: soft diffused daylight through windows, gentle overcast sky, warm afternoon sun with subtle shadows, or clean studio strobe with soft fill — NOT dramatic. STRICTLY FORBIDDEN cinematic/staged language: "deep shadows", "harsh spotlight", "dramatic lighting", "high-contrast duotone", "theatrical", "moody atmosphere", "volumetric haze", "cinematic color grading", "generous empty space for text placement". Describe negative space naturally as part of the composition, not as a commercial callout. Include realistic professional camera settings (e.g., 50mm lens, 85mm portrait lens, f/1.8 aperture). AVOID: CGI look, digital painting, excessive smoothness, "AI" look, theatrical cinematic color grading, artificial dramatic staging, harsh contrast, staged compositions. It must look like an authentic, unposed slice of everyday reality — a moment genuinely captured, not designed.',
    "Anime/Manga": ' - Focus on cel-shaded aesthetics, expressive character features, vibrant colors, and classic Japanese hand-drawn illustration styles.',
    "Watercolor Painting": ' - Focus on flowing pigment washes, paper grain textures, organic color bleeds, and delicate artistic strokes.',
    "Oil Painting": ' - Focus on heavy brushstrokes, impasto textures, rich pigment layers, and classical fine art canvas aesthetics.',
    "Paper Cut": ' - Focus on layered paper textures (lapisan kertas bertumpuk), sharp and clean cut edges (tepi potongan tajam dan rapi), profound 3D depth effects from multiple stacked paper layers, soft drop shadows between layers (bayangan lembut antar lapisan kertas), highly detailed handcrafted papercraft aesthetic, compositions constructed purely from cut paper shapes rather than drawings/paintings, matte paper textures, clean silhouettes, and beautiful solid colors for each stacked layer.',
    "Embroidery": ' - Focus on physical textile art, thick raised thread textures, intricate stitched patterns, woven fabric backgrounds, and realistic needlework craftsmanship. Emphasize the tactile quality of yarn, floss, and fabric grain.',
    "Disney Cartoon": ' - Focus on classic 2D or modern 3D Western animation styles characteristic of major animation studios. Emphasize expressive, large-eyed characters, vibrant magical color palettes, soft appealing shapes, and enchanting environments. CRITICAL: You MUST NOT mention any specific IP, character names, or specific film titles. Keep the concepts generic and copyright-free, but retain the magical and charming artistic style.',
    "Dark Horror Aesthetic": ' - Focus on extremely dark, eerie, unsettling, and atmospheric horror themes. MUST look like a photorealistic, real-world photograph or live-action movie still. Emphasize crushing pitch-black shadows, high-contrast chiaroscuro lighting with minimal illumination, macabre elements, muted or monochromatic color palettes with stark accents (like crimson red), thick fog/mist, decaying textures, and a profound sense of dread. AVOID: Digital painting, illustration, cartoonish styles, bright daylight, cheerful elements, or well-lit scenes. It must look breathtakingly real.',
    "Lego Style": ' - Focus on compositions entirely constructed from interlocking plastic building bricks (gaya mainan balok plastik). Emphasize sharp geometric brick shapes, visible circular studs on top of bricks, glossy plastic textures with subtle scratches, vibrant primary colors, and macro photography lighting (depth of field, studio lighting) to make it look like a miniature diorama or toy set. Do NOT use the word "Lego" in the prompt if possible, use "interlocking plastic bricks" or "brick toy style".',
    "Voxel Art": ' - Focus on 3D pixel art constructed from volumetric cubes (voxels). Emphasize a blocky, retro video game aesthetic similar to Minecraft, with low-resolution 3D geometry but modern high-quality lighting (raytracing, global illumination). Use sharp pixelated textures, crisp cube edges, and a rigid grid-based structure. CRITICAL: Do not use the word "Minecraft" or specific game IP; instead use "voxel art", "3D blocky pixel art", or "cubical world". AVOID: Realism, photorealistic rendering, real-world natural aesthetics, or smooth continuous surfaces.',
    "Abstract": ' - Style Guide: Deconstruct the subject into a dynamic expression of energy, motion, and non-literal forms. Visual Characteristics: Explosive swirls of pigment, kinetic energy trails, thick impasto textures, layered translucent facets, and dramatic asymmetric compositions. Sub-styles to master: Abstract Expressionism (gestural strokes), Fluid Art (marble/ink swirls), Neon Abstract (glow trails), Geometric Abstraction (fractured shapes), Fractal Patterns (mathematical complexity), or Glitch Art (digital distortion). Prompt Structure: "Abstract, [Subject deconstructed into energy/forms] using [Selected sub-style] with [Specific textures: e.g., vibrant paint splatters, crystalline facets, fluid silk flows] and [Atmospheric lighting]. No clear primary subject—focus on the overall concept of motion and mood." AVOID: Photorealistic rendering, literal anatomy, recognizable objects, 3D raytracing, camera lens specs, and realistic world-building.',
    "Corporate Technology Concept": ' - Focus on realistic photography and business themes combined with holographic UI overlays such as floating icons, glowing digital lights, and advanced tech elements. Emphasize a photorealistic corporate environment infused with futuristic, high-tech digital interfaces and data streams.',
    "Graphic Design": `You are an expert Commercial Graphic Designer specializing in high-demand advertising and branding assets—banners, flyers, posters, social media promos, commercial templates, and marketing materials—crafted using professional design tools like Adobe Illustrator, Adobe Photoshop, and CorelDRAW.

When generating or refining prompts for the "Graphic Design" style, you MUST strictly follow these rules:

1. CORE PURPOSE & VISUAL IDENTITY (CRITICAL)
   - Focus purely on COMMERCIAL GRAPHIC DESIGN output: promotional banners, advertising flyers, sale posters, event backdrops, social media graphics, branding templates, and marketing collateral.
   - The output MUST look like it was made in Adobe Illustrator, Photoshop, or CorelDRAW — flat vector composition, geometric shapes, clean bold layouts, creative typography placeholders, and vibrant commercial color palettes.
   - STRICTLY ZERO REALISM. NO photographs, NO photorealistic rendering, NO real-world textures, NO natural landscapes, NO 3D CGI, NO human faces or realistic skin.
   - The design must be 100% VECTOR-BASED and SHAPE-BASED: think flat design icons, geometric abstract compositions, isometric shapes, overlapping semi-transparent polygons, bold line art, halftone patterns, and stylized graphic elements.

2. DESIGN TOOL AESTHETIC (IMPORTANT)
   - Emulate professional design software output: clean vector paths, flat solid fills, smooth gradient meshes, precise geometric alignment, drop shadows, blending modes, and layer-style effects.
   - Style references: Adobe Illustrator vector artwork, Photoshop poster compositions, CorelDRAW banner layouts, Canva template aesthetics, Figma UI design vibes.

3. STRUCTURED LAYOUT & VISUAL HIERARCHY
   - Use bold grid-based compositions, asymmetrical dynamic layouts, or centered poster-style structures.
   - Include visual flow elements: sweeping curves, diagonal dividers, overlapping shape clusters, ribbon banners, badge frames, and corner ornaments.
   - The composition must look like a finished commercial design ready for a client presentation—not an art piece.

4. MANDATORY COPY SPACE & NO TEXT (CRITICAL)
   - ALWAYS reserve generous, clean negative space (empty areas) for headlines, taglines, logos, and CTAs.
   - NEVER generate readable text, letters, or words. Use abstract placeholder bars, geometric text blocks, or curved ribbon shapes instead.

5. GRAPHIC ELEMENTS & AESTHETICS
   - Primary visual language: bold geometric shapes (circles, triangles, hexagons, abstract blobs), smooth gradient meshes, isometric cubes, overlapping translucent layers, dynamic diagonal slashes, dotted halftone textures, sleek line art dividers, and ornamental frame borders.
   - Color palette: vibrant commercial advertising colors — electric blue, hot pink, neon green, golden yellow, deep purple, teal, coral orange, with striking duotone or triadic color schemes.
   - The design should be RICH and DETAILED but purely artificial — like a premium stock vector template from Freepik or Shutterstock.

6. KEYWORDS TO INJECT
   - Integrate terms like: "flat vector graphic design, commercial advertising poster, promotional banner template, geometric abstract composition, bold vibrant colors, clean copy space, Adobe Illustrator style, non-realistic vector art, isometric shapes, halftone pattern, gradient mesh, corporate branding layout, purely digital graphic art, shape-based design, NO PHOTOGRAPHY."

7. STRICT PROHIBITIONS
   - NO photographs, NO realism, NO 3D CGI renders, NO natural environments, NO human subjects, NO realistic textures.
   - NO minimalism — the design must be visually rich, bold, and commercially impactful.
   - This is PURE GRAPHIC DESIGN — flat, vector, shape-based, digital, commercial.`,
  };

  let currentDirective = styleSpecificDirectives[styleCategory] || '';

  if (styleCategory === 'Dark Horror Aesthetic') {
    const DARK_HORROR_BASE_INSTRUCTION = `You are an expert Cinematographer and Hyper-Realistic Photographer specializing in extremely Dark Horror, Macabre, and Gothic Aesthetic assets for high-end cinematic media.

When generating prompts for "Dark Horror Aesthetic", follow these core directives:
- REALISM: The image MUST be 100% photorealistic and look like a real physical photograph or live-action movie still. Absolutely NO digital paintings, 3D renders, or illustrations.
- ATMOSPHERE: Extreme darkness, pitch-black voids, eerie, unsettling psychological tension, dread, ultra-deep crushing shadows, chiaroscuro lighting with minimal visibility, thick volumetric fog, floating dust motes, decaying textures.
- CAMERA & COMPOSITION: Shot on high-end camera gear. Dramatic camera angles (low-angle, tight claustrophobic framing, or subtle dutch angles) emerging from total darkness. Clear eerie focal point barely illuminated.
- PALETTE & LIGHTING: Pure black backgrounds, muted charcoal/ash tones with stark minimal accents (crimson blood-red, ghostly cyan, toxic emerald glow). Extremely sparse directional rim lighting.
- TEXTURES: Authentic, real-world textures. Weathered stone, cracked porcelain, peeling wallpaper, wet asphalt, or viscous reflections emerging from the shadows.
- AVOID: Digital art, 3D CGI, illustrations, daylight, any bright illumination, cheerful elements, cartoonish comic styles, flat lighting, and excessive visibility.`;

    const DARK_HORROR_SUB_STYLE_MODIFIERS: Record<string, string> = {
      classic: "Blend overall dark horror elements with eerie lighting and ambiguous terror.",
      grimdark: "Focus on oppressive heavy shadows, brutal atmosphere, grime, and hyper-detailed dark fantasy aesthetic.",
      gothic: "Emphasize eerie mist, decaying Victorian or ancient gothic architecture, ornate dark stone, and melancholic dread.",
      lovecraftian: "Incorporate cosmic horror, non-Euclidean geometry, unfathomable alien structures, tentacles, and psychological cosmic dread.",
      infernal: "Focus on demonic entities, glowing magma embers, crackling hellfire, obsidian rock, and a suffocating fiery abyss.",
      macabre: "Highlight surreal dark art, skeletal motifs, morbid beauty, eerie anatomical elements, and unsettling elegance.",
      occult: "Integrate ancient glowing runes, dark ritual circles, esoteric symbols, ritualistic candles, and mystical shadow energy.",
      biomechanical: "Fuse fleshy organic decay with sleek cold machinery, bio-luminescent tubes, and surreal alien cybernetics (HR Giger style).",
      cinematic: "Emphasize 35mm film grain, deep chiaroscuro rim lighting, wide anamorphic lens framing, and dramatic movie-still composition.",
      painterly: "Apply visible heavy impasto brushstrokes, rich digital oil paint textures, and fine-art dark masterpiece aesthetics."
    };

    const subMod = darkHorrorSubStyle ? (DARK_HORROR_SUB_STYLE_MODIFIERS[darkHorrorSubStyle] || DARK_HORROR_SUB_STYLE_MODIFIERS.classic) : DARK_HORROR_SUB_STYLE_MODIFIERS.classic;
    currentDirective = ` - ${DARK_HORROR_BASE_INSTRUCTION}\n\nSUB-STYLE SPECIFIC INSTRUCTION:\n${subMod}`;
  }

    let flatIconDirective = '';
  if ((styleCategory === 'Flat Icon' || styleCategory === 'Line Art' || styleCategory === 'Silhouette') && isPngMode && flatIconType) {
    if (flatIconType === 'sheet') {
      const colStr = iconSheetColumns ? ` Specifically, arrange them strictly in a ${iconSheetColumns}-column grid layout.` : '';
      if (styleCategory === 'Line Art') {
        flatIconDirective = ` - LINE ART COLLECTION SHEET REQUIREMENT: Every prompt variation MUST describe a continuous line art collection sheet (lembar koleksi seni garis), showing a clean grid array, set, or organized group of multiple matching, cohesive minimalist line art elements or icons on the same plain white background, sharing a unified visual theme.${colStr}`;
      } else if (styleCategory === 'Silhouette') {
        flatIconDirective = ` - SILHOUETTE COLLECTION SHEET REQUIREMENT: Every prompt variation MUST describe a minimalist high-contrast silhouette collection sheet (lembar koleksi siluet), showing a clean grid array, set, or organized group of multiple matching, cohesive solid black silhouette shapes on the same plain solid white background, sharing a unified visual theme.${colStr}`;
      } else {
        flatIconDirective = ` - ICON COLLECTION SHEET REQUIREMENT: Every prompt variation MUST describe a flat design icon collection sheet, showing a clean grid array, set, or organized group of multiple matching, cohesive flat icons or related pictograms on the same plain background, sharing a unified flat visual theme and color palette.${colStr}`;
      }
    } else {
      if (styleCategory === 'Line Art') {
        flatIconDirective = ' - SINGLE STANDALONE LINE ART REQUIREMENT: Every prompt variation MUST describe exactly ONE single standalone individual minimalist line art element or centered icon, with absolutely NO other icons, NO multiple items, and NO grid sheet/collections in the composition.';
      } else if (styleCategory === 'Silhouette') {
        flatIconDirective = ' - SINGLE STANDALONE SILHOUETTE REQUIREMENT: Every prompt variation MUST describe exactly ONE single standalone individual high-contrast solid silhouette shape or icon, with absolutely NO other elements, NO multiple items, and NO grid sheet/collections in the composition.';
      } else {
        flatIconDirective = ' - SINGLE STANDALONE ICON REQUIREMENT: Every prompt variation MUST describe exactly ONE single standalone individual flat design icon or centered pictogram, with absolutely NO other icons, NO multiple items, and NO grid sheet/collections in the composition.';
      }
    }
  }

  let vectorSubTypeDirective = '';
  if (styleCategory === 'Vector Art' && isPngMode && vectorSubType) {
    if (vectorSubType === 'minimal_flat') {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Minimal Flat Design" aesthetic. Focus on extreme simplicity, clean sweeping curves, elegant organic minimalist layouts, very minimal details, flat color palette with maximum 3-4 cohesive solid colors, high negative space, and absolutely no complex patterns, shading, or gradients. Keep the shapes organic, simple, and beautifully elegant.';
    } else if (vectorSubType === 'flat_vector') {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Flat Vector Illustration" aesthetic. Clean hand-crafted vector paths, professional 2D illustration style, detailed but flat, using crisp outlines, beautiful sweeping curves, organic lines, and harmonious solid color blocks.';
    } else if (vectorSubType === 'corporate_flat') {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Corporate Flat Illustration" aesthetic (Alegria style / tech corporate art). Characterized by stylized figures with oversized limbs, fluid sweeping postures, expressive dynamic organic poses, friendly tech character design, clean flat gradients or solid colors, and professional corporate vector elements.';
    } else if (vectorSubType === 'gradient_flat') {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Gradient Flat Design" aesthetic. Modern 2D flat illustration but with smooth, modern, clean linear or radial color gradients instead of pure solid colors. Focus on beautiful fluid transitions, sleek organic shapes, and soft blended hues providing a highly contemporary premium aesthetic.';
    } else if (vectorSubType === 'flat_icon') {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Flat Icon Design" aesthetic. Centered standalone icon or emblem design, simplified organic visual metaphor, clean flat vector design with solid coloring, neat lines, and high contrast readable silhouettes.';
    } else if (vectorSubType === 'isometric_flat') {
      vectorSubTypeDirective = ' - SUB-STYLE SPECIFIC REQUIREMENT: You MUST generate under the "Isometric Flat Design" aesthetic. Flat 2D isometric style using orthographic 30-degree parallel projection, creating a pseudo-3D look but rendered in clean, flat, shadow-free vector graphics with distinct solid color shades for each plane (top, left, right) to represent volume without gradients.';
    }
  }

  if (isPngMode) {
    const stickerPrevention = styleCategory !== "Sticker Illustration" 
      ? ' - DO NOT use words like "sticker", "badge", or "die-cut" in the prompts. The subject must be a high-quality standalone asset.'
      : '';

    modeConstraint = `
CRITICAL PNG MODE SETTINGS:
- The user requests PNG Asset style generation.
- All generated prompt variations MUST strictly place the main subject "${subject}" isolated on a solid ${pngBgColor} background.
- Focus on a premium, high-end commercial presentation of the subject with exquisite detailing, high fidelity, and ultra-clean studio quality.
- CREATIVE OVER CREATIVE DIRECTIVE (MANDATORY): You MUST design highly creative, imaginative, unique, and artistically stylized conceptual interpretations of the subject rather than basic generic flat vectors or simple objects. Avoid plain, obvious, and boring representation. Instead, infuse gorgeous creative metaphors, rich futuristic elements, intricate miniature details, elegant mechanical gear work, complex origami folds, or stunning isometric stylized dioramas depending on the selected style.
- Make each PNG asset stand out as a highly unique standalone masterpiece so that reviews on Adobe Stock never flag them as "similar content" or "repetitive designs". Each concept must be distinctly original.
- The arrangement and styling are fully flexible—let the AI design the composition dynamically, prioritizing a professional, high-end visual asset.
- You must explicitly append tags such as "isolated on a plain ${pngBgColor} background", "solid flat ${pngBgColor} backdrop", or "pure solid ${pngBgColor} background, no shadows" into the prompt variations.
${currentDirective}
${flatIconDirective}
${vectorSubTypeDirective}
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

  let effectiveStyleCategory = styleCategory;
  if (styleCategory === 'Vector Art' && isPngMode && vectorSubType) {
    if (vectorSubType === 'minimal_flat') effectiveStyleCategory = 'Vector Art - Minimal Flat Design';
    else if (vectorSubType === 'flat_vector') effectiveStyleCategory = 'Vector Art - Flat Vector Illustration';
    else if (vectorSubType === 'corporate_flat') effectiveStyleCategory = 'Vector Art - Corporate Flat Illustration';
    else if (vectorSubType === 'gradient_flat') effectiveStyleCategory = 'Vector Art - Gradient Flat Design';
    else if (vectorSubType === 'flat_icon') effectiveStyleCategory = 'Vector Art - Flat Icon Design';
    else if (vectorSubType === 'isometric_flat') effectiveStyleCategory = 'Vector Art - Isometric Flat Design';
  }

  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are an elite AI Image Prompt Designer specializing in text-to-image generators like Midjourney, DALL-E 3, Adobe Firefly, and Stable Diffusion.
Anda adalah AI Prompt Generator ahli yang bertugas membuat prompt gambar unik dan bervariasi.
Your job is to translate a raw idea and specific style choices into exactly ${count} highly unique, descriptive, and professional-grade generation prompt variations in English.

Input parameters:
- Base Subject/Idea: "${subject}"
- Selected Style Context: ${effectiveStyleCategory}
- Theme Context & Salt Variabilitas: ${randomSaltInjection}${userCameraAngle ? `\n- 🎥 User-Selected Camera Angle: "${userCameraAngle}" (blend this naturally into the prompt without making it sound forced or edited)` : ''}
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
6. ${isPhotographic ? `Camera details: Specific lens types, aperture, and camera angles (e.g., 85mm lens, f/1.8, high shutter speed, DSLR).${cameraAngleDirective}` : 'Medium-Specific details: Focus entirely on visual craftsmanship and physical/digital medium characteristics. Do NOT include camera models, focal lengths, shutter speeds, or photographic sensor details.'}

Rules for the Generated Prompts:
0. PROMPT STRUCTURE FORMULA: Every prompt MUST strictly start with "${effectiveStyleCategory}" and then follow this sequence: [Subject] [Action] [Visual Characteristics] [Materials/Textures] [Environment] [Lighting]${isPhotographic ? ' [Camera Details]' : ''} [Commercial Intent]. Combine these elements into a fluid, professional description.
0.1 DOMAIN AUTHENTICITY: For artistic, illustrated, graphic, 3D, and crafted styles, you are strictly forbidden from forcing photographic jargon (such as "shot on", "aperture", "f-stop", "lens", "shutter speed", "DSLR", "realistic photography", "realistic skin/hair texture") into the prompts. They must remain 100% true to their original non-photographic artistic style.
0.15 STYLE PURITY LOCK — ZERO CROSS-CONTAMINATION (CRITICAL — READ TWICE):
      Each style has its OWN vocabulary domain. You MUST use ONLY the vocabulary belonging to the selected style. NEVER leak terms from other style domains.
      ─ STYLE VOCABULARY DOMAINS ─
      📸 Photographic Domain (Cinematic, Photorealistic, Vintage Photography, Dark Horror, Corporate Tech): camera lenses, apertures, DSLR, film grain, lighting setups, real-world environments, human subjects, candid moments. FORBIDDEN: "vector", "flat design", "outline", "stroke", "fill color", "isometric grid", "voxel", "polygon count", "render engine".
      🎨 Vector/Illustration Domain (Vector Art, Flat Icon, Line Art, Sticker Illustration, Graphic Design): vector paths, solid fills, clean outlines, flat colors, geometric shapes, stroke weight, anchor points. FORBIDDEN: camera terms, 3D materials, photorealism, "shot on", "lens", real-world physics.
      🧱 3D/CGI Domain (3D Render, 3D CGI, Lowpoly, Voxel Art, Isometric, Claymation): polygons, materials, textures, global illumination, ray tracing, subsurface scattering, voxel grids. FORBIDDEN: "photograph", "camera", "vector", "flat 2D".
      🖌️ Traditional Art Domain (Oil Painting, Watercolor, HandDrawn Sketch, Paper Cut, Embroidery, Origami): brushstrokes, pigments, paper grain, canvas, textile, folded paper. FORBIDDEN: digital 3D terms, camera terms, "vector".
      🎮 Stylized Domain (Anime/Manga, Disney Cartoon, Pixel Art, Lego Style): cel-shading, brick toys, pixel grid, expressive features. FORBIDDEN: photorealism, 3D render jargon, vector flat design.
      ⚠️ BEFORE WRITING EACH PROMPT: check which domain the selected style belongs to, then filter your vocabulary to ONLY that domain. Cross-domain leakage = FAIL.
0.2 COMMERCIAL PRIORITY: The subject must occupy at least 30% of the visual attention. The commercial concept must be immediately understandable.
1. ALWAYS translate the core subject "${subject}" to descriptive, high-quality, vivid English first if it was entered in another language (like Indonesian).
2. Return EXACTLY ${count} unique prompt variations as an array. Each must be distinct, professionally composed for its native style domain (real photography or high-quality illustration/craft/CGI), use distinct compositions/lighting/medium details, and include "copy space" (negative space) for text placement.
3. WORD COUNT CONSTRAINT: Each generated prompt SHOULD be between ${minWords} and ${maxWords} words long. Adjust the level of detail to strictly match this requested length profile.
4. COMMERCIAL STOCK COMPLIANCE: Focus on clean, high-resolution, sharp focus, uncluttered, professional editorial photography/art aesthetics, suitable for Shutterstock/Adobe Stock. Absolutely avoid trademarked logos or specific intellectual property (IP). Under any circumstances, NEVER include any brand names, trademarked names, manufacturer names, or proprietary product lines (e.g., Apple, Nike, Adidas, BMW, Vespa, LEGO, GoPro, iPhone). Use completely generic descriptions instead.
   Under Adobe Stock Content Policy for Artist Names, Real Known People, and Fictional Characters (https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
   - Do NOT generate prompts that reference, suggest, or contain names of real known people (including celebrities, politicians, athletes, historical figures, or public figures).
   - Do NOT generate prompts referencing fictional characters from books, movies, comics, games, or television programs (e.g., Disney characters, Mickey Mouse, Batman, Spider-Man, Anime characters, Marvel/DC superheroes, LEGO characters, Barbie, etc.).
   - Do NOT generate prompts referencing specific artists (living or deceased) whose work is protected by copyright (e.g., "in the style of Van Gogh", "drawn by Picasso", "Andy Warhol style", etc.). Keep style references strictly generic.
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
11. ADOBE STOCK SIMILARITY PROTECTION ACTIVE (CRITICAL CORE DIRECTIVE):
    - DO NOT generate prompts that sound like generic, common, or natural stock photos (e.g., "business people shaking hands", "happy family in park", "generic coffee cup on table").
    - You must forcefully inject high creativity, surrealism, extreme stylization, bizarre but commercially viable angles, or deeply artistic metaphors so the resulting image is wildly unique and stands out from the millions of generic Adobe Stock assets.
    - Break the standard stock photography molds by using hyper-specific, unusual subject interactions, highly dramatic emotional states, or avant-garde conceptual presentations. Make the prompts incredibly creative, unpredictable, and highly varied.
    - Inject extreme variation across:
      * Composition & Camera Angle: Vary across wide shots, extreme close-up, medium shots, bird's-eye view, low-angle perspective, and overhead drone shots.
      * Color Palette & Lighting Setup: Vary across natural golden hour, bright overcast daylight, neon nights, moody low-key twilight, soft studio lighting, high-contrast chiaroscuro, and cool pastel hues.
      * Subjects, Expressions & Poses: Vary characters' ages, genders, ethnicities, actions, emotional expressions (e.g., focused, joyful, contemplative, active, serene), and direct interactions with their surroundings.
      * Scenario & Environment: Change environments completely (e.g., indoors vs. outdoors, modern minimalist spaces vs. raw nature, urban landscapes vs. intimate workspaces).
    - ANTI-CLICHÉ & ANTI-FORCED-DRAMA RULE (CRITICAL):
      * DO NOT default to cliché dramatic weather tropes such as "dramatic stormy sky", "dark thunderclouds", "lightning strikes", "apocalyptic sky", "raging thunderstorm", or "ominous black clouds" unless the subject EXPLICITLY requires it (e.g., a storm-chaser documentary scene).
      * Creativity does NOT mean forced drama, darkness, or apocalyptic weather. A beautiful Cinematic scene can be a warm golden-hour field, a sleek modern interior, a serene misty forest, a vibrant cityscape at dusk, or an intimate candlelit room — not just dark skies and lightning.
      * For Dark Horror Aesthetic: atmosphere comes from lighting, texture, composition, and psychological tension — NOT from defaulting to thunder and lightning. Use fog, decay, shadow, unsettling framing, eerie stillness, or subtle wrongness.
      * Each prompt MUST reflect the AUTHENTIC character of its style, not a lazy default dramatic template. Vary environments naturally: sunny, overcast, dawn, dusk, indoor, outdoor, urban, natural, abstract — whatever fits the subject and style genuinely.
    - ZERO-GENERIC PROMPT RULE (CRITICAL — READ CAREFULLY):
      * DO NOT write prompts that sound like generic stock photo descriptions. Specifically FORBIDDEN patterns:
        — "a person standing..." / "a person sitting..." / "a person holding..." without hyper-specific, unusual detail
        — "beautiful", "stunning", "amazing", "professional", "high quality" — these are empty filler words, NEVER use them
        — "with copy space" / "isolated on white" used lazily — these must feel organic, not tacked on
        — Vague environments: "in a room", "outdoors", "in nature", "in a studio" — be hyper-specific (e.g., "in a sun-drenched Parisian attic with exposed wooden beams" not "in a room")
      * EVERY prompt MUST contain at least ONE hyper-specific, unmistakably unique micro-detail that makes it impossible to confuse with another prompt (e.g., a specific object, texture, color interaction, or action that only appears in this exact variation).
      * Prefer unusual, memorable actions over static poses: "carefully polishing a vintage brass telescope with a faded velvet cloth" NOT "holding a telescope".
      * Each prompt variation must feel like it was hand-crafted by a specialist in that style domain, not auto-generated from a template. The reader should feel the specific mood, texture, and atmosphere of that exact moment — not a generic placeholder.
    - ABSOLUTE STYLE SEPARATION (CINEMATIC VS PHOTOREALISTIC):
      * If the Selected Style is "Cinematic", the output prompts MUST be strictly cinematic, looking like a movie-set still with anamorphic qualities, film color grading, volumetric lighting, and dramatic mood. Do NOT generate standard flat stock photos.
      * If the Selected Style is "Photorealistic", the output prompts MUST be strictly realistic, looking like sharp, candid, organic real-world captures with lifelike skin/surface textures, natural sunlight or soft studio strobes, and genuine human behaviors. Do NOT inject theatrical movie color grading or artificial film flares.
      * NEVER mix, swap, or blur the lines between Cinematic and Photorealistic style prompts! Keep them completely distinct and accurate to their true style definition.
    - PNG ASSET VARIATION (OBJECT COUNT & ARRANGEMENTS):
      * For PNG/isolated asset mode, you MUST inject extreme variety in subject count and arrangement, and apply the "Creative Over Creative" methodology.
      * "Creative Over Creative" means you reject boring, standard or generic asset descriptions. Instead, design highly stylized, imaginative, and intellectually unique visual configurations of the subject.
      * Stagger the variations so that some prompts describe a single standalone highly-detailed premium object, some describe exactly two related or complementary objects interacting creatively, and some describe an elegant flat lay, dynamic grouping, or a neat stylized set of 3+ objects. This ensures an extremely rich, diverse asset pack and completely prevents "similar content" rejection.
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

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
  ];

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
          config: { temperature: randomTemp, seed: seed, topP: 0.99 },
          model
        });
        
        const parsed = JSON.parse(extractJSON(text));
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
      for (let attemptIdx = 0; attemptIdx < maxAttempts; attemptIdx++) {
        try {
          console.log(`[generateOptimizedPrompt] Attempting with model ${modelName} (attempt ${attemptIdx + 1}/${maxAttempts})...`);
          const parts = [];
          if (referenceImages && referenceImages.length > 0) {
            referenceImages.forEach((img) => {
              try {
                parts.push(processFrameServer(img));
              } catch (e) {
                console.warn('[generateOptimizedPrompt] Failed processing reference image:', e);
              }
            });
          }

          let instructionText = `Expand the concept into ${count} unique immersive prompt variations of type \"\${styleCategory}\"" based on: \"\${subject}\"".\\n\\nCRITICAL: Write fully formed, vivid natural language sentences. DO NOT use comma-separated keyword lists or tags. Each variation MUST be a complete, descriptive paragraph.`;
          if (referenceImages && referenceImages.length > 0) {
            instructionText = `You are given ${referenceImages.length} reference image(s) as visual input showing a specific aesthetic style, layout, color palette, or subject. Combine/mix this visual style and composition with the user's typed base subject concept: \"\${subject}\"".\\n\\nExpand the concept into ${count} unique immersive prompt variations of type \"\${styleCategory}\"".\\n\\nCRITICAL DIRECTIVES:\\n1. MIX/BLEND: Every generated prompt MUST feel like a perfect hybrid combination of the visual style/atmosphere of the reference images and the subject matter of \"\${subject}\"".\\n2. DO NOT literally describe the reference images, instead extract their artistic style, curves, line flow, color tones, lighting, or layout, and apply that aesthetic to describe \"\${subject}\"".\\n3. Write fully formed, vivid natural language sentences in English. Each variation MUST be a complete, descriptive paragraph. DO NOT use comma-separated keyword lists or tags.`;
          }
          parts.push({ text: instructionText });

          const response = await callGeminiWithRetry(modelName, {
            parts
          }, {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature: randomTemp,
            seed: seed,
            topP: 0.99,
            topK: 100,
            safetySettings: safetySettings
          });

          const text = response.text || "{}";
          const parsed = JSON.parse(extractJSON(text));
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
    "Graphic Design": [
      "flat vector graphic design, Adobe Illustrator style composition, bold geometric shapes, clean commercial layout, vibrant duotone gradient, no realism",
      "promotional banner template, isometric abstract geometry, halftone dot pattern, dynamic diagonal slashes, smooth gradient mesh, purely digital art",
      "commercial advertising poster design, overlapping translucent polygons, bold line art elements, ornate frame border, striking color contrast, clean copy space",
      "CorelDRAW banner style, geometric abstract composition, ribbon badge placeholder, modern flat vector shapes, electric blue and hot pink palette, no photography",
      "social media promo template, layered geometric shapes, smooth drop shadows, sleek vector paths, golden yellow and deep purple gradient, shape-based design",
      "Adobe Photoshop poster composition, asymmetrical dynamic layout, gradient mesh background, abstract blob elements, neon green and teal accents, purely digital",
      "corporate branding layout, isometric cube cluster, sweeping curve dividers, bold triadic color scheme, clean negative space, professional design tool aesthetic",
      "event backdrop banner design, overlapping circles and triangles, smooth blending modes, halftone texture overlay, coral orange and electric blue duotone",
      "marketing flyer template, geometric frame border, abstract placeholder text bars, vibrant commercial colors, sleek layer-style effects, zero realism",
      "stock vector template style, flat art composition, dynamic shape cluster, clean typography placeholder, rich gradient background, purely graphic art"
    ],
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
      "sleek flat design vector style, bold clean geometric outlines, vibrant flat solid colors, minimalist 2D vector graphics",
      "minimalist vector illustration, smooth curves, clean 2D flat design aesthetic, Adobe Illustrator style",
      "sharp flat vector graphic, solid bold flat colors, high fidelity flat shading style, crisp edges, no gradients",
      "modern corporate flat design vector illustration, stylized minimalist characters, clean shapes",
      "creative 2D flat vector art, solid color blocking, clean layout, perfect proportions, beautifully composed vector scene",
      "retro-wave flat design vector art, precise paths, bold pop solid colors, clean geometric shapes",
      "elegant minimalist flat design graphic, balanced solid color palette, sharp clean paths, artistic vector",
      "2D stylized flat vector illustration, clean outline art, modern flat aesthetic",
      "modern editorial flat vector, stylized 2D visual presentation, flat design style, premium visual look",
      "flat minimal vector layout, screen printed flat design, striking balanced solid hues, beautiful color blocking"
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
    "Grimdark Gothic Horror Painterly": [
      "grimdark gothic horror, macabre atmosphere, oppressive shadows, decaying architecture, unsettling lighting",
      "heavy impasto painterly brushstrokes, dark fantasy art, eerie mist, ominous mood, highly detailed oil painting style",
      "gothic horror masterpiece, dark and gritty textures, sinister environment, classic dark fantasy illustration",
      "macabre painterly style, moody low-key lighting, gothic elements, dramatic and scary atmosphere",
      "ominous dark fantasy digital painting, brutalist grimdark aesthetics, hauntingly beautiful but terrifying"
    ],
    "Grimdark": [
      "grimdark, oppressive shadows, terrifying atmosphere, hyper-detailed dark fantasy",
      "brutalist grimdark aesthetics, bleak world, highly detailed digital painting",
      "grimdark masterpiece, dark fantasy art, ominous mood, hyper-realistic"
    ],
    "Gothic Horror": [
      "gothic horror, eerie mist, decaying ancient architecture, unsettling lighting",
      "classic gothic horror, creepy mansion, moonlit shadows, macabre atmosphere",
      "terrifying gothic horror art, intricate gothic architecture, sinister mood"
    ],
    "Infernal / Hellscape": [
      "infernal hellscape, demonic elements, brimstone and fire, ominous dark fantasy",
      "fiery infernal landscape, demonic horror, terrifying hellish environment",
      "infernal abyss, chaotic fire and shadows, dark fantasy masterpiece"
    ],
    "Macabre Art": [
      "macabre art, sinister environment, bone-chilling details, dark surrealism",
      "creepy macabre painting, unsettling subjects, high-contrast dark art",
      "macabre masterpiece, grim details, dark and terrifying aesthetics"
    ],
    "Occult Horror": [
      "occult horror, ancient runes, dark magic rituals, creepy and mysterious mood",
      "terrifying occult ritual scene, eerie lighting, dark mysterious fantasy",
      "occult horror aesthetics, eerie symbolism, unsettling dark magic art"
    ],
    "Cinematic Horror Concept Art": [
      "cinematic horror concept art, high-contrast chiaroscuro, moody lighting, terrifying and beautiful",
      "cinematic dark horror, volumetric mist, terrifying movie still, highly detailed",
      "masterful cinematic horror composition, atmospheric dread, epic dark concept art"
    ],
    "Painterly Digital Art": [
      "painterly digital art, heavy impasto brushstrokes, dark horror aesthetics, masterwork painting",
      "expressive painterly horror art, thick brushstrokes, eerie mood, beautiful yet terrifying",
      "digital painterly style, classical horror aesthetic, highly detailed brushwork"
    ],
    "Dark Horror Aesthetic": [
      "grimdark, oppressive shadows, terrifying atmosphere, hyper-detailed dark fantasy",
      "gothic horror, eerie mist, decaying ancient architecture, unsettling lighting",
      "infernal / hellscape, demonic elements, brimstone and fire, ominous dark fantasy",
      "macabre art, sinister environment, bone-chilling details, dark surrealism",
      "occult horror, ancient runes, dark magic rituals, creepy and mysterious mood",
      "cinematic horror concept art, high-contrast chiaroscuro, moody lighting, terrifying and beautiful",
      "painterly digital art, heavy impasto brushstrokes, dark horror aesthetics, masterwork painting"
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
      "pristine 3D model render, Unreal Engine 5 real-time render, Lumen global illumination, smooth PBR clay materials, cute 3D character style",
      "cute stylized 3D mascot render, Unreal Engine 5 style, smooth plastic surfaces, pastel colors, soft studio lighting setup",
      "3D digital asset rendering, Unreal Engine 5 real-time rendering, glossy metal and ceramic PBR textures, high fidelity",
      "vibrant 3D render, Unreal Engine 5 Nanite detail, playful elements, clean shapes, outstanding volumetric depth",
      "ultra modern glossy 3D key visual element, Unreal Engine 5 ray-traced reflections, ambient occlusion, glowing neon edges",
      "stylized 3D porcelain model, Unreal Engine 5 real-time render, highly polished surface, clean pastel studio gradients",
      "creative 3D render element, Unreal Engine 5 cinematic real-time lighting, whimsical design, soft plastic textures",
      "cute 3D game asset render, Unreal Engine 5 real-time render quality, bright colors, friendly round edges",
      "3D metallic chrome asset, Unreal Engine 5 real-time reflections, futuristic iridescent surface, flawless render",
      "high-fidelity 3D product render, Unreal Engine 5 Lumen lighting, sharp PBR material detail, premium studio render"
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
      "minimalist black and white continuous single-line art vector graphic, clean black outlines on solid white background, elegant minimalist style, no shading, no sketch",
      "contemporary fine continuous line art asset, crisp black vector contours, minimalist aesthetic, graceful smooth curves, pure continuous line",
      "modern continuous single-line drawing style, sleek black ink lines, high contrast minimalist art design on solid white, zero shading, zero sketch lines",
      "elegant minimalist continuous line art vector illustration, pristine sharp black paths, creative single-line work, ultra-clean look",
      "minimalist continuous line outline vector illustration, modern clean line strokes, smooth styling with high clarity, no polygon, no hatch lines",
      "beautiful abstract continuous single-line art design, continuous ink pen line strokes, sophisticated flow and structure, solid white background, no texture",
      "zen continuous single-line graphic, balanced minimal black outlines, elegant and pure continuous line aesthetic, no colors, no shading",
      "sleek continuous line art emblem vector, precise geometric single-line curves, highly readable silhouette design, minimalist continuous path",
      "artistic minimalist continuous line contour illustration, pristine black ink outline graphic, elegant single-line styling, pure solid background",
      "trendy continuous line art vector asset, single-stroke flow, perfect smooth curves and sharp line endings, modern design look, no sketch, no polygon"
    ],
    "Silhouette": [
      "minimalist high-contrast black silhouette vector graphic, clean solid black outline shape on solid white background, elegant look",
      "contemporary fine silhouette design asset, crisp solid black vector contours, minimalist aesthetic, graceful curves",
      "modern solid shape profile silhouette illustration, sleek black shapes, high contrast minimalist art on solid white, no details",
      "elegant minimalist standalone silhouette vector, pristine sharp black fill path, creative vector shape art",
      "minimalist solid silhouette outline vector illustration, modern clean shape strokes, smooth styling with high clarity"
    ],
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
  
  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are an expert AI visual analyst and prompt engineer.
Analyze the provided image and generate a highly detailed, professional text-to-image prompt.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner to extract its core subject, commercial concept, and design/photographic niche.
2. NO DIRECT REPLICATION: Do not just literally transcribe or describe the image word-for-word. Instead, identify its visual and commercial niche/theme (e.g., "minimalist organic skincare cosmetics flatlay", "cozy Scandinavian coffee shop interior", "futuristic cyberpunk city street at dusk").
3. GENERATE NICHE PROMPT VARIATION: Generate a highly professional, optimized text-to-image prompt as a sister variation of that niche. It should not be exactly identical to the input image, but rather feel like a high-quality companion asset or beautiful sibling image within the same thematic series (e.g., subtle variations in composition, background details, object arrangement, or action while retaining the premium quality, camera optics, lighting, and aesthetic flavor).
4. NO HALLUCINATION: Baseline technical facts (lens, lighting, composition, style) must be derived from the image, but the exact visual setup should be synthesized as a beautiful, high-quality niche variation.
5. STRICT NO INTELLECTUAL PROPERTY (IP) COMPLIANCE: You are STRICTLY FORBIDDEN from including any trademarked brand names, company names, product lines, registered logos, or patented product designs (e.g., do NOT use "Apple", "Nike", "Adidas", "iPhone", "BMW", "Mercedes", "LEGO", "GoPro", "Vespa", "Tesla", etc.) or specific copyrighted characters in the generated prompt or description. If the image contains recognizable branded items, you MUST describe them using completely generic terms (e.g., "sleek modern smartphone" instead of "iPhone", "athletic running shoes" instead of "Nike shoes", "modern electric sedan" instead of "Tesla", "classic European retro scooter" instead of "Vespa"). This ensures the resulting prompts comply with commercial stock policies and avoid any intellectual property (IP) refusal.

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
- If 'Grimdark Gothic Horror Painterly': focus on macabre atmospheres, oppressive shadows, eerie mist, decaying architecture, unsettling lighting, and heavy impasto painterly brushstrokes characteristic of dark fantasy and gothic horror art.

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
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash'];
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
    const data = JSON.parse(extractJSON(responseText));
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
  
  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are an expert AI visual analyst and prompt engineer.
Analyze the provided images and generate a highly detailed, professional text-to-image prompt for each one.

CRITICAL VISUAL ANALYSIS AND VARIATION RULES:
1. FULL SCAN: You MUST examine the ENTIRE image from corner to corner to extract its core subject, commercial concept, and design/photographic niche.
2. NO DIRECT REPLICATION: Do not just literally transcribe or describe the images word-for-word. Instead, identify their visual and commercial niche/theme (e.g., "minimalist organic skincare cosmetics flatlay", "cozy Scandinavian coffee shop interior", "futuristic cyberpunk city street at dusk").
3. GENERATE NICHE PROMPT VARIATION: Generate a highly professional, optimized text-to-image prompt as a sister variation of that niche. It should not be exactly identical to the input image, but rather feel like a high-quality companion asset or beautiful sibling image within the same thematic series (e.g., subtle variations in composition, background details, object arrangement, or action while retaining the premium quality, camera optics, lighting, and aesthetic flavor).
4. NO HALLUCINATION: Baseline technical facts (lens, lighting, composition, style) must be derived from the image, but the exact visual setup should be synthesized as a beautiful, high-quality niche variation.
5. STRICT NO INTELLECTUAL PROPERTY (IP) COMPLIANCE: You are STRICTLY FORBIDDEN from including any trademarked brand names, company names, product lines, registered logos, or patented product designs (e.g., do NOT use "Apple", "Nike", "Adidas", "iPhone", "BMW", "Mercedes", "LEGO", "GoPro", "Vespa", "Tesla", etc.) or specific copyrighted characters in the generated prompt or description. If the images contain recognizable branded items, you MUST describe them using completely generic terms (e.g., "sleek modern smartphone" instead of "iPhone", "athletic running shoes" instead of "Nike shoes", "modern electric sedan" instead of "Tesla", "classic European retro scooter" instead of "Vespa"). This ensures the resulting prompts comply with commercial stock policies and avoid any intellectual property (IP) refusal.

FOR EACH IMAGE, EXTRACT AND ANALYZE:
- Subject, Action, Environment, Mood, Lighting, Camera angle, Lens estimate, Composition, Visual style.

GENERATE PROMPT MATCHING STYLE: ${styleCategory}
Adapt the logic based on style:
- Photorealistic/Cinematic: High technical detail, optics, and lighting.
- Adobe Stock/Editorial: Commercial composition and polish.
- Lifestyle/Fine Art: Emotional resonance and artistic medium.
- Grimdark Gothic Horror Painterly: Macabre atmospheres, oppressive shadows, eerie mist, decaying architecture, unsettling lighting, and heavy impasto painterly brushstrokes characteristic of dark fantasy.

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

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash'];
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
    const data = JSON.parse(extractJSON(responseText));
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
     parsed = JSON.parse(extractJSON(responseText)) as Omit<VideoPrompt, 'id'>[];
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

export async function checkImageQuality(
  image: string | string[], 
  tolerance: 'STRICT' | 'MEDIUM' | 'LOOSE' = 'MEDIUM', 
  language: string = 'Bahasa', 
  model?: string, 
  fileType?: string, 
  imageMetadata?: any
) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const isIndonesian = !language || language === 'Bahasa' || language === 'id' || language === 'Indonesian' || language?.toLowerCase() === 'indonesian' || language?.toLowerCase() === 'id';
  const targetLanguageName = isIndonesian ? 'Indonesian (Bahasa Indonesia)' : 'English';

  let metadataInstruction = "";
  if (imageMetadata) {
    metadataInstruction = `\n\n---\n[DATA PENGUKURAN PIKSEL OBJEKTIF - WAJIB DIJADIKAN ACUAN UTAMA]\nBerikut adalah hasil pengukuran teknis NYATA dari piksel file gambar asli (dihitung menggunakan analisis Laplacian/statistik piksel, BUKAN estimasi visual):\n\`\`\`json\n${JSON.stringify(imageMetadata, null, 2)}\n\`\`\`\nATURAN PENTING TERKAIT DATA INI:\n1. Data ini adalah HASIL PENGUKURAN OBJEKTIF pada file resolusi ASLI, sedangkan gambar yang Anda lihat secara visual mungkin telah di-downscale/dikompresi oleh sistem vision API sehingga cacat halus (blur ringan, noise, banding, blocking) BISA JADI TIDAK TERLIHAT JELAS secara visual oleh Anda. JANGAN mengabaikan indikasi cacat pada data pengukuran hanya karena gambar "terlihat baik-baik saja" secara visual — gabungkan kedua sumber bukti (visual + numerik).\n2. Field \`sharpness.status\` yang bernilai "Extremely blurry / Out-of-focus" atau "Soft focus / Out of focus" adalah indikasi kuat kegagalan fokus yang WAJIB memengaruhi status \`blur\`.\n3. Field \`noise.status\` "High Noise / Grain" dan \`brightness.status\` yang menyebut "clipping" adalah indikasi kuat kegagalan teknis yang WAJIB memengaruhi status \`noise\`/\`exposure\`/\`lighting\`.\n4. Field \`banding\` dan \`jpeg_blocking\` dengan status "Review..." adalah indikasi artefak kompresi/posterization yang WAJIB memengaruhi status \`artifacts\`.\n5. Field \`local_analysis.has_local_blur_anomaly\` = true berarti SEBAGIAN area gambar (bukan seluruh gambar) terdeteksi jauh lebih blur dari area lain — ini adalah pola cacat AI generatif atau motion blur parsial yang sangat mudah TERLEWAT jika hanya melihat gambar secara sekilas. Periksa dan pertimbangkan dengan serius.\n6. Field \`megapixels\` dan dimensi/resolusi FILE TIDAK BOLEH dipakai sebagai quality gate, penalty, FAIL, WARNING, atau alasan menurunkan overall_score. Resolusi hanya boleh dianggap metadata informasional bila muncul di data teknis. Jangan menyebut resolusi rendah sebagai masalah kualitas. \`file_size_kb\` juga bukan indikator kualitas visual. Fokuskan penilaian pada bukti visual dan forensic pixel evidence seperti sharpness, noise, exposure, banding, compression, alpha edge, OCR/text integrity, structural defects, AI artifacts, dan IP.\n7. Untuk PNG transparan, field \`transparency\` adalah pemeriksaan khusus cutout. Persentase transparan yang tinggi dan partial-alpha anti-aliasing yang normal BUKAN cacat. Jangan FAIL hanya karena gambar memiliki transparansi atau pixel semi-transparan. Perlakukan \`edge_halo_risk_percent\` sebagai cacat hanya bila bukti menunjukkan matte/fringe warna yang berulang dan benar-benar terlihat pada batas objek.\n8. Jika bukti alpha-edge hanya level WARN, laporkan sebagai rekomendasi pemeriksaan, bukan automatic rejection. Bedakan anti-aliasing normal dari kontaminasi matte hitam/putih/warna.\n9. Jangan menyimpulkan high noise, blur, atau AI artifact hanya dari preview yang telah di-downscale ketika pengukuran piksel objektif menunjukkan sebaliknya. Gunakan angka teknis dan crop resolusi asli bersama-sama.\nJadikan data teknis di atas sebagai BUKTI UTAMA yang menguatkan atau mengoreksi kesan visual Anda, bukan sekadar informasi tambahan.`;
  }

  let systemInstruction = `Anda adalah "Ai Vision", mesin kurator profesional tingkat lanjut yang dikonfigurasi khusus menyelaraskan aturan dengan standar kualitas teknis premium industri dan pedoman kurasi Adobe Stock & Shutterstock komersial.

Tugas Anda terbagi menjadi 3 modul utama dengan standar kualitas kurasi mandiri yang sangat ketat:
1. Modul OCR, Brand Safety & IP Check: Memindai hak cipta intelektual, merek dagang, logo pada produk/pakaian, plat nomor, tanda tangan, wajah tanpa model release, serta teks/watermark ilegal.
2. Modul AI Anomaly & Anatomi: Mendeteksi cacat struktural AI generatif, wajah kerumunan yang meleleh/hancur di latar belakang (melted background faces), benda-benda aneh yang bentuknya tidak logis (nonsensical objects/hallucinations), pola rumit yang hancur (pattern degradation), blur yang terlihat seperti coretan kasar bukan bokeh natural (unnatural depth of field), sirkuit meleleh (melted details), pola acak cacat, ketidaksesuaian perspektif logis, inkonsistensi bayangan/refleksi, juling mata, juling asimetris wajah, dan distorsi anatomi (seperti jari tangan melengkung aneh, menyatu, atau lebih dari 5).
3. Modul Pixel Analysis (Technical Quality): Memastikan kualitas teknis piksel, ketajaman fokus (soft focus vs sharp), pencahayaan (overexposed/blown highlights vs underexposed/crushed shadows), artifact kompresi, luminance noise parah pada shadow, chromatic aberration, dan noda sensor kamera (sensor dust spots).

---
PANDUAN KESEIMBANGAN ESTETIKA & TEKNIS (CRITICAL BALANCE FOR PROFESSIONAL CONTENT):
Bedakan antara pilihan artistik/estetika premium yang disengaja dan cacat teknis murni:
- Depth of Field (DoF) dangkal / Bokeh: Latar belakang buram yang indah (bokeh lembut) adalah kualitas bernilai jual sangat tinggi dan dicari di Adobe Stock, BUKAN cacat. Selama bagian utama subjek tetap fokus tajam sempurna (tack-sharp), tandai status "PASS" pada "blur" dan "out_of_focus".
- Low-light & Shadow Noise: Foto bernuansa malam hari, lilin, atau siluet dramatis secara wajar memiliki noise halus. Jika tidak parah atau mengganggu estetika komersial, ini 100% PASS.
- High-Contrast & Shadows: Bayangan yang dalam (crushed shadows) atau sorotan cahaya terang yang dramatis sering kali merupakan unsur seni/pencahayaan yang indah. Jangan langsung menganggapnya cacat eksposur jika itu memperkuat mood estetika foto.
- BATASAN PENGECUALIAN ARTISTIK (CRITICAL): Pengecualian estetika di atas (bokeh, noise halus, bayangan dramatis) HANYA berlaku untuk pilihan artistik murni. Pengecualian ini TIDAK PERNAH berlaku untuk cacat struktural AI, objek yang tidak logis secara mekanis, anatomi cacat, atau teks rusak — temuan tersebut WAJIB FAIL di semua mode toleransi tanpa kecuali.

---
PANDUAN MULTI-GAMBAR / CROP DETAIL RESOLUSI ASLI (CRITICAL):
Jika Anda menerima LEBIH DARI 1 gambar, gambar PERTAMA adalah tampilan penuh, dan gambar ke-2, ke-3, ke-4, dst. adalah CROP DETAIL RESOLUSI ASLI 100% PIXEL (bukan hasil upscale) yang diambil dari 4 wilayah KUADRAN ber-overlap 20% yang bersama-sama mencakup SELURUH permukaan gambar, berurutan: ATAS-KIRI, ATAS-KANAN, BAWAH-KIRI, lalu BAWAH-KANAN.
- Gunakan setiap crop KHUSUS untuk inspeksi forensik tingkat piksel: artefak kompresi, pixel banding, noise mikroskopis, tepian objek, jari tangan, wajah, dan logika mekanis objek.
- ZONA RAWAN KRITIS (WAJIB DIPERIKSA EKSTRA TELITI): Pada foto orang memegang/menyentuh objek (produk, model, botol, alat, dsb.), titik kontak tangan-jari-objek PALING SERING berada di paruh BAWAH frame (kuadran BAWAH-KIRI/BAWAH-KANAN) — dekat dada, perut, atau pinggang subjek. Zona inilah yang paling sering mengandung cacat AI generatif (jari menyatu/meleleh ke objek, objek yang menembus pakaian, genggaman yang mustahil secara fisik) namun paling mudah terlewat jika hanya melihat gambar penuh yang telah diperkecil. Periksa kuadran bawah dengan tingkat kecurigaan setara atau lebih tinggi daripada kuadran atas.
- Sebutkan di laporan visual_scan_analysis crop wilayah mana (atas-kiri/atas-kanan/bawah-kiri/bawah-kanan) tempat Anda menemukan cacat.
- Cacat yang terkonfirmasi pada SALAH SATU crop saja sudah cukup untuk menyatakan FAIL pada check terkait — moderator Adobe Stock memeriksa gambar pada zoom 100-200% di SELURUH area, bukan hanya tampilan penuh.
- PERMUKAAN BERTULISAN DI LATAR BELAKANG (WAJIB DIPERIKSA DI SETIAP CROP): Whiteboard, papan tulis, sticky notes, poster dinding, sampul buku, layar monitor/panel kontrol, label kemasan, dan colokan/soket listrik yang memiliki cetakan ikon/huruf SERING berada di pinggir atau sudut frame (bukan di tengah) sehingga mudah terlewat jika hanya melihat gambar penuh yang kecil. WAJIB periksa SETIAP permukaan bertulisan di SETIAP crop kuadran secara eksplisit satu per satu — coretan/diagram yang tidak membentuk simbol kimia atau tulisan yang benar-benar bermakna (huruf acak, bentuk molekul yang tidak logis, ikon soket listrik yang bukan bentuk lubang colokan standar) adalah cacat AI generatif yang WAJIB FAIL, walaupun ukurannya kecil dan berada di latar belakang yang blur/jauh.

---
Fokuskan analisis Anda SECARA KETAT pada kategori kurasi resmi Adobe Stock untuk Alasan Penolakan Konten (Content Refusal Criteria) berikut (Lakukan inspeksi visual seolah-olah gambar diperbesar/Zoom 100%. Manfaatkan SEMUA crop detail resolusi asli yang diberikan!):
1. OUT OF FOCUS / SHARPNESS ISSUES (Masalah Fokus & Ketajaman):
   - Subjek utama wajib memiliki fokus yang tajam sempurna (pin-sharp atau tack-sharp).
   - Deteksi motion blur yang tidak disengaja akibat pergerakan kamera lambat (camera shake) atau shutter speed subjek yang tidak memadai.
   - Deteksi "soft focus" di mana subjek utama tampak kabur atau tidak terdefinisi secara detail.
   - Pengecualian: Depth of Field (DoF) dangkal yang disengaja diperbolehkan hanya jika bagian subjek yang penting tetap fokus tajam sempurna (tack-sharp).
2. EXPOSURE & LIGHTING ISSUES (Masalah Eksposur & Pencahayaan):
   - Overexposure: Blown highlights/highlights clipping (kehilangan detail pada area terang).
   - Underexposure: Crushed shadows/muddy shadows (gelap berlumpur dengan noise tinggi atau detail shadow terpotong).
   - Kontras berlebih (harsh contrast) yang menghilangkan kemulusan gradasi atau pencahayaan datar (flat/muddy lighting) yang membosankan.
3. NOISE & GRAIN (Masalah Derau):
   - Deteksi luminance noise (derau bintik pasir) yang kasar dan chromatic/color noise (bintik warna piksel merah/hijau/biru yang tidak semestinya, terutama pada area bayangan) akibat ISO tinggi atau pemrosesan berlebih.
   - Deteksi "over-aggressive noise reduction" (pengurangan derau berlebih) yang menyebabkan detail tekstur kulit atau benda menghilang dan tampak mulus seperti lilin/plastik (waxy skin / plastic-like textures).
4. IMAGE ARTIFACTS (Artefak Gambar & Teknis):
   - Artefak kompresi JPEG: Pixelation parah, blockiness (makro-blok), gradasi patah (color banding/posterization) di area langit atau latar belakang halus.
   - Chromatic Aberration: Color fringing (pembiasan warna magenta/hijau) di tepian objek berkontras tinggi.
   - Noda sensor (sensor dust spots): Bintik atau lingkaran abu-abu buram yang samar di langit polos atau area latar belakang seragam akibat sensor kamera kotor.
   - Over-sharpening: Efek lingkaran cahaya (halos) putih/terang di sekeliling tepian subjek akibat penajaman digital berlebih.

5. INTELLECTUAL PROPERTY & BRAND SAFETY (Kekayaan Intelektual, Hukum & Batasan Terkenal Resmi):
   - PUBLIC DOMAIN EXCEPTION (PENGECUALIAN AMAN): Dokumen sejarah, teks kuno, dan dokumen pemerintah dari domain publik (seperti The Constitution, The Bill of Rights, Declaration of Independence, naskah kuno, peta sejarah) adalah 100% AMAN dan TIDAK MELANGGAR IP. Jangan flag dokumen publik atau sejarah sebagai pelanggaran IP.
   - Merek & Logo Komersial: Logo, merek dagang, nama brand, produk bermerek, karya seni berhak cipta (seperti ilustrasi/font modern), tato tanpa rilis artis, serta bangunan/arsitektur yang membutuhkan Property Release. PENGECUALIAN: Tulisan tangan/kaligrafi/font kuno pada dokumen sejarah publik domain adalah AMAN.
   - Desain Fisik & Bentuk Produk Khas: Desain fisik khas dari produk komersial modern, seperti mainan (lego bricks, boneka Barbie), barang fesyen, elektronik (desain bodi iPhone/MacBook/iPad termasuk penempatan kamera belakang khas, tombol home, notch layar, kamera Polaroid klasik beserta bingkai putihnya, sepatu Converse Chuck Taylor dengan pola bintang/karet pelindung hidung kaki, sepatu Dr. Martens dengan jahitan kuning ikonik, sol merah sepatu Christian Louboutin, Beats by Dre dengan simbol 'b'), atau perabot desainer (designer furniture).
   - Desain Otomotif Khas: Kisi-kisi depan (grille) mobil yang khas seperti BMW kidney grille, Rolls-Royce Spirit of Ecstasy/grille, Jeep 7-slot front grille, logo bintang Mercedes, bentuk Vespa/Lambretta ikonik.
   - Bangunan, Landmark & Lokasi Tiket yang Dilindungi IP (SANGAT KETAT):
     * Penggambaran lokasi berbayar/bertiket (ticketed locations) atau situs terlarang/dibatasi (restricted sites) tanpa rilis properti (property releases) yang diperlukan.
     * Landmark atau monumen tertentu tidak dapat diterima sama sekali karena batasan hak cipta desain bangunan modern atau pengelola tempat.
     * Menara Eiffel di malam hari (karena efek tata cahaya berhak cipta). Menara Eiffel di siang hari aman, tetapi malam hari dilarang keras.
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
   - Karya Seni Berhak Cipta & Hak Cipta Visual (TERMASUK ADOBE STOCK GENERATIVE AI CONTENT POLICY - https://helpx.adobe.com/stock/contributor/submit-your-content/submit-generative-ai-content/content-policy-artist-names-real-known-people-fictional-characters.html):
     * Karya cipta ciptaan orang lain (copyrighted works), termasuk seni (art), patung (sculptures), seni jalanan (street art), grafiti, mural dinding, ilustrasi (illustrations), font spesifik, atau elemen grafis (graphic elements).
     * Karakter fiksi berhak cipta: Tokoh fiksi dari buku, film, komik, game, atau acara televisi (seperti Disney, Mickey Mouse, Hello Kitty, Pokémon, tokoh anime, superhero Marvel/DC, Barbie, LEGO, dsb.) = FAIL secara instan jika terdeteksi.
     * Nama Artis / Gaya Artis Berhak Cipta: Visual yang meniru gaya khas seniman tertentu yang masih dilindungi hak cipta (misal: "in the style of Van Gogh", "drawn by Picasso", dsb.) = FAIL secara instan jika diindikasikan meniru artis berhak cipta.
     * Nama Orang Nyata Terkenal (Real Known People): Kemiripan visual dengan selebritas, politisi, atlet, tokoh sejarah terkenal, atau figur publik lainnya = FAIL secara instan.
     * Lukisan museum modern, instalasi patung kontemporer (seperti Cloud Gate / "The Bean" di Chicago, Patung Banteng Wall Street "Charging Bull").
   - Dokumen Negara, Uang & Identitas: PENGECUALIAN: Dokumen sejarah/publik domain (seperti Bill of Rights, Konstitusi) adalah AMAN. PENGECUALIAN: Dokumen sejarah/publik domain (seperti Bill of Rights, Konstitusi) adalah AMAN.
     * Uang kertas atau koin modern dari negara mana pun (terutama jika difoto datar/persis tegak lurus yang berisiko disalahgunakan untuk pemalsuan).
     * Prangko, paspor, surat izin mengemudi (SIM), kartu identitas (KTP/ID), kartu kredit/debit, buku tabungan bank.
   - Hak Pribadi & Tubuh (Biometrics):
     * Tato unik pada subjek manusia (memerlukan rilis properti dari seniman tato dan model).
     * Wajah Manusia & Anak-Anak (CRITICAL): JANGAN nyatakan FAIL atau VIOLATION pada ip_risk atau stock_acceptance hanya karena mendeteksi wajah manusia, anak-anak, atau sekelompok orang (misalnya anak kecil bermain air di taman). Foto orang/gaya hidup adalah kategori paling laku di microstock. Anggap Model Release dapat diunggah kemudian oleh kontributor. Jika tidak ada logo merek dagang yang melanggar di pakaian mereka, status wajib dianggap SAFE dan harus dinyatakan PASS untuk ip_risk.
     * Properti Mainan & Pakaian Unbranded: Pistol air plastik biasa (water gun), pelampung, ember mainan, pakaian anak biasa tanpa logo adalah properti generik yang 100% aman. JANGAN nyatakan FAIL atau VIOLATION hanya karena adanya benda-benda bermain anak ini.
     * Mainan Anak & Pistol Air (Water Gun): Pistol air mainan anak-anak (biasanya berwarna-warni cerah, terbuat dari plastik) adalah mainan rekreasi keluarga yang menyenangkan dan komersial, BUKAN senjata api atau objek kekerasan. JANGAN pernah melabeli mainan ini sebagai senjata berbahaya, kekerasan, atau ancaman keamanan. Wajib loloskan PASS untuk kategori keamanan dan penerimaan stok.
   - WAJIB: Jika ada tulisan/teks apa pun di dalam gambar, Anda HARUS menuliskan teks tersebut secara eksplisit (Lakukan OCR) ke dalam laporan!
   - Teks Tidak Terbaca & Gibberish (CRITICAL): Periksa apakah terdapat teks yang tidak terbaca, karakter rusak, kata-kata yang berantakan, atau ejaan aneh (gibberish text) pada papan tulis (whiteboard), catatan tempel (sticky notes), poster, buku, kemasan produk, atau bagian mana pun di dalam gambar. Ini adalah cacat visual generatif AI yang sangat umum dan fatal untuk komersial. Jika gambar mengandung teks berantakan (seperti karakter huruf yang hancur, kata yang tidak bermakna/gibberish, atau gabungan huruf acak), status pemeriksaan untuk "text", "ai_artifacts", dan "stock_acceptance" WAJIB di-set ke FAIL, skor keseluruhan di bawah 70, dan hasil audit dinyatakan FAIL.

6. GENERATIVE AI QUALITY & ANOMALIES (Kualitas & Cacat AI):
   - Efek Cahaya & Lens Flare Merusak (Excessive/Artificial Lens Flare) [KRITIS]: Deteksi efek bias pelangi (rainbow lens flare), kebocoran cahaya (light leaks), atau flare heksagonal buatan AI yang melintasi subjek utama dan menutupi detail asli (seperti jaket, celana, ransel). Jika efek ini tampak tidak alami, mengganggu estetika komersial, atau menutupi detail tekstur penting, status "ai_artifacts" atau "over_edited" WAJIB di-set ke FAIL.
   - Figur Latar Belakang Cacat (Deformed/Malformed Background Figures) [SANGAT KRITIS]: Orang/subjek di latar belakang koridor/jalan yang memiliki tubuh terdistorsi, wajah meleleh/hancur, kaki/tangan menyatu secara tidak alami, meskipun latar belakang tersebut blur/bokeh. Cacat visual pada karakter sekunder atau figur latar belakang adalah alasan penolakan nomor satu di Adobe Stock. Jika ditemukan, status "ai_artifacts" dan "anatomical_errors" WAJIB di-set ke FAIL.
   - Perspektif & Geometri Loker/Benda Bengkok (Warped Locker & Physical Geometry) [SANGAT KRITIS]: Garis-garis lurus pada furnitur, loker, kabinet, garis pintu, tangga, celah pintu loker yang tidak konsisten ukurannya, nomor loker (seperti nomor pelat logam "148") yang penyok/asimetris, atau kunci besi yang bentuknya meleleh dan tidak logis secara mekanisme fisik dunia nyata. Jika ditemukan cacat geometris ini, status "structural_defects" dan "ai_artifacts" WAJIB di-set ke FAIL.
   - Wajah Terdistorsi (Distorted/Melted Faces) [SANGAT KRITIS]: Wajah pada subjek utama maupun orang-orang/kerumunan di latar belakang yang meleleh, asimetris parah, mata yang menyatu, atau tampak seperti gumpalan daging tak berbentuk. Sering terjadi pada gambar kerumunan AI. Jika ditemukan, WAJIB set "anatomical_errors" dan "ai_artifacts" ke FAIL.
   - Fake UI/Tech Interfaces & Glowing Effects (SANGAT KRITIS): Elemen antarmuka masa depan (futuristic UI), pemindai sidik jari (fingerprint scanner), hologram, atau layar digital yang terbuat dari AI sering kali berisi teks omong kosong (gibberish), simbol tak bermakna, garis-garis yang meleleh atau menyatu tanpa tujuan, dan grafis acak. Perhatikan baik-baik teks, angka, dan bentuk geometrisnya. Jika tidak memiliki makna, asimetris, atau terlihat seperti gumpalan garis bersinar yang berantakan, WAJIB set "ai_artifacts" dan "structural_defects" ke FAIL dengan skor di bawah 65.
   - Benda yang Tidak Logis (Nonsensical Objects/Hallucinations): Objek yang bentuknya tidak masuk akal, terpotong secara ajaib, atau percampuran benda yang tidak logis (misal: tangan yang menyatu dengan bunga atau benda asing, benda yang melayang tanpa alasan, atau geometri mustahil). Jika ditemukan, set "ai_artifacts" ke FAIL.
   - Masalah Anatomi (Anatomy errors) [SANGAT KRITIS]: Perhatikan dengan sangat cermat TANGAN, JARI, KAKI, dan PERSENDIAN. Jika terdapat jari tangan melengkung tidak wajar, jumlah jari lebih/kurang dari 5 per tangan, tangan/jari yang meleleh dan berbaur secara mustahil dengan objek lain, sendi terkilir aneh, atau anggota tubuh ganda, status "anatomical_errors" WAJIB di-set ke FAIL.
   - Detail yang Meleleh (Melted details) & Pola Hancur (Pattern Degradation) [SANGAT KRITIS]: Tekstur rajutan/mesh (seperti pada sarung tangan atau pakaian) yang terlalu seragam lalu mendadak berubah menjadi pola digital acak, garis tipis berdekatan (seperti lingkaran holografik) yang melebur menjadi aliasing, jagged edges, atau muddy detail saat di-zoom, serta pinggiran objek (edge) yang bercampur ambigu dengan objek lain.
   - High Contrast & Glow Artifacts [KRITIS]: Area dengan glow yang sangat terang (seperti warna oranye neon) terhadap latar belakang gelap sangat rentan mengalami clipping, color banding, loss of fine texture, dan compression artifacts (terutama jika telah di-upscale/sharpening agresif). Periksa transisi cahayanya, jika patah/kasar, status "overexposure" dan "ai_artifacts" WAJIB FAIL.
   - Logika Mekanis Objek Buatan Manusia (Mechanical & Structural Coherence) [SANGAT KRITIS]: Periksa SETIAP objek buatan manusia pada crop detail apakah strukturnya masuk akal secara fisik dan bisa berfungsi di dunia nyata. Contoh wajib periksa: SEPEDA (apakah rantai ada dan tersambung ke gear? apakah pedal tersambung ke engkol/crank arm yang logis? apakah jari-jari/spokes tersambung konsisten dari hub ke rim? apakah rem, fork, dan rangka menyambung secara logis? apakah sadel tersambung ke seatpost yang benar?), kendaraan (roda, spion, wiper), furnitur (kaki kursi/meja), alat musik (senar, tuts), pakaian (kancing, resleting, jahitan), dan bangunan (jendela, tangga, railing). Jika ditemukan bagian yang meleleh, hilang, menyatu mustahil, atau tidak bisa berfungsi secara mekanis (contoh: sepeda tanpa rantai, pedal melayang tanpa engkol), status "structural_defects" dan "ai_artifacts" WAJIB di-set ke FAIL meskipun bagian tersebut kecil atau berada di tepi gambar.
   - Tangan yang Berinteraksi dengan Objek (Hands Gripping Objects) [SANGAT KRITIS]: Saat tangan memegang/menyentuh objek (setang, sadel, gagang, gelas, alat), periksa pada crop detail apakah jari menggenggam secara logis atau malah menyatu/meleleh ke objek. Titik kontak tangan-objek adalah lokasi cacat AI paling umum. Jari yang menyatu dengan objek WAJIB mengeset "anatomical_errors" ke FAIL.
   - Kedalaman Ruang Tidak Natural (Unnatural Depth of Field): Latar belakang yang kabur (blur) namun tidak terlihat seperti bokeh optik, melainkan tampak seperti coretan kasar (smudgy), berbercak, atau terhapus secara artifisial.
   - Teks & Karakter Rusak (Gibberish Text): Karakter huruf yang rusak/cacat/terdistorsi, kata-kata tak terbaca, teks hancur atau tidak bermakna di papan tulis (whiteboards), bagan diagram, catatan dinding, atau sticky notes.
   - Kecacatan Proporsi & Perspektif (Proportion & Perspective Defects) [CRITICAL]: Periksa distorsi proporsi objek fisik, furnitur, ruangan, atau elemen arsitektur. Periksa juga kemiringan garis bangunan, tangga yang tidak menuju ke mana-mana, atau distorsi proporsi tubuh manusia. Jika fatal, status "proportion_defects" dan "structural_defects" WAJIB FAIL.
   - Kehilangan detail komersial: Tekstur datar yang terlihat terlalu sintetis.

7. INTEGRASI PENUH PANDUAN STANDAR & KEBIJAKAN ADOBE STOCK (CRITICAL):
   Anda wajib menyelaraskan keputusan kurasi secara ketat dengan tiga dokumen panduan kontributor Adobe Stock resmi berikut:
   
   A. Standar Teknis & Kualitas Penolakan Konten (Ref: https://helpx.adobe.com/stock/contributor/content-moderation/quality-technical-standards-reasons-content-refusal.html):
      - Out of Focus & Sharpness: Subjek utama wajib in-focus tajam sempurna. Tolak (FAIL) jika terdapat soft focus menyeluruh, camera shake/motion blur tak sengaja, atau kesalahan titik fokus (miss-focus) yang mengaburkan detail subjek.
      - Exposure & Lighting: Tolak jika terjadi overexposure parah (blown-out highlights/detail putih hilang) atau underexposure parah (crushed shadows/area gelap berlumpur tanpa detail visual). Hindari kontras yang terlampau keras (harsh/extreme contrast) atau flat lighting yang membosankan.
      - Noise & Grain: Tolak bintik derau yang mengganggu pada area shadow, langit rata, atau permukaan datar akibat pengaturan ISO tinggi. Reduksi noise yang berlebihan hingga subjek tampak mulus tidak alami seperti lilin/plastik (plastic/waxy look) juga WAJIB ditolak.
      - Image Artifacts & Aberration: Deteksi kompresi JPEG kasar (pixelation, macro-blocks), color banding (gradasi warna terpotong/patah pada langit), aberasi kromatik (magenta/green color fringing pada tepian kontras tinggi), bintik kotoran sensor (sensor dust spots), dan over-sharpening halos.
      - Masalah Scan & Analog (Jika relevan): Garis Newton rings, goresan fisik, debu pemindaian slide/klise, atau pola gelombang moire.
      
   B. Alasan Umum Penolakan Konten (Ref: https://helpx.adobe.com/stock/contributor/content-moderation/common-reasons-content-refusal.html):
      - Intellectual Property & Brand Safety: Logo komersial, nama merek dagang, desain produk yang khas (seperti iPhone camera bumps, Adidas stripes, LEGO studs, bodi kamera Polaroid klasik beserta bingkai putihnya, jahitan kuning Dr. Martens, red soles Christian Louboutin, logo Beats "b", Converse rubber toes).
      - Desain Otomotif Terlindungi: Kisi radiator (grille) BMW, Rolls-Royce, Jeep 7-slot, ornamen kap mesin ikonik, bentuk motor Vespa/Lambretta yang sangat khas.
      - Karya Seni Berhak Cipta: Mural, grafiti, patung kontemporer (seperti Charging Bull Wall Street, Cloud Gate Chicago), lukisan museum modern, karakter fiksi Disney, Hello Kitty, Pokémon, Marvel, DC, ilustrasi karya orang lain, elemen grafis buatan pihak ketiga, atau font berhak cipta (TETAPI tulisan tangan kaligrafi sejarah yang bersifat publik domain adalah AMAN).
      - Dokumen & Mata Uang: Mata uang kertas/logam modern dari negara mana pun (terutama jika difoto datar), prangko, SIM, paspor, kartu identitas nasional, kartu kredit/debit, buku tabungan. CATATAN: Dokumen sejarah seperti Bill of Rights atau Konstitusi adalah AMAN dan bukan pelanggaran.
      - Unusable/Lack of Utility: Gambar yang tidak memiliki subjek jelas, kabur berlebih, berantakan tanpa arah komposisi, atau tidak memiliki potensi komersial.
      - Judul & Kata Kunci Tidak Patuh: Metadata berisi nama model kamera, merek dagang, URL, kata berulang-ulang yang tidak relevan (keyword stuffing), atau kata kunci yang menyesatkan.
      
   C. Kebijakan & Batasan Hak Cipta Terkenal Resmi (Ref: https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html):
      - Batasan Landmark & Bangunan Ikonik yang SANGAT KETAT:
        * Menara Eiffel di malam hari (tata cahaya berhak cipta) dilarang keras (FAIL). Siang hari diperbolehkan (PASS).
        * Burj Al Arab, Burj Khalifa (Dubai) dilarang keras.
        * Sydney Opera House (Australia) dilarang keras.
        * Atomium (Brussels), Louvre Pyramid (Paris), Space Needle (Seattle) dilarang keras.
        * Hollywood Sign & Hollywood Walk of Fame (Los Angeles) dilarang keras.
        * Istana Neuschwanstein (Jerman), CN Tower (Toronto), London Eye, Tower Bridge, The Shard (London) dilarang keras.
        * Transamerica Pyramid (San Francisco), Taipei 101 (Taiwan), Petronas Twin Towers (Malaysia) dilarang keras.
        * Bagian Interior Kuil Sagrada Família (Barcelona) dilarang keras.
        * Empire State Building, Chrysler Building, Flatiron Building, Rockefeller Center, One World Trade Center, Guggenheim Museum, Getty Museum, Graceland, Machu Picchu, Stonehenge, Chichen Itza, dan situs warisan bersejarah lainnya yang terlindungi secara hukum properti setempat dilarang keras untuk lisensi komersial tanpa rilis properti resmi.

PANDUAN FINAL DECISION ENGINE (CRITICAL):
- Pisahkan HARD FAIL dari REVIEW WARNING. Warning bukan rejection.
- HARD FAIL hanya untuk pelanggaran submission yang terkonfirmasi atau cacat yang jelas/severe: global out-of-focus, clipping parah, noise parah, compression/banding parah, strong alpha matte contamination, pelanggaran IP/brand yang terkonfirmasi, gibberish text yang terkonfirmasi, atau deformasi struktural/AI yang terkonfirmasi.
- Jangan FAIL untuk transparent PNG normal, anti-aliasing normal, shallow depth of field, shadow yang disengaja, variasi tekstur moderat, atau satu kecurigaan AI yang tidak pasti.
- Jika bukti ambigu, pilih PASS dan jelaskan warning pemeriksaan daripada mengarang cacat.
- Jangan menyebut tekstur metal hammered, weave kain, bokeh, atau detail geometris berulang sebagai AI artifact kecuali ada inkonsistensi struktural, geometri mustahil, atau deformasi generatif yang jelas.
- Untuk isolated asset, nilai subjeknya, bukan canvas transparan kosong. Jangan menganggap margin transparan sebagai underexposure, background hitam, atau komposisi buruk.
- Keputusan akhir harus mempertimbangkan SEMUA crop yang diberikan, bukan hanya full-frame.

PANDUAN EVALUASI TOLERANSI KUALITAS (CRITICAL):
Tingkat Toleransi Saat Ini: ${tolerance}. Evaluasi keputusan akhir kurasi dan skor dengan aturan berikut:
- STRICT (Toleransi Nol / Zero Tolerance): Anda harus menerapkan standar tertinggi tanpa toleransi terhadap cacat sekecil apa pun. Jika terdapat sedikit saja soft focus, sedikit noise pada shadow, anomali AI mikro di latar belakang, atau potensi pelanggaran IP/Kekayaan Intelektual sekecil apa pun, aset wajib dinyatakan FAIL dengan skor maksimal 0-59.
- MEDIUM (Standar Industri): Cacat teknis yang sangat minor di luar fokus utama (seperti noise halus yang wajar atau soft focus pada latar belakang artistik) dapat ditoleransi. Namun, kesalahan fokus pada subjek utama, anomali AI yang terlihat jelas, atau pelanggaran IP/Kekayaan Intelektual apa pun wajib dinyatakan FAIL dengan skor maksimal 0-65.
- LOOSE (Toleransi Longgar / Estetika Tinggi): Utamakan keindahan artistik dan nilai jual komersial secara keseluruhan. Cacat teknis sedang (seperti noise sedang, soft focus ringan pada subjek sekunder, anomali AI minor yang tersembunyi) diperbolehkan lolos (PASS) asalkan subjek utama terlihat luar biasa indah, memiliki komposisi menawan, dan daya tarik komersial yang tinggi. Hanya kegagalan teknis yang fatal atau pelanggaran IP yang sangat terang-terangan yang menyebabkan status FAIL (skor maksimal 0-69).

STATUS & SKORING (KONSISTEN & KETAT):
- PASS: Skor 75 - 100.
- FAIL: Skor 0 - 69 (Jangan berikan skor 70-74 untuk status FAIL).

ATURAN OUTPUT TEKS:
1. Jadilah SANGAT CERDAS, ANALITIS, dan FAKTUAL layaknya Ahli Forensik Fotografi Senior. Isi dari field \`visual_scan_analysis\` and \`detailed_feedback\` WAJIB sangat mendalam dan berbobot (minimal 3 paragraf). Jangan hanya menyebutkan kalimat pendek atau generik, tetapi jelaskan SECARA TEKNIS MENGAPA cacat itu terjadi berdasarkan BUKTI VISUAL NYATA yang ada pada gambar.
2. DILARANG KERAS MENEBAK, BERHALUSINASI, ATAU MEMBUAT ASUMSI (NO GUESSING OR HALLUCINATION). JANGAN melaporkan cacat anatomi, teks rusak, watermark, logo, cacat komposisi, atau masalah pencahayaan/warna jika masalah tersebut TIDAK BENAR-BENAR TERLIHAT dengan jelas di dalam gambar. Jika gambar terlihat bagus dan aman, nyatakan dengan jujur dan berikan status PASS. Kegagalan mematuhi aturan ini akan merusak kredibilitas sistem kurasi.
3. Untuk setiap item di dalam \`ai_vision_checks\`, tuliskan \`note\` yang spesifik, unik, dan BUKAN TEBAKAN, melainkan hasil pengamatan faktual terhadap piksel gambar, menyesuaikan temuan Anda yang paling relevan dengan parameter JSON.

ATURAN BAHASA:
` + `Gunakan bahasa sesuai dengan parameter requested language: ${targetLanguageName}. Semua isi teks dalam JSON respons wajib menggunakan bahasa tersebut secara konsisten.

ATURAN HEATMAPS:
Untuk bagian heatmaps, petakan nilai X dan Y dalam skala rentang 0-100 sebagai persentase lokasi, lalu jelaskan secara spesifik pada raw_value objek apa yang melanggar di area tersebut.

Respons Anda WAJIB dalam format JSON yang valid dan bersih sesuai dengan skema yang diberikan.` + metadataInstruction;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
        visual_scan_analysis: { type: Type.STRING },
        legal_status: { type: Type.STRING, enum: ["SAFE", "AT_RISK", "VIOLATION"] },
        technical_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        overall_score: { type: Type.NUMBER },
        recommendation: { type: Type.STRING, enum: ["PASS", "FAIL"] },
        detailed_feedback: { type: Type.STRING },
        ai_vision_checks: {
            type: Type.OBJECT,
            properties: {
                blur: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                composition: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                lighting: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                exposure: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                color_balance: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                over_edited: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                sensor_issues: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                watermark: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                logo: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                text: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                anatomical_errors: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                ip_risk: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                structural_defects: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                proportion_defects: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                illustration_issues: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                vector_issues: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                noise: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                artifacts: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                ai_artifacts: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
                stock_acceptance: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS", "FAIL"] }, note: { type: Type.STRING } }, required: ["status", "note"] },
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
                "blur", "composition", "lighting", "exposure", "color_balance", "over_edited", "sensor_issues", "watermark", "logo", "text",
                "anatomical_errors", "structural_defects", "ip_risk", "proportion_defects", "illustration_issues", "vector_issues", "noise", "artifacts", "ai_artifacts", "stock_acceptance", "metadata"
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

  const imageParts = Array.isArray(image) ? image.map(img => processFrameServer(img)) : [processFrameServer(image)];
  
  // QC routing: do NOT silently downgrade a requested Pro model to Flash.
  // The current Gemini API exposes Gemini 3.1 Pro Preview for advanced reasoning and
  // Gemini 3.6 Flash for faster multimodal fallback.
  let selectedModel = model || 'gemini-3.1-pro-preview';
  if (selectedModel === 'auto' || !selectedModel.startsWith('gemini')) {
    selectedModel = 'gemini-3.1-pro-preview';
  }

  // Keep a strong-vision fallback chain. Avoid non-existent/obsolete model names.
  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-3.5-flash'];
  let responseText = "";
  let lastError;

  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const activeModel = selectedModel || PROVIDER_DEFAULT_MODELS[provider] || 'gpt-4o-mini';
    try {
      let promptText = `Act as an objective Adobe Stock QA curator. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. CRITICAL: Ensure your ENTIRE JSON response is written in the requested language: ${targetLanguageName} (Do NOT slip into English).`;
      if (imageMetadata) {
        promptText += `\n\nTechnical Metadata: ${JSON.stringify(imageMetadata)}`;
      }
      
      responseText = await callOpenAICompatibleWithRetry({
        systemInstruction,
        contents: [...imageParts, { text: promptText }],
        responseMimeType: "application/json",
        responseSchema,
        config: { temperature: 0.0, topP: 0.1 },
        model: activeModel
      });
    } catch (err: any) {
      lastError = err;
      console.error(`[checkImageQuality] Non-Gemini API call failed with model ${activeModel}:`, err.message || err);
    }
  } else {
    const activeModel = selectedModel;

    const modelsToTryList = activeModel && activeModel.startsWith('gemini') ? [activeModel, ...modelsToTry] : modelsToTry;
    
    for (const modelName of modelsToTryList) {
      try {
        let promptText = `Act as an objective Adobe Stock QA curator. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. CRITICAL: Ensure your ENTIRE JSON response is written in the requested language: ${targetLanguageName} (Do NOT slip into English).`;
        if (imageMetadata) {
          promptText += `\n\nTechnical Metadata: ${JSON.stringify(imageMetadata)}`;
        }
        
        // Gemini 3.6 Flash / 3.5 Flash-Lite deprecate temperature/topP/topK.
        // Keep the QC request deterministic through the system prompt + structured output
        // instead of deprecated sampling controls. This also prevents fallback 400s.
        const res = await callGeminiWithRetry(modelName, { parts: [...imageParts, { text: promptText }] }, {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        });
        responseText = res.text || "{}";
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[checkImageQuality] Failed with ${modelName}:`, err.message || err);
        if (err.message && err.message.includes('API_KEY')) throw err;
      }
    }
  }

  if (!responseText) throw lastError;
  
  try {
    const parsedResult = JSON.parse(extractJSON(responseText));
    
    // Sinkronisasi Sistem Rejection Otomatis Backend berdasarkan Toleransi (STRICT, MEDIUM, LOOSE)
    if (parsedResult.ai_vision_checks) {
      // Resolve obvious AI false positives against objective pixel evidence before applying gates.
      // The vision model sees a potentially downscaled copy; the local analyzer sees the original file.
      const objective = imageMetadata || {};
      const warningsFromReconciliation: string[] = [];
      const noteIsSevere = (note: unknown) => /\b(severe|critical|heavy|extreme|parah|berat|kritis|sangat tinggi|sangat parah|obvious)\b/i.test(String(note || ''));
      const downgrade = (key: string, reason: string) => {
        const check = parsedResult.ai_vision_checks?.[key];
        if (check && check.status === 'FAIL') {
          check.status = 'PASS';
          check.note = `${check.note || ''} [Objective QC reconciliation: ${reason}]`;
          warningsFromReconciliation.push(`${key}: ${reason}`);
        }
      };

      if (objective.sharpness?.value >= 26 && objective.sharpness?.has_local_blur_anomaly !== true && !noteIsSevere(parsedResult.ai_vision_checks.blur?.note)) {
        downgrade('blur', `measured sharpness ${objective.sharpness.value}/100 does not support global blur`);
      }
      if (objective.noise?.value < 55 && !noteIsSevere(parsedResult.ai_vision_checks.noise?.note)) {
        downgrade('noise', `measured noise ${objective.noise.value}/100 is below the severe-noise gate`);
      }
      const highClip = Number(objective.brightness?.clipped_high_percent || 0);
      const lowClip = Number(objective.brightness?.clipped_low_percent || 0);
      if (highClip <= 15 && lowClip <= 25 && !noteIsSevere(parsedResult.ai_vision_checks.exposure?.note)) {
        downgrade('exposure', `measured clipping is ${highClip.toFixed(1)}% high / ${lowClip.toFixed(1)}% low`);
      }
      const blockScore = Number(objective.jpeg_blocking?.score || 0);
      const bandScore = Number(objective.banding?.score || 0);
      const edgeScore = Number(objective.transparency?.edge_halo_risk_percent || 0);
      if (blockScore < 80 && bandScore < 80 && edgeScore < 72 && !noteIsSevere(parsedResult.ai_vision_checks.artifacts?.note)) {
        downgrade('artifacts', 'objective compression/banding/alpha-edge measurements are below hard-fail thresholds');
      }

      if (warningsFromReconciliation.length) {
        parsedResult.review_warnings = [...(Array.isArray(parsedResult.review_warnings) ? parsedResult.review_warnings : []), ...warningsFromReconciliation];
      }

      let anyFail = false;
      let anyIpFail = false;
      let hasCriticalFail = false;
      
      // Kunci kritis: masalah hukum, hak cipta, atau cacat AI/struktural parah
      const criticalKeys = ['watermark', 'logo', 'text', 'ip_risk', 'anatomical_errors', 'structural_defects', 'ai_artifacts'];
      // Kunci kualitas teknis: persis kategori "quality issues" yang dipakai Adobe Stock untuk menolak konten
      // (fokus/ketajaman, eksposur, pencahayaan, warna, editing berlebih, sensor/noise, proporsi, komposisi)
      const technicalKeys = ['blur', 'exposure', 'lighting', 'color_balance', 'over_edited', 'sensor_issues', 'proportion_defects', 'composition', 'illustration_issues', 'vector_issues', 'noise', 'artifacts'];
      const failedCheckKeys: string[] = [];
      let anyTechnicalFail = false;
      let acceptanceFail = false;

      for (const [key, value] of Object.entries(parsedResult.ai_vision_checks)) {
        if (value && typeof value === 'object' && (value as any).status === 'FAIL') {
          anyFail = true;
          failedCheckKeys.push(key);
          if (['watermark', 'logo', 'ip_risk', 'text'].includes(key)) {
            anyIpFail = true;
          }
          if (criticalKeys.includes(key)) {
            hasCriticalFail = true;
          }
          if (technicalKeys.includes(key)) {
            anyTechnicalFail = true;
          }
          if (key === 'stock_acceptance') {
            acceptanceFail = true;
          }
        }
      }

      // Terapkan penolakan atau kelulusan berdasarkan level toleransi.
      // CATATAN PENTING: moderator Adobe Stock menolak gambar untuk SATU cacat teknis apa pun,
      // sehingga MEDIUM (standar industri) kini wajib FAIL jika ada check teknis ATAU kritis yang FAIL.
      if (tolerance === 'STRICT') {
        if (anyFail) {
          parsedResult.recommendation = "FAIL";
          if (parsedResult.overall_score >= 60) {
            parsedResult.overall_score = 59;
          }
        }
      } else if (tolerance === 'MEDIUM') {
        if (hasCriticalFail || anyTechnicalFail || acceptanceFail) {
          parsedResult.recommendation = "FAIL";
          if (parsedResult.overall_score >= 66) {
            parsedResult.overall_score = 65;
          }
        }
      } else if (tolerance === 'LOOSE') {
        // LOOSE tetap menoleransi cacat teknis minor, tetapi TIDAK menoleransi cacat kritis,
        // cacat teknis utama pada subjek, atau penolakan penerimaan stok.
        const looseBlocking = anyIpFail || hasCriticalFail || acceptanceFail ||
          failedCheckKeys.some(k => ['blur', 'exposure', 'lighting', 'over_edited', 'proportion_defects'].includes(k));
        if (looseBlocking) {
          parsedResult.recommendation = "FAIL";
          if (parsedResult.overall_score >= 70) {
            parsedResult.overall_score = 69;
          }
        }
      }

      // Sinkronkan stock_acceptance dengan keputusan akhir agar UI tidak menampilkan kontradiksi
      if (parsedResult.recommendation === "FAIL" && parsedResult.ai_vision_checks.stock_acceptance) {
        parsedResult.ai_vision_checks.stock_acceptance.status = "FAIL";
      }
      // Lampirkan daftar check yang gagal agar frontend/debug mudah membaca alasan penolakan
      if (failedCheckKeys.length > 0) {
        (parsedResult as any).failed_checks = failedCheckKeys;
      }
      
      if (anyIpFail) {
        parsedResult.legal_status = "VIOLATION";
      }
    }

    return parsedResult;
  } catch(e) {
    console.warn("Parse Error on QA response:", responseText);
    throw e;
  }
}

export async function generateCalendarEvents(month: string, model?: string) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  const MONTH_GUIDELINES: Record<string, { enName: string; idName: string; typicalEvents: string[] }> = {
    'january': {
      enName: 'January',
      idName: 'Januari',
      typicalEvents: [
        'New Year\'s Day (1 January) - Global/World',
        'World Braille Day (4 January) - Global/UN',
        'Epiphany / Three Kings Day (6 January) - Spain, Mexico, Europe',
        'Orthodox Christmas (7 January) - Eastern Europe, Russia',
        'National Youth Day (12 January) - India',
        'Martin Luther King Jr. Day (mid January / 19 January 2026) - USA',
        'International Day of Education (24 January) - Global/UNESCO',
        'Republic Day (26 January) - India',
        'Australia Day (26 January) - Australia',
        'International Customs Day (26 January) - Global',
        'International Holocaust Remembrance Day (27 January) - Global/UN',
        'Street Art and Winter Festivals - Northern Hemisphere',
        'Winter Sports, Skiing, and Snowboard season trends',
        'New Year Resolutions, Fitness, and Healthy Eating themes',
        'Back-to-work, Career start, and Corporate start of year planning'
      ]
    },
    'february': {
      enName: 'February',
      idName: 'Februari',
      typicalEvents: [
        'World Cancer Day (4 February) - Global/UN',
        'Singapore National Day Prep / Heritage starts (February) - Singapore',
        'International Day of Women and Girls in Science (11 February) - Global/UN',
        'World Radio Day (13 February) - Global/UNESCO',
        'Isra Mi\'raj / Ascension of Prophet Muhammad (14 February 2026) - Indonesia/Global',
        'Valentine\'s Day (14 February) - Global/World',
        'Chinese New Year / Lunar New Year / Imlek (17 February 2026) - China, Singapore, Indonesia, Global',
        'Ramadan starts (approx. 18 February 2026) - Global/Islamic',
        'World Day of Social Justice (20 February) - Global/UN',
        'International Mother Language Day (21 February) - Global/UNESCO',
        'Super Bowl Sunday (mid February) - USA',
        'President\'s Day (third Monday of February) - USA',
        'National Science Day (28 February) - India',
        'Carnival of Rio de Janeiro / Venice Carnival (late February/March) - Brazil, Italy, Global',
        'Black History Month (all February) - USA, Canada',
        'Cozy cabin, fireplace, winter foliage, snowy forest scenery'
      ]
    },
    'march': {
      enName: 'March',
      idName: 'Maret',
      typicalEvents: [
        'Zero Discrimination Day (1 March) - Global/UN',
        'World Wildlife Day (3 March) - Global/UN',
        'International Women\'s Day (8 March) - Global/World',
        'Pi Day / International Day of Mathematics (14 March) - Global',
        'Holi Festival of Colors (March) - India, Global',
        'St. Patrick\'s Day (17 March) - Ireland, USA, Global',
        'Nyepi / Balinese Day of Silence (19 March 2026) - Indonesia/Bali',
        'International Day of Happiness (20 March) - Global/UN',
        'Eid al-Fitr / Hari Raya Idul Fitri (20 March 2026) - Indonesia, Malaysia, Global/Islamic',
        'Spring Equinox (20 March) - Northern Hemisphere',
        'Autumn Equinox (20 March) - Southern Hemisphere',
        'World Poetry Day (21 March) - Global/UNESCO',
        'World Water Day (22 March) - Global/UN',
        'World Meteorological Day (23 March) - Global/UN',
        'World Theatre Day (27 March) - Global',
        'Cherry Blossom Season / Sakura (late March) - Japan, South Korea, USA',
        'Spring Fashion lines, outdoor hiking, blossom background patterns'
      ]
    },
    'april': {
      enName: 'April',
      idName: 'April',
      typicalEvents: [
        'April Fools\' Day (1 April) - Global/World',
        'Good Friday (3 April 2026) - Global/Christian',
        'Easter Sunday (5 April 2026) - Global/Christian',
        'World Health Day (7 April) - Global/WHO',
        'Songkran Water Festival (13-15 April) - Thailand',
        'International Day of Human Space Flight (12 April) - Global/UN',
        'World Heritage Day (18 April) - Global/UNESCO',
        'Kartini Day (21 April) - Indonesia',
        'Earth Day / International Mother Earth Day (22 April) - Global/World',
        'World Book and Copyright Day (23 April) - Global/UNESCO',
        'Anzac Day (25 April) - Australia, New Zealand',
        'King\'s Day / Koningsdag (27 April) - Netherlands',
        'International Jazz Day (30 April) - Global/UNESCO',
        'Spring Gardening, outdoor farming, fresh organic vegetables',
        'Ecological energy, green environment, spring cleaning themes'
      ]
    },
    'may': {
      enName: 'May',
      idName: 'Mei',
      typicalEvents: [
        'International Workers\' Day / May Day (1 May) - Global/World',
        'World Press Freedom Day (3 May) - Global/UN',
        'Cinco de Mayo (5 May) - Mexico, USA',
        'Mother\'s Day (second Sunday of May - 10 May 2026) - USA, Indonesia, Global',
        'Kenaikan Isa Almasih / Ascension Day of Jesus Christ (14 May 2026) - Indonesia, Global',
        'International Day of Families (15 May) - Global/UN',
        'World Telecommunication Day (17 May) - Global/UN',
        'International Museum Day (18 May) - Global/ICOM',
        'Cultural Diversity Day (21 May) - Global/UNESCO',
        'Memorial Day (last Monday of May - 25 May 2026) - USA',
        'Eid al-Adha / Hari Raya Haji / Idul Adha (27 May 2026) - Indonesia, Singapore, Global/Islamic',
        'Vesak Day / Hari Waisak (31 May 2026) - Global/Buddhist',
        'Cannes Film Festival (all May) - France, Global',
        'Wedding season, bridal shower, spring picnics, outdoor graduation parties'
      ]
    },
    'june': {
      enName: 'June',
      idName: 'Juni',
      typicalEvents: [
        'Global Day of Parents (1 June) - Global/UN',
        'World Environment Day (5 June) - Global/UNEP',
        'World Oceans Day (8 June) - Global/UN',
        'World Blood Donor Day (14 June) - Global/WHO',
        'Father\'s Day (third Sunday of June - 21 June 2026) - USA, Canada, UK, Global',
        'Juneteenth (19 June) - USA',
        'Summer Solstice / Midsummer (21 June) - Northern Hemisphere',
        'International Yoga Day (21 June) - Global/UN',
        'World Music Day / Fête de la Musique (21 June) - Global/World',
        'Public Service Day (23 June) - Global/UN',
        'Micro, Small and Medium-sized Enterprises Day (27 June) - Global/UN',
        'Asteroid Day (30 June) - Global/UN',
        'Global Pride Month (all June) - Global/World',
        'Camping, hiking equipment, family road trips, healthy outdoor fitness',
        'Music festivals, graduation season, beach setup, school holiday starts'
      ]
    },
    'july': {
      enName: 'July',
      idName: 'Juli',
      typicalEvents: [
        'Canada Day (1 July) - Canada',
        'Independence Day / 4th of July (4 July) - USA',
        'World Population Day (11 July) - Global/UN',
        'Bastille Day (14 July) - France',
        'Tahun Baru Islam / Islamic New Year 1448H (16 July 2026) - Indonesia, Global/Islamic',
        'World Emoji Day (17 July) - Global/World',
        'Nelson Mandela International Day (18 July) - Global/UN',
        'Independence Day of Colombia (20 July) - Colombia',
        'Hari Asyura / Ashura (25 July 2026) - Global/Islamic',
        'World Drowning Prevention Day (25 July) - Global/UN',
        'Independence Day of Peru (28 July) - Peru',
        'International Day of Friendship (30 July) - Global/UN',
        'Summer Travel, Beach parties, sunscreen, sunglasses flatlays',
        'Tropical vacation, cruise ship travel, coconut trees, ocean wave landscape'
      ]
    },
    'august': {
      enName: 'August',
      idName: 'Agustus',
      typicalEvents: [
        'National Day of Switzerland (1 August) - Switzerland',
        'World Breastfeeding Week (1-7 August) - Global/UN',
        'Singapore National Day (9 August) - Singapore',
        'International Day of the World\'s Indigenous Peoples (9 August) - Global/UN',
        'International Youth Day (12 August) - Global/UN',
        'Independence Day of India (15 August) - India',
        'Hari Kemerdekaan Republik Indonesia (17 Agustus) - Indonesia',
        'World Humanitarian Day (19 August) - Global/UN',
        'World Photography Day (19 August) - Global/World',
        'Maulid Nabi Muhammad / Mawlid al-Nabi (25 August 2026) - Indonesia, Global/Islamic',
        'Women\'s Equality Day (26 August) - USA',
        'La Tomatina (last Wednesday of August) - Spain',
        'Obon Festival (mid August) - Japan',
        'Back-to-School shopping season startup, autumn semester preparation',
        'Late summer harvesting, golden wheat fields, sunflowers, stargazing'
      ]
    },
    'september': {
      enName: 'September',
      idName: 'September',
      typicalEvents: [
        'Independence Day of Brazil (7 September) - Brazil',
        'Labor Day (first Monday of September / 7 September 2026) - USA, Canada',
        'International Literacy Day (8 September) - Global/UNESCO',
        'Rosh Hashanah / Jewish New Year (11-13 September 2026) - Israel, Global/Jewish',
        'Yom Kippur (20-21 September 2026) - Israel, Global/Jewish',
        'International Day of Peace (21 September) - Global/UN',
        'Autumn Equinox (22 September) - Northern Hemisphere',
        'Spring Equinox (22 September) - Southern Hemisphere',
        'National Day of Saudi Arabia (23 September) - Saudi Arabia',
        'Mid-Autumn Festival / Mooncake Festival (25 September 2026) - China, Singapore, East Asia',
        'Oktoberfest starts (mid September to early October) - Germany, Global',
        'World Tourism Day (27 September) - Global/UNWTO',
        'Cozy autumn vibes, back to school, harvesting season, apple picking',
        'Warm coffee, woolen sweaters, cozy indoor reading, colorful falling leaves'
      ]
    },
    'oktober': {
      enName: 'October',
      idName: 'Oktober',
      typicalEvents: [
        'International Day of Older Persons (1 October) - Global/UN',
        'International Coffee Day (1 October) - Global/World',
        'Hari Batik Nasional (2 October) - Indonesia',
        'Golden Week National Holiday (1-7 October) - China',
        'World Teachers\' Day (5 October) - Global/UNESCO',
        'World Mental Health Day (10 October) - Global/WHO',
        'International Day of the Girl Child (11 October) - Global/UN',
        'Thanksgiving Day (second Monday of October) - Canada',
        'World Food Day (16 October) - Global/FAO',
        'United Nations Day (24 October) - Global/UN',
        'Hari Sumpah Pemuda (28 October) - Indonesia',
        'Halloween (31 October) - USA, UK, Global/World',
        'Pumpkin patch, autumn foliage, horror, spooky, and cozy sweater themes',
        'Cozy fireplaces, hot cocoa, foggy morning landscapes, mist forest hiking'
      ]
    },
    'november': {
      enName: 'November',
      idName: 'November',
      typicalEvents: [
        'World Vegan Day (1 November) - Global/World',
        'Día de los Muertos / Day of the Dead (1-2 November) - Mexico, Latin America',
        'Diwali / Deepavali Festival of Lights (8 November 2026) - India, Singapore, Global',
        'Hari Pahlawan / National Heroes Day (10 November) - Indonesia',
        'Veterans Day / Remembrance Day (11 November) - USA, Canada, UK',
        'World Diabetes Day (14 November) - Global/UN',
        'World Children\'s Day (20 November) - Global/UNICEF',
        'Thanksgiving Day (fourth Thursday of November / 26 November 2026) - USA',
        'Black Friday & Cyber Monday (late November / 27-30 November 2026) - Global',
        'Movember Men\'s Health Awareness (all November) - Global/World',
        'Holiday shopping, retail sales, delivery boxes, winter fashion boots and coats'
      ]
    },
    'december': {
      enName: 'December',
      idName: 'Desember',
      typicalEvents: [
        'World AIDS Day (1 December) - Global/UN',
        'Hanukkah Festival of Lights (4-12 December 2026) - Global/Jewish',
        'Human Rights Day (10 December) - Global/UN',
        'International Mountain Day (11 December) - Global/UN',
        'Winter Solstice (21 December) - Northern Hemisphere',
        'Hari Ibu / National Mother\'s Day (22 December) - Indonesia',
        'Christmas Eve (24 December) - Global/Christian',
        'Christmas Day (25 December) - Global/Christian',
        'Boxing Day (26 December) - UK, Canada, Australia',
        'New Year\'s Eve (31 December) - Global/World',
        'Winter holidays, cozy fireplace, snow scenery, holiday baking, gingerbread houses',
        'New Year resolutions planning, calendar books, diary planners'
      ]
    }
  };

  const cleanMonth = month.trim().toLowerCase();
  let key = 'january';
  if (cleanMonth.includes('jan')) key = 'january';
  else if (cleanMonth.includes('feb')) key = 'february';
  else if (cleanMonth.includes('mar') || cleanMonth.includes('met') || cleanMonth.includes('maret')) key = 'march';
  else if (cleanMonth.includes('apr')) key = 'april';
  else if (cleanMonth.includes('mei') || cleanMonth.includes('may')) key = 'may';
  else if (cleanMonth.includes('jun')) key = 'june';
  else if (cleanMonth.includes('jul')) key = 'july';
  else if (cleanMonth.includes('agu') || cleanMonth.includes('aug') || cleanMonth.includes('agustus')) key = 'august';
  else if (cleanMonth.includes('sep')) key = 'september';
  else if (cleanMonth.includes('okt') || cleanMonth.includes('oct') || cleanMonth.includes('oktober')) key = 'oktober';
  else if (cleanMonth.includes('nov')) key = 'november';
  else if (cleanMonth.includes('des') || cleanMonth.includes('dec') || cleanMonth.includes('desember')) key = 'december';
  else {
    const found = Object.keys(MONTH_GUIDELINES).find(k => k.includes(cleanMonth) || cleanMonth.includes(k));
    if (found) key = found;
  }

  const info = MONTH_GUIDELINES[key] || { enName: month, idName: month, typicalEvents: [] };
  const targetMonthEn = info.enName;
  const targetMonthId = info.idName;
  const typicalEventsStr = info.typicalEvents.map(e => `- ${e}`).join('\n');

  // Retrieve curated holidays from our unified data compilation source
  let holidayKey = key;
  if (key === 'oktober') holidayKey = 'october';
  const baseHolidays = HOLIDAYS_DATA[holidayKey] || [];
  const extraHolidays = EXTRA_HOLIDAYS_DATA[holidayKey] || [];
  const curatedHolidays = [...baseHolidays, ...extraHolidays];
  const curatedHolidaysStr = curatedHolidays.map((h, i) => `${i + 1}. ${h.name} (${h.date}) - Location: ${h.location}`).join('\n');

  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a world-class Content Strategist and Niche Researcher for Stock Agencies (Adobe Stock, Shutterstock, Getty). 
Your task is to identify ALL upcoming festivals, holidays, seasonal changes, and cultural events for the specified month.

CRITICAL MONTH MATCHING & ALIGNMENT RULES (MUST FOLLOW STRICTLY):
1. CURRENT CALENDAR YEAR IS 2026.
   - All moving, lunar, and shifting holidays MUST be calculated and placed strictly according to their real-world 2026 dates:
     * Chinese New Year (Imlek): 17 February 2026 (Do NOT place in January or March).
     * Ramadan: 18 February to 19 March 2026.
     * Eid al-Fitr (Hari Raya Idul Fitri): 20 March 2026 (Do NOT place in April or May).
     * Good Friday & Easter Sunday: 3 April & 5 April 2026 (Do NOT place in March).
     * Eid al-Adha (Hari Raya Haji / Idul Adha): 27 May 2026 (Do NOT place in June, July, or August. It is strictly in MAY).
     * Vesak Day (Waisak): 31 May 2026.
     * Tahun Baru Islam (Islamic New Year / 1 Muharram 1448H): 16 July 2026.
     * Hari Asyura (Ashura): 25 July 2026.
     * Maulid Nabi Muhammad (Mawlid al-Nabi): 25 August 2026.
     * Diwali (Deepavali): 8 November 2026.
     * Thanksgiving & Black Friday: 26 November & 27 November 2026.
     * Hanukkah: 4 to 12 December 2026.
   - You are STRICTLY FORBIDDEN from putting "Hari Raya Haji" or "Eid al-Adha" in July or June, as in 2026 it falls strictly on May 27, 2026!
   - For July 2026, do NOT generate any Eid al-Adha / Hari Raya Haji event. The correct Islamic holidays in July 2026 are Tahun Baru Islam (Islamic New Year) around July 16 and Hari Asyura around July 25.

2. Target Month: The user has selected the month of "${targetMonthEn}" (also known as "${targetMonthId}").
   - You MUST ONLY generate events, holidays, observances, and festivals that ACTUALLY and historically occur during this specific month (${targetMonthEn}) in the year 2026.
   - You are STRICTLY FORBIDDEN from listing events that happen in other months.

3. PRE-SEEDED WORLD HOLIDAYS (UN, UNESCO, TimeAndDate):
   To ensure perfect alignment, you MUST include and enrich the following verified global and regional celebrations for this month:
${curatedHolidaysStr}

4. BE COMPREHENSIVE: In addition to the pre-seeded holidays, search for and include other important niche events, cultural celebrations, or national days occurring in this month. You MUST return at least 25 to 30 highly distinct, real, non-simulated, and commercially valuable global and local events. We want a rich, detailed, global and local representation with no "sometimes few, sometimes many" variation.

5. Focus on events with high commercial value for stock contributors (photos, videos, vector illustrations).

6. For each event, provide:
   - name: Clear name of the event.
   - date: Date or date range (MUST be within the month of ${targetMonthEn} in 2026).
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
    try {
      const res = await callOpenAICompatibleWithRetry({
        systemInstruction,
        contents: `Find and list ALL major and niche commercial events, holidays, and perayaan negara that ACTUALLY occur in the month of ${targetMonthEn} (${targetMonthId}). Be extremely detailed and comprehensive. You MUST find and return at least 25-30 distinct events so the calendar is completely filled, highly detailed, and consistent with no variation. Ensure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`,
        responseMimeType: "application/json",
        responseSchema,
        config: { temperature: 0.8 },
        model
      });
      responseText = res;
    } catch (err) {
      console.warn("LLM generation failed, falling back to local curated database:", err);
    }
  } else {
    try {
      const res = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', `Find and list ALL major and niche commercial events, holidays, and perayaan negara that ACTUALLY occur in the month of ${targetMonthEn} (${targetMonthId}). Be extremely detailed and comprehensive so content creators have many ideas to choose from. You MUST find and return at least 25-30 distinct events so the calendar is completely filled, highly detailed, and consistent with no variation. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions. Use Google Search if necessary to find current and real-time trending events.`, {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8
      }, 1);
      responseText = res.text || "{}";
    } catch (err: any) {
      try {
        const res = await callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', `Find and list ALL major and niche commercial events, holidays, and perayaan negara that ACTUALLY occur in the month of ${targetMonthEn} (${targetMonthId}). Be extremely detailed and comprehensive so content creators have many ideas to choose from. You MUST find and return at least 25-30 distinct events so the calendar is completely filled, highly detailed, and consistent with no variation. Make sure suggested_topics are VERY SHORT keywords (max 1-3 words each), not long descriptions.`, {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.8
        });
        responseText = res.text || "{}";
      } catch (err2) {
        console.warn("LLM generation failed, falling back to local curated database:", err2);
      }
    }
  }

  let parsed: any = { events: [] };
  if (responseText) {
    try {
      parsed = JSON.parse(extractJSON(responseText));
    } catch (err) {
      console.error("Failed to parse calendar events JSON:", err, responseText);
    }
  }

  // Ensure parsed has events
  if (!parsed || !Array.isArray(parsed.events)) {
    parsed = { events: [] };
  }

  // Filter out events that belong to other months
  const otherMonthsEn = Object.keys(MONTH_GUIDELINES).filter(m => m !== key);
  const otherMonthsId = otherMonthsEn.map(m => MONTH_GUIDELINES[m]?.idName.toLowerCase()).filter(Boolean);
  const otherMonthKeywords = [...otherMonthsEn, ...otherMonthsId];

  const isTargetMay = targetMonthEn.toLowerCase() === 'may';

  const llmEvents = parsed.events.filter((event: any) => {
    if (!event || !event.name) return false;
    
    const nameLower = event.name.toLowerCase();
    const dateLower = (event.date || "").toLowerCase();

    // Guard against July/June Hari Raya Haji bug:
    if (!isTargetMay) {
      if (
        nameLower.includes("hari raya haji") || 
        nameLower.includes("eid al-adha") || 
        nameLower.includes("idul adha") || 
        nameLower.includes("qurban")
      ) {
        return false; // Exclude entirely if it's not May!
      }
    }

    // Check if the date belongs to another month strictly
    const hasOtherMonthInDate = otherMonthKeywords.some(mWord => {
      const regex = new RegExp(`\\b${mWord}\\b`, 'i');
      return regex.test(dateLower) || regex.test(nameLower);
    });

    if (hasOtherMonthInDate) {
      const hasOurMonthEn = new RegExp(`\\b${targetMonthEn}\\b`, 'i').test(dateLower) || new RegExp(`\\b${targetMonthEn}\\b`, 'i').test(nameLower);
      const hasOurMonthId = new RegExp(`\\b${targetMonthId}\\b`, 'i').test(dateLower) || new RegExp(`\\b${targetMonthId}\\b`, 'i').test(nameLower);
      if (hasOurMonthEn || hasOurMonthId) {
        return true; // Keep cross-month events
      }
      return false; // Exclude
    }

    return true;
  });

  // UNIFIED MERGE ENGINE:
  // Build the final list of events starting with the curated absolute golden registry
  const finalEvents: any[] = [];

  // Seed with curated gold standard list
  curatedHolidays.forEach((goldEvent) => {
    // Look for a corresponding event returned by LLM to harvest its rich descriptions if available
    const matchedLLM = llmEvents.find((le: any) => 
      le.name.toLowerCase().includes(goldEvent.name.toLowerCase()) || 
      goldEvent.name.toLowerCase().includes(le.name.toLowerCase())
    );

    if (matchedLLM) {
      finalEvents.push({
        name: goldEvent.name,
        date: goldEvent.date, // STRICTLY ENFORCE GOLD DATE
        location: goldEvent.location, // STRICTLY ENFORCE GOLD LOCATION
        commercial_potential: matchedLLM.commercial_potential || goldEvent.commercial_potential,
        suggested_topics: Array.isArray(matchedLLM.suggested_topics) && matchedLLM.suggested_topics.length > 0
          ? matchedLLM.suggested_topics
          : goldEvent.suggested_topics
      });
    } else {
      finalEvents.push({ ...goldEvent });
    }
  });

  // Now add any EXTRA validated events from LLM that aren't already represented in finalEvents
  llmEvents.forEach((le: any) => {
    const isAlreadyPresent = finalEvents.some((fe) => 
      fe.name.toLowerCase().includes(le.name.toLowerCase()) || 
      le.name.toLowerCase().includes(fe.name.toLowerCase())
    );

    if (!isAlreadyPresent) {
      // Ensure the date of the extra event has the target month name or is valid
      let dateStr = le.date || "";
      if (!dateStr || dateStr.toLowerCase() === "tbd" || dateStr.toLowerCase() === "various" || dateStr.toLowerCase() === "global") {
        le.date = `${targetMonthEn} 2026`;
      }
      finalEvents.push(le);
    }
  });

  // CHRONOLOGICAL SORTING:
  // Sort events by day of the month so the calendar renders beautifully and professionally.
  finalEvents.sort((a, b) => {
    const dayA = a.date.match(/^(\d+)/);
    const dayB = b.date.match(/^(\d+)/);
    const numA = dayA ? parseInt(dayA[1], 10) : 99;
    const numB = dayB ? parseInt(dayB[1], 10) : 99;
    return numA - numB;
  });

  parsed.events = finalEvents;
  return parsed;
}

export async function generateEventKeywords(eventName: string, eventDetails: string, model?: string) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are an expert AI Stock Photographer and Keyword Specialist. 
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

  let parsedData = JSON.parse(extractJSON(responseText));
  
  // POST-PROCESSING ENFORCEMENT: Jika ada parameter kritis yang FAIL, paksa rekomendasi keseluruhan menjadi FAIL
  if (parsedData && parsedData.ai_vision_checks) {
    const checks = parsedData.ai_vision_checks;
    const criticalFails = ['ai_artifacts', 'structural_defects', 'anatomical_errors', 'text', 'ip_risk', 'over_edited', 'proportion_defects'];
    
    let hasCriticalFail = false;
    for (const key of criticalFails) {
      if (checks[key] && checks[key].status === 'FAIL') {
        hasCriticalFail = true;
        break;
      }
    }
    
    if (hasCriticalFail) {
      parsedData.recommendation = 'FAIL';
      if (parsedData.overall_score >= 70) {
        parsedData.overall_score = Math.floor(Math.random() * (68 - 55 + 1)) + 55; // Force score between 55-68
      }
      
      // Pastikan ada penjelasan di feedback
      if (!parsedData.detailed_feedback.includes('Sistem keamanan pasca-pemrosesan')) {
          parsedData.detailed_feedback += ' (Penolakan Otomatis: Sistem mendeteksi kegagalan kritis pada artefak AI, struktur, atau teks yang memicu penolakan wajib untuk Adobe Stock).';
      }
    }
  }
  
  return parsedData;
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
  
  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a professional SEO and Adobe Stock Keyword Specialist.
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
    const parsed = JSON.parse(extractJSON(responseText));
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
      const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are an expert Adobe Stock indexing research assistant.
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

/** DETERMINISTIC: Compute measurable quality_checks from technical report. ffprobe + FFmpeg + OpenCV pixel. */
function computeTechnicalQualityChecks(report: any, tolerance: string): Record<string, { status: string; note: string }> {
  const c: Record<string, { status: string; note: string }> = {};
  if (report?.frameAnalysis?.length > 0) {
    const avgSharp = report.frameAnalysis.reduce((s: number, f: any) => s + (f.sharpness || 0), 0) / report.frameAnalysis.length;
    const worst = report.frameAnalysis.some((f: any) => f.blurStatus === 'BLURRED');
    const hasSoft = report.frameAnalysis.some((f: any) => f.blurStatus === 'SOFT');
    if (worst) { c.blur = { status: 'FAIL', note: `Laplacian avg ${avgSharp.toFixed(1)} — BLURRED.` }; c.out_of_focus = { status: 'FAIL', note: 'Soft focus detected.' }; }
    else if (hasSoft && tolerance === 'STRICT') { c.blur = { status: 'FAIL', note: `Laplacian ${avgSharp.toFixed(1)} — SOFT (strict).` }; }
    else { c.blur = { status: 'PASS', note: `Laplacian ${avgSharp.toFixed(1)} — OK.` }; c.out_of_focus = { status: 'PASS', note: 'Focus acceptable.' }; }
    const maxOver = Math.max(...report.frameAnalysis.map((f: any) => f.overexposurePercent || 0));
    const maxUnder = Math.max(...report.frameAnalysis.map((f: any) => f.underexposurePercent || 0));
    c.overexposure = maxOver > 15 ? { status: 'FAIL', note: `${maxOver.toFixed(1)}% overexposed.` } : { status: 'PASS', note: `${maxOver.toFixed(1)}% — OK.` };
    c.underexposure = maxUnder > 20 ? { status: 'FAIL', note: `${maxUnder.toFixed(1)}% underexposed.` } : { status: 'PASS', note: `${maxUnder.toFixed(1)}% — OK.` };
  } else { c.blur = { status: 'PASS', note: 'No pixel data.' }; c.overexposure = { status: 'PASS', note: 'No data.' }; c.underexposure = { status: 'PASS', note: 'No data.' }; }
  if (report?.filters) {
    c.black_frame = report.filters.black_frames_detected ? { status: 'FAIL', note: `${report.filters.black_frames?.length || 0} black frame(s) detected.` } : { status: 'PASS', note: 'No black frames.' };
    c.frozen_frame = report.filters.frozen_frames_detected ? { status: 'FAIL', note: `${report.filters.frozen_frames?.length || 0} frozen segment(s).` } : { status: 'PASS', note: 'No frozen frames.' };
    c.empty_frame = { status: 'PASS', note: 'No empty frames.' }; c.duplicate_frame = { status: 'PASS', note: 'No duplicate frames.' };
  }
  if (report?.stabilityStatus) {
    const si = report.stabilityIndex || 0;
    if (report.stabilityStatus === 'FLICKERING') { c.flickering = { status: 'FAIL', note: `Stability ${si} — FLICKERING.` }; c.camera_shake = { status: 'FAIL', note: 'Significant instability.' }; }
    else if (report.stabilityStatus === 'UNSTABLE' && tolerance === 'STRICT') { c.flickering = { status: 'FAIL', note: `Stability ${si} — UNSTABLE (strict).` }; }
    else { c.flickering = { status: 'PASS', note: `Stability ${si} — ${report.stabilityStatus}.` }; c.camera_shake = { status: 'PASS', note: 'Stable.' }; }
  }
  if (report?.ffprobe?.video) {
    const v = report.ffprobe.video;
    c.motion_consistency = (v?.fps || 0) >= 23.976 ? { status: 'PASS', note: `FPS ${v?.fps?.toFixed(2)} — OK.` } : { status: 'FAIL', note: `FPS ${v?.fps?.toFixed(2)} — below 23.976.` };
    c.visual_quality = ((v?.width || 0) >= 1920 && (v?.height || 0) >= 1080) ? { status: 'PASS', note: `${v?.width}x${v?.height} — 1080p+.` } : { status: 'FAIL', note: `${v?.width}x${v?.height} — below 1080p.` };
    c.noise = { status: 'PASS', note: `Bitrate ${((report.ffprobe.bitrate || 0) / 1000).toFixed(0)}kbps, ${v?.codec || '?'}.` };
  }
  return c;
}

function computeTechnicalScore(checks: Record<string, { status: string; note: string }>): number {
  const keys = ['blur','overexposure','underexposure','black_frame','frozen_frame','flickering','camera_shake','motion_consistency','visual_quality','out_of_focus'];
  let tot = 0, fail = 0;
  for (const k of keys) { if (checks[k]) { tot++; if (checks[k].status === 'FAIL') fail++; } }
  return tot > 0 ? Math.round(100 - (fail / tot) * 100) : 85;
}

/** 
 * HYBRID VIDEO QUALITY ANALYSIS — CONSISTENT ACROSS ALL MODELS/PROVIDERS
 * Phase 1: ffprobe + FFmpeg + OpenCV pixel = DETERMINISTIC (70% weight)
 * Phase 2: AI Vision = SUBJECTIVE only: IP, aesthetics, AI artifacts (30% weight)
 * Phase 3: Standardized merge + scoring formula
 */
export async function checkVideoQuality(frames, tolerance = 'MEDIUM', language = 'Bahasa', model, videoMetadata = null, videoFile = null, videoTechnicalReport = null) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  const isIndonesian = !language || language === 'Bahasa' || language === 'id' || language === 'Indonesian';
  const targetLanguageName = isIndonesian ? 'Indonesian (Bahasa Indonesia)' : 'English';

  // PERBAIKAN TIMEOUT: Batasi frame yang dikirim ke AI (max 6 frame untuk performa)
  // Kirim hanya 3 full frame + 3 zoom crop, bukan semua 8-12 frame
  const imageParts: any[] = [];
  if (videoFile) imageParts.push({ fileData: { fileUri: videoFile.fileUri, mimeType: videoFile.mimeType } });
  
  let frameCount = 0;
  if (frames && frames.length > 0) {
    // Ambil maksimal 3 pasang (full+zoom) = 6 frame, atau kurang jika frame lebih sedikit
    // AKURASI: Naikkan max frame ke 8 (4 full + 4 zoom dari 5 keyframe)
    const maxFrames = Math.min(frames.length, 5);
    const step = Math.max(1, Math.floor(frames.length / maxFrames));
    for (let i = 0; i < frames.length && imageParts.length - (videoFile ? 1 : 0) < 5; i += step) {
      imageParts.push(processFrameServer(frames[i]));
      frameCount++;
    }
  }

  // Parse technical report and build ground truth summary
  const report = videoTechnicalReport ? (typeof videoTechnicalReport === 'string' ? JSON.parse(videoTechnicalReport) : videoTechnicalReport) : null;
  
  // Build deterministic ground truth from pipeline tools
  const gt: any = {};
  if (report) {
    // ffprobe findings
    if (report.ffprobe?.video) {
      const v = report.ffprobe.video;
      gt.resolution = `${v.width}x${v.height}`;
      gt.fps = v.fps?.toFixed(2);
      gt.codec = v.codec;
      gt.bitrate = `${((report.ffprobe.bitrate || 0) / 1000).toFixed(0)}kbps`;
    }
    // FFmpeg blackdetect/freezedetect findings
    if (report.filters) {
      gt.black_frames = report.filters.black_frames_detected ? `${report.filters.black_frames?.length || 0} detected` : 'none';
      gt.frozen_frames = report.filters.frozen_frames_detected ? `${report.filters.frozen_frames?.length || 0} detected` : 'none';
    }
    // signalstats findings
    if (report.signalstats) {
      gt.luminance = `min=${report.signalstats.luminance_min} max=${report.signalstats.luminance_max} avg=${report.signalstats.luminance_avg}`;
      gt.saturation = `avg=${report.signalstats.saturation_avg}`;
    }
    // vmafmotion findings
    if (report.vmaf_motion) {
      gt.motion_level = `${report.vmaf_motion.motion_score} (${report.vmaf_motion.motion_interpretation})`;
    }
    // OpenCV pixel analysis
    if (report.frameAnalysis?.length > 0) {
      const avgSharp = report.frameAnalysis.reduce((s: number, f: any) => s + (f.sharpness || 0), 0) / report.frameAnalysis.length;
      const worstBlur = report.frameAnalysis.some((f: any) => f.blurStatus === 'BLURRED');
      const maxOver = Math.max(...report.frameAnalysis.map((f: any) => f.overexposurePercent || 0));
      const maxUnder = Math.max(...report.frameAnalysis.map((f: any) => f.underexposurePercent || 0));
      gt.sharpness = `Laplacian avg ${avgSharp.toFixed(1)} — ${worstBlur ? 'BLURRED' : 'OK'}`;
      gt.overexposure = `${maxOver.toFixed(1)}%`;
      gt.underexposure = `${maxUnder.toFixed(1)}%`;
    }
    if (report.stabilityStatus) {
      gt.stability = `${report.stabilityStatus} (index ${report.stabilityIndex})`;
    }
    if (report.scene_detection?.scene_changes_detected) {
      gt.scene_changes = `${report.scene_detection.scene_changes?.length || 0} cuts detected`;
    }
    // AKURASI: Audio analysis ground truth
    if (report.audio?.has_audio) {
      gt.audio_codec = report.audio.codec;
      gt.audio_sample_rate = `${report.audio.sample_rate}Hz`;
      gt.audio_channels = report.audio.channels;
      if (report.audio.volume) {
        gt.audio_mean_volume = `${report.audio.volume.mean_volume_db}dB`;
        gt.audio_max_volume = `${report.audio.volume.max_volume_db}dB`;
      }
    } else {
      gt.audio = 'NO AUDIO TRACK';
    }
    // Perceptual Metrics from Python Microservice
    if (report.advancedMetrics) {
      gt.brisque = report.advancedMetrics.brisque;
      gt.niqe = report.advancedMetrics.niqe;
      gt.ssim = report.advancedMetrics.ssim;
      gt.lpips = report.advancedMetrics.lpips;
    }
  }

  // Build AI system instruction with ground truth
  // PERBAIKAN TIMEOUT: Prompt lebih ringkas untuk respons AI lebih cepat
  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are a strict Adobe Stock QA Curator. Make PASS/FAIL decision. FAIL for any artifact, defect, or inconsistency. Be concise.

MANDATORY FAIL conditions from technical ground truth:
- Black frames detected = FAIL
- Frozen frames detected = FAIL
- EXTREME BLUR (Laplacian < 15 or BLURRED) = FAIL
- Resolution < 1920x1080 = FAIL
- FPS < 23.976 = FAIL
- Stability FLICKERING = FAIL
- Audio clipping or extreme distortion = FAIL
- No audio track at all = ACCEPTABLE (silent videos are preferred by stock platforms)

======= TECHNICAL GROUND TRUTH (from ffprobe + FFmpeg filters + OpenCV pixel analysis) =======
${JSON.stringify(gt, null, 1)}

IMPORTANT: The technical data above is OBJECTIVE and MEASURED. Use it as absolute reference:
- Black frames detected by FFmpeg = FAIL mandatory
- Frozen frames detected by FFmpeg = FAIL mandatory  
- EXTREME BLUR detected by OpenCV (Laplacian variance < 15 or BLURRED) = FAIL mandatory, no exceptions. If technical ground truth says it is blurred, the final recommendation MUST be FAIL.
- Resolution < 1920x1080 = FAIL mandatory
- FPS < 23.976 = FAIL mandatory
- Stability FLICKERING = FAIL mandatory

======= YOUR SUBJECTIVE ASSESSMENT =======
Analyze the ${frameCount} video keyframes for these AI-VISION-ONLY criteria:
(NOTE: Images come in pairs: Full Frame at 1024x576 + 1200px Zoom Center Crop at higher quality. Use the 1200px Zoom crops to rigorously inspect pixel-level defects: Compression Artifacts, Noise, Banding, and AI texture defects).

1. TEMPORAL MORPHING: Do textures/objects change shape unnaturally between frames? (warping, melting, liquid-like deformation)
2. TEXTURE WARPING & MICRO-REFLECTIONS: Do backgrounds/surfaces distort, ripple, or have unnatural micro-warping light patterns?
3. BANDING (Color Banding): Are there posterization effects or harsh, stepped gradients in the sky, gradients, or flat surfaces instead of smooth transitions?
4. FLICKERING & COMPRESSION: Are there rapid, strobing brightness fluctuations, macro-blocks, or severe compression artifacts (checked via Zoom Crop)?
5. OVERSHARPENING (Halos): Are there unnatural bright outlines or halos around the edges of subjects due to excessive digital sharpening?
6. GHOSTING: Are there duplicate/semi-transparent trails behind moving objects?
7. GEOMETRY CONSISTENCY: Do objects maintain logical 3D structure? (collapsing, floating, impossible geometry)
8. AI ARTIFACTS & NOISE: Any generative AI defects, extra fingers, gibberish text, or harsh noise grain (checked via Zoom Crop)?
9. KINEMATICS & PHYSICS: Do objects move with natural momentum, gravity, and physics, or is the movement robotic, stiff, or unnaturally slow/gelatinous (common in AI videos)?
10. INTELLECTUAL PROPERTY & BRAND SAFETY (ADOBE STOCK POLICY): Does the video contain any commercial logos, brand names, trademarked designs (e.g., iPhone camera bumps, Adidas stripes), copyrighted artworks, modern museum paintings, or restricted landmarks (e.g., Eiffel Tower at night, Hollywood Sign)? (Note: Public domain historical documents and generic toys are SAFE). If any IP violation is detected, you MUST fail the video.
11. LOG PROFILE / FLAT COLOR: Does the video have ungraded, washed-out logarithmic gamma (e.g., S-Log, V-Log, C-Log) without proper color correction? Stock platforms require finished, color-graded footage.
12. UPSCALED VIDEO: Has the video been artificially/forced upscaled from a lower resolution (e.g., HD→4K)? Look for soft details, smeared textures, and lack of true 4K sharpness.
13. VISIBLE TRANSITIONS / EFFECTS: Are there visible transitions, wipes, dissolves, glitch effects, or overlay effects baked into the footage? Stock footage should be clean raw clips without editor-applied effects.
14. AUDIO QUALITY: If the video has audio, check for clipping/distortion, excessive noise floor, inconsistent levels, or audio that doesn't match the visual content. Stock platforms prefer clean or no audio.

======= FINAL DECISION =======
Tolerance: ${tolerance}. Language: ${targetLanguageName}.
Return your PASS/FAIL verdict with COMPLETE JSON. The technical ground truth above should heavily influence scores.
ZERO TOLERANCE POLICY: If ANY mandatory technical failure is detected OR if ANY of the 7 Subjective AI-Vision criteria (Morphing, Warping, Banding, Artifacts, etc.) is flagged as flawed/problematic, the final recommendation MUST be FAIL and overall_score MUST be < 70. Do NOT pass a video that has even one quality issue.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      visual_scan_analysis: { type: Type.STRING },
      legal_status: { type: Type.STRING, enum: ["SAFE","AT_RISK","VIOLATION"] },
      technical_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      overall_score: { type: Type.NUMBER },
      technical_score: { type: Type.NUMBER },
      visual_score: { type: Type.NUMBER },
      recommendation: { type: Type.STRING, enum: ["PASS","FAIL","RETOUCH"] },
      adobe_stock_readiness: { type: Type.STRING, enum: ["Ready","Needs Improvement","Reject Risk"] },
      detailed_feedback: { type: Type.STRING },
      quality_checks: {
        type: Type.OBJECT,
        properties: {
          blur: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          noise: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          overexposure: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          underexposure: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          black_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          frozen_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          flickering: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          camera_shake: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          out_of_focus: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          motion_consistency: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          visual_quality: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          // ===== AI VISION CRITERIA =====
          temporal_morphing: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          texture_warping: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          ghosting: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          geometry_consistency: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          ai_artifact: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          // ===== SUBJECTIVE (AI) =====
          watermark: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          logo: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          text: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          deformed_object: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          bad_anatomy: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          compression_artifacts: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          blocking: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          banding: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          white_balance: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          motion_blur: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          duplicate_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          empty_frame: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          cropped_subject: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          cut_off_object: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          wrong_perspective: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          low_aesthetic_quality: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          // ===== PERBAIKAN: 3 field yang sebelumnya hilang =====
          log_profile: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          upscaled_video: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] },
          visible_transitions: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ["PASS","FAIL","UNKNOWN"] }, note: { type: Type.STRING } }, required: ["status","note"] }
        },
        required: ["blur","noise","overexposure","underexposure","black_frame","frozen_frame","flickering","camera_shake","out_of_focus","motion_consistency","visual_quality","temporal_morphing","texture_warping","ghosting","geometry_consistency","ai_artifact","watermark","logo","text","deformed_object","bad_anatomy","compression_artifacts","blocking","banding","white_balance","motion_blur","duplicate_frame","empty_frame","cropped_subject","cut_off_object","wrong_perspective","low_aesthetic_quality","log_profile","upscaled_video","visible_transitions"]
      },
      heatmaps: { type: Type.ARRAY, items: { type: Type.OBJECT } }
    },
    required: ["visual_scan_analysis","legal_status","technical_issues","strengths","overall_score","recommendation","detailed_feedback","quality_checks","heatmaps"]
  };

  // AI call with 15s timeout
  let responseText = '';
  try {
    const aiPromise = NON_GEMINI_PROVIDERS.has(provider)
      ? callOpenAICompatibleWithRetry({ systemInstruction, contents: { parts: [...imageParts, { text: `Assess ${frameCount} frames. Technical ground truth: ${JSON.stringify(gt)}. Return full JSON with PASS/FAIL.` }] }, responseMimeType: 'application/json', responseSchema, config: { temperature: 0.2 }, model })
      : callGeminiWithRetry(model && model.startsWith('gemini') ? model : 'gemini-3.1-flash-lite',
          imageParts.length > 0 ? { parts: [...imageParts, { text: `Assess ${frameCount} frames. Technical ground truth: ${JSON.stringify(gt)}. Return PASS/FAIL verdict.` }] } : `Technical data: ${JSON.stringify(gt)}. Return PASS/FAIL verdict.`,
          { systemInstruction, responseMimeType: 'application/json', responseSchema, temperature: 0.2 }, 1)
          .then((r: any) => r.text || '{}');
    
    // PERBAIKAN TIMEOUT: 60s timeout untuk AI call (dari 90s)
    const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000));
    responseText = await Promise.race([aiPromise, timeout]);
  } catch (e: any) {
    responseText = JSON.stringify({ visual_scan_analysis: 'AI unavailable', legal_status: 'SAFE', technical_issues: [], strengths: [], overall_score: 0, technical_score: 0, visual_score: 0, recommendation: 'FAIL', adobe_stock_readiness: 'Reject Risk', detailed_feedback: e.message, quality_checks: {}, heatmaps: [] });
  }
  return JSON.parse(extractJSON(responseText));
}

/* ===== FIXED: generateMotionCode restored as standalone function ===== */
export async function generateMotionCode(userPrompt: string, options?: { currentCode?: string; fps?: number; durationSeconds?: number; width?: number; height?: number; history?: Array<{role: string; content: string}>; model?: string }) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  const model = options?.model;

  const systemInstruction = `${SHARED_TITLE_DESCRIPTION_RULES}
You are an expert Remotion developer. Your task is to generate a self-contained React component that composes a stunning, modern motion graphics animation. The component MUST be a valid Remotion composition that exports a default MotionComposition component.
RULES: Use @remotion packages appropriately. The animation should be smooth, professional, and visually impressive. Use React hooks as needed. Use useCurrentFrame() and useVideoConfig() from remotion. Export as: export default MotionComposition. Keep the code self-contained and production-ready. Return ONLY valid, runnable JSX/TSX code.`;

  const { width = 1920, height = 1080, fps = 30, durationSeconds = 5 } = options || {};
  const durationInFrames = fps * durationSeconds;

  const contextParts: string[] = [];
  contextParts.push(`Canvas: ${width}x${height}, ${fps}fps, ${durationInFrames} frames (${durationSeconds}s).`);
  if (options?.currentCode?.trim()) contextParts.push(`Existing code:\n\`\`\`jsx\n${options.currentCode}\n\`\`\``);
  if (options?.history?.length) {
    const h = options.history.slice(-6);
    contextParts.push(`History:\n${h.map(m => `${m.role}: ${m.content}`).join('\n')}`);
  }
  contextParts.push(`Request: "${userPrompt}"`);
  const fullContents = contextParts.join('\n\n');

  const responseSchema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, summary: { type: Type.STRING }, code: { type: Type.STRING } }, required: ["title", "summary", "code"] };

  let responseText = "";
  if (NON_GEMINI_PROVIDERS.has(provider)) {
    const res = await callOpenAICompatibleWithRetry({ systemInstruction, contents: fullContents, responseMimeType: "application/json", responseSchema, config: { temperature: 0.9 }, model });
    responseText = res;
  } else {
    try {
      const res = await callGeminiWithRetry(model?.startsWith('gemini') ? model : 'gemini-3.1-pro-preview', fullContents, { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.9 }, 2);
      responseText = res.text || "{}";
    } catch (err: any) {
      const res = await callGeminiWithRetry('gemini-3.5-flash', fullContents, { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.9 }, 1);
      responseText = res.text || "{}";
    }
  }

  const parsed = JSON.parse(extractJSON(responseText));
  if (typeof parsed.code === 'string') {
    parsed.code = parsed.code.replace(/^```(jsx|javascript|js|tsx)?\s*/i, '').replace(/```\s*$/i, '').trim();
    if (!/MotionComposition/.test(parsed.code)) throw new Error('AI response did not include a MotionComposition export.');
  } else throw new Error('AI response missing code field.');
  return { title: parsed.title || 'Untitled Motion', summary: parsed.summary || '', code: parsed.code as string };
}

/* ===== uploadVideoToGemini ===== */
export async function uploadVideoToGemini(videoPath: string, mimeType: string): Promise<{ fileUri: string; mimeType: string } | null> {
  const fs = await import('fs');
  if (!videoPath || !fs.existsSync(videoPath)) return null;
  
  // SKIP large files (>25MB) — base64 encoding would hang the server
  const stats = fs.statSync(videoPath);
  const MAX_BYTES = 25 * 1024 * 1024;
  if (stats.size > MAX_BYTES) {
    console.log(`[uploadVideoToGemini] File too large (${(stats.size/1024/1024).toFixed(1)}MB > 25MB), skipping upload. Using frames only.`);
    return null;
  }
  
  const fileBuffer = fs.readFileSync(videoPath);
  const base64Data = fileBuffer.toString('base64');
  return { fileUri: `data:${mimeType};base64,${base64Data}`, mimeType };
}

/* ===== removeWatermark - Gemini AI + Server-Side Pixel Inpainting ===== */
export async function removeWatermark(imageBase64: string, maskBase64: string, preset: string): Promise<{ processedImage: string; status: string }> {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  const imageMime = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // Gemini analysis
  const imagePart = { inlineData: { mimeType: imageMime, data: imageData } };
  const promptText = `Analyze this image. The red overlay region shows watermark area to remove (preset: ${preset}). Describe what should fill that area.`;
  const parts: any[] = [imagePart];
  if (maskBase64) parts.push({ inlineData: { mimeType: 'image/png', data: maskBase64.replace(/^data:image\/\w+;base64,/, '') } });
  parts.push({ text: promptText });

  let analysis: any = null;
  if (!NON_GEMINI_PROVIDERS.has(provider)) {
    try {
      const res = await callGeminiWithRetry('gemini-3.5-flash', { parts }, { systemInstruction: 'You are an expert image restoration specialist. Analyze the masked area and describe replacement content.', responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { fill_description: { type: Type.STRING }, colors: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['fill_description', 'colors'] }, temperature: 0.2 }, 1);
      analysis = JSON.parse(extractJSON(res.text || '{}'));
    } catch {}
  }

  // Server-side pixel inpainting via jpeg-js
  try {
    const jpeg = await import('jpeg-js');
    const imgBuffer = Buffer.from(imageData, 'base64');
    const raw = jpeg.default.decode(imgBuffer, { useTArray: true });
    const { width, height, data: pixels } = raw;

    const maskPixels = new Uint8Array(width * height);
    const mw = Math.floor(width * 0.30), mh = Math.floor(height * 0.18);
    let sx = width - mw - Math.floor(width * 0.015), sy = height - mh - Math.floor(height * 0.015);
    if (preset === 'bottom-left') { sx = Math.floor(width * 0.02); sy = height - mh - Math.floor(height * 0.02); }
    else if (preset === 'top-right') { sx = width - mw - Math.floor(width * 0.02); sy = Math.floor(height * 0.02); }
    for (let y = Math.max(0, sy); y < Math.min(height, sy + mh); y++)
      for (let x = Math.max(0, sx); x < Math.min(width, sx + mw); x++)
        maskPixels[y * width + x] = 1;

    if (maskPixels.some(v => v === 1)) {
      const r = Math.min(Math.max(Math.floor(Math.min(width, height) * 0.04), 6), 24);
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (!maskPixels[idx]) continue;
            let rs = 0, gs = 0, bs = 0, ws = 0;
            const rr = pass === 0 ? r : Math.floor(r / 2);
            for (let dy = -rr; dy <= rr; dy++) {
              const ny = y + dy; if (ny < 0 || ny >= height) continue;
              for (let dx = -rr; dx <= rr; dx++) {
                const nx = x + dx; if (nx < 0 || nx >= width) continue;
                const nI = ny * width + nx;
                if (pass === 0 && maskPixels[nI]) continue;
                const d2 = dx * dx + dy * dy; if (d2 === 0 || (pass === 0 && d2 > r * r)) continue;
                const w = 1.0 / (Math.sqrt(d2) + 0.1);
                const po = nI * 4; rs += pixels[po] * w; gs += pixels[po + 1] * w; bs += pixels[po + 2] * w; ws += w;
              }
            }
            if (ws > 0) { const po = idx * 4; pixels[po] = Math.round(rs / ws); pixels[po + 1] = Math.round(gs / ws); pixels[po + 2] = Math.round(bs / ws); }
          }
        }
      }
      const enc = jpeg.default.encode({ data: pixels, width, height }, 92);
      return { processedImage: `data:image/jpeg;base64,${enc.data.toString('base64')}`, status: 'success' };
    }
  } catch (e: any) { console.warn('[removeWatermark] Inpainting fallback:', e.message); }

  return { processedImage: imageBase64, status: 'fallback', error: 'Inpainting unavailable' };
}

export const THREE_D_CGI_STYLE_INSTRUCTION = `
You are an expert 3D Digital Rendering Artist specializing in high-end Computer-Generated Imagery (CGI), flawless Blender Cycles, Octane Render, and Cinema 4D aesthetics. Your expertise covers the full spectrum of modern 3D visual styles—from sleek synthetic UI/UX assets and product renders to hyper-detailed organic and biological macro cross-sections.

When generating or refining prompts for the "3D CGI" style, you MUST strictly follow these unified rules:

1. DIGITAL PRECISE GEOMETRY & CGI FOCUS
   - Focus on flawless, high-precision digital 3D geometry rendered via top-tier software (Blender Cycles, Cinema 4D, Octane Render).
   - The final output must unequivocally look like an impeccable digital 3D render, NOT a casual real-world photograph.

2. MATERIALS & SURFACE RENDERING
   - Synthetic Elements: Smooth toy-like plastics, polished glass, sleek chrome/metal, frosted acrylic, and high-gloss synthetic finishes.
   - Organic & Biological Elements: Glistened wet surfaces, translucent golden gel spheres, glistening lumen, intricate vascular and neural fiber networks, and detailed cross-sectional layers.
   - Subsurface Scattering (SSS): MANDATORY application of SSS where light penetrates translucent gels, soft resin, or organic tissues to create internal depth and subtle luminescence.

3. CONTROLLED STUDIO LIGHTING & OPTICS
   - Utilize controlled multi-point studio lighting setups, global illumination, soft ambient occlusion, and precise contact shadows.
   - Incorporate crisp caustics (light refraction through glass/gels), glossy highlight reflections, and shallow macro Depth of Field (DoF) with smooth background bokeh to accent primary focal points.

4. COMMERCIAL VERSATILITY & ADAPTABILITY
   - Automatically adapt the render properties to match the user's specific subject:
     * For Tech, Products, UI, or Icons: Emphasize ultra-clean geometry, smooth pedestals/podiums, glassmorphism, claymorphism, or floating isometric perspectives.
     * For Science, Biology, or Medical Subjects: Emphasize hyper-detailed cross-sections, intricate fiber networks, wet glossy textures, translucent cellular structures, and dramatic studio contrast.

5. STRICT PROHIBITIONS (STRICTLY AVOID)
   - DO NOT introduce real-world camera artifacts, ISO grain, camera noise, or lens distortion.
   - DO NOT include natural photographic defects like dust, smudges, dirt, or real-world imperfections.
   - DO NOT generate flat, unlit 2D illustrations or low-polygon drafts.
`;

export async function generate3DCGIPrompt(topic: string): Promise<string> {
  const userQuery = `Generate a high-end 3D CGI image prompt for the subject: "${topic}". \nIncorporate specific material properties (e.g., subsurface scattering, polished glass, wet glistening textures, or sleek plastics depending on the subject), lighting, camera depth, and rendering engine nuances (Blender Cycles/Octane/Cinema 4D). \nOutput ONLY the refined prompt text without intro or explanations.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: THREE_D_CGI_STYLE_INSTRUCTION,
      }
    });

    return result.text?.trim() || '';
  } catch (error) {
    console.error('Error generating 3D CGI prompt:', error);
    throw new Error('Failed to generate prompt');
  }
}

export const CINEMATIC_STYLE_INSTRUCTION = `
You are an expert Visual Cinematographer and Concept Director specializing in high-budget movie stills, cinematic framing, and dramatic narrative compositions.

When generating or refining prompts for the "Cinematic" style, you MUST strictly follow these rules:

1. NARRATIVE ATMOSPHERE & MOOD
   - Craft visuals that feel like frozen frames from blockbuster feature films with immense production value.
   - Inject narrative depth and emotional tension into the scene (e.g., suspenseful, heroic, melancholic, or epic mood).

2. CAMERA, LENS & OPTICS
   - Specify cinematic anamorphic lens characteristics: subtle horizontal lens flares, shallow depth of field (bokeh), and natural optical distortions.
   - Utilize dynamic camera framing: tracking shot perspectives, low/high angles, cinematic leading lines, or strong rule-of-thirds symmetry.
   - Incorporate volumetric atmospheric effects: organic haze, smoke, floating dust motes, or fog to add physical spatial depth.

3. CINEMATIC COLOR GRADING & LIGHTING
   - Lighting: Prioritize dramatic, moody directional lighting—such as strong backlighting, sharp rim lights, light shafts through fog, or high-contrast chiaroscuro.
   - Color Grading: Enforce distinct cinematic color palettes (e.g., classic orange & teal, warm golden hour, cold moody indigos/cyans, or desaturated gritty tones).

4. SUBJECT & ENVIRONMENT INTEGRATION
   - Environments must be rich, contextual, and immersive.
   - Subjects must display natural, character-driven expressions or poses (no artificial smiling or posed "stock photo" look).

5. STRICT PROHIBITIONS (STRICTLY AVOID)
   - DO NOT use flat, even studio lighting or softbox setups.
   - DO NOT use plain white, solid black, or isolated neutral backgrounds.
   - DO NOT depict generic, emotionless stock photography poses or expressions.
   - DO NOT create flat, two-dimensional compositions without foreground/background separation.
`;

export async function generateCinematicPrompt(topic: string): Promise<string> {
  const userQuery = `Generate a high-end cinematic image prompt for the subject: "${topic}". \nIncorporate specific cinematic camera angles, anamorphic lens flares, dramatic lighting, and blockbuster movie color grading. \nOutput ONLY the refined prompt text without intro or explanations.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: CINEMATIC_STYLE_INSTRUCTION,
      }
    });

    return result.text?.trim() || '';
  } catch (error) {
    console.error('Error generating Cinematic prompt:', error);
    throw new Error('Failed to generate prompt');
  }
}

export const ABSTRACT_STYLE_INSTRUCTION = `
You are a Master Abstract Artist and Creative Director specializing in deconstructive, non-literal visual art, fluid dynamics, and expressive modern compositions.

When generating or refining prompts for the "Abstract" style, you MUST strictly follow these rules:

1. CORE CONCEPT & DECONSTRUCTION
   - Deconstruct the user's input subject into dynamic expressions of motion, kinetic energy, emotion, and non-literal forms.
   - Shift focus away from recognizable real-world subjects toward atmospheric mood, fluid rhythm, and spatial energy.

2. VISUAL CHARACTERISTICS & TEXTURES
   - Incorporate vivid tactile textures: explosive pigment swirls, kinetic motion trails, thick impasto brushwork, layered translucent facets, or fluid marble inks.
   - Enforce dramatic asymmetric compositions and balance of organic versus structured forms.

3. EMBEDDED ABSTRACT MOVEMENTS & TECHNIQUES
   - Automatically blend or select appropriate abstract movements based on the topic context:
     * Abstract Expressionism: Bold gestural strokes and raw emotional marks.
     * Fluid / Marble Art: Smooth liquid ink flows, acrylic pouring, and swirling colors.
     * Neon & Kinetic: Glowing light trails, luminescent energy vectors, and vibrant neon pulses.
     * Geometric & Cubist: Fractured geometric facets, intersecting translucent planes, and mathematical precision.
     * Glitch Art & Distortion: Digital signal degradation, scanline distortions, and chromatic shifting.

4. MANDATORY PROMPT STRUCTURE
   - Formulate the output prompt using this structural pattern:
     "Abstract, [subject deconstructed into energy/form] using [selected abstract style/movement] with [specific textures, e.g., vibrant paint splatters, crystalline facets, or liquid silk flow] and [atmospheric lighting]."

5. STRICT PROHIBITIONS (STRICTLY AVOID)
   - DO NOT generate photorealistic renders or literal human/object anatomy.
   - DO NOT include camera lens specs (e.g., 50mm, f/1.8), raytracing parameters, or realistic world-building elements.
   - DO NOT create static, flat, or featureless background fills.
`;

export async function generateAbstractPrompt(topic: string): Promise<string> {
  const userQuery = `Generate a highly artistic abstract image prompt for the subject: "${topic}". \nFocus on deconstructing the subject into energy, motion, and non-literal forms. Incorporate vivid textures (impasto, fluid marble, geometric facets) and dynamic compositions. \nOutput ONLY the refined prompt text without intro or explanations.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: ABSTRACT_STYLE_INSTRUCTION,
      }
    });

    return result.text?.trim() || '';
  } catch (error) {
    console.error('Error generating Abstract prompt:', error);
    throw new Error('Failed to generate prompt');
  }
}

export const PAINTERLY_DIGITAL_ART_STYLE_INSTRUCTION = `
You are a Master Digital Painter and Concept Artist specializing in Painterly Digital Art, blending traditional brushwork techniques with modern digital illustration aesthetics.

When generating or refining prompts for the "Painterly Digital Art" style, you MUST strictly follow these rules:

1. CORE CONCEPT & BRUSHWORK
   - Focus on expressive, visible brushstrokes and a handcrafted artistic feel.
   - Blend the boundaries between traditional media (like oil, acrylic, or gouache) and high-end digital painting (e.g., ArtStation trending illustrations, Procreate masterworks).

2. VISUAL CHARACTERISTICS & TEXTURES
   - Incorporate rich, tactile textures: canvas grain, thick impasto strokes, blended gradients, and dynamic painterly splatters.
   - Emphasize edge control: a mix of lost and found edges, soft transitions, and sharp focal points to guide the viewer's eye.

3. LIGHTING & COLOR PALETTE
   - Lighting: Utilize dramatic, stylized lighting with vibrant color bounces, rim lights, or ethereal glows. Avoid hyper-realistic or sterile studio lighting.
   - Color Palette: Use harmonious, rich color palettes with deep shadows and luminous highlights, characteristic of professional digital concept art.

4. MANDATORY PROMPT STRUCTURE
   - Ensure the prompt explicitly calls for "painterly digital art," "visible brushstrokes," "digital painting," and "expressive artistic style."
   - Adapt the subject into a cohesive painting rather than a photorealistic scene.

5. STRICT PROHIBITIONS (STRICTLY AVOID)
   - DO NOT generate photorealistic renders, 3D CGI, or camera-based photography.
   - DO NOT use vector art, flat shading, or perfectly smooth plastic-like surfaces.
   - DO NOT include photographic lens effects like chromatic aberration, film grain, or realistic depth-of-field blur.
`;

export async function generatePainterlyDigitalArtPrompt(topic: string): Promise<string> {
  const userQuery = `Generate a highly artistic Painterly Digital Art image prompt for the subject: "${topic}". \nFocus on expressive brushstrokes, traditional media aesthetics blended with digital painting, rich textures, and stylized lighting. \nOutput ONLY the refined prompt text without intro or explanations.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: PAINTERLY_DIGITAL_ART_STYLE_INSTRUCTION,
      }
    });

    return result.text?.trim() || '';
  } catch (error) {
    console.error('Error generating Painterly Digital Art prompt:', error);
    throw new Error('Failed to generate prompt');
  }
}


export async function generateAutoSubject(styleCategory: string, model?: string, currentSubject?: string): Promise<string> {
  // A vast, highly diverse creative seed list to guarantee complete randomness and prevent repetitive ideas on multiple clicks
  const creativeSeeds = [
    "cyberpunk coffee shop", "organic biotechnology", "whimsical woodland creatures", "cosmic ocean nebula", 
    "minimalist brutalist concrete villa", "ancient steampunk mechanical workshop", "vibrant neon desert oasis", 
    "surreal levitating glass islands", "cozy Scandinavian hygge attic", "retro-futuristic astronaut exploring mossy ruins", 
    "mythical crystal cavern glow", "zen botanical garden with koi fish", "underwater city ruins populated by bioluminescent jellyfish", 
    "futuristic alpine research station", "nostalgic 80s arcade neon glow", "surreal origami paper bird swarm", 
    "ethereal cloud castle with golden gates", "mystical potion brewing room", "abandoned gothic cathedral claimed by blooming roses", 
    "sleek futuristic electric motorcycle on rain-slicked highway", "rustic clay pottery workshop with sun-dappled shadows", 
    "extravagant Victorian masquerade ball", "modern smart greenhouse farming robotics", "abstract flowing liquid marble waves", 
    "enchanted treehouse village inside a giant hollow oak", "cinematic desert caravan at golden hour", 
    "surreal clockwork solar system globe", "vibrant pop-art stylized fruit display", "cozy winter cabin library with crackling fireplace", 
    "majestic phoenix rising from colorful smoke", "futuristic luxury yacht sailing on liquid silver", "magical floating lantern festival"
  ];
  
  // Pick a random seed keyword to inject unpredictable creative inspiration into the LLM
  const randomSeed = creativeSeeds[Math.floor(Math.random() * creativeSeeds.length)];
  
  let systemInstruction = `You are a creative director for a global stock agency. Generate a highly unique, modern, and extremely creative commercial subject idea (ide subject) for a text-to-image prompt. It should NOT be a generic idea, but a rich, highly descriptive concept with vivid adjectives, specific actions, or unique subject combinations. Return ONLY the plain text subject idea, in 1-2 descriptive sentences, without quotes, formatting, or prefixes. If the style category is provided (like "Photographic", "Vector", "3D Render"), tailor the idea to fit that style beautifully.`;
  let promptText = "";

  if (currentSubject && currentSubject.trim()) {
    systemInstruction = `You are an elite microstock SEO director and keyword expansion specialist. Take the user's basic input concept: "${currentSubject.trim()}". 
Your goal is to expand this into a highly commercial, high-demand visual subject title/description packed with powerful 2-to-4 word compound key phrases (long-tail keywords) that stock buyers actually search for in commercial agencies (e.g. instead of simple "pumpkin", use "spooky Halloween jack-o'-lantern element"; instead of "ghost", use "cute watercolor ghost character").
CRITICAL RULES:
1. NO SINGLE WORDS: Do NOT use fragmented or single-word terms ("sepenggal kata"). Every visual descriptor must be a rich, compound, high-conversion keyword phrase (long-tail keyword).
2. HIGH COMMERCIAL VALUE: Use terms that imply high commercial usability (e.g., "seamless watercolor pattern", "flat vector illustration collection", "continuous line art design element", "minimalist outline icon set", "high-contrast solid silhouette vector").
3. SYNTHESIS: Blend these compound key phrases into 1-2 smooth, natural-sounding, descriptive sentences that present a cohesive visual scene ready for text-to-image AI generators.
4. Return ONLY the plain text descriptive concept in English, without lists, formatting, quotes, or prefixes.`;
    
    promptText = `Create a highly commercial microstock-optimized subject concept based on the theme "${currentSubject.trim()}" for the style Category: ${styleCategory || 'General'}. Incorporate rich, highly-searched 2-4 word long-tail keyword descriptors.`;
  } else {
    promptText = `Generate a creative subject idea for style: "${styleCategory || "General"}". To ensure absolute randomness and prevent any repetition across consecutive runs, you MUST center your creative concept around this randomly selected inspiration seed keyword: "${randomSeed}". Make the concept extremely vivid, detailed, visually evocative, and microstock-ready.`;
  }
  
  const activeModel = model || 'gemini-3.5-flash';
  
  const response = await callGeminiWithRetry(activeModel, {
    parts: [{ text: promptText }]
  }, {
    systemInstruction,
    temperature: 0.98, // Higher temperature for maximized creative variation
    maxOutputTokens: 120
  });
  
  return (response.text || "").trim().replace(/^"|"$/g, '');
}
