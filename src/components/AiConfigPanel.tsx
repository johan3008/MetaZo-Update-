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
    <div className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-xl shadow-black/5 flex flex-col justify-between min-h-[480px] relative overflow-hidden transition-all duration-300 ${
      mobileTab === 'ai' ? 'flex animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:flex'
    }`}>
      {/* CARD HEADER */}
      <div className="bg-slate-50/70 dark:bg-slate-850/50 py-3.5 px-5 border-b border-slate-200/60 dark:border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/20">
            02
          </div>
          <div className="flex items-center gap-2">
            <h3 className="m-0 font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider">
              AI Generation Engine
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CLIP Rank V2
            </span>
          </div>
        </div>
      </div>

      {/* CARD BODY */}
      <div className="p-5 sm:p-6 flex-grow flex flex-col justify-between relative z-10 space-y-4">
        <div>
          {/* SECTION 1: LANGUAGE & MODEL SELECTION ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
            {/* Metadata Language */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} className="text-violet-500" />
                  <span>Metadata Language</span>
                </label>
              </div>
              <select
                value={metadataLanguage}
                onChange={(e) => setMetadataLanguage(e.target.value)}
                className="w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-bold transition-all"
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
            <div className="p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={13} className="text-violet-500" />
                  <span>AI Model Profile</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'speed', label: '⚡ Speed' },
                  { value: 'detail', label: '🎯 Detail' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiModelPerformance?.(opt.value as 'speed' | 'detail')}
                    className={`py-1.5 px-2 text-[11px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${
                      aiModelPerformance === opt.value
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20'
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
            <div className="p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Hash size={12} className="text-violet-500" />
                  <span>Count</span>
                </label>
                <div className="flex gap-1">
                  {[30, 40, 49].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setKeywordCount(c)}
                      className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded ${
                        keywordCount === c ? 'bg-violet-600 text-white' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
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
                className="w-full h-8.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-center text-xs font-black text-slate-800 dark:text-white transition-all focus:ring-2 focus:ring-violet-500/40 outline-none" 
              />
            </div>

            {/* Keyword Style */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
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
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${
                      keywordMode === opt.value
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Length */}
            <div className="p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
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
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg border transition-all text-center cursor-pointer ${
                      titleLength === opt.value
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20'
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
          <div className="p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5 mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-violet-500" />
                <span>{t.custom_prompt_optional}</span>
              </label>
              <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded">
                Prompt Anchor
              </span>
            </div>
            <textarea 
              className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/80 outline-none text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none min-h-[60px] max-h-[90px] font-medium placeholder-slate-400" 
              value={customPrompt} 
              onChange={(e) => setCustomPrompt(e.target.value)} 
              placeholder={t.custom_prompt_placeholder}
            />
          </div>

          {/* SECTION 4: AI CREATIVITY SLIDER */}
          <div className="p-3 bg-slate-50/80 dark:bg-black/20 rounded-xl border border-slate-200/70 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={12} className="text-amber-500" />
                <span>AI Creativity</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">
                  {getCreativityLabel(aiCreativity)}
                </span>
                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 text-xs font-black rounded-md border border-slate-200 dark:border-slate-700 font-mono">
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
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
            />
          </div>
        </div>

        {/* CONTROLS FLOOR */}
        <div className="space-y-3 w-full pt-2">
          {isLoading && progressInfo && (
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                <span className="text-violet-600 dark:text-violet-400 flex items-center">
                  <RefreshCcw size={11} className="animate-spin mr-1.5"/> 
                  {activeTool === ToolType.VIDEO ? "Decoding Frames" : activeTool === ToolType.VECTOR ? "Parsing Vector Data" : "Analyzing Visuals"} {progressInfo.current}/{progressInfo.total}
                </span>
                <span className="text-slate-500 font-mono font-bold">{progressInfo.duration}s elapsed</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300 shadow-sm" 
                  style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button 
              onClick={() => handleGenerateAll(false)} 
              disabled={isLoading || !filesToGenerateCount} 
              className={`flex-1 py-3.5 px-4 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer duration-200 active:scale-[0.98] ${
                isLoading && !isPaused 
                  ? 'bg-violet-500 cursor-not-allowed' 
                  : isPaused 
                    ? 'bg-amber-500 hover:bg-amber-600' 
                    : !filesToGenerateCount 
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30'
              }`}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} className="fill-current" />
              )}
              <span className="text-xs sm:text-sm uppercase tracking-wider font-extrabold">
                {isPaused ? "Rate-limited (Auto Retrying...)" : isLoading ? t.generating : `${t.generate_all} (${filesToGenerateCount})`}
              </span>
            </button>
            
            {isLoading && (
              <button 
                onClick={handleStopGeneration}
                className="px-4 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center active:scale-[0.98] text-xs uppercase tracking-wider cursor-pointer"
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
