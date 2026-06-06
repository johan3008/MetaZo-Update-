import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Sparkles, Loader2, FileImage, ChevronDown, ChevronUp } from 'lucide-react';

interface QualityReport {
  check_list?: {
    has_artifacts_or_ai_errors: boolean;
    has_ip_or_logo_violations: boolean;
    has_broken_text_or_oil_paint_effect: boolean;
  };
  decision?: {
    status: "APPROVED" | "REJECTED";
    rejection_reason: string | null;
    confidence_score: string;
  };
  // Fallbacks for older report versions or simple compatibility
  status?: "Approved" | "Rejected";
  rejection_reason?: string | null;
  artifact_detected?: boolean;
  ip_violation_detected?: boolean;

  technical_score: number;
  commercial_score: number;
  analysis: {
    technical: string;
    intellectual_property: string;
    commercial_value: string;
  };
  improvement_suggestions: string;
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
        
        <button
          onClick={handleAnalyze}
          disabled={files.length === 0 || loading}
          className="mt-3 md:mt-0 flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
          {loading ? 'Menganalisis...' : 'Analisis Kualitas (Batch)'}
        </button>
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
                <h4 className="font-black text-[10px] uppercase text-slate-500">File Dalam Antrian ({files.length})</h4>
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
                const status = (r.decision?.status || r.status || "REJECTED").toUpperCase();
                const isApproved = status === "APPROVED" || status === "APPROVED" || status === "APPROVED";
                const displayStatus = isApproved ? "APPROVED" : "REJECTED";
                const rReason = r.decision?.rejection_reason || r.rejection_reason;
                const confidence = r.decision?.confidence_score;

                const hasArtifacts = r.check_list ? r.check_list.has_artifacts_or_ai_errors : !!r.artifact_detected;
                const hasIpViolations = r.check_list ? r.check_list.has_ip_or_logo_violations : !!r.ip_violation_detected;
                const hasBrokenText = r.check_list ? r.check_list.has_broken_text_or_oil_paint_effect : false;

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
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">KNOCKOUT INTEGRITY CHECKLIST</p>
                      <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasArtifacts 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Tahap 1: Artifact & AI Error</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasArtifacts ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasArtifacts ? 'TERDETEKSI (K.O.)' : 'PASSED'}
                          </span>
                        </div>
                        
                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasIpViolations 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Tahap 2: Intellectual Property (IP)</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasIpViolations ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasIpViolations ? 'TERDETEKSI (K.O.)' : 'PASSED'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                          hasBrokenText 
                            ? 'bg-red-50/60 dark:bg-red-500/5 border-red-100 dark:border-red-500/10' 
                            : 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                        }`}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Tahap 3: Text & Upscale Integrity</span>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${hasBrokenText ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {hasBrokenText ? 'TERDETEKSI (K.O.)' : 'PASSED'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-white dark:bg-slate-900 rounded-lg p-2 shadow-sm border border-slate-100 dark:border-transparent">
                        <p className="text-slate-400 uppercase">Technical</p>
                        <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{isApproved ? `${r.technical_score}/10` : "0/10"}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-lg p-2 shadow-sm border border-slate-100 dark:border-transparent">
                        <p className="text-slate-400 uppercase">Commercial</p>
                        <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{isApproved ? `${r.commercial_score}/10` : "0/10"}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => toggleReportExpand(fileName)}
                        className="w-full flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/10 dark:hover:bg-slate-950 font-bold rounded-lg border border-slate-200/60 dark:border-white/5 transition-all cursor-pointer text-[10px]"
                      >
                        <span className="uppercase tracking-wider">
                          {expandedReports[fileName] ? "Sembunyikan Detail" : "Lihat Detail Analisis"}
                        </span>
                        {expandedReports[fileName] ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </button>

                      {expandedReports[fileName] && (
                        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/5">
                          {displayStatus === 'REJECTED' && rReason && (
                            <div className="p-2.5 bg-red-50/50 dark:bg-red-500/5 rounded-lg border border-red-100/50 dark:border-red-500/10">
                              <p className="text-[9px] font-black uppercase text-red-600 dark:text-red-400 mb-1">Rejection Reason</p>
                              <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">{rReason}</p>
                            </div>
                          )}

                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-white/5">
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Technical Analysis</p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                              "{r.analysis?.technical || 'Tidak ada data teknis.'}"
                            </p>
                          </div>
                          
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-white/5">
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Commercial Value</p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                              {r.analysis?.commercial_value || 'Tidak ada data komersial.'}
                            </p>
                          </div>

                          {r.improvement_suggestions && (
                            <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-lg border border-emerald-100/50 dark:border-emerald-500/10">
                              <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                <Sparkles size={10} strokeWidth={2.5} /> Suggestions
                              </p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                {r.improvement_suggestions}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
