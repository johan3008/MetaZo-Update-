import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Sparkles, Copy, Check, Download, Search, 
  ArrowRight, FileSpreadsheet, FileText, RefreshCw, 
  Layers, ChevronLeft, ArrowLeft
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] w-full h-full flex flex-col bg-[#f8f9fc] dark:bg-[#0f1422] text-slate-800 dark:text-slate-100 overflow-hidden animate-in fade-in duration-200" 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Navbar Header (Full Window Bar) */}
      <div className="h-16 px-4 sm:px-6 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all mr-2"
            title="Kembali ke Editor"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{uiLanguage === 'id' ? 'Kembali' : 'Back'}</span>
          </button>

          <span className="p-2 bg-violet-500/10 rounded-2xl">
            <Sparkles size={18} className="text-[#7c3aed]" />
          </span>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">
                {uiLanguage === 'id' ? '👑 Riset AI • Eksplorasi Topik Bertingkat' : '👑 AI Topic Research • Multi-Level Explorer'}
              </h2>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-[#7c3aed] dark:text-violet-400 border border-violet-500/20">
                {providerName}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block">
              {uiLanguage === 'id'
                ? 'Riset ide judul komersial microstock dan visual AI: Medium (Volume Tinggi) • Specific (Adegan Jelas) • Niche (Long-tail)'
                : 'Commercial stock and AI concept research: Medium (High Volume) • Specific (Clear Scene) • Niche (Long-tail)'}
            </p>
          </div>
        </div>

        {/* Close Button at top right */}
        <button 
          onClick={onClose} 
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-all"
          title="Tutup Jendela"
        >
          <X size={16} />
        </button>
      </div>

      {/* Control / Config Bar */}
      <div className="px-4 sm:px-6 py-4 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-md border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Keyword input */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleGenerate();
              }}
              placeholder={uiLanguage === 'id' ? "Ketik kata kunci atau tema awal (contoh: feliz dia de la madre, ramadan coffee, cyberpunk...)" : "Enter seed keyword (e.g. mothers day, ramadan coffee, cyberpunk...)"}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Count Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shrink-0">
            {([30, 50, 100] as const).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTargetCount(num)}
                className={`py-1.5 px-3.5 rounded-[1.25rem] font-bold text-xs transition-all ${
                  targetCount === num
                    ? 'bg-white dark:bg-[#111827] border border-[#7c3aed] text-[#7c3aed] shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {num} Ide
              </button>
            ))}
          </div>

          {/* Start Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !keyword.trim()}
            className={`px-6 py-2.5 font-bold rounded-2xl text-xs uppercase shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0 ${
              loading || !keyword.trim()
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-[#7c3aed] text-white shadow-violet-500/20 cursor-pointer hover:opacity-95'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>{uiLanguage === 'id' ? 'Sedang Meracik...' : 'Generating...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>{uiLanguage === 'id' ? 'Mulai Riset AI' : 'Start Research'}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto mt-2.5 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-600 dark:text-rose-400 font-semibold">
            {error}
          </div>
        )}
      </div>

      {/* Sub Toolbar (Categories Tabs & Actions when results exist) */}
      {result && (
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-[#141b2d] border-b border-slate-200 dark:border-white/5 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#7c3aed] text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Semua ({result.total})
              </button>
              <button
                onClick={() => setActiveTab('medium')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'medium'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20'
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
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
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
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
                }`}
              >
                <span>Niche / Long-tail</span>
                <span className="text-[10px] opacity-80">({result.highlySpecific.length})</span>
              </button>
            </div>

            {/* Quick in-results search & export tools */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={uiLanguage === 'id' ? `Saring ${filteredItems.length} topik...` : `Filter ${filteredItems.length} topics...`}
                  className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed]"
                />
              </div>

              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                title="Salin Semua Topik"
              >
                {copiedAll ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedAll ? 'Tersalin' : 'Salin Semua'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shrink-0"
                title="Download TXT"
              >
                <FileText size={13} />
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl transition-all shrink-0"
                title="Download CSV (Excel)"
              >
                <FileSpreadsheet size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body Content: Multi-Column Grid spanning full body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {result ? (
            filteredItems.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Tidak ada topik yang cocok dengan pencarian "{searchFilter}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const isCopied = copiedId === item.id;
                  const badgeClass = 
                    item.level === 'medium' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' :
                    item.level === 'specific' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                    'bg-purple-500/10 text-[#7c3aed] dark:text-violet-400 border-purple-500/20';

                  const badgeLabel = 
                    item.level === 'medium' ? 'Medium' :
                    item.level === 'specific' ? 'Specific' : 'Niche';

                  return (
                    <div 
                      key={item.id}
                      className="group p-3.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col justify-between transition-all hover:border-[#7c3aed]/60 hover:shadow-md dark:hover:shadow-black/20"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            #{item.num}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed group-hover:text-[#7c3aed] dark:group-hover:text-violet-400 transition-colors">
                          {item.text}
                        </p>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-slate-100 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => handleCopySingle(item.text, item.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
                          title="Salin Topik"
                        >
                          {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTopic(item.text);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-[#7c3aed] hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                          title="Jadikan Subject Prompt di Prompt Studio"
                        >
                          <span>Gunakan</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <span className="p-3 bg-violet-500/10 rounded-3xl text-[#7c3aed]">
                <Sparkles size={28} />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                {uiLanguage === 'id' ? 'Studio Riset AI: Jelajahi Puluhan Ide Topik Komersial' : 'AI Topic Studio: Explore Commercial Themes'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                {uiLanguage === 'id'
                  ? 'Ketik kata kunci atau tema awal pada bilah atas, pilih jumlah ide (30, 50, atau 100), lalu klik "Mulai Riset AI" untuk meracik ide judul bertingkat dalam tampilan luas.'
                  : 'Type a seed theme above, choose total ideas (30, 50, or 100), then click "Start Research" to explore multi-level topics in full-screen.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
