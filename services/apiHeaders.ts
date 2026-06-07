/**
 * Shared utility: Build API request headers that include the user's
 * saved AI provider and API keys from localStorage.
 *
 * The server-side middleware reads these headers to determine which
 * provider and key to use for each request:
 *   x-ai-provider  → 'gemini' | 'groq' | 'mistral'
 *   x-gemini-key   → comma-separated list of Gemini keys
 *   x-groq-key     → comma-separated list of Groq keys
 *   x-mistral-key  → comma-separated list of Mistral keys
 */
export const getApiHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return headers;
  }

  const geminiKeys = localStorage.getItem('gemini_api_key') || '';
  const groqKeys   = localStorage.getItem('groq_api_key')   || '';
  const mistralKeys = localStorage.getItem('mistral_api_key') || '';
  const provider   = localStorage.getItem('ai_provider')    || 'gemini';

  if (geminiKeys)  headers['x-gemini-key']  = geminiKeys;
  if (groqKeys)    headers['x-groq-key']    = groqKeys;
  if (mistralKeys) headers['x-mistral-key'] = mistralKeys;
  headers['x-ai-provider'] = provider;

  return headers;
};
