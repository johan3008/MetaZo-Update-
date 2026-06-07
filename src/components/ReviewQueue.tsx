import React from 'react';
import { Search, Info, CheckCircle2, Trash2, FileCode, ArrowRight, Check } from 'lucide-react';
import { ToolType, FileItem } from '../../types';
import { ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO } from '../../constants';
import { copyToClipboard } from '../utils';

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
  const colorClass = themeColor === 'blue' ? 'border-[#4e73df] hover:border-blue-600' : themeColor === 'purple' ? 'border-purple-500 hover:border-purple-650' : 'border-emerald-500 hover:border-emerald-650';

  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const len = value.length;
  const ratingText = len < 10 ? 'Too short' : len <= 70 ? 'Optimal' : 'Too long';
  const ratingColor = len < 10 ? 'text-rose-500' : len <= 70 ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        <label>{label}</label>
        <div className="flex items-center space-x-2">
          {showLengthRating && <span className={`${ratingColor} font-black uppercase`}>{len} chars ({ratingText})</span>}
          <button onClick={handleCopy} className="text-[#4e73df] dark:text-blue-400 font-extrabold hover:underline lowercase">{copied ? 'copied!' : 'copy'}</button>
        </div>
      </div>
      {isTextArea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full p-2.5 bg-slate-100/50 dark:bg-black/25 rounded-xl border border-slate-200/85 dark:border-slate-800 outline-none text-xs text-slate-700 dark:text-slate-200 transition-all font-semibold resize-none min-h-[65px] focus:ring-2 focus:ring-[#4e73df]/20`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full p-2.5 bg-slate-100/55 dark:bg-black/25 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs text-slate-700 dark:text-slate-300 transition-all font-extrabold focus:ring-2 focus:ring-[#4e73df]/20`}
        />
      )}
    </div>
  );
};

interface KeywordListProps {
  label: string;
  keywords: string[];
  themeColor: 'blue' | 'purple' | 'emerald';
  onChange: (kw: string[]) => void;
}

const ProjectKeywordList: React.FC<KeywordListProps> = ({
  label,
  keywords,
  themeColor,
  onChange
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const badgeClass = themeColor === 'blue' ? 'bg-blue-500/10 text-[#4e73df]' : themeColor === 'purple' ? 'bg-purple-500/10 text-purple-600' : 'bg-emerald-500/10 text-emerald-600';

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

  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{label} ({keywords.length}/49)</label>
      <div className="p-2 bg-slate-100/50 dark:bg-black/25 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-1.5 max-h-[145px] overflow-y-auto">
        {keywords.map((kw, index) => (
          <span 
            key={`${kw}-${index}`} 
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`inline-flex cursor-grab items-center px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass} ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            <span>{kw}</span>
            <button onClick={() => handleRemove(kw)} className="ml-1 text-[9px] text-rose-500 font-extrabold">×</button>
          </span>
        ))}
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

interface ReviewQueueProps {
  files: FileItem[];
  activeTool: ToolType;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setPreviewFile: (file: FileItem | null) => void;
  updateFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  handleDeleteFile: (id: string) => void;
  mobileTab: 'upload' | 'ai' | 'review';
  setMobileTab: (tab: 'upload' | 'ai' | 'review') => void;
  t: any;
  isAllFinished: boolean;
  successfulFilesCount: number;
  canDownload: boolean;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  files,
  activeTool,
  searchQuery,
  setSearchQuery,
  setPreviewFile,
  updateFiles,
  handleDeleteFile,
  mobileTab,
  setMobileTab,
  t,
  isAllFinished,
  successfulFilesCount,
  canDownload
}) => {
  const hasFiles = files.length > 0;

  const filteredFiles = files.filter(f => {
    const term = searchQuery.toLowerCase();
    if (!term) return true;
    const name = (f.customFileName || f.file.name).toLowerCase();
    const title = (f.title || '').toLowerCase();
    const desc = (f.description || '').toLowerCase();
    const keywords = (f.keywords || []).join(', ').toLowerCase();
    return name.includes(term) || title.includes(term) || desc.includes(term) || keywords.includes(term);
  });

  return (
    <div className={`bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-lg shadow-sm overflow-hidden relative ${
      mobileTab === 'review' ? 'block animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:block'
    }`}>
      {/* HEADER */}
      <div className="bg-[#f8f9fc] dark:bg-slate-900 py-3.5 px-5 border-b border-[#e3e6f0]/60 dark:border-white/5 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <div className="w-6.5 h-6.5 rounded-lg bg-[#4e73df] text-white flex items-center justify-center font-black text-xs shadow-sm">
            3
          </div>
          <h3 className="m-0 font-extrabold text-[#4e73df] dark:text-blue-400 text-xs sm:text-sm uppercase tracking-wider">
            Review & Refine Queue
          </h3>
        </div>
        {canDownload && (
          <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 text-[9px] font-black rounded-lg uppercase tracking-wider">
            Ready to Export
          </div>
        )}
      </div>

      <div className="p-6">
        <p className="text-slate-400 dark:text-slate-500 mb-6 text-xs font-semibold leading-relaxed">
          {t.review_edit_desc}
        </p>

        {searchQuery && (
          <div className="mb-4 text-[10px] bg-blue-500/5 text-[#4e73df] py-1.5 px-3 rounded-lg border border-blue-500/10 flex items-center justify-between">
            <span>Filtering for &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
            <button onClick={() => setSearchQuery('')} className="font-extrabold underline hover:text-blue-600">Clear Search</button>
          </div>
        )}

        {isAllFinished && successfulFilesCount > 0 && (
          <div className="mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center space-x-3.5 animate-in slide-in-from-top-3 duration-300">
            <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h4 className="text-emerald-700 dark:text-emerald-400 font-extrabold text-xs sm:text-sm uppercase">Processing Complete!</h4>
              <p className="text-slate-400 text-xs font-medium mt-0.5">{successfulFilesCount} files ready for compiled download.</p>
            </div>
          </div>
        )}

        <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
          {!hasFiles ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-30">
              <Info size={40} className="mb-2 text-slate-400" />
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">No assets uploaded yet</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-40">
              <Search size={40} className="mb-2 text-slate-400" />
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#5a5c69]">No matching assets found</p>
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div 
                key={file.id} 
                className={`relative bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 ${
                  file.error ? 'border-red-500/20 bg-red-500/2' : file.title ? 'border-emerald-500/15 dark:border-emerald-500/10 hover:border-emerald-500/40' : 'border-slate-200/80 dark:border-white/5'
                }`}
              >
                {file.isGenerating && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col items-center justify-center z-20 space-y-2 rounded-2xl">
                    <div className="w-6 h-6 border-2 border-[#4e73df] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[9px] font-black text-[#4e73df] dark:text-blue-400 uppercase tracking-widest pl-1 animate-pulse">Analyzing asset...</p>
                  </div>
                )}
                {file.isExtracting && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col items-center justify-center z-20 space-y-2 rounded-2xl">
                    <div className="w-6 h-6 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest pl-1 animate-pulse">Extracting video frames...</p>
                  </div>
                )}
                
                <button 
                  onClick={() => handleDeleteFile(file.id)}
                  className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/15 text-slate-400 hover:text-red-500 rounded-lg transition-all border border-slate-200 dark:border-slate-700 hover:border-red-500/20 focus:outline-none z-10"
                  title="Delete asset"
                >
                  <Trash2 size={12} />
                </button>

                <div className="flex flex-col space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-slate-300 dark:text-slate-600 font-black text-lg pt-1 select-none">
                      {index + 1}
                    </div>
                    <div 
                      onClick={() => setPreviewFile(file)}
                      className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500/55 transition-all shadow-inner"
                    >
                      {file.file.type.startsWith('video/') && file.analysisFrames && file.analysisFrames.length >= 3 ? (
                        <img src={file.analysisFrames[1] || undefined} className="w-full h-full object-cover" alt="Frame" loading="lazy" />
                      ) : file.thumbnail ? (
                        <img src={file.thumbnail || undefined} className="w-full h-full object-cover" alt="Thumbnail" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-bold text-[9px]">
                          <FileCode size={20} className="mb-0.5" />
                          <span>{file.file.name.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <input 
                        type="text" 
                        value={file.customFileName ?? file.file.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          updateFiles(prev => prev.map(f => f.id === file.id ? { ...f, customFileName: newName } : f));
                        }}
                        className="text-xs font-black text-slate-700 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 outline-none w-full truncate cursor-text transition-colors pb-0.5"
                        title="Edit Filename"
                      />
                      <div className="mt-1">
                        {file.error ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-100 dark:bg-red-950/20 text-red-500 text-[8px] font-black uppercase tracking-wider rounded-md border border-red-500/10">
                            Error: {file.error}
                          </span>
                        ) : file.title ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-[#1cc88a]/10 text-[#1cc88a] text-[8px] font-black uppercase tracking-wider rounded-md border border-[#1cc88a]/15">
                            Analysis Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-wider rounded-md border border-slate-200">
                            Waiting
                          </span>
                        )}
                      </div>

                      {file.file.type.startsWith('video/') && file.analysisFrames && file.analysisFrames.length >= 3 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Storyboards List (Start, Center, End)</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                              <img src={file.analysisFrames[0] || undefined} className="w-full h-full object-cover" alt="Start" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white text-center py-0.5 font-bold uppercase">10%</span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                              <img src={file.analysisFrames[1] || undefined} className="w-full h-full object-cover" alt="Middle" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white text-center py-0.5 font-bold uppercase">50%</span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                              <img src={file.analysisFrames[2] || undefined} className="w-full h-full object-cover" alt="End" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-white text-center py-0.5 font-bold uppercase">90%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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
                        themeColor={activeTool === ToolType.IMAGE ? 'blue' : activeTool === ToolType.VIDEO ? 'purple' : 'emerald'} 
                        onChange={(newKeywords) => updateFiles(prev => prev.map(f => f.id === file.id ? {...f, keywords: newKeywords} : f))} 
                      />

                      <div className="space-y-1 px-0.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.category_adobe_label}</label>
                        <select 
                          className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 transition-all appearance-none" 
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
                            className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 transition-all appearance-none" 
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
                            className="w-full p-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 transition-all appearance-none" 
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
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
