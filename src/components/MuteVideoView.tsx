import React, { useState, useRef, useEffect } from 'react';
import { VolumeX, Video, Upload, Loader2, Download, AlertCircle, Sparkles, CheckCircle2, Trash2, Play, Eye, FileVideo, ShieldAlert, ArrowRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MuteVideoViewProps {
  t: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
}

interface BatchFileItem {
  id: string;
  file: File;
  progress: 'idle' | 'processing' | 'done' | 'failed';
  downloadUrl?: string;
  mutedFileName?: string;
  error?: string;
}

export const MuteVideoView: React.FC<MuteVideoViewProps> = ({ 
  t,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal,
  setShowActivationModal
}) => {
  const [files, setFiles] = useState<BatchFileItem[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [globalIsProcessing, setGlobalIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoDownload, setAutoDownload] = useState(true);
  const autoDownloadRef = useRef(autoDownload);
  autoDownloadRef.current = autoDownload;
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/r2-status')
      .then(res => res.json())
      .then(data => setR2Configured(!!data.configured))
      .catch(() => setR2Configured(false));
  }, []);

  const activePreviewFile = files.find(f => f.id === activePreviewId);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processIncomingFiles = (incomingFiles: FileList) => {
    const validFiles: BatchFileItem[] = [];
    const invalidNames: string[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const f = incomingFiles[i];
      if (f.type.startsWith('video/')) {
        // Prevent adding exact duplicate files by name and size
        if (!files.some(existing => existing.file.name === f.name && existing.file.size === f.size)) {
          validFiles.push({
            id: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            file: f,
            progress: 'idle'
          });
        }
      } else {
        invalidNames.push(f.name);
      }
    }

    if (invalidNames.length > 0) {
      const errorMsg = (t.mute_error_invalid_files || "File berikut diabaikan karena bukan video: {names}").replace('{names}', invalidNames.join(', '));
      setGlobalError(errorMsg);
    } else {
      setGlobalError(null);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      // Set the first newly added file as preview if none is active
      if (!activePreviewId) {
        setActivePreviewId(validFiles[0].id);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      // Clean up object URL if it exists
      const removedItem = prev.find(f => f.id === id);
      if (removedItem?.downloadUrl) {
        window.URL.revokeObjectURL(removedItem.downloadUrl);
      }
      
      // Update preview item if needed
      if (activePreviewId === id) {
        setActivePreviewId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const muteMp4MovClientSide = async (file: File): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);
    const uint8 = new Uint8Array(arrayBuffer);
    
    let offset = 0;
    const len = arrayBuffer.byteLength;
    const pieces: { start: number; end: number; data?: Uint8Array }[] = [];
    let foundMoov = false;

    while (offset < len) {
      if (offset + 8 > len) {
        pieces.push({ start: offset, end: len });
        break;
      }
      let size = view.getUint32(offset);
      const type = String.fromCharCode(
        uint8[offset + 4],
        uint8[offset + 5],
        uint8[offset + 6],
        uint8[offset + 7]
      );
      
      let headerSize = 8;
      let actualSize = size;
      if (size === 1) {
        if (offset + 16 > len) {
          pieces.push({ start: offset, end: len });
          break;
        }
        const high = view.getUint32(offset + 8);
        const low = view.getUint32(offset + 12);
        actualSize = high * 0x100000000 + low;
        headerSize = 16;
      } else if (size === 0) {
        actualSize = len - offset;
      }
      
      if (actualSize <= 0 || offset + actualSize > len) {
        pieces.push({ start: offset, end: len });
        break;
      }

      if (type === 'moov') {
        foundMoov = true;
        const moovEnd = offset + actualSize;
        let moovOffset = offset + headerSize;
        const keptChildren: Uint8Array[] = [];
        
        while (moovOffset < moovEnd) {
          if (moovOffset + 8 > moovEnd) {
            break;
          }
          let childSize = view.getUint32(moovOffset);
          const childType = String.fromCharCode(
            uint8[moovOffset + 4],
            uint8[moovOffset + 5],
            uint8[moovOffset + 6],
            uint8[moovOffset + 7]
          );
          
          let childHeaderSize = 8;
          let childActualSize = childSize;
          if (childSize === 1) {
            if (moovOffset + 16 > moovEnd) break;
            const high = view.getUint32(moovOffset + 8);
            const low = view.getUint32(moovOffset + 12);
            childActualSize = high * 0x100000000 + low;
            childHeaderSize = 16;
          } else if (childSize === 0) {
            childActualSize = moovEnd - moovOffset;
          }
          
          if (childActualSize <= 0 || moovOffset + childActualSize > moovEnd) {
            break;
          }

          if (childType === 'trak') {
            const trakData = uint8.subarray(moovOffset, moovOffset + childActualSize);
            let isAudio = false;
            
            for (let i = 0; i < trakData.length - 24; i++) {
              if (
                trakData[i] === 104 &&     // 'h'
                trakData[i+1] === 100 &&   // 'd'
                trakData[i+2] === 108 &&   // 'l'
                trakData[i+3] === 114      // 'r'
              ) {
                for (let j = i + 4; j < i + 24; j++) {
                  if (
                    trakData[j] === 115 &&   // 's'
                    trakData[j+1] === 111 && // 'o'
                    trakData[j+2] === 117 && // 'u'
                    trakData[j+3] === 110    // 'n'
                  ) {
                    isAudio = true;
                    break;
                  }
                }
                if (isAudio) break;
              }
            }
            
            if (!isAudio) {
              keptChildren.push(trakData);
            } else {
              console.log(`[Client Mute] Skipped audio track of size ${childActualSize}`);
            }
          } else {
            keptChildren.push(uint8.subarray(moovOffset, moovOffset + childActualSize));
          }
          
          moovOffset += childActualSize;
        }
        
        let totalChildrenSize = 0;
        for (const child of keptChildren) {
          totalChildrenSize += child.byteLength;
        }
        
        const newMoovSize = totalChildrenSize + 8;
        const newMoov = new Uint8Array(newMoovSize);
        const newMoovView = new DataView(newMoov.buffer);
        
        newMoovView.setUint32(0, newMoovSize);
        newMoov[4] = 109; // 'm'
        newMoov[5] = 111; // 'o'
        newMoov[6] = 111; // 'o'
        newMoov[7] = 118; // 'v'
        
        let writeOffset = 8;
        for (const child of keptChildren) {
          newMoov.set(child, writeOffset);
          writeOffset += child.byteLength;
        }
        
        pieces.push({ start: offset, end: offset + actualSize, data: newMoov });
      } else {
        pieces.push({ start: offset, end: offset + actualSize });
      }
      
      offset += actualSize;
    }
    
    if (!foundMoov) {
      throw new Error('Could not find moov atom in file.');
    }

    const finalBlobs: (Blob | Uint8Array)[] = [];
    for (const piece of pieces) {
      if (piece.data) {
        finalBlobs.push(piece.data);
      } else {
        finalBlobs.push(uint8.subarray(piece.start, piece.end));
      }
    }
    
    return new Blob(finalBlobs, { type: file.type || 'video/mp4' });
  };

  const processSingleFileItem = async (item: BatchFileItem): Promise<BatchFileItem> => {
    const extension = item.file.name.substring(item.file.name.lastIndexOf('.')).toLowerCase();
    const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.'));

    // Try purely client-side fast, lossless processing for MP4 and MOV files
    if (extension === '.mp4' || extension === '.mov') {
      try {
        console.log(`[Client Mute] Initiating fast client-side audio removal for: ${item.file.name}`);
        const mutedBlob = await muteMp4MovClientSide(item.file);
        const url = window.URL.createObjectURL(mutedBlob);

        return {
          ...item,
          progress: 'done',
          downloadUrl: url,
          mutedFileName: `muted_${baseName}${extension}`,
          error: undefined
        };
      } catch (clientErr: any) {
        console.warn(`[Client Mute] Fast client-side parsing failed for ${item.file.name}, falling back to server:`, clientErr);
      }
    }

    // Fallback to server processing (useful for WebM, or if client-side processing failed)
    try {
      let response;
      let uploadedUrl = null;
      let getUrlData = null;

      // 1. Try to upload to Cloudflare R2 first to bypass Vercel limits
      try {
        const getUrlRes = await fetch(`/api/get-upload-url?filename=${encodeURIComponent(item.file.name)}&contentType=${encodeURIComponent(item.file.type || 'video/mp4')}`);
        if (getUrlRes.ok) {
          getUrlData = await getUrlRes.json().catch(() => ({}));
          if (getUrlData.uploadUrl && getUrlData.fileUrl) {
            console.log(`[Mute Video] Uploading to Cloudflare R2 directly: ${item.file.name}`);
            try {
              const putRes = await fetch(getUrlData.uploadUrl, {
                method: 'PUT',
                body: item.file,
                headers: { 'Content-Type': item.file.type || 'video/mp4' }
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
        console.warn("[Mute Video] Failed to upload to Cloudflare R2:", uploadErr);
        if (uploadErr.message.includes('CORS') || uploadErr.message.includes('Cloudflare R2')) {
          throw uploadErr;
        }
      }

      // 2. Call backend endpoint to mute the video
      if (uploadedUrl) {
        console.log(`[Mute Video] Triggering R2-based mute-video: ${uploadedUrl}`);
        response = await fetch('/api/mute-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: uploadedUrl, pathKey: getUrlData?.pathKey })
        });
      } else {
        console.log(`[Mute Video] Falling back to multipart form-data upload: ${item.file.name}`);
        const formData = new FormData();
        formData.append('video', item.file);
        response = await fetch('/api/mute-video', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menghilangkan suara video.');
      }

      // 3. Handle response (S3/R2 flow returns JSON containing downloadUrl, multipart form returns file stream)
      let url = '';
      const responseContentType = response.headers.get('content-type') || '';
      if (responseContentType.includes('application/json')) {
        const jsonRes = await response.json();
        if (!jsonRes.downloadUrl) throw new Error('Muted video URL not found in server response.');
        url = jsonRes.downloadUrl;
      } else {
        const blob = await response.blob();
        url = window.URL.createObjectURL(blob);
      }

      return {
        ...item,
        progress: 'done',
        downloadUrl: url,
        mutedFileName: `muted_${baseName}${extension}`,
        error: undefined
      };
    } catch (err: any) {
      console.error(`Error processing file ${item.file.name}:`, err);
      return {
        ...item,
        progress: 'failed',
        error: err.message || 'Terjadi kesalahan saat memproses video.'
      };
    }
  };

  const handleMuteBatch = async () => {
    if (files.length === 0 || globalIsProcessing) return;

    if (!isLicensed && dailyGenCount >= 25) {
      setGlobalError(t.mute_error_trial || "Batas Trial Terlampaui. Anda telah mencapai batas maksimal 25 video mute hari ini.");
      if (setShowLimitModal) {
        setShowLimitModal(true);
      }
      return;
    }

    setGlobalIsProcessing(true);
    setGlobalError(null);

    // Mute all files that are currently 'idle' or 'failed'
    const updatedFiles = [...files];
    const itemsToProcess = updatedFiles.filter(f => f.progress === 'idle' || f.progress === 'failed');

    if (itemsToProcess.length === 0) {
      setGlobalIsProcessing(false);
      return;
    }

    // Set their status to 'processing'
    setFiles(prev => 
      prev.map(item => 
        item.progress === 'idle' || item.progress === 'failed' 
          ? { ...item, progress: 'processing' as const } 
          : item
      )
    );

    let activeCount = dailyGenCount;

    // Process sequentially or with small concurrency to avoid server overload
    for (const item of itemsToProcess) {
      if (!isLicensed && activeCount >= 25) {
        setGlobalError(t.mute_error_trial || "Batas Trial Terlampaui. Anda telah mencapai batas maksimal 25 video mute hari ini.");
        if (setShowLimitModal) {
          setShowLimitModal(true);
        }
        // Revert any pending items in processing status to idle
        setFiles(prev =>
          prev.map(f => f.progress === 'processing' ? { ...f, progress: 'idle' as const } : f)
        );
        break;
      }

      // Update state to show which file is actively being processed
      setFiles(prev =>
        prev.map(f => (f.id === item.id ? { ...f, progress: 'processing' as const } : f))
      );

      const processedResult = await processSingleFileItem(item);

      if (processedResult.progress === 'done') {
        activeCount++;
        if (incrementDailyCount) {
          incrementDailyCount(1);
        }
      }

      setFiles(prev =>
        prev.map(f => (f.id === item.id ? processedResult : f))
      );

      // Trigger auto-download if active and completed successfully
      if (autoDownloadRef.current && processedResult.progress === 'done' && processedResult.downloadUrl) {
        const link = document.createElement('a');
        link.href = processedResult.downloadUrl;
        link.download = processedResult.mutedFileName || 'muted_video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }

    setGlobalIsProcessing(false);
  };

  const handleDownloadAll = () => {
    const completedFiles = files.filter(f => f.progress === 'done' && f.downloadUrl);
    if (completedFiles.length === 0) return;

    completedFiles.forEach((f, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = f.downloadUrl!;
        link.download = f.mutedFileName || 'muted_video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 300); // Stagger downloads to prevent browser blocking
    });
  };

  const handleResetAll = () => {
    // Clear all created object URLs
    files.forEach(f => {
      if (f.downloadUrl) {
        window.URL.revokeObjectURL(f.downloadUrl);
      }
    });
    setFiles([]);
    setActivePreviewId(null);
    setGlobalIsProcessing(false);
    setGlobalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalFilesCount = files.length;
  const processedCount = files.filter(f => f.progress === 'done').length;
  const processingCount = files.filter(f => f.progress === 'processing').length;
  const failedCount = files.filter(f => f.progress === 'failed').length;
  const pendingCount = files.filter(f => f.progress === 'idle').length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-500 shadow-md">
              <VolumeX size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                {t.mute_title || "Batch Mute Video Gen"}
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-mono">
                {t.mute_subtitle || "Hilangkan suara dari banyak berkas video stock secara instan & lossless sekaligus"}
              </p>
            </div>
          </div>
        </div>

        {totalFilesCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              disabled={globalIsProcessing}
              className="px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50"
            >
              {t.mute_btn_clear || "Hapus Semua"}
            </button>
          </div>
        )}
      </div>

      {/* Free Trial Limit Banner */}
      {!isLicensed && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dailyGenCount >= 25 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white font-mono">
                MUTE VIDEO LIMIT CONTROLLER
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              {dailyGenCount >= 25 ? (
                <span className="text-rose-500 font-bold">{t.mute_trial_expired}</span>
              ) : (
                <span>
                  {t.mute_trial_remaining?.replace('{remaining}', String(25 - dailyGenCount))}
                </span>
              )}
            </p>
          </div>
          <div className="w-full md:w-64 space-y-2 shrink-0">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
              <span>{dailyGenCount} / 25 MUTED</span>
              <span>{Math.max(0, 25 - dailyGenCount)} REMAINING</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-white/5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${dailyGenCount >= 25 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (dailyGenCount / 25) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload / Queue Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Uploader Box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              dragActive 
                ? 'border-rose-500 bg-rose-500/10 scale-[1.01]' 
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 hover:border-rose-500/40 hover:bg-rose-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-rose-500/10 text-rose-500">
                <Upload size={32} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {t.mute_drag_drop || "Tarik & Letakkan beberapa file video di sini"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t.mute_formats_supported || "Mendukung banyak file MP4, MOV, WebM sekaligus (Maks 500MB per file)"}
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={globalIsProcessing}
                className="px-6 py-2.5 rounded-full text-xs font-black bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95 disabled:opacity-50"
              >
                {t.mute_btn_choose || "PILIH BERKAS VIDEO"}
              </button>
            </div>
          </div>

          {/* Feedback/Errors */}
          {r2Configured === false && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 dark:bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3"
            >
              <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-left">
                <h4 className="text-[10px] font-black tracking-wider uppercase text-amber-700 dark:text-amber-400">
                  {t.language === 'Bahasa' ? 'SARAN KONFIGURASI CLOUDFLARE R2' : 'CLOUDFLARE R2 RECOMMENDED'}
                </h4>
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.language === 'Bahasa' 
                    ? 'Vercel membatasi ukuran request maksimum 4.5MB. Untuk memproses berkas video besar tanpa batasan ukuran payload, silakan konfigurasikan Cloudflare R2 di Settings menu.'
                    : 'Vercel limits request payloads to 4.5MB. To process large video files with no file size limitations, please configure Cloudflare R2 in the Settings menu.'
                  }
                </p>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-semibold"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Info</p>
                  <p className="text-red-400/90 mt-0.5">{globalError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File Queue List */}
          {totalFilesCount > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
              {/* Batch Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {(t.mute_queue_title || "Daftar Antrean Video ({count})").replace('{count}', totalFilesCount.toString())}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      {t.mute_stat_done || "Selesai"}: <span className="text-emerald-500">{processedCount}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      {t.mute_stat_processing || "Proses"}: <span className="text-rose-500">{processingCount}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      {t.mute_stat_failed || "Gagal"}: <span className="text-red-500">{failedCount}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      {t.mute_stat_pending || "Menunggu"}: <span className="text-slate-500 dark:text-slate-300">{pendingCount}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Auto Download Toggle Switch */}
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-2xl border border-slate-100 dark:border-white/10">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoDownload}
                      onClick={() => setAutoDownload(!autoDownload)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoDownload ? "bg-rose-500" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoDownload ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <div className="flex flex-col text-left select-none">
                      <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 leading-none">
                        {t.mute_auto_download_label || "Auto-Unduh"}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold leading-none mt-0.5 uppercase tracking-wide">
                        {t.mute_auto_download_desc || "Unduh otomatis saat selesai"}
                      </span>
                    </div>
                  </div>

                  {pendingCount + failedCount > 0 && (
                    <button
                      onClick={handleMuteBatch}
                      disabled={globalIsProcessing || (!isLicensed && dailyGenCount >= 25)}
                      className={`px-5 py-2 rounded-full text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                        !isLicensed && dailyGenCount >= 25
                          ? "bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                          : "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/10"
                      }`}
                    >
                      {globalIsProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={13} />
                          {(t.mute_btn_processing || "MEMPROSES BATCH ({current}/{total})...")
                            .replace('{current}', processedCount.toString())
                            .replace('{total}', totalFilesCount.toString())}
                        </>
                      ) : (
                        <>
                          <VolumeX size={13} />
                          {!isLicensed && dailyGenCount >= 25 ? (t.mute_trial_expired || "LIMIT EXCEEDED") : (t.mute_btn_mute_queue || "MUTE ANTRIAN VIDEO")}
                        </>
                      )}
                    </button>
                  )}

                  {processedCount > 0 && (
                    <button
                      onClick={handleDownloadAll}
                      className="px-5 py-2 rounded-full text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
                    >
                      <Download size={13} />
                      {(t.mute_btn_download_all || "UNDUH SEMUA ({count})").replace('{count}', processedCount.toString())}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {globalIsProcessing && (
                <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(processedCount / totalFilesCount) * 100}%` }}
                  />
                </div>
              )}

              {/* Queue Items List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {files.map((item) => {
                    const isActivePreview = activePreviewId === item.id;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isActivePreview
                            ? 'border-rose-500 bg-rose-500/5 dark:bg-rose-500/10 shadow-md'
                            : 'border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden mr-4">
                          <button
                            onClick={() => setActivePreviewId(item.id)}
                            className={`p-2 rounded-xl shrink-0 transition-colors ${
                              isActivePreview
                                ? 'bg-rose-500 text-white'
                                : 'bg-rose-500/10 text-rose-500 hover:bg-rose-50 hover:text-white'
                            }`}
                            title="Tinjau & Putar Video"
                          >
                            <Play size={14} />
                          </button>

                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {
                                item.progress === 'done' ? (t.mute_stat_done || 'DONE') :
                                item.progress === 'processing' ? (t.mute_stat_processing || 'PROCESSING') :
                                item.progress === 'failed' ? (t.mute_stat_failed || 'FAILED') :
                                (t.mute_stat_pending || 'PENDING')
                              }
                            </p>
                          </div>
                        </div>

                        {/* Status / Right Side Controls */}
                        <div className="flex items-center space-x-3 shrink-0">
                          {item.progress === 'processing' && (
                            <div className="flex items-center space-x-1 text-xs font-semibold text-rose-500">
                              <Loader2 className="animate-spin" size={12} />
                              <span className="hidden sm:inline">{t.mute_status_muting || "Muting..."}</span>
                            </div>
                          )}

                          {item.progress === 'done' && (
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full uppercase hidden sm:inline">
                                {t.mute_status_success || "Sukses"}
                              </span>
                              {item.downloadUrl && (
                                <a
                                  href={item.downloadUrl}
                                  download={item.mutedFileName || 'muted.mp4'}
                                  className="p-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all"
                                  title="Unduh File Muted"
                                >
                                  <Download size={12} />
                                </a>
                              )}
                            </div>
                          )}

                          {item.progress === 'failed' && (
                            <div className="flex items-center space-x-2 text-red-500" title={item.error}>
                              <ShieldAlert size={14} />
                              <span className="text-[10px] bg-red-500/10 font-bold px-2 py-0.5 rounded-full uppercase hidden sm:inline">
                                {t.mute_status_failed_badge || "Gagal"}
                              </span>
                            </div>
                          )}

                          {item.progress === 'idle' && (
                            <span className="text-[10px] bg-slate-100 dark:bg-white/5 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase hidden sm:inline">
                              {t.mute_status_pending_badge || "Menunggu"}
                            </span>
                          )}

                          <button
                            onClick={() => handleRemoveFile(item.id)}
                            disabled={globalIsProcessing}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-all disabled:opacity-50"
                            title={t.mute_tooltip_remove || "Hapus dari antrean"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Selected Preview / Help column */}
        <div className="space-y-6">
          {/* Active Preview Player */}
          {activePreviewFile ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-500">
                  <Play size={16} />
                  <h3 className="text-xs font-black uppercase tracking-wider font-mono">
                    {t.mute_preview_title || "Pratinjau Media"}
                  </h3>
                </div>
                <span className="text-[10px] bg-rose-500/10 text-rose-500 font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                  {
                    activePreviewFile.progress === 'done' ? (t.mute_stat_done || 'DONE') :
                    activePreviewFile.progress === 'processing' ? (t.mute_stat_processing || 'PROCESSING') :
                    activePreviewFile.progress === 'failed' ? (t.mute_stat_failed || 'FAILED') :
                    (t.mute_stat_pending || 'PENDING')
                  }
                </span>
              </div>

              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
                <video 
                  key={activePreviewFile.id}
                  src={URL.createObjectURL(activePreviewFile.file)} 
                  controls 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 break-all leading-normal">
                  {activePreviewFile.file.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  {t.mute_preview_size || "Ukuran"}: {(activePreviewFile.file.size / (1024 * 1024)).toFixed(2)} MB • {t.mute_preview_format || "Format"}: {activePreviewFile.file.type}
                </p>

                {activePreviewFile.error && (
                  <p className="text-[10px] text-red-500 mt-2 bg-red-500/10 p-2 rounded-lg border border-red-500/10">
                    <strong>{t.mute_preview_error || "Kesalahan"}:</strong> {activePreviewFile.error}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl p-8 text-center text-slate-400">
              <FileVideo size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold">{t.mute_preview_empty || "Pilih video dari daftar antrean untuk memutar pratinjau"}</p>
            </div>
          )}

          {/* Guidelines info card */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-500">
              <Sparkles size={16} />
              <h2 className="text-xs font-black uppercase tracking-wider font-mono">
                {t.mute_guide_title || "Panduan Penggunaan"}
              </h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-2.5">
                <span className="text-rose-500 font-bold text-xs mt-0.5">1</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <strong>{t.mute_guide_step1_title || "Pilih Berkas"}:</strong> {t.mute_guide_step1_desc || "Seret beberapa video atau klik tombol pilih berkas di atas."}
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="text-rose-500 font-bold text-xs mt-0.5">2</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <strong>{t.mute_guide_step2_title || "Mulai Proses"}:</strong> {t.mute_guide_step2_desc || "Klik tombol Mute Antrian Video untuk menghilangkan suara semua video sekaligus secara berurutan."}
                </p>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="text-rose-500 font-bold text-xs mt-0.5">3</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <strong>{t.mute_guide_step3_title || "Unduh Hasil"}:</strong> {t.mute_guide_step3_desc || "Unduh satu per satu menggunakan tombol di samping nama file, atau klik Unduh Semua untuk mengunduh semua video sukses sekaligus."}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/5">
              <p className="text-[10px] text-slate-400/90 leading-relaxed uppercase font-mono font-bold">
                {t.mute_guide_footer || "🔒 Semua file diproses secara lokal di server sandbox yang aman, dan akan segera dihancurkan setelah pengunduhan selesai."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
