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
    const zaiKey = localStorage.getItem('zai_api_key') || '';
    const provider = localStorage.getItem('ai_provider') || 'gemini';

    init = init || {};
    const headers = new Headers(init.headers || {});
    if (geminiKey) headers.set('x-gemini-key', geminiKey);
    if (groqKey) headers.set('x-groq-key', groqKey);
    if (mistralKey) headers.set('x-mistral-key', mistralKey);
    if (zaiKey) headers.set('x-zai-key', zaiKey);
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Unhandled App Crash Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', color: '#fff', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171', marginBottom: '12px' }}>Terjadi Kesalahan pada Aplikasi</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '500px', marginBottom: '20px' }}>
            {this.state.error?.message || 'Gagal memuat komponen antarmuka. Silakan muat ulang halaman.'}
          </p>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding: '10px 20px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            Reset Cache & Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('App is mounting...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, rendering...');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
    </ErrorBoundary>
  </React.StrictMode>
);
console.log('App rendered.');

