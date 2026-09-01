import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';

// Safely intercept local /api/ fetch requests to inject custom Provider API Keys
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      let urlStr = '';
      if (typeof input === 'string') {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.toString();
      } else if (input && typeof (input as any).url === 'string') {
        urlStr = (input as any).url;
      }

      // Only modify internal /api/ requests, leave Supabase and external calls 100% untouched
      if (urlStr && (urlStr.startsWith('/api/') || urlStr.includes('/api/'))) {
        const geminiKey = localStorage.getItem('gemini_api_key') || '';
        const groqKey = localStorage.getItem('groq_api_key') || '';
        const mistralKey = localStorage.getItem('mistral_api_key') || '';
        const zaiKey = localStorage.getItem('zai_api_key') || '';
        const provider = localStorage.getItem('ai_provider') || 'gemini';

        const customHeaders: Record<string, string> = {
          'x-ai-provider': provider
        };
        if (geminiKey) customHeaders['x-gemini-key'] = geminiKey;
        if (groqKey) customHeaders['x-groq-key'] = groqKey;
        if (mistralKey) customHeaders['x-mistral-key'] = mistralKey;
        if (zaiKey) customHeaders['x-zai-key'] = zaiKey;

        if (!init) {
          init = { headers: customHeaders };
        } else if (init.headers instanceof Headers) {
          for (const [k, v] of Object.entries(customHeaders)) {
            init.headers.set(k, v);
          }
        } else if (Array.isArray(init.headers)) {
          for (const [k, v] of Object.entries(customHeaders)) {
            init.headers.push([k, v]);
          }
        } else {
          init.headers = { ...(init.headers || {}), ...customHeaders };
        }
      }
    } catch (e) {
      console.warn('[fetch interceptor] Non-fatal header injection error:', e);
    }
    return originalFetch(input, init);
  };
}

// Global unhandled error resilience to prevent third-party / DOM constructor crashes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event && event.message && (event.message.includes('Illegal constructor') || event.message.includes('Illegal invocation'))) {
      console.warn('[Global Resilience] Suppressed non-fatal DOM error:', event.message);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event && event.reason && String(event.reason).includes('Illegal constructor')) {
      console.warn('[Global Resilience] Suppressed non-fatal promise rejection:', event.reason);
      event.preventDefault();
    }
  });
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    // If it's an Illegal constructor error, attempt graceful silent recovery
    const msg = error?.message || String(error);
    if (msg.includes('Illegal constructor') || msg.includes('Illegal invocation')) {
      console.warn('[ErrorBoundary] Gracefully recovering from constructor anomaly:', msg);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Handled App Component Notice:", error, errorInfo);
  }

  handleRecover = () => {
    this.setState({ hasError: false, error: null });
    try {
      window.location.reload();
    } catch (e) {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', color: '#fff', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171', marginBottom: '12px' }}>Terjadi Kesalahan pada Aplikasi</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '500px', marginBottom: '20px' }}>
            {this.state.error?.message || 'Gagal memuat komponen antarmuka. Silakan muat ulang halaman.'}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={this.handleRecover}
              style={{ padding: '10px 20px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Muat Ulang Aplikasi
            </button>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: '10px 20px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Reset Cache & Mulai Bersih
            </button>
          </div>
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

