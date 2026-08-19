import React from 'react';
import { RefreshCcw, Zap, Clock, ArrowRight, Loader2 } from 'lucide-react';
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
  return (
    <div className={`bg-white dark:bg-[#111827] border-[2px] border-[#e3e6f0]/80 dark:border-white/5 rounded-[2rem] shadow-xl shadow-black/5 flex flex-col justify-between min-h-[460px] relative overflow-hidden transition-all duration-300 hover:shadow-2xl ${
      mobileTab === 'ai' ? 'flex animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:flex'
    }`}>
      {/* CARD HEADER */}
      <div className="bg-[#f8f9fc] dark:bg-slate-900 py-3.5 px-5 border-b border-[#e3e6f0]/60 dark:border-white/5 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <div className="w-6.5 h-6.5 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center font-black text-xs shadow-md shadow-black/5">
            2
          </div>
          <h3 className="m-0 font-extrabold text-[#7c3aed] dark:text-violet-400 text-xs sm:text-sm uppercase tracking-wider">
            AI Engine Settings
          </h3>
        </div>
      </div>

      {/* CARD BODY */}
      <div className="p-6 flex-grow flex flex-col justify-between relative z-10">
        <div>
          <p className="text-slate-400 dark:text-slate-500 mb-5 text-xs font-semibold leading-relaxed">
            {t.generate_desc}
          </p>

          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{t.custom_prompt_optional}</span>
                <span className="text-[8px] text-[#7c3aed] font-black lowercase pb-0.5 opacity-75">Prompt anchor</span>
              </label>
              <textarea 
                className="w-full p-4 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/80 dark:border-white/5 outline-none text-xs min-h-[90px] text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]/80 transition-all resize-none font-medium placeholder-slate-400/70" 
                value={customPrompt} 
                onChange={(e) => setCustomPrompt(e.target.value)} 
                placeholder={t.custom_prompt_placeholder}
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.keyword_count_label}</label>
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
                className="w-14 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[1.5rem] text-center text-xs font-black dark:text-white transition-all focus:ring-2 focus:ring-[#7c3aed]/30 outline-none shadow-md shadow-black/5" 
              />
            </div>

            <div className="space-y-2 p-3.5 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Keyword Style / Gaya Keyword
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'mixed', label: 'Mixed' },
                  { value: 'single', label: 'Single' },
                  { value: 'multi', label: 'Multi' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKeywordMode(opt.value as 'mixed' | 'single' | 'multi')}
                    className={`py-2 px-2 text-[10px] uppercase font-extrabold rounded-[1.5rem] border transition-all text-center ${
                      keywordMode === opt.value
                        ? 'bg-[#7c3aed] text-white border-[#7c3aed] shadow-md shadow-[#7c3aed]/20'
                        : 'bg-white dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 p-3.5 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Title Length / Panjang Title
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'short', label: 'Short' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'long', label: 'Long' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTitleLength(opt.value as 'short' | 'medium' | 'long')}
                    className={`py-2 px-2 text-[10px] uppercase font-extrabold rounded-[1.5rem] border transition-all text-center ${
                      titleLength === opt.value
                        ? 'bg-[#7c3aed] text-white border-[#7c3aed] shadow-md shadow-[#7c3aed]/20'
                        : 'bg-white dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 p-3.5 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Metadata Language
                </label>
              </div>
              <select
                value={metadataLanguage}
                onChange={(e) => setMetadataLanguage(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 font-medium"
              >
                <option value="en">English (Default)</option>
                <option value="id">Indonesian / Bahasa 🇮🇩</option>
                <option value="es">Spanish / Español</option>
                <option value="fr">French / Français</option>
                <option value="de">German / Deutsch</option>
                <option value="it">Italian / Italiano</option>
                <option value="pt">Portuguese / Português</option>
                <option value="ja">Japanese / 日本語</option>
                <option value="ko">Korean / 한국어</option>
                <option value="ru">Russian / Русский</option>
              </select>
            </div>

            <div className="space-y-2 p-3.5 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  AI Model Performance
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'speed', label: 'Speed (Faster)' },
                  { value: 'detail', label: 'Detail (High-Context)' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiModelPerformance?.(opt.value as 'speed' | 'detail')}
                    className={`py-2 px-2 text-[10px] uppercase font-extrabold rounded-[1.5rem] border transition-all text-center ${
                      aiModelPerformance === opt.value
                        ? 'bg-[#7c3aed] text-white border-[#7c3aed] shadow-md shadow-[#7c3aed]/20'
                        : 'bg-white dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-center relative z-10">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  AI Creativity
                </label>
                <span className="px-3 py-1 bg-white dark:bg-slate-800 text-amber-500 dark:text-amber-400 text-[11px] font-black rounded-2xl border border-slate-200 dark:border-white/10 shadow-md shadow-black/5 min-w-[36px] text-center font-mono tracking-tighter">
                  {aiCreativity.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center space-x-3 relative z-10">
                <input 
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={aiCreativity}
                  onChange={(e) => setAiCreativity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl appearance-none cursor-pointer accent-[#7c3aed] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS FLOOR */}
        <div className="space-y-3.5 w-full mt-auto">
          {isLoading && progressInfo && (
            <div className="p-3 bg-violet-500/5 border border-violet-500/10 dark:border-indigo-500/10 rounded-[1.5rem] animate-in zoom-in-95 duration-200">
               <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest mb-1.5">
                  <span className="text-violet-600 dark:text-violet-400 flex items-center">
                    <RefreshCcw size={10} className="animate-spin mr-1.5"/> 
                    {activeTool === ToolType.VIDEO ? "Decoding Frames" : activeTool === ToolType.VECTOR ? "Parsing Vector Data" : "Analyzing Visuals"} {progressInfo.current}/{progressInfo.total}
                  </span>
                  <span className="text-slate-400 font-mono">{progressInfo.duration}s elapsed</span>
               </div>
               <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7c3aed] to-indigo-600 transition-all duration-300 shadow animate-pulse" 
                    style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
                  />
                </div>
            </div>
          )}

          <div className="flex space-x-2.5">
            <button 
              onClick={() => handleGenerateAll(false)} 
              disabled={isLoading || !filesToGenerateCount} 
              className={`flex-1 py-3 text-white font-black rounded-[1.5rem] transition-all shadow flex items-center justify-center space-x-2 transform duration-150 active:scale-[0.98] ${
                isLoading && !isPaused 
                  ? 'bg-violet-500 cursor-not-allowed' 
                  : isPaused 
                    ? 'bg-amber-500' 
                    : 'bg-[#7c3aed] hover:bg-blue-605 shadow-violet-500/15'
              }`}
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} className="fill-white" />
              )}
              <span className="text-xs uppercase tracking-wider font-extrabold">
                {isPaused ? "Rate-limited..." : isLoading ? t.generating : `${t.generate_all} (${filesToGenerateCount})`}
              </span>
            </button>
            
            {isLoading && (
              <button 
                onClick={handleStopGeneration}
                className="px-4 py-3 bg-red-500 hover:bg-red-650 text-white font-black rounded-[1.5rem] transition-all shadow flex items-center justify-center transform active:scale-[0.98] text-[10px] uppercase tracking-wider animate-pulse"
                title="Stop"
              >
                <span>STOP</span>
              </button>
            )}
          </div>

          {filesWithErrorCount > 0 && !isLoading && (
            <button 
              onClick={() => handleGenerateAll(true)} 
              className="w-full py-2.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 font-black rounded-[1.5rem] transition-all flex items-center justify-center space-x-2 text-[10px] uppercase tracking-wider"
            >
              <RefreshCcw size={11} className="mr-1.5" />
              <span>{t.retry_failed} ({filesWithErrorCount})</span>
            </button>
          )}

          {/* Mobile Only Step Progression Helper Button */}
          {hasFiles && !isLoading && (
            <div className="flex lg:hidden mt-3 pt-2 w-full">
              <button
                onClick={() => {
                  if ('vibrate' in navigator) {
                    try { navigator.vibrate(20); } catch(e) {}
                  }
                  setMobileTab('review');
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black rounded-[1.5rem] flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider shadow active:scale-[0.98] transition-all"
              >
                <span>Next: Review & Export</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
