import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Sparkles, Copy, Check, Download, Search, 
  ArrowRight, FileSpreadsheet, FileText, RefreshCw, 
  Layers, Filter, ChevronRight, Info
} from 'lucide-react';
import { copyToClipboard as robustCopy } from '../utils';
import { getHeaders } from '../../services/geminiService';

export interface TopicMatrixResult {
  keyword: string;
  total: number;
  medium: string[];
  specific: string[];
  highlySpecific: string[];
}

interface TopicMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialKeyword?: string;
  onSelectTopic: (topic: string) => void;
  styleCategory?: string;
  promptMode?: 'background' | 'png';
  aiOptions?: any;
  uiLanguage?: 'id' | 'en';
}

export const TopicMatrixModal: React.FC<TopicMatrixModalProps> = ({
  isOpen,
  onClose,
  initialKeyword = '',
  onSelectTopic,
  styleCategory,
  promptMode = 'background',
  aiOptions,
  uiLanguage = 'id'
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [targetCount, setTargetCount] = useState<30 | 50 | 100>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopicMatrixResult | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'medium' | 'specific' | 'highlySpecific'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (isOpen && initialKeyword) {
      setKeyword(initialKeyword);
    }
  }, [isOpen, initialKeyword]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const cleanWord = keyword.trim();
    if (!cleanWord) {
      setError(uiLanguage === 'id' ? 'Silakan masukkan kata kunci awal terlebih dahulu.' : 'Please enter a seed keyword first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-topic-matrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(aiOptions)
        },
        body: JSON.stringify({
          keyword: cleanWord,
          count: targetCount,
          styleCategory,
          promptMode,
          model: aiOptions?.model
        })
      });

      if (!response.ok) {
        let msg = 'Gagal melakukan riset AI.';
        try {
          const errData = await response.json();
          if (errData?.error) msg = errData.error;
        } catch (_) {}
        throw new Error(msg);
      }

      const data: TopicMatrixResult = await response.json();
      setResult(data);
      setActiveTab('all');
      setSearchFilter('');
    } catch (err: any) {
      console.error('[TopicMatrixModal] Error:', err);
      setError(err?.message || (uiLanguage === 'id' ? 'Koneksi ke AI terganggu, silakan coba beberapa saat lagi.' : 'AI connection failed, please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopySingle = async (text: string, id: string) => {
    const ok = await robustCopy(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const lines: string[] = [
      `=== RISET AI TOPIC MATRIX: "${result.keyword.toUpperCase()}" ===`,
      `Total: ${result.total} Ide Topik Komersial`,
      `Target Format: ${promptMode === 'png' ? 'Isolated PNG Element' : 'Full Composition'}`,
      `Tanggal: ${new Date().toLocaleDateString()}`,
      '',
      `### Medium Topics (${result.medium.length})`,
      ...result.medium.map((m, i) => `${i + 1}. ${m}`),
      '',
      `### Specific Topics (${result.specific.length})`,
      ...result.specific.map((s, i) => `${result.medium.length + i + 1}. ${s}`),
      '',
      `### Highly Specific Topics (${result.highlySpecific.length})`,
      ...result.highlySpecific.map((h, i) => `${result.medium.length + result.specific.length + i + 1}. ${h}`),
    ];

    const ok = await robustCopy(lines.join('\n'));
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const lines: string[] = [
      `=== RISET AI TOPIC MATRIX: "${result.keyword.toUpperCase()}" ===`,
      `Total: ${result.total} Ide Topik Komersial`,
      `Target Format: ${promptMode === 'png' ? 'Isolated PNG Element' : 'Full Composition'}`,
      `Tanggal: ${new Date().toLocaleDateString()}`,
      '',
      `### Medium Topics (${result.medium.length})`,
      ...result.medium.map((m, i) => `${i + 1}. ${m}`),
      '',
      `### Specific Topics (${result.specific.length})`,
      ...result.specific.map((s, i) => `${result.medium.length + i + 1}. ${s}`),
      '',
      `### Highly Specific Topics (${result.highlySpecific.length})`,
      ...result.highlySpecific.map((h, i) => `${result.medium.length + result.specific.length + i + 1}. ${h}`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riset_AI_${result.keyword.substring(0, 20).replace(/\s+/g, '_')}_${result.total}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadCsv = () => {
    if (!result) return;
    const headers = ['No', 'Level', 'Topic Title', 'Keyword Seed'];
    const rows: string[] = [];

    let count = 1;
    result.medium.forEach(item => {
      rows.push([count++, '"Medium"', `"${item.replace(/"/g, '""')}"`, `"${result.keyword.replace(/"/g, '""')}"`].join(','));
    });
    result.specific.forEach(item => {
      rows.push([count++, '"Specific"', `"${item.replace(/"/g, '""')}"`, `"${result.keyword.replace(/"/g, '""')}"`].join(','));
    });
    result.highlySpecific.forEach(item => {
      rows.push([count++, '"Highly Specific"', `"${item.replace(/"/g, '""')}"`, `"${result.keyword.replace(/"/g, '""')}"`].join(','));
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riset_AI_${result.keyword.substring(0, 20).replace(/\s+/g, '_')}_${result.total}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Process items for current tab
  const allCategorizedItems = useMemo(() => {
    if (!result) return [];
    const items: { id: string; level: 'medium' | 'specific' | 'highlySpecific'; text: string; num: number }[] = [];
    let n = 1;
    result.medium.forEach((text, i) => {
      items.push({ id: `med-${i}`, level: 'medium', text, num: n++ });
    });
    result.specific.forEach((text, i) => {
      items.push({ id: `spec-${i}`, level: 'specific', text, num: n++ });
    });
    result.highlySpecific.forEach((text, i) => {
      items.push({ id: `high-${i}`, level: 'highlySpecific', text, num: n++ });
    });
    return items;
  }, [result]);

  const filteredItems = useMemo(() => {
    return allCategorizedItems.filter(item => {
      if (activeTab !== 'all' && item.level !== activeTab) return false;
      if (searchFilter.trim() && !item.text.toLowerCase().includes(searchFilter.toLowerCase().trim())) {
        return false;
      }
      return true;
    });
  }, [allCategorizedItems, activeTab, searchFilter]);

  const providerName = aiOptions?.provider === 'openai' 
    ? 'ChatGPT (OpenAI)' 
    : (aiOptions?.provider ? `${aiOptions.provider.toUpperCase()}` : 'Gemini AI');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-purple-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  👑 Riset AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {providerName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {uiLanguage === 'id' 
                  ? 'Eksplorasi ide judul & topik komersial bertingkat (Medium, Specific, Highly Specific)'
                  : 'Multi-level commercial stock & AI concept explorer (Medium, Specific, Highly Specific)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Configuration Input Section */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Search size={13} className="text-amber-500" />
                {uiLanguage === 'id' ? 'Kata Kunci Utama / Ide Awal' : 'Seed Keyword / Theme'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) handleGenerate();
                  }}
                  placeholder={uiLanguage === 'id' ? "Contoh: feliz dia de la madre, ramadan coffee, cyberpunk street..." : "e.g. happy mothers day, ramadan coffee, cyberpunk street..."}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Layers size={13} className="text-purple-500" />
                {uiLanguage === 'id' ? 'Jumlah Output' : 'Total Ideas'}
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-black/30 p-1 rounded-2xl border border-slate-200/80 dark:border-white/5">
                {([30, 50, 100] as const).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTargetCount(num)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                      targetCount === num
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Info size={13} className="text-slate-400 shrink-0" />
              <span>
                {targetCount === 100 ? 'Proporsi: 30 Medium • 40 Specific • 30 Niche' : 
                 targetCount === 50 ? 'Proporsi: 15 Medium • 20 Specific • 15 Niche' : 
                 'Proporsi: 10 Medium • 10 Specific • 10 Niche'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !keyword.trim()}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all ${
                loading || !keyword.trim()
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white active:scale-95 cursor-pointer shadow-purple-500/20'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{uiLanguage === 'id' ? 'Sedang Meracik...' : 'Generating Topics...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{uiLanguage === 'id' ? 'Mulai Riset AI' : 'Launch AI Research'}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-600 dark:text-rose-400 font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          {result ? (
            <>
              {/* Filter Tabs & Export Tools */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-white/5">
                {/* Categorization Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    Semua ({result.total})
                  </button>
                  <button
                    onClick={() => setActiveTab('medium')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'medium'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20'
                    }`}
                  >
                    <span>Medium</span>
                    <span className="text-[10px] opacity-80">({result.medium.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('specific')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'specific'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                    }`}
                  >
                    <span>Specific</span>
                    <span className="text-[10px] opacity-80">({result.specific.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('highlySpecific')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'highlySpecific'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
                    }`}
                  >
                    <span>Niche / Long-tail</span>
                    <span className="text-[10px] opacity-80">({result.highlySpecific.length})</span>
                  </button>
                </div>

                {/* Export & Copy Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5"
                    title="Salin Semua Topik dengan Header"
                  >
                    {copiedAll ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedAll ? 'Tersalin!' : 'Salin Semua'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="p-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all"
                    title="Download format TXT"
                  >
                    <FileText size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="p-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all"
                    title="Download format CSV (Excel)"
                  >
                    <FileSpreadsheet size={14} />
                  </button>
                </div>
              </div>

              {/* In-results Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={uiLanguage === 'id' ? `Saring ${filteredItems.length} topik...` : `Filter ${filteredItems.length} topics...`}
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Items List Scroll Container */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada topik yang cocok dengan pencarian Anda.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isCopied = copiedId === item.id;
                    const badgeClass = 
                      item.level === 'medium' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' :
                      item.level === 'specific' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';

                    const badgeLabel = 
                      item.level === 'medium' ? 'Medium' :
                      item.level === 'specific' ? 'Specific' : 'Niche';

                    return (
                      <div 
                        key={item.id}
                        className="group flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.06] hover:border-amber-500/30 transition-all shadow-sm"
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <span className="w-6 text-[10px] font-mono text-slate-400 font-bold shrink-0">
                            #{item.num}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.text}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleCopySingle(item.text, item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            title="Salin Topik"
                          >
                            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTopic(item.text);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                            title="Jadikan Subject Prompt"
                          >
                            <span>Gunakan</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Empty state prior to generating */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Sparkles size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                {uiLanguage === 'id' ? 'Siap Meriset Puluhan Ide Topik AI' : 'Ready to Explore AI Topic Ideas'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                {uiLanguage === 'id'
                  ? 'Masukkan tema atau kata kunci awal di atas, lalu klik tombol "Mulai Riset AI" untuk menghasilkan daftar topik terstruktur berstandar pasar komersial.'
                  : 'Enter a seed keyword above and click "Launch AI Research" to generate structured commercial topic ideas.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
