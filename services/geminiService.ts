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

export const generateStockMetadata = async (
  frames: string[],
  keywordCount: number | string,
  customPrompt: string = "",
  toolType: ToolType = ToolType.IMAGE,
  temperature?: number
): Promise<StockMetadata> => {
  // Convert any blob: URLs into Base64 data URLs on the client side
  const base64Frames = await Promise.all(frames.map(ensureBase64));

  const response = await fetch('/api/generate-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames: base64Frames, keywordCount, customPrompt, toolType, temperature })
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
  temperature?: number
): Promise<{id: string, metadata: StockMetadata}[]> => {
  // Convert any blob: URLs to Base64 data URLs inside items
  const processedItems = await Promise.all(items.map(async (item) => {
    const base64Frames = await Promise.all(item.frames.map(ensureBase64));
    return { id: item.id, frames: base64Frames };
  }));

  const response = await fetch('/api/generate-batch-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: processedItems, keywordCount, customPrompt, toolType, temperature })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to generate batch metadata via server-side AI");
  }
  return response.json();
};

export const fetchCalendarEvents = async (month: string): Promise<{ events: any[] }> => {
  const response = await fetch('/api/generate-calendar-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch calendar events");
  }
  return response.json();
};

export const fetchEventKeywords = async (eventName: string, eventDetails: string): Promise<{ keywords: string[] }> => {
  const response = await fetch('/api/generate-event-keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, eventDetails })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch event keywords");
  }
  return response.json();
};
