import React from 'react';
import { RefreshCcw, Zap, Clock, ArrowRight, Loader2, Sparkles, Globe, Cpu, Sliders, Hash, Type } from 'lucide-react';
import { ToolType, ProgressInfo } from '../../types';

interface AiConfigPanelProps {
  activeTool: ToolType;
  customPrompt: string;
  setCustomPrompt: (p: string) => void;
  keywordCount: number | string;
  setKeywordCount: (c: number | string) => void;
  keywordMode: 'mixed' | 'single' | 'multi';
  setKeywordMode: (mode: 'mixed' | 'single' | 'multi') => void;
  titleLength: 'short' | 'medium' | 'long';
  setTitleLength: (length: 'short' | 'medium' | 'long') => void;
  metadataLanguage: string;
  setMetadataLanguage: (lang: string) => void;
  aiCreativity: number;
  setAiCreativity: (val: number) => void;
  aiModelPerformance?: 'speed' | 'detail';
  setAiModelPerformance?: (val: 'speed' | 'detail') => void;
  isLoading: boolean;
  progressInfo: ProgressInfo | null;
  isPaused: boolean;
  filesToGenerateCount: number;
  filesWithErrorCount: number;
  handleGenerateAll: (retryFailed: boolean) => void;
  handleStopGeneration: () => void;
  mobileTab: 'upload' | 'ai' | 'review';
  setMobileTab: (tab: 'upload' | 'ai' | 'review') => void;
  t: any;
  hasFiles: boolean;
}

export const AiConfigPanel: React.FC<AiConfigPanelProps> = ({
  activeTool,
  customPrompt,
  setCustomPrompt,
  keywordCount,
  setKeywordCount,
  keywordMode,
  setKeywordMode,
  titleLength,
  setTitleLength,
  metadataLanguage,
  setMetadataLanguage,
  aiCreativity,
  setAiCreativity,
  aiModelPerformance = 'detail',
  setAiModelPerformance = (val: 'speed' | 'detail') => {},
  isLoading,
  progressInfo,
  isPaused,
  filesToGenerateCount,
  filesWithErrorCount,
  handleGenerateAll,
  handleStopGeneration,
  mobileTab,
  setMobileTab,
  t,
  hasFiles
}) => {
  const getCreativityLabel = (val: number) => {
    if (val <= 0.3) return 'Strict & Factual';
    if (val <= 0.6) return 'Standard Microstock';
    if (val <= 0.8) return 'Balanced Creative';
    return 'High Variety';
  };

  return (
    <div className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-xl shadow-black/5 flex flex-col justify-between min-h-[500px] relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-violet-500/20 ${
      mobileTab === 'ai' ? 'flex animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:flex'
    }`}>
      {/* Top Accent Gradient Line */}
      <div className={`h-1 w-full bg-gradient-to-r ${
        activeTool === ToolType.IMAGE ? 'from-violet-500 via-indigo-500 to-purple-500' :
        activeTool === ToolType.VIDEO ? 'from-purple-500 via-fuchsia-500 to-pink-500' :
        'from-emerald-500 via-teal-500 to-cyan-500'
      }`} />

      {/* CARD HEADER */}
      <div className="bg-slate-50/80 dark:bg-slate-850/60 py-4 px-6 border-b border-slate-200/70 dark:border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/30">
            02
          </div>
          <div className="flex items-center gap-2">
            <h3 className="m-0 font-black text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider">
              AI Generation Engine
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-violet-600 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-500/20 px-2.5 py-1 rounded-full border border-violet-500/25 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            Dual-Vision (Florence-2 + AI)
          </span>
        </div>
      </div>

      {/* CARD BODY */}
      <div className="p-5 sm:p-6 flex-grow flex flex-col justify-between relative z-10 space-y-4">
        <div>
          {/* SECTION 1: LANGUAGE & MODEL SELECTION ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
            {/* Metadata Language */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/25 rounded-2xl border border-slate-200/70 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} className="text-violet-500" />
                  <span>Metadata Language</span>
                </label>
              </div>
              <select
                value={metadataLanguage}
                onChange={(e) => setMetadataLanguage(e.target.value)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-black transition-all"
              >
                <option value="en">🇺🇸 English (Default)</option>
                <option value="id">🇮🇩 Indonesian / Bahasa</option>
                <option value="ja">🇯🇵 Japanese / 日本語</option>
                <option value="ko">🇰🇷 Korean / 한국어</option>
                <option value="es">🇪🇸 Spanish / Español</option>
                <option value="fr">🇫🇷 French / Français</option>
                <option value="de">🇩🇪 German / Deutsch</option>
                <option value="it">🇮🇹 Italian / Italiano</option>
                <option value="pt">🇵🇹 Portuguese / Português</option>
                <option value="ru">🇷🇺 Russian / Русский</option>
              </select>
            </div>

            {/* Model Performance */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/25 rounded-2xl border border-slate-200/70 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={13} className="text-violet-500" />
                  <span>AI Profile</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'speed', label: '⚡ Ultra Fast' },
                  { value: 'detail', label: '🎯 Deep Detail' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiModelPerformance?.(opt.value as 'speed' | 'detail')}
                    className={`py-2 px-2.5 text-[11px] font-black rounded-xl border transition-all text-center cursor-pointer ${
                      aiModelPerformance === opt.value
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-600 shadow-md shadow-violet-500/25'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: KEYWORD RULES & TITLE LENGTH */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3.5">
            {/* Keyword Count */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/25 rounded-2xl border border-slate-200/70 dark:border-white/5 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Hash size={12} className="text-violet-500" />
                  <span>Tags Target</span>
                </label>
                <div className="flex gap-1">
                  {[30, 40, 49].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setKeywordCount(c)}
                      className={`px-1.5 py-0.5 text-[9px] font-black rounded-md ${
                        keywordCount === c ? 'bg-violet-600 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <input 
                type="number" 
                min="1" 
                max="49" 
                value={keywordCount} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setKeywordCount('');
                  } else {
                    const num = Math.min(49, Math.max(1, parseInt(val) || 1));
                    setKeywordCount(num);
                  }
                }} 
                className="w-full h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-center text-xs font-black text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-violet-500/40 outline-none font-mono" 
              />
            </div>

            {/* Keyword Style */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/25 rounded-2xl border border-slate-200/70 dark:border-white/5 shadow-sm">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Keyword Style
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'mixed', label: 'Mix' },
                  { value: 'single', label: 'Single' },
                  { value: 'multi', label: 'Multi' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKeywordMode(opt.value as 'mixed' | 'single' | 'multi')}
                    className={`py-2 text-[10px] font-black rounded-xl border transition-all text-center cursor-pointer ${
                      keywordMode === opt.value
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-600 shadow-md shadow-violet-500/25'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Length */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/25 rounded-2xl border border-slate-200/70 dark:border-white/5 shadow-sm">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Type size={12} className="text-violet-500" />
                <span>Title Length</span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'short', label: 'Short' },
                  { value: 'medium', label: 'Mid' },
                  { value: 'long', label: 'Long' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTitleLength(opt.value as 'short' | 'medium' | 'long')}
                    className={`py-2 text-[10px] font-black rounded-xl border transition-all text-center cursor-pointer ${
                      titleLength === opt.value
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-600 shadow-md shadow-violet-500/25'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: CUSTOM PROMPT ANCHOR */}
          <div className="p-3 bg-slate-50/80 dark:bg-black/25 rounded-2xl border border-slate-200/70 dark:border-white/5 mb-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-violet-500" />
                <span>{t.custom_prompt_optional}</span>
              </label>
              <span className="text-[9px] font-black text-violet-600 dark:text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full border border-violet-500/20">
                SEO Anchor
              </span>
            </div>
            <textarea 
              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 outline-none text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none min-h-[64px] max-h-[96px] font-medium placeholder-slate-400" 
              value={customPrompt} 
              onChange={(e) => setCustomPrompt(e.target.value)} 
              placeholder={t.custom_prompt_placeholder}
            />
          </div>

          {/* SECTION 4: AI CREATIVITY SLIDER */}
          <div className="p-3 bg-slate-50/80 dark:bg-black/25 rounded-2xl border border-slate-200/70 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={12} className="text-amber-500" />
                <span>AI Creativity Level</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">
                  {getCreativityLabel(aiCreativity)}
                </span>
                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700 font-mono shadow-sm">
                  {aiCreativity.toFixed(1)}
                </span>
              </div>
            </div>
            <input 
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={aiCreativity}
              onChange={(e) => setAiCreativity(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
            />
          </div>
        </div>

        {/* CONTROLS FLOOR */}
        <div className="space-y-3 w-full pt-2">
          {isLoading && progressInfo && (
            <div className="p-3.5 bg-violet-500/10 border border-violet-500/25 rounded-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                <span className="text-violet-600 dark:text-violet-400 flex items-center">
                  <RefreshCcw size={12} className="animate-spin mr-1.5"/> 
                  {activeTool === ToolType.VIDEO ? "Dual-Vision Video Frames" : activeTool === ToolType.VECTOR ? "Parsing Vector Semantics" : "Dual-Vision Visual Analysis"} {progressInfo.current}/{progressInfo.total}
                </span>
                <span className="text-slate-500 font-mono font-bold">{progressInfo.duration}s elapsed</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500 transition-all duration-300 shadow-sm" 
                  style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2.5">
            <button 
              onClick={() => handleGenerateAll(false)} 
              disabled={isLoading || !filesToGenerateCount} 
              className={`flex-1 py-4 px-5 text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2.5 cursor-pointer duration-200 active:scale-[0.98] ${
                isLoading && !isPaused 
                  ? 'bg-violet-500 cursor-not-allowed' 
                  : isPaused 
                    ? 'bg-amber-500 hover:bg-amber-600' 
                    : !filesToGenerateCount 
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Zap size={18} className="fill-current" />
              )}
              <span className="text-xs sm:text-sm uppercase tracking-wider font-black">
                {isPaused ? "Rate-limited (Auto Retrying...)" : isLoading ? t.generating : `${t.generate_all} (${filesToGenerateCount})`}
              </span>
            </button>
            
            {isLoading && (
              <button 
                onClick={handleStopGeneration}
                className="px-5 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center active:scale-[0.98] text-xs uppercase tracking-wider cursor-pointer"
                title="Stop Processing"
              >
                <span>STOP</span>
              </button>
            )}
          </div>

          {filesWithErrorCount > 0 && !isLoading && (
            <button 
              onClick={() => handleGenerateAll(true)} 
              className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              <RefreshCcw size={12} />
              <span>{t.retry_failed} ({filesWithErrorCount})</span>
            </button>
          )}

          {/* Mobile Only Step Progression Helper Button */}
          {hasFiles && !isLoading && (
            <div className="flex lg:hidden pt-1 w-full">
              <button
                onClick={() => {
                  if ('vibrate' in navigator) {
                    try { navigator.vibrate(20); } catch(e) {}
                  }
                  setMobileTab('review');
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black rounded-xl flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider shadow active:scale-[0.98] transition-all"
              >
                <span>Next: Review & Export</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
