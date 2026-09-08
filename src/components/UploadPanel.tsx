import React from 'react';
import { Trash2, ImageIcon, Film, FileCode, ArrowRight, Sparkles } from 'lucide-react';
import { HelpIcon } from './HelpIcon';
import { ToolType, FileItem } from '../../types';

interface UploadPanelProps {
  activeTool: ToolType;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  handleFileChange: (e: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  files: FileItem[];
  setPreviewFile: (file: FileItem | null) => void;
  updateFiles: (updater: (prev: FileItem[]) => FileItem[]) => void;
  mobileTab: 'upload' | 'ai' | 'review';
  setMobileTab: (tab: 'upload' | 'ai' | 'review') => void;
  t: any;
  isGenerativeAI?: boolean;
  setIsGenerativeAI?: (val: boolean) => void;
  aiModelSource?: string;
  setAiModelSource?: (val: string) => void;
  seasonalBooster?: boolean;
  setSeasonalBooster?: (val: boolean) => void;
  seasonalMonth?: string;
  setSeasonalMonth?: (m: string) => void;
  isLicensed?: boolean;
  setShowActivationModal?: (show: boolean) => void;
}

const PRESET_AI_MODELS = [
  'Midjourney',
  'Flux.1',
  'Stable Diffusion',
  'DALL-E 3',
  'Firefly',
  'Recraft',
  'Flow Ai',
  'Meta',
  'VEO3',
  'Kling',
  'Seadream',
  'Grok'
];

export const UploadPanel: React.FC<UploadPanelProps> = ({
  activeTool,
  isDragging,
  setIsDragging,
  handleFileChange,
  fileInputRef,
  files,
  setPreviewFile,
  updateFiles,
  mobileTab,
  setMobileTab,
  t,
  isGenerativeAI = false,
  setIsGenerativeAI,
  aiModelSource = 'Midjourney',
  setAiModelSource,
  seasonalBooster = true,
  setSeasonalBooster,
  seasonalMonth = 'auto',
  setSeasonalMonth,
  isLicensed = false,
  setShowActivationModal
}) => {
  const hasFiles = files.length > 0;
  const isCustomModel = !PRESET_AI_MODELS.includes(aiModelSource);
  const [showCustomInput, setShowCustomInput] = React.useState<boolean>(() => isCustomModel);
  const [customInputValue, setCustomInputValue] = React.useState<string>(() => isCustomModel ? (aiModelSource === 'Custom' ? '' : aiModelSource) : '');

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleToggleGenerativeAI = () => {
    if (!isLicensed) {
      setShowActivationModal?.(true);
      return;
    }
    if (setIsGenerativeAI) {
      const nextVal = !isGenerativeAI;
      setIsGenerativeAI(nextVal);
      if (updateFiles) {
        updateFiles(prev => prev.map(f => ({ ...f, isGenerativeAI: nextVal })));
      }
    }
  };

  const handleSelectModelSource = (modelName: string) => {
    if (!isLicensed) {
      setShowActivationModal?.(true);
      return;
    }
    if (setAiModelSource) {
      setAiModelSource(modelName);
      if (updateFiles) {
        updateFiles(prev => prev.map(f => ({ ...f, aiModelSource: modelName })));
      }
    }
  };

  return (
    <div className={`bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-2xl shadow-md shadow-black/5 flex flex-col min-h-[460px] relative overflow-hidden ${
      mobileTab === 'upload' ? 'flex animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:flex'
    }`}>
      {/* CARD HEADER */}
      <div className="bg-[#f8f9fc] dark:bg-slate-900 py-3.5 px-5 border-b border-[#e3e6f0]/60 dark:border-white/5 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <div className="w-6.5 h-6.5 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center font-black text-xs shadow-md shadow-black/5">
            1
          </div>
          <h3 className="m-0 font-extrabold text-[#7c3aed] dark:text-violet-400 text-xs sm:text-sm uppercase tracking-wider flex items-center space-x-2">
            <span>{t.upload_title}</span>
            <HelpIcon title={t.upload_help} />
          </h3>
        </div>
        {hasFiles && (
          <button 
            onClick={() => {
              files.forEach(f => {
                if (f.analysisFrames) {
                  f.analysisFrames.forEach(frame => {
                    if (frame.startsWith('blob:')) {
                      URL.revokeObjectURL(frame);
                    }
                  });
                }
              });
              updateFiles(() => []);
            }} 
            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/15 text-red-500 rounded-xl transition-all border border-red-500/15 flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider"
            title={t.upload_reset_title}
          >
            <Trash2 size={12} />
            <span>{t.upload_reset}</span>
          </button>
        )}
      </div>

      {/* CARD BODY */}
      <div className="p-6 flex-grow flex flex-col justify-between">
        <div
          className={`flex-grow border-[2px] border-dashed ${
            isDragging 
              ? activeTool === ToolType.IMAGE ? 'border-violet-500 bg-violet-500/10 scale-[1.02] shadow-2xl shadow-violet-500/20' : activeTool === ToolType.VIDEO ? 'border-purple-500 bg-purple-500/10 scale-[1.02] shadow-2xl shadow-purple-500/20' : 'border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-2xl shadow-emerald-500/20'
              : activeTool === ToolType.IMAGE ? 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 hover:border-violet-400/50 hover:shadow-xl' 
              : activeTool === ToolType.VIDEO ? 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 hover:border-purple-400/50 hover:shadow-xl'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:border-emerald-400/50 hover:shadow-xl'
          } rounded-[2rem] p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] relative group overflow-hidden`}
          onClick={triggerFileInput}
        >
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-plus-lighter">
            <div className={`absolute top-0 right-0 w-48 h-48 blur-[3xl] rounded-full ${activeTool === ToolType.IMAGE ? 'bg-violet-400/20' : activeTool === ToolType.VIDEO ? 'bg-purple-400/20' : 'bg-emerald-400/20'}`} />
            <div className={`absolute bottom-0 left-0 w-48 h-48 blur-[3xl] rounded-full ${activeTool === ToolType.IMAGE ? 'bg-indigo-400/20' : activeTool === ToolType.VIDEO ? 'bg-fuchsia-400/20' : 'bg-teal-400/20'}`} />
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept={/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "*/*" : (activeTool === ToolType.IMAGE ? ".jpg,.jpeg,.png,.webp" : activeTool === ToolType.VIDEO ? ".mp4,.mov,.webm" : ".svg,.eps,.ai")} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <div className="flex flex-col items-center group/icon relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl border border-white/20 transition-all duration-500 relative ${
                activeTool === ToolType.IMAGE 
                  ? 'bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-violet-600 dark:text-violet-400 group-hover:from-violet-500/20 group-hover:to-indigo-500/20 group-hover:scale-110 group-hover:shadow-violet-500/25 group-hover:ring-4 ring-violet-500/10' 
                  : activeTool === ToolType.VIDEO 
                    ? 'bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 text-purple-600 dark:text-purple-400 group-hover:from-purple-500/20 group-hover:to-fuchsia-500/20 group-hover:scale-110 group-hover:shadow-purple-500/25 group-hover:ring-4 ring-purple-500/10' 
                    : 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 group-hover:from-emerald-500/20 group-hover:to-teal-500/20 group-hover:scale-110 group-hover:shadow-emerald-500/25 group-hover:ring-4 ring-emerald-500/10'
              }`}
            >
              {activeTool === ToolType.IMAGE ? <ImageIcon size={32} strokeWidth={1.5} /> : activeTool === ToolType.VIDEO ? <Film size={32} strokeWidth={1.5} /> : <FileCode size={32} strokeWidth={1.5} />}
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-extrabold text-[11px] mb-2 uppercase tracking-[0.25em]">{t.drag_drop}</p>
            <p className={`font-black text-lg tracking-tight ${
              activeTool === ToolType.IMAGE ? 'text-violet-600 dark:text-violet-400' : activeTool === ToolType.VIDEO ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>{t.click_to_choose}</p>
          </div>
        </div>

        {hasFiles && (
          <div className="mt-4 flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-md shadow-black/5 animate-in fade-in duration-300">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
              {files.length} {t.files_selected}
            </span>
            <div className="flex -space-x-1.5">
              {files.slice(0, 4).map((f) => (
                <div 
                  key={f.id} 
                  onClick={() => setPreviewFile(f)} 
                  className="w-8 h-8 rounded-2xl border-2 border-white dark:border-slate-900 bg-slate-200 overflow-hidden cursor-pointer hover:scale-110 hover:z-20 transition-all shadow-md shadow-black/5"
                >
                  {f.file.type.startsWith('video/') && f.analysisFrames && f.analysisFrames.length >= 3 ? (
                    <img src={f.analysisFrames[1] || undefined} className="w-full h-full object-cover" loading="lazy" />
                  ) : f.thumbnail ? (
                    <img src={f.thumbnail || undefined} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-slate-400 flex items-center justify-center text-[8px] text-white font-bold">
                      {t.upload_file_placeholder}
                    </div>
                  )}
                </div>
              ))}
              {files.length > 4 && (
                <div className="w-8 h-8 rounded-2xl border-2 border-white dark:border-slate-900 bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-black/5">
                  +{files.length - 4}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generative AI Compliance & Seasonal Booster (di bawah Unggah Aset) */}
        <div className="mt-4 space-y-3">
          {/* Generative AI Compliance Mode (PRO Feature) */}
          <div className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
            !isLicensed
              ? 'bg-slate-50/60 dark:bg-slate-900/40 border-dashed border-amber-500/30'
              : isGenerativeAI
                ? 'bg-violet-500/10 border-violet-500/30 dark:bg-violet-950/20 dark:border-violet-500/30 shadow-xs'
                : 'bg-slate-50/80 dark:bg-black/20 border-slate-200/50 dark:border-white/5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLicensed ? (
                  <Sparkles size={14} className={isGenerativeAI ? 'text-violet-600 dark:text-violet-400 animate-pulse' : 'text-slate-400'} />
                ) : (
                  <span className="text-base select-none">🔒</span>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                      Generative AI Compliance
                    </label>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${
                      isLicensed 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs' 
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {isLicensed ? 'PRO' : 'PRO ONLY'}
                    </span>
                    {isLicensed && (
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                        isGenerativeAI ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {isGenerativeAI ? 'ACTIVE' : 'OFF'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                    Tag as AI Asset (Adobe Stock, Freepik CSV & IPTC XMP)
                  </span>
                </div>
              </div>

              {/* Switch Toggle or Upgrade Button */}
              {isLicensed ? (
                <button 
                  type="button"
                  onClick={handleToggleGenerativeAI}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                    isGenerativeAI ? 'bg-[#7c3aed]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={isGenerativeAI ? 'Nonaktifkan AI Compliance' : 'Aktifkan AI Compliance'}
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white transition-all shadow-sm transform ${
                      isGenerativeAI ? 'translate-x-5' : 'translate-x-0'
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
                    Khusus Pengguna PRO: Penandaan resmi kepatuhan aset AI (Adobe Stock, Freepik CSV & XMP)!
                  </p>
                </div>
                <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-0.5 shrink-0">
                  Aktivasi PRO &rarr;
                </span>
              </div>
            ) : isGenerativeAI ? (
              <div className="pt-2 border-t border-violet-200/40 dark:border-violet-800/30 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    AI Generator / Model Source:
                  </label>
                  <span className="text-[8px] font-bold text-violet-600 dark:text-violet-400">
                    Auto-fills Freepik CSV & XMP
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...PRESET_AI_MODELS, 'Custom'].map((modelName) => {
                    const isSelected = modelName === 'Custom'
                      ? (showCustomInput || isCustomModel)
                      : (!showCustomInput && aiModelSource === modelName);
                    return (
                      <button
                        key={modelName}
                        type="button"
                        onClick={() => {
                          if (modelName === 'Custom') {
                            setShowCustomInput(true);
                            const target = customInputValue.trim() || 'Custom';
                            handleSelectModelSource(target);
                          } else {
                            setShowCustomInput(false);
                            handleSelectModelSource(modelName);
                          }
                        }}
                        className={`py-1 px-2.5 text-[9.5px] font-extrabold rounded-xl border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#7c3aed] text-white border-[#7c3aed] shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-violet-400'
                        }`}
                      >
                        {modelName === 'Custom' ? '✨ Custom' : modelName}
                      </button>
                    );
                  })}
                </div>

                {(showCustomInput || isCustomModel) && (
                  <div className="pt-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customInputValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomInputValue(val);
                          handleSelectModelSource(val.trim() || 'Custom');
                        }}
                        placeholder="Ketik nama AI generator kustom (cth: Leonardo AI, Sora, Ideogram, Luma)..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700/60 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 font-semibold"
                        autoFocus
                      />
                      {customInputValue && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomInputValue('');
                            handleSelectModelSource('Custom');
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Reset input kustom"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* TRENDING & SEASONAL KEYWORD BOOSTER (KALENDER KOMERSIAL) */}
          <div className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
            isLicensed 
              ? 'bg-gradient-to-br from-violet-500/5 via-amber-500/5 to-purple-500/5 dark:from-violet-950/20 dark:via-slate-900/40 dark:to-purple-950/20 border-violet-500/20 dark:border-violet-500/10' 
              : 'bg-slate-50/60 dark:bg-slate-900/40 border-dashed border-amber-500/30'
          } space-y-2.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-base select-none">{isLicensed ? '🗓️' : '🔒'}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Seasonal & Commercial Booster
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase ${
                      isLicensed 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs' 
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {isLicensed ? 'PRO' : 'PRO ONLY'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    Suntik otomatis event/momen musiman buyer global (jendela 1-2 bulan)
                  </p>
                </div>
              </div>

              {/* Switch Toggle or Upgrade Button */}
              {isLicensed ? (
                <button
                  type="button"
                  onClick={() => setSeasonalBooster && setSeasonalBooster(!seasonalBooster)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                    seasonalBooster ? 'bg-[#7c3aed]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={seasonalBooster ? 'Nonaktifkan Seasonal Booster' : 'Aktifkan Seasonal Booster'}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white transition-all shadow-sm transform ${
                      seasonalBooster ? 'translate-x-5' : 'translate-x-0'
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
              <div className="space-y-2 pt-2 border-t border-violet-500/10">
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
                  onChange={(e) => setSeasonalMonth && setSeasonalMonth(e.target.value)}
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

        {/* Mobile Page Switcher Hook */}
        {hasFiles && (
          <div className="flex lg:hidden mt-4 pt-3 border-t border-[#e3e6f0]/60 dark:border-white/5 w-full">
            <button
              onClick={() => {
                if ('vibrate' in navigator) {
                  try { navigator.vibrate(20); } catch(e) {}
                }
                setMobileTab('ai');
              }}
              className="w-full py-3 bg-[#7c3aed] hover:bg-violet-600 text-white font-black rounded-[1.5rem] flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider shadow active:scale-[0.98] transition-all"
            >
              <span>{t.upload_next_ai}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
