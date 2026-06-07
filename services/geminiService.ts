import { StockMetadata, ToolType } from "../types";
import { getApiHeaders } from "./apiHeaders";

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
  toolType: ToolType = ToolType.IMAGE
): Promise<StockMetadata> => {
  // Convert any blob: URLs into Base64 data URLs on the client side
  const base64Frames = await Promise.all(frames.map(ensureBase64));

  const response = await fetch('/api/generate-metadata', {
    method: 'POST',
    headers: getApiHeaders(), // FIX: include provider + API key headers
    body: JSON.stringify({ frames: base64Frames, keywordCount, customPrompt, toolType })
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
  toolType: ToolType = ToolType.IMAGE
): Promise<{id: string, metadata: StockMetadata}[]> => {
  // Convert any blob: URLs to Base64 data URLs inside items
  const processedItems = await Promise.all(items.map(async (item) => {
    const base64Frames = await Promise.all(item.frames.map(ensureBase64));
    return { id: item.id, frames: base64Frames };
  }));

  const response = await fetch('/api/generate-batch-metadata', {
    method: 'POST',
    headers: getApiHeaders(), // FIX: include provider + API key headers
    body: JSON.stringify({ items: processedItems, keywordCount, customPrompt, toolType })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to generate batch metadata via server-side AI");
  }
  return response.json();
};
