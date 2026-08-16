import React from 'react';
import { Search, Info, CheckCircle2, Trash2, FileCode, ArrowRight, Check, Loader2, Sparkles, Film } from 'lucide-react';
import { ToolType, FileItem, ProgressInfo } from '../../types';
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO, MIRICANVAS_CATEGORIES, DREAMSTIME_MAIN_CATEGORIES, DREAMSTIME_SUB_CATEGORIES } from '../../constants';
import { copyToClipboard } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { getHeaders } from '../../services/geminiService';

// Since we have helper subcomponents like CopyBox and KeywordList in the project,
// we will declare props for them or import them if needed. 
// We will receive them or render inline inputs to keep the component fully functional and self-contained.

interface CopyBoxProps {
  label: string;
  value: string;
  isTextArea?: boolean;
  themeColor: 'blue' | 'purple' | 'emerald';
  showLengthRating?: boolean;
  onChange: (val: string) => void;
}

const ProjectCopyBox: React.FC<CopyBoxProps> = ({
  label,
  value,
  isTextArea,
  themeColor,
  showLengthRating,
  onChange
}) => {
  const [copied, setCopied] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value || '');
  
  React.useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const colorClass = themeColor === 'blue' ? 'border-[#7c3aed] hover:border-violet-600' : themeColor === 'purple' ? 'border-purple-500 hover:border-purple-650' : 'border-emerald-500 hover:border-emerald-650';

  const handleCopy = async () => {
    const success = await copyToClipboard(localValue);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const safeValue = localValue || '';
  const len = safeValue.length;
  const minLen = label.toLowerCase().includes('title') ? 15 : 50; const ratingText = len < minLen ? 'Too short' : len <= 200 ? 'Optimal' : 'Too long';
  const ratingColor = len < minLen ? 'text-rose-500' : len <= 200 ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        <label>{label}</label>
        <div className="flex items-center space-x-2">
          {showLengthRating && <span className={`${ratingColor} font-black uppercase`}>{len} chars ({ratingText})</span>}
          <button onClick={handleCopy} className="text-[#7c3aed] dark:text-violet-400 font-extrabold hover:underline lowercase">{copied ? 'copied!' : 'copy'}</button>
        </div>
      </div>
      {isTextArea ? (
        <textarea
          value={safeValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={label.toLowerCase().includes('title') || label.toLowerCase().includes('judul') ? 200 : undefined}
          className={`w-full p-2.5 bg-slate-100/50 dark:bg-black/25 rounded-[1.5rem] border border-slate-200/85 dark:border-slate-800 outline-none text-xs text-slate-700 dark:text-slate-200 transition-all font-semibold resize-none min-h-[65px] focus:ring-2 focus:ring-[#7c3aed]/20`}
        />
      ) : (
        <input
          type="text"
          value={safeValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={label.toLowerCase().includes('title') || label.toLowerCase().includes('judul') ? 200 : undefined}
          className={`w-full p-2.5 bg-slate-100/55 dark:bg-black/25 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 outline-none text-xs text-slate-700 dark:text-slate-300 transition-all font-extrabold focus:ring-2 focus:ring-[#7c3aed]/20`}
        />
      )}
    </div>
  );
};

export const getNearDuplicates = (kws: string[]): string[] => {
  const normalized = kws.map(k => k.toLowerCase().trim());
  const toRemove = new Set<string>();
  
  for (let i = 0; i < normalized.length; i++) {
      const a = normalized[i];
      if (!a) continue;
      for (let j = i + 1; j < normalized.length; j++) {
          const b = normalized[j];
          if (!b) continue;
          if (a === b) {
              toRemove.add(kws[j]);
              continue;
          }
          
          // Plural/singular stemming approximations
          if (a === b + 's' || b === a + 's' || 
              a === b + 'es' || b === a + 'es' ||
              a.replace(/ies$/, 'y') === b || b.replace(/ies$/, 'y') === a) {
              if (a.length > b.length) toRemove.add(kws[i]);
              else toRemove.add(kws[j]);
          }
      }
  }
  return Array.from(toRemove);
};

interface KeywordListProps {
  label: string;
  keywords: string[];
  themeColor: 'blue' | 'purple' | 'emerald';
  onChange: (kw: string[]) => void;
  title?: string;
  description?: string;
  aiOptions?: any;
  keywordCount?: number | string;
  hideIndividualFix?: boolean;
  t?: any;
}

const ProjectKeywordList: React.FC<KeywordListProps> = ({
  label,
  keywords = [],
  themeColor,
  onChange,
  title,
  description,
  aiOptions,
  keywordCount,
  hideIndividualFix = false,
  t
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const nearDuplicates = React.useMemo(() => getNearDuplicates(keywords), [keywords]);

  React.useEffect(() => {
    const seen = new Set<string>();
    const uniqueKeywords = keywords.filter(k => {
      const normalized = k.toLowerCase().trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    if (uniqueKeywords.length !== keywords.length) {
      onChange(uniqueKeywords);
    }
  }, [keywords, onChange]);

  const badgeClass = themeColor === 'blue' ? 'bg-violet-500/10 text-[#7c3aed]' : themeColor === 'purple' ? 'bg-purple-500/10 text-purple-600' : 'bg-emerald-500/10 text-emerald-600';
  const buttonColorClass = themeColor === 'blue' ? 'text-[#7c3aed] hover:text-violet-600' : themeColor === 'purple' ? 'text-purple-600 hover:text-purple-750' : 'text-emerald-600 hover:text-emerald-700';

  const handleCopy = async () => {
    const success = await copyToClipboard(keywords.join(', '));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newKeywords = [...keywords];
    const draggedKeyword = newKeywords[draggedIndex];
    newKeywords.splice(draggedIndex, 1);
    newKeywords.splice(index, 0, draggedKeyword);
    onChange(newKeywords);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = inputValue.trim().replace(/,/g, '');
      if (clean && !keywords.includes(clean)) {
        onChange([...keywords, clean]);
      }
      setInputValue('');
    }
  };

  const handleRemove = (kw: string) => {
    onChange(keywords.filter(k => k !== kw));
  };

  const handleSmartSuggest = async () => {
    if (!title || !title.trim()) {
      setSuggestError("Tulis Judul dulu");
      setTimeout(() => setSuggestError(null), 3000);
      return;
    }

    setIsSuggesting(true);
    setSuggestError(null);

    try {
      const response = await fetch('/api/smart-suggest-keywords', {
        method: 'POST',
        headers: getHeaders(aiOptions),
        body: JSON.stringify({
          title,
          description: description || '',
          existingKeywords: keywords,
          model: aiOptions?.model
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyarankan");
      }

      const data = await response.json();
      const suggested: string[] = data.keywords || [];

      if (suggested.length === 0) {
        setSuggestError("Saran kosong");
        setTimeout(() => setSuggestError(null), 3000);
      } else {
        const uniqueNew = suggested.filter(kw => !keywords.includes(kw));
        if (uniqueNew.length > 0) {
          onChange([...keywords, ...uniqueNew]);
        } else {
          setSuggestError("Kata sudah lengkap");
          setTimeout(() => setSuggestError(null), 3000);
        }
      }
    } catch (err: any) {
      console.error(err);
      setSuggestError(err.message || "Error");
      setTimeout(() => setSuggestError(null), 5000);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...keywords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    onChange(shuffled);
  };

  const handleClean = () => {
    // Deduplicate while preserving original order (crucial for search relevance ranking)
    const cleaned: string[] = [];
    const seen = new Set<string>();
    
    keywords.forEach(k => {
      const trimmed = k.trim();
      if (!trimmed) return;
      const normalized = trimmed.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        cleaned.push(trimmed);
      }
    });

    onChange(cleaned);
  };

  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        <label>{label} ({keywords.length}/49)</label>
        <div className="flex items-center space-x-3">
          {suggestError && (
            <span className="text-rose-500 font-extrabold normal-case leading-none animate-pulse">
              {suggestError}
            </span>
          )}
          <button onClick={handleClean} className={`${buttonColorClass} font-extrabold flex items-center hover:underline lowercase cursor-pointer`}>
            clean
          </button>
          <button onClick={handleShuffle} className={`${buttonColorClass} font-extrabold flex items-center hover:underline lowercase cursor-pointer`}>
            shuffle
          </button>
          <button onClick={handleCopy} className={`${buttonColorClass} font-extrabold flex items-center hover:underline lowercase cursor-pointer`}>
            {copied ? 'copied!' : 'copy'}
          </button>
          <button
            onClick={handleSmartSuggest}
            disabled={isSuggesting || !title || !title.trim()}
            title={!title || !title.trim() ? "Tulis judul terlebih dahulu sebagai konteks" : "Sukai 5 kata kunci SEO penting secara otomatis"}
            className={`${buttonColorClass} font-extrabold flex items-center gap-1 hover:underline lowercase disabled:opacity-50 disabled:no-underline cursor-pointer`}
          >
            {isSuggesting ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>suggesting...</span>
              </>
            ) : (
              <span>✨ smart suggest</span>
            )}
          </button>
        </div>
      </div>

      <div className="text-[9.5px]/tight text-[#7c3aed] dark:text-violet-400 font-bold flex items-center gap-1 py-1 px-2.5 bg-violet-500/5 dark:bg-violet-500/10 rounded-lg border border-violet-500/10">
        <span className="shrink-0 select-none">💡</span>
        <span>
          {t && t.language === 'Bahasa' 
            ? "Urutan kata kunci menentukan relevansi pencarian Adobe Stock. Keyword #1 adalah yang TERPENTING! Seret untuk mengurutkan." 
            : "Keyword order determines search relevance in Adobe Stock. Keyword #1 is the most CRITICAL! Drag & drop to sort."}
        </span>
      </div>
      {nearDuplicates.length > 0 && !hideIndividualFix && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-[10px] mb-2 font-bold gap-2">
          <span className="truncate" title={nearDuplicates.join(', ')}>
            ⚠️ Near-duplicates detected (e.g. {nearDuplicates.slice(0, 3).join(', ')})
          </span>
          <div className="flex space-x-2 shrink-0">
            <button 
              onClick={async () => {
                const targetCount = Number(keywordCount) || 40;
                const initialCleaned = keywords.filter(k => !nearDuplicates.includes(k));
                
                if (initialCleaned.length >= targetCount) {
                  onChange(initialCleaned.slice(0, targetCount));
                  return;
                }
                
                if (!title) {
                  onChange(initialCleaned);
                  return;
                }
                
                setIsSuggesting(true);
                try {
                  const res = await fetch('/api/smart-suggest-keywords', {
                    method: 'POST',
                    headers: getHeaders(aiOptions),
                    body: JSON.stringify({ 
                      title, 
                      description, 
                      existingKeywords: initialCleaned, 
                      requestCount: targetCount - initialCleaned.length,
                      model: aiOptions?.model
                    })
                  });
                  if (!res.ok) throw new Error();
                  const data = await res.json();
                  const suggested = data.keywords || [];
                  const merged = [...initialCleaned, ...suggested].slice(0, targetCount);
                  onChange(merged);
                } catch (e) {
                  onChange(initialCleaned);
                } finally {
                  setIsSuggesting(false);
                }
              }} 
              disabled={isSuggesting}
              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded disabled:opacity-50 flex items-center gap-1"
            >
              {isSuggesting && <span className="animate-spin text-rose-500">❖</span>} Fix this file
            </button>
          </div>
        </div>
      )}
      <div className="p-2 bg-slate-100/50 dark:bg-black/25 rounded-[1.5rem] border border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-1.5 max-h-[145px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {keywords.map((kw, index) => {
            const isFirst = index === 0;
            const isTop5 = index > 0 && index < 5;
            let currentBadgeClass = badgeClass;
            
            if (isFirst) {
              currentBadgeClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/5";
            } else if (isTop5) {
              currentBadgeClass = "bg-violet-500/15 text-[#7c3aed] dark:text-violet-400 border border-violet-500/20";
            } else {
              currentBadgeClass = `${badgeClass} border border-transparent`;
            }

            return (
              <motion.span 
                key={`${kw}-${index}`} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.6, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.7, opacity: 0, y: -4, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                layout
                className={`inline-flex cursor-grab items-center px-2 py-0.5 rounded text-[10px] font-bold select-none ${currentBadgeClass} ${draggedIndex === index ? 'opacity-50' : ''}`}
                title={isFirst ? "Keyword #1 - Paling Menentukan Relevansi (👑 Utama)" : isTop5 ? `Keyword #${index + 1} - Sangat Penting (Prioritas Tinggi)` : `Keyword #${index + 1}`}
              >
                <span className="opacity-65 mr-1 text-[8.5px] font-black font-mono tracking-tighter bg-black/5 dark:bg-white/5 px-1 py-0.2 rounded shrink-0">
                  {isFirst ? '👑 1' : index + 1}
                </span>
                <span className="truncate max-w-[120px]">{kw}</span>
                <button onClick={() => handleRemove(kw)} className="ml-1 text-[9px] text-rose-500 hover:text-rose-600 font-extrabold cursor-pointer">×</button>
              </motion.span>
            );
          })}
        </AnimatePresence>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleAdd}
          placeholder="Type and press Enter..."
          className="bg-transparent border-none outline-none text-xs font-semibold p-0.5 text-slate-700 dark:text-slate-300 flex-grow min-w-[110px]"
        />
      </div>
    </div>
  );
};

const ExifCollapse: React.FC<{ exif?: any }> = ({ exif }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  if (!exif || Object.keys(exif).length === 0) return null;

  return (
    <div className="mt-2.5 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-black/10 font-sans">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-100/50 dark:hover:bg-slate-850/50 transition-colors focus:outline-none"
      >
        <span className="flex items-center gap-1.5">
          <span>📊</span>
          <span>Technical EXIF Metadata</span>
        </span>
        <span className="text-[9px] font-extrabold normal-case bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-full">{isOpen ? 'Hide info' : 'View info'}</span>
      </button>
      {isOpen && (
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 max-h-[220px] overflow-y-auto text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-1.5 bg-white dark:bg-black/25">
          {Object.entries(exif).map(([key, val]) => {
            if (typeof val === 'object' && val !== null) {
              val = JSON.stringify(val);
            }
            return (
              <div key={key} className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-1 gap-4">
                <span className="font-extrabold text-slate-700 dark:text-slate-300 shrink-0">{key}</span>
                <span className="text-right truncate max-w-[250px] font-semibold text-slate-500 dark:text-slate-400" title={String(val)}>{String(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ReviewQueueProps {
  files: FileItem[];
  activeTool: ToolType;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setPreviewFile: (file: FileItem | null) => void;
  updateFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  handleDeleteFile: (id: string) => void;
  handleRegenerateFile?: (file: FileItem) => void;
  mobileTab: 'upload' | 'ai' | 'review';
  setMobileTab: (tab: 'upload' | 'ai' | 'review') => void;
  t: any;
  isAllFinished: boolean;
  successfulFilesCount: number;
  canDownload: boolean;
  isLoading?: boolean;
  progressInfo?: ProgressInfo | null;
  aiOptions?: any;
  keywordCount?: number | string;
}

const FileNameInput: React.FC<{
  initialName: string;
  onNameChange: (newName: string) => void;
}> = ({ initialName, onNameChange }) => {
  const [localName, setLocalName] = React.useState(initialName);
  
  React.useEffect(() => {
    setLocalName(initialName);
  }, [initialName]);

  const handleBlur = () => {
    if (localName !== initialName) {
      onNameChange(localName);
    }
  };

  return (
    <input 
      type="text" 
      value={localName}
      onChange={(e) => setLocalName(e.target.value)}
      onBlur={handleBlur}
      className="text-xs font-black text-slate-700 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 outline-none w-full truncate cursor-text transition-colors pb-1"
      title="Edit Filename"
    />
  );
};

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  files,
  activeTool,
  searchQuery,
  setSearchQuery,
  setPreviewFile,
  updateFiles,
  handleDeleteFile,
  handleRegenerateFile,
  mobileTab,
  setMobileTab,
  t,
  isAllFinished,
  successfulFilesCount,
  canDownload,
  isLoading,
  progressInfo,
  aiOptions,
  keywordCount
}) => {
  const hasFiles = files.length > 0;
  const [isFixingBatch, setIsFixingBatch] = React.useState(false);

  const filesWithDuplicates = React.useMemo(() => {
    return files.filter(f => f.title && getNearDuplicates(f.keywords).length > 0);
  }, [files]);

  const handleFixBatch = async () => {
    if (filesWithDuplicates.length === 0) return;
    setIsFixingBatch(true);
    try {
      const targetCount = Number(keywordCount) || 40;
      const promises = filesWithDuplicates.map(async (file) => {
        const dups = getNearDuplicates(file.keywords);
        const initialCleaned = file.keywords.filter(k => !dups.includes(k));
        
        if (initialCleaned.length >= targetCount) {
          return { id: file.id, keywords: initialCleaned.slice(0, targetCount) };
        }
        
        try {
          const res = await fetch('/api/smart-suggest-keywords', {
            method: 'POST',
            headers: getHeaders(aiOptions),
            body: JSON.stringify({
              title: file.title,
              description: file.description || '',
              existingKeywords: initialCleaned,
              requestCount: targetCount - initialCleaned.length,
              model: aiOptions?.model
            })
          });
          if (!res.ok) {
            return { id: file.id, keywords: initialCleaned };
          }
          const data = await res.json();
          const suggested = data.keywords || [];
          const merged = [...initialCleaned, ...suggested].slice(0, targetCount);
          return { id: file.id, keywords: merged };
        } catch (e) {
          console.error("Failed to suggest of file", file.id, e);
          return { id: file.id, keywords: initialCleaned };
        }
      });
      const results = await Promise.all(promises);
      updateFiles(prev => prev.map(f => {
        const r = results.find(res => res.id === f.id);
        if (r) {
          return { ...f, keywords: r.keywords };
        }
        return f;
      }));
    } catch (err) {
      console.error("Batch fix error:", err);
    } finally {
      setIsFixingBatch(false);
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={`queue-skel-${i}`} className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse flex flex-col space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem] shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="w-1/4 h-2 bg-slate-200 dark:bg-slate-800 rounded-full opacity-50" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <div className="w-full h-10 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]" />
            <div className="w-[85%] h-12 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]" />
          </div>
        </div>
      ))}
    </div>
  );

  const filteredFiles = files.filter(f => {
    const term = searchQuery.toLowerCase();
    if (!term) return true;
    const name = (f.customFileName || f.file.name).toLowerCase();
    const title = (f.title || '').toLowerCase();
    const desc = (f.description || '').toLowerCase();
    const keywords = (f.keywords || []).join(', ').toLowerCase();
    return name.includes(term) || title.includes(term) || desc.includes(term) || keywords.includes(term);
  });

  const isGenerating = isLoading && files.some(f => f.isGenerating || f.isExtracting);

  return (
    <div 
      id="review-queue-section"
      className={`bg-white dark:bg-[#111827] border rounded-2xl shadow-md overflow-hidden relative transition-all duration-350 ${
        isGenerating
          ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/20 dark:ring-[#7c3aed]/30 shadow-[#7c3aed]/5' 
          : 'border-[#e3e6f0]/80 dark:border-white/5 shadow-black/5'
      } ${
        mobileTab === 'review' ? 'block animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:block'
      }`}
    >
      {/* HEADER */}
      <div className="bg-[#f8f9fc] dark:bg-slate-900 py-3.5 px-5 border-b border-[#e3e6f0]/60 dark:border-white/5 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <div className="w-6.5 h-6.5 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center font-black text-xs shadow-md shadow-black/5">
            3
          </div>
          <h3 className="m-0 font-extrabold text-[#7c3aed] dark:text-violet-400 text-xs sm:text-sm uppercase tracking-wider">
            Review & Refine Queue
          </h3>
        </div>
        {canDownload && (
          <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 text-[9px] font-black rounded-2xl uppercase tracking-wider">
            Ready to Export
          </div>
        )}
      </div>

      <div className="p-6">
        <p className="text-slate-400 dark:text-slate-500 mb-6 text-xs font-semibold leading-relaxed">
          {t.review_edit_desc}
        </p>

        {searchQuery && (
          <div className="mb-4 text-[10px] bg-violet-500/5 text-[#7c3aed] py-1.5 px-3 rounded-2xl border border-violet-500/10 flex items-center justify-between">
            <span>Filtering for &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
            <button onClick={() => setSearchQuery('')} className="font-extrabold underline hover:text-violet-600">Clear Search</button>
          </div>
        )}

        {isAllFinished && successfulFilesCount > 0 && (
          <div className="mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[1.5rem] p-4 flex items-center space-x-3.5 animate-in slide-in-from-top-3 duration-300">
            <div className="w-9 h-9 bg-emerald-500/20 rounded-[1.5rem] flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h4 className="text-emerald-700 dark:text-emerald-400 font-extrabold text-xs sm:text-sm uppercase">Processing Complete!</h4>
              <p className="text-slate-400 text-xs font-medium mt-0.5">{successfulFilesCount} files ready for compiled download.</p>
            </div>
          </div>
        )}

        {files.length > 1 && filesWithDuplicates.length > 0 && (
          <div className="mb-6 p-4 bg-rose-500/5 border border-rose-500/20 rounded-[1.5rem] flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wilder flex items-center gap-1.5">
                ⚠️ Duplikat / Kata Kunci Tidak Sesuai ({filesWithDuplicates.length} file)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-bold">
                Ada beberapa file dengan kata kunci duplikat atau jumlah tidak sesuai target ({Number(keywordCount) || 40} kata kunci). Perbaiki semua file sekaligus!
              </p>
            </div>
            <button
              onClick={handleFixBatch}
              disabled={isFixingBatch}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 font-extrabold text-white text-[10px] uppercase rounded-[1.5rem] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/10 shrink-0"
            >
              {isFixingBatch ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Fixing Batch...</span>
                </>
              ) : (
                <span>⚙️ Perbaiki Semua Files ({filesWithDuplicates.length})</span>
              )}
            </button>
          </div>
        )}

        <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isLoading && files.some(f => f.isGenerating || f.isExtracting) && files.length > 0 ? (
              <motion.div
                key="queue-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {progressInfo && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-[1.5rem] p-4 flex flex-col space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Loader2 size={14} className="text-violet-500 animate-spin" />
                        <span className="text-[10px] font-black uppercase text-violet-500 tracking-wider">
                          Processing Batch {progressInfo.current}/{progressInfo.total}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400">
                        {Math.round((progressInfo.current / progressInfo.total) * 100)}%
                      </span>
                    </div>
                    <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-violet-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {/* Individual progress items are already handled in the map below, 
                    but when the entire thing is loading, we might want skeletons for items that haven't started. */}
              </motion.div>
            ) : null}

            {!hasFiles ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 opacity-30"
              >
                <Info size={40} className="mb-2 text-slate-400" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">No assets uploaded yet</p>
              </motion.div>
            ) : filteredFiles.length === 0 ? (
              <motion.div 
                key="no-match"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 opacity-40"
              >
                <Search size={40} className="mb-2 text-slate-400" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#5a5c69]">No matching assets found</p>
              </motion.div>
            ) : (
              filteredFiles.map((file, index) => (
                <motion.div 
                  layout
                  key={file.id} 
                  id={`file-card-${file.id}`}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ scale: 1.005, y: -2 }}
                  className={`relative bg-white dark:bg-slate-900 border rounded-[1.5rem] p-5 transition-all duration-300 hover:shadow-2xl ${
                    file.error ? 'border-red-500/30 bg-red-50/30 dark:bg-red-950/10 shadow-red-500/5 hover:border-red-500/50' 
                    : file.title ? 'border-emerald-500/20 dark:border-emerald-500/10 hover:border-emerald-500/40 shadow-emerald-500/5' 
                    : 'border-slate-200/80 dark:border-white/5 hover:border-violet-500/20 shadow-black/5'
                  }`}
                >
                  {file.isGenerating && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-[#111827]/95 flex flex-col items-center justify-center z-20 space-y-3 rounded-2xl backdrop-blur-[2px]">
                      <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse" />
                        <Loader2 size={32} className="text-[#7c3aed] animate-spin relative" />
                      </div>
                      <div className="text-center">
                        <h5 className="text-[10px] font-black text-[#7c3aed] dark:text-violet-400 uppercase tracking-[0.2em] animate-pulse">Analyzing Visual Spectrum</h5>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Metagen is identifying semantic identifiers...</p>
                      </div>
                    </div>
                  )}
                  {file.isExtracting && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-[#111827]/95 flex flex-col items-center justify-center z-20 space-y-3 rounded-2xl backdrop-blur-[2px]">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                        <Loader2 size={32} className="text-purple-600 animate-spin relative" />
                      </div>
                      <div className="text-center">
                        <h5 className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] animate-pulse">Temporal Decoding</h5>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Extracting keyframes for contextual analysis...</p>
                      </div>
                    </div>
                  )}
                
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                  {handleRegenerateFile && (
                    <button
                      onClick={() => handleRegenerateFile(file)}
                      disabled={file.isGenerating || file.isExtracting}
                      className="p-1.5 bg-slate-100 hover:bg-violet-50 dark:bg-slate-800 dark:hover:bg-blue-950/15 text-slate-400 hover:text-violet-500 disabled:opacity-40 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 hover:border-violet-500/20 focus:outline-none cursor-pointer"
                      title="Regenerate metadata for this asset"
                    >
                      <Sparkles size={12} className={file.isGenerating ? "animate-spin text-violet-500" : ""} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-1.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/15 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 hover:border-red-500/20 focus:outline-none"
                    title="Delete asset"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="flex flex-col space-y-5">
                  <div className="flex items-start space-x-4">
                    <div className="text-slate-300 dark:text-slate-600 font-black text-xl pt-1 select-none">
                      {index + 1}
                    </div>
                    <div 
                      onClick={() => setPreviewFile(file)}
                      className={`w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shrink-0 cursor-pointer hover:ring-2 hover:ring-[#7c3aed]/50 hover:scale-[1.02] transition-all shadow-md shadow-black/5 ${file.isGenerating || file.isExtracting ? 'opacity-80' : ''}`}
                    >
                      {file.file.type.startsWith('video/') && file.analysisFrames && file.analysisFrames.length >= 3 ? (
                        <div className="relative w-full h-full">
                          <img src={file.analysisFrames[1] || undefined} className="w-full h-full object-cover" alt="Frame" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <Film size={12} className="absolute bottom-1.5 left-1.5 text-white/90" />
                        </div>
                      ) : file.thumbnail ? (
                        <img src={file.thumbnail || undefined} className="w-full h-full object-cover hover:rotate-1 hover:scale-105 transition-transform duration-500" alt="Thumbnail" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-bold text-[9px]">
                          <FileCode size={20} className="mb-0.5" />
                          <span>{file.file.name.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 py-0.5">
                      <FileNameInput
                        initialName={file.customFileName ?? file.file.name}
                        onNameChange={(newName) => {
                          updateFiles(prev => prev.map(f => f.id === file.id ? { ...f, customFileName: newName } : f));
                        }}
                      />
                      <div className="mt-1.5 pb-1 flex flex-wrap gap-1.5 items-center">
                        {file.error ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-wider rounded-xl border border-red-500/20 shadow-md shadow-black/5">
                            Error: {file.error}
                          </span>
                        ) : file.title ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-[#1cc88a]/10 dark:bg-[#1cc88a]/5 text-[#1bd18f] text-[9px] font-black uppercase tracking-wider rounded-xl border border-[#1cc88a]/20 shadow-md shadow-black/5">
                            Analysis Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider rounded-xl border border-slate-200 dark:border-white/5 shadow-md shadow-black/5">
                            Waiting Pending
                          </span>
                        )}
                      </div>

                      {file.file.type.startsWith('video/') && file.analysisFrames && file.analysisFrames.length >= 3 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Storyboards List (Start, Center, End)</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                              <img src={file.analysisFrames[0] || undefined} className="w-full h-full object-cover" alt="Start" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white text-center py-0.5 font-bold uppercase">10%</span>
                            </div>
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                              <img src={file.analysisFrames[1] || undefined} className="w-full h-full object-cover" alt="Middle" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white text-center py-0.5 font-bold uppercase">50%</span>
                            </div>
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                              <img src={file.analysisFrames[2] || undefined} className="w-full h-full object-cover" alt="End" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white text-center py-0.5 font-bold uppercase">90%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <ExifCollapse exif={file.exifMetadata} />

                  {file.title && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <ProjectCopyBox 
                        label={t.title_label} 
                        value={file.title} 
                        themeColor={activeTool === ToolType.IMAGE ? 'blue' : activeTool === ToolType.VIDEO ? 'purple' : 'emerald'} 
                        showLengthRating 
                        onChange={(val) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, title: val} : f))} 
                      />
                      
                      <ProjectCopyBox 
                        label={t.description_label} 
                        value={file.description} 
                        isTextArea 
                        themeColor={activeTool === ToolType.IMAGE ? 'blue' : activeTool === ToolType.VIDEO ? 'purple' : 'emerald'} 
                        onChange={(val) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, description: val} : f))} 
                      />
                      
                      <ProjectKeywordList 
                        label={t.keywords_label} 
                        keywords={file.keywords} 
                        title={file.title}
                        description={file.description}
                        themeColor={activeTool === ToolType.IMAGE ? 'blue' : activeTool === ToolType.VIDEO ? 'purple' : 'emerald'} 
                        onChange={(newKeywords) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, keywords: newKeywords} : f))} 
                        aiOptions={aiOptions}
                        keywordCount={keywordCount}
                        hideIndividualFix={files.length > 1}
                        t={t}
                      />

                      <div className="space-y-1 px-0.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.category_adobe_label}</label>
                        <select 
                          className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-violet-500 transition-all appearance-none" 
                          value={file.adobeCategoryId} 
                          onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, adobeCategoryId: parseInt(e.target.value)} : f))}
                        >
                          <option value="">{t.select_category}</option>
                          {ADOBE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.id}: {cat.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-0.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.category_shutterstock_1_label}</label>
                          <select 
                            className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-violet-500 transition-all appearance-none" 
                            value={file.shutterstockCategory1} 
                            onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, shutterstockCategory1: e.target.value} : f))}
                          >
                            <option value="">{t.select_category}</option>
                            {(activeTool === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).map(cat => (
                              <option key={cat} value={cat} disabled={cat === file.shutterstockCategory2}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.category_shutterstock_2_label}</label>
                          <select 
                            className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-violet-500 transition-all appearance-none" 
                            value={file.shutterstockCategory2} 
                            onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, shutterstockCategory2: e.target.value} : f))}
                          >
                            <option value="">{t.select_category}</option>
                            {(activeTool === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).map(cat => (
                              <option key={cat} value={cat} disabled={cat === file.shutterstockCategory1}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {file.categoryReason && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-100/40 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed flex items-start gap-2">
                          <Sparkles size={14} className="mt-0.5 text-indigo-500 dark:text-indigo-400 shrink-0 animate-pulse" />
                          <div>
                            <span className="font-extrabold text-indigo-800 dark:text-indigo-200">Visual Semantic Reason:</span> {file.categoryReason}
                          </div>
                        </div>
                      )}

                      {/* MiriCanvas Category */}
                      <div className="space-y-1 px-0.5">
                        <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">{t.category_miricanvas_label}</label>
                        <select 
                          className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-yellow-500 transition-all appearance-none" 
                          value={file.miriCanvasCategoryId} 
                          onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, miriCanvasCategoryId: e.target.value === '' ? '' : parseInt(e.target.value)} : f))}
                        >
                          <option value="">{t.select_category}</option>
                          {MIRICANVAS_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.id}: {cat.name}</option>)}
                        </select>
                      </div>

                      {/* Dreamstime Main Category */}
                      <div className="space-y-1 px-0.5">
                        <label className="text-[9px] font-black text-green-500 uppercase tracking-widest">{t.category_dreamstime_main_label}</label>
                        <select 
                          className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-green-500 transition-all appearance-none" 
                          value={file.dreamstimeMainCategoryId} 
                          onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, dreamstimeMainCategoryId: e.target.value === '' ? '' : parseInt(e.target.value), dreamstimeSubCategoryId: ''} : f))}
                        >
                          <option value="">{t.select_category}</option>
                          {DREAMSTIME_MAIN_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.id}: {cat.name}</option>)}
                        </select>
                      </div>

                      {/* Dreamstime SubCategory */}
                      <div className="space-y-1 px-0.5">
                        <label className="text-[9px] font-black text-green-500 uppercase tracking-widest">{t.category_dreamstime_sub_label}</label>
                        <select 
                          className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-green-500 transition-all appearance-none" 
                          value={file.dreamstimeSubCategoryId} 
                          onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, dreamstimeSubCategoryId: e.target.value === '' ? '' : parseInt(e.target.value)} : f))}
                        >
                          <option value="">{t.select_category}</option>
                          {DREAMSTIME_SUB_CATEGORIES.filter(sc => sc.parentId === (file.dreamstimeMainCategoryId || 0)).map(cat => <option key={cat.id} value={cat.id}>{cat.id}: {cat.name}</option>)}
                        </select>
                      </div>

                      {/* REGENERATE METADATA BUTTON */}
                      {handleRegenerateFile && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleRegenerateFile(file)}
                            disabled={file.isGenerating || file.isExtracting}
                            className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-[#1e3a8a] text-white text-[10px] font-black uppercase tracking-wider rounded-[1.5rem] hover:from-violet-600 hover:to-blue-900 transition-all flex items-center justify-center space-x-2 shadow-md shadow-black/5 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles size={13} className={file.isGenerating ? "animate-spin" : "animate-pulse"} />
                            <span>{file.isGenerating ? t.generating : t.regenerate}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
);
};
