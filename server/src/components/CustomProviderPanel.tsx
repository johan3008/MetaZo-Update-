import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X, Globe, Key, Server, Zap, Check, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

interface CustomModel {
  id: string;
  name: string;
}

interface CustomHeader {
  key: string;
  value: string;
}

interface CustomProvider {
  id: string;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  models: CustomModel[];
  headers: CustomHeader[];
}

export interface CustomProviderPanelProps {
  customProviders: CustomProvider[];
  setCustomProviders: (providers: CustomProvider[]) => void;
  selectedCustomProviderId: string | null;
  setSelectedCustomProviderId: (id: string | null) => void;
  t: any;
  uiLanguage?: 'id' | 'en';
  isDark?: boolean;
}

const STORAGE_KEY = 'mz_custom_providers';
const ACTIVE_KEY = 'mz_active_custom_provider_id';

// Utility to load from localStorage
export function loadCustomProviders(): CustomProvider[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function loadActiveCustomProviderId(): string | null {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function saveCustomProviders(providers: CustomProvider[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
}

export function saveActiveCustomProviderId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

const DEFAULT_MODEL: CustomModel = { id: 'default', name: 'Default Model' };

const CustomProviderPanel: React.FC<CustomProviderPanelProps> = ({
  customProviders,
  setCustomProviders,
  selectedCustomProviderId,
  setSelectedCustomProviderId,
  t,
  uiLanguage = 'en',
  isDark = false
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CustomProvider | null>(null);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  
  // Form state
  const [formId, setFormId] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formModels, setFormModels] = useState<CustomModel[]>([{ ...DEFAULT_MODEL }]);
  const [formHeaders, setFormHeaders] = useState<CustomHeader[]>([]);

  const resetForm = useCallback(() => {
    setFormId('');
    setFormDisplayName('');
    setFormBaseUrl('');
    setFormApiKey('');
    setFormModels([{ ...DEFAULT_MODEL }]);
    setFormHeaders([]);
    setEditingProvider(null);
    setShowAddForm(false);
  }, []);

  const handleEdit = (provider: CustomProvider) => {
    setEditingProvider(provider);
    setFormId(provider.id);
    setFormDisplayName(provider.displayName);
    setFormBaseUrl(provider.baseUrl);
    setFormApiKey(provider.apiKey || '');
    setFormModels(provider.models.length > 0 ? [...provider.models] : [{ ...DEFAULT_MODEL }]);
    setFormHeaders(provider.headers ? [...provider.headers] : []);
    setShowAddForm(true);
  };

  const handleDelete = (providerId: string) => {
    if (!window.confirm(uiLanguage === 'id' 
      ? `Yakin hapus provider "${providerId}"?` 
      : `Delete provider "${providerId}"?`)) return;
    
    const updated = customProviders.filter(p => p.id !== providerId);
    setCustomProviders(updated);
    saveCustomProviders(updated);
    if (selectedCustomProviderId === providerId) {
      setSelectedCustomProviderId(null);
      saveActiveCustomProviderId(null);
    }
  };

  const handleSave = () => {
    const cleanId = formId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanId) {
      alert(uiLanguage === 'id' ? 'Provider ID tidak boleh kosong' : 'Provider ID cannot be empty');
      return;
    }
    if (!formDisplayName.trim()) {
      alert(uiLanguage === 'id' ? 'Display Name tidak boleh kosong' : 'Display Name cannot be empty');
      return;
    }
    if (!formBaseUrl.trim()) {
      alert(uiLanguage === 'id' ? 'Base URL tidak boleh kosong' : 'Base URL cannot be empty');
      return;
    }

    const validModels = formModels.filter(m => m.id.trim());
    const validHeaders = formHeaders.filter(h => h.key.trim());

    const provider: CustomProvider = {
      id: cleanId,
      displayName: formDisplayName.trim(),
      baseUrl: formBaseUrl.trim().replace(/\/+$/, ''),
      apiKey: formApiKey.trim(),
      models: validModels.length > 0 ? validModels : [{ ...DEFAULT_MODEL }],
      headers: validHeaders
    };

    let updated: CustomProvider[];
    const idx = customProviders.findIndex(p => p.id === cleanId);
    if (idx >= 0) {
      updated = [...customProviders];
      updated[idx] = provider;
    } else {
      updated = [...customProviders, provider];
    }

    setCustomProviders(updated);
    saveCustomProviders(updated);
    resetForm();
  };

  const handleTestConnection = async (provider: CustomProvider) => {
    setTestingProviderId(provider.id);
    setTestResults(prev => ({ ...prev, [provider.id]: { ok: false, message: 'Testing...' } }));

    try {
      const url = provider.baseUrl.endsWith('/chat/completions') 
        ? provider.baseUrl 
        : `${provider.baseUrl}/chat/completions`;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (provider.apiKey) {
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
      }
      provider.headers?.forEach(h => {
        if (h.key && h.value) headers[h.key] = h.value;
      });

      const modelId = provider.models[0]?.id || 'default';

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 1,
          stream: false
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok || response.status === 400 || response.status === 422 || response.status === 429) {
        setTestResults({ 
          [provider.id]: { 
            ok: true, 
            message: uiLanguage === 'id' 
              ? `✅ Koneksi berhasil ke ${provider.displayName}` 
              : `✅ Connected to ${provider.displayName}` 
          } 
        });
      } else {
        const errText = await response.text().catch(() => '');
        setTestResults({ 
          [provider.id]: { 
            ok: false, 
            message: `❌ HTTP ${response.status}: ${errText.substring(0, 80)}` 
          } 
        });
      }
    } catch (err: any) {
      setTestResults({ 
        [provider.id]: { 
          ok: false, 
          message: `❌ ${err.message || 'Connection failed'}` 
        } 
      });
    } finally {
      setTestingProviderId(null);
    }
  };

  const selectProvider = (provider: CustomProvider) => {
    setSelectedCustomProviderId(provider.id);
    saveActiveCustomProviderId(provider.id);
  };

  const addModelRow = () => setFormModels(prev => [...prev, { id: '', name: '' }]);
  const removeModelRow = (index: number) => setFormModels(prev => prev.filter((_, i) => i !== index));
  const updateModel = (index: number, field: 'id' | 'name', value: string) => {
    setFormModels(prev => prev.map((m, i) => i === index ? { ...m, [field]: value, name: field === 'id' ? (m.name || value) : m.name } : m));
  };

  const addHeaderRow = () => setFormHeaders(prev => [...prev, { key: '', value: '' }]);
  const removeHeaderRow = (index: number) => setFormHeaders(prev => prev.filter((_, i) => i !== index));
  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setFormHeaders(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const inputClass = "w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all font-medium";
  const labelClass = "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-1.5";
  const sectionClass = "space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner";
  const btnPrimary = "py-2 px-4 bg-[#7c3aed] text-white font-black rounded-[1.25rem] text-[10px] uppercase tracking-wider hover:bg-violet-600 transition-all shadow-md shadow-violet-500/15 flex items-center justify-center gap-1.5";
  const btnSecondary = "py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-[1.25rem] text-[10px] uppercase tracking-wider hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-center gap-1.5";
  const btnDanger = "p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-all";

  return (
    <div className="space-y-4 animate-in fade-in duration-100">
      <div className="flex items-center space-x-2.5 mb-2">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-md shadow-violet-500/20">
          <Server size={12} className="text-white" />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
            {uiLanguage === 'id' ? 'Provider Kustom' : 'Custom Providers'}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
            {uiLanguage === 'id' 
              ? 'OpenRouter, Ollama, Together AI, vLLM, atau endpoint OpenAI-compatible' 
              : 'OpenRouter, Ollama, Together AI, vLLM, or OpenAI-compatible endpoints'}
          </p>
        </div>
      </div>

      {/* List of saved providers */}
      {customProviders.length > 0 && (
        <div className={sectionClass}>
          <label className={labelClass}>
            {uiLanguage === 'id' ? 'Provider Tersimpan' : 'Saved Providers'} ({customProviders.length})
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {customProviders.map(provider => {
              const isSelected = selectedCustomProviderId === provider.id;
              const isTesting = testingProviderId === provider.id;
              const result = testResults[provider.id];
              const maskedUrl = provider.baseUrl.length > 35 
                ? provider.baseUrl.substring(0, 35) + '...' 
                : provider.baseUrl;
              
              return (
                <div 
                  key={provider.id}
                  className={`flex items-center justify-between p-2.5 rounded-[1.25rem] border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-violet-50 dark:bg-violet-950/20 border-[#7c3aed]/40 shadow-sm' 
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  onClick={() => selectProvider(provider)}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#7c3aed]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 truncate">
                        {provider.displayName}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">
                        {maskedUrl}
                      </div>
                      {provider.models.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {provider.models.slice(0, 3).map(m => (
                            <span key={m.id} className="text-[8px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 font-mono">
                              {m.name || m.id}
                            </span>
                          ))}
                          {provider.models.length > 3 && (
                            <span className="text-[8px] text-slate-400">+{provider.models.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleTestConnection(provider); }}
                      disabled={isTesting}
                      className="p-1.5 text-slate-400 hover:text-[#7c3aed] hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-full transition-all"
                      title={uiLanguage === 'id' ? 'Tes Koneksi' : 'Test Connection'}
                    >
                      {isTesting ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(provider); }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-full transition-all"
                      title={uiLanguage === 'id' ? 'Edit' : 'Edit'}
                    >
                      <Globe size={11} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(provider.id); }}
                      className={btnDanger}
                      title={uiLanguage === 'id' ? 'Hapus' : 'Delete'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test results */}
          {Object.entries(testResults).map(([id, result]) => (
            <div 
              key={id}
              className={`text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-2 ${
                result.ok 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}
            >
              {result.ok ? <Check size={11} /> : <AlertCircle size={11} />}
              {result.message}
            </div>
          ))}
        </div>
      )}

      {/* Add New / Edit Form */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className={`w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[1.25rem] text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:border-[#7c3aed] hover:text-[#7c3aed] dark:hover:border-violet-500 dark:hover:text-violet-400 transition-all flex items-center justify-center gap-1.5`}
        >
          <Plus size={12} />
          {uiLanguage === 'id' ? 'Tambah Provider Kustom' : 'Add Custom Provider'}
        </button>
      ) : (
        <div className={sectionClass + ' space-y-3'}>
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {editingProvider 
                ? (uiLanguage === 'id' ? 'Edit Provider' : 'Edit Provider')
                : (uiLanguage === 'id' ? 'Provider Baru' : 'New Provider')
              }
            </h4>
            <button onClick={resetForm} className={btnDanger}>
              <X size={12} />
            </button>
          </div>

          {/* Provider ID */}
          <div>
            <label className={labelClass}>
              {uiLanguage === 'id' ? 'Provider ID' : 'Provider ID'}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input 
              className={inputClass}
              value={formId}
              onChange={e => setFormId(e.target.value)}
              placeholder="e.g. openrouter, ollama, together"
              disabled={!!editingProvider}
              autoComplete="off"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className={labelClass}>
              {uiLanguage === 'id' ? 'Nama Tampilan' : 'Display Name'}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input 
              className={inputClass}
              value={formDisplayName}
              onChange={e => setFormDisplayName(e.target.value)}
              placeholder="e.g. My OpenRouter, Local Ollama"
              autoComplete="off"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className={labelClass}>
              {uiLanguage === 'id' ? 'Base URL (Endpoint)' : 'Base URL (Endpoint)'}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input 
              className={inputClass}
              value={formBaseUrl}
              onChange={e => setFormBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
              autoComplete="off"
            />
            <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5 block">
              {uiLanguage === 'id' 
                ? 'Tambahkan /chat/completions jika diperlukan. Contoh: https://api.openai.com/v1' 
                : 'Add /chat/completions if needed. Example: https://api.openai.com/v1'}
            </span>
          </div>

          {/* API Key */}
          <div>
            <label className={labelClass}>
              {uiLanguage === 'id' ? 'API Key' : 'API Key'}
            </label>
            <input 
              className={inputClass}
              type="password"
              value={formApiKey}
              onChange={e => setFormApiKey(e.target.value)}
              placeholder="sk-... atau kosongkan untuk local"
              autoComplete="off"
            />
            <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5 block">
              {uiLanguage === 'id' 
                ? 'Kosongkan jika menggunakan server lokal (Ollama, vLLM)' 
                : 'Leave empty for local servers (Ollama, vLLM)'}
            </span>
          </div>

          {/* Models */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass + ' mb-0'}>
                {uiLanguage === 'id' ? 'Model ID' : 'Model IDs'}
              </label>
              <button onClick={addModelRow} className="text-[10px] text-[#7c3aed] font-bold hover:underline">
                + {uiLanguage === 'id' ? 'Tambah' : 'Add'}
              </button>
            </div>
            <div className="space-y-2">
              {formModels.map((model, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input 
                    className={inputClass + ' flex-1'}
                    value={model.id}
                    onChange={e => updateModel(idx, 'id', e.target.value)}
                    placeholder={uiLanguage === 'id' ? 'Model ID (contoh: gpt-4o)' : 'Model ID (e.g. gpt-4o)'}
                    autoComplete="off"
                  />
                  <input 
                    className={inputClass + ' w-28'}
                    value={model.name}
                    onChange={e => updateModel(idx, 'name', e.target.value)}
                    placeholder={uiLanguage === 'id' ? 'Nama' : 'Name'}
                    autoComplete="off"
                  />
                  {formModels.length > 1 && (
                    <button onClick={() => removeModelRow(idx)} className={btnDanger}>
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Headers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass + ' mb-0'}>
                {uiLanguage === 'id' ? 'Header Kustom (Opsional)' : 'Custom Headers (Optional)'}
              </label>
              <button onClick={addHeaderRow} className="text-[10px] text-[#7c3aed] font-bold hover:underline">
                + {uiLanguage === 'id' ? 'Tambah' : 'Add'}
              </button>
            </div>
            <div className="space-y-1.5">
              {formHeaders.map((header, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input 
                    className={inputClass + ' flex-1'}
                    value={header.key}
                    onChange={e => updateHeader(idx, 'key', e.target.value)}
                    placeholder={uiLanguage === 'id' ? 'Header Key' : 'Header Key'}
                    autoComplete="off"
                  />
                  <input 
                    className={inputClass + ' flex-1'}
                    value={header.value}
                    onChange={e => updateHeader(idx, 'value', e.target.value)}
                    placeholder={uiLanguage === 'id' ? 'Header Value' : 'Header Value'}
                    autoComplete="off"
                  />
                  <button onClick={() => removeHeaderRow(idx)} className={btnDanger}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className={btnPrimary + ' flex-1'}>
              <Save size={11} />
              {uiLanguage === 'id' ? 'Simpan' : 'Save Provider'}
            </button>
            <button onClick={resetForm} className={btnSecondary + ' flex-1'}>
              {uiLanguage === 'id' ? 'Batal' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="flex items-start space-x-2 p-2.5 bg-amber-50 dark:bg-amber-950/10 rounded-xl border border-amber-200 dark:border-amber-800">
        <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[9px] font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>{uiLanguage === 'id' ? 'Tips:' : 'Tip:'}</strong>{' '}
          {uiLanguage === 'id' 
            ? 'Gunakan provider kustom untuk menghubungkan ke OpenRouter, Ollama lokal, Together AI, Groq (via custom), atau endpoint OpenAI-compatible lainnya. Provider yang aktif akan digunakan sebagai AI engine pengganti default.'
            : 'Use custom providers to connect to OpenRouter, local Ollama, Together AI, Groq (via custom), or other OpenAI-compatible endpoints. The active provider will be used as the AI engine instead of the default.'}
        </div>
      </div>
    </div>
  );
};

export default CustomProviderPanel;
