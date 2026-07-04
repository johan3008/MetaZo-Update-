import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, FileVideo, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDailyLimit } from '../../constants';

interface QualityReport {
  visual_scan_analysis?: string;
  recommendation: "PASS" | "FAIL" | "RETOUCH";
  overall_score: number;
  legal_status: string;
  technical_issues: string[];
  strengths: string[];
  detailed_feedback: string;
}

export const VideoQualityCheck: React.FC<{ 
  t: any; 
  aiOptions?: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
}> = ({ 
  t, 
  aiOptions,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tolerance, setTolerance] = useState<'STRICT' | 'MEDIUM' | 'LOOSE'>('MEDIUM');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setReport(null);
      setError(null);
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
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setReport(null);
      setError(null);
    }
  };

  const analyzeVideo = async () => {
    if (!file) return;

    if (!isLicensed && dailyGenCount >= getDailyLimit()) {
        if (setShowLimitModal) setShowLimitModal(true);
        return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      let response;
      let uploadedUrl = null;
      let getUrlData = null;

      // 1. Try to upload to Cloudflare R2 first to bypass Vercel limits
      try {
        const getUrlRes = await fetch(`/api/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'video/mp4')}`);
        if (getUrlRes.ok) {
          getUrlData = await getUrlRes.json().catch(() => ({}));
          if (getUrlData.uploadUrl && getUrlData.fileUrl) {
            console.log(`[Video Audit] Uploading to Cloudflare R2 directly: ${file.name}`);
            const putRes = await fetch(getUrlData.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type || 'video/mp4' }
            });
            if (!putRes.ok) throw new Error(`Failed to upload to S3/R2 storage: ${putRes.status}`);
            uploadedUrl = getUrlData.fileUrl;
          }
        }
      } catch (uploadErr) {
        console.warn("[Video Audit] Failed to upload to Cloudflare R2, falling back to server multipart:", uploadErr);
      }

      // 2. Call backend endpoint to audit the video
      if (uploadedUrl) {
        console.log(`[Video Audit] Triggering R2-based check-video-quality: ${uploadedUrl}`);
        response = await fetch('/api/check-video-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: uploadedUrl,
            pathKey: getUrlData?.pathKey,
            tolerance,
            language: aiOptions?.language || 'Bahasa',
            model: aiOptions?.visionModel || 'gemini-3.1-pro-preview'
          })
        });
      } else {
        console.log(`[Video Audit] Falling back to multipart form-data upload: ${file.name}`);
        const formData = new FormData();
        formData.append('video', file);
        formData.append('tolerance', tolerance);
        formData.append('language', aiOptions?.language || 'Bahasa');
        formData.append('model', aiOptions?.visionModel || 'gemini-3.1-pro-preview');

        response = await fetch('/api/check-video-quality', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to analyze video: ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data);

      if (incrementDailyCount) {
          incrementDailyCount(1);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while analyzing the video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl sm:text-4xl font-sans font-black text-slate-900 dark:text-white tracking-tight">
          Video Quality Check
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Upload a short video (MP4/MOV). The system will automatically extract start, middle, and end frames, then analyze them using AI Vision for technical flaws and Adobe Stock standards.
        </p>
      </div>

      <div className="flex justify-center items-center gap-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Toleransi:</label>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['STRICT', 'MEDIUM', 'LOOSE'] as const).map(tol => (
                <button
                    key={tol}
                    onClick={() => setTolerance(tol)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        tolerance === tol 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    {tol}
                </button>
            ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div 
        className={`relative group border-2 border-dashed rounded-3xl p-8 sm:p-12 transition-all duration-300 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 ${
          isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept="video/mp4,video/quicktime" 
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={loading}
        />
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
          {file ? <FileVideo className="w-8 h-8 text-indigo-500" /> : <Upload className="w-8 h-8 text-slate-400" />}
        </div>
        
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          {file ? file.name : "Drag & drop video here"}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "MP4, MOV up to 500MB"}
        </p>
      </div>

      {/* Action Button */}
      {file && (
        <div className="flex justify-center">
          <button
            onClick={analyzeVideo}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? 'Analyzing Video...' : 'Analyze Video Quality'}
          </button>
        </div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {report && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className={`p-6 sm:p-8 flex items-center justify-between border-b ${
              report.recommendation === 'PASS' 
                ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10' 
                : 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10'
            }`}>
              <div className="flex items-center gap-4">
                {report.recommendation === 'PASS' ? (
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-red-500" />
                )}
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {report.recommendation === 'PASS' ? 'Lolos (PASS)' : 'Ditolak (FAIL)'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Overall Score: {report.overall_score}/100</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Legal Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      report.legal_status === 'SAFE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      report.legal_status === 'AT_RISK' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                      {report.legal_status}
                  </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Visual Scan Analysis */}
              {report.visual_scan_analysis && (
                <div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3">Visual Scan Analysis</h4>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        {report.visual_scan_analysis}
                    </p>
                </div>
              )}

              {/* Detailed Feedback */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3">Detailed Feedback</h4>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  {report.detailed_feedback}
                </p>
              </div>

              {/* Technical Issues & Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Issues */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400 flex items-center gap-2">
                    Technical Issues ({report.technical_issues?.length || 0})
                  </h4>
                  {report.technical_issues?.length > 0 ? (
                    <ul className="space-y-2">
                      {report.technical_issues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
                          <span className="text-red-500 mt-0.5">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No technical issues detected.</p>
                  )}
                </div>

                {/* Strengths */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    Strengths ({report.strengths?.length || 0})
                  </h4>
                  {report.strengths?.length > 0 ? (
                    <ul className="space-y-2">
                      {report.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No particular strengths highlighted.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
