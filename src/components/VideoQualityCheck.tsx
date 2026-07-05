import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, FileVideo, Zap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDailyLimit } from '../../constants';

interface QualityReport {
  visual_scan_analysis?: string;
  recommendation: "PASS" | "FAIL" | "RETOUCH";
  overall_score: number;
  technical_score?: number;
  visual_score?: number;
  adobe_stock_readiness?: "Ready" | "Needs Improvement" | "Reject Risk";
  legal_status: string;
  technical_issues: string[];
  strengths: string[];
  detailed_feedback: string;
  quality_checks?: {
    [key: string]: { status: "PASS" | "FAIL"; note: string } | undefined;
  };
}

const CHECK_ITEMS = [
  { key: 'blur', label: 'Blur', desc: 'Memeriksa kejelasan fokus subjek utama.' },
  { key: 'noise', label: 'Noise', desc: 'Mendeteksi bintik digital berlebih.' },
  { key: 'compression_artifacts', label: 'Compression artifact', desc: 'Mendeteksi distorsi blok/kotak makro akibat kompresi video tinggi.' },
  { key: 'blocking', label: 'Blocking', desc: 'Mendeteksi distorsi blok atau kotak.' },
  { key: 'banding', label: 'Banding', desc: 'Memeriksa efek pita warna pada gradasi latar belakang.' },
  { key: 'overexposure', label: 'Overexposed', desc: 'Mendeteksi area yang terlalu terang hingga kehilangan detail.' },
  { key: 'underexposure', label: 'Underexposed', desc: 'Mendeteksi area yang terlalu gelap hingga detail hilang.' },
  { key: 'white_balance', label: 'White balance', desc: 'Mendeteksi masalah keseimbangan warna.' },
  { key: 'motion_blur', label: 'Motion blur', desc: 'Mendeteksi kekaburan akibat pergerakan subjek.' },
  { key: 'camera_shake', label: 'Camera shake', desc: 'Memeriksa adanya guncangan kamera yang ekstrem.' },
  { key: 'out_of_focus', label: 'Out of focus', desc: 'Mendeteksi fokus yang tidak tajam pada subjek.' },
  { key: 'flickering', label: 'Flickering', desc: 'Mendeteksi kedipan atau perubahan kecerahan yang berulang cepat.' },
  { key: 'duplicate_frame', label: 'Duplicate frame', desc: 'Mendeteksi frame statis berulang.' },
  { key: 'empty_frame', label: 'Empty frame', desc: 'Mendeteksi frame yang sepenuhnya kosong.' },
  { key: 'black_frame', label: 'Black frame', desc: 'Mendeteksi frame yang sepenuhnya hitam.' },
  { key: 'frozen_frame', label: 'Frozen frame', desc: 'Mendeteksi frame yang membeku.' },
  { key: 'watermark', label: 'Watermark', desc: 'Mendeteksi tanda air, hak cipta.' },
  { key: 'logo', label: 'Logo', desc: 'Mendeteksi logo merek atau hak cipta.' },
  { key: 'text', label: 'Text', desc: 'Mendeteksi teks atau tulisan yang mengganggu.' },
  { key: 'ai_artifact', label: 'AI artifact', desc: 'Mendeteksi cacat turunan atau distorsi generatif AI.' },
  { key: 'deformed_object', label: 'Deformed object', desc: 'Mendeteksi bentuk objek yang tidak wajar atau cacat.' },
  { key: 'bad_anatomy', label: 'Bad anatomy', desc: 'Mendeteksi struktur anatomi subjek yang tidak proporsional.' },
  { key: 'cropped_subject', label: 'Cropped subject', desc: 'Mendeteksi bagian tubuh subjek yang terpotong tidak proporsional.' },
  { key: 'cut_off_object', label: 'Cut-off object', desc: 'Mendeteksi objek utama yang terpotong bingkai.' },
  { key: 'wrong_perspective', label: 'Wrong perspective', desc: 'Mendeteksi perspektif yang tidak sejajar.' },
  { key: 'low_aesthetic_quality', label: 'Low aesthetic quality', desc: 'Mendeteksi kualitas estetika rendah secara umum.' }
];

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
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/r2-status')
      .then(res => res.json())
      .then(data => setR2Configured(!!data.configured))
      .catch(() => setR2Configured(false));
  }, []);

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
            try {
              const putRes = await fetch(getUrlData.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type || 'video/mp4' }
              });
              if (!putRes.ok) throw new Error(`Failed to upload to S3/R2 storage: ${putRes.status}`);
              uploadedUrl = getUrlData.fileUrl;
            } catch (putErr: any) {
              if (putErr.message === 'Failed to fetch') {
                throw new Error(
                  t.language === 'Bahasa'
                    ? 'Gagal upload ke Cloudflare R2 (CORS Error). Pastikan Anda telah menambahkan konfigurasi CORS di dashboard Cloudflare R2 bucket Anda.'
                    : 'Failed to upload to Cloudflare R2 (CORS Error). Please make sure you have added CORS configuration to your Cloudflare R2 bucket settings.'
                );
              }
              throw putErr;
            }
          }
        }
      } catch (uploadErr: any) {
        console.warn("[Video Audit] Failed to upload to Cloudflare R2:", uploadErr);
        if (uploadErr.message.includes('CORS') || uploadErr.message.includes('Cloudflare R2')) {
          throw uploadErr;
        }
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
          {t.language === 'Bahasa' 
            ? 'Audit otomatis 26 checkpoint kualitas video (blur, noise, overexposure, watermark, AI artifacts, dan masalah legal/teknis lainnya) untuk kelayakan agensi mikrostok global seperti Adobe Stock.'
            : 'Automated 26 checkpoints video quality audit (blur, noise, overexposure, watermark, AI artifacts, and other legal/technical issues) for global microstock agency approval standards.'}
        </p>

        {/* Workflow Info Box */}
        <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/50 text-left max-w-xl mx-auto mt-6 shadow-sm">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 justify-center text-lg">
            <Zap size={18} className="text-indigo-500" /> 
            Workflow Analisis Kualitas Video
          </h4>
          
          <div className="flex flex-col items-center space-y-2">
            {/* Step 1 */}
            <div className="bg-white dark:bg-slate-800 w-full sm:w-80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
              <span className="font-bold text-slate-800 dark:text-white text-sm">Video Upload</span>
            </div>
            
            <div className="text-slate-300 dark:text-slate-600">│</div>
            <div className="text-slate-300 dark:text-slate-600">▼</div>
            
            {/* Step 2 */}
            <div className="bg-white dark:bg-slate-800 w-full sm:w-80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center font-bold text-xs border border-violet-200 dark:border-violet-800">1</div>
              <h5 className="font-bold text-slate-800 dark:text-white mb-2 text-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2">FFprobe</h5>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pl-4 list-disc marker:text-violet-400 text-left">
                <li>Resolution</li>
                <li>FPS</li>
                <li>Codec</li>
                <li>Bitrate</li>
                <li>Pixel format</li>
                <li>Duration</li>
                <li>Audio</li>
              </ul>
            </div>
            
            <div className="text-slate-300 dark:text-slate-600">│</div>
            <div className="text-slate-300 dark:text-slate-600">▼</div>
            
            {/* Step 3 */}
            <div className="bg-white dark:bg-slate-800 w-full sm:w-80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-200 dark:border-emerald-800">2</div>
              <h5 className="font-bold text-slate-800 dark:text-white mb-2 text-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2">FFmpeg</h5>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pl-4 list-disc marker:text-emerald-400 text-left">
                <li>Extract frame setiap 1 detik</li>
                <li>Ambil frame awal, tengah, akhir</li>
                <li>Detect black frame</li>
                <li>Detect duplicate frame</li>
                <li>Detect freeze frame</li>
                <li>Detect scene change</li>
              </ul>
            </div>
            
            <div className="text-slate-300 dark:text-slate-600">│</div>
            <div className="text-slate-300 dark:text-slate-600">▼</div>

            {/* Step 4 */}
            <div className="bg-white dark:bg-slate-800 w-full sm:w-80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-200 dark:border-amber-800">3</div>
              <h5 className="font-bold text-slate-800 dark:text-white mb-2 text-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2">AI Vision</h5>
              <div className="grid grid-cols-2 gap-x-2 text-xs text-slate-500 dark:text-slate-400 pl-4 text-left">
                <ul className="space-y-1 list-disc marker:text-amber-400">
                  <li>Blur</li>
                  <li>Focus</li>
                  <li>Noise</li>
                  <li>Compression artifact</li>
                  <li>Banding</li>
                  <li>Blocking</li>
                  <li>Flicker</li>
                  <li>Exposure</li>
                </ul>
                <ul className="space-y-1 list-disc marker:text-amber-400">
                  <li>White balance</li>
                  <li>Watermark</li>
                  <li>Text</li>
                  <li>AI artifact</li>
                  <li>Bad anatomy</li>
                  <li>Camera shake</li>
                  <li>IP</li>
                </ul>
              </div>
            </div>

            <div className="text-slate-300 dark:text-slate-600">│</div>
            <div className="text-slate-300 dark:text-slate-600">▼</div>

            {/* Step 5 */}
            <div className="bg-white dark:bg-slate-800 w-full sm:w-80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm relative">
              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800">4</div>
              <span className="font-bold text-slate-800 dark:text-white text-sm">Quality Engine</span>
            </div>

            <div className="text-slate-300 dark:text-slate-600">│</div>
            <div className="text-slate-300 dark:text-slate-600">▼</div>

            {/* Step 6 */}
            <div className="bg-indigo-600 dark:bg-indigo-500 w-full sm:w-80 p-3 rounded-xl border border-indigo-700 dark:border-indigo-400 text-center shadow-md">
              <span className="font-black text-white text-sm tracking-wide">Adobe Stock Risk Score</span>
            </div>

          </div>
        </div>
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
      {r2Configured === false && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 dark:bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3"
        >
          <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-black tracking-wider uppercase text-amber-700 dark:text-amber-400">
              {t.language === 'Bahasa' ? 'SARAN KONFIGURASI CLOUDFLARE R2' : 'CLOUDFLARE R2 RECOMMENDED'}
            </h4>
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.language === 'Bahasa' 
                ? 'Vercel membatasi ukuran request maksimum 4.5MB. Untuk menganalisis file video beresolusi tinggi atau file besar tanpa batasan ukuran payload, silakan konfigurasikan Cloudflare R2 di Settings menu.'
                : 'Vercel limits request payloads to 4.5MB. To analyze high-resolution videos or large files with no file size limitations, please configure Cloudflare R2 in the Settings menu.'
              }
            </p>
          </div>
        </motion.div>
      )}

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
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Overall: {report.overall_score}/100</span>
                    {report.technical_score !== undefined && (
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Technical: {report.technical_score}/100</span>
                    )}
                    {report.visual_score !== undefined && (
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Visual: {report.visual_score}/100</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right hidden sm:flex sm:flex-col sm:items-end gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Legal Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        report.legal_status === 'SAFE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        report.legal_status === 'AT_RISK' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                        {report.legal_status}
                    </span>
                  </div>
                  {report.adobe_stock_readiness && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 mt-1">Adobe Stock Readiness</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          report.adobe_stock_readiness === 'Ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          report.adobe_stock_readiness === 'Needs Improvement' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                          {report.adobe_stock_readiness}
                      </span>
                    </div>
                  )}
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

              {/* Detailed Quality Audit Checklist */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                  Hasil Pemeriksaan Kualitas Video ({CHECK_ITEMS.length} Checkpoints)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CHECK_ITEMS.map((item) => {
                    const checkResult = report.quality_checks?.[item.key as keyof typeof report.quality_checks];
                    // Fallback to check if the key exists in technical_issues for resilience
                    const isFailedInIssues = report.technical_issues?.some(issue => 
                      issue.toLowerCase().includes(item.key.toLowerCase().replace('_', ' ')) ||
                      issue.toLowerCase().includes(item.label.toLowerCase())
                    );
                    
                    const isPass = checkResult 
                      ? checkResult.status === 'PASS' 
                      : !isFailedInIssues;
                      
                    const note = checkResult 
                      ? checkResult.note 
                      : (isFailedInIssues ? 'Terdeteksi adanya masalah pada indikator ini.' : 'Normal, tidak mendeteksi masalah.');

                    return (
                      <div 
                        key={item.key} 
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isPass 
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 hover:bg-emerald-50/30' 
                            : 'bg-red-50/20 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 hover:bg-red-50/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.label}</span>
                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isPass 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {isPass ? 'OK' : 'FAIL'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/40 p-2 rounded-lg mt-1 italic">
                          {note}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
