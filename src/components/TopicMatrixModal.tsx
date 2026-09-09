import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Sparkles, Copy, Check, Download, Search, 
  ArrowRight, FileSpreadsheet, FileText, RefreshCw, 
  Layers, Info
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative max-h-[90vh]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button identical to Pengaturan Model AI */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-all"
          title="Tutup Modal"
        >
          <X size={14} />
        </button>

        {/* Header styled identical to Pengaturan Model AI */}
        <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-200 dark:border-white/5 shrink-0 select-none">
          <span className="p-1.5 bg-violet-500/10 rounded-2xl">
            <Sparkles size={16} className="text-[#7c3aed]" />
          </span>
          <div className="flex-1 flex items-center justify-between pr-8">
            <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              {uiLanguage === 'id' ? '👑 Riset AI (Topik Bertingkat)' : '👑 AI Topic Research (Multi-Level)'}
            </h2>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-[#7c3aed] dark:text-violet-400 border border-violet-500/20">
              {providerName}
            </span>
          </div>
        </div>

        {/* Input Card Container (Styled like Settings Main Provider Box) */}
        <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shrink-0 shadow-inner space-y-2.5">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-1.5 flex items-center gap-1.5">
              <Search size={11} className="text-[#7c3aed]" />
              {uiLanguage === 'id' ? 'Kata Kunci Utama / Tema Awal' : 'Seed Keyword / Theme'}
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleGenerate();
              }}
              placeholder={uiLanguage === 'id' ? "Contoh: feliz dia de la madre, ramadan coffee, cyberpunk street..." : "e.g. happy mothers day, ramadan coffee, cyberpunk street..."}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Layers size={11} className="text-[#7c3aed]" />
                {uiLanguage === 'id' ? 'Pilih Jumlah Ide' : 'Total Ideas'}
              </label>
              <span className="text-[9px] text-slate-400 font-bold">
                {targetCount === 100 ? '30 Medium • 40 Specific • 30 Niche' : 
                 targetCount === 50 ? '15 Medium • 20 Specific • 15 Niche' : 
                 '10 Medium • 10 Specific • 10 Niche'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([30, 50, 100] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTargetCount(num)}
                  className={`py-1.5 px-3 rounded-[1.25rem] border font-bold text-xs transition-all ${
                    targetCount === num
                      ? 'bg-white dark:bg-slate-950 border-[#7c3aed] text-[#7c3aed] shadow-sm'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {num} Ide
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !keyword.trim()}
            className={`w-full py-2.5 font-bold rounded-2xl text-xs uppercase shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
              loading || !keyword.trim()
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-[#7c3aed] text-white shadow-violet-500/20 cursor-pointer hover:opacity-95'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>{uiLanguage === 'id' ? 'Sedang Meracik...' : 'Generating Topics...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>{uiLanguage === 'id' ? 'Mulai Riset AI' : 'Start AI Research'}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-600 dark:text-rose-400 font-semibold">
            {error}
          </div>
        )}

        {/* Content Section */}
        {result ? (
          <div className="flex flex-col flex-1 overflow-hidden space-y-2.5">
            {/* Tab dropdown styled identical to Settings Modal Tab selector */}
            <div className="flex items-center gap-2">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-1.5 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all shadow-sm"
              >
                <option value="all">Semua Kategori ({result.total} Topik)</option>
                <option value="medium">🟦 Medium Topics ({result.medium.length} - Pencarian Umum)</option>
                <option value="specific">🟩 Specific Topics ({result.specific.length} - Konsep Jelas)</option>
                <option value="highlySpecific">🟪 Niche / Long-tail ({result.highlySpecific.length} - Konversi Tinggi)</option>
              </select>

              {/* Action buttons */}
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                title="Salin Semua Topik"
              >
                {copiedAll ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedAll ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full transition-all shrink-0"
                title="Download TXT"
              >
                <FileText size={13} />
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full transition-all shrink-0"
                title="Download CSV"
              >
                <FileSpreadsheet size={13} />
              </button>
            </div>

            {/* Quick in-results search filter */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={uiLanguage === 'id' ? `Saring ${filteredItems.length} topik...` : `Filter ${filteredItems.length} topics...`}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Scrollable List identical to settings card list items */}
            <div className="space-y-2 text-xs font-semibold overflow-y-auto pr-1 flex-1 scrollbar-thin">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada topik yang cocok dengan pencarian Anda.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isCopied = copiedId === item.id;
                  const badgeClass = 
                    item.level === 'medium' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' :
                    item.level === 'specific' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                    'bg-violet-500/10 text-[#7c3aed] dark:text-violet-400 border-violet-500/20';

                  const badgeLabel = 
                    item.level === 'medium' ? 'Medium' :
                    item.level === 'specific' ? 'Specific' : 'Niche';

                  return (
                    <div 
                      key={item.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs transition-all hover:border-[#7c3aed]/50 shadow-inner"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
                          #{item.num}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                        <span className="text-slate-800 dark:text-slate-100 font-medium truncate">
                          {item.text}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopySingle(item.text, item.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl transition-all"
                          title="Salin Topik"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTopic(item.text);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-[#7c3aed] hover:bg-violet-700 text-white font-bold text-[11px] rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                          title="Jadikan Subject Prompt"
                        >
                          <span>Gunakan</span>
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
            <span className="p-2.5 bg-violet-500/10 rounded-2xl text-[#7c3aed]">
              <Sparkles size={20} />
            </span>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {uiLanguage === 'id' ? 'Siap Meriset Ide Topik Komersial' : 'Ready to Explore Commercial Topics'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
              {uiLanguage === 'id'
                ? 'Ketik kata kunci di atas lalu klik tombol "Mulai Riset AI" untuk menghasilkan variasi topik Medium, Specific, dan Niche.'
                : 'Enter a keyword above and click "Start AI Research" to generate Medium, Specific, and Niche topic variations.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
