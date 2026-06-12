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
  geminiKey?: string;
  groqKey?: string;
  mistralKey?: string;
  openaiKey?: string;
  openrouterKey?: string;
  nvidiaKey?: string;
  blackboxKey?: string;
  // When true, allow including API keys in outgoing headers (DANGEROUS).
  // Defaults to false. Keys SHOULD NOT be sent from browser clients.
  allowClientKeys?: boolean;
}

export const getHeaders = (options?: ServiceOptions) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options) {
    if (options.provider) headers['x-ai-provider'] = options.provider;

    // SECURITY: Do NOT include secret API keys by default when called from
    // browser/client-side code. If the caller explicitly passes
    // `allowClientKeys: true`, keys will be forwarded (this is dangerous and
    // should only be used in controlled environments such as server-to-server
    // calls or secure internal tooling).
    const allow = !!options.allowClientKeys;
    if (allow) {
      if (options.geminiKey) headers['x-gemini-key'] = options.geminiKey;
      if (options.groqKey) headers['x-groq-key'] = options.groqKey;
      if (options.mistralKey) headers['x-mistral-key'] = options.mistralKey;
      if (options.openaiKey) headers['x-openai-key'] = options.openaiKey;
      if (options.openrouterKey) headers['x-openrouter-key'] = options.openrouterKey;
      if (options.nvidiaKey) headers['x-nvidia-key'] = options.nvidiaKey;
      if (options.blackboxKey) headers['x-blackbox-key'] = options.blackboxKey;
    }
  }
  return headers;
};

export const generateStockMetadata = async (
  frames: string[],
  keywordCount: number | string,
  customPrompt: string = "",
  toolType: ToolType = ToolType.IMAGE,
  temperature?: number,
  model?: string,
  keywordMode?: 'mixed' | 'single' | 'multi',
  options?: ServiceOptions
): Promise<StockMetadata> => {
  // Convert any blob: URLs into Base64 data URLs on the client side
  const base64Frames = await Promise.all(frames.map(ensureBase64));

  const response = await fetch('/api/generate-metadata', {
    method: 'POST',
    headers: getHeaders(options),
    body: JSON.stringify({ frames: base64Frames, keywordCount, customPrompt, toolType, temperature, model, keywordMode })
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to generate metadata via server-side AI");
  }
  return response.json();
};

export const generateBatchStockMetadata = async (
  items: { id: string, frames: string[] }[],
  keywordCount: number | string,
  customPrompt: string = "",
  toolType: ToolType = ToolType.IMAGE,
  temperature?: number,
  model?: string,
  keywordMode?: 'mixed' | 'single' | 'multi',
  options?: ServiceOptions
): Promise<{id: string, metadata: StockMetadata}[]> => {
  // Convert any blob: URLs to Base64 data URLs inside items
  const processedItems = await Promise.all(items.map(async (item) => {
    const base64Frames = await Promise.all(item.frames.map(ensureBase64));
    return { id: item.id, frames: base64Frames };
  }));

  const response = await fetch('/api/generate-batch-metadata', {
    method: 'POST',
    headers: getHeaders(options),
    body: JSON.stringify({ items: processedItems, keywordCount, customPrompt, toolType, temperature, model, keywordMode })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to generate batch metadata via server-side AI");
  }
  return response.json();
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
