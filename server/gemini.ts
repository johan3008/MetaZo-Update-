import { GoogleGenAI, Type } from "@google/genai";
import { AsyncLocalStorage } from "node:async_hooks";
import { StockMetadata, ToolType, VideoAnalysisResult, VideoPrompt } from "../types";
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO } from "../constants";
import fs from "node:fs";
import path from "node:path";

// Thread-safe dynamic API Key storage
export const apiKeyStorage = new AsyncLocalStorage<any>();

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

const PROVIDER_ENDPOINTS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  blackbox: 'https://api.blackbox.ai/v1/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
};

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
  mistral: 'pixtral-12b',
  openai: 'gpt-4o-mini',
  openrouter: 'google/gemini-2.0-flash-001',
  blackbox: 'blackboxai',
  nvidia: 'step-3.5-flash',
};

const PROVIDER_FALLBACK_MODELS: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-large-latest',
  openai: 'gpt-4o',
  openrouter: 'anthropic/claude-3.5-haiku',
  blackbox: 'blackboxai-pro',
  nvidia: 'step-3.5-flash',
};

// Provider yang reliable mendukung response_format: json_object
// NOTE: NVIDIA added after testing showed it supports json_object mode for structured output
const SUPPORTS_JSON_MODE = new Set(['groq', 'mistral', 'openai', 'openrouter', 'nvidia', 'blackbox']);

const PROVIDER_ENV_KEYS: Record<string, string> = {
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  blackbox: 'BLACKBOX_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
};

const NON_GEMINI_PROVIDERS = new Set(['groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia']);

/**
 * Ekstrak JSON yang valid dari teks response, toleran terhadap:
 * - markdown code fences (```json ... ```)
 * - teks pengantar/penutup di luar JSON
 * - whitespace ekstra
 */
function extractJSON(raw: string): string {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  const firstBraceIdx = cleaned.indexOf('{');
  const firstBracketIdx = cleaned.indexOf('[');

  let start = -1;
  if (firstBraceIdx === -1) start = firstBracketIdx;
  else if (firstBracketIdx === -1) start = firstBraceIdx;
  else start = Math.min(firstBraceIdx, firstBracketIdx);

  const lastBraceIdx = cleaned.lastIndexOf('}');
  const lastBracketIdx = cleaned.lastIndexOf(']');
  const end = Math.max(lastBraceIdx, lastBracketIdx);

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  } else {
    return "{}";
  }

  return cleaned.trim();
}

// Normalize many possible SDK/HTTP response shapes into a single string
async function extractText(result: any): Promise<string> {
  if (!result) return '';
  if (typeof result === 'string') return result;

  // Some SDKs return an object with a `.text()` async function
  if (typeof result.text === 'function') {
    try {
      const t = await result.text();
      return typeof t === 'string' ? t : JSON.stringify(t);
    } catch (e) {
      // fall through to other detectors
    }
  }

  // Some SDKs return `{ text: string }`
  if (typeof result.text === 'string') return result.text;

  // OpenAI-like HTTP responses
  if (result.choices && Array.isArray(result.choices)) {
    const first = result.choices[0];
    if (first) {
      if (first.message && typeof first.message.content === 'string') return first.message.content;
      if (typeof first.text === 'string') return first.text;
    }
  }

  // Fallback: stringify whatever we have
  try {
    return JSON.stringify(result);
  } catch (e) {
    return String(result);
  }
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
  // This function is intended to call OpenAI-compatible HTTP endpoints (non-Gemini).
  // Default to a non-Gemini provider when none is set in the AsyncLocalStorage.
  // Using 'gemini' here causes an unsupported-endpoint error because Gemini uses
  // the Google GenAI SDK path (`getAIClient()`), not the HTTP endpoints listed
  // in `PROVIDER_ENDPOINTS`.
  const provider = (store && store.provider) || 'openai';

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
    } else {
      apiKey = process.env[PROVIDER_ENV_KEYS[provider]] || '';
    }

      if (!apiKey && provider === 'nvidia') {
      console.warn('NVIDIA key missing. Fallback to Gemini.');
      const fallbackResult = await getAIClient().models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: params.contents,
        config: params.config
      });
      // Normalize varied SDK responses
      return await extractText(fallbackResult);
    }

    if (!apiKey) {
      throw new Error(`API Key untuk ${provider.toUpperCase()} belum dikonfigurasi. Silakan tambahkan Key Anda di pengaturan.`);
    }

    const messages: any[] = [];
    if (params.systemInstruction) {
      messages.push({ role: 'system', content: params.systemInstruction });
    }

    let hasImages = false;
    const contentParts: any[] = [];

    const addPart = (part: any) => {
      if (!part) return;
      if (typeof part === 'string') {
        contentParts.push({ type: 'text', text: part });
      } else if (part.text) {
        contentParts.push({ type: 'text', text: part.text });
      } else if (part.inlineData) {
        hasImages = true;
        // NVIDIA NIM uses different image format than standard OpenAI API
        // Standard OpenAI-compatible API uses 'image_url', but test both
        const imageObj = {
          type: 'image_url',
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        };
        contentParts.push(imageObj);
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

    messages.push({
      role: 'user',
      content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts
    });

    let model = params.model || PROVIDER_DEFAULT_MODELS[provider];

    // Validasi: kalau model yang dipassing user adalah nama model gemini/gemma
    // (artinya caller belum sempat resolve), pakai default provider ini.
    if (model?.startsWith('gemini-') || model?.startsWith('gemma-')) {
      model = PROVIDER_DEFAULT_MODELS[provider];
    }

    // Map the model 'llama-4-scout-17b-16e-instruct' to the exact name required by Groq
    if (provider === 'groq' && model === 'llama-4-scout-17b-16e-instruct') {
      model = 'meta-llama/llama-4-scout-17b-16e-instruct';
    }

    // NVIDIA NIM model name must use 'meta/' prefix for LLaMA models
    if (provider === 'nvidia' && model && model.toLowerCase().includes('llama')) {
      if (!model.startsWith('meta/')) {
        model = 'meta/' + model.replace(/^meta\/?/i, '');
      }
    }

    const payload: any = {
      model,
      messages,
      temperature: params.config?.temperature ?? 0.85,
    };

    if (SUPPORTS_JSON_MODE.has(provider)) {
      payload.response_format = { type: "json_object" };
    }

    if (provider === 'groq' || provider === 'openai' || provider === 'openrouter' || provider === 'nvidia') {
      payload.max_tokens = 8192;
    }

    // CRITICAL: NVIDIA NIM response quality significantly improves with lower temperature for JSON output
    // Default 0.85 often produces malformed/random metadata for NVIDIA
    if (provider === 'nvidia' && params.responseMimeType === 'application/json') {
      payload.temperature = 0.3; // Conservative temperature for structured JSON responses
      console.log(`[callOpenAICompatibleWithRetry] Lowered NVIDIA temperature to 0.3 for JSON mode (was ${params.config?.temperature ?? 0.85})`);
    }

    if (params.responseMimeType === 'application/json') {
      let schemaInstruction = '\n\nIMPORTANT: Start your response DIRECTLY with the opening curly brace "{" (or square bracket "[" if an array is requested) and end exactly with the matching closing character. DO NOT write any introductory or concluding text. DO NOT use markdown code blocks.';
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
    while (tryCount < 2) {
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

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const responseData = await response.json().catch(() => null);
        let answer = await extractText(responseData);
        
        // Added debug logging for NVIDIA to catch malformed responses
        if (provider === 'nvidia' && params.responseMimeType === 'application/json') {
          console.log(`[callOpenAICompatibleWithRetry - NVIDIA] Raw answer preview: ${String(answer).substring(0, 200)}`);
        }
        
        if (!answer || String(answer).trim().length === 0) {
          throw new Error(`Empty response content received from ${provider.toUpperCase()}`);
        }
        if (params.responseMimeType === 'application/json') {
          answer = extractJSON(answer);
          // Validate JSON structure for NVIDIA
          if (provider === 'nvidia') {
            try {
              JSON.parse(answer);
            } catch (parseErr) {
              console.error(`[callOpenAICompatibleWithRetry - NVIDIA] Invalid JSON structure after extraction:`, answer);
              throw new Error(`NVIDIA returned unparseable JSON: ${parseErr}`);
            }
          }
        }
        return answer;
      } catch (err: any) {
        console.error(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] error:`, err);
        lastErr = err;

        const errorMsg = String(err.message || "").toLowerCase();

        if (errorMsg.includes('429') || errorMsg.includes('403') || errorMsg.includes('401') || errorMsg.includes('quota') || errorMsg.includes('exceeded') || errorMsg.includes('exhausted') || errorMsg.includes('limit')) {
          if (providerState && providerState.keys && providerState.activeIndex < keysList.length - 1) {
            const prevIdx = providerState.activeIndex;
            providerState.activeIndex++;
            console.warn(`[Key Rotation - ${provider.toUpperCase()}] Rotating from Key index ${prevIdx} to ${providerState.activeIndex}`);
            break;
          }
        }

        // Automatic model fallback on failure (generic, semua provider)
        if (tryCount === 0) {
          tryCount++;
          const fallback = PROVIDER_FALLBACK_MODELS[provider];
          if (fallback && fallback !== model) {
            model = fallback;
            console.warn(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] Model failed. Falling back to alternative model: ${model} (retry 1/2)`);
            payload.model = model;
            continue;
          }
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
        // This allows hybrid vision tasks (which explicitly request gemini-3.1-flash-lite) to work.
        if (NON_GEMINI_PROVIDERS.has(provider) && !params.model?.startsWith('gemini-') && !params.model?.startsWith('gemma-')) {
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

        const runGemini = async (keyToUse: string | undefined) => {
          if (!keyToUse) {
            throw new Error('GEMINI_API_KEY / API_KEY environment variable is required. Silakan masukkan API Key Gemini Anda terlebih dahulu melalui tombol Pengaturan (ikon Gear) di bagian samping aplikasi.');
          }
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
  maxAttempts: number = 5
): Promise<any> => {
  let lastError: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await getAIClient().models.generateContent({
        model: modelName,
        contents,
        config
      });
    } catch (err: any) {
      lastError = err;
      const statusCode = err.status || err.code;
      
      // Retry on Quota (429) or Server Errors (500, 503, 504)
      if (statusCode === 429 || statusCode >= 500) {
        const errorMsg = String(err.message || err.status || err.details || "").toLowerCase();
        // If it's a hard quota limit or resource exhaustion (as opposed to transient rate limit),
        // let's fail immediately on this model so we can fall back to the next model in modelsToTry without wasting 30+ seconds.
        if (statusCode === 429 && (errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit"))) {
          console.warn(`[callGeminiWithRetry] Hard quota limit hit on ${modelName}. Failing fast to try fallback models.`);
          throw err;
        }

        // Backoff: exponential with jitter
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Gemini Error ${statusCode} on ${modelName}, retrying in ${backoff / 1000}s (attempt ${attempt + 1}/${maxAttempts})...`);
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
  keywordMode?: 'mixed' | 'single' | 'multi'
): Promise<StockMetadata> => {
  const categoriesText = ADOBE_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(', ');
  const shutterstockCategoriesText = (toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(', ');
  
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  const imageParts = frames.map(frame => processFrameServer(frame));

  // Amankan hitungan target keyword sejak awal
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount + 10; // Buffer +10 agar array tetap gemuk setelah deduplikasi

  // Rules for keywords depending on keywordMode
  let keywordRuleSchemaDesc = `List of exactly ${aiRequestCount} high-volume keywords (including single-word and/or multi-word phrases) in English.`;
  let keywordRulePromptText = `1. Start with the most important descriptors first.
2. Include both single-word and/or multi-word phrases (1-3 words) when relevant.
3. Prioritize highly searchable buyer terms.
4. Avoid duplicates and keyword stuffing.
5. Ensure no IP, brands, trademarks, or names are included.
6. Every keyword/phrase must be strictly in lowercase.
7. No subjective or professional aesthetic-only terms ("beautiful", "stunning").`;

  if (keywordMode === 'single') {
    keywordRuleSchemaDesc = `List of exactly ${aiRequestCount} high-volume SINGLE-WORD keywords in English. Strictly avoid multi-word phrases or compound words with spaces.`;
    keywordRulePromptText = `1. Start with the most important descriptors first.
2. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
3. Prioritize highly searchable buyer terms.
4. Avoid duplicates and keyword stuffing.
5. Ensure no IP, brands, trademarks, or names are included.
6. Every keyword must be strictly in lowercase.
7. No subjective or professional aesthetic-only terms ("beautiful", "stunning").`;
  } else if (keywordMode === 'multi') {
    keywordRuleSchemaDesc = `List of exactly ${aiRequestCount} high-volume MULTI-WORD phrase keywords in English. Avoid single-word keywords.`;
    keywordRulePromptText = `1. Start with the most important descriptors first.
2. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords.
3. Prioritize highly searchable buyer terms.
4. Avoid duplicates and keyword stuffing.
5. Ensure no IP, brands, trademarks, or names are included.
6. Every keyword/phrase must be strictly in lowercase.
7. No subjective or professional aesthetic-only terms ("beautiful", "stunning").`;
  }

  // --- TAHAP 1: PROVIDER 1 — MULTI-PROVIDER VISION (VISUAL DETECTION) ---
  let visualFactsJson = "";
  
  console.log(`[JohMeta Pipeline] Stage 1: Running Provider 1 — Multi-Provider Vision (Visual Facts Detection)...`);
  
  let mediaTypeContext = "The provided image is a photograph or digital artwork. Generate natural, human-readable descriptions of concepts and visual facts smoothly.";
  if (toolType === ToolType.VIDEO) {
    mediaTypeContext = "CRITICAL: The provided images are sequential frames (Start, Middle, End) from a single VIDEO. You MUST analyze the continuous motion, narrative progression, concepts, and storyline (alur) across the frames. Do not just describe them individually; synthesize the overall action and concept into natural, coherent metadata.";
  } else if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) {
    mediaTypeContext = "The provided image is a VECTOR illustration preview. Focus on clean layout, graphic elements, main concept, and decorative commercial utility. Generate natural, smooth descriptions.";
  }

  // Vision-capable model fallback chain (using provider from line 547)
  const VISION_MODELS_TAHAP1: Record<string, string[]> = {
    'gemini': ['gemini-3.1-flash-lite', 'gemini-flash-latest'],
    'openai': ['gpt-4-turbo', 'gpt-4o'],
    'openrouter': ['google/gemini-2.0-flash-001', 'openai/gpt-4-turbo'],
    'groq': [], // No vision support
    'mistral': [], // Limited vision
    'blackbox': [],
    'nvidia': ['step-3.5-flash']
  };

  // Build fallback chain for TAHAP 1
  const visionModelsToTry: string[] = [];
  if (VISION_MODELS_TAHAP1[provider]?.length > 0) {
    visionModelsToTry.push(...VISION_MODELS_TAHAP1[provider]);
    console.log(`[JohMeta Pipeline] TAHAP 1 - Trying primary provider ${provider.toUpperCase()}: ${VISION_MODELS_TAHAP1[provider].join(', ')}`);
  }
  visionModelsToTry.push(...VISION_MODELS_TAHAP1['gemini']);
  if (provider !== 'gemini') {
    console.log(`[JohMeta Pipeline] TAHAP 1 - Gemini added as fallback for provider: ${provider}`);
  }
  
  const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. Never hallucinate.
2. Never guess.
3. Never infer hidden information.
4. Never invent objects, actions, locations, professions, events, or concepts not visually supported.
5. If uncertain, omit the information.

STRICT PROHIBITIONS:
Never infer:
* profession
* occupation
* nationality
* ethnicity
* religion
* political affiliation
* location
* country
* city
* event
* season
* relationship
* emotion
* brand
* trademark
* copyrighted character

Examples:
Keyboard ≠ programmer
Blueprint ≠ architect
Camera ≠ photographer
Suit ≠ businessman
Laptop ≠ office worker
Medical mask ≠ doctor

PRIMARY OBJECTIVE:
Detect every visible subject, action, color, visible text, and composition detail.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.
Do not infer hidden context.

Asset Context: ${mediaTypeContext}

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
    "composition": []
  }
}`;

  const promptText = toolType === ToolType.VIDEO 
    ? `Tugas: Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`
    : `Tugas: Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;

  try {
    let visionResponse;
    let lastVisionError: any;

    for (const modelName of visionModelsToTry) {
      try {
        const modelProvider = modelName.includes('gemini') ? 'gemini' : modelName.includes('gpt') ? 'openai' : 'openrouter';
        
        console.log(`[JohMeta Pipeline] TAHAP 1 - Attempting ${modelProvider.toUpperCase()}: ${modelName}`);
        
        if (modelProvider === 'gemini') {
          visionResponse = await callGeminiWithRetry(modelName, { 
            parts: [...imageParts, { text: promptText }] 
          }, {
            systemInstruction: visionSystemInstruction,
            responseMimeType: "application/json",
            temperature: temperature ?? 0.1,
            topP: 0.8,
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
            ]
          });
        } else {
          visionResponse = await callOpenAICompatibleWithRetry({
            systemInstruction: visionSystemInstruction,
            contents: [...imageParts, { text: promptText }],
            responseMimeType: "application/json",
            model: modelName,
            config: { temperature: temperature ?? 0.1 }
          });
        }
        
        visualFactsJson = (await extractText(visionResponse)) || "{}";
        if (!visualFactsJson || visualFactsJson.trim() === "{}") {
          throw new Error("Vision Analysis produced empty results.");
        }
        
        console.log(`[JohMeta Pipeline] TAHAP 1 - SUCCESS with ${modelProvider.toUpperCase()}: ${modelName}`);
        break;
      } catch (err: any) {
        lastVisionError = err;
        console.warn(`[JohMeta Pipeline] TAHAP 1 - Failed with ${modelName}:`, err.message || err);
      }
    }

    if (!visualFactsJson || visualFactsJson.trim() === "{}") {
      throw lastVisionError || new Error("Vision Analysis produced empty results for all providers.");
    }
  } catch (err: any) {
    console.warn("[JohMeta Pipeline] TAHAP 1 - Multi-Provider Vision Stage Failed:", err.message || err);
    // Fallback static facts if all vision providers fail
    visualFactsJson = JSON.stringify({
      VISUAL_FACTS: {
        primary_subjects: [{ name: "main subject", importance: 100 }],
        secondary_subjects: [],
        background_elements: [],
        visible_text: [],
        colors: ["natural"],
        actions: ["commercial poses"],
        composition: ["professional"]
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
    ...(visualFacts.primary_subjects || []),
    ...(visualFacts.secondary_subjects || [])
  ].filter((item: any) => item.importance >= 50).map((item: any) => item.name);

  // --- TAHAP 2 & 3: PROVIDER 2 (GPT ROLE) & PROVIDER 3 (CLAUDE ROLE) — CONTENT GENERATION ---
  console.log(`[JohMeta Pipeline] Stage 2 & 3: Generating Content (Title, Description, Keywords)...`);
  
  const genSystemInstruction = `ROLE:
You are a professional Adobe Stock, Shutterstock, and Canva metadata specialist.

PRIMARY OBJECTIVE:
Generate commercially valuable metadata that accurately describes the visual content and maximizes discoverability while fully complying with Adobe Stock content guidelines.
Generate highly searchable stock titles and exactly ${aiRequestCount} keywords based on the dominant visual subject.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. Never hallucinate.
2. Never guess.
3. Never infer hidden information.
4. Never invent objects, actions, locations, professions, events, or concepts not visually supported.
5. If uncertain, omit the information.

STRICT PROHIBITIONS (Never infer):
profession, occupation, nationality, ethnicity, religion, political affiliation, location, country, city, event, season, relationship, emotion, brand, trademark, copyrighted character.

TITLE RULES:
1. Title must focus on the dominant visual subject.
2. Place the main subject first.
3. Include visual style only if clearly visible.
4. Include supporting objects only if relevant.
5. Use natural English.
6. Use Sentence Case.
7. Length between 70 and 120 characters.
8. No keyword stuffing.
9. No punctuation at the end.
10. No marketing language.

TITLE PRIORITY:
1. Main subject
2. Object type
3. Visual style
4. Supporting element
5. Background or environment

DESCRIPTION RULES:
1. Describe only visible content.
2. Use clear natural English.
3. One complete sentence.
4. Mention important supporting elements.
5. Do not add assumptions.
6. Do not add commercial claims.

KEYWORD RULES:
1. Generate exactly ${aiRequestCount} highly relevant keywords.
2. Order keywords by importance.
3. The first 10 keywords must represent the dominant visual subject.
4. Prioritize buyer search behavior.
5. Use both visual and commercial concepts when supported.
6. Remove weak or generic keywords: beautiful, amazing, stunning, artwork, composition, style, design, creative.
7. No duplicate keywords.
8. All keywords must be lowercase.
9. No trademarks or copyrighted names.

KEYWORD PRIORITY:
Priority 1: Main subject, Species, Object name, Product type.
Priority 2: Supporting objects, Colors, Materials, Actions.
Priority 3: Environment, Commercial concepts, Lifestyle concepts.

AVOID LOW VALUE KEYWORDS:
artwork, beautiful, amazing, stunning, creative, composition, shape, pattern, horizontal, vertical, graphic, design, style. Only use these if they are a major searchable feature.

ADOBE STOCK COMPLIANCE:
No trademarks, brand names, logos, copyrighted characters, celebrity names, misleading keywords, or false descriptions. Metadata must accurately represent the asset.

QUALITY CHECK BEFORE OUTPUT:
* Is every title word visually supported?
* Is every keyword visually supported?
* Is every description statement visually supported?
* Are there any assumptions?
* Are there any brands or trademarks?
* Are there any duplicate keywords?
If any answer is YES, remove the problematic content.

DOMINANT_SUBJECTS (Target these for titles):
${JSON.stringify(dominantSubjects)}

VISUAL_FACTS SOURCE:
${JSON.stringify(visualFacts, null, 2)}

OUTPUT FORMAT:
{
  "title": "",
  "description": "",
  "keywords": []
}`;

  let draftMetadata: any = {};
  try {
    const genResponse = await (NON_GEMINI_PROVIDERS.has(provider) 
      ? callOpenAICompatibleWithRetry({
          systemInstruction: genSystemInstruction,
          contents: `Generate draft metadata based on VISUAL_FACTS. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model
        })
      : callGeminiWithRetry(model && model.startsWith('gemini-') ? model : 'gemini-3.1-flash-lite', { 
          parts: [{ text: `Generate draft metadata based on provided VISUAL_FACTS. [RunID: ${Date.now()}-${Math.random()}]` }] 
        }, {
          systemInstruction: genSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8
        })
    );

    {
      const genText = typeof genResponse === 'string' ? genResponse : await extractText(genResponse);
      draftMetadata = JSON.parse(extractJSON(genText));
    }
  } catch (err) {
    console.error("[JohMeta Pipeline] Generation Stage 2/3 Failed:", err);
    draftMetadata = { title: "Stock asset with professional lighting", description: "Detailed visual content for commercial use.", keywords: ["stock", "asset"] };
  }

  // --- TAHAP 4, 5, & 6: PROVIDER 4 (MISTRAL), 5 (GROK), & 6 (FINAL VALIDATOR) ---
  console.log(`[JohMeta Pipeline] Stage 4, 5 & 6: Auditing, Ranking, and Final Validation...`);

  const validatorSystemInstruction = `ROLE:
You are the Final Quality Validator.

OBJECTIVES:
1. Audit metadata against VISUAL_FACTS. Remove unsupported terms.
2. Sort keywords by relevance.
3. Assign Category IDs.
4. Remove all hallucinated words. Return final approved metadata in JSON.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. Never hallucinate. Never guess. Never infer hidden information.
2. Every word MUST be supported by visible evidence in VISUAL_FACTS.
3. Absolutely NO inference of: profession, occupation, nationality, ethnicity, religion, political affiliation, location, country, city, event, season, relationship, emotion, brand, trademark, copyrighted character.
4. Keep the keyword count exactly at ${aiRequestCount}. Replace speculative keywords with broader visual descriptors to maintain the count.

ADOBE STOCK COMPLIANCE:
No trademarks, brand names, logos, copyrighted characters, celebrity names, misleading keywords, or false descriptions. Sentence case title, no punctuation.

QUALITY CHECK BEFORE OUTPUT:
* Is every word visually supported?
* Are there any assumptions?
* Are there any brands or trademarks?
* Are there any duplicate keywords?
If any answer is YES, remove the problematic content.

VISUAL_FACTS (Source of Truth):
${JSON.stringify(visualFacts, null, 2)}

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadata, null, 2)}

OUTPUT FORMAT:
{
  "title": "",
  "description": "",
  "keywords": [],
  "category_id": 0,
  "shutterstock_category_1": "",
  "shutterstock_category_2": "",
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
          model
        })
      : callGeminiWithRetry(model && model.startsWith('gemini-') ? model : 'gemini-3.1-flash-lite', { 
          parts: [{ text: `Audit and validate the Draft Metadata against VISUAL_FACTS. Return final JSON. [RunID: ${Date.now()}-${Math.random()}]` }] 
        }, {
          systemInstruction: validatorSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8
        })
    );

    {
      const validText = typeof validResponse === 'string' ? validResponse : await extractText(validResponse);
      finalMetadataRaw = JSON.parse(extractJSON(validText));
    }
  } catch (err) {
    console.error("[JohMeta Pipeline] Validation Stage 4/5/6 Failed:", err);
    finalMetadataRaw = { ...draftMetadata, category_id: 1, shutterstock_category_1: "Abstract", shutterstock_category_2: "Art" };
  }

  // --- TAHAP 7: FINAL SANITIZATION & RETURN ---
  try {
    const data = finalMetadataRaw;
    
    // 1. Pembersihan & Penguncian Jumlah Keywords secara Presisi (Hard Slice)
    if (data.keywords && Array.isArray(data.keywords)) {
      let cleanedKeywords: string[] = [];
      
      data.keywords.forEach((k: any) => {
        if (typeof k === 'string') {
          const cleanPhrase = k.toLowerCase()
                               .trim()
                               .replace(/[^a-z0-9\s]/g, '')
                               .replace(/\s+/g, ' ');
          if (cleanPhrase.length > 1) {
            if (keywordMode === 'single') {
              // split any multi-word phrase into individual words
              const pieces = cleanPhrase.split(/\s+/);
              pieces.forEach(word => {
                if (word.length > 1) {
                  cleanedKeywords.push(word);
                }
              });
            } else if (keywordMode === 'multi') {
              // must contain at least one space to be a multi-word phrase
              if (cleanPhrase.includes(' ')) {
                cleanedKeywords.push(cleanPhrase);
              }
            } else {
              cleanedKeywords.push(cleanPhrase);
            }
          }
        }
      });
      
      const uniqueKeywords = Array.from(new Set(cleanedKeywords));
      
      const allowedTerms = [
        ...(visualFacts.primary_subjects || []).map((x: any) => x.name),
        ...(visualFacts.secondary_subjects || []).map((x: any) => x.name),
        ...(visualFacts.actions || []),
        ...(visualFacts.colors || [])
      ].join(" ").toLowerCase();

      // Rule 5: Tambahkan Keyword Validator (Hanya lolos jika keyword memiliki kecocokan kata)
      const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword: string) => {
        const words = keyword.split(" ");
        return words.some(word => allowedTerms.includes(word));
      });

      // Priority: rigorously filtered first, then pad with remaining keywords to approach target count
      const remainingKeywords = uniqueKeywords.filter((k: string) => !rigorouslyFilteredKeywords.includes(k));
      const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];

      data.keywords = finalKeywordList.slice(0, targetCount); // Selalu pas sesuai targetCount pengguna (misal: 40)
    }

    // 2. Sanitasi & Fallback Otomatis Kategori Shutterstock 2 (Anti-Kosong)
    const validShutterstockCats = toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;

    if (!data.shutterstock_category_1 || !validShutterstockCats.includes(data.shutterstock_category_1)) {
      data.shutterstock_category_1 = validShutterstockCats[0] || "Animals/Wildlife";
    }

    if (
      !data.shutterstock_category_2 || 
      !validShutterstockCats.includes(data.shutterstock_category_2) || 
      data.shutterstock_category_2 === data.shutterstock_category_1
    ) {
      const smartFallbackMap: Record<string, string> = {
        "Animals/Wildlife": "Backgrounds/Textures",
        "Backgrounds/Textures": "Abstract",
        "Abstract": "Art",
        "Illustrations": "Graphic Art"
      };

      const customFallback = smartFallbackMap[data.shutterstock_category_1];
      if (customFallback && validShutterstockCats.includes(customFallback)) {
        data.shutterstock_category_2 = customFallback;
      } else {
        data.shutterstock_category_2 = validShutterstockCats.find(cat => cat !== data.shutterstock_category_1) || "Abstract";
      }
    }
    
    return data as StockMetadata;
  } catch (error) {
    console.error("[JohMeta Parse Error] Failed to handle output format:", error);
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
  keywordMode?: 'mixed' | 'single' | 'multi'
): Promise<{id: string, metadata: StockMetadata}[]> => {
  const categoriesText = ADOBE_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(', ');
  const shutterstockCategoriesText = (toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(', ');

  // Amankan hitungan target keyword sejak awal
  const targetCount = parseInt(String(keywordCount), 10) || 60;
  const aiRequestCount = targetCount + 10; 

  // Rules for keywords depending on keywordMode for batch
  let keywordRuleSchemaDesc = `List of exactly ${aiRequestCount} high-volume keywords (including single-word and/or multi-word phrases) in English.`;
  let keywordRulePromptText = `1. Start with the most important descriptors first.
2. Include both single-word and/or multi-word phrases (1-3 words) when relevant.
3. Prioritize highly searchable buyer terms.
4. Avoid duplicates and keyword stuffing.
5. Ensure no IP, brands, trademarks, or names are included.
6. Every keyword/phrase must be strictly in lowercase.
7. No subjective or professional aesthetic-only terms ("beautiful", "stunning").`;

  if (keywordMode === 'single') {
    keywordRuleSchemaDesc = `List of exactly ${aiRequestCount} high-volume SINGLE-WORD keywords in English. Strictly avoid multi-word phrases or compound words with spaces.`;
    keywordRulePromptText = `1. Start with the most important descriptors first.
2. Every keyword MUST be a SINGLE word only. Strictly forbidden from using multi-word phrases or compound words with spaces.
3. Prioritize highly searchable buyer terms.
4. Avoid duplicates and keyword stuffing.
5. Ensure no IP, brands, trademarks, or names are included.
6. Every keyword must be strictly in lowercase.
7. No subjective or professional aesthetic-only terms ("beautiful", "stunning").`;
  } else if (keywordMode === 'multi') {
    keywordRuleSchemaDesc = `List of exactly ${aiRequestCount} high-volume MULTI-WORD phrase keywords in English. Avoid single-word keywords.`;
    keywordRulePromptText = `1. Start with the most important descriptors first.
2. Every keyword MUST be a MULTI-WORD phrase (consisting of 2 or 3 words separated by spaces). Avoid single-word keywords.
3. Prioritize highly searchable buyer terms.
4. Avoid duplicates and keyword stuffing.
5. Ensure no IP, brands, trademarks, or names are included.
6. Every keyword/phrase must be strictly in lowercase.
7. No subjective or professional aesthetic-only terms ("beautiful", "stunning").`;
  }

  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';

  // --- TAHAP 1: PROVIDER 1 — MULTI-PROVIDER VISION (VISUAL DETECTION) UNTUK BATCH ---
  let visualDescriptions: string[] = [];
  let parsedVisualFactsList: any[] = [];
  console.log(`[JohMeta Pipeline - Batch] Stage 1: Running Provider 1 — Multi-Provider Vision (Visual Facts Detection)...`);
  
  // Vision-capable model fallback chain
  const BATCH_VISION_MODELS: Record<string, string[]> = {
    'gemini': ['gemini-3.1-flash-lite', 'gemini-flash-latest'],
    'openai': ['gpt-4-turbo', 'gpt-4o'],
    'openrouter': ['google/gemini-2.0-flash-001', 'openai/gpt-4-turbo'],
    'groq': [],
    'mistral': [],
    'blackbox': [],
    'nvidia': ['step-3.5-flash']
  };

  // Build fallback chain for batch TAHAP 1
  const batchVisionModelsToTry: string[] = [];
  if (BATCH_VISION_MODELS[provider]?.length > 0) {
    batchVisionModelsToTry.push(...BATCH_VISION_MODELS[provider]);
    console.log(`[JohMeta Pipeline - Batch] TAHAP 1 - Trying primary provider ${provider.toUpperCase()}: ${BATCH_VISION_MODELS[provider].join(', ')}`);
  }
  batchVisionModelsToTry.push(...BATCH_VISION_MODELS['gemini']);
  if (provider !== 'gemini') {
    console.log(`[JohMeta Pipeline - Batch] TAHAP 1 - Gemini added as fallback for provider: ${provider}`);
  }

  for (let i = 0; i < items.length; i++) {
      const imageParts = items[i].frames.map(frame => processFrameServer(frame));
      
      let mediaTypeContext = "The provided image is a photograph or digital artwork. Generate natural, human-readable descriptions of concepts and visual facts smoothly.";
      if (toolType === ToolType.VIDEO) {
        mediaTypeContext = "CRITICAL: The provided images are sequential frames (Start, Middle, End) from a single VIDEO. You MUST analyze the continuous motion, narrative progression, concepts, and storyline (alur) across the frames. Do not just describe them individually; synthesize the overall action and concept into natural, coherent metadata.";
      } else if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) {
        mediaTypeContext = "The provided image is a VECTOR illustration preview. Focus on clean layout, graphic elements, main concept, and decorative commercial utility. Generate natural, smooth descriptions.";
      }

      const visionSystemInstruction = `ROLE:
You are a Visual Metadata Analyzer.
Analyze only what is visually verifiable in the image.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. Never hallucinate.
2. Never guess.
3. Never infer hidden information.
4. Never invent objects, actions, locations, professions, events, or concepts not visually supported.
5. If uncertain, omit the information.

STRICT PROHIBITIONS:
Never infer:
* profession
* occupation
* nationality
* ethnicity
* religion
* political affiliation
* location
* country
* city
* event
* season
* relationship
* emotion
* brand
* trademark
* copyrighted character

Examples:
Keyboard ≠ programmer
Blueprint ≠ architect
Camera ≠ photographer
Suit ≠ businessman
Laptop ≠ office worker

PRIMARY OBJECTIVE:
Detect every visible subject, action, color, visible text, and composition detail.
Return JSON ONLY under the key "VISUAL_FACTS".
Do not generate title or keywords.
Do not infer hidden context.

Asset Context: ${mediaTypeContext}

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
    "composition": []
  }
}`;
      
      const promptText = toolType === ToolType.VIDEO 
        ? `Tugas (Asset #${i + 1}): Analyze the 3 video frames (Start, Middle, End). Detect every visible primary and secondary subject, background element, visible text, action, narrative flow, overall storyline (alur), composition, and color. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`
        : `Tugas (Asset #${i + 1}): Detect every visible primary and secondary subject, background element, visible text, action, color, and composition. Return VISUAL_FACTS JSON only. [RunID: ${Date.now()}-${Math.random()}]`;

      let visionResponse;
      let lastVisionError: any;
      let visionSuccess = false;

      for (const modelName of batchVisionModelsToTry) {
        try {
          const modelProvider = modelName.includes('gemini') ? 'gemini' : modelName.includes('gpt') ? 'openai' : 'openrouter';
          
          console.log(`[JohMeta Pipeline - Batch] TAHAP 1 Item #${i+1} - Attempting ${modelProvider.toUpperCase()}: ${modelName}`);
          
          if (modelProvider === 'gemini') {
            visionResponse = await callGeminiWithRetry(modelName, { 
              parts: [...imageParts, { text: promptText }] 
            }, {
              systemInstruction: visionSystemInstruction,
              responseMimeType: "application/json",
              temperature: temperature ?? 0.1,
              topP: 0.8,
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
              ]
            });
          } else {
            visionResponse = await callOpenAICompatibleWithRetry({
              systemInstruction: visionSystemInstruction,
              contents: [...imageParts, { text: promptText }],
              responseMimeType: "application/json",
              model: modelName,
              config: { temperature: temperature ?? 0.1 }
            });
          }
          
          let facts = (await extractText(visionResponse)) || "{}";
          visualDescriptions.push(`ASSET #${i + 1} VISUAL_FACTS:\n${facts}`);
          let parsedFacts: any = {};
          try {
             parsedFacts = JSON.parse(extractJSON(facts)).VISUAL_FACTS || {};
          } catch(e) {
             parsedFacts = { primary_subjects: [], secondary_subjects: [], background_elements: [], visible_text: [], colors: [], actions: [], composition: [] };
          }
          parsedVisualFactsList.push(parsedFacts);
          console.log(`[JohMeta Pipeline - Batch] TAHAP 1 Item #${i+1} - SUCCESS with ${modelProvider.toUpperCase()}: ${modelName}`);
          visionSuccess = true;
          break;
        } catch (err: any) {
          lastVisionError = err;
          console.warn(`[JohMeta Pipeline - Batch] TAHAP 1 Item #${i+1} - Failed with ${modelName}:`, err.message || err);
        }
      }

      if (!visionSuccess) {
          console.warn(`[JohMeta Pipeline - Batch] Vision failed for item ${i}:`, lastVisionError?.message || lastVisionError);
          const assetTypeStr = toolType === ToolType.VIDEO ? "footage video" : toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS ? "vector illustration" : "photograph";
          const fallbackFacts = {
              VISUAL_FACTS: {
                primary_subjects: [{ name: "main subject", importance: 100 }],
                secondary_subjects: [],
                background_elements: [],
                visible_text: [],
                colors: ["natural"],
                actions: ["commercial posing"],
                composition: ["professional"]
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

  const genSystemInstruction = `ROLE:
You are a professional Adobe Stock, Shutterstock, and Canva metadata specialist.

PRIMARY OBJECTIVE:
Generate commercially valuable metadata for each item.
Generate highly searchable stock titles and exactly ${aiRequestCount} keywords for each item based on its dominant visual subject.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. Never hallucinate. Never guess. Never infer hidden information.
2. Never invent objects, actions, locations, professions, events, or concepts not visually supported.
3. If uncertain, omit the information.

STRICT PROHIBITIONS (Never infer):
profession, occupation, nationality, ethnicity, religion, political affiliation, location, country, city, event, season, relationship, emotion, brand, trademark, copyrighted character.

TITLE RULES:
1. Title must focus on the dominant visual subject.
2. Place the main subject first.
3. Include visual style only if clearly visible.
4. Include supporting objects only if relevant.
5. Use natural English.
6. Use Sentence Case.
7. Length between 70 and 120 characters.
8. No keyword stuffing.
9. No punctuation at the end.
10. No marketing language.

TITLE PRIORITY:
1. Main subject
2. Object type
3. Visual style
4. Supporting element
5. Background or environment

DESCRIPTION RULES:
1. Describe only visible content.
2. Use clear natural English.
3. One complete sentence.
4. Mention important supporting elements.
5. Do not add assumptions.
6. Do not add commercial claims.

KEYWORD RULES:
1. Generate exactly ${aiRequestCount} highly relevant keywords per item.
2. Order keywords by importance.
3. The first 10 keywords must represent the dominant visual subject.
4. Prioritize buyer search behavior.
5. Use both visual and commercial concepts when supported.
6. Remove weak or generic keywords: beautiful, amazing, stunning, artwork, composition, style, design, creative.
7. No duplicate keywords.
8. All keywords must be lowercase.
9. No trademarks or copyrighted names.

KEYWORD PRIORITY:
Priority 1: Main subject, Species, Object name, Product type.
Priority 2: Supporting objects, Colors, Materials, Actions.
Priority 3: Environment, Commercial concepts, Lifestyle concepts.

AVOID LOW VALUE KEYWORDS:
artwork, beautiful, amazing, stunning, creative, composition, shape, pattern, horizontal, vertical, graphic, design, style. Only use these if they are a major searchable feature.

ADOBE STOCK COMPLIANCE:
No trademarks, brand names, logos, copyrighted characters, celebrity names, misleading keywords, or false descriptions. Metadata must accurately represent the asset.

QUALITY CHECK BEFORE OUTPUT:
* Is every title word visually supported?
* Is every keyword visually supported?
* Is every description statement visually supported?
* Are there any assumptions?
* Are there any brands or trademarks?
* Are there any duplicate keywords?
If any answer is YES, remove the problematic content.

STRICT DEFINING RULES:
- Return a JSON ARRAY of exactly ${items.length} objects.
- Order MUST match input items exactly.
- Titles: 70-120 chars.
- Keywords: Exactly ${aiRequestCount} items.
- Base everything 100% on the VISUAL_FACTS provided for each asset.

DOMINANT_SUBJECTS (Target these for titles):
${JSON.stringify(dominantSubjectsArray, null, 2)}

SOURCE VISUAL_FACTS:
${visualDescriptions.join('\n\n')}

OUTPUT FORMAT:
[
  { "title": "", "description": "", "keywords": [] },
  ...
]`;

  let draftMetadataArray: any[] = [];
  try {
    const genResponse = await (NON_GEMINI_PROVIDERS.has(provider) 
      ? callOpenAICompatibleWithRetry({
          systemInstruction: genSystemInstruction,
          contents: `Generate draft metadata array based on VISUAL_FACTS for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model
        })
      : callGeminiWithRetry(model && model.startsWith('gemini-') ? model : 'gemini-3.1-flash-lite', { 
          parts: [{ text: `Generate draft metadata array based on provided VISUAL_FACTS source. [RunID: ${Date.now()}-${Math.random()}]` }] 
        }, {
          systemInstruction: genSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8
        })
    );

    {
      const genText = typeof genResponse === 'string' ? genResponse : await extractText(genResponse);
      draftMetadataArray = JSON.parse(extractJSON(genText));
    }
  } catch (err) {
    console.error("[JohMeta Pipeline - Batch] Generation Stage 2/3 Failed:", err);
    draftMetadataArray = items.map(() => ({ title: "Commercial stock asset", description: "High quality visual content.", keywords: ["stock"] }));
  }

  // --- TAHAP 4, 5, & 6: AUDIT, RANK, & VALIDATE BATCH ---
  console.log(`[JohMeta Pipeline - Batch] Stage 4, 5 & 6: Final Validation for ${items.length} items...`);

  const validatorSystemInstruction = `ROLE:
You are the Final Quality Validator.

OBJECTIVES:
1. Audit each item's metadata against its VISUAL_FACTS. Remove unsupported terms.
2. Sort keywords by relevance.
3. Assign Category IDs and return JSON ARRAY.
4. Remove all hallucinated words. Return final approved metadata in JSON array.

ABSOLUTE RULE:
Describe only what is clearly visible in the image.

VISUAL ACCURACY RULES:
1. Never hallucinate. Never guess. Never infer hidden information.
2. Every word MUST be supported by visible evidence in that asset's VISUAL_FACTS.
3. Absolutely NO inference of profession, nationality, ethnicity, religion, location, event, season, relationship, or emotion.
4. Keep the keyword count exactly at ${aiRequestCount}. Replace speculative keywords with broader visual descriptors to maintain the count.

ADOBE STOCK COMPLIANCE:
No trademarks, brand names, logos, copyrighted characters, celebrity names, misleading keywords, or false descriptions. Sentence case title, no punctuation.

QUALITY CHECK BEFORE OUTPUT:
* Is every word visually supported?
* Are there any assumptions?
* Are there any brands or trademarks?
* Are there any duplicate keywords?
If any answer is YES, remove the problematic content.

SOURCE VISUAL_FACTS:
${visualDescriptions.join('\n\n')}

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

DRAFT METADATA TO VALIDATE:
${JSON.stringify(draftMetadataArray, null, 2)}

OUTPUT FORMAT:
[
  {
    "title": "",
    "description": "",
    "keywords": [],
    "category_id": 0,
    "shutterstock_category_1": "",
    "shutterstock_category_2": "",
    "confidence_score": 0.95
  },
  ...
]`;

  let finalMetadataArray: any[] = [];
  try {
    const validResponse = await (NON_GEMINI_PROVIDERS.has(provider) 
      ? callOpenAICompatibleWithRetry({
          systemInstruction: validatorSystemInstruction,
          contents: `Audit and validate the Draft Metadata array for ${items.length} assets. [RunID: ${Date.now()}-${Math.random()}]`,
          responseMimeType: "application/json",
          config: { temperature: temperature ?? 0.1, topP: 0.8 },
          model
        })
      : callGeminiWithRetry(model && model.startsWith('gemini-') ? model : 'gemini-3.1-flash-lite', { 
          parts: [{ text: `Audit and validate the Draft Metadata array for ${items.length} assets based on VISUAL_FACTS. [RunID: ${Date.now()}-${Math.random()}]` }] 
        }, {
          systemInstruction: validatorSystemInstruction,
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
          topP: 0.8
        })
    );

    {
      const validText = typeof validResponse === 'string' ? validResponse : await extractText(validResponse);
      finalMetadataArray = JSON.parse(extractJSON(validText));
    }
  } catch (err) {
    console.error("[JohMeta Pipeline - Batch] Batch Validation Stage 4/5/6 Failed:", err);
    finalMetadataArray = draftMetadataArray.map(d => ({ ...d, category_id: 1, shutterstock_category_1: "Abstract", shutterstock_category_2: "Art" }));
  }

  try {
    const dataArray = finalMetadataArray;

    return dataArray.map((metadata, index) => {
        // 1. Pembersihan & Penguncian Jumlah Keywords secara Presisi
        if (metadata.keywords && Array.isArray(metadata.keywords)) {
            let cleanedKeywords: string[] = [];
            metadata.keywords.forEach((k: any) => {
                if (typeof k === 'string') {
                    const cleanPhrase = k.toLowerCase()
                                         .trim()
                                         .replace(/[^a-z0-9\s]/g, '')
                                         .replace(/\s+/g, ' ');
                    if (cleanPhrase.length > 1) {
                        if (keywordMode === 'single') {
                            // split any multi-word phrase into individual words
                            const pieces = cleanPhrase.split(/\s+/);
                            pieces.forEach(word => {
                                if (word.length > 1) {
                                    cleanedKeywords.push(word);
                                }
                            });
                        } else if (keywordMode === 'multi') {
                            // must contain at least one space to be a multi-word phrase
                            if (cleanPhrase.includes(' ')) {
                                cleanedKeywords.push(cleanPhrase);
                            }
                        } else {
                            cleanedKeywords.push(cleanPhrase);
                        }
                    }
                }
            });
            const uniqueKeywords = Array.from(new Set(cleanedKeywords));
            
            const assetVisualFacts = parsedVisualFactsList[index] || {};
            const allowedTerms = [
              ...(assetVisualFacts.primary_subjects || []).map((x: any) => x.name),
              ...(assetVisualFacts.secondary_subjects || []).map((x: any) => x.name),
              ...(assetVisualFacts.actions || []),
              ...(assetVisualFacts.colors || [])
            ].join(" ").toLowerCase();

            // Rule 5: Tambahkan Keyword Validator
            const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword: string) => {
              const words = keyword.split(" ");
              return words.some(word => allowedTerms.includes(word));
            });

            const remainingKeywords = uniqueKeywords.filter((k: string) => !rigorouslyFilteredKeywords.includes(k));
            const finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];

            metadata.keywords = finalKeywordList.slice(0, targetCount);
        }

        // 2. Sanitasi & Fallback Otomatis Kategori Shutterstock
        const validShutterstockCats = toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES;

        if (!metadata.shutterstock_category_1 || !validShutterstockCats.includes(metadata.shutterstock_category_1)) {
            metadata.shutterstock_category_1 = validShutterstockCats[0] || "Animals/Wildlife";
        }

        if (
          !metadata.shutterstock_category_2 || 
          !validShutterstockCats.includes(metadata.shutterstock_category_2) || 
          metadata.shutterstock_category_2 === metadata.shutterstock_category_1
        ) {
          const smartFallbackMap: Record<string, string> = {
            "Animals/Wildlife": "Backgrounds/Textures",
            "Backgrounds/Textures": "Abstract",
            "Abstract": "Art",
            "Illustrations": "Graphic Art"
          };

          const customFallback = smartFallbackMap[metadata.shutterstock_category_1];
          if (customFallback && validShutterstockCats.includes(customFallback)) {
            metadata.shutterstock_category_2 = customFallback;
          } else {
            metadata.shutterstock_category_2 = validShutterstockCats.find(cat => cat !== metadata.shutterstock_category_1) || "Abstract";
          }
        }

        const targetId = items[index] ? items[index].id : (items[0]?.id || 'unknown');
        return { id: targetId, metadata };
    });
  } catch (error) {
    console.error("[JohMeta Pipeline - Batch] Parse Error:", error);
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
}): Promise<{ prompts: string[]; negativePrompt: string; styleExplanation: string[] }> => {
  const { 
    subject, 
    styleCategory, 
    variation, 
    promptMode = 'background', 
    pngBgColor = 'white', 
    userNegativePrompt = '',
    minWords = 10,
    maxWords = 70
  } = options;

  const count = Math.min(Math.max(variation, 10), 150);

  // ELEMEN KEJUTAN (Surprise Element) - Random Salt Injection
  const daftarCuaca = ["hujan deras", "kabut tebal", "matahari terbenam", "badai petir", "salju", "sinar fajar", "gerimis tipis", "pelangi muncul", "kilat di kejauhan", "embun pagi"];
  const daftarSuasana = ["sinematik", "dramatis", "tenang", "penuh aksi", "misterius", "epik", "nostalgia", "futuristik", "melankolis", "ceria"];
  
  const cuacaAcak = daftarCuaca[Math.floor(Math.random() * daftarCuaca.length)];
  const suasanaAcak = daftarSuasana[Math.floor(Math.random() * daftarSuasana.length)];
  const angkaAcak = Math.floor(Math.random() * 10000);
  
  const randomSaltInjection = `[Suntikan Variasi Acak: ${cuacaAcak}, suasana ${suasanaAcak}, ID Unik: ${angkaAcak}]`;

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
    "Lowpoly": ' - Focus on visible geometric triangular facets, faceted surfaces, and stylized abstract crystalline structures.',
    "3D CGI": ' - Focus on clean computer-generated imagery with perfect geometry. Emphasize synthetic materials like smooth plastic, polished glass, sleek metal, or vibrant gel. Use highly controlled studio lighting or global illumination. The result should look like a high-end digital render from Blender or Cinema 4D, NOT a real-world photograph. AVOID: Photorealistic textures, natural imperfections, and real camera noise.',
    "Cinematic": ' - Focus on professional movie-set composition while maintaining high commercial value. Prioritize: Clear subject (must occupy at least 30% of visual attention), realistic action, clean composition with copy space, and authentic natural lighting. The commercial concept must be immediately understandable. AVOID: Overly cinematic scenes, industrial docks, film noir, excessive volumetric mist, or unrealistic visual effects. REDUCE use of words: "cinematic", "anamorphic", "volumetric mist", "epic", "dramatic", "moody", "film noir". INCREASE use of words: "authentic", "realistic", "professional photography", "natural lighting", "copy space", "commercial concept", "clean composition".',
    "Photorealistic": ' - Generate photorealistic stock photography prompts. Requirements: Authentic real-world photography, realistic people and environments, natural poses and actions, authentic lighting, realistic proportions, genuine human expressions, captured by a professional photographer. Include real-world camera settings (lens type and aperture), professional photography composition, natural imperfections allowed, and commercially usable. AVOID: Cinematic effects, unrealistic locations, fantasy elements, hyper-dramatic lighting, CGI appearance, and overly artistic descriptions. Use words like: "authentic", "realistic", "professional photography", "natural lighting", "copy space", "commercial concept", "clean composition", "genuine expressions", "realistic proportions".',
    "Anime/Manga": ' - Focus on cel-shaded aesthetics, expressive character features, vibrant colors, and classic Japanese hand-drawn illustration styles.',
    "Watercolor Painting": ' - Focus on flowing pigment washes, paper grain textures, organic color bleeds, and delicate artistic strokes.',
    "Oil Painting": ' - Focus on heavy brushstrokes, impasto textures, rich pigment layers, and classical fine art canvas aesthetics.',
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
3. Materials and textures: Detail the surfaces, physical properties, and tactile qualities.
4. Environment: Only introduce environmental details if they naturally fit the theme. Do not introduce unrelated environments.
5. Lighting: Essential details about mood, shadows, and light sources.
6. Camera details: Specific lens types, aperture, and camera angles.${styleCategory !== 'Abstract' ? '' : ' EXCLUDE FOR ABSTRACT STYLE.'}

Rules for the Generated Prompts:
0. PROMPT STRUCTURE FORMULA: Every prompt MUST strictly start with "${styleCategory}" and then follow this sequence: [Subject] [Action] [Visual Characteristics] [Materials/Textures] [Environment] [Lighting]${styleCategory !== 'Abstract' ? ' [Camera Details]' : ''} [Commercial Intent]. Combine these elements into a fluid, professional magazine editorial-style description.
0.1 COMMERCIAL PRIORITY: The subject must occupy at least 30% of the visual attention. The commercial concept must be immediately understandable.
1. ALWAYS translate the core subject "${subject}" to descriptive, high-quality, vivid English first if it was entered in another language (like Indonesian).
2. Return EXACTLY ${count} unique prompt variations as an array. Each must be distinct, professionally composed for commercial photography, use distinct camera settings, lighting, ambient conditions, and include "copy space" (negative space) for text placement.
3. WORD COUNT CONSTRAINT: Each generated prompt SHOULD be between ${minWords} and ${maxWords} words long. Adjust the level of detail to strictly match this requested length profile.
4. COMMERCIAL STOCK COMPLIANCE: Focus on clean, high-resolution, sharp focus, uncluttered, professional editorial photography/art aesthetics, suitable for Shutterstock/Adobe Stock. Absolutely avoid trademarked logos or specific intellectual property.
5. NO KEYWORD SPAM: Strictly forbidden to provide a list of repetitive commas, keywords, or SEO tags. Describe the *composition* naturally and vividly (like a magazine editorial).
6. The list must contain exactly ${count} different strings. Do not repeat prompts.
7. The negativePrompt MUST be a single concise string starting with the word "Avoid" followed by a list of elements to exclude. If there are truly no relevant negative elements for a specific request, return an empty string for this field instead of using placeholders like "none" or "N/A".
8. CRITICAL QUALITY DIRECTIVE: This is for high-fidelity text-to-image generator prompts (e.g. Midjourney). Each prompt variation must read like a gorgeous, professional image description, not a database search query.
9. CRITICAL: Conform exactly to the requested JSON schema.
10. ATURAN KETAT ANTI-KEMIRIPAN (ANTI-SIMILARITY RULE):
    Setiap kali user melakukan generate ulang pada tema atau style yang sama, Anda WAJIB merombak total elemen-elemen berikut agar hasil gambar berikutnya tidak mirip (completely distinct):
    1. Rombak Pose & Aksi Subjek: Jika sebelumnya subjek sedang diam/menghadap kamera, ubah menjadi sedang beraksi, berbalik badan, atau melihat ke arah lain.
    2. Rombak Komposisi & Sudut Kamera: Acak secara ekstrem (misal: dari close-up fokus detail, ubah total menjadi wide-shot yang memperlihatkan seluruh lingkungan).
    3. Rombak Latar Belakang (Background): Ganti suasana lingkungan. Jika sebelumnya di dalam ruangan (indoor), ubah menjadi di luar ruangan (outdoor), atau ganti elemen interiornya secara total.
    4. Rombak Pencahayaan & Warna: Ubah palet warna dominan dan waktu (misal: dari terang benderang siang hari menjadi siluet malam hari dengan kontras tinggi).
    5. Tambahkan Detail Konseptual Baru: Masukkan satu elemen atau properti unik yang tidak ada di prompt sebelumnya untuk membedakan cerita di dalam gambar.
    6. Elemen Kejutan: Setiap kali membuat prompt, tambahkan satu detail kecil atau objek pendukung secara acak yang relevan dengan tema, namun sering terabaikan (misalnya: menambahkan efek cuaca, partikel debu yang melayang, pantulan cermin, embun pagi, atau interaksi unik dengan benda di sekitar). Manfaatkan "Suntikan Variasi Acak" yang diberikan sebagai pemicu kreativitas untuk detail ini.
    Dilarang keras mengulang pola kalimat atau struktur prompt yang mirip dari iterasi sebelumnya. Hasil akhir harus berupa deskripsi visual yang segar dan unik.
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

  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
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
          config: { temperature: 0.85 }
        });
        
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
           // Reuse the validation/padding logic by breaking out and returning
           return processPromptResults(parsed, count, subject, userNegativePrompt);
        }
      } catch (err: any) {
        lastError = err;
        attempts++;
        console.warn(`Error on ${provider.toUpperCase()} on attempt ${attempts}:`, err.message || err);
        if (attempts < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else {
    for (const modelName of modelsToTry) {
      let attempts = 0;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        try {
          console.log(`[generateOptimizedPrompt] Attempting with model ${modelName} (attempt ${attempts + 1}/${maxAttempts})...`);
          const response = await getAIClient().models.generateContent({
            model: modelName,
            contents: { parts: [{ text: `Expand the concept into ${count} unique immersive prompt variations of type "${styleCategory}" based on: "${subject}".\n\nCRITICAL: Write fully formed, vivid natural language sentences. DO NOT use comma-separated keyword lists or tags. Each variation MUST be a complete, descriptive paragraph.` }] },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema,
              temperature: 0.85
            }
          });

          const text = (await extractText(response)) || "{}";
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
            return processPromptResults(parsed, count, subject, userNegativePrompt);
          }
        } catch (err: any) {
          lastError = err;
          attempts++;
          console.warn(`Error on ${modelName} on attempt ${attempts}:`, err.message || err);
          if (attempts < maxAttempts) {
            const backoffTime = attempts * 1500;
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      }
    }
  }

  console.error("All AI models and attempts failed for Prompt Generation. Failing back to programmatic fallback...", lastError);

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
  styleCategory: string = 'Cinematic'
): Promise<{ prompt: string; description: string }> => {
  const store = apiKeyStorage.getStore();
  const primaryProvider = (store && store.provider) || 'gemini';

  // Vision-capable model fallback chain for each provider
  const VISION_MODELS: Record<string, string[]> = {
    'gemini': ['gemini-3.1-flash-lite', 'gemini-flash-latest'],
    'openai': ['gpt-4-turbo', 'gpt-4o'],
    'openrouter': ['google/gemini-2.0-flash-001', 'openai/gpt-4-turbo', 'anthropic/claude-3.5-sonnet'],
    'groq': [], // Groq doesn't support vision well for this type of analysis
    'mistral': [], // Mistral vision support is limited
    'blackbox': [],
    'nvidia': ['step-3.5-flash']  // NVIDIA has some vision models
  };

  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided image and generate a highly detailed, professional text-to-image prompt.

STEP 1: EXTRACT THE FOLLOWING DATA POINTS:
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
2. The description should be a concise summary of the visual analysis.
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
  
  // Build fallback chain: primary provider → alternative providers → Gemini
  const modelsToTry: string[] = [];
  if (VISION_MODELS[primaryProvider]?.length > 0) {
    modelsToTry.push(...VISION_MODELS[primaryProvider]);
    console.log(`[analyzeImageToPrompt] Trying primary provider ${primaryProvider.toUpperCase()}: ${VISION_MODELS[primaryProvider].join(', ')}`);
  }
  // Always add Gemini as final fallback
  modelsToTry.push(...VISION_MODELS['gemini']);
  if (primaryProvider !== 'gemini') {
    console.log(`[analyzeImageToPrompt] Gemini added as fallback for provider: ${primaryProvider}`);
  }

  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      const provider = modelName.includes('gemini') || modelName.includes('gpt') || modelName.includes('claude') ? 
        (modelName.includes('gemini') ? 'gemini' : modelName.includes('gpt') ? 'openai' : 'openrouter') : 
        primaryProvider;
      
      console.log(`[analyzeImageToPrompt] Attempting ${provider.toUpperCase()}: ${modelName}`);
      
      if (provider === 'gemini') {
        response = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: `Analyze this image and generate an optimized prompt for style: ${styleCategory}` }] }, {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.3
        });
      } else {
        // Use HTTP endpoint for non-Gemini providers
        response = await callOpenAICompatibleWithRetry({
          systemInstruction,
          contents: [imagePart, { text: `Analyze this image and generate an optimized prompt for style: ${styleCategory}` }],
          responseMimeType: "application/json",
          responseSchema,
          model: modelName,
          config: { temperature: 0.3 }
        });
      }
      
      console.log(`[analyzeImageToPrompt] SUCCESS with ${provider.toUpperCase()} model: ${modelName}`);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[analyzeImageToPrompt] Failed with ${modelName}:`, err.message);
    }
  }

  if (!response) {
    console.error("analyzeImageToPrompt Error - all models failed:", lastError);
    throw new Error("Failed to analyze image with any provider. Please try again.");
  }

  try {
    let text = (await extractText(response)) || "{}";
    // Clean potential markdown backticks
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    const data = JSON.parse(text);
    return data as { prompt: string; description: string };
  } catch (error) {
    const raw = await extractText(response);
    console.error("Gemini Parse Error:", error, raw);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

export const analyzeBatchImageToPrompt = async (
  images: string[],
  styleCategory: string = 'Cinematic'
): Promise<{ prompt: string; description: string }[]> => {
  const store = apiKeyStorage.getStore();
  const primaryProvider = (store && store.provider) || 'gemini';

  // Vision-capable model fallback chain
  const VISION_MODELS: Record<string, string[]> = {
    'gemini': ['gemini-3.1-flash-lite', 'gemini-flash-latest'],
    'openai': ['gpt-4-turbo', 'gpt-4o'],
    'openrouter': ['google/gemini-2.0-flash-001', 'openai/gpt-4-turbo'],
    'groq': [],
    'mistral': [],
    'blackbox': [],
    'nvidia': ['step-3.5-flash']
  };

  const systemInstruction = `You are an expert AI visual analyst and prompt engineer.
Analyze the provided images and generate a highly detailed, professional text-to-image prompt for each one.

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

  // Build fallback chain
  const modelsToTry: string[] = [];
  if (VISION_MODELS[primaryProvider]?.length > 0) {
    modelsToTry.push(...VISION_MODELS[primaryProvider]);
    console.log(`[analyzeBatchImageToPrompt] Trying primary provider ${primaryProvider.toUpperCase()}: ${VISION_MODELS[primaryProvider].join(', ')}`);
  }
  modelsToTry.push(...VISION_MODELS['gemini']);
  if (primaryProvider !== 'gemini') {
    console.log(`[analyzeBatchImageToPrompt] Gemini added as fallback for provider: ${primaryProvider}`);
  }

  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      const provider = modelName.includes('gemini') ? 'gemini' : modelName.includes('gpt') ? 'openai' : 'openrouter';
      
      console.log(`[analyzeBatchImageToPrompt] Attempting ${provider.toUpperCase()}: ${modelName} for ${images.length} images`);
      
      if (provider === 'gemini') {
        response = await callGeminiWithRetry(modelName, { parts }, {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.3
        });
      } else {
        response = await callOpenAICompatibleWithRetry({
          systemInstruction,
          contents: parts,
          responseMimeType: "application/json",
          responseSchema,
          model: modelName,
          config: { temperature: 0.3 }
        });
      }
      
      console.log(`[analyzeBatchImageToPrompt] SUCCESS with ${provider.toUpperCase()}: ${modelName}`);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[analyzeBatchImageToPrompt] Failed with ${modelName}:`, err.message);
    }
  }

  if (!response) {
    console.error("analyzeBatchImageToPrompt Error - all models failed:", lastError);
    throw new Error("Failed to analyze images in batch with any provider.");
  }

  try {
    let text = (await extractText(response)) || "[]";
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    const data = JSON.parse(text);
    return data as { prompt: string; description: string }[];
  } catch (error) {
    const raw = await extractText(response);
    console.error("Gemini Parse Error:", error, raw);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

export const analyzeVideoKeyword = async (keyword: string): Promise<VideoAnalysisResult> => {
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

  const response = await getAIClient().models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
      },
    },
  });

  {
    const raw = await extractText(response);
    return JSON.parse(raw) as VideoAnalysisResult;
  }
};

export async function generateHollywoodPrompts(keyword: string): Promise<VideoPrompt[]> {
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

  const response = await getAIClient().models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
      }
    },
  });

  const parsed = JSON.parse(await extractText(response)) as Omit<VideoPrompt, 'id'>[];
  const timestamp = Date.now();
  return parsed.map((p, index) => ({
    ...p,
    id: `hw-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
  }));
}export async function checkImageQuality(image: string, tolerance: 'STRICT' | 'MEDIUM' | 'LOOSE' = 'MEDIUM') {
  const systemInstruction = `Anda adalah Agen Quality Assurance (QA) Senior yang dilatih khusus berdasarkan standar Adobe Stock Global. Tugas Anda adalah melakukan inspeksi visual "Zero Tolerance" terhadap gambar stok komersial sebelum proses upload.

Tingkat Toleransi Saat Ini: ${tolerance} (Gunakan ini untuk menentukan ambang batas ketegasan Anda).

A. CEK LIST PEMBATALAN OTOMATIS (Known Restrictions)
Berdasarkan kebijakan Adobe Stock, Anda wajib menandai FAIL jika mendeteksi hal berikut, bahkan jika tidak ada logo yang terlihat jelas:

1. Arsitektur & Lokasi Terbatas (Subjek Utama)
- Eropa: Menara Eiffel (malam hari/lampu menyala), Atomium (Brussel), interior Katedral Berlin, properti Kerajaan Inggris (Buckingham Palace, dll), Agriturismo Baccoleno (pemandangan pohon cemara ikonik).
- Amerika: Sign "Beverly Hills", Hollywood Sign, Gedung Flatiron (NYC), interior Chrysler Building, Empire State Building (sebagai fokus utama), properti Walt Disney/Disneyland.
- Global: Burj Al Arab, Bahrain World Trade Center, Beijing National Stadium (Bird's Nest), dan Museum Guggenheim.

2. Produk & Desain Industri yang Dilindungi
- Gawai & Teknologi: Semua produk Apple (iPhone, MacBook, Apple Watch), Amazon (Kindle, Echo), dan desain antarmuka (UI) media sosial (ikon Like, interface Instagram/TikTok).
- Transportasi: Bentuk ikonik Airstream (perak membulat), kapal pesiar Aida (wajah tersenyum), mobil Porsche (siluet 911), Vespa (desain bodi), dan Harley Davidson.
- Mainan & Hiburan: Karakter LEGO/Minifigures, Boneka Barbie, Rubik’s Cube, patung Oscar (Academy Awards), Batmobile, dan kostum superhero yang mirip Marvel/DC.

3. Branding & Identitas Visual
- Fashion: Desain "3-Stripes" Adidas, pola kotak-kotak Burberry, sol merah Christian Louboutin, dan logo pada kacamata atau jam tangan.
- Lainnya: Botol Absolut Vodka, Bendera Aboriginal Australia, dan segala bentuk mata uang asli yang terlihat jelas.

B. KRITERIA EVALUASI TEKNIS & LEGAL
- IP & Merek Dagang: Cari logo kecil atau nama merek pada kancing baju, ban mobil, atau label di kerah pakaian. Hapus secara digital atau tandai gagal.
- Kemiripan Tokoh (Likeness): Deteksi wajah yang menyerupai tokoh publik (contoh: kemiripan dengan Albert Einstein, Bruce Lee, atau aktor terkenal).
- Kebersihan Konten (Clean Content): Gambar tidak boleh mengandung teks buatan, metadata visual (tanggal/jam), garis koordinat, atau elemen grafis overlay.
- Kualitas AI (Artifacts): Periksa kesalahan anatomi (jari ke-6, mata tidak simetris), tekstur "halus" berlebihan khas AI, atau distorsi pada garis arsitektur.

STATUS & SKOR:
- PASS: Jika gambar bersih (Clean) secara legal dan teknis memenuhi standar komersial. Skor biasanya 70-100.
- FAIL: Jika ditemukan pelanggaran IP, artifak AI yang mengganggu, atau masalah teknis fatal. Skor biasanya 0-69.
- Konsistensi: Jangan memberikan skor tinggi (>= 70) jika statusnya FAIL, kecuali ada alasan sangat spesifik (misal: secara teknis bagus tapi ada logo kecil). Namun, dahulukan penolakan jika ada pelanggaran kebijakan.

PIXEL HEATMAPS (Untuk visualisasi UI):
- Identifikasi 3-8 titik koordinat (X, Y dalam 0-100) di mana terdapat masalah teknis atau legal nyata (Noise, Focus, Lighting, atau IP Violations).

Respons Anda WAJIB dalam format JSON:
{
  "recommendation": "PASS" atau "FAIL",
  "overall_score": [0-100],
  "legal_status": "Status legal singkat (misal: 'CLEAN' atau 'IP VIOLATION: Burj Al Arab detected')",
  "technical_issues": ["list masalah teknis/isue spesifik"],
  "strengths": ["list kekuatan visual gambar"],
  "detailed_feedback": "Penjelasan singkat namun spesifik mengenai alasan kelulusan atau detail kegagalan (Evaluasi Notes)",
  "heatmaps": [
    { "type": "noise" | "focus" | "lighting", "x": 0..100, "y": 0..100, "intensity": 0.0..1.0, "raw_value": "Detail spesifik temuan" }
  ]
}
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
        legal_status: { type: Type.STRING },
        technical_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        overall_score: { type: Type.NUMBER },
        recommendation: { type: Type.STRING, enum: ["PASS", "FAIL"] },
        detailed_feedback: { type: Type.STRING },
        heatmaps: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ["noise", "focus", "lighting"] },
                    x: { type: Type.INTEGER },
                    y: { type: Type.INTEGER },
                    intensity: { type: Type.NUMBER },
                    raw_value: { type: Type.STRING }
                },
                required: ["type", "x", "y", "intensity", "raw_value"]
            }
        }
    },
    required: ["legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "heatmaps"]
  };

  const imagePart = processFrameServer(image);
  
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      response = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: "Act as a ruthless Adobe Stock curator. Perform a strict technical and legal audit. Determine final status as PASS or FAIL." }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1
      });
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[checkImageQuality] Failed with ${modelName}:`, err.message || err);
    }
  }

  if (!response) throw lastError;
  
  try {
    const text = (await extractText(response)) || "{}";
    console.log('Gemini raw response:', text);
    return JSON.parse(text);
  } catch(e) {
    const raw = await extractText(response);
    console.error("Gemini Parse Error:", raw);
    throw e;
  }
}

export async function generateCalendarEvents(month: string) {
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
   - suggested_topics: 5-8 specific keywords or subjects.

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

  const response = await getAIClient().models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `Find and list ALL major and niche commercial events, holidays, and perayaan negara for the month of ${month}. Be very detailed and comprehensive so content creators have many ideas to choose from.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.8
    }
  });

  const raw = await extractText(response);
  return JSON.parse(raw);
}

export async function generateEventKeywords(eventName: string, eventDetails: string) {
  const systemInstruction = `You are an expert AI Stock Photographer and Keyword Specialist. 
Your job is to generate a list of highly commercial, descriptive, and specific keywords/subjects for a given event.
These keywords should be optimized for AI Image Generation prompts.

Rules:
1. Provide 15-20 varied keywords or short phrases.
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

  const response = await getAIClient().models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `Generate a list of commercial stock photography/illustration keywords for this event: "${eventName}". Context: ${eventDetails}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.8
    }
  });

  const raw = await extractText(response);
  return JSON.parse(raw);
}

export async function suggestKeywords(
  title: string,
  description: string,
  existingKeywords: string[]
): Promise<string[]> {
  const systemInstruction = `You are a professional SEO and Adobe Stock Keyword Specialist.
Your task is to analyze the existing title, description, and list of keywords of an asset, and suggest exactly 5 high-volume, generic, relevant keywords or short conceptual phrases that are currently missing from the user's list.
These suggested keywords must be highly searchable, commercial, and directly related to the visual subject and context described in the title and description, while not repeating any existing keywords.

Rules:
1. Suggest EXACTLY 5 new, unique, generic keywords. Do not suggest more, do not suggest less.
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

  const response = await getAIClient().models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `Suggest 5 missing SEO keywords for this asset:
Title: "${title}"
Description: "${description}"
Existing Keywords: ${existingKeywords.join(', ')}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3
    }
  });

  try {
    const raw = await extractText(response);
    const parsed = JSON.parse(raw);
    return parsed.keywords || [];
  } catch (err) {
    console.error("Failed to parse suggested keywords:", err);
    return [];
  }
}

