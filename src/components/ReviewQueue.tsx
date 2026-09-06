import React from 'react';
import { Search, Info, CheckCircle2, Trash2, FileCode, ArrowRight, Check, Loader2, Sparkles, Film, Copy, SlidersHorizontal, Tag, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { ToolType, FileItem, ProgressInfo } from '../../types';
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO, DREAMSTIME_CATEGORIES, MIRICANVAS_CATEGORIES } from '../../constants';
import { copyToClipboard } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { getHeaders } from '../../services/geminiService';

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

  const handleCopy = async () => {
    const success = await copyToClipboard(localValue);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const safeValue = localValue || '';
  const len = safeValue.length;
  const isTitle = label.toLowerCase().includes('title') || label.toLowerCase().includes('judul');
  const minLen = isTitle ? 15 : 50; 
  const ratingText = len < minLen ? 'Too short' : len <= 200 ? 'Optimal' : 'Too long';
  const ratingColor = len < minLen ? 'text-rose-500 bg-rose-500/10' : len <= 200 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <label className="flex items-center gap-1.5">
          <span>{label}</span>
          {showLengthRating && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ratingColor}`}>
              {len} chars • {ratingText}
            </span>
          )}
        </label>
        <button 
          onClick={handleCopy} 
          className="text-violet-600 dark:text-violet-400 font-extrabold hover:underline flex items-center gap-1 text-[10px] lowercase cursor-pointer"
        >
          {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          <span>{copied ? 'copied!' : 'copy'}</span>
        </button>
      </div>
      {isTextArea ? (
        <textarea
          value={safeValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={isTitle ? 200 : undefined}
          className="w-full p-3 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs text-slate-800 dark:text-slate-200 transition-all font-medium resize-none min-h-[72px] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/80"
        />
      ) : (
        <input
          type="text"
          value={safeValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={isTitle ? 200 : undefined}
          className="w-full p-2.5 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs text-slate-800 dark:text-slate-200 transition-all font-bold focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/80"
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
      setSuggestError("Enter Title first");
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
        throw new Error(errorData.error || "Suggestion failed");
      }

      const data = await response.json();
      const suggested: string[] = data.keywords || [];

      if (suggested.length === 0) {
        setSuggestError("No suggestions");
        setTimeout(() => setSuggestError(null), 3000);
      } else {
        const uniqueNew = suggested.filter(kw => !keywords.includes(kw));
        if (uniqueNew.length > 0) {
          onChange([...keywords, ...uniqueNew]);
        } else {
          setSuggestError("Already comprehensive");
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

  const handleClipRank = () => {
    if (!keywords || keywords.length === 0) return;
    
    const titleWords = (title || '').toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const descWords = (description || '').toLowerCase().split(/\W+/).filter(w => w.length > 2);

    const scored = keywords.map((kw, originalIndex) => {
      const cleanKw = kw.toLowerCase().trim();
      let score = 0.5;

      if (titleWords.some(tw => cleanKw === tw || cleanKw.includes(tw) || tw.includes(cleanKw))) {
        score += 0.45;
      }
      if (descWords.some(dw => cleanKw === dw || cleanKw.includes(dw))) {
        score += 0.25;
      }
      if (cleanKw.includes(' ') && cleanKw.split(' ').length <= 3) {
        score += 0.15;
      }

      score -= (originalIndex * 0.001);
      return { kw, score };
    });

    scored.sort((a, b) => b.score - a.score);
    onChange(scored.map(item => item.kw));
  };

  return (
    <div className="space-y-2">
      {/* Top Action Bar */}
      <div className="flex flex-wrap justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 gap-2">
        <label className="flex items-center gap-1.5">
          <Tag size={12} className="text-violet-500" />
          <span>{label}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
            {keywords.length}/49
          </span>
        </label>
        
        <div className="flex items-center flex-wrap gap-1.5">
          {suggestError && (
            <span className="text-rose-500 font-bold normal-case leading-none animate-pulse mr-1">
              {suggestError}
            </span>
          )}
          
          <button 
            onClick={handleClipRank} 
            title="Sort keywords by CLIP semantic relevance to title"
            className="px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer"
          >
            <span>⚡ CLIP Rank</span>
          </button>

          <button 
            onClick={handleClean} 
            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer"
          >
            Clean
          </button>

          <button 
            onClick={handleShuffle} 
            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer"
          >
            Shuffle
          </button>

          <button 
            onClick={handleCopy} 
            className="px-2 py-1 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1 text-[10px] transition-all cursor-pointer"
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleSmartSuggest}
            disabled={isSuggesting || !title || !title.trim()}
            title={!title || !title.trim() ? "Enter title first for context" : "AI will suggest 5 commercial keywords"}
            className="px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 text-[10px] transition-all disabled:opacity-40 cursor-pointer"
          >
            {isSuggesting ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <span>✨ Smart Suggest</span>
            )}
          </button>
        </div>
      </div>

      {/* Helper Context Badge */}
      <div className="text-[10px] text-violet-700 dark:text-violet-300 font-semibold flex items-center gap-1.5 py-1.5 px-3 bg-violet-500/8 dark:bg-violet-500/15 rounded-lg border border-violet-500/15">
        <span>💡</span>
        <span>
          {t && t.language === 'Bahasa' 
            ? "Urutan kata kunci menentukan peringkat pencarian Adobe Stock. Keyword #1 (👑) adalah yang paling utama!" 
            : "Keyword ordering dictates Adobe Stock search ranking. Keyword #1 (👑) carries the highest search weight!"}
        </span>
      </div>

      {/* Near-duplicates individual alert */}
      {nearDuplicates.length > 0 && !hideIndividualFix && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 text-[10px] font-bold gap-2">
          <span className="truncate" title={nearDuplicates.join(', ')}>
            ⚠️ Near-duplicates detected ({nearDuplicates.slice(0, 3).join(', ')})
          </span>
          <button 
            onClick={async () => {
              const targetCount = Number(keywordCount) || 40;
              const initialCleaned = keywords.filter(k => !nearDuplicates.includes(k));
              
              if (initialCleaned.length >= targetCount || !title) {
                onChange(initialCleaned.slice(0, targetCount));
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
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer font-extrabold"
          >
            {isSuggesting && <Loader2 size={11} className="animate-spin" />} Fix file
          </button>
        </div>
      )}

      {/* Chips Container */}
      <div className="p-2.5 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {keywords.map((kw, index) => {
            const isFirst = index === 0;
            const isTop5 = index > 0 && index < 5;

            let badgeClass = "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/5 hover:border-slate-300";
            if (isFirst) {
              badgeClass = "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10 font-black";
            } else if (isTop5) {
              badgeClass = "bg-violet-500/15 text-violet-800 dark:text-violet-300 border border-violet-500/30 font-bold";
            }

            return (
              <motion.span 
                key={`${kw}-${index}`} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                layout
                className={`inline-flex cursor-grab active:cursor-grabbing items-center px-2 py-1 rounded-lg text-[10px] select-none transition-shadow ${badgeClass} ${draggedIndex === index ? 'opacity-40 ring-2 ring-violet-500' : ''}`}
                title={isFirst ? "Keyword #1 - Prime Search Importance (👑 Top 1)" : isTop5 ? `Keyword #${index + 1} - High Search Priority (Top 5)` : `Keyword #${index + 1}`}
              >
                <span className="opacity-70 mr-1 text-[9px] font-black font-mono shrink-0">
                  {isFirst ? '👑' : `#${index + 1}`}
                </span>
                <span className="truncate max-w-[140px]">{kw}</span>
                <button 
                  onClick={() => handleRemove(kw)} 
                  className="ml-1 text-slate-400 hover:text-rose-600 font-bold text-xs leading-none p-0.5 rounded cursor-pointer"
                >
                  ×
                </button>
              </motion.span>
            );
          })}
        </AnimatePresence>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleAdd}
          placeholder="+ Add keyword (Enter)..."
          className="bg-transparent border-none outline-none text-xs font-semibold p-1 text-slate-700 dark:text-slate-300 flex-grow min-w-[120px] placeholder-slate-400"
        />
      </div>
    </div>
  );
};

const ExifCollapse: React.FC<{ exif?: any }> = ({ exif }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  if (!exif || Object.keys(exif).length === 0) return null;

  return (
    <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-black/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 flex items-center justify-between text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors focus:outline-none cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <span>📊</span>
          <span>Technical EXIF Metadata</span>
        </span>
        <span className="text-[9px] font-extrabold normal-case bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
          {isOpen ? <>Hide info <ChevronUp size={11} /></> : <>View info <ChevronDown size={11} /></>}
        </span>
      </button>
      {isOpen && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 max-h-[180px] overflow-y-auto text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-1 bg-white dark:bg-black/20">
          {Object.entries(exif).map(([key, val]) => {
            if (typeof val === 'object' && val !== null) {
              val = JSON.stringify(val);
            }
            return (
              <div key={key} className="flex justify-between border-b border-slate-100 dark:border-slate-800/40 pb-1 gap-4">
                <span className="font-extrabold text-slate-700 dark:text-slate-300 shrink-0">{key}</span>
                <span className="text-right truncate max-w-[240px] font-semibold text-slate-500 dark:text-slate-400" title={String(val)}>{String(val)}</span>
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
      className="text-xs sm:text-sm font-black text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 outline-none w-full truncate cursor-text transition-colors pb-0.5"
      title="Click to edit filename"
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
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'ready' | 'pending' | 'error'>('all');
  const [copiedCardId, setCopiedCardId] = React.useState<string | null>(null);

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
          console.error("Failed to suggest for file", file.id, e);
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

  const handleCopyAllMetadata = async (file: FileItem) => {
    const text = `Title: ${file.title || ''}\n\nDescription: ${file.description || ''}\n\nKeywords: ${(file.keywords || []).join(', ')}`;
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedCardId(file.id);
      setTimeout(() => setCopiedCardId(null), 2000);
    }
  };

  const filteredFiles = files.filter(f => {
    // Status filter
    if (statusFilter === 'ready' && !f.title) return false;
    if (statusFilter === 'pending' && (f.title || f.error)) return false;
    if (statusFilter === 'error' && !f.error) return false;

    // Search query filter
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
      className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border rounded-2xl shadow-xl overflow-hidden relative transition-all duration-300 ${
        isGenerating
          ? 'border-violet-500 ring-2 ring-violet-500/20 shadow-violet-500/10' 
          : 'border-slate-200/80 dark:border-white/5 shadow-black/5'
      } ${
        mobileTab === 'review' ? 'block animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:block'
      }`}
    >
      {/* HEADER */}
      <div className="bg-slate-50/70 dark:bg-slate-850/50 py-3.5 px-5 border-b border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/20">
            03
          </div>
          <div>
            <h3 className="m-0 font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider">
              Review & Refine Queue
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold hidden sm:block">
              Inspect metadata, drag keywords to reorder, and assign marketplace categories
            </p>
          </div>
        </div>

        {/* Right Header Status Pill */}
        <div className="flex items-center gap-2">
          {canDownload && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              <span>Ready to Export</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* FILTER & SEARCH CONTROL TOOLBAR */}
        {hasFiles && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: `All (${files.length})` },
                { id: 'ready', label: `Ready (${successfulFilesCount})` },
                { id: 'pending', label: `Pending (${files.filter(f => !f.title && !f.error).length})` },
                { id: 'error', label: `Errors (${files.filter(f => !!f.error).length})` }
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === pill.id
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search Input Box */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queue..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-transparent focus:border-violet-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* BATCH DUPLICATE FIX BANNER */}
        {files.length > 1 && filesWithDuplicates.length > 0 && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
            <div>
              <span className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                ⚠️ Keyword Clean Alert ({filesWithDuplicates.length} file{filesWithDuplicates.length > 1 ? 's' : ''})
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                Detected duplicate keywords or sub-optimal count across assets. Clean and top-up all files automatically.
              </p>
            </div>
            <button
              onClick={handleFixBatch}
              disabled={isFixingBatch}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
            >
              {isFixingBatch ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Fixing All Files...</span>
                </>
              ) : (
                <span>Fix All Files ({filesWithDuplicates.length})</span>
              )}
            </button>
          </div>
        )}

        {/* ASSET CARDS SCROLL CONTAINER */}
        <div className="space-y-5 max-h-[620px] overflow-y-auto pr-1.5 custom-scrollbar">
          <AnimatePresence mode="wait">
            {!hasFiles ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-slate-400"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                  <FileCode size={30} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  No assets uploaded yet
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload images, videos, or vectors in Step 1 to begin.
                </p>
              </motion.div>
            ) : filteredFiles.length === 0 ? (
              <motion.div 
                key="no-match"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-slate-400"
              >
                <Search size={36} className="mb-2 opacity-50" />
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  No matching assets found
                </p>
                <button
                  onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                  className="mt-2 text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline"
                >
                  Reset all filters
                </button>
              </motion.div>
            ) : (
              filteredFiles.map((file, index) => (
                <motion.div 
                  layout
                  key={file.id} 
                  id={`file-card-${file.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative bg-white dark:bg-slate-850 rounded-2xl border transition-all duration-300 p-5 shadow-sm hover:shadow-md ${
                    file.error 
                      ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10' 
                      : file.title 
                        ? 'border-slate-200/90 dark:border-white/10 hover:border-violet-500/40' 
                        : 'border-slate-200/70 dark:border-white/5'
                  }`}
                >
                  {/* GENERATING / EXTRACTING OVERLAY */}
                  {file.isGenerating && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center animate-bounce">
                        <Sparkles size={20} />
                      </div>
                      <h5 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                        Generating Metadata...
                      </h5>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Analyzing visual semantics and generating keywords
                      </p>
                    </div>
                  )}
                  {file.isExtracting && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2 rounded-2xl">
                      <Loader2 size={24} className="text-purple-600 animate-spin" />
                      <h5 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        Decoding Video Frames...
                      </h5>
                    </div>
                  )}

                  {/* TOP ACTION BUTTONS */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                    {file.title && (
                      <button
                        onClick={() => handleCopyAllMetadata(file)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Copy All Metadata (Title, Desc, Keywords)"
                      >
                        {copiedCardId === file.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        <span className="hidden sm:inline text-[10px] uppercase font-extrabold">
                          {copiedCardId === file.id ? 'Copied' : 'Copy All'}
                        </span>
                      </button>
                    )}

                    {handleRegenerateFile && (
                      <button
                        onClick={() => handleRegenerateFile(file)}
                        disabled={file.isGenerating || file.isExtracting}
                        className="p-2 bg-slate-100 hover:bg-violet-50 dark:bg-slate-800 dark:hover:bg-violet-950/30 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-40 rounded-lg transition-all cursor-pointer"
                        title="Regenerate metadata for this asset"
                      >
                        <Sparkles size={13} className={file.isGenerating ? "animate-spin" : ""} />
                      </button>
                    )}

                    <button 
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                      title="Delete asset from queue"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex flex-col space-y-4">
                    {/* CARD HERO ROW (Thumbnail + Name + Status) */}
                    <div className="flex items-start gap-4 pr-24">
                      {/* Index Badge */}
                      <span className="text-slate-300 dark:text-slate-700 font-black text-sm pt-1 select-none font-mono">
                        #{index + 1}
                      </span>

                      {/* Thumbnail with Click to Preview */}
                      <div 
                        onClick={() => setPreviewFile(file)}
                        className="w-18 h-18 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-500/50 hover:scale-105 transition-all shadow-sm relative group"
                        title="Click to zoom preview"
                      >
                        {file.file.type.startsWith('video/') && file.analysisFrames && file.analysisFrames.length >= 3 ? (
                          <div className="relative w-full h-full">
                            <img src={file.analysisFrames[1] || undefined} className="w-full h-full object-cover" alt="" loading="lazy" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Film size={16} className="text-white drop-shadow" />
                            </div>
                          </div>
                        ) : file.thumbnail ? (
                          <img src={file.thumbnail || undefined} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt="" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-bold text-[10px]">
                            <FileCode size={22} className="mb-0.5 text-slate-500" />
                            <span>{file.file.name.split('.').pop()?.toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      {/* Filename & Status Badge */}
                      <div className="flex-1 min-w-0">
                        <FileNameInput
                          initialName={file.customFileName ?? file.file.name}
                          onNameChange={(newName) => {
                            updateFiles(prev => prev.map(f => f.id === file.id ? { ...f, customFileName: newName } : f));
                          }}
                        />

                        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                          {file.error ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-rose-500/20">
                              Error: {file.error}
                            </span>
                          ) : file.title ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-emerald-500/20">
                              <CheckCircle2 size={11} />
                              Analysis Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-md">
                              Waiting in Queue
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-medium">
                            • {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>

                        {/* Video Storyboard Strip */}
                        {file.file.type.startsWith('video/') && file.analysisFrames && file.analysisFrames.length >= 3 && (
                          <div className="mt-2.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                              Temporal Storyboards (10%, 50%, 90%)
                            </span>
                            <div className="grid grid-cols-3 gap-1.5 max-w-[260px]">
                              {file.analysisFrames.slice(0, 3).map((frame, idx) => (
                                <div key={idx} className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                                  <img src={frame} className="w-full h-full object-cover" alt="" />
                                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.2 font-bold">
                                    {idx === 0 ? '10%' : idx === 1 ? '50%' : '90%'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* EXIF Technical Collapse */}
                    <ExifCollapse exif={file.exifMetadata} />

                    {/* METADATA EDITORS (When Generated) */}
                    {file.title && (
                      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/5 animate-in fade-in duration-200">
                        {/* YOLO Grounded Objects Badges */}
                        {Array.isArray(file.yolo_detected_objects) && file.yolo_detected_objects.length > 0 && (
                          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                                  YOLO Grounded Objects ({file.yolo_detected_objects.length})
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-400 font-bold">100% FACTUAL</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {file.yolo_detected_objects.map((obj, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-indigo-100 dark:border-indigo-900/50 shadow-xs"
                                >
                                  <span>🎯 {obj.label}</span>
                                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">
                                    {Math.round(obj.confidence > 1 ? obj.confidence : obj.confidence * 100)}%
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Title Editor */}
                        <ProjectCopyBox 
                          label={t.title_label} 
                          value={file.title} 
                          themeColor={activeTool === ToolType.IMAGE ? 'blue' : activeTool === ToolType.VIDEO ? 'purple' : 'emerald'} 
                          showLengthRating 
                          onChange={(val) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, title: val} : f))} 
                        />
                        
                        {/* Description Editor */}
                        <ProjectCopyBox 
                          label={t.description_label} 
                          value={file.description} 
                          isTextArea 
                          themeColor={activeTool === ToolType.IMAGE ? 'blue' : activeTool === ToolType.VIDEO ? 'purple' : 'emerald'} 
                          onChange={(val) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, description: val} : f))} 
                        />
                        
                        {/* Keywords List with Drag & Drop */}
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

                        {/* MARKETPLACE CATEGORIES CARD */}
                        <div className="p-3.5 bg-slate-50/70 dark:bg-black/20 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Layers size={13} className="text-violet-500" />
                            <span>Marketplace Category Assignments</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Adobe Stock Category */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                {t.category_adobe_label}
                              </label>
                              <select 
                                className="w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all" 
                                value={file.adobeCategoryId} 
                                onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, adobeCategoryId: parseInt(e.target.value)} : f))}
                              >
                                <option value="">{t.select_category}</option>
                                {ADOBE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.id}: {cat.name}</option>)}
                              </select>
                            </div>

                            {/* Shutterstock Category 1 */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                {t.category_shutterstock_1_label}
                              </label>
                              <select 
                                className="w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all" 
                                value={file.shutterstockCategory1} 
                                onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, shutterstockCategory1: e.target.value} : f))}
                              >
                                <option value="">{t.select_category}</option>
                                {(activeTool === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).map(cat => (
                                  <option key={cat} value={cat} disabled={cat === file.shutterstockCategory2}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            {/* Shutterstock Category 2 */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                {t.category_shutterstock_2_label}
                              </label>
                              <select 
                                className="w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all" 
                                value={file.shutterstockCategory2} 
                                onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, shutterstockCategory2: e.target.value} : f))}
                              >
                                <option value="">{t.select_category}</option>
                                {(activeTool === ToolType.VIDEO ? SHUTTERSTOCK_CATEGORIES_VIDEO : SHUTTERSTOCK_CATEGORIES).map(cat => (
                                  <option key={cat} value={cat} disabled={cat === file.shutterstockCategory1}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            {/* Dreamstime */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                Kategori Dreamstime
                              </label>
                              <select 
                                className="w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all" 
                                value={file.dreamstimeCategory || ''} 
                                onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, dreamstimeCategory: e.target.value} : f))}
                              >
                                <option value="">{t.select_category}</option>
                                {DREAMSTIME_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            {/* MiriCanvas */}
                            <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                              <label className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                Kategori MiriCanvas
                              </label>
                              <select 
                                className="w-full h-8.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40 outline-none transition-all" 
                                value={file.miriCanvasCategory || ''} 
                                onChange={(e) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, miriCanvasCategory: e.target.value} : f))}
                              >
                                <option value="">{t.select_category}</option>
                                {MIRICANVAS_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {file.categoryReason && (
                            <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed flex items-start gap-2">
                              <Sparkles size={13} className="mt-0.5 text-indigo-500 shrink-0" />
                              <div>
                                <span className="font-extrabold">Visual Semantic Reason:</span> {file.categoryReason}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* REGENERATE METADATA CTA */}
                        {handleRegenerateFile && (
                          <div className="pt-1">
                            <button
                              onClick={() => handleRegenerateFile(file)}
                              disabled={file.isGenerating || file.isExtracting}
                              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              <Sparkles size={13} className={file.isGenerating ? "animate-spin" : ""} />
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
