import { getDailyLimit } from '../../constants';
import React, { useState, useEffect, useRef } from 'react';
import { getHeaders } from '../../services/geminiService';
import { 
  Upload, ShieldCheck, CheckCircle, AlertCircle, Sparkles, Loader2, FileImage, 
  ChevronDown, ChevronUp, Trash2, Zap, Eye, EyeOff, XCircle, Info, Download, 
  Copy, Check, Play, Pause, RefreshCw, Layers, Filter, CheckCircle2, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FeatureGuideButton } from './FeatureGuideModal';

export interface QualityReport {
  visual_scan_analysis?: string;
  recommendation: "PASS" | "FAIL";
  overall_score: number;
  legal_status: string;
  technical_issues: string[];
  strengths: string[];
  detailed_feedback: string;
  heatmaps?: { type: "noise" | "focus" | "lighting" | "ip_violation" | "artifact" | "gen_ai_anomaly" | "composition"; x: number; y: number; intensity: number; raw_value: string }[];
  yolo_detected_objects?: { label: string; confidence: number; box_2d?: [number, number, number, number]; category?: string }[];
  technical_gate?: {
    passed?: boolean;
    failures?: { key: string; reason_en?: string; reason_id?: string }[];
    warnings?: { key: string; reason_en?: string; reason_id?: string }[];
  };
  ffmpeg?: {
    resolution: string;
    color_space: string;
    histogram: number[];
    brightness: { value: number | null; status: string };
    contrast: { value: number | null; status: string };
    sharpness: { value: number | null; status: string };
    noise: { value: number | null; status: string };
    transparency?: {
      has_alpha?: boolean;
      transparent_percent?: number;
      opaque_percent?: number;
      partial_alpha_percent?: number;
      edge_halo_risk_percent?: number;
      chromatic_fringe_percent?: number;
      brightness_fringe_percent?: number;
      suspicious_edge_percent?: number;
      edge_status?: string;
    };
    jpeg_blocking?: { score: number; status: string };
    banding?: { score: number; status: string };
    background_edge_analysis?: { uniform_border?: boolean; border_luma_mean?: number; border_luma_std?: number; high_contrast_edge_density_percent?: number; note?: string };
    ocr?: { text_detected?: boolean; text?: string; possible_gibberish_tokens?: string[]; ocr_status?: string };
    file_validation: string;
    file_size_kb: number;
  };
  ai_vision?: {
    visual_scan_analysis?: string;
    recommendation: "PASS" | "FAIL";
    overall_score: number;
    legal_status: string;
    technical_issues: string[];
    strengths: string[];
    detailed_feedback: string;
    ai_vision_checks?: {
      blur?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      composition?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      lighting?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      watermark?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      logo?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      text?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      anatomical_errors?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      ip_risk?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      proportion_defects?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      stock_acceptance?: { status: "PASS" | "FAIL" | "UNKNOWN"; note: string };
      metadata?: { title: string; keywords: string[] };
    };
  };
}

export interface QCQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  currentStep?: string;
  report?: QualityReport;
  error?: string | null;
  timestamp: number;
}

export const ImageQualityCheck: React.FC<{ 
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
  const [queue, setQueue] = useState<QCQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'pass' | 'fail' | 'processing' | 'pending' | 'error'>('all');
  const [error, setError] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState<'STRICT' | 'MEDIUM' | 'LOOSE'>('MEDIUM');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [showHeatmaps, setShowHeatmaps] = useState<Set<string>>(new Set());
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, 'technical' | 'legal' | 'ai' | 'seo'>>({});
  const [copiedState, setCopiedState] = useState<Record<string, string>>({});
  
  const isStoppingRef = useRef(false);
  const queueRef = useRef<QCQueueItem[]>([]);
  queueRef.current = queue;

  const handleFilesSelectedRef = useRef<(files: FileList | File[]) => Promise<void>>((_f) => Promise.resolve());
  useEffect(() => {
    handleFilesSelectedRef.current = handleFilesSelected;
  });

  useEffect(() => {
    const handleGlobalDrop = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.files && customEvent.detail.files.length > 0) {
        handleFilesSelectedRef.current(customEvent.detail.files);
      }
    };
    window.addEventListener('globalFileDrop', handleGlobalDrop);
    return () => window.removeEventListener('globalFileDrop', handleGlobalDrop);
  }, []);

  useEffect(() => {
    fetch(`/api/r2-status?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setR2Configured(!!data.configured))
      .catch(() => setR2Configured(false));
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedState(prev => ({ ...prev, [key]: 'COPIED' }));
      setTimeout(() => {
        setCopiedState(prev => ({ ...prev, [key]: '' }));
      }, 2000);
    }).catch(err => console.error("Failed to copy:", err));
  };

  const toggleHeatmap = (fileName: string) => {
    setShowHeatmaps(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const toggleReportExpand = (fileName: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    isStoppingRef.current = true;
    setIsProcessing(false);
    setCurrentProcessingId(null);
    queue.forEach(item => {
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
      }
    });
    setQueue([]);
    setError(null);
    setShowHeatmaps(new Set());
    setExpandedReports(new Set());
  };

  const handleRemoveItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = queue.find(it => it.id === id);
    if (item && item.previewUrl && item.previewUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
    }
    setQueue(prev => prev.filter(it => it.id !== id));
  };

  const resizeAndProcess = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 1. Handle Video (MP4, MOV, etc.)
      if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov)$/i)) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.opacity = '0';
        document.body.appendChild(video);

        let isResolved = false;
        const cleanup = () => {
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
          URL.revokeObjectURL(url);
        };

        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve("");
          }
        }, 15000);

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 2 || 1);
        };

        video.onseeked = () => {
          if (isResolved) return;
          clearTimeout(timeoutId);
          isResolved = true;
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 2048;
            const MAX_HEIGHT = 2048;
            let width = video.videoWidth || 640;
            let height = video.videoHeight || 480;

            if (width > height) {
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
              if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.92));
            } else {
              reject(new Error("Canvas context failed"));
            }
          } catch (e) {
            reject(e);
          } finally {
            cleanup();
          }
        };

        video.onerror = () => {
          if (isResolved) return;
          clearTimeout(timeoutId);
          isResolved = true;
          cleanup();
          resolve("");
        };
        
        video.src = url;
        video.load();
        return;
      }

      // 2. Handle EPS / AI
      if (file.name.match(/\.(eps|ai)$/i)) {
          (async () => {
             try {
                let uploadedUrl = null;
                let getUrlData = null;
                try {
                    const getUrlRes = await fetch(`/api/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'application/postscript')}`);
                    getUrlData = await getUrlRes.json().catch(() => ({}));
                    
                    if (getUrlRes.ok && getUrlData.uploadUrl && getUrlData.fileUrl) {
                        const putRes = await fetch(getUrlData.uploadUrl, {
                            method: 'PUT',
                            body: file,
                            headers: { 'Content-Type': file.type || 'application/postscript' }
                        });
                        if (!putRes.ok) throw new Error(`Failed to upload to storage: ${putRes.status}`);
                        uploadedUrl = getUrlData.fileUrl;
                    }
                } catch (uploadErr: any) {
                    console.warn("Failed to save EPS to R2/Storage:", uploadErr);
                }

                let response;
                if (uploadedUrl) {
                    response = await fetch(`/api/convert-eps?t=${Date.now()}_${Math.random()}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileUrl: uploadedUrl, pathKey: getUrlData?.pathKey })
                    });
                } else {
                    const formData = new FormData();
                    formData.append('file', file);
                    response = await fetch(`/api/convert-eps-multipart?t=${Date.now()}_${Math.random()}`, {
                        method: 'POST',
                        body: formData
                    });
                }
                
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(`Ghostscript Error: ${data.error || 'Failed to convert'}`);
                }
                
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("image/jpeg") !== -1) {
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const img = new Image();
                      img.onload = () => {
                         const canvas = document.createElement('canvas');
                         const MAX_WIDTH = 2048;
                         const MAX_HEIGHT = 2048;
                         let width = img.width;
                         let height = img.height;
                         if (width > height) {
                           if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                         } else {
                           if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                         }
                         canvas.width = width;
                         canvas.height = height;
                         const ctx = canvas.getContext('2d');
                         if (ctx) {
                           ctx.drawImage(img, 0, 0, width, height);
                           resolve(canvas.toDataURL('image/jpeg', 0.92));
                         } else {
                           resolve(reader.result as string);
                         }
                      };
                      img.onerror = () => resolve(reader.result as string);
                      img.src = reader.result as string;
                    };
                    reader.onerror = () => reject(new Error("Failed to read server EPS blob"));
                    reader.readAsDataURL(blob);
                } else {
                   throw new Error("Invalid content type from server: " + contentType);
                }
             } catch (serverErr: any) {
                 reject(new Error(`Gagal mengekstrak EPS/AI ${file.name} melalui server: ${serverErr.message}`));
             }
          })();
          return;
      }

      reject(new Error('Raster image preprocessing is disabled for forensic Quality Check. The original file must be sent unchanged.'));
    });
  };

  // 🔍 Analisis Satu File Tunggal (One-by-One Processing)
  const analyzeSingleFile = async (
    item: QCQueueItem, 
    onStepChange: (step: string) => void
  ): Promise<QualityReport> => {
    const { file } = item;
    const isVideo = file.type.startsWith('video/') || !!file.name.match(/\.(mp4|mov|webm)$/i);
    const isEpsAi = !!file.name.match(/\.(eps|ai)$/i);

    onStepChange('Mempersiapkan media & ekstrak preview...');

    if (isEpsAi) {
      try {
        const base64Preview = await resizeAndProcess(file);
        if (base64Preview) {
          setQueue(prev => prev.map(it => it.id === item.id ? { ...it, previewUrl: base64Preview } : it));
        }
      } catch (err) {
        console.warn("EPS preview error:", err);
      }
    }

    let uploadedUrl = null;
    let getUrlData = null;

    if (!isEpsAi) {
      onStepChange('Mengunggah file asli ke Cloud Storage...');
      try {
        const getUrlRes = await fetch(`/api/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'image/jpeg')}`);
        if (getUrlRes.ok) {
          getUrlData = await getUrlRes.json().catch(() => ({}));
          if (getUrlData.uploadUrl && getUrlData.fileUrl) {
            const putRes = await fetch(getUrlData.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type || 'image/jpeg' }
            });
            if (putRes.ok) {
              uploadedUrl = getUrlData.fileUrl;
            }
          }
        }
      } catch (uploadErr) {
        console.warn("[Media Audit] Failed to upload to Cloudflare R2, falling back to direct payload:", uploadErr);
      }
    }

    onStepChange('Menganalisis piksel, forensik OpenCV & AI Vision...');

    let response;

    if (isVideo) {
      if (uploadedUrl) {
        response = await fetch('/api/check-video-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders(aiOptions) },
          body: JSON.stringify({
            fileUrl: uploadedUrl,
            pathKey: getUrlData?.pathKey,
            tolerance,
            language: t.language || 'English',
            model: aiOptions?.model || 'gemini-3.1-flash-lite'
          })
        });
      } else {
        if (file.size > 4.5 * 1024 * 1024) {
           throw new Error('File video asli terlalu besar (>4.5MB). Harap aktifkan Cloudflare R2 pada konfigurasi server.');
        }
        const formData = new FormData();
        formData.append('video', file);
        formData.append('tolerance', tolerance);
        formData.append('language', t.language || 'English');
        if (aiOptions?.model) formData.append('model', aiOptions.model);
        response = await fetch('/api/check-video-quality', {
          method: 'POST',
          headers: getHeaders(aiOptions),
          body: formData
        });
      }
    } else if (uploadedUrl) {
      response = await fetch('/api/check-image-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders(aiOptions) },
        body: JSON.stringify({ 
          fileUrl: uploadedUrl,
          pathKey: getUrlData?.pathKey,
          tolerance, 
          language: t.language || 'English', 
          model: aiOptions?.model,
          fileType: file.type || file.name.split('.').pop()
        }),
      });
    } else {
      const formData = new FormData();
      formData.append('image', file, file.name);
      formData.append('tolerance', String(tolerance));
      formData.append('language', t.language || 'English');
      if (aiOptions?.model) formData.append('model', aiOptions.model);
      formData.append('fileType', file.type || file.name.split('.').pop() || '');

      response = await fetch('/api/check-image-quality', {
        method: 'POST',
        headers: getHeaders(aiOptions),
        body: formData
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Gagal menganalisis ${file.name} (Status: ${response.status})`);
    }

    onStepChange('Memverifikasi standar kurasi & skor...');
    const reportData: QualityReport = await response.json();
    return reportData;
  };

  // 📋 Memproses Antrean Secara Berurutan Satu Per Satu (Sequential Queue)
  const processQueue = async (itemsList?: QCQueueItem[]) => {
    const currentList = itemsList || queueRef.current;
    const pendingItems = currentList.filter(it => it.status === 'pending' || it.status === 'error');
    if (pendingItems.length === 0) return;

    if (!isLicensed && dailyGenCount + pendingItems.length > getDailyLimit()) {
      setError(`Batas Trial Terlampaui. Sisa kuota Anda hari ini adalah ${Math.max(0, getDailyLimit() - dailyGenCount)} kali audit, tetapi Anda memiliki ${pendingItems.length} file dalam antrean.`);
      if (setShowLimitModal) setShowLimitModal(true);
      return;
    }

    setIsProcessing(true);
    isStoppingRef.current = false;
    setError(null);

    for (let i = 0; i < pendingItems.length; i++) {
      if (isStoppingRef.current) break;

      const targetItem = pendingItems[i];
      setCurrentProcessingId(targetItem.id);

      setQueue(prev => prev.map(it => it.id === targetItem.id ? {
        ...it,
        status: 'processing',
        error: null,
        currentStep: 'Memulai audit...'
      } : it));

      try {
        const updateStep = (stepText: string) => {
          setQueue(prev => prev.map(it => it.id === targetItem.id ? { ...it, currentStep: stepText } : it));
        };

        const report = await analyzeSingleFile(targetItem, updateStep);

        if (isStoppingRef.current) break;

        setQueue(prev => prev.map(it => it.id === targetItem.id ? {
          ...it,
          status: 'done',
          report,
          error: null,
          currentStep: undefined
        } : it));

        if (incrementDailyCount) {
          incrementDailyCount(1);
        }
      } catch (err: any) {
        console.error(`QC Error for ${targetItem.name}:`, err);
        setQueue(prev => prev.map(it => it.id === targetItem.id ? {
          ...it,
          status: 'error',
          error: err.message || 'Gagal memproses audit gambar.',
          currentStep: undefined
        } : it));
      }
    }

    setCurrentProcessingId(null);
    setIsProcessing(false);
  };

  const handleStopQueue = () => {
    isStoppingRef.current = true;
    setIsProcessing(false);
    setCurrentProcessingId(null);
    setQueue(prev => prev.map(it => it.status === 'processing' ? { ...it, status: 'pending', currentStep: undefined } : it));
  };

  const handleRetrySingle = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isProcessing) return;

    const target = queue.find(it => it.id === itemId);
    if (!target) return;

    if (!isLicensed && dailyGenCount >= getDailyLimit()) {
      setError(`Batas Trial Terlampaui. Anda telah mencapai batas maksimal ${getDailyLimit()} kali audit hari ini.`);
      if (setShowLimitModal) setShowLimitModal(true);
      return;
    }

    setIsProcessing(true);
    setCurrentProcessingId(itemId);
    setQueue(prev => prev.map(it => it.id === itemId ? { ...it, status: 'processing', error: null, currentStep: 'Mempersiapkan...' } : it));

    try {
      const updateStep = (stepText: string) => {
        setQueue(prev => prev.map(it => it.id === itemId ? { ...it, currentStep: stepText } : it));
      };
      const report = await analyzeSingleFile(target, updateStep);
      setQueue(prev => prev.map(it => it.id === itemId ? { ...it, status: 'done', report, error: null, currentStep: undefined } : it));
      if (incrementDailyCount) incrementDailyCount(1);
    } catch (err: any) {
      setQueue(prev => prev.map(it => it.id === itemId ? { ...it, status: 'error', error: err.message, currentStep: undefined } : it));
    } finally {
      setIsProcessing(false);
      setCurrentProcessingId(null);
    }
  };

  async function handleFilesSelected(selectedFiles: FileList | File[]) {
    const fileArray = Array.from(selectedFiles);
    if (fileArray.length === 0) return;

    setError(null);
    const newItems: QCQueueItem[] = [];

    for (const file of fileArray) {
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `qc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop() || '',
        previewUrl,
        status: 'pending',
        timestamp: Date.now()
      });
    }

    const updatedQueue = [...queueRef.current, ...newItems];
    setQueue(updatedQueue);

    // Otomatis mulai memproses antrean baru secara satu per satu
    setTimeout(() => {
      processQueue(updatedQueue);
    }, 150);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(e.target.files);
    }
  };

  // Queue Statistics
  const totalCount = queue.length;
  const doneCount = queue.filter(it => it.status === 'done').length;
  const passCount = queue.filter(it => it.status === 'done' && it.report?.recommendation === 'PASS').length;
  const failCount = queue.filter(it => it.status === 'done' && it.report?.recommendation === 'FAIL').length;
  const processingCount = queue.filter(it => it.status === 'processing').length;
  const pendingCount = queue.filter(it => it.status === 'pending').length;
  const errorCount = queue.filter(it => it.status === 'error').length;

  const progressPercentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const currentItemProcessing = queue.find(it => it.id === currentProcessingId);

  // Filtered queue items
  const filteredQueue = queue.filter(item => {
    if (filterTab === 'pass') return item.status === 'done' && item.report?.recommendation === 'PASS';
    if (filterTab === 'fail') return item.status === 'done' && item.report?.recommendation === 'FAIL';
    if (filterTab === 'processing') return item.status === 'processing';
    if (filterTab === 'pending') return item.status === 'pending';
    if (filterTab === 'error') return item.status === 'error';
    return true;
  });

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      {/* Brand Header - Queue Powered */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-emerald-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
          {/* Progress Bar Glow (Live Queue Tracker) */}
          {isProcessing && (
            <div 
              className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-emerald-400 via-violet-500 to-emerald-600 transition-all duration-500 ease-out z-50 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
              style={{ width: `${progressPercentage}%` }}
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
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none flex items-center gap-2">
                  {t.qc_title} <span className="text-emerald-500">{t.qc_title_check}</span>
                  <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-0.5 rounded-full tracking-widest font-black ml-2 animate-pulse">
                    ANTREAN AKTIF
                  </span>
                </h2>
                <FeatureGuideButton 
                  title={t.guide_image_check_title} 
                  description={t.guide_image_check_desc} 
                  t={t} 
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`flex h-2 w-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.15em]">
                  {isProcessing && currentItemProcessing 
                    ? `Sedang Menganalisis: ${currentItemProcessing.name} (${doneCount + 1}/${totalCount})` 
                    : t.qc_subtitle}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {queue.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-200 dark:border-white/10"
              >
                <Trash2 size={13} />
                {t.qc_btn_reset || 'Hapus Semua'}
              </button>
            )}

            {isProcessing ? (
              <button
                onClick={handleStopQueue}
                className="flex items-center gap-2 px-6 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-rose-500/20 animate-pulse"
              >
                <Pause size={15} />
                <span>Hentikan Antrean</span>
              </button>
            ) : pendingCount > 0 ? (
              <button
                onClick={() => processQueue()}
                className="relative group/btn flex items-center gap-3 px-8 py-3.5 bg-slate-900 dark:bg-emerald-500 hover:bg-black dark:hover:bg-emerald-400 text-white dark:text-slate-950 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-slate-900/10 dark:shadow-emerald-500/20"
              >
                <Zap size={16} className="group-hover/btn:animate-bounce" />
                <span>Mulai Audit Antrean ({pendingCount})</span>
              </button>
            ) : errorCount > 0 ? (
              <button
                onClick={() => processQueue()}
                className="flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                <RefreshCw size={14} />
                <span>Ulangi Gagal ({errorCount})</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Stats, Settings & Queue Upload Hub (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          {!isLicensed && (
            <div className="bg-emerald-500/5 dark:bg-black/20 p-5 rounded-3xl border border-emerald-500/15 dark:border-white/5 shadow-inner">
              <div className="flex justify-between text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t.image_check_trial_label}
                </span>
                <span className={dailyGenCount >= getDailyLimit() ? "text-red-500 font-semibold" : "text-emerald-500 font-semibold"}>
                  {dailyGenCount}/{getDailyLimit()} {t.image_check_generate_count}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    dailyGenCount >= getDailyLimit() ? 'bg-red-500' : 'bg-emerald-500'
                  }`} 
                  style={{ width: `${Math.min(100, (dailyGenCount / getDailyLimit()) * 100)}%` }} 
                />
              </div>
              {dailyGenCount >= getDailyLimit() ? (
                <span className="text-[11px] text-red-500 font-extrabold block mt-2.5 leading-tight">
                  {t.image_check_trial_expired}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block mt-2 leading-tight">
                  {t.image_check_trial_remaining} <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{Math.max(0, getDailyLimit() - dailyGenCount)} {t.image_check_trial_times}</strong>.
                </span>
              )}
              {setShowActivationModal && (
                <button
                  onClick={() => setShowActivationModal(true)}
                  className="w-full mt-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-900 font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles size={11} className="animate-bounce" />
                  <span>Berlangganan PRO (Subscribe)</span>
                </button>
              )}
            </div>
          )}

          {/* Tolerance Card */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-md shadow-black/5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t.qc_tolerance_label}</h3>
            <div className="space-y-3">
              <select 
                  value={tolerance} 
                  disabled={isProcessing}
                  onChange={(e) => setTolerance(e.target.value as any)}
                  className="w-full text-[11px] bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-[1.5rem] px-4 py-3.5 outline-none text-slate-800 dark:text-slate-200 font-bold uppercase transition-all focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer disabled:opacity-50"
              >
                  <option value="STRICT">STRICT (Hardcore mode)</option>
                  <option value="MEDIUM">MEDIUM (Standard Adobe)</option>
                  <option value="LOOSE">LOOSE (AI Playground)</option>
              </select>
            </div>
          </div>

          {/* Upload Hub */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-2 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.qc_upload_hub}</h3>
              {queue.length > 0 && (
                <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {doneCount}/{totalCount} Selesai
                </span>
              )}
            </div>
            
            <label 
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files?.length) {
                  void handleFilesSelected(e.dataTransfer.files);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="group m-4 h-40 cursor-pointer border-2 border-dashed rounded-2xl flex flex-col items-center justify-center space-y-3 transition-all duration-500 border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-black/30"
            >
              <div className="p-3.5 rounded-2xl bg-white dark:bg-white/5 shadow-xl transition-transform duration-500 group-hover:scale-110">
                <Upload className="text-emerald-500" size={26} />
              </div>
              <div className="text-center px-4">
                <span className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight">
                  {t.qc_drop_images_here}
                </span>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center justify-center gap-1.5">
                  <FileImage size={12} /> {t.qc_multiple_upload}
                </span>
              </div>
              <input type="file" accept="image/*,video/mp4,video/quicktime,.eps,.ai,.svg" onChange={handleFileChange} multiple className="hidden" />
            </label>

            {/* Sidebar Live Queue List (Seperti MetadataGen Antrean) */}
            <AnimatePresence>
              {queue.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-3 pb-3 space-y-2.5"
                >
                  <div className="flex justify-between items-center bg-slate-100 dark:bg-black/40 px-3 py-2 rounded-xl">
                    <p className="font-black text-[9px] uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                      <Layers size={11} className="text-emerald-500" />
                      <span>{t.qc_queue_assets}: {queue.length}</span>
                    </p>
                    <span className="text-[9px] font-black text-slate-400">
                      {pendingCount > 0 ? `${pendingCount} Menunggu` : 'Semua Siap'}
                    </span>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {queue.map((item, idx) => {
                      const isItemProcessing = item.status === 'processing';
                      const isItemDone = item.status === 'done';
                      const isItemPass = isItemDone && item.report?.recommendation === 'PASS';
                      const isItemFail = isItemDone && item.report?.recommendation === 'FAIL';
                      const isItemError = item.status === 'error';

                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-center gap-2.5 p-2 rounded-2xl border transition-all duration-300 ${
                            isItemProcessing 
                              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20' 
                              : isItemPass 
                                ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                                : isItemFail 
                                  ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                                  : isItemError
                                    ? 'bg-red-500/5 border-red-500/20'
                                    : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-white/5 hover:border-slate-300'
                          }`}
                        >
                          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-slate-900">
                            {item.previewUrl && (
                              (item.file.type.startsWith('video/') || item.name.match(/\.(mp4|mov)$/i)) ? (
                                <video src={`${item.previewUrl}#t=1`} className="w-full h-full object-cover" muted playsInline />
                              ) : (item.name.match(/\.(eps|ai)$/i) && item.previewUrl.startsWith('blob:')) ? (
                                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex flex-col items-center justify-center">
                                  <FileImage size={14} className="text-slate-400" />
                                  <span className="text-[7px] font-black text-slate-400 uppercase">EPS</span>
                                </div>
                              ) : (
                                <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                              )
                            )}
                            {isItemProcessing && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                                <Loader2 size={16} className="text-amber-400 animate-spin" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-1">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">
                              {item.name}
                            </p>
                            
                            <div className="flex items-center gap-1.5 mt-1">
                              {isItemProcessing && (
                                <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                                  ⚡ Menganalisis...
                                </span>
                              )}
                              {isItemPass && (
                                <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                                  ✓ PASS ({item.report?.overall_score}%)
                                </span>
                              )}
                              {isItemFail && (
                                <span className="text-[8px] font-black uppercase text-rose-500 bg-rose-500/15 px-1.5 py-0.5 rounded">
                                  ✕ REJECTED ({item.report?.overall_score}%)
                                </span>
                              )}
                              {isItemError && (
                                <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/15 px-1.5 py-0.5 rounded">
                                  ⚠️ Error
                                </span>
                              )}
                              {item.status === 'pending' && (
                                <span className="text-[8px] font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  ⏳ Antrean
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isItemError && !isProcessing && (
                              <button
                                onClick={(e) => handleRetrySingle(item.id, e)}
                                title="Uji Ulang"
                                className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                              >
                                <RefreshCw size={12} />
                              </button>
                            )}
                            {!isItemProcessing && (
                              <button
                                onClick={(e) => handleRemoveItem(item.id, e)}
                                title="Hapus dari antrean"
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Standards Info Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent border border-emerald-500/30 dark:border-emerald-500/20 rounded-[1.5rem] p-5 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-xl shadow-sm">
                <ShieldCheck size={18} className="shrink-0" />
              </div>
              <div>
                <h4 className="text-[11px] font-black tracking-widest uppercase">
                  {t.language === 'Bahasa' ? 'STANDAR KURATOR ADOBE PRO' : 'PRO ADOBE CURATOR STANDARDS'}
                </h4>
                <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">Audit 1-per-1 Realtime</p>
              </div>
            </div>
            
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.language === 'Bahasa' 
                ? 'Sistem menganalisis antrean gambar satu per satu secara langsung. Laporan hasil langsung muncul begitu analisis selesai tanpa harus menunggu seluruh antrean.'
                : 'The system analyzes queued images one-by-one in real-time. Inspection reports are displayed immediately as each file finishes.'
              }
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">
                {error}
              </p>
            </motion.div>
          )}
        </div>

        {/* Right Main Area: Antrean Dashboard & Real-Time Card Results (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          {queue.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-md shadow-black/5 space-y-4">
              {/* Queue Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <Layers size={18} className="text-emerald-500" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                      Dashboard Antrean Cek Quality ({totalCount} File)
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {isProcessing 
                        ? `⚡ Sedang memproses ${doneCount + 1} dari ${totalCount} gambar (${progressPercentage}%)`
                        : `${doneCount} Selesai · ${pendingCount} Menunggu · ${errorCount} Gagal`}
                    </p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                  {[
                    { id: 'all', label: `Semua (${totalCount})` },
                    { id: 'pass', label: `✓ Lolos (${passCount})`, activeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                    { id: 'fail', label: `✕ Ditolak (${failCount})`, activeColor: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
                    { id: 'processing', label: `⚡ Proses (${processingCount})`, activeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                    { id: 'pending', label: `⏳ Antrean (${pendingCount})` },
                    { id: 'error', label: `⚠️ Error (${errorCount})`, activeColor: 'text-red-500 bg-red-500/10 border-red-500/20' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                        filterTab === tab.id 
                          ? (tab.activeColor || 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm')
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Active Progress Bar if Processing */}
              {isProcessing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Loader2 size={12} className="animate-spin" />
                      <span>{currentItemProcessing?.currentStep || 'Sedang Memproses...'}</span>
                    </span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {queue.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-[500px] flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl"
            >
              <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 mb-4">
                <FileImage size={44} className="text-slate-300 dark:text-slate-700" />
              </div>
              <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                Antrean Quality Check Kosong
              </h4>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center max-w-[280px]">
                {t.qc_info_empty || 'Unggah satu atau banyak file gambar untuk memulai proses audit antrean secara berurutan.'}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredQueue.map((item, qIdx) => {
                const isProcessingThis = item.status === 'processing';
                const isPendingThis = item.status === 'pending';
                const isErrorThis = item.status === 'error';
                const isDoneThis = item.status === 'done' && !!item.report;
                const r = item.report as QualityReport;
                const isPassed = r?.recommendation === "PASS";
                const fileName = item.name;
                const isVideo = item.file.type.startsWith('video/') || item.name.match(/\.(mp4|mov)$/i);

                // ⚡ Tampilan Kartu Sedang Diproses (Live Processing Card)
                if (isProcessingThis) {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white dark:bg-slate-900 border-2 border-amber-500/40 rounded-[2rem] p-5 shadow-xl shadow-amber-500/5 flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500 animate-pulse" />
                      
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                              <Loader2 size={16} className="animate-spin" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">
                                {fileName}
                              </p>
                              <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                Sedang Menganalisis...
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Thumbnail Scanner View */}
                        <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-950 mb-4">
                          {item.previewUrl && (
                            <img src={item.previewUrl} alt="" className="w-full h-full object-cover opacity-60 filter blur-[1px]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent animate-[bounce_3s_ease-in-out_infinite]" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm space-y-2 text-center">
                            <Sparkles size={24} className="text-amber-400 animate-bounce" />
                            <p className="text-xs font-black uppercase text-white tracking-wider">
                              AI Vision &amp; Pixel Scanner Active
                            </p>
                            <p className="text-[10px] font-semibold text-emerald-400 leading-tight">
                              {item.currentStep || 'Menganalisis kecocokan standar kurator Adobe Stock...'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} className="text-amber-500" />
                          <span>Status Antrean: Urutan Aktif</span>
                        </span>
                        <button
                          onClick={handleStopQueue}
                          className="text-rose-500 font-black uppercase hover:underline text-[9px]"
                        >
                          Hentikan
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                // ⏳ Tampilan Kartu Menunggu Antrean (Pending Card)
                if (isPendingThis) {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2rem] p-5 shadow-md shadow-black/5 flex flex-col justify-between group hover:border-emerald-500/30 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                              <Clock size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">
                                {fileName}
                              </p>
                              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                                Menunggu Giliran Dalam Antrean
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleRemoveItem(item.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                            title="Hapus dari antrean"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 mb-4 opacity-75 group-hover:opacity-100 transition-opacity">
                          {item.previewUrl && (
                            <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-wider">
                            {(item.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleRetrySingle(item.id, e)}
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        <Zap size={12} />
                        <span>Prioritaskan &amp; Audit Sekarang</span>
                      </button>
                    </motion.div>
                  );
                }

                // ⚠️ Tampilan Kartu Error
                if (isErrorThis) {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-rose-500/5 border border-rose-500/20 rounded-[2rem] p-5 shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                              <AlertCircle size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">
                                {fileName}
                              </p>
                              <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">
                                Gagal Memproses Audit
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleRemoveItem(item.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-500/20 mb-4">
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">
                            {item.error || 'Terjadi kesalahan saat memproses gambar.'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleRetrySingle(item.id, e)}
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        <RefreshCw size={12} />
                        <span>Ulangi Audit Gambar Ini</span>
                      </button>
                    </motion.div>
                  );
                }

                // ✅ Tampilan Lengkap Hasil Audit (Completed Quality Report Card)
                if (!isDoneThis || !r) return null;

                return (
                  <motion.div 
                    key={item.id}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: qIdx * 0.05 }}
                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2rem] p-5 shadow-md shadow-black/5 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500 flex flex-col"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-5 px-1">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-[1.5rem] flex items-center justify-center shrink-0 ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {isPassed ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{fileName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1 h-1 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isPassed ? 'PASSED' : 'REJECTED'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-3">
                         <p className={`text-[18px] font-black leading-none ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>{r.overall_score}%</p>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1 whitespace-nowrap">{t.qc_score_label}</p>
                      </div>
                    </div>

                    {/* Image Stage */}
                    {item.previewUrl && (
                        <div className="image-check-viewer relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-inner group-hover:scale-[1.02] transition-transform duration-700">
                          {isVideo ? (
                             <video 
                               src={`${item.previewUrl}#t=1`} 
                               className={`w-full h-full object-cover transition-all duration-500 ${showHeatmaps.has(fileName) ? 'brightness-[0.4] grayscale-[0.5]' : ''}`}
                               muted 
                               playsInline 
                             />
                          ) : (
                             <img 
                               src={item.previewUrl} 
                               alt={fileName} 
                               className={`w-full h-full object-cover transition-all duration-500 ${showHeatmaps.has(fileName) ? 'brightness-[0.4] grayscale-[0.5]' : ''}`}
                               referrerPolicy="no-referrer"
                             />
                          )}
                        
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
                                  lighting: 'bg-violet-500',
                                  ip_violation: 'bg-red-500',
                                  artifact: 'bg-orange-500',
                                  gen_ai_anomaly: 'bg-pink-500',
                                  composition: 'bg-blue-500'
                                };
                                const labels = {
                                  noise: t.language === 'Bahasa' ? 'Grain & Noise' : 'Grain & Noise',
                                  focus: t.language === 'Bahasa' ? 'Fokus Kurang' : 'Soft Focus',
                                  lighting: t.language === 'Bahasa' ? 'Masalah Cahaya' : 'Lighting Issue',
                                  ip_violation: t.language === 'Bahasa' ? 'Pelanggaran IP' : 'IP Violation',
                                  artifact: t.language === 'Bahasa' ? 'Artifak AI' : 'AI Artifact',
                                  gen_ai_anomaly: t.language === 'Bahasa' ? 'Anomali AI' : 'AI Anomaly',
                                  composition: t.language === 'Bahasa' ? 'Komposisi' : 'Composition'
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
                                    <div className={`w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl opacity-80 animate-pulse ${colors[h.type]}`} />
                                    <div className={`w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg cursor-help flex items-center justify-center transition-transform hover:scale-125 pointer-events-auto ${colors[h.type]}`}>
                                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-white/20 shadow-2xl px-3 py-2 rounded-[1.5rem] text-[10px] font-black text-white uppercase tracking-tighter opacity-0 group-hover/point:opacity-100 transition-all scale-90 group-hover/point:scale-100 flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 w-full justify-center">
                                          <span className={`w-1.5 h-1.5 rounded-full ${colors[h.type]}`} />
                                          <span className="whitespace-nowrap">{labels[h.type]}</span>
                                        </div>
                                        <div className="text-emerald-400 text-xs font-mono font-bold leading-tight text-center break-words w-full px-1">
                                          {h.raw_value}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                           <button 
                             onClick={() => toggleHeatmap(fileName)}
                             className={`flex items-center gap-2 px-3 py-1.5 rounded-[1.5rem] text-[9px] font-black uppercase tracking-tighter transition-all ${showHeatmaps.has(fileName) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10'}`}
                           >
                             {showHeatmaps.has(fileName) ? <EyeOff size={14} /> : <Eye size={14} />}
                             {showHeatmaps.has(fileName) ? t.qc_hide_heatmap : t.qc_analyze_heatmap}
                           </button>
                           
                           <div className="flex items-center gap-2">
                             <div className="flex flex-col items-end">
                               <p className="text-[7px] font-black text-white/50 uppercase tracking-widest">{t.qc_pixel_engine}</p>
                               <p className="text-[9px] font-black text-emerald-400 leading-none">v5.0 Expert</p>
                             </div>
                             <Zap size={14} className="text-emerald-500" />
                           </div>
                        </div>

                        <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-[9px] font-black uppercase tracking-widest shadow-xl transition-opacity duration-300 ${showHeatmaps.has(fileName) ? 'opacity-0' : 'opacity-100'} ${isPassed ? 'bg-emerald-500/80 border-emerald-400 text-white' : 'bg-rose-500/80 border-rose-400 text-white'}`}>
                          {isPassed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {isPassed ? 'PASS' : 'FAIL'}
                        </div>
                      </div>
                    )}

                    {/* Detail Section */}
                    <div className="mt-6 flex-1 space-y-6">
                      {/* Detailed Feedback (Prominent if Fail) */}
                      {!isPassed && (
                        <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl">
                           <div className="flex items-center gap-2 mb-2">
                             <Info size={12} className="text-rose-500" />
                             <p className="text-[10px] font-black text-rose-500 uppercase tracking-tight">{t.qc_rejection_reason}</p>
                           </div>
                           <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 leading-relaxed italic">
                             {r.detailed_feedback}
                           </p>
                        </div>
                      )}

                      {/* Legal Status */}
                      <div className={`p-4 rounded-2xl border ${r.legal_status?.includes('VIOLATION') ? 'bg-rose-500/5 border-rose-500/20 text-rose-600' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">{t.qc_legal_status}</p>
                        <p className="text-[11px] font-bold">{r.legal_status}</p>
                      </div>

                      {/* YOLO Vision Object Grounding Badge Display */}
                      {Array.isArray(r.yolo_detected_objects) && r.yolo_detected_objects.length > 0 && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-purple-500/5 border border-indigo-500/20 shadow-xs">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                              </span>
                              <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                                YOLO Vision Object Grounding
                              </p>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500">
                              {r.yolo_detected_objects.length} Verified Objects
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {r.yolo_detected_objects.map((obj, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-indigo-100 dark:border-indigo-900/50 shadow-xs hover:border-indigo-300 transition-colors"
                              >
                                <span>🎯 {obj.label}</span>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                  {Math.round(obj.confidence > 1 ? obj.confidence : obj.confidence * 100)}%
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audit Details Dropdown UI */}
                      <div className="space-y-4">
                        <button 
                          onClick={() => toggleReportExpand(fileName)}
                          className="flex items-center justify-between w-full group/audit"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-[10px] font-black uppercase text-slate-400 group-hover/audit:text-emerald-500 transition-colors tracking-[0.1em]">{t.qc_quality_metadata} 🚀</p>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-[1.5rem] border border-emerald-500/10 group-hover/audit:bg-emerald-500 group-hover/audit:text-white transition-all">
                            {expandedReports.has(fileName) ? t.qc_close : t.qc_view_audit}
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
                              <div className="space-y-4 pt-3">
                                {/* Workflow Stepper Diagram */}
                                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner">
                                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0">
                                        1
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Asset Loaded</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Image Data Source</p>
                                      </div>
                                    </div>
                                    
                                    <div className="hidden md:block text-slate-300 dark:text-slate-700 font-mono text-xs">──▶</div>

                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-xs shrink-0">
                                        2
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">FFmpeg Analysis</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Resolution, Color, Histogram</p>
                                      </div>
                                    </div>

                                    <div className="hidden md:block text-slate-300 dark:text-slate-700 font-mono text-xs">──▶</div>

                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                                        3
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">AI Vision Scan</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Blur, IP, Composition</p>
                                      </div>
                                    </div>

                                    <div className="hidden md:block text-slate-300 dark:text-slate-700 font-mono text-xs">──▶</div>

                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0">
                                        4
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Quality Report</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Passed Curator Standards</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Curation Cockpit: Circular Quality Gauge & Summary */}
                                {(() => {
                                  const isPass = r.recommendation === "PASS";
                                  const rawChecks = r.ai_vision?.ai_vision_checks || (r as any).ai_vision_checks || {};
                                  const failedKeys: string[] = (r as any).failed_checks || (r.ai_vision as any)?.failed_checks || [];
                                  const issueText = ((r.technical_issues || []) as string[]).join(' ').toLowerCase();
                                  const fallbackCheck = (key: string, issueKeywords: string[] = []): { status: "PASS" | "FAIL" | "UNKNOWN"; note: string } => {
                                    const inferredFail = failedKeys.includes(key) || issueKeywords.some(kw => issueText.includes(kw));
                                    const status: "PASS" | "FAIL" | "UNKNOWN" = inferredFail ? "FAIL" : "UNKNOWN";
                                    const note = t.language === 'Bahasa'
                                      ? "Data pemeriksaan ini tidak dikembalikan AI — status mengikuti keputusan akhir laporan dan temuan teknis lainnya."
                                      : "This check was not returned by the AI — status follows the report's final decision and other technical findings.";
                                    return { status, note };
                                  };
                                  const legalFallback = (key: string): { status: "PASS" | "FAIL" | "UNKNOWN"; note: string } =>
                                    (r.legal_status || '').includes('VIOLATION')
                                      ? { status: "FAIL", note: t.language === 'Bahasa' ? "Terdeteksi pelanggaran legal/IP pada laporan akhir." : "Legal/IP violation detected in the final report." }
                                      : fallbackCheck(key);
                                  const aiVisionChecks = {
                                    blur: rawChecks.blur || fallbackCheck('blur', ['focus', 'blur', 'tajam', 'sharp']),
                                    composition: rawChecks.composition || fallbackCheck('composition', ['komposisi', 'composition']),
                                    lighting: rawChecks.lighting || fallbackCheck('lighting', ['lighting', 'exposure', 'pencahayaan', 'eksposur']),
                                    watermark: rawChecks.watermark || fallbackCheck('watermark', ['watermark']),
                                    logo: rawChecks.logo || legalFallback('logo'),
                                    text: rawChecks.text || fallbackCheck('text', ['teks', 'text', 'gibberish']),
                                    anatomical_errors: rawChecks.anatomical_errors || fallbackCheck('anatomical_errors', ['anatomi', 'anatomy', 'jari', 'finger', 'tangan', 'hand']),
                                    ip_risk: rawChecks.ip_risk || legalFallback('ip_risk'),
                                    proportion_defects: rawChecks.proportion_defects || fallbackCheck('proportion_defects', ['proporsi', 'proportion', 'mekanis', 'mechanical', 'struktur']),
                                    stock_acceptance: rawChecks.stock_acceptance || { status: r.recommendation === "PASS" ? "PASS" : "FAIL", note: r.detailed_feedback || "" },
                                    metadata: rawChecks.metadata || { title: (r as any).metadata?.title || "Stock photography showing details", keywords: (r as any).metadata?.keywords || r.strengths || [] }
                                  };

                                  const currentTab = activeTab[fileName] || 'technical';
                                  const setTab = (tab: 'technical' | 'legal' | 'ai' | 'seo') => {
                                    setActiveTab(prev => ({ ...prev, [fileName]: tab }));
                                  };

                                  const ffmpegData = r.ffmpeg || {
                                    resolution: "Unknown",
                                    color_space: "Unknown",
                                    histogram: [],
                                    brightness: { value: null, status: "UNKNOWN — technical data unavailable" },
                                    contrast: { value: null, status: "UNKNOWN — technical data unavailable" },
                                    sharpness: { value: null, status: "UNKNOWN — technical data unavailable" },
                                    noise: { value: null, status: "UNKNOWN — technical data unavailable" },
                                    file_validation: "UNKNOWN — server technical analysis unavailable",
                                    file_size_kb: 0
                                  };

                                  const alphaEdgeScore = ffmpegData.transparency?.edge_halo_risk_percent;
                                  const technicalMetrics = [
                                    { label: t.language === 'Bahasa' ? "Kecerahan (Brightness)" : "Brightness", ...ffmpegData.brightness, color: "bg-amber-500" },
                                    { label: t.language === 'Bahasa' ? "Kontras (Contrast)" : "Contrast", ...ffmpegData.contrast, color: "bg-violet-500" },
                                    { label: t.language === 'Bahasa' ? "Ketajaman (Sharpness)" : "Sharpness (basic)", ...ffmpegData.sharpness, color: "bg-emerald-500" },
                                    { label: t.language === 'Bahasa' ? "Estimasi Noise (Noise)" : "Noise estimation", ...ffmpegData.noise, color: "bg-rose-500" },
                                    ...(alphaEdgeScore != null ? [{ label: t.language === 'Bahasa' ? "Tepi Alpha / Halo" : "Alpha Edge / Halo", value: alphaEdgeScore, status: ffmpegData.transparency?.edge_status || 'Measured', color: "bg-cyan-500" }] : [])
                                  ];

                                  return (
                                    <div className="space-y-6">
                                      {/* Score Gauge Widget */}
                                      <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-inner">
                                        <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                                          <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                              cx="48"
                                              cy="48"
                                              r="40"
                                              className="stroke-slate-200 dark:stroke-slate-800"
                                              strokeWidth="8"
                                              fill="transparent"
                                            />
                                            <circle
                                              cx="48"
                                              cy="48"
                                              r="40"
                                              className={`${isPass ? 'stroke-emerald-500' : 'stroke-rose-500'} transition-all duration-1000`}
                                              strokeWidth="8"
                                              fill="transparent"
                                              strokeDasharray={`${2 * Math.PI * 40}`}
                                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - r.overall_score / 100)}`}
                                              strokeLinecap="round"
                                            />
                                          </svg>
                                          <div className="absolute flex flex-col items-center justify-center text-center">
                                            <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{r.overall_score}%</span>
                                            <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">SCORE</span>
                                          </div>
                                        </div>

                                        <div className="space-y-1.5 flex-1 text-center md:text-left">
                                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                              isPass 
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                            }`}>
                                              {isPass ? (t.language === 'Bahasa' ? 'LAYAK JUAL (PASS)' : 'COMMERCIALLY VIABLE (PASS)') : (t.language === 'Bahasa' ? 'BUTUH PERBAIKAN (FAIL)' : 'NEEDS ATTENTION (FAIL)')}
                                            </span>
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono">ADOBE STOCK QA v5.0</span>
                                          </div>
                                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            {isPass ? (t.language === 'Bahasa' ? 'Aset Lolos Kurasi Pasar Global' : 'High Commercial Potential') : (t.language === 'Bahasa' ? 'Ditemukan Isu Kualitas Kurasi' : 'Quality Roadblocks Detected')}
                                          </h4>
                                          <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                            {r.detailed_feedback || (t.language === 'Bahasa' ? "Analisis visual mendalam selesai dengan kecocokan standar premium." : "Detailed vision analysis completed matching premium stock market standards.")}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Curation Tabs Bar */}
                                      <div className="flex items-center overflow-x-auto gap-1 border-b border-slate-200 dark:border-white/5 pb-px custom-scrollbar">
                                        {(['technical', 'legal', 'ai', 'seo'] as const).map((tabId) => {
                                          const labels = {
                                            technical: t.language === 'Bahasa' ? '🔍 Detail Teknis' : '🔍 Technical Check',
                                            legal: t.language === 'Bahasa' ? '⚖️ Detektif IP & Hukum' : '⚖️ IP & Legal Check',
                                            ai: t.language === 'Bahasa' ? '🤖 Cek Anatomi & AI' : '🤖 AI & Anatomy Check',
                                            seo: t.language === 'Bahasa' ? '📝 Rekomendasi SEO' : '📝 SEO & Metadata'
                                          };
                                          const active = currentTab === tabId;
                                          return (
                                            <button
                                              key={tabId}
                                              onClick={() => setTab(tabId)}
                                              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap shrink-0 ${
                                                active 
                                                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' 
                                                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.01]'
                                              }`}
                                            >
                                              {labels[tabId]}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Tab Contents */}
                                      <div className="min-h-[220px]">
                                        {currentTab === 'technical' && (
                                          <div className="space-y-4 animate-fadeIn">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                              <div className="bg-slate-100/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 flex flex-col justify-between">
                                                <span className="text-[8px] font-black uppercase text-slate-400">Resolution</span>
                                                <span className="text-[10px] font-black text-slate-800 dark:text-white mt-1 truncate">{ffmpegData.resolution}</span>
                                              </div>
                                              <div className="bg-slate-100/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 flex flex-col justify-between">
                                                <span className="text-[8px] font-black uppercase text-slate-400">Color Space</span>
                                                <span className="text-[10px] font-black text-slate-800 dark:text-white mt-1 truncate">{ffmpegData.color_space}</span>
                                              </div>
                                              <div className="bg-slate-100/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 flex flex-col justify-between">
                                                <span className="text-[8px] font-black uppercase text-slate-400">File Validation</span>
                                                <span className="text-[10px] font-black text-emerald-500 mt-1 truncate">{ffmpegData.file_validation}</span>
                                              </div>
                                            </div>

                                            {(r.technical_gate?.warnings?.length || r.technical_gate?.failures?.length) ? (
                                              <div className="space-y-2">
                                                {r.technical_gate?.warnings?.map((w, idx) => (
                                                  <div key={`qc-warning-${idx}`} className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                    <p className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 leading-relaxed">
                                                      {t.language === 'Bahasa' ? (w.reason_id || w.reason_en) : (w.reason_en || w.reason_id)}
                                                    </p>
                                                  </div>
                                                ))}
                                                {r.technical_gate?.failures?.map((f, idx) => (
                                                  <div key={`qc-failure-${idx}`} className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                                    <XCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                                    <p className="text-[9px] font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">
                                                      {t.language === 'Bahasa' ? (f.reason_id || f.reason_en) : (f.reason_en || f.reason_id)}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : null}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="space-y-3 bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-4 rounded-2xl">
                                                <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Technical Micro-Metrics</h5>
                                                {technicalMetrics.map((m) => (
                                                  <div key={m.label} className="space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                      <span className="text-slate-500 uppercase tracking-tight">{m.label}</span>
                                                      <span className="text-slate-800 dark:text-slate-200 font-black">{m.value == null ? '—' : `${m.value}%`} ({m.status})</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                                      {m.value != null && <div className={`h-full ${m.color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, m.value))}%` }} />}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>

                                              <div className="bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-4 rounded-2xl">
                                                <div className="flex items-center justify-between mb-3">
                                                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Forensic &amp; No-Reference Quality</h5>
                                                  <span className="text-[8px] font-black px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">OpenCV · BRISQUE · NIQE</span>
                                                </div>
                                                <div className="space-y-2 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                                  {ffmpegData.brisque && (
                                                    <div className="flex justify-between gap-3 p-1.5 rounded-lg bg-slate-100/50 dark:bg-slate-800/40">
                                                      <span className="font-bold text-slate-700 dark:text-slate-200">BRISQUE Score:</span>
                                                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{ffmpegData.brisque.score} · {ffmpegData.brisque.status}</span>
                                                    </div>
                                                  )}
                                                  {ffmpegData.niqe && (
                                                    <div className="flex justify-between gap-3 p-1.5 rounded-lg bg-slate-100/50 dark:bg-slate-800/40">
                                                      <span className="font-bold text-slate-700 dark:text-slate-200">NIQE Naturalness:</span>
                                                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{ffmpegData.niqe.score} · {ffmpegData.niqe.status}</span>
                                                    </div>
                                                  )}
                                                  {ffmpegData.segmentation && (
                                                    <div className="flex justify-between gap-3">
                                                      <span>Segmentation (Subject vs Bokeh)</span>
                                                      <span className="font-mono text-slate-700 dark:text-slate-200">{ffmpegData.segmentation.status} (Depth: {ffmpegData.segmentation.bokeh_depth_ratio}x)</span>
                                                    </div>
                                                  )}
                                                  {ffmpegData.florence_grounding && (
                                                    <div className="flex justify-between gap-3">
                                                      <span>Florence-2 Grounding</span>
                                                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{ffmpegData.florence_grounding.status} ({ffmpegData.florence_grounding.grounded_regions_count} anchors)</span>
                                                    </div>
                                                  )}
                                                  {ffmpegData.jpeg_blocking && <div className="flex justify-between gap-3"><span>JPEG blocking</span><span className="font-mono text-slate-700 dark:text-slate-200">{ffmpegData.jpeg_blocking.score}/100 · {ffmpegData.jpeg_blocking.status}</span></div>}
                                                  {ffmpegData.banding && <div className="flex justify-between gap-3"><span>Banding</span><span className="font-mono text-slate-700 dark:text-slate-200">{ffmpegData.banding.score}/100 · {ffmpegData.banding.status}</span></div>}
                                                  {ffmpegData.ocr && <div className="flex justify-between gap-3"><span>OCR</span><span className="font-mono text-slate-700 dark:text-slate-200">{ffmpegData.ocr.ocr_status || 'UNKNOWN'}{ffmpegData.ocr.text ? ` · ${ffmpegData.ocr.text.slice(0, 100)}` : ''}</span></div>}
                                                  {ffmpegData.background_edge_analysis && <div className="flex justify-between gap-3"><span>Background edge</span><span className="font-mono text-slate-700 dark:text-slate-200">{ffmpegData.background_edge_analysis.uniform_border ? 'Uniform background — inspect halo' : 'No uniform-background warning'}</span></div>}
                                                </div>
                                              </div>

                                              <div className="bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between md:col-span-2">
                                                <div className="flex justify-between items-center mb-2">
                                                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Luminance Spectrum</h5>
                                                  <span className="text-[8px] font-bold text-slate-400 uppercase font-mono">32 channel frequency</span>
                                                </div>
                                                <div className="h-24 w-full flex items-end gap-[1.5px] bg-slate-950 p-2 rounded-xl border border-white/5 shadow-inner">
                                                  {(ffmpegData.histogram || []).map((h, i) => (
                                                    <div 
                                                      key={`hist-bar-${i}`}
                                                      className="flex-1 bg-gradient-to-t from-emerald-500 via-emerald-400 to-teal-300 rounded-t-[1px]"
                                                      style={{ height: `${Math.max(4, h)}%` }}
                                                    />
                                                  ))}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                              {[
                                                { label: t.language === 'Bahasa' ? 'Ketajaman & Sharpness' : 'Blur / Sharpness', val: aiVisionChecks.blur },
                                                { label: t.language === 'Bahasa' ? 'Pencahayaan & Kontras' : 'Lighting & Contrast', val: aiVisionChecks.lighting },
                                                { label: t.language === 'Bahasa' ? 'Komposisi & Framing' : 'Composition & Crop', val: aiVisionChecks.composition }
                                              ].map((c, i) => {
                                                const isCheckpointPass = c.val?.status === 'PASS';
                                                const isCheckpointUnknown = c.val?.status === 'UNKNOWN';
                                                return (
                                                  <div 
                                                    key={i}
                                                    className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                                                      isCheckpointPass 
                                                        ? 'bg-emerald-500/5 border-emerald-500/10' 
                                                        : isCheckpointUnknown
                                                          ? 'bg-amber-500/5 border-amber-500/10'
                                                          : 'bg-rose-500/5 border-rose-500/10'
                                                    }`}
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-200">{c.label}</span>
                                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                        isCheckpointPass 
                                                          ? 'bg-emerald-500/15 text-emerald-600' 
                                                          : isCheckpointUnknown
                                                            ? 'bg-amber-500/15 text-amber-600'
                                                            : 'bg-rose-500/15 text-rose-600'
                                                      }`}>
                                                        {c.val?.status || 'FAIL'}
                                                      </span>
                                                    </div>
                                                    <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 leading-normal">
                                                      {c.val?.note || "Normal, tidak mendeteksi masalah."}
                                                    </p>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {currentTab === 'legal' && (
                                          <div className="space-y-4 animate-fadeIn">
                                            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${r.legal_status?.includes('VIOLATION') ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'}`}>
                                              <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                                              <div className="space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{t.qc_legal_status}</p>
                                                <p className="text-xs font-black">{r.legal_status}</p>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                              {[
                                                { label: t.language === 'Bahasa' ? 'Watermark Komersial' : 'Watermark Check', val: aiVisionChecks.watermark },
                                                { label: t.language === 'Bahasa' ? 'Deteksi Merek & Logo' : 'Logo Detection', val: aiVisionChecks.logo },
                                                { label: t.language === 'Bahasa' ? 'Risiko Hak Cipta & IP' : 'IP & Trademark Risk', val: aiVisionChecks.ip_risk }
                                              ].map((c, i) => {
                                                const isCheckpointPass = c.val?.status === 'PASS';
                                                const isCheckpointUnknown = c.val?.status === 'UNKNOWN';
                                                return (
                                                  <div 
                                                    key={i}
                                                    className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                                                      isCheckpointPass 
                                                        ? 'bg-emerald-500/5 border-emerald-500/10' 
                                                        : isCheckpointUnknown
                                                          ? 'bg-amber-500/5 border-amber-500/10'
                                                          : 'bg-rose-500/5 border-rose-500/10'
                                                    }`}
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-200">{c.label}</span>
                                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                        isCheckpointPass 
                                                          ? 'bg-emerald-500/15 text-emerald-600' 
                                                          : isCheckpointUnknown
                                                            ? 'bg-amber-500/15 text-amber-600'
                                                            : 'bg-rose-500/15 text-rose-600'
                                                      }`}>
                                                        {c.val?.status || 'FAIL'}
                                                      </span>
                                                    </div>
                                                    <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 leading-normal">
                                                      {c.val?.note || "Normal, tidak mendeteksi pelanggaran kekayaan intelektual."}
                                                    </p>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            <div className="bg-slate-100/30 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 p-4 rounded-2xl space-y-2">
                                              <h5 className="text-[9px] font-black uppercase text-rose-500 tracking-wider">Known Restrictions Check List</h5>
                                              <ul className="text-[9px] font-medium text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                                                <li><strong>Merek Dagang:</strong> Deteksi visual terhadap logo khas, siluet iPhone/Macbook, logo Converse Chuck Taylor, or Beats by Dre.</li>
                                                <li><strong>Landmark Berbayar:</strong> Menara Eiffel (malam hari), Sydney Opera House, Burj Khalifa, Louvre Pyramid, & Atomium dilarang tanpa rilis komersial.</li>
                                                <li><strong>Karya Seni Lain:</strong> Mural jalanan, patung kontemporer, grafiti, tato tubuh yang terekspos jelas membutuhkan Property Release.</li>
                                              </ul>
                                            </div>
                                          </div>
                                        )}

                                        {currentTab === 'ai' && (
                                          <div className="space-y-4 animate-fadeIn">
                                            {r.visual_scan_analysis && (
                                              <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 font-mono text-xs text-slate-300 space-y-2">
                                                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">PIXEL SCANNER ENGINE LOG</span>
                                                </div>
                                                <p className="text-[10px] leading-relaxed italic text-emerald-400 font-semibold">
                                                  &quot;{r.visual_scan_analysis}&quot;
                                                </p>
                                              </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                                              {[
                                                { label: t.language === 'Bahasa' ? 'Integritas Anatomi' : 'Anatomical Integrity', val: aiVisionChecks.anatomical_errors },
                                                { label: t.language === 'Bahasa' ? 'Proporsi & Mekanis' : 'Proportion & Mechanical', val: aiVisionChecks.proportion_defects },
                                                { label: t.language === 'Bahasa' ? 'Teks Overlay / Typo' : 'Text Overlay Check', val: aiVisionChecks.text },
                                                { label: t.language === 'Bahasa' ? 'Standar Penerimaan' : 'Stock Acceptance', val: aiVisionChecks.stock_acceptance }
                                              ].map((c, i) => {
                                                const isCheckpointPass = c.val?.status === 'PASS';
                                                const isCheckpointUnknown = c.val?.status === 'UNKNOWN';
                                                return (
                                                  <div 
                                                    key={i}
                                                    className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                                                      isCheckpointPass 
                                                        ? 'bg-emerald-500/5 border-emerald-500/10' 
                                                        : isCheckpointUnknown
                                                          ? 'bg-amber-500/5 border-amber-500/10'
                                                          : 'bg-rose-500/5 border-rose-500/10'
                                                    }`}
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-200">{c.label}</span>
                                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                        isCheckpointPass 
                                                          ? 'bg-emerald-500/15 text-emerald-600' 
                                                          : isCheckpointUnknown
                                                            ? 'bg-amber-500/15 text-amber-600'
                                                            : 'bg-rose-500/15 text-rose-600'
                                                      }`}>
                                                        {c.val?.status || 'FAIL'}
                                                      </span>
                                                    </div>
                                                    <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 leading-normal line-clamp-3" title={c.val?.note}>
                                                      {c.val?.note || "Aman, tidak mendeteksi anomali rekonstruksi kecerdasan buatan."}
                                                    </p>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {currentTab === 'seo' && (
                                          <div className="space-y-4 animate-fadeIn">
                                            <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black uppercase text-slate-400">SEO Curation Title</span>
                                                <button
                                                  onClick={() => copyToClipboard(aiVisionChecks.metadata.title, `title-${fileName}`)}
                                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-200/50 dark:border-white/5 transition-all text-emerald-600 shadow-sm"
                                                >
                                                  {copiedState[`title-${fileName}`] === 'COPIED' ? <Check size={10} /> : <Copy size={10} />}
                                                  {copiedState[`title-${fileName}`] === 'COPIED' ? (t.language === 'Bahasa' ? 'Tersalin' : 'Copied') : (t.language === 'Bahasa' ? 'Salin' : 'Copy')}
                                                </button>
                                              </div>
                                              <p className="text-xs font-black text-slate-800 dark:text-white leading-relaxed">
                                                {aiVisionChecks.metadata.title}
                                              </p>
                                            </div>

                                            <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-3">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[8px] font-black uppercase text-slate-400">Suggested Keywords</span>
                                                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-mono">
                                                    {aiVisionChecks.metadata.keywords?.length || 0}
                                                  </span>
                                                </div>
                                                {aiVisionChecks.metadata.keywords && aiVisionChecks.metadata.keywords.length > 0 && (
                                                  <button
                                                    onClick={() => copyToClipboard(aiVisionChecks.metadata.keywords.join(', '), `kw-${fileName}`)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-200/50 dark:border-white/5 transition-all text-emerald-600 shadow-sm"
                                                  >
                                                    {copiedState[`kw-${fileName}`] === 'COPIED' ? <Check size={10} /> : <Copy size={10} />}
                                                    {copiedState[`kw-${fileName}`] === 'COPIED' ? (t.language === 'Bahasa' ? 'Tersalin Semua' : 'Copied All') : (t.language === 'Bahasa' ? 'Salin Semua' : 'Copy All')}
                                                  </button>
                                                )}
                                              </div>
                                              <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                                {aiVisionChecks.metadata.keywords?.map((k, idx) => (
                                                  <span 
                                                    key={idx} 
                                                    className="px-2 py-0.5 bg-slate-200/60 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:bg-emerald-500/10 cursor-pointer text-slate-600 dark:text-slate-300 rounded text-[9.5px] font-bold transition-all border border-slate-200/30 dark:border-white/5"
                                                  >
                                                    {k}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
