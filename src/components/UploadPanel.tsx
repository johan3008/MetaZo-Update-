import React from 'react';
import { Trash2, ImageIcon, Film, FileCode, ArrowRight, UploadCloud, Plus, CheckCircle2 } from 'lucide-react';
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
}

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
  t
}) => {
  const hasFiles = files.length > 0;

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getToolTheme = () => {
    if (activeTool === ToolType.IMAGE) {
      return {
        accent: 'violet',
        bgGlow: 'bg-violet-500/10',
        text: 'text-violet-600 dark:text-violet-400',
        borderActive: 'border-violet-500 bg-violet-500/5 ring-4 ring-violet-500/10',
        btnBg: 'bg-violet-600 hover:bg-violet-700 text-white',
        formats: ['JPG', 'JPEG', 'PNG', 'WEBP'],
      };
    }
    if (activeTool === ToolType.VIDEO) {
      return {
        accent: 'purple',
        bgGlow: 'bg-purple-500/10',
        text: 'text-purple-600 dark:text-purple-400',
        borderActive: 'border-purple-500 bg-purple-500/5 ring-4 ring-purple-500/10',
        btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
        formats: ['MP4', 'MOV', 'WEBM'],
      };
    }
    return {
      accent: 'emerald',
      bgGlow: 'bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      borderActive: 'border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      formats: ['SVG', 'EPS', 'AI'],
    };
  };

  const theme = getToolTheme();

  return (
    <div className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-xl shadow-black/5 flex flex-col min-h-[500px] relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-violet-500/20 ${
      mobileTab === 'upload' ? 'flex animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:flex'
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
            01
          </div>
          <div className="flex items-center gap-2">
            <h3 className="m-0 font-black text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider">
              {t.upload_title}
            </h3>
            <HelpIcon title={t.upload_help} />
          </div>
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
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all border border-rose-200/80 dark:border-rose-500/30 flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer active:scale-95"
            title={t.upload_reset_title}
          >
            <Trash2 size={13} />
            <span>{t.upload_reset}</span>
          </button>
        )}
      </div>

      {/* CARD BODY */}
      <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFileChange({ target: { files: e.dataTransfer.files } });
            }
          }}
          onClick={triggerFileInput}
          className={`flex-grow border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] relative group overflow-hidden ${
            isDragging 
              ? theme.borderActive
              : 'border-slate-300 dark:border-slate-700/80 bg-slate-50/60 dark:bg-black/25 hover:border-violet-500/60 dark:hover:border-violet-400/60 hover:bg-violet-50/30 dark:hover:bg-violet-950/15'
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-500/15 dark:bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept={/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "*/*" : (activeTool === ToolType.IMAGE ? ".jpg,.jpeg,.png,.webp" : activeTool === ToolType.VIDEO ? ".mp4,.mov,.webm" : ".svg,.eps,.ai")} 
            onChange={handleFileChange} 
            className="hidden" 
          />

          <div className="flex flex-col items-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1.5">
            <div className="w-18 h-18 rounded-3xl bg-white dark:bg-slate-800 shadow-xl shadow-black/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-violet-500/25 group-hover:border-violet-500/40">
              {activeTool === ToolType.IMAGE ? (
                <ImageIcon size={32} className={theme.text} strokeWidth={2.2} />
              ) : activeTool === ToolType.VIDEO ? (
                <Film size={32} className={theme.text} strokeWidth={2.2} />
              ) : (
                <FileCode size={32} className={theme.text} strokeWidth={2.2} />
              )}
            </div>

            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              {t.drag_drop}
            </p>
            <p className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight mb-3">
              {t.click_to_choose}
            </p>

            {/* Quick Browse button */}
            <div className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer group-hover:scale-105 active:scale-95 ${theme.btnBg}`}>
              <UploadCloud size={16} />
              <span>Browse Stock Files</span>
            </div>

            {/* Supported Formats Pills */}
            <div className="flex items-center gap-1.5 mt-6 flex-wrap justify-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mr-1">Formats:</span>
              {theme.formats.map(fmt => (
                <span key={fmt} className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-black tracking-wider border border-slate-300/50 dark:border-white/5">
                  .{fmt}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Files Preview & Thumbnails Strip */}
        {hasFiles && (
          <div className="mt-2 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="text-slate-900 dark:text-white text-xs font-black block">
                  {files.length} {t.files_selected}
                </span>
                <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready for AI Dual-Vision analysis
                </span>
              </div>
            </div>

            <div className="flex -space-x-2.5 overflow-hidden py-1">
              {files.slice(0, 5).map((f) => (
                <div 
                  key={f.id} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewFile(f);
                  }} 
                  className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 overflow-hidden cursor-pointer hover:scale-120 hover:z-20 transition-all shadow-md"
                  title={f.file.name}
                >
                  {f.file.type.startsWith('video/') && f.analysisFrames && f.analysisFrames.length >= 3 ? (
                    <img src={f.analysisFrames[1] || undefined} className="w-full h-full object-cover" loading="lazy" alt="" />
                  ) : f.thumbnail ? (
                    <img src={f.thumbnail || undefined} className="w-full h-full object-cover" loading="lazy" alt="" />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center text-[9px] text-white font-black">
                      {f.file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                    </div>
                  )}
                </div>
              ))}
              {files.length > 5 && (
                <div className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-900 bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-md">
                  +{files.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Page Switcher Hook */}
        {hasFiles && (
          <div className="flex lg:hidden mt-2 pt-3 border-t border-slate-200 dark:border-white/5 w-full">
            <button
              onClick={() => {
                if ('vibrate' in navigator) {
                  try { navigator.vibrate(20); } catch(e) {}
                }
                setMobileTab('ai');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black rounded-2xl flex items-center justify-center space-x-2 text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all"
            >
              <span>{t.upload_next_ai}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
