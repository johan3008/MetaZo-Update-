import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

export interface FlorenceInsights {
  detailedCaption?: string;
  ocrText?: string;
  detectedObjects?: string[];
  rawResponse?: any;
  provider?: 'huggingface' | 'custom' | 'none';
}

export interface FlorenceOptions {
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * Helper to make HTTP/HTTPS request with timeout
 */
function makeRequest(
  urlStr: string,
  method: string,
  headers: Record<string, string>,
  body: string | Buffer,
  timeoutMs: number = 10000
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method,
          headers,
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode || 200, data });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Extracts visual insights from an image using Florence-2 model.
 * Supports HuggingFace Inference API or Custom / Local Florence-2 server.
 * Gracefully returns empty insights on failure or timeout.
 */
export async function extractFlorenceVisualInsights(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  options: FlorenceOptions = {}
): Promise<FlorenceInsights> {
  const customEndpoint = options.endpoint || process.env.FLORENCE_API_ENDPOINT;
  const hfKey = options.apiKey || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;

  // If no endpoint or key is configured, return empty insights gracefully
  if (!customEndpoint && !hfKey) {
    return { provider: 'none' };
  }

  const timeoutMs = options.timeoutMs || 9000;
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');

  // Case 1: Custom / Local Florence-2 Server Endpoint
  if (customEndpoint) {
    try {
      console.log(`[Florence-2] Querying custom endpoint: ${customEndpoint}`);
      const payload = JSON.stringify({
        image: cleanBase64,
        mime_type: mimeType,
        tasks: ['<MORE_DETAILED_CAPTION>', '<OCR>', '<OD>'],
      });

      const response = await makeRequest(
        customEndpoint,
        'POST',
        {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(payload)),
        },
        payload,
        timeoutMs
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        const parsed = JSON.parse(response.data);
        return {
          detailedCaption: parsed.detailed_caption || parsed.caption || parsed['<MORE_DETAILED_CAPTION>'] || '',
          ocrText: parsed.ocr_text || parsed.ocr || parsed['<OCR>'] || '',
          detectedObjects: Array.isArray(parsed.objects) ? parsed.objects : [],
          rawResponse: parsed,
          provider: 'custom',
        };
      }
    } catch (err: any) {
      console.warn(`[Florence-2 Custom Endpoint Warning] ${err?.message || err}`);
    }
  }

  // Case 2: Hugging Face Inference API
  if (hfKey) {
    try {
      console.log(`[Florence-2] Querying Hugging Face Inference API for Florence-2-large...`);
      const hfEndpoint = 'https://api-inference.huggingface.co/models/microsoft/Florence-2-large';

      // HF accepts binary image data with prompt in headers / payload
      const response = await makeRequest(
        hfEndpoint,
        'POST',
        {
          'Authorization': `Bearer ${hfKey}`,
          'Content-Type': mimeType,
          'x-use-cache': 'true',
          'x-wait-for-model': 'true',
        },
        imageBuffer,
        timeoutMs
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(response.data);
        } catch {
          parsed = response.data;
        }

        let detailedCaption = '';
        let ocrText = '';
        const detectedObjects: string[] = [];

        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          detailedCaption = first.generated_text || first.caption || (typeof first === 'string' ? first : '');
        } else if (parsed && typeof parsed === 'object') {
          detailedCaption = parsed.generated_text || parsed['<MORE_DETAILED_CAPTION>'] || '';
          ocrText = parsed['<OCR>'] || '';
        }

        return {
          detailedCaption,
          ocrText,
          detectedObjects,
          rawResponse: parsed,
          provider: 'huggingface',
        };
      } else {
        console.warn(`[Florence-2 HF API Warning] Status: ${response.statusCode}, Body: ${response.data.slice(0, 150)}`);
      }
    } catch (err: any) {
      console.warn(`[Florence-2 HF API Warning] ${err?.message || err}`);
    }
  }

  return { provider: 'none' };
}

/**
 * Formats Florence-2 insights into a clean prompt context block for AI Vision LLMs
 */
export function formatFlorenceContextForPrompt(insights?: FlorenceInsights): string {
  if (!insights || (!insights.detailedCaption && !insights.ocrText && (!insights.detectedObjects || insights.detectedObjects.length === 0))) {
    return '';
  }

  const parts: string[] = [];
  parts.push('\n[FLORENCE-2 VISUAL GROUNDING & OCR INSIGHTS (MICROSOFT VISION FOUNDATION)]:');
  
  if (insights.detailedCaption) {
    parts.push(`- Micro-Detail Visual Caption: "${insights.detailedCaption.trim()}"`);
  }
  if (insights.ocrText) {
    parts.push(`- OCR Detected Text in Image: "${insights.ocrText.trim()}" (Note: If trademark/brand names exist, reflect in commercial/editorial compliance!)`);
  }
  if (insights.detectedObjects && insights.detectedObjects.length > 0) {
    parts.push(`- Specific Objects Detected: ${insights.detectedObjects.join(', ')}`);
  }
  parts.push('Use the above ground-truth visual insights and OCR text to enrich keywords, prevent missed small objects, and refine category/title precision.\n');

  return parts.join('\n');
}
