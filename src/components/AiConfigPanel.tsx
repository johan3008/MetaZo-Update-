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
  seasonalBooster?: boolean;
  setSeasonalBooster?: (val: boolean) => void;
  seasonalMonth?: string;
  setSeasonalMonth?: (m: string) => void;
  isLicensed?: boolean;
  setShowActivationModal?: (show: boolean) => void;
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
  seasonalBooster = true,
  setSeasonalBooster = (val: boolean) => {},
  seasonalMonth = 'auto',
  setSeasonalMonth = (m: string) => {},
  isLicensed = false,
  setShowActivationModal,
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/80 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5 gap-2">
              <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.keyword_count_label}</label>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Standard: 40-49 (Max 49)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[25, 40, 49].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setKeywordCount(cnt)}
                    className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      Number(keywordCount) === cnt
                        ? 'bg-[#7c3aed] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-[#7c3aed]/50'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
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
                  className="w-12 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-center text-xs font-black dark:text-white transition-all focus:ring-2 focus:ring-[#7c3aed]/30 outline-none shadow-md shadow-black/5" 
                />
              </div>
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
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5 text-[9px] font-bold">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ⚡ CLIP Embedding Rank
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-semibold">Auto-Rank Top 10 Active</span>
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

            {/* TRENDING & SEASONAL KEYWORD BOOSTER (KALENDER KOMERSIAL) */}
            <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
              isLicensed 
                ? 'bg-gradient-to-br from-violet-500/5 via-amber-500/5 to-purple-500/5 dark:from-violet-950/20 dark:via-slate-900/40 dark:to-purple-950/20 border-violet-500/20 dark:border-violet-500/10' 
                : 'bg-slate-50/60 dark:bg-slate-900/40 border-dashed border-amber-500/30'
            } space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base select-none">{isLicensed ? '🗓️' : '🔒'}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Seasonal & Commercial Booster
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                        isLicensed 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs' 
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {isLicensed ? 'PRO' : 'PRO ONLY'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Suntik otomatis event/momen musiman buyer global (jendela 1-2 bulan)
                    </p>
                  </div>
                </div>

                {/* Switch Toggle or Upgrade Button */}
                {isLicensed ? (
                  <button
                    type="button"
                    onClick={() => setSeasonalBooster(!seasonalBooster)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      seasonalBooster ? 'bg-[#7c3aed]' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    title={seasonalBooster ? 'Nonaktifkan Seasonal Booster' : 'Aktifkan Seasonal Booster'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        seasonalBooster ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowActivationModal?.(true)}
                    className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    title="Buka akses PRO untuk mengaktifkan"
                  >
                    <span>🔒</span> Upgrade
                  </button>
                )}
              </div>

              {!isLicensed ? (
                <div 
                  onClick={() => setShowActivationModal?.(true)}
                  className="p-2.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all group"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">⭐</span>
                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      Khusus Pengguna PRO: Buka potensi penjualan momen hari raya & event dunia!
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-0.5 shrink-0">
                    Aktivasi PRO &rarr;
                  </span>
                </div>
              ) : seasonalBooster ? (
                <div className="space-y-2 pt-1 border-t border-violet-500/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Target Bulan Komersial
                    </label>
                    <span className="text-[8px] font-black text-violet-600 dark:text-violet-400">
                      {seasonalMonth === 'auto' ? '⚡ Auto Detect (Bulan Ini + 1-2 bln)' : '🎯 Manual Month'}
                    </span>
                  </div>

                  <select
                    value={seasonalMonth}
                    onChange={(e) => setSeasonalMonth(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-900/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 font-semibold"
                  >
                    <option value="auto">⚡ Auto Detect (Bulan Saat Ini & Buyer Window)</option>
                    <option value="january">Januari (New Year, Winter, Back to Work)</option>
                    <option value="february">Februari (Valentine, Lunar New Year, Ramadan prep)</option>
                    <option value="march">Maret (Women's Day, Ramadan, St. Patrick, Spring)</option>
                    <option value="april">April (Easter, Earth Day, Spring Festival)</option>
                    <option value="may">Mei (Mother's Day, Eid al-Fitr / Adha, Graduation)</option>
                    <option value="june">Juni (Father's Day, Summer, Pride Month)</option>
                    <option value="july">Juli (Independence Day, Summer Vacation, Back to School prep)</option>
                    <option value="august">Agustus (Back to School, Harvest Season)</option>
                    <option value="september">September (Autumn / Fall, Labor Day, Halloween prep)</option>
                    <option value="october">Oktober (Halloween, Thanksgiving prep, Autumn)</option>
                    <option value="november">November (Thanksgiving, Black Friday, Cyber Monday, Christmas prep)</option>
                    <option value="december">Desember (Christmas, New Year Eve, Winter Season)</option>
                  </select>

                  <div className="p-2 bg-white/70 dark:bg-black/30 rounded-xl border border-violet-500/10 text-[9.5px] text-slate-600 dark:text-slate-300 font-medium">
                    <span className="font-extrabold text-violet-600 dark:text-violet-400">💡 Contoh: </span>
                    {seasonalMonth === 'november' || (seasonalMonth === 'auto' && [9, 10, 11].includes(new Date().getMonth()))
                      ? 'Gambar keluarga/makanan otomatis disarankan tag: Thanksgiving, Black Friday, Christmas holiday, New Year celebration.'
                      : seasonalMonth === 'december' || (seasonalMonth === 'auto' && new Date().getMonth() === 11)
                      ? 'Gambar liburan/keluarga otomatis disarankan tag: Christmas, New Year celebration, Winter holiday, Holiday party.'
                      : 'AI otomatis mendeteksi kecocokan tema visual aset dengan momen musiman pembeli mikrostock global.'}
                  </div>
                </div>
              ) : null}
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
