import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Sparkles, Loader2, FileImage, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface QualityReport {
  technical_audit?: {
    artifacts_and_noise: "PASSED" | "FAILED";
    intellectual_property_and_logos: "PASSED" | "FAILED";
    broken_text_and_oil_paint: "PASSED" | "FAILED";
    bad_framing_and_clipping: "PASSED" | "FAILED";
    similar_content_and_spam: "PASSED" | "FAILED";
  };
  final_judgment?: {
    status: "APPROVED" | "REJECTED";
    official_reason: string | null;
    fixed_confidence: "HIGH" | "LOW";
  };
}

export const ImageQualityCheck: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Record<string, QualityReport>>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  const toggleReportExpand = (fileName: string) => {
    setExpandedReports(prev => ({ ...prev, [fileName]: !prev[fileName] }));
  };

  const handleClearAll = () => {
    Object.keys(previews).forEach(key => URL.revokeObjectURL(previews[key]));
    setFiles([]);
    setPreviews({});
    setReports({});
    setExpandedReports({});
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
    setError(null);
    const newReports: Record<string, QualityReport> = {};

    for (const file of files) {
      try {
        const base64Image = await resizeAndProcess(file);

        const response = await fetch('/api/check-image-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        if (!response.ok) throw new Error(`Failed to analyze ${file.name}`);
        const data = await response.json();
        newReports[file.name] = data;
        setReports({ ...newReports });
      } catch (err: any) {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-1 border-b border-slate-200 dark:border-white/5 pb-4">
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
                  {files.map((file) => (
                    <div key={file.name} className="flex items-center gap-2.5 text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-1.5 rounded-xl">
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
            {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(reports).map(([fileName, report]) => {
                const r = report as QualityReport;
                const audit = r.technical_audit;
                const judgment = r.final_judgment;
                const status = (judgment?.status || "REJECTED").toUpperCase();
                const isApproved = status === "APPROVED";
                const displayStatus = isApproved ? "APPROVED" : "REJECTED";
                const rReason = judgment?.official_reason;
                const confidence = judgment?.fixed_confidence;

                const hasArtifacts = audit?.artifacts_and_noise === "FAILED";
                const hasIpViolations = audit?.intellectual_property_and_logos === "FAILED";
                const hasBrokenText = audit?.broken_text_and_oil_paint === "FAILED";
                const hasBadFraming = audit?.bad_framing_and_clipping === "FAILED";
                const hasSpam = audit?.similar_content_and_spam === "FAILED";

                return (
                  <div key={fileName} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 space-y-4 border border-slate-100 dark:border-white/10">
                    <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                      <p className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate flex items-center gap-2">
                        <FileImage size={14} className="text-slate-400" />
                        {fileName}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {confidence && (
                          <span className="text-[9px] bg-slate-200/50 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-350 font-bold">
                            Match: {confidence}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {displayStatus}
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

                    {/* Knockout Validation Status Indicators */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">TECHNICAL AUDIT</p>
                      <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasArtifacts 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Artifacts & Noise</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasArtifacts ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasArtifacts ? 'FAILED' : 'PASSED'}
                          </span>
                        </div>
                        
                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasIpViolations 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Intellectual Property & Logos</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasIpViolations ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasIpViolations ? 'FAILED' : 'PASSED'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasBrokenText 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Broken Text & Oil Paint</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasBrokenText ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasBrokenText ? 'FAILED' : 'PASSED'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasBadFraming 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Bad Framing & Clipping</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasBadFraming ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasBadFraming ? 'FAILED' : 'PASSED'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasSpam 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Similar Content & Spam</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasSpam ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasSpam ? 'FAILED' : 'PASSED'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {displayStatus === 'REJECTED' && rReason && (
                      <div className="p-2.5 bg-red-50/50 dark:bg-red-500/5 rounded-lg border border-red-100/50 dark:border-red-500/10">
                        <p className="text-[9px] font-black uppercase text-red-600 dark:text-red-400 mb-1">Rejection Reason</p>
                        <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">{rReason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
