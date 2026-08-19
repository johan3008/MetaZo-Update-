import React from 'react';
import { Trash2, ImageIcon, Film, FileCode, ArrowRight } from 'lucide-react';
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
          } rounded-[2rem] p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[260px] relative group overflow-hidden`}
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
          <div className="mt-5 flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-md shadow-black/5 animate-in fade-in duration-300">
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
