import { StockMetadata, ToolType } from "../types";

const ensureBase64 = async (frame: string): Promise<string> => {
  if (frame.startsWith('blob:')) {
    const res = await fetch(frame);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return frame;
};

export interface ServiceOptions {
  provider?: string;
  geminiKeys?: string | string[];
  groqKeys?: string | string[];
  mistralKeys?: string | string[];
  openaiKeys?: string | string[];
  openrouterKeys?: string | string[];
  nvidiaKeys?: string | string[];
  blackboxKeys?: string | string[];
}

export const getHeaders = (options?: ServiceOptions) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options) {
    if (options.provider) headers['x-ai-provider'] = options.provider;
    
    const joinKeys = (keys: string | string[] | undefined) => {
      if (!keys) return undefined;
      return Array.isArray(keys) ? keys.join(',') : keys;
    };

    const gKey = joinKeys(options.geminiKeys);
    if (gKey) headers['x-gemini-key'] = gKey;

    const grKey = joinKeys(options.groqKeys);
    if (grKey) headers['x-groq-key'] = grKey;

    const mKey = joinKeys(options.mistralKeys);
    if (mKey) headers['x-mistral-key'] = mKey;

    const oKey = joinKeys(options.openaiKeys);
    if (oKey) headers['x-openai-key'] = oKey;

    const orKey = joinKeys(options.openrouterKeys);
    if (orKey) headers['x-openrouter-key'] = orKey;

    const nKey = joinKeys(options.nvidiaKeys);
    if (nKey) headers['x-nvidia-key'] = nKey;

    const bKey = joinKeys(options.blackboxKeys);
    if (bKey) headers['x-blackbox-key'] = bKey;
  }
  return headers;
};

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
  let attempt = 0;
  let delayMs = 1000;
  
  while (true) {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';
      
      if (!response.ok || contentType.includes('text/html')) {
        const rawText = await response.text();
        console.warn(`[API WARNING] fetch ${url} attempt ${attempt + 1}/${maxRetries + 1} failed. Status: ${response.status}, Content-Type: ${contentType}`);
        console.warn(`[API WARNING] Error Body (first 500 chars): ${rawText.substring(0, 500)}`);
        
        if (attempt < maxRetries && (!response.ok || contentType.includes('text/html'))) {
          attempt++;
          console.log(`[API RETRY] Retrying ${url} in ${delayMs}ms (Attempt ${attempt} of ${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; 
          continue;
        }
        
        let errData: any = {};
        try {
          errData = JSON.parse(rawText);
        } catch (e) {}
        throw new Error(errData.error || `Failed request to ${url} (Status: ${response.status})`);
      }
      return response;
    } catch (e: any) {
      if (attempt < maxRetries) {
        attempt++;
        console.log(`[API RETRY] Network error on ${url}: ${e.message}. Retrying in ${delayMs}ms (Attempt ${attempt} of ${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
      throw e;
    }
  }
};

export const generateStockMetadata = async (
  frames: string[],
  keywordCount: number | string,
  customPrompt: string = "",
  toolType: ToolType = ToolType.IMAGE,
  temperature?: number,
  model?: string,
  keywordMode?: 'mixed' | 'single' | 'multi',
  aiOptions?: ServiceOptions,
  titleLength?: 'short' | 'medium' | 'long',
  metadataLanguage?: string
): Promise<StockMetadata> => {
  // Convert any blob: URLs into Base64 data URLs on the client side
  const base64Frames = await Promise.all(frames.map(ensureBase64));

  const response = await fetchWithRetry('/api/generate-metadata', {
    method: 'POST',
    headers: getHeaders(aiOptions),
    body: JSON.stringify({ frames: base64Frames, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage })
  });
  
  const rawText = await response.text();
  
  try {
    return JSON.parse(rawText);
  } catch(e) {
    console.log('[API DEBUG] /api/generate-metadata JSON parse error');
    throw new Error(`Invalid JSON response from server: ${rawText.substring(0, 100)}`);
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
  aiOptions?: ServiceOptions,
  titleLength?: 'short' | 'medium' | 'long',
  metadataLanguage?: string
): Promise<{id: string, metadata: StockMetadata}[]> => {
  // Convert any blob: URLs to Base64 data URLs inside items
  const processedItems = await Promise.all(items.map(async (item) => {
    const base64Frames = await Promise.all(item.frames.map(ensureBase64));
    return { id: item.id, frames: base64Frames };
  }));

  const response = await fetchWithRetry('/api/generate-batch-metadata', {
    method: 'POST',
    headers: getHeaders(aiOptions),
    body: JSON.stringify({ items: processedItems, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage })
  });

  const rawText = await response.text();
  
  try {
    return JSON.parse(rawText);
  } catch(e) {
    console.log('[API DEBUG] /api/generate-batch-metadata JSON parse error');
    throw new Error(`Invalid JSON response from server: ${rawText.substring(0, 100)}`);
  }
};

export const fetchCalendarEvents = async (month: string, options?: ServiceOptions): Promise<{ events: any[] }> => {
  const response = await fetch('/api/generate-calendar-events', {
    method: 'POST',
    headers: getHeaders(options),
    body: JSON.stringify({ month })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch calendar events");
  }
  return response.json();
};

export const fetchEventKeywords = async (eventName: string, eventDetails: string, options?: ServiceOptions): Promise<{ keywords: string[] }> => {
  const response = await fetch('/api/generate-event-keywords', {
    method: 'POST',
    headers: getHeaders(options),
    body: JSON.stringify({ eventName, eventDetails })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch event keywords");
  }
  return response.json();
};
