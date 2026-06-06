import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Monitor, 
  Film, 
  ShieldAlert,
  Sparkles,
  History,
  Trash2,
  Clapperboard,
  Copy,
  Download,
  Terminal,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoAnalysisResult, VideoPrompt } from '../../types';

interface HistoryItem {
  id: string;
  keyword: string;
  result: VideoAnalysisResult;
  timestamp: number;
}

export const PromptVideoView: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [hollywoodPrompts, setHollywoodPrompts] = useState<VideoPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history
  useEffect(() => {
    try {
      const stored = localStorage.getItem('metazo_video_analysis_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setResult(null);
    setHollywoodPrompts([]);
    setError(null);

    try {
      const response = await fetch('/api/analyze-video-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });

      if (!response.ok) {
        throw new Error('Gagal menganalisis keyword. Coba lagi nanti.');
      }

      const data = await response.json();
      setResult(data);

      // Save to history
      const newItem: HistoryItem = {
        id: `vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        keyword: keyword.trim(),
        result: data,
        timestamp: Date.now()
      };
      
      const updatedHistory = [newItem, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem('metazo_video_analysis_history', JSON.stringify(updatedHistory));
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('metazo_video_analysis_history');
  };

  const removeHistoryItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('metazo_video_analysis_history', JSON.stringify(updated));
  };

  const loadFromHistory = (item: HistoryItem) => {
    setKeyword(item.keyword);
    setResult(item.result);
    setHollywoodPrompts([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateHollywoodPrompts = async () => {
    if (!keyword.trim() || isGeneratingPrompts) return;
    
    setIsGeneratingPrompts(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-hollywood-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghasilkan Hollywood prompts. Coba lagi nanti.');
      }

      const data = await response.json();
      setHollywoodPrompts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const getCombinedPrompt = (p: VideoPrompt) => {
    return `${p.subject}. ${p.movement}. ${p.environment}. ${p.lighting}. ${p.camera_angle}, ${p.camera_movement}. Style: ${p.style}.`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadPrompts = () => {
    const content = hollywoodPrompts.map((p, i) => `${i + 1}. ${getCombinedPrompt(p)}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hollywood_prompts_${keyword.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <section className="bg-white dark:bg-[#1e293b] rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                <Video className="text-white" size={28} />
              </div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Video Stock Analyst</h1>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Dapatkan analisis <span className="text-red-500 italic">Brutal & Jujur</span> dari AI untuk keyword video footage Anda. 
              Ketahui apakah ide Anda layak diproduksi atau hanya membuang waktu.
            </p>
          </div>
          
          <form onSubmit={handleAnalyze} className="w-full md:w-auto relative">
                <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Misal: Person running in cyber city..."
                  className="w-full sm:w-80 h-12 pl-12 pr-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isAnalyzing || isGeneratingPrompts || !keyword.trim()}
                  onClick={(e) => { e.preventDefault(); handleAnalyze(); }}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={16} />
                      <span>Analisis</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing || isGeneratingPrompts || !keyword.trim()}
                  onClick={(e) => { e.preventDefault(); handleGenerateHollywoodPrompts(); }}
                  className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  {isGeneratingPrompts ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Clapperboard size={16} />
                      <span>Director</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center space-x-4"
          >
            <AlertCircle className="text-red-500 shrink-0" size={24} />
            <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status Card */}
            <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden ${
              result.status === 'LAYAK PRODUKSI' 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center space-x-5">
                  <div className={`p-4 rounded-2xl ${
                    result.status === 'LAYAK PRODUKSI' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                    {result.status === 'LAYAK PRODUKSI' ? (
                      <CheckCircle2 className="text-white" size={32} />
                    ) : (
                      <XCircle className="text-white" size={32} />
                    )}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tighter ${
                      result.status === 'LAYAK PRODUKSI' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {result.status}
                    </h2>
                    <p className="text-sm font-bold text-slate-500 italic mt-1">"{result.conclusion}"</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Competition Level</div>
                  <div className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${
                    result.competitionLevel === 'Rendah' ? 'bg-emerald-500/20 text-emerald-600' :
                    result.competitionLevel === 'Menengah' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-600'
                  }`}>
                    {result.competitionLevel}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-start space-x-4">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Potential</div>
                  <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{result.demandPotential} / {result.demandType}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-start space-x-4">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 shrink-0">
                  <Target size={20} />
                </div>
                <div className="min-w-0 w-full">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Buyer</div>
                  <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5 break-words whitespace-normal">{result.targetBuyer}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-start space-x-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
                  <Film size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cinematic</div>
                  <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{result.cinematicPotential}</div>
                </div>
              </div>
            </div>

            {/* Detailed Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Market Insight */}
              <div className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase flex items-center space-x-2">
                  <Monitor size={14} className="text-blue-500" />
                  <span>Market Insight</span>
                </h3>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {result.marketInsight}
                </p>
                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Competition Critique</div>
                  <p className="text-xs font-bold text-red-500 italic">"{result.competitionNotes}"</p>
                </div>
              </div>

              {/* Solution/Revisions */}
              <div className="bg-slate-900 dark:bg-black p-8 rounded-3xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white uppercase flex items-center space-x-2">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Solusi & Arahan Optimasi</span>
                </h3>
                <div className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl">
                  <p className="text-sm font-bold text-amber-500 leading-relaxed">
                    {result.solution}
                  </p>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Recommended Format</div>
                      <div className="text-xs font-black text-white">{result.recommendedFormat}</div>
                    </div>
                    {hollywoodPrompts.length === 0 && (
                      <button 
                        onClick={handleGenerateHollywoodPrompts}
                        disabled={isGeneratingPrompts}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center space-x-2"
                      >
                        {isGeneratingPrompts ? <Loader2 size={12} className="animate-spin" /> : <Clapperboard size={12} />}
                        <span>AI Director Prompts</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Director's Insight</div>
                    <div className="text-xs font-medium text-slate-400 leading-relaxed italic">{result.cinematicReason}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hollywood Prompts Section */}
        {hollywoodPrompts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-8 py-6 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <Clapperboard className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">AI Hollywood Director</h2>
                    <p className="text-xs font-bold text-white/70 italic">50 Masterpiece prompts for Text-to-Video Generators</p>
                  </div>
                </div>
                <button 
                  onClick={downloadPrompts}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
                  title="Download All"
                >
                  <Download size={20} />
                </button>
              </div>

              <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                <div className="grid grid-cols-1 gap-4">
                  {hollywoodPrompts.map((prompt, idx) => (
                    <div 
                      key={`${prompt.id}-${idx}`}
                      className="group p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-xl">
                            {idx + 1}
                          </span>
                          <span className="px-3 py-1 bg-emerald-500/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest rounded-full">{prompt.style} shot</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(getCombinedPrompt(prompt))}
                          className="px-3 py-1 opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-full transition-all flex items-center space-x-2"
                        >
                          <Copy size={12} />
                          <span className="text-[9px] font-black uppercase">Copy Prompt</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                              <Target size={12}/> <span>Subject & Movement</span>
                            </label>
                            <p className="text-sm font-bold text-white">{prompt.subject}. {prompt.movement}.</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                              <Monitor size={12}/> <span>Environment</span>
                            </label>
                            <p className="text-sm font-medium text-slate-300">{prompt.environment}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                              <Sparkles size={12}/> <span>Lighting</span>
                            </label>
                            <p className="text-sm font-medium text-slate-300">{prompt.lighting}</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                              <Camera size={12}/> <span>Camera</span>
                            </label>
                            <p className="text-sm font-bold text-emerald-400">{prompt.camera_angle}, {prompt.camera_movement}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/5">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center space-x-1.5">
                          <Terminal size={12} /> <span>Technical String</span>
                        </div>
                        <div className="p-3 bg-black/60 rounded-xl border border-white/5 group-hover:border-emerald-500/20 transition-colors">
                          <code className="text-xs text-slate-400 font-mono leading-relaxed block overflow-x-auto whitespace-pre-wrap">
                            {getCombinedPrompt(prompt)}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section */}
      {history.length > 0 && (
        <section className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-lg">
          <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History size={16} className="text-slate-400" />
              <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Analysis History</h2>
            </div>
            <button 
              onClick={clearHistory}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {history.map((item) => (
              <div 
                key={item.id}
                className="px-8 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group"
                onClick={() => loadFromHistory(item)}
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.result.status === 'LAYAK PRODUKSI' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}>
                    {item.result.status === 'LAYAK PRODUKSI' ? (
                      <CheckCircle2 className="text-white" size={14} />
                    ) : (
                      <XCircle className="text-white" size={14} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{item.keyword}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                      {new Date(item.timestamp).toLocaleDateString()} • {item.result.demandPotential} Demand
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                    item.result.status === 'LAYAK PRODUKSI' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                  }`}>
                    {item.result.status}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(item.id);
                    }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Intro Stats Banner */}
      {(!result && history.length === 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center text-center space-y-3">
            <ShieldAlert size={32} className="text-slate-300" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Market Saturation Alert</h3>
            <p className="text-[11px] font-medium text-slate-400">Peringatan otomatis jika pasar sudah terlalu jenuh dengan konten serupa.</p>
          </div>
          <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center text-center space-y-3">
            <TrendingUp size={32} className="text-slate-300" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Revenue Forecast</h3>
            <p className="text-[11px] font-medium text-slate-400">Estimasi potensi pendapatan berdasarkan tren pembeli di Adobe Stock & Shutterstock.</p>
          </div>
        </div>
      )}
    </div>
  );
};
