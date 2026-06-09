import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Sparkles, Loader2, FileImage, ChevronDown, ChevronUp, Trash2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QualityReport {
  status: "PASS" | "FAIL";
  final_score: number;
  breakdown: {
    composition_value: number;
    technical_quality: number;
    lighting_color: number;
    legal_safety: number;
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
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-1 border-b border-slate-200 dark:border-white/5 pb-4 relative overflow-hidden">
        {/* Progress Bar Glow */}
        {loading && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-300 ease-out z-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        )}
        
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <Sparkles className="text-emerald-500" size={24} />
            Adobe Stock Curator AI
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">
            Kurasi teknis & komersial otomatis untuk aset Adobe Stock
          </p>
        </div>
        
        <div className="mt-3 md:mt-0 flex items-center gap-3">
          {(files.length > 0 || Object.keys(reports).length > 0) && (
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-full text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all cursor-pointer border border-rose-500/10"
            >
              <Trash2 size={13} />
              Clear All
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={files.length === 0 || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            {loading ? 'Menganalisis...' : 'Analisis Kualitas (Batch)'}
          </button>
        </div>
      </div>

      {/* Tolerance Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
             <Zap size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Tingkat Toleransi QC</h3>
            <p className="text-[10px] text-slate-500 font-medium">Sesuaikan ketatnya kurasi untuk aset Anda</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
              value={tolerance} 
              onChange={(e) => setTolerance(e.target.value as any)}
              className="flex-1 sm:flex-none text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-slate-200 font-bold uppercase transition-all focus:ring-2 focus:ring-emerald-500/20"
          >
              <option value="STRICT">STRICT (Ketati Tanpa Ampun)</option>
              <option value="MEDIUM">MEDIUM (Standard Industri)</option>
              <option value="LOOSE">LOOSE (Longgar/AI Fokus)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-6 shadow-sm">
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative cursor-pointer border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 transition-all duration-300 ${isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20'}`}
            >
              <Upload className={`${isDragging ? 'text-emerald-500' : 'text-emerald-500'}`} size={32} />
              <div className="text-center">
                <span className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  {isDragging ? 'Lepaskan Gambar' : 'Unggah / Seret Gambar'}
                </span>
                <span className="block text-[10px] text-slate-400 font-medium tracking-tight">Mendukung banyak file</span>
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} multiple className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 space-y-2 border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-white/5 pb-1.5">
                  <h4 className="font-black text-[10px] uppercase text-slate-500">File Dalam Antrian ({files.length})</h4>
                  <button
                    onClick={handleClearAll}
                    disabled={loading}
                    className="text-[10px] text-rose-500 hover:text-rose-650 font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={10} />
                    Clear All
                  </button>
                </div>
                <div className="max-h-[250px] overflow-y-auto space-y-2 custom-scrollbar">
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center gap-2.5 text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-1.5 rounded-xl">
                      {previews[file.name] ? (
                        <img 
                          src={previews[file.name]} 
                          alt={file.name} 
                          className="w-10 h-10 object-cover rounded-lg bg-slate-100 dark:bg-slate-950 shrink-0 border border-slate-200 dark:border-white/5"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileImage size={10} className="text-slate-400 shrink-0"/>
                      )}
                      <span className="truncate font-medium flex-1">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading-qc"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                      <Loader2 size={40} className="text-emerald-500 animate-spin relative" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-700 dark:text-emerald-400 uppercase tracking-tighter">
                        {progress < 40 ? "Pixel Analysis..." : progress < 80 ? "Auditing IP & Logos..." : "Finalizing QC Report..."}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Performing deep technical audit for Adobe Stock standards
                      </p>
                    </div>
                  </div>
                  <LoadingSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key="results-qc"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{error}</div>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(reports).map(([fileName, report], rIdx) => {
                      const r = report as QualityReport;
                      const isPassed = r.status === "PASS";

                      return (
                        <div key={`${fileName}-${rIdx}`} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5 mb-5">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <FileImage size={16} className="text-slate-400" />
                                </div>
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                                  {fileName}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                               <div className="flex flex-col items-end">
                                   <span className="text-[10px] font-black text-slate-400 uppercase">QC Score</span>
                                   <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{r.final_score}/100</span>
                               </div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPassed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {r.status}
                              </span>
                            </div>
                          </div>

                          {previews[fileName] && (
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-100 dark:border-white/5 shadow-inner">
                              <img 
                                src={previews[fileName]} 
                                alt={fileName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">QC BREAKDOWN (SCORE: {r.final_score})</p>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-2 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Composition</p>
                                    <p className="font-black text-slate-800 dark:text-slate-200">{r.breakdown.composition_value}/25</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-2 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Technical</p>
                                    <p className="font-black text-slate-800 dark:text-slate-200">{r.breakdown.technical_quality}/25</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-2 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Lighting/Color</p>
                                    <p className="font-black text-slate-800 dark:text-slate-200">{r.breakdown.lighting_color}/25</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-2 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Legal/IP</p>
                                    <p className="font-black text-slate-800 dark:text-slate-200">{r.breakdown.legal_safety}/25</p>
                                </div>
                            </div>
                          </div>
                          
                          {!isPassed && r.rejection_reasons.length > 0 && (
                            <div className="p-3 bg-rose-50/70 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-lg">
                              <p className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 mb-1">Rejection Reasons</p>
                              <ul className="text-[10px] font-medium text-rose-800 dark:text-rose-300 list-disc list-inside">
                                {r.rejection_reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                              </ul>
                            </div>
                          )}

                           {r.actionable_feedback.length > 0 && (
                            <div className="p-3 bg-emerald-50/70 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-lg">
                              <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">Actionable Feedback</p>
                              <ul className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 list-disc list-inside">
                                {r.actionable_feedback.map((f, i) => <li key={i}>{f}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
