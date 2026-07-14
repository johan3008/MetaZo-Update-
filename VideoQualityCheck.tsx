import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, FileVideo, Zap, Info, History, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDailyLimit } from '@/constants.tsx';
import { getHeaders } from '@/services/geminiService.ts';

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
  metadata?: {
    title: string;
    keywords: string[];
  };
}

interface HistoryItem {
  id: string;
  timestamp: string;
  fileName: string;
  report: QualityReport;
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
  { key: 'low_aesthetic_quality', label: 'Low aesthetic quality', desc: 'Mendeteksi kualitas estetika rendah secara umum.' },
  { key: 'low_framerate', label: 'Low framerate', desc: 'Mendeteksi kecepatan bingkai video yang rendah.' },
  { key: 'visible_transitions', label: 'Visible transitions', desc: 'Mendeteksi transisi, efek, atau efek overlay yang terlihat jelas.' },
  { key: 'log_profile', label: 'Log profile / Flat Color', desc: 'Mendeteksi video dengan gamma logaritmik tanpa penyesuaian warna.' },
  { key: 'upscaled_video', label: 'Upscaled video', desc: 'Mendeteksi peningkatan resolusi paksa (misal dari HD ke 4K).' }
];

export const VideoQualityCheck: React.FC<{ 
  t: any; 
  aiOptions?: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
  user?: any;
  db?: any;
}> = ({ 
  t, 
  aiOptions,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal,
  setShowActivationModal,
  user,
  db
}) => {
  const [file, setFile] = useState<File | null>(null);
  const isIndo = t.language === 'Bahasa';
  const CHECK_ITEMS_LOCALIZED = CHECK_ITEMS.map(item => {
    let label = item.label;
    let desc = item.desc;
    if (!isIndo) {
      const enMap: Record<string, { label: string, desc: string }> = {
        blur: { label: 'Blur', desc: 'Checks the focus clarity of the main subject.' },
        noise: { label: 'Noise', desc: 'Detects excessive digital noise or grain.' },
        compression_artifacts: { label: 'Compression Artifacts', desc: 'Detects macro-blocking distortion from high video compression.' },
        blocking: { label: 'Blocking', desc: 'Detects blocky or pixelated distortion.' },
        banding: { label: 'Banding', desc: 'Checks for color banding/transitions on flat gradients.' },
        overexposure: { label: 'Overexposed', desc: 'Detects areas that are too bright, losing detail.' },
        underexposure: { label: 'Underexposed', desc: 'Detects areas that are too dark, losing detail.' },
        white_balance: { label: 'White Balance', desc: 'Detects color balance issues.' },
        motion_blur: { label: 'Motion Blur', desc: 'Detects blurring caused by subject movement.' },
        camera_shake: { label: 'Camera Shake', desc: 'Checks for extreme camera shake or instability.' },
        out_of_focus: { label: 'Out of Focus', desc: 'Detects soft or missed focus on the main subject.' },
        flickering: { label: 'Flickering', desc: 'Detects rapid changes in brightness or light flickering.' },
        duplicate_frame: { label: 'Duplicate Frames', desc: 'Detects repeated static frames.' },
        empty_frame: { label: 'Empty Frames', desc: 'Detects completely empty frames.' },
        black_frame: { label: 'Black Frames', desc: 'Detects completely black frames.' },
        frozen_frame: { label: 'Frozen Frames', desc: 'Detects frozen or stuck frames.' },
        watermark: { label: 'Watermark', desc: 'Detects watermarks or copyright overlays.' },
        logo: { label: 'Logo', desc: 'Detects brand logos or copyrighted trademarks.' },
        text: { label: 'Text', desc: 'Detects distracting overlay text or writings.' },
        ai_artifact: { label: 'AI Artifacts', desc: 'Detects generative AI inconsistencies or distortions.' },
        deformed_object: { label: 'Deformed Objects', desc: 'Detects unnatural or deformed geometries.' },
        bad_anatomy: { label: 'Bad Anatomy', desc: 'Detects disproportionate anatomical structures.' },
        cropped_subject: { label: 'Cropped Subject', desc: 'Detects awkwardly cropped subjects at frame borders.' },
        cut_off_object: { label: 'Cut-off Objects', desc: 'Detects main objects cut off by frame boundaries.' },
        wrong_perspective: { label: 'Wrong Perspective', desc: 'Detects misaligned or incorrect perspective.' },
        low_aesthetic_quality: { label: 'Low Aesthetic Quality', desc: 'Detects generally low aesthetic or commercial appeal.' }
      };
      if (enMap[item.key]) {
        label = enMap[item.key].label;
        desc = enMap[item.key].desc;
      }
    }
    return { ...item, label, desc };
  });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tolerance, setTolerance] = useState<'STRICT' | 'MEDIUM' | 'LOOSE'>('MEDIUM');
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (user && db) {
      import('../supabase').then(({ doc, getDoc }) => {
        getDoc(doc(db, 'users', user.uid)).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.videoQualityHistory && Array.isArray(data.videoQualityHistory)) {
              setHistory(data.videoQualityHistory);
            }
          }
        }).catch(err => console.warn("Failed to load video quality history:", err));
      });
    }
  }, [user, db]);

  const saveToHistory = (newReport: QualityReport, fileName: string) => {
    const newItem: HistoryItem = {
      id: `vq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      fileName,
      report: newReport
    };
    const updated = [newItem, ...history.slice(0, 29)];
    setHistory(updated);
    
    if (user && db) {
      import('../supabase').then(({ doc, updateDoc }) => {
        updateDoc(doc(db, 'users', user.uid), {
          videoQualityHistory: updated
        }).catch(err => console.warn('db_op', err));
      });
    }
  };

  const exportHistoryToJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `metazo_video_quality_history_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    if (user && db) {
       import('../supabase').then(({ doc, updateDoc }) => {
        updateDoc(doc(db, 'users', user.uid), {
          videoQualityHistory: []
        }).catch(err => console.warn('db_op', err));
      });
    }
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    if (user && db) {
      import('../supabase').then(({ doc, updateDoc }) => {
        updateDoc(doc(db, 'users', user.uid), {
          videoQualityHistory: updated
        }).catch(err => console.warn('db_op', err));
      });
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setReport(item.report);
    setFile(null); // Clear current file as we are viewing history
    document.getElementById('quality-report-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetch(`/api/r2-status?t=${Date.now()}`)
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

  const extractFramesFromVideo = (videoFile: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;
      video.playsInline = true;
      
      const frames: string[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        // Resize to 1280px width max to save payload bandwidth
        const scale = Math.min(1, 1280 / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const duration = video.duration;
        if (!duration || !isFinite(duration) || duration <= 0) {
            reject(new Error("Durasi video tidak valid atau tidak terbaca."));
            return;
        }

        const targetTimes = [
            0.1, // Awal
            duration / 2, // Tengah
            Math.max(0, duration - 0.5) // Akhir
        ];
        
        let currentTimeIndex = 0;
        
        video.onseeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Get JPEG base64
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            frames.push(dataUrl);
          }
          
          currentTimeIndex++;
          if (currentTimeIndex < targetTimes.length) {
            video.currentTime = targetTimes[currentTimeIndex];
          } else {
            URL.revokeObjectURL(video.src);
            resolve(frames);
          }
        };
        
        // Start extraction
        video.currentTime = targetTimes[currentTimeIndex];
      };
      
      video.onerror = () => {
        reject(new Error("Gagal memutar/memuat video untuk diekstrak. Format mungkin tidak didukung browser."));
      };
    });
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
      console.log(`[Video Audit] Mengekstrak frame video melalui Browser Frontend...`);
      
      // Lakukan ekstraksi frame secara lokal di Browser!
      // Vercel tidak lagi perlu menggunakan FFmpeg di Backend
      const framesBase64 = await extractFramesFromVideo(file);
      
      console.log(`[Video Audit] Berhasil mengekstrak ${framesBase64.length} frame. Mengirim ke API...`);

      const response = await fetch('/api/check-video-quality', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders(aiOptions)
        },
        body: JSON.stringify({
          frames: framesBase64,
          tolerance: tolerance,
          language: t.language || 'English',
          model: aiOptions?.model
        })
      });


      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to analyze video: ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data);
      saveToHistory(data, file.name);

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
        <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-500/15 dark:via-indigo-500/5 dark:to-transparent border border-indigo-500/30 dark:border-indigo-500/20 rounded-[1.5rem] p-6 shadow-lg shadow-indigo-500/5 text-left max-w-xl mx-auto mt-6">
          <h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2 text-sm sm:text-base uppercase tracking-wider">
            <Zap size={16} className="text-indigo-500" /> 
            {t.language === 'Bahasa' ? 'Alur Kerja Pemeriksaan Visual (AI)' : 'Visual (AI) Audit Workflow'}
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {t.language === 'Bahasa' 
              ? 'Sama seperti aplikasi pembuat metadata, sistem secara otomatis mengekstrak beberapa frame kunci secara lokal di browser menggunakan elemen <canvas>, lalu mengirimkannya ke Vision AI Gemini 3.1 Flash Lite dengan prompt khusus dan aturan kurasi Adobe Stock untuk mendeteksi cacat visual, anomali AI, serta risiko hak cipta.'
              : 'Just like the metadata generator app, the system automatically extracts several keyframes locally in the browser using the <canvas> element, then sends them to Vision AI Gemini 3.1 Flash Lite with custom prompts and Adobe Stock curation guidelines to detect visual flaws, AI anomalies, and copyright risks.'}
          </p>
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
                : report.recommendation === 'RETOUCH'
                ? 'border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10'
                : 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10'
            }`}>
              <div className="flex items-center gap-4">
                {report.recommendation === 'PASS' ? (
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                ) : report.recommendation === 'RETOUCH' ? (
                  <AlertCircle className="w-10 h-10 text-amber-500" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-red-500" />
                )}
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {report.recommendation === 'PASS' ? 'Lolos (PASS)' : 
                     report.recommendation === 'RETOUCH' ? 'Perlu Perbaikan (RETOUCH)' : 'Ditolak (FAIL)'}
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
                  {isIndo ? 'Hasil Pemeriksaan Kualitas Video' : 'Video Quality Check Results'} ({CHECK_ITEMS.length} Checkpoints)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CHECK_ITEMS_LOCALIZED.map((item) => {
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
                      : (isFailedInIssues 
                          ? (isIndo ? 'Terdeteksi adanya masalah pada indikator ini.' : 'Issues detected on this indicator.') 
                          : (isIndo ? 'Normal, tidak mendeteksi masalah.' : 'Normal, no issues detected.'));

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

              {/* Metadata Recommendations */}
              {report.metadata && (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {isIndo ? 'Rekomendasi Judul & Kata Kunci SEO Video' : 'Recommended Title & SEO Keywords'}
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">v5.0 Expert</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="font-black uppercase text-[8px] text-slate-400 block mb-0.5">Recommended Title</span>
                      <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{report.metadata.title}</span>
                    </div>
                    <div>
                      <span className="font-black uppercase text-[8px] text-slate-400 block mb-0.5">Keywords suggestion ({report.metadata.keywords?.length || 0})</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                        {report.metadata.keywords?.map((k, idx) => (
                          <span key={idx} className="px-2 py-1 bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-semibold">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Issues & Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Issues */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400 flex items-center gap-2">
                    {isIndo ? 'Masalah Teknis' : 'Technical Issues'} ({report.technical_issues?.length || 0})
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
                    <p className="text-sm text-slate-500 italic">{isIndo ? 'Tidak ada masalah teknis yang terdeteksi.' : 'No technical issues detected.'}</p>
                  )}
                </div>

                {/* Strengths */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    {isIndo ? 'Kelebihan' : 'Strengths'} ({report.strengths?.length || 0})
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
                    <p className="text-sm text-slate-500 italic">{isIndo ? 'Tidak ada kelebihan khusus yang disorot.' : 'No particular strengths highlighted.'}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section */}
      {history.length > 0 && (
        <section className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-lg mt-8">
          <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History size={16} className="text-slate-400" />
              <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Analysis History</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={exportHistoryToJSON}
                className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                title="Backup History"
              >
                <Download size={16} />
              </button>
              <button 
                onClick={handleClearHistory}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Clear History"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {history.map((item) => (
              <div 
                key={item.id}
                className="group flex items-center justify-between p-4 sm:px-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => loadFromHistory(item)}
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.report.recommendation === 'PASS' ? 'bg-emerald-500' :
                    item.report.recommendation === 'RETOUCH' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.fileName || 'Untitled Video'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.timestamp}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        Score: {item.report.overall_score}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};