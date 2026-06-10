import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Sparkles, Loader2, FileImage, ChevronDown, ChevronUp, Trash2, Zap, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QualityReport {
  status: "PASS" | "FAIL";
  final_score: number;
  breakdown: {
    technical_quality: number;
    legal_ip_safety: number;
  };
  heatmaps?: { type: "noise" | "focus" | "lighting"; x: number; y: number; intensity: number; raw_value: string }[];
  adobe_analysis: {
    decision: string;
    primary_reason: string;
    technical_summary: string;
    ip_brand_summary: string;
    landmark_summary: string;
    short_advice: string;
  };
  rejection_reasons: string[];
  actionable_feedback: string[];
}

export const ImageQualityCheck: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Record<string, QualityReport>>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // removed toggleReportExpand helper since it's not used
  const [progress, setProgress] = useState(0);
  const [tolerance, setTolerance] = useState<'STRICT' | 'MEDIUM' | 'LOOSE'>('MEDIUM');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [showHeatmaps, setShowHeatmaps] = useState<Set<string>>(new Set());

  const toggleHeatmap = (fileName: string) => {
    const next = new Set(showHeatmaps);
    if (next.has(fileName)) {
      next.delete(fileName);
    } else {
      next.add(fileName);
    }
    setShowHeatmaps(next);
  };

  const toggleReportExpand = (fileName: string) => {
    const next = new Set(expandedReports);
    if (next.has(fileName)) {
      next.delete(fileName);
    } else {
      next.add(fileName);
    }
    setExpandedReports(next);
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={`qc-skeleton-${i}`} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-200 dark:border-white/5 h-[400px] flex flex-col animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
            <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
          </div>
          <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700/50 rounded-xl mb-4" />
          <div className="space-y-3">
            <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
            <div className="grid grid-cols-1 gap-2">
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-700/50 rounded-lg" />
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-700/50 rounded-lg" />
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-700/50 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const handleClearAll = () => {
    Object.keys(previews).forEach(key => URL.revokeObjectURL(previews[key]));
    setFiles([]);
    setPreviews({});
    setReports({});
    setError(null);
    setShowHeatmaps(new Set());
  };

  const resizeAndProcess = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (selectedFiles: FileList | File[]) => {
    // Revoke old object URLs
    Object.keys(previews).forEach(key => URL.revokeObjectURL(previews[key]));

    const fileArray = Array.from(selectedFiles);
    setFiles(fileArray);
    
    const newPreviews: Record<string, string> = {};
    fileArray.forEach(file => {
      newPreviews[file.name] = URL.createObjectURL(file);
    });
    setPreviews(newPreviews);
    
    setReports({});
    setError(null);
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setProgress(0);
    setError(null);
    setReports({}); // Clear previous
    const newReports: Record<string, QualityReport> = {};

    const progressPerFile = 100 / files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const startProgress = i * progressPerFile;
      
      try {
        // Increment internally a bit
        setProgress(startProgress + 5);
        
        const base64Image = await resizeAndProcess(file);
        setProgress(startProgress + 15);

        const response = await fetch('/api/check-image-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image, tolerance }),
        });
        if (!response.ok) throw new Error(`Failed to analyze ${file.name}`);
        const data = await response.json();
        newReports[file.name] = data;
        setReports({ ...newReports });
        
        setProgress(startProgress + progressPerFile);
      } catch (err: any) {
        setError(err.message);
      }
    }
    setProgress(100);
    setTimeout(() => setLoading(true), 100); // Trigger a quick refresh state if needed
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      {/* Brand Header - Premium Overhaul */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-emerald-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
          {/* Progress Bar Glow */}
          {loading && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-emerald-600 transition-all duration-500 ease-out z-50"
              style={{ width: `${progress}%` }}
            />
          )}
          
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative bg-emerald-500 p-4 rounded-2xl shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10">
                <Sparkles className="text-white" size={28} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                Curator <span className="text-emerald-500">AI</span>
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.15em]">
                  Professional Microstock Compliance Hub
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {(files.length > 0 || Object.keys(reports).length > 0) && (
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 border border-slate-200 dark:border-white/10"
              >
                <Trash2 size={13} />
                Reset
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={files.length === 0 || loading}
              className="relative group/btn flex items-center gap-3 px-8 py-3.5 bg-slate-900 dark:bg-emerald-500 hover:bg-black dark:hover:bg-emerald-400 text-white dark:text-slate-950 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 shadow-2xl shadow-slate-900/10 dark:shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} className="group-hover/btn:animate-bounce" />}
              {loading ? 'Menganalisis...' : 'Mulai Audit Batch'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Stats & Upload */}
        <div className="xl:col-span-4 space-y-6">
          {/* Tolerance Card */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Quality Tolerance</h3>
            <div className="space-y-4">
              <select 
                  value={tolerance} 
                  onChange={(e) => setTolerance(e.target.value as any)}
                  className="w-full text-[11px] bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 outline-none text-slate-800 dark:text-slate-200 font-bold uppercase transition-all focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
              >
                  <option value="STRICT">STRICT (Hardcore mode)</option>
                  <option value="MEDIUM">MEDIUM (Standard Adobe)</option>
                  <option value="LOOSE">LOOSE (AI Playground)</option>
              </select>
              
              <div className="grid grid-cols-2 gap-3">
                <a href="https://helpx.adobe.com/stock/contributor/help/known-image-restrictions.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-3 rounded-lg bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:border-emerald-500/30 hover:text-emerald-500 transition-all uppercase tracking-tighter">
                  Restrictions
                </a>
                <a href="https://helpx.adobe.com/stock/contributor/help/quality-and-technical-issues.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-3 rounded-lg bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:border-emerald-500/30 hover:text-emerald-500 transition-all uppercase tracking-tighter">
                  Tech Guide
                </a>
              </div>
            </div>
          </div>

          {/* Upload Hub */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-2 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Upload Hub</h3>
            </div>
            
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group m-4 h-48 cursor-pointer border-2 border-dashed rounded-2xl flex flex-col items-center justify-center space-y-4 transition-all duration-500 ${isDragging ? 'border-emerald-500 bg-emerald-500/5 scale-[0.98]' : 'border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 hover:border-emerald-500/50'}`}
            >
              <div className={`p-4 rounded-2xl bg-white dark:bg-white/5 shadow-xl transition-transform duration-500 group-hover:scale-110 ${isDragging ? 'rotate-12' : ''}`}>
                <Upload className="text-emerald-500" size={32} />
              </div>
              <div className="text-center px-4">
                <span className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight">
                  {isDragging ? 'Lepaskan Gambar 🔥' : 'Drop Images Here'}
                </span>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center justify-center gap-2">
                  <FileImage size={12} /> Multiple Upload Supported
                </span>
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} multiple className="hidden" />
            </label>

            <AnimatePresence>
              {files.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-4 pb-4 space-y-3"
                >
                  <div className="flex justify-between items-center bg-slate-100 dark:bg-black/40 px-3 py-2 rounded-xl">
                    <p className="font-black text-[9px] uppercase text-slate-500 tracking-widest">Queue: {files.length} Assets</p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                    {files.map((file, idx) => (
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={`${file.name}-${idx}`} 
                        className="flex items-center gap-3 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 p-2 rounded-xl hover:shadow-lg transition-all group"
                      >
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                          {previews[file.name] && (
                            <img src={previews[file.name]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase">Pending Audit</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Visual Audit Reports */}
        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-qc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center justify-center text-center py-20 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 flex items-center justify-center">
                       <Loader2 size={48} className="text-emerald-500 animate-[spin_1.5s_linear_infinite]" />
                       <Sparkles size={24} className="text-emerald-400 absolute animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                      Deep Pixel Analysis
                    </h3>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                      AI Expert for Adobe Stock standards is on duty
                    </p>
                  </div>
                </div>
                <LoadingSkeleton />
              </motion.div>
            ) : Object.keys(reports).length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[600px] flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl"
              >
                <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 mb-6">
                  <FileImage size={48} className="text-slate-200 dark:text-slate-800" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center max-w-[250px]">
                  Silahkan upload gambar dulu untuk memulai proses audit kurasi
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="results-qc"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {Object.entries(reports).map(([fileName, report], rIdx) => {
                  const r = report as QualityReport;
                  const isPassed = r.status === "PASS";

                  return (
                    <motion.div 
                      key={`${fileName}-${rIdx}`}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: rIdx * 0.1 }}
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2rem] p-5 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500 flex flex-col"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-5 px-1">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {isPassed ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{fileName}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isPassed ? 'Assets Approved' : 'Rejected Needs Fix'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <p className="text-[18px] font-black text-slate-900 dark:text-emerald-400 leading-none">{r.final_score}</p>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">QC SCORE</p>
                        </div>
                      </div>

                      {/* Image Stage */}
                      {previews[fileName] && (
                        <div className="image-check-viewer relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-inner group-hover:scale-[1.02] transition-transform duration-700">
                          <img 
                            src={previews[fileName]} 
                            alt={fileName} 
                            className={`w-full h-full object-cover transition-all duration-500 ${showHeatmaps.has(fileName) ? 'brightness-[0.4] grayscale-[0.5]' : ''}`}
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Heatmap Overlay */}
                          <AnimatePresence>
                            {showHeatmaps.has(fileName) && r.heatmaps && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-10 pointer-events-none"
                              >
                                {r.heatmaps.map((h, i) => {
                                  const colors = {
                                    noise: 'bg-rose-500',
                                    focus: 'bg-amber-500',
                                    lighting: 'bg-blue-500'
                                  };
                                  const labels = {
                                    noise: 'Grain/Noise',
                                    focus: 'Soft Focus',
                                    lighting: 'Lighting Issue'
                                  };
                                  return (
                                    <motion.div
                                      key={`heatmap-${i}`}
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 0.6 }}
                                      transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                                      className="absolute group/point"
                                      style={{ left: `${h.x}%`, top: `${h.y}%` }}
                                    >
                                      {/* Radial Glow */}
                                      <div className={`w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl opacity-80 animate-pulse ${colors[h.type]}`} />
                                      {/* Center Point */}
                                      <div className={`w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg cursor-help flex items-center justify-center transition-transform hover:scale-125 pointer-events-auto ${colors[h.type]}`}>
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 border border-white/20 shadow-2xl px-3 py-2 rounded-xl text-[10px] font-black text-white uppercase tracking-tighter opacity-0 group-hover/point:opacity-100 transition-all scale-90 group-hover/point:scale-100 flex flex-col items-center gap-1">
                                          <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 w-full justify-center">
                                            <span className={`w-1.5 h-1.5 rounded-full ${colors[h.type]}`} />
                                            {labels[h.type]}
                                          </div>
                                          <div className="text-emerald-400 text-xs font-mono font-bold">
                                            {h.raw_value}
                                          </div>
                                          <div className="text-[7px] text-white/40">
                                            INTENSITY: {Math.round(h.intensity * 100)}%
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                                
                                {/* Legend */}
                                <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4">
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                    <span className="text-[7px] font-black text-white uppercase tracking-widest">Noise</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-[7px] font-black text-white uppercase tracking-widest">Focus</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-[7px] font-black text-white uppercase tracking-widest">Lighting</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Control Bar Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                             <button 
                               onClick={() => toggleHeatmap(fileName)}
                               className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${showHeatmaps.has(fileName) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10'}`}
                             >
                               {showHeatmaps.has(fileName) ? <EyeOff size={14} /> : <Eye size={14} />}
                               {showHeatmaps.has(fileName) ? 'Hide Heatmap' : 'Analyze Pixel Heatmap'}
                             </button>
                             
                             <div className="flex items-center gap-2">
                               <div className="flex flex-col items-end">
                                 <p className="text-[7px] font-black text-white/50 uppercase tracking-widest">Pixel Engine</p>
                                 <p className="text-[9px] font-black text-emerald-400 leading-none">v4.2 PRO</p>
                               </div>
                               <Zap size={14} className="text-emerald-500" />
                             </div>
                          </div>

                          <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full backdrop-blur-md border text-[9px] font-black uppercase tracking-widest shadow-xl transition-opacity duration-300 ${showHeatmaps.has(fileName) ? 'opacity-0' : 'opacity-100'} ${isPassed ? 'bg-emerald-500/80 border-emerald-400 text-white' : 'bg-rose-500/80 border-rose-400 text-white'}`}>
                            {isPassed ? 'Approved' : 'Rejected'}
                          </div>
                        </div>
                      )}

                      {/* Detail Section */}
                      <div className="mt-6 flex-1 space-y-6">
                        {/* Score Bento */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-4 rounded-2xl group/score">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Technical</p>
                              <Sparkles size={10} className="text-emerald-500 opacity-0 group-hover/score:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-slate-900 dark:text-slate-100">{r.breakdown.technical_quality}</span>
                              <span className="text-[10px] font-bold text-slate-400">/50</span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(r.breakdown.technical_quality / 50) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-emerald-500" 
                              />
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-4 rounded-2xl group/score">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Legal & IP</p>
                              <Zap size={10} className="text-emerald-500 opacity-0 group-hover/score:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-slate-900 dark:text-slate-100">{r.breakdown.legal_ip_safety}</span>
                              <span className="text-[10px] font-bold text-slate-400">/50</span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(r.breakdown.legal_ip_safety / 50) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-emerald-500" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Audit Details Dropdown UI */}
                        {r.adobe_analysis && (
                          <div className="space-y-4">
                            <button 
                              onClick={() => toggleReportExpand(fileName)}
                              className="flex items-center justify-between w-full group/audit"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <p className="text-[10px] font-black uppercase text-slate-400 group-hover/audit:text-emerald-500 transition-colors tracking-[0.1em]">Adobe Audit Data 🚀</p>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10 group-hover/audit:bg-emerald-500 group-hover/audit:text-white transition-all">
                                {expandedReports.has(fileName) ? 'Close' : 'Inspect Details'}
                                {expandedReports.has(fileName) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </div>
                            </button>

                            <AnimatePresence>
                              {expandedReports.has(fileName) && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 gap-3 pt-2">
                                    <div className="bg-slate-100/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-4 rounded-2xl flex items-start gap-4 hover:shadow-xl transition-all">
                                      <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-500 shrink-0">
                                        <Sparkles size={16} />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Kualitas Teknis (100% Zoom Check)</p>
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-normal">{r.adobe_analysis.technical_summary}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-slate-100/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-4 rounded-2xl flex items-start gap-4 hover:shadow-xl transition-all">
                                      <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500 shrink-0">
                                        <Zap size={16} />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Trade Dress & Safety Audit</p>
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-normal">{r.adobe_analysis.ip_brand_summary}</p>
                                      </div>
                                    </div>

                                    <div className="bg-slate-100/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-4 rounded-2xl flex items-start gap-4 hover:shadow-xl transition-all">
                                      <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-500 shrink-0">
                                        <AlertCircle size={16} />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">IP & Property Inspection</p>
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-normal">{r.adobe_analysis.landmark_summary}</p>
                                      </div>
                                    </div>

                                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl mt-2 relative overflow-hidden group/saran">
                                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/saran:scale-110 transition-transform">
                                        <Sparkles size={40} className="text-emerald-500" />
                                      </div>
                                      <div className="relative">
                                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                          <CheckCircle size={12} /> Expert Advisor Tips
                                        </p>
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 leading-relaxed italic">
                                          "{r.adobe_analysis.short_advice}"
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Error Highlights if failed */}
                        {!isPassed && r.rejection_reasons.length > 0 && (
                          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 p-5 rounded-2xl">
                             <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                               Compliance Issues 
                               <AlertCircle size={14} />
                             </p>
                             <div className="space-y-3">
                               {r.rejection_reasons.map((reason, i) => (
                                 <div key={i} className="flex items-start gap-3">
                                   <div className="mt-1.5 w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                                   <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 leading-tight">{reason}</p>
                                 </div>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
