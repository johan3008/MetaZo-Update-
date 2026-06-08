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
    <div className={`bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-lg shadow-sm flex flex-col min-h-[460px] relative overflow-hidden ${
      mobileTab === 'upload' ? 'flex animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:flex'
    }`}>
      {/* CARD HEADER */}
      <div className="bg-[#f8f9fc] dark:bg-slate-900 py-3.5 px-5 border-b border-[#e3e6f0]/60 dark:border-white/5 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <div className="w-6.5 h-6.5 rounded-lg bg-[#4e73df] text-white flex items-center justify-center font-black text-xs shadow-sm">
            1
          </div>
          <h3 className="m-0 font-extrabold text-[#4e73df] dark:text-blue-400 text-xs sm:text-sm uppercase tracking-wider flex items-center space-x-2">
            <span>Upload Assets</span>
            <HelpIcon title="Unggah file gambar, video, atau vektor Anda di sini untuk diproses." />
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
            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/15 text-red-500 rounded-md transition-all border border-red-500/15 flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider"
            title="Reset Everything"
          >
            <Trash2 size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* CARD BODY */}
      <div className="p-6 flex-grow flex flex-col justify-between">
        <div
          className={`flex-grow border-2 border-dashed ${
            isDragging 
              ? activeTool === ToolType.IMAGE ? 'border-blue-500 bg-blue-500/5' : activeTool === ToolType.VIDEO ? 'border-purple-500 bg-purple-500/5' : 'border-emerald-500 bg-emerald-500/5'
              : activeTool === ToolType.IMAGE ? 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-slate-600' : activeTool === ToolType.VIDEO ? 'border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-slate-600' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-slate-600'
          } rounded-2xl p-6 text-center cursor-pointer transition-all duration-350 flex flex-col items-center justify-center min-h-[220px] hover:bg-slate-50/50 dark:hover:bg-slate-800/40 relative group/drop`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
          onClick={triggerFileInput}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept={/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "*/*" : (activeTool === ToolType.IMAGE ? ".jpg,.jpeg,.png,.webp" : activeTool === ToolType.VIDEO ? ".mp4,.mov,.webm" : ".svg,.eps,.ai")} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <div className="flex flex-col items-center group/icon relative z-10">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-200/60 dark:border-slate-700 group-hover/drop:scale-105 transition-transform duration-300">
              {activeTool === ToolType.IMAGE ? <ImageIcon size={24} className="text-blue-500" /> : activeTool === ToolType.VIDEO ? <Film size={24} className="text-purple-500" /> : <FileCode size={24} className="text-emerald-500" />}
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-extrabold text-[10px] mb-1 uppercase tracking-wider">{t.drag_drop}</p>
            <p className={`font-black text-sm ${
              activeTool === ToolType.IMAGE ? 'text-blue-600 dark:text-blue-400' : activeTool === ToolType.VIDEO ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>{t.click_to_choose}</p>
          </div>
        </div>

        {hasFiles && (
          <div className="mt-4 flex items-center justify-between p-3 rounded-xl border border-[#e3e6f0]/80 dark:border-slate-700/30 bg-[#f8f9fc] dark:bg-slate-900/60">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
              {files.length} {t.files_selected}
            </span>
            <div className="flex -space-x-1.5">
              {files.slice(0, 4).map((f, i) => (
                <div 
                  key={i} 
                  onClick={() => setPreviewFile(f)} 
                  className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-900 bg-slate-200 overflow-hidden cursor-pointer hover:scale-110 hover:z-20 transition-all shadow-sm"
                >
                  {f.file.type.startsWith('video/') && f.analysisFrames && f.analysisFrames.length >= 3 ? (
                    <img src={f.analysisFrames[1] || undefined} className="w-full h-full object-cover" loading="lazy" />
                  ) : f.thumbnail ? (
                    <img src={f.thumbnail || undefined} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-slate-400 flex items-center justify-center text-[8px] text-white font-bold">
                      FILE
                    </div>
                  )}
                </div>
              ))}
              {files.length > 4 && (
                <div className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-900 bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
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
              className="w-full py-3 bg-[#4e73df] hover:bg-blue-600 text-white font-black rounded-xl flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider shadow active:scale-[0.98] transition-all"
            >
              <span>Next: AI Config</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
