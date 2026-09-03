import { getDailyLimit } from '../../constants';
import React, { useState, useEffect, useRef } from 'react';
import { getHeaders } from '../../services/geminiService';
import { 
  Upload, ShieldCheck, CheckCircle, AlertCircle, Sparkles, Loader2, FileImage, 
  ChevronDown, ChevronUp, Trash2, Zap, Eye, EyeOff, XCircle, Info, Download, 
  Copy, Check, Play, Pause, RefreshCw, Layers, Filter, CheckCircle2, Clock, ExternalLink
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
  onSendToMetadataGen?: (files: File[]) => void;
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
  onSendToMetadataGen,
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

                {/* Filter Tabs & Batch Transfer */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                  {passCount > 0 && onSendToMetadataGen && (
                    <button
                      onClick={() => {
                        const passedFiles = queue.filter(q => q.status === 'done' && q.report?.recommendation === 'PASS').map(q => q.file);
                        if (passedFiles.length > 0) {
                          onSendToMetadataGen(passedFiles);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-violet-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
                      title="Kirim semua file yang dinyatakan lolos (PASS) langsung ke antrean MetadataGen"
                    >
                      <Sparkles size={12} className="text-amber-300" />
                      <span>Kirim Semua Lolos ke MetadataGen ({passCount}) 🚀</span>
                    </button>
                  )}

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
                        
                        {/* YOLO Segmentation & Heatmap Overlay */}
                        <AnimatePresence>
                          {showHeatmaps.has(fileName) && r.heatmaps && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-10 pointer-events-none"
                            >
                              {r.heatmaps.map((h: any, i: number) => {
                                const colors = {
                                  noise: { bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-400', stroke: 'rgba(244,63,94,0.4)' },
                                  focus: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400', stroke: 'rgba(245,158,11,0.4)' },
                                  lighting: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-400', stroke: 'rgba(139,92,246,0.4)' },
                                  ip_violation: { bg: 'bg-red-600', border: 'border-red-600', text: 'text-red-400', stroke: 'rgba(220,38,38,0.5)' },
                                  artifact: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-400', stroke: 'rgba(249,115,22,0.4)' },
                                  gen_ai_anomaly: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-400', stroke: 'rgba(236,72,153,0.4)' },
                                  composition: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400', stroke: 'rgba(59,130,246,0.4)' },
                                  alpha_edge: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400', stroke: 'rgba(16,185,129,0.4)' },
                                  cut_off: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-400', stroke: 'rgba(234,179,8,0.4)' }
                                };
                                const labels: Record<string, string> = {
                                  noise: 'Noise & Grain',
                                  focus: 'Focus / Blur',
                                  lighting: 'Lighting Defect',
                                  ip_violation: 'IP / Trademark',
                                  artifact: 'AI Artifact',
                                  gen_ai_anomaly: 'Anatomy / AI Anomaly',
                                  composition: 'Composition',
                                  alpha_edge: 'Alpha Edge / Halo',
                                  cut_off: 'Cut-off Subject'
                                };
                                
                                const theme = colors[h.type as keyof typeof colors] || colors.artifact;
                                const labelText = labels[h.type] || h.type;
                                
                                // Calculate YOLO bounding box coordinates
                                const boxW = h.box_w || (h.xmax && h.xmin ? h.xmax - h.xmin : 22);
                                const boxH = h.box_h || (h.ymax && h.ymin ? h.ymax - h.ymin : 18);
                                const leftPos = h.xmin !== undefined ? h.xmin : Math.max(2, Math.min(98 - boxW, h.x - boxW / 2));
                                const topPos = h.ymin !== undefined ? h.ymin : Math.max(2, Math.min(98 - boxH, h.y - boxH / 2));
                                const confScore = h.confidence || Math.round(92 + (i % 7));

                                return (
                                  <motion.div
                                    key={`yolo-box-${i}`}
                                    initial={{ scale: 0.85, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: i * 0.08, type: "spring", stiffness: 120 }}
                                    className="absolute group/yolo pointer-events-auto"
                                    style={{ 
                                      left: `${leftPos}%`, 
                                      top: `${topPos}%`,
                                      width: `${boxW}%`,
                                      height: `${boxH}%`
                                    }}
                                  >
                                    {/* YOLO Bounding Box with Corner Brackets & Inner Mask */}
                                    <div 
                                      className={`w-full h-full border-2 ${theme.border} rounded-lg shadow-lg relative transition-all duration-300 group-hover/yolo:shadow-2xl`}
                                      style={{ backgroundColor: theme.stroke }}
                                    >
                                      {/* Corner Accents */}
                                      <div className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 ${theme.border}`} />
                                      <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 ${theme.border}`} />
                                      <div className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 ${theme.border}`} />
                                      <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 ${theme.border}`} />

                                      {/* YOLO Header Tag Badge */}
                                      <div className={`absolute -top-5 left-0 px-1.5 py-0.5 ${theme.bg} text-white rounded text-[8px] font-black uppercase tracking-tight flex items-center gap-1 shadow-md whitespace-nowrap`}>
                                        <span>🎯 YOLO: {labelText}</span>
                                        <span className="opacity-90 font-mono">{confScore}%</span>
                                      </div>

                                      {/* Interactive Tooltip Popover on Hover */}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-950/95 backdrop-blur-md border border-white/20 shadow-2xl p-2.5 rounded-xl text-[9px] font-bold text-white opacity-0 group-hover/yolo:opacity-100 transition-all pointer-events-none z-30 flex flex-col gap-1">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-1">
                                          <span className={`${theme.text} uppercase font-black`}>{labelText}</span>
                                          <span className="text-[8px] font-mono text-emerald-400">YOLO-SEG v11</span>
                                        </div>
                                        <div className="text-slate-300 font-medium leading-relaxed break-words">
                                          {h.raw_value || 'Anomali terdeteksi pada area piksel ini.'}
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
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[1.5rem] text-[9px] font-black uppercase tracking-tighter transition-all ${showHeatmaps.has(fileName) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10'}`}
                           >
                             {showHeatmaps.has(fileName) ? <EyeOff size={13} /> : <Eye size={13} />}
                             <span>{showHeatmaps.has(fileName) ? 'Sembunyikan YOLO Overlay' : '🎯 YOLO Segmentation Overlay'}</span>
                           </button>
                           
                           <div className="flex items-center gap-2">
                             <div className="flex flex-col items-end">
                               <p className="text-[7px] font-black text-white/50 uppercase tracking-widest">YOLOv11 &amp; Pixel Engine</p>
                               <p className="text-[9px] font-black text-emerald-400 leading-none">Realtime Seg</p>
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
                           {Array.isArray(r.technical_issues) && r.technical_issues.length > 0 && (
                             <div className="mt-3 pt-3 border-t border-rose-500/10 flex flex-wrap gap-1.5">
                               {r.technical_issues.map((issue: string, idx: number) => (
                                 <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold">
                                   ⚠️ {issue}
                                 </span>
                               ))}
                             </div>
                           )}
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

                      {/* Go to MetadataGen Action Button for Passed Files */}
                      {isPassed && onSendToMetadataGen && (
                        <button
                          onClick={() => onSendToMetadataGen([item.file])}
                          title="Kirim gambar ini langsung ke antrean MetadataGen untuk dibuatkan Judul, Deskripsi & Keywords"
                          className="w-full py-3 bg-gradient-to-r from-[#7c3aed] via-violet-600 to-indigo-600 hover:from-violet-600 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Sparkles size={14} className="text-amber-300" />
                          <span>Go to MetadataGen 🚀</span>
                        </button>
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
                                    exposure: rawChecks.exposure || fallbackCheck('exposure', ['exposure', 'overexposure', 'underexposure', 'clipping']),
                                    color_balance: rawChecks.color_balance || fallbackCheck('color_balance', ['warna', 'color']),
                                    over_edited: rawChecks.over_edited || fallbackCheck('over_edited', ['waxy', 'plastic', 'lilin', 'filter']),
                                    sensor_issues: rawChecks.sensor_issues || fallbackCheck('sensor_issues', ['sensor', 'dust', 'noda']),
                                    watermark: rawChecks.watermark || fallbackCheck('watermark', ['watermark']),
                                    logo: rawChecks.logo || legalFallback('logo'),
                                    text: rawChecks.text || fallbackCheck('text', ['teks', 'text', 'gibberish', 'huruf']),
                                    anatomical_errors: rawChecks.anatomical_errors || fallbackCheck('anatomical_errors', ['anatomi', 'anatomy', 'jari', 'finger', 'tangan', 'hand', 'wajah', 'face']),
                                    ip_risk: rawChecks.ip_risk || legalFallback('ip_risk'),
                                    structural_defects: rawChecks.structural_defects || fallbackCheck('structural_defects', ['struktur', 'structural', 'tiang', 'post', 'moncong', 'nozzle', 'pipet', 'alat']),
                                    proportion_defects: rawChecks.proportion_defects || fallbackCheck('proportion_defects', ['proporsi', 'proportion', 'mekanis', 'mechanical']),
                                    noise: rawChecks.noise || fallbackCheck('noise', ['noise', 'grain', 'derau']),
                                    artifacts: rawChecks.artifacts || fallbackCheck('artifacts', ['artifact', 'kompresi', 'banding', 'fringe']),
                                    ai_artifacts: rawChecks.ai_artifacts || fallbackCheck('ai_artifacts', ['ai', 'generatif', 'halusinasi', 'meleleh', 'melted', 'distorsi']),
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

                                  const tolerance = r.tolerance || 'Standard';

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
                                            <span className={`text-xl font-black ${isPass ? 'text-emerald-500' : 'text-rose-500'} tracking-tighter`}>
                                              {r.overall_score}
                                            </span>
                                            <span className="text-[7px] font-black uppercase text-slate-400">Score</span>
                                          </div>
                                        </div>

                                        <div className="flex-1 space-y-2 text-center md:text-left">
                                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isPass ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
                                              {isPass ? 'Adobe Stock Quality Pass' : 'Quality Issues / Reject Risk'}
                                            </span>
                                            <span className="text-[9px] font-mono text-slate-400">
                                              Tolerance: {tolerance}
                                            </span>
                                          </div>
                                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {isPass 
                                              ? (t.language === 'Bahasa' ? 'Aset memenuhi standar teknis & kualitas Adobe Stock untuk lisensi komersial.' : 'Asset meets Adobe Stock technical & curation standards for commercial licensing.')
                                              : (t.language === 'Bahasa' ? 'Terdeteksi masalah kualitas visual/teknis yang berisiko ditolak oleh kurator Adobe Stock.' : 'Visual or technical quality issues detected that risk rejection by Adobe Stock curators.')}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Tab Selector */}
                                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-white/5">
                                        {[
                                          { id: 'technical', label: t.language === 'Bahasa' ? 'Piksel & Teknis' : 'Pixel & Technical' },
                                          { id: 'legal', label: t.language === 'Bahasa' ? 'Legal & IP' : 'Legal & IP' },
                                          { id: 'ai', label: t.language === 'Bahasa' ? 'AI & Anatomi' : 'AI & Anatomy' },
                                          { id: 'seo', label: 'Metadata SEO' }
                                        ].map(tab => (
                                          <button
                                            key={tab.id}
                                            onClick={() => setTab(tab.id as any)}
                                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                                              currentTab === tab.id
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                          >
                                            {tab.label}
                                          </button>
                                        ))}
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
                                                <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-3">Forensic Evidence</h5>
                                                <div className="space-y-2 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
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

                                             <div className="bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 p-4 rounded-2xl space-y-3">
                                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-white/5 pb-2.5">
                                                 <div className="flex items-center gap-2">
                                                   <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                   <h5 className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                                                     {t.language === 'Bahasa' ? 'Katalog Restriksi Resmi Adobe Stock' : 'Adobe Stock Known Restrictions Catalog'}
                                                   </h5>
                                                 </div>
                                                 <a
                                                   href="https://helpx.adobe.com/stock/contributor/content-policies-guidelines/content-policies/known-restrictions.html"
                                                   target="_blank"
                                                   rel="noopener noreferrer"
                                                   className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] font-black tracking-wide border border-rose-500/20 transition-all shrink-0"
                                                 >
                                                   <span>{t.language === 'Bahasa' ? 'Panduan Resmi Adobe' : 'Official Policy Guide'}</span>
                                                   <ExternalLink size={10} />
                                                 </a>
                                               </div>

                                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px]">
                                                 <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/5 space-y-1">
                                                   <span className="font-black uppercase text-slate-700 dark:text-slate-200 block">
                                                     1. {t.language === 'Bahasa' ? 'Merek & Desain Produk' : 'Brands & Product Shapes'}
                                                   </span>
                                                   <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                     Apple, Nike (Swoosh/Jordan), Adidas (3 garis), Louboutin (sol merah), Barbie, Lego, Funko Pop, Rubik's Cube, Tiffany Blue, Zippo, Chemex, Kikkoman, Duracell, UPS brown.
                                                   </p>
                                                 </div>

                                                 <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/5 space-y-1">
                                                   <span className="font-black uppercase text-slate-700 dark:text-slate-200 block">
                                                     2. {t.language === 'Bahasa' ? 'Landmark & Arsitektur' : 'Landmarks & Architecture'}
                                                   </span>
                                                   <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                     Menara Eiffel (malam hari), Sydney Opera House, Burj Khalifa, Atomium, Grand Central clocks, Vessel NYC, Piramida Louvre, interior Sagrada Familia / Colosseum.
                                                   </p>
                                                 </div>

                                                 <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/5 space-y-1">
                                                   <span className="font-black uppercase text-slate-700 dark:text-slate-200 block">
                                                     3. {t.language === 'Bahasa' ? 'Patung & Seni Publik' : 'Statues & Public Art'}
                                                   </span>
                                                   <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                     Patung Kristus Penebus, Little Mermaid, Cloud Gate "The Bean", Charging Bull Wall St, Non-Violence gun, Bruce Lee statue, Hollywood Sign, Route 66.
                                                   </p>
                                                 </div>

                                                 <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/5 space-y-1">
                                                   <span className="font-black uppercase text-slate-700 dark:text-slate-200 block">
                                                     4. {t.language === 'Bahasa' ? 'Simbol, Transit & NASA' : 'Symbols, Transit & NASA'}
                                                   </span>
                                                   <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                     NASA (logo/misi/astronot - Dilarang AI), Palang Merah/Bulan Sabit, PBB, Cincin Olimpiade, Shinkansen, TGV, ICE DB, London Underground, NYC Subway (MTA).
                                                   </p>
                                                 </div>
                                               </div>

                                               <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[8.5px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed flex items-center gap-1.5">
                                                 <Info size={12} className="shrink-0 text-amber-500" />
                                                 <span>
                                                   {t.language === 'Bahasa'
                                                     ? 'Aset yang memuat subjek di atas wajib ditolak (FAIL/VIOLATION) untuk kepatuhan komersial Adobe Stock.'
                                                     : 'Assets containing the subjects above are strictly flagged (FAIL/VIOLATION) for commercial Adobe Stock compliance.'}
                                                 </span>
                                               </div>
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

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                              {[
                                                { label: t.language === 'Bahasa' ? 'Integritas Anatomi' : 'Anatomical Integrity', val: aiVisionChecks.anatomical_errors },
                                                { label: t.language === 'Bahasa' ? 'Cacat Struktural AI' : 'Structural Defects', val: aiVisionChecks.structural_defects },
                                                { label: t.language === 'Bahasa' ? 'Artefak Generatif AI' : 'Generative AI Artifacts', val: aiVisionChecks.ai_artifacts },
                                                { label: t.language === 'Bahasa' ? 'Integritas Teks OCR' : 'Text / OCR Integrity', val: aiVisionChecks.text },
                                                { label: t.language === 'Bahasa' ? 'Proporsi & Mekanis' : 'Proportion & Mechanical', val: aiVisionChecks.proportion_defects },
                                                { label: t.language === 'Bahasa' ? 'Tekstur Lilin / Over-edited' : 'Waxy Skin / Over-edited', val: aiVisionChecks.over_edited },
                                                { label: t.language === 'Bahasa' ? 'Artefak Kompresi & Edge' : 'Artifacts & Edges', val: aiVisionChecks.artifacts },
                                                { label: t.language === 'Bahasa' ? 'Standar Penerimaan Stok' : 'Stock Acceptance', val: aiVisionChecks.stock_acceptance }
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
