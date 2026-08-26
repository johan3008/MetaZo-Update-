import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

interface FeatureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  t: any;
}

export const FeatureGuideModal: React.FC<FeatureGuideModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  t
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/50 dark:border-white/10 overflow-hidden relative animate-in slide-in-from-bottom-4 duration-300 zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" />
        
        <div className="p-5 sm:p-6 pb-4 flex items-start justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-inner shrink-0">
              <Sparkles className="text-indigo-500 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{title}</h2>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5 uppercase tracking-widest">{t.guide_btn_title}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5">
            <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line text-left">
              {description}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white p-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-95 shrink-0"
          >
            <span>{t.qc_close || 'Got It'}</span>
            <CheckCircle2 size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const FeatureGuideButton: React.FC<{ 
  title: string; 
  description: string; 
  t: any;
}> = ({ title, description, t }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center shrink-0 space-x-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/50 dark:hover:bg-indigo-500/10 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/20 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider overflow-hidden active:scale-95"
        title={t.guide_btn_title}
      >
        <HelpCircle size={14} className="transition-transform group-hover:scale-110" />
        <span className="hidden sm:inline-block whitespace-nowrap">{t.guide_btn_title}</span>
      </button>

      <FeatureGuideModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        t={t}
      />
    </>
  );
};
