import { GoogleGenAI, Type } from "@google/genai";
import { AsyncLocalStorage } from "node:async_hooks";
import { StockMetadata, ToolType, VideoAnalysisResult, VideoPrompt } from "../types";
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO } from "../constants";

// Thread-safe dynamic API Key storage
export const apiKeyStorage = new AsyncLocalStorage<any>();

// Initialize lazy backend Google GenAI SDK.
let aiClient: GoogleGenAI | null = null;

async function callOpenAICompatibleWithRetry(params: {
  systemInstruction?: string;
  contents: any;
  responseMimeType?: string;
  responseSchema?: any;
  config?: any;
}): Promise<string> {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  if (provider !== 'groq' && provider !== 'mistral') {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const providerState = store?.[provider];
  const keysList = (providerState && providerState.keys) || [];
  const maxRotationAttempts = keysList.length > 0 ? keysList.length : 1;
  let lastErr: any;

  for (let rot = 0; rot < maxRotationAttempts; rot++) {
    let apiKey = '';
    
    if (keysList.length > 0) {
      const activeIdx = providerState.activeIndex || 0;
      apiKey = keysList[activeIdx];
    } else {
      apiKey = provider === 'groq' ? (process.env.GROQ_API_KEY || '') : (process.env.MISTRAL_API_KEY || '');
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

    messages.push({
      role: 'user',
      content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts
    });

    let model = '';
    let endpoint = '';
    if (provider === 'groq') {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      // User specifically requested Llama 4 Scout 17B, but since it's giving a 404
      // for some API keys, we will use the exact HuggingFace-style ID that Groq uses
      // in their docs, and if it fails with 404, we'll implement a fallback below.
      model = hasImages ? 'llama-3.2-11b-vision-preview' : 'llama-4-scout-17b-16e-instruct-preview';
    } else {
      endpoint = 'https://api.mistral.ai/v1/chat/completions';
      model = hasImages ? 'pixtral-12b' : 'mistral-large-latest';
    }

    const payload: any = {
      model,
      messages,
      temperature: params.config?.temperature ?? 0.85,
    };

    if (params.responseMimeType === 'application/json') {
      let schemaInstruction = '\\n\\nIMPORTANT: You MUST return ONLY valid JSON. No conversational text.';
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

    const endpointOrigin = endpoint;
    const modelOrigin = model;

    let tryCount = 0;
    while (tryCount < 2) {
      try {
        console.log(`[callOpenAICompatibleWithRetry] Fetching ${provider.toUpperCase()} completions with model ${model}...`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const responseData = await response.json();
        let answer = responseData.choices?.[0]?.message?.content;
        if (!answer) {
          throw new Error(`Empty response content received from ${provider.toUpperCase()}`);
        }
        if (params.responseMimeType === 'application/json') {
          answer = answer.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        return answer;
      } catch (err: any) {
        console.error(`[callOpenAICompatibleWithRetry - ${provider.toUpperCase()}] error:`, err);
        lastErr = err;
        
        // Fallback for Llama 4 Scout if model doesn't exist
        const errorMsg = String(err.message || "").toLowerCase();
        if (tryCount === 0 && provider === 'groq' && errorMsg.includes('model_not_found')) {
          console.warn(`[callOpenAICompatibleWithRetry] Model ${model} not found, falling back to Llama 3.`);
          model = hasImages ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
          payload.model = model;
          tryCount++;
          continue;
        }

        if (errorMsg.includes('429') || errorMsg.includes('403') || errorMsg.includes('401') || errorMsg.includes('quota') || errorMsg.includes('exceeded') || errorMsg.includes('exhausted') || errorMsg.includes('limit')) {
          if (providerState && providerState.keys && providerState.activeIndex < keysList.length - 1) {
            const prevIdx = providerState.activeIndex;
            providerState.activeIndex++;
            console.warn(`[Key Rotation - ${provider.toUpperCase()}] Rotating from Key index ${prevIdx} to ${providerState.activeIndex}`);
            // Break the tryCount loop to let the outer key rotation loop take over
            break; 
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

        if (provider === 'groq' || provider === 'mistral') {
          const text = await callOpenAICompatibleWithRetry({
            systemInstruction: params.config?.systemInstruction,
            contents: params.contents,
            responseMimeType: params.config?.responseMimeType,
            responseSchema: params.config?.responseSchema,
            config: params.config
          });
          return { text };
        }

        let key = process.env.GEMINI_API_KEY;
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
            throw new Error('GEMINI_API_KEY environment variable is required');
          }
          const client = new GoogleGenAI({
            apiKey: keyToUse,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          return await client.models.generateContent(params);
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
  toolType: ToolType = ToolType.IMAGE
): Promise<StockMetadata> => {
  const categoriesText = ADOBE_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(', ');
  const shutterstockCategoriesText = (toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(', ');
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Impactful title in Sentence case (max 150 chars, no commas). It MUST combine 3 aspects: what is in the asset (subject/objects), the action/flow (movement/progression), and the concept (theme/mood).',
      },
      description: {
        type: Type.STRING,
        description: 'Detailed visual description (colors, elements, mood) followed by a sentence starting with "Ideal for..." suggesting potential uses, max 200 chars.',
      },
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `List of exactly ${keywordCount} conceptual and descriptive keywords in English, ordered by relevance. CRITICAL: Use only single words; no multi-word phrases.`,
      },
      category_id: {
        type: Type.INTEGER,
        description: 'The most accurate Adobe Stock category ID.',
      },
      shutterstock_category_1: {
        type: Type.STRING,
        description: 'The primary Shutterstock category. Must be exactly one of the provided Shutterstock categories.',
      },
      shutterstock_category_2: {
        type: Type.STRING,
        description: 'The secondary Shutterstock category. Must be exactly one of the provided Shutterstock categories, and MUST BE DIFFERENT from shutterstock_category_1.',
      }
    },
    required: ["title", "description", "keywords", "category_id", "shutterstock_category_1", "shutterstock_category_2"],
  };

  let mediaContext = "The provided image is a photograph or digital image.";
  if (toolType === ToolType.VIDEO) {
      mediaContext = "CRITICAL: The provided images are sequential frames (Start, Middle, and End) extracted from a single VIDEO or ANIMATION. You MUST describe the overall motion, action, flow, and subject of the video as a single continuous scene based on these three sequential frames. Treat it as one cohesive video clip.";
  } else if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) {
      mediaContext = "The provided image is a preview of a VECTOR graphic or illustration. CRITICAL: DO NOT start titles with 'Vector of', 'Illustration of', 'Drawing of', or 'Continuous line drawing of'. Focus entirely on describing the main subject or object directly. Note: Previews are generated with a flat background. Do not mention or describe the background explicitly unless it is clearly an integral part of the composition.";
  }

  const systemInstruction = `You are a professional Adobe Stock and Shutterstock metadata specialist. 
Your goal is to maximize the discoverability of visual assets.
OUTPUT MUST BE IN ENGLISH for titles and keywords.

${mediaContext}

CRITICAL CREATIVE DIVERSITY RULES (MUST FOLLOW STRICTLY):
1. Do not regenerate previous ideas.
2. Treat every generation as a completely new creative session and assume all previous scenes are exhausted.
3. Invent new occupations, activities, stories, environments, and situations for every request.
4. Avoid minor variations of existing concepts.
5. Never regenerate concepts that are semantically similar to previous outputs. Similarity includes: same profession, same activity, same commercial message, same visual story, and same buyer intent.
6. Avoid concepts that belong to the top 20% most common Adobe Stock categories.

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.

Rules for Titles:
1. The title MUST incorporate three key aspects:
   - **Apa yang ada di aset (What is in the asset)**: Clear identification of the main subject, elements, or objects.
   - **Alur (Flow/Action)**: The action, movement, process, or progression taking place.
   - **Konsep (Concept)**: The underlying theme, mood, environment, or conceptual meaning (e.g., modern technology, teamwork, peaceful loneliness, premium product).
2. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
3. Limit title to 100 characters. Use impactful, searchable terms.
4. Use easy-to-read phrases, NOT formal sentence structures.
5. DO NOT start titles with "Vector of", "Illustration of", "Drawing of", or "Continuous line drawing of".
6. DO NOT treat the title like a list of keywords. No commas separating words.
7. Prioritize the main subject at the beginning of the title.
8. Avoid keyword stuffing, repetition, and synonym stacking.
9. Do not include file type, AI-generated terms, camera details, or technical information.
10. Use natural, search-friendly phrases that accurately describe visible content only.
11. Avoid subjective promotional words such as best, amazing, perfect, or stunning unless clearly justified by the visual.
12. Analyze what is in the assets properly, don't draw your own conclusions, be accurate and correct.

Rules for Descriptions:
1. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details.
2. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset (e.g., "Ideal for tech blogs or app UI presentations").
3. Limit to 200 characters.

Rules for Keywords:
1. Start with the most important descriptors. Use conceptual terms (e.g., 'concept', 'success', 'nature').
2. CRITICAL: Keywords must be single words only. NEVER use multi-word phrases or compound words with spaces.
3. Ensure no IP, brands, or names are included.
4. Order keywords by priority (Adobe Stock weights first keywords highest):
   Subject → Concept → Emotion → Category → Activity → Environment → Commercial → Technical
5. Only describe elements visually present in the image.
   Never infer, assume, or add context beyond what is seen.
6.  No synonym stacking. Maximum 2 keywords with overlapping meaning
   per category. Choose the highest-search-volume term.
7. Maximum 50 keywords. Hard limit per Adobe Stock contributor policy.
    Quality over quantity — irrelevant keywords reduce search ranking


Rules for Categories:
1. Adobe: Choose carefully from the provided list.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

User preference: ${customPrompt || "Follow standard best practices."}`;

  const imageParts = frames.map(frame => processFrameServer(frame));

  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      response = await callGeminiWithRetry(modelName, { parts: [...imageParts, { text: `Analyze the provided visual content and generate the requested metadata with exactly ${keywordCount} keywords.` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      });
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[generateStockMetadata] Failed with ${modelName}:`, err.message || err);
    }
  }
  if (!response) throw lastError;

  try {
    const text = response.text || "{}";
    const data = JSON.parse(text);
    
    if (data.keywords && Array.isArray(data.keywords)) {
      data.keywords = data.keywords.map((k: string) => k.replace(/-/g, ' '));
    }
    
    return data as StockMetadata;
  } catch (error) {
    console.error("Gemini Parse Error:", error, response.text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

export const generateBatchStockMetadata = async (
  items: { id: string, frames: string[] }[],
  keywordCount: number | string,
  customPrompt: string = "",
  toolType: ToolType = ToolType.IMAGE
): Promise<{id: string, metadata: StockMetadata}[]> => {
  const categoriesText = ADOBE_CATEGORIES.map(c => `${c.id}: ${c.name}`).join(', ');
  const shutterstockCategoriesText = (toolType === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).join(', ');

  const itemSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Impactful title in Sentence case (max 150 chars, no commas). It MUST combine 3 aspects: what is in the asset (subject/objects), the action/flow (movement/progression), and the concept (theme/mood).' },
      description: { type: Type.STRING, description: 'Detailed visual description followed by a sentence starting with "Ideal for..." suggesting potential uses, max 200 chars.' },
      keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: `List of exactly ${keywordCount} conceptual and descriptive keywords in English, ordered by relevance. CRITICAL: Use only single words; no multi-word phrases.` },
      category_id: { type: Type.INTEGER, description: 'The most accurate Adobe Stock category ID.' },
      shutterstock_category_1: { type: Type.STRING, description: 'The primary Shutterstock category. Must be exactly one of the provided Shutterstock categories.' },
      shutterstock_category_2: { type: Type.STRING, description: 'The secondary Shutterstock category. Must be exactly one of the provided Shutterstock categories, and MUST BE DIFFERENT from shutterstock_category_1.' }
    },
    required: ["title", "description", "keywords", "category_id", "shutterstock_category_1", "shutterstock_category_2"],
  };

  const responseSchema = {
    type: Type.ARRAY,
    items: itemSchema,
    description: `An array containing exactly ${items.length} metadata objects, corresponding to the ${items.length} provided visual inputs in the exact same order.`
  };

  let mediaContext = "The provided images are photographs or digital images.";
  if (toolType === ToolType.VIDEO) {
      mediaContext = "CRITICAL: Each provided input is a STORYBOARD (a grid of sequential frames) extracted from a single VIDEO or ANIMATION. Describe the overall motion, action, and subject of each video as a single continuous scene.";
  } else if (toolType === ToolType.VECTOR || toolType === ToolType.VECTOR_EPS) {
      mediaContext = "The provided images are previews of VECTOR graphics or illustrations. CRITICAL: DO NOT start titles with 'Vector of', 'Illustration of', 'Drawing of', or 'Continuous line drawing of'. Focus entirely on describing the main subject or object directly. Note: Previews are generated with a flat background. Do not mention or describe the background explicitly unless it is clearly an integral part of the composition.";
  }

  const systemInstruction = `You are a professional Adobe Stock and Shutterstock metadata specialist.
Your goal is to maximize the discoverability of visual assets.
OUTPUT MUST BE IN ENGLISH for titles and keywords.

${mediaContext}

CRITICAL BATCH INSTRUCTION:
You are receiving ${items.length} distinct visual inputs.
You MUST return a JSON array containing EXACTLY ${items.length} objects.
The first object in the array must correspond to VISUAL INPUT 1, the second to VISUAL INPUT 2, and so on.

CRITICAL CREATIVE DIVERSITY RULES (MUST FOLLOW STRICTLY):
1. Do not regenerate previous ideas.
2. Treat every generation as a completely new creative session and assume all previous scenes are exhausted.
3. Invent new occupations, activities, stories, environments, and situations for every request.
4. Avoid minor variations of existing concepts.
5. Never regenerate concepts that are semantically similar to previous outputs. Similarity includes: same profession, same activity, same commercial message, same visual story, and same buyer intent.
6. Avoid concepts that belong to the top 20% most common Adobe Stock categories.

CRITICAL RULES FOR TITLES & KEYWORDS (MUST FOLLOW STRICTLY):
1. NO INTELLECTUAL PROPERTY (IP): NEVER use company names, brand names, trademarks, or product names (e.g., Apple, Nike, iPhone, Coca-Cola). Use generic terms instead (e.g., "smartphone", "athletic shoes", "soda").
2. NO FAMOUS PEOPLE OR CHARACTERS: NEVER include names of artists, celebrities, public figures, or fictional characters.
3. NO CREATIVE WORKS: NEVER include names of movies, franchises, comics, art, design, or architecture.
4. NO "STYLE OF": NEVER use phrases like "in the style of", "inspired by", "influenced by", or "in the tradition of".
5. RESPECTFUL LANGUAGE: ALWAYS use thoughtful, respectful, and inclusive language when describing people. NEVER use derogatory, insulting, or harmful language.

Rules for Titles:
1. The title MUST incorporate three key aspects:
   - **Apa yang ada di aset (What is in the asset)**: Clear identification of the main subject, elements, or objects.
   - **Alur (Flow/Action)**: The action, movement, process, or progression taking place.
   - **Konsep (Concept)**: The underlying theme, mood, environment, or conceptual meaning (e.g., modern technology, teamwork, peaceful loneliness, premium product).
2. Use Sentence case (only the first letter of the entire title should be capitalized, with the rest in lowercase except for proper nouns).
3. Limit title to 100 characters. Use impactful, searchable terms.
4. Use easy-to-read phrases, NOT formal sentence structures.
5. DO NOT start titles with "Vector of", "Illustration of", "Drawing of", or "Continuous line drawing of".
6. DO NOT treat the title like a list of keywords. No commas separating words.
7. Prioritize the main subject at the beginning of the title.
8. Avoid keyword stuffing, repetition, and synonym stacking.
9. Do not include file type, AI-generated terms, camera details, or technical information.
10. Use natural, search-friendly phrases that accurately describe visible content only.
11. Avoid subjective promotional words such as best, amazing, perfect, or stunning unless clearly justified by the visual.
12. Analyze what is in the assets properly, don't draw your own conclusions, be accurate and correct.

Rules for Descriptions:
1. Provide a thorough visual breakdown of the scene, including colors, composition, and specific details.
2. ALWAYS conclude the description with a sentence starting with "Ideal for..." or "Perfect for..." that suggests how a customer might use this asset.
3. Limit to 200 characters.

Rules for Keywords:
1. Start with the most important descriptors. Use conceptual terms (e.g., 'concept', 'success', 'nature').
2. CRITICAL: Keywords must be single words only. NEVER use multi-word phrases or compound words with spaces.
3. Ensure no IP, brands, or names are included.
4. Order keywords by priority (Adobe Stock weights first keywords highest):
   Subject → Concept → Emotion → Category → Activity → Environment → Commercial → Technical
5. Only describe elements visually present in the image.
   Never infer, assume, or add context beyond what is seen.
6.  No synonym stacking. Maximum 2 keywords with overlapping meaning
   per category. Choose the highest-search-volume term.
7. Maximum 50 keywords. Hard limit per Adobe Stock contributor policy.
    Quality over quantity — irrelevant keywords reduce search ranking

Rules for Categories:
1. Adobe: Choose carefully from the provided list.
2. Shutterstock: Category 1 and Category 2 MUST be selected from the provided list and MUST NOT be the same.

Adobe Stock Categories:
${categoriesText}

Shutterstock Categories:
${shutterstockCategoriesText}

User preference: ${customPrompt || "Follow standard best practices."}`;

  const parts: any[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    parts.push({ text: `\n\n--- VISUAL INPUT ${index + 1} ---\n` });
    for (const frame of item.frames) {
      const processedFrame = processFrameServer(frame);
      parts.push(processedFrame);
    }
  }

  parts.push({ text: `\n\nAnalyze the ${items.length} visual inputs above and generate the JSON array with exactly ${items.length} metadata objects.` });

  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      response = await callGeminiWithRetry(modelName, { parts }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      });
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[generateBatchStockMetadata] Failed with ${modelName}:`, err.message || err);
    }
  }
  if (!response) throw lastError;

  try {
    const text = response.text || "[]";
    const dataArray = JSON.parse(text) as StockMetadata[];

    if (!Array.isArray(dataArray)) {
        throw new Error("AI did not return an array.");
    }

    return dataArray.map((metadata, index) => {
        if (metadata.keywords && Array.isArray(metadata.keywords)) {
            metadata.keywords = metadata.keywords.map((k: string) => k.replace(/-/g, ' '));
        }
        const targetId = items[index] ? items[index].id : items[items.length - 1].id;
        return { id: targetId, metadata };
    });
  } catch (error) {
    console.error("Gemini Parse Error:", error, response.text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

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
    "Oil Painting": ' - Focus on heavy brushstrokes, impasto textures, rich pigment layers, and classical fine art canvas aesthetics.'
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
Your job is to translate a raw idea and specific style choices into exactly ${count} highly unique, descriptive, and professional-grade generation prompt variations in English.

Input parameters:
- Base Subject/Idea: "${subject}"
- Selected Style Context: ${styleCategory}
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
6. Camera details: Specific lens types, aperture, and camera angles.

Rules for the Generated Prompts:
0. PROMPT STRUCTURE FORMULA: Every prompt MUST strictly follow this sequence: [Subject] [Action] [Visual Characteristics] [Materials/Textures] [Environment] [Lighting] [Camera Details] [Commercial Intent]. Combine these elements into a fluid, professional magazine editorial-style description.
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
10. CRITICAL CREATIVE DIVERSITY: Do not regenerate previous ideas. Treat every generation as a completely new creative session and assume all previous scenes are exhausted. Invent new occupations, activities, stories, environments, and situations. Avoid minor variations of existing concepts. Never regenerate concepts that are semantically similar to previous outputs. Similarity includes: same profession, same activity, same commercial message, same visual story, and same buyer intent.
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

  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  let lastError: any = null;

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

        const text = response.text || "{}";
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
          // Verify count or enforce exact quantity
          let validatedPrompts = parsed.prompts.filter((p: any) => typeof p === 'string' && p.trim().length > 0);
          
          if (validatedPrompts.length > 0) {
            // If model returned fewer prompts (e.g., due to token limit or lazy generation), pad them programmatically
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
              return p;
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
      "contemporary abstract art, bold geometric shapes, expressive non-representational layouts, vivid color palettes",
      "modern abstract expressionism, fluid acrylic paint pours, stylized structural concepts, multi-layered visually",
      "minimalist abstract geometry, clean lines, high-contrast flat layout elements, balanced design",
      "surreal high-concept abstract composition, organic forms, floating objects, dreamlike colors",
      "bold brutalist abstract poster design, heavily textured paper background, rough hand-drawn structures",
      "textured mixed-media abstract collage, earthy colors, creative design layout, gold leaf highlights",
      "modern fluid digital abstract artwork, clean glossy gradients, flowing chromatic shapes",
      "minimalist abstract painting, neutral earth tones, sweeping lines, subtle atmospheric textures",
      "avant-garde abstract conceptual illustration, striking contrast, artistic creative layout",
      "dynamic abstract wave patterns, high contrast visual, futuristic modern art exhibition style"
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
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      response = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: `Analyze this image and generate an optimized prompt for style: ${styleCategory}` }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      });
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[analyzeImageToPrompt] Failed with ${modelName}:`, err.message || err);
    }
  }

  if (!response) {
    console.error("analyzeImageToPrompt Error:", lastError);
    throw new Error("Failed to analyze image. Please try again.");
  }

  try {
    let text = response.text || "{}";
    // Clean potential markdown backticks
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    const data = JSON.parse(text);
    return data as { prompt: string; description: string };
  } catch (error) {
    console.error("Gemini Parse Error:", error, response.text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

export const analyzeBatchImageToPrompt = async (
  images: string[],
  styleCategory: string = 'Cinematic'
): Promise<{ prompt: string; description: string }[]> => {
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

  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      response = await callGeminiWithRetry(modelName, { parts }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      });
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[analyzeBatchImageToPrompt] Failed with ${modelName}:`, err.message || err);
    }
  }

  if (!response) {
    console.error("analyzeBatchImageToPrompt Error:", lastError);
    throw new Error("Failed to analyze images in batch.");
  }

  try {
    let text = response.text || "[]";
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    const data = JSON.parse(text);
    return data as { prompt: string; description: string }[];
  } catch (error) {
    console.error("Gemini Parse Error:", error, response.text);
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

  return JSON.parse(response.text) as VideoAnalysisResult;
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

  const parsed = JSON.parse(response.text) as Omit<VideoPrompt, 'id'>[];
  const timestamp = Date.now();
  return parsed.map((p, index) => ({
    ...p,
    id: `hw-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
  }));
}

export async function checkImageQuality(image: string) {
  const systemInstruction = `You are a Senior Professional AI Curator officially working for Adobe Stock. Your primary task is to review, select, and curate image assets uploaded by contributors before they enter the commercial market.

You must be extremely strict, objective, and follow a knockout (sistem gugur) validation process.

*** SISTEM GUGUR (KNOCKOUT VALIDATION) RULES ***
Perform evaluation strictly across these rules:

1. ARTIFACT & AI GENERATION ERROR (has_artifacts_or_ai_errors):
- Deteksi adanya: 'wavy lines' (garis bergelombang aneh), distorsi anatomi (jari tangan/kaki/anggota tubuh abnormal), sensasi 'plastik/lilin' yang berlebihan, atau noise kasar di area shadow.
- Jika ditemukan salah satu saja -> set "has_artifacts_or_ai_errors" to true.

2. INTELLECTUAL PROPERTY (IP) (has_ip_or_logo_violations):
- Deteksi adanya: Logo (meski kecil/samar), pola pakaian bermerek, desain produk ikonik (seperti kamera, mobil, smartphone yang khas), atau wajah orang yang terlihat jelas tanpa model release.
- Jika ditemukan salah satu saja -> set "has_ip_or_logo_violations" to true.

3. TEXT & METADATA INTEGRITY (has_broken_text_or_oil_paint_effect):
- Deteksi Teks di Gambar: Tolak jika ada teks buatan AI yang bentuknya rusak, terbalik, atau tidak memiliki arti (gibberish text). Adobe Stock melarang teks yang tidak fungsional pada gambar komersial.
- Upscaling Artifacts: Periksa apakah gambar dipaksa diperbesar (upscaled) hingga teksturnya menjadi blur, pecah, atau seperti lukisan cat minyak yang kehilangan detail asli (oil-paint effect).
- Jika ditemukan salah satu saja -> set "has_broken_text_or_oil_paint_effect" to true.

DECISION TREE / SISTEM GUGUR LOGIC:
- Jika salah satu saja dari checklist ("has_artifacts_or_ai_errors", "has_ip_or_logo_violations", atau "has_broken_text_or_oil_paint_effect") bernilai TRUE:
  * decision.status MUST be "REJECTED"
  * decision.rejection_reason MUST be "Technical Quality" (for Artifacts or Broken Text/Oil paint) or "Intellectual Property" (for IP violations). If multiple exist, choose the most severe.
  * technical_score and commercial_score MUST be set to 0. (Do not evaluate commercial quality!)
  * analysis.commercial_value must be left as a simple summary stating "Tidak dievaluasi karena tidak lolos tahap verifikasi dasar (sistem gugur)."
  * improvement_suggestions must contain actionable advice on how to avoid these specific failures.
- Jika ketiganya FALSE:
  * decision.status MUST be "APPROVED"
  * decision.rejection_reason MUST be null.
  * Evaluate technical_score and commercial_score as normal (1-10 scale), and write comprehensive technical and commercial value reviews.

Evaluate "confidence_score" as a percentage representation (e.g., "95%") of how confident you are in this decision.

Analyze the image and return exactly this JSON structure (and no other format):
{
  "check_list": {
    "has_artifacts_or_ai_errors": boolean,
    "has_ip_or_logo_violations": boolean,
    "has_broken_text_or_oil_paint_effect": boolean
  },
  "decision": {
    "status": "APPROVED" or "REJECTED",
    "rejection_reason": "Technical Quality" or "Intellectual Property" or null,
    "confidence_score": "1-100%"
  },
  "technical_score": number between 0 and 10,
  "commercial_score": number between 0 and 10,
  "analysis": {
    "technical": "Review of technical compliance and quality.",
    "intellectual_property": "Review of copyright/trademark compliance.",
    "commercial_value": "Detailed commercial potential evaluation or notice of skipping due to knockout failure."
  },
  "improvement_suggestions": "Actionable feedback for the contributor."
}

Always provide honest and professional reviews in Bahasa Indonesia (or English if technical validation details require it), but prioritize the knockout rules.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      check_list: {
        type: Type.OBJECT,
        properties: {
          has_artifacts_or_ai_errors: { type: Type.BOOLEAN },
          has_ip_or_logo_violations: { type: Type.BOOLEAN },
          has_broken_text_or_oil_paint_effect: { type: Type.BOOLEAN }
        },
        required: ["has_artifacts_or_ai_errors", "has_ip_or_logo_violations", "has_broken_text_or_oil_paint_effect"]
      },
      decision: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["APPROVED", "REJECTED"] },
          rejection_reason: { type: Type.STRING, nullable: true },
          confidence_score: { type: Type.STRING }
        },
        required: ["status", "rejection_reason", "confidence_score"]
      },
      technical_score: { type: Type.NUMBER },
      commercial_score: { type: Type.NUMBER },
      analysis: {
        type: Type.OBJECT,
        properties: {
          technical: { type: Type.STRING },
          intellectual_property: { type: Type.STRING },
          commercial_value: { type: Type.STRING },
        },
        required: ["technical", "intellectual_property", "commercial_value"]
      },
      improvement_suggestions: { type: Type.STRING }
    },
    required: ["check_list", "decision", "technical_score", "commercial_score", "analysis", "improvement_suggestions"]
  };

  const imagePart = processFrameServer(image);
  
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let response;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      response = await callGeminiWithRetry(modelName, { parts: [imagePart, { text: "Act as an Adobe Stock curator. Analyze this image for stock commercial and technical quality." }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      });
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[checkImageQuality] Failed with ${modelName}:`, err.message || err);
    }
  }

  if (!response) throw lastError;
  
  try {
    const text = response.text || "{}";
    console.log('Gemini raw response:', text);
    return JSON.parse(text);
  } catch(e) {
    console.error("Gemini Parse Error:", response?.text);
    throw e;
  }
}
