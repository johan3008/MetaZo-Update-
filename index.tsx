import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';

// Intercept all local fetch requests to inject custom Provider API Keys if defined by user
const originalFetch = window.fetch;

function injectProviderHeaders(init: any, url: any) {
  if (url && (typeof url === 'string') && (url.startsWith('/api/') || url.includes('/api/'))) {
    const geminiKey = localStorage.getItem('gemini_api_key') || '';
    const groqKey = localStorage.getItem('groq_api_key') || '';
    const mistralKey = localStorage.getItem('mistral_api_key') || '';
    const provider = localStorage.getItem('ai_provider') || 'gemini';

    init = init || {};
    const headers = new Headers(init.headers || {});
    if (geminiKey) headers.set('x-gemini-key', geminiKey);
    if (groqKey) headers.set('x-groq-key', groqKey);
    if (mistralKey) headers.set('x-mistral-key', mistralKey);
    headers.set('x-ai-provider', provider);
    init.headers = headers;
  }
  return init;
}

try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function(input: any, init: any) {
      const url = typeof input === 'string' ? input : (input && (input as any).url);
      init = injectProviderHeaders(init, url);
      return originalFetch.call(this, input, init);
    }
  });
} catch (e) {
  console.error('[fetch interceptor] Object.defineProperty failed, trying direct property definition', e);
  try {
    (window as any).fetch = function(input: any, init: any) {
      const url = typeof input === 'string' ? input : (input && (input as any).url);
      init = injectProviderHeaders(init, url);
      return originalFetch.call(this, input, init);
    };
  } catch (err) {
    console.error('[fetch interceptor] All attempts to intercept window.fetch failed', err);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
