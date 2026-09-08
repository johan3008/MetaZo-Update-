import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, 
  Upload, 
  Loader2, 
  Download, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  FileCode, 
  ShieldAlert, 
  ArrowRight, 
  Layers, 
  Sliders, 
  Check, 
  FolderArchive,
  Info,
  CheckCircle,
  FileCheck,
  Zap,
  ExternalLink,
  Cpu,
  Server,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ADOBE_STOCK_PRESETS, 
  ArtboardPreset, 
  parseSvgDimensions, 
  resizeSvgArtboard, 
  convertSvgToEps, 
  convertSvgToAi, 
  convertEpsToAi,
  checkVectorEngineStatus,
  convertVectorViaBackend,
  VectorEngineInfo
} from '../utils/vectorConverter';
import { embedMicrostockMetadata, createZipBlob } from '../utils/microstockEmbedder';
import { VectorStudioModal } from './VectorStudioModal';

interface ConvertVectorGenViewProps {
  t: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
}

export type TargetFormat = 'eps' | 'ai' | 'both' | 'pdf' | 'svg' | 'all';

export interface VectorQueueItem {
  id: string;
  file: File;
  originalWidth: number;
  originalHeight: number;
  format: 'svg' | 'eps' | 'ai';
  progress: 'idle' | 'processing' | 'done' | 'failed';
  previewSvg?: string;
  processedBlobs?: { name: string; blob: Blob }[];
  error?: string;
}

export const ConvertVectorGenView: React.FC<ConvertVectorGenViewProps> = ({
  t,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal,
  setShowActivationModal
}) => {
  const [items, setItems] = useState<VectorQueueItem[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ArtboardPreset>(ADOBE_STOCK_PRESETS[0]);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('eps');
  const [marginPercent, setMarginPercent] = useState<number>(10);
  const [textToPath, setTextToPath] = useState<boolean>(true);
  const [autoEmbedMetadata, setAutoEmbedMetadata] = useState<boolean>(true);
  const [autoDownload, setAutoDownload] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [engineInfo, setEngineInfo] = useState<VectorEngineInfo | null>(null);
  const [isCheckingEngine, setIsCheckingEngine] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshEngineStatus = async () => {
    setIsCheckingEngine(true);
    try {
      const info = await checkVectorEngineStatus();
      setEngineInfo(info);
    } catch (_) {
    } finally {
      setIsCheckingEngine(false);
    }
  };

  useEffect(() => {
    refreshEngineStatus();
  }, []);

  const activeItem = items.find(i => i.id === activePreviewId) || items[0];

  const currentWidth = selectedPreset.width;
  const currentHeight = selectedPreset.height;
  const currentMegapixels = ((currentWidth * currentHeight) / 1000000).toFixed(1);

  const handleSaveStudioData = (updatedSvg: string, newW: number, newH: number, newMargin: number) => {
    if (!activeItem) return;
    setMarginPercent(newMargin);
    const matchedPreset = ADOBE_STOCK_PRESETS.find(p => p.width === newW && p.height === newH);
    if (matchedPreset) {
      setSelectedPreset(matchedPreset);
    }
    setItems(prev => prev.map(item => {
      if (item.id === activeItem.id) {
        return {
          ...item,
          previewSvg: updatedSvg,
          originalWidth: newW,
          originalHeight: newH
        };
      }
      return item;
    }));
  };
  const meetsAdobeStock = (currentWidth * currentHeight) >= 4000000;

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setGlobalError(null);

    const newItems: VectorQueueItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!['svg', 'eps', 'ai'].includes(ext)) {
        continue;
      }

      const id = 'vec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      let origW = 1000;
      let origH = 1000;
      let previewSvg = '';

      if (ext === 'svg') {
        try {
          const text = await file.text();
          const parsed = parseSvgDimensions(text);
          origW = Math.round(parsed.width);
          origH = Math.round(parsed.height);
          previewSvg = text;
        } catch (_) {}
      }

      newItems.push({
        id,
        file,
        originalWidth: origW,
        originalHeight: origH,
        format: ext as 'svg' | 'eps' | 'ai',
        progress: 'idle',
        previewSvg
      });
    }

    if (newItems.length === 0) {
      setGlobalError('Format file tidak didukung. Silakan pilih file vektor .SVG, .EPS, atau .AI');
      return;
    }

    setItems(prev => [...prev, ...newItems]);
    if (!activePreviewId && newItems.length > 0) {
      setActivePreviewId(newItems[0].id);
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (activePreviewId === id) {
        setActivePreviewId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const clearAll = () => {
    setItems([]);
    setActivePreviewId(null);
    setGlobalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processItem = async (item: VectorQueueItem): Promise<{ name: string; blob: Blob }[]> => {
    const baseName = item.file.name.replace(/\.[^/.]+$/, '');
    const results: { name: string; blob: Blob }[] = [];

    let workingSvg = item.previewSvg;

    const meta = {
      title: baseName.replace(/[-_]+/g, ' ').trim(),
      description: baseName.replace(/[-_]+/g, ' ').trim() + ' vector graphic design artboard',
      keywords: [baseName.split(/[-_]+/), 'vector', 'eps', 'ai', 'illustration', 'graphic', 'design', 'modern', 'commercial', 'adobe stock'].flat().filter(Boolean),
      creator: 'MetaZo Contributor',
      software: 'Adobe Illustrator / MetaZo PRO Convert VectorGen'
    };

    // Determine target formats to export
    const formatsToExport: ('eps' | 'ai' | 'pdf' | 'svg')[] = [];
    if (targetFormat === 'eps') formatsToExport.push('eps');
    else if (targetFormat === 'ai') formatsToExport.push('ai');
    else if (targetFormat === 'pdf') formatsToExport.push('pdf');
    else if (targetFormat === 'svg') formatsToExport.push('svg');
    else if (targetFormat === 'both') formatsToExport.push('eps', 'ai');
    else if (targetFormat === 'all') formatsToExport.push('eps', 'ai', 'pdf', 'svg');

    for (const fmt of formatsToExport) {
      let convertedBlob: Blob | null = null;
      let outFileName = `${baseName}_AdobeStock.${fmt}`;

      // 1. Try High-Fidelity Inkscape Engine (FastAPI Docker or Host CLI) via backend
      try {
        const backendRes = await convertVectorViaBackend({
          file: item.file,
          fileName: item.file.name,
          targetFormat: fmt,
          targetWidth: currentWidth,
          targetHeight: currentHeight,
          marginPercent,
          textToPath,
          metadata: autoEmbedMetadata ? meta : undefined
        });

        if (backendRes && backendRes.blob && backendRes.blob.size > 0) {
          convertedBlob = backendRes.blob;
          outFileName = backendRes.fileName;
        }
      } catch (backendErr) {
        console.warn(`[VECTOR ENGINE] Backend conversion failed for ${fmt}, using native fallback:`, backendErr);
      }

      // 2. Fallback to Client Transpiler if backend was unreachable or threw an error
      if (!convertedBlob) {
        if (item.format === 'svg') {
          if (!workingSvg) {
            workingSvg = await item.file.text();
          }
          const resizedSvg = resizeSvgArtboard(workingSvg, currentWidth, currentHeight, marginPercent);

          if (fmt === 'eps') {
            const epsBytes = convertSvgToEps(resizedSvg, currentWidth, currentHeight);
            let epsBlob = new Blob([epsBytes], { type: 'application/postscript' });
            if (autoEmbedMetadata) {
              try {
                epsBlob = await embedMicrostockMetadata(new File([epsBlob], baseName + '.eps', { type: 'application/postscript' }), meta);
              } catch (_) {}
            }
            convertedBlob = epsBlob;
            outFileName = `${baseName}_AdobeStock.eps`;
          } else if (fmt === 'ai' || fmt === 'pdf') {
            const aiBytes = convertSvgToAi(resizedSvg, currentWidth, currentHeight);
            let aiBlob = new Blob([aiBytes], { type: fmt === 'ai' ? 'application/illustrator' : 'application/pdf' });
            if (autoEmbedMetadata) {
              try {
                aiBlob = await embedMicrostockMetadata(new File([aiBlob], `${baseName}.${fmt}`, { type: 'application/illustrator' }), meta);
              } catch (_) {}
            }
            convertedBlob = aiBlob;
            outFileName = `${baseName}_AdobeStock.${fmt}`;
          } else if (fmt === 'svg') {
            let svgBlob = new Blob([resizedSvg], { type: 'image/svg+xml' });
            if (autoEmbedMetadata) {
              try {
                svgBlob = await embedMicrostockMetadata(new File([svgBlob], `${baseName}.svg`, { type: 'image/svg+xml' }), meta);
              } catch (_) {}
            }
            convertedBlob = svgBlob;
            outFileName = `${baseName}_AdobeStock.svg`;
          }
        } else if (item.format === 'eps') {
          const arrayBuffer = await item.file.arrayBuffer();
          if (fmt === 'ai') {
            const aiBytes = convertEpsToAi(new Uint8Array(arrayBuffer), currentWidth, currentHeight);
            let aiBlob = new Blob([aiBytes], { type: 'application/illustrator' });
            if (autoEmbedMetadata) {
              try {
                aiBlob = await embedMicrostockMetadata(new File([aiBlob], baseName + '.ai', { type: 'application/illustrator' }), meta);
              } catch (_) {}
            }
            convertedBlob = aiBlob;
            outFileName = `${baseName}_Converted.ai`;
          } else {
            convertedBlob = new Blob([arrayBuffer], { type: 'application/postscript' });
            outFileName = `${baseName}_AdobeStock.eps`;
          }
        } else if (item.format === 'ai') {
          const arrayBuffer = await item.file.arrayBuffer();
          if (fmt === 'eps') {
            const epsBytes = convertEpsToAi(new Uint8Array(arrayBuffer), currentWidth, currentHeight);
            convertedBlob = new Blob([epsBytes], { type: 'application/postscript' });
            outFileName = `${baseName}_Converted.eps`;
          } else {
            convertedBlob = new Blob([arrayBuffer], { type: 'application/illustrator' });
            outFileName = `${baseName}_Converted.ai`;
          }
        }
      }

      if (convertedBlob) {
        results.push({ name: outFileName, blob: convertedBlob });
      }
    }

    return results;
  };

  const handleProcessAll = async () => {
    if (items.length === 0 || isProcessing) return;

    if (!isLicensed && dailyGenCount >= 25) {
      setGlobalError('Batas Trial Terlampaui. Anda telah mencapai batas 25 konversi gratis hari ini.');
      if (setShowLimitModal) setShowLimitModal(true);
      return;
    }

    setIsProcessing(true);
    setGlobalError(null);

    let activeCount = dailyGenCount;

    for (const item of items) {
      if (item.progress === 'done') continue;

      if (!isLicensed && activeCount >= 25) {
        setGlobalError('Batas Trial Terlampaui. Anda telah mencapai batas maksimal 25 konversi vektor hari ini.');
        if (setShowLimitModal) setShowLimitModal(true);
        break;
      }

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'processing', error: undefined } : i));

      try {
        const blobs = await processItem(item);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'done', processedBlobs: blobs } : i));
        activeCount++;
        if (incrementDailyCount) incrementDailyCount(1);

        if (autoDownload && blobs.length > 0) {
          blobs.forEach(b => downloadBlob(b.blob, b.name));
        }
      } catch (err: any) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'failed', error: err.message || 'Gagal konversi' } : i));
      }
    }

    setIsProcessing(false);
  };

  const handleDownloadAllZip = async () => {
    const allFiles: { name: string; data: Blob }[] = [];
    for (const item of items) {
      if (item.processedBlobs && item.processedBlobs.length > 0) {
        for (const b of item.processedBlobs) {
          allFiles.push({ name: b.name, data: b.blob });
        }
      }
    }

    if (allFiles.length === 0) return;

    try {
      const zipBlob = await createZipBlob(allFiles);
      downloadBlob(zipBlob, `MetaZo_ConvertVectorGen_${Date.now()}.zip`);
    } catch (e: any) {
      setGlobalError('Gagal membuat file zip: ' + e.message);
    }
  };

  const totalFilesCount = items.length;
  const processedCount = items.filter(f => f.progress === 'done').length;
  const processingCount = items.filter(f => f.progress === 'processing').length;
  const failedCount = items.filter(f => f.progress === 'failed').length;
  const pendingCount = items.filter(f => f.progress === 'idle').length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Title Header Matching App Theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500 shadow-md">
              <Maximize2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                  Convert VectorGen
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Adobe Stock 4MP+ Compliant
                </span>
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                  engineInfo?.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}>
                  <Cpu size={12} className={isCheckingEngine ? 'animate-spin text-emerald-500' : ''} />
                  <span>
                    {engineInfo?.engine === 'docker_fastapi' 
                      ? 'Engine: Inkscape CLI (Docker Container)' 
                      : engineInfo?.engine === 'host_inkscape' 
                      ? 'Engine: Inkscape CLI (Host Engine)' 
                      : 'Engine: Vector Transpiler (Fallback)'}
                  </span>
                  <button 
                    onClick={refreshEngineStatus} 
                    title="Refresh status engine" 
                    className="ml-1 hover:text-emerald-500 transition-colors"
                  >
                    <RefreshCw size={10} className={isCheckingEngine ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-mono">
                Konversi batch SVG ➔ EPS 10, AI, PDF & Auto-Resize ke 5000x5000 px (25 MP) dengan Safe Margins
              </p>
            </div>
          </div>
        </div>

        {totalFilesCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50"
            >
              {t.common_clear || "Hapus Semua"}
            </button>
          </div>
        )}
      </div>

      {/* Free Trial Limit Controller Banner */}
      {!isLicensed && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dailyGenCount >= 25 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white font-mono">
                VECTOR CONVERSION LIMIT CONTROLLER
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              {dailyGenCount >= 25 ? (
                <span className="text-rose-500 font-bold">⚠️ Batas trial gratis harian (25 file) telah dicapai. Masukkan lisensi MetaZo PRO untuk memproses tanpa batas.</span>
              ) : (
                <span>Masa Trial gratis 25 file/hari. Sisa kuota hari ini: <strong>{Math.max(0, 25 - dailyGenCount)}</strong> kali</span>
              )}
            </p>
          </div>
          <div className="w-full md:w-64 space-y-2 shrink-0">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
              <span>{dailyGenCount} / 25 CONVERTED</span>
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

      {/* Main Grid: Upload & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Uploader & Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Uploader Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-3xl p-8 text-center transition-all border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.eps,.ai"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                <Upload size={32} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Tarik & Letakkan file vektor di sini (.SVG, .EPS, .AI)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Mendukung file vektor dari Figma, Canva, Midjourney, Recraft, Inkscape, dll.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-full text-xs font-black bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                PILIH BERKAS VEKTOR
              </button>
            </div>
          </div>

          {/* Feedback/Errors */}
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
                  <p className="font-bold">Perhatian</p>
                  <p className="text-red-400/90 mt-0.5">{globalError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File Queue List */}
          {totalFilesCount > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Daftar Antrean Vektor ({totalFilesCount})
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      Selesai: <span className="text-emerald-500">{processedCount}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      Proses: <span className="text-emerald-500">{processingCount}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      Gagal: <span className="text-red-500">{failedCount}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      Menunggu: <span className="text-slate-500 dark:text-slate-300">{pendingCount}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Auto Download Toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-2xl border border-slate-100 dark:border-white/10">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoDownload}
                      onClick={() => setAutoDownload(!autoDownload)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoDownload ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoDownload ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200">
                      Auto-Unduh
                    </span>
                  </div>

                  {processedCount > 0 && (
                    <button
                      onClick={handleDownloadAllZip}
                      className="px-4 py-2 rounded-full text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                    >
                      <FolderArchive size={14} />
                      <span>Unduh ZIP ({processedCount})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {items.map((item) => {
                  const isSelected = activeItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActivePreviewId(item.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center uppercase text-[10px] font-black shrink-0">
                          {item.format}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.file.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.originalWidth}x{item.originalHeight} px • {(item.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {item.progress === 'processing' && <Loader2 size={16} className="animate-spin text-emerald-500" />}
                        {item.progress === 'done' && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {item.progress === 'failed' && <AlertCircle size={16} className="text-rose-500" />}

                        {item.processedBlobs && item.processedBlobs.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              item.processedBlobs?.forEach(b => downloadBlob(b.blob, b.name));
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                            title="Unduh hasil file"
                          >
                            <Download size={13} />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Hapus dari antrean"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Settings, Preview & Actions */}
        <div className="space-y-6">
          {/* Settings Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Sliders size={16} className="text-emerald-500" />
              <span>Pengaturan Ekspor</span>
            </h3>

            {/* Target Format */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                Format Output
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetFormat('eps')}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    targetFormat === 'eps'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <p className="text-xs font-black">EPS (EPS 10)</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Adobe Stock & Microstock</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('ai')}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    targetFormat === 'ai'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <p className="text-xs font-black">AI (Illustrator)</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">CS6 - CC 2026 Compatible</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('pdf')}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    targetFormat === 'pdf'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <p className="text-xs font-black">PDF (Vector)</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">High-Res Print Vector</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('svg')}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    targetFormat === 'svg'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <p className="text-xs font-black">SVG (Artboard)</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Standardized 5000px</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('both')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    targetFormat === 'both'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black">EPS + AI</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Multi-Agensi</p>
                  </div>
                  <Sparkles size={14} className="text-emerald-500 shrink-0 ml-1" />
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('all')}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    targetFormat === 'all'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black">All Formats</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">EPS, AI, PDF, SVG</p>
                  </div>
                  <Sparkles size={14} className="text-emerald-500 shrink-0 ml-1" />
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                Ukuran Artboard Adobe Stock
              </label>
              <div className="space-y-1.5">
                {ADOBE_STOCK_PRESETS.map((preset) => {
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-slate-800 dark:text-white">{preset.name}</p>
                          {preset.isRecommended && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500 text-white">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{preset.description}</p>
                      </div>
                      {isSelected && <Check size={14} className="text-emerald-500 shrink-0 ml-2" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Margin Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  Safe Margin ({marginPercent}%)
                </label>
                <span className="text-[10px] font-bold text-slate-400 font-mono">10% Safe Guard</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                value={marginPercent}
                onChange={(e) => setMarginPercent(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Text to Path Vectorization Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="pr-2">
                <p className="text-xs font-black text-slate-800 dark:text-white">Text-to-Path Vectorization</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Mengonversi teks ke kurva vektor agar tidak ditolak Adobe Stock karena missing font.
                </p>
              </div>
              <input
                type="checkbox"
                checked={textToPath}
                onChange={(e) => setTextToPath(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Metadata Auto-Embed Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="pr-2">
                <p className="text-xs font-black text-slate-800 dark:text-white">Auto-Embed Metadata Microstock</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Menanamkan Title, Keywords, dan Hak Cipta langsung ke EPS & AI.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoEmbedMetadata}
                onChange={(e) => setAutoEmbedMetadata(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProcessAll}
                disabled={items.length === 0 || isProcessing || (!isLicensed && dailyGenCount >= 25)}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                  items.length === 0 || isProcessing || (!isLicensed && dailyGenCount >= 25)
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 active:scale-95'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memproses Vektor...</span>
                  </>
                ) : (
                  <>
                    <Maximize2 size={16} />
                    <span>Konversi & Resize {items.length > 0 ? `(${items.length} File)` : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Artboard Canvas Preview Card */}
          {activeItem && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                  <Eye size={14} className="text-emerald-500" />
                  <span>Pratinjau Kanvas</span>
                </h3>
                <span className={`text-[10px] font-mono font-bold ${meetsAdobeStock ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {currentWidth}x{currentHeight} ({currentMegapixels} MP)
                </span>
              </div>

              {/* Artboard Canvas Frame */}
              <div 
                className="relative bg-white shadow-inner rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden mx-auto"
                style={{
                  width: '240px',
                  height: `${Math.round((240 * currentHeight) / currentWidth)}px`,
                  maxHeight: '260px'
                }}
              >
                {/* Safe Margin Guide */}
                <div 
                  className="absolute border border-dashed border-emerald-400/60 pointer-events-none rounded z-10 p-1"
                  style={{ inset: `${marginPercent}%` }}
                >
                  <span className="text-[7px] font-mono font-bold text-emerald-600 uppercase">Margin {marginPercent}%</span>
                </div>

                {activeItem.previewSvg ? (
                  <div 
                    className="w-full h-full flex items-center justify-center p-2"
                    dangerouslySetInnerHTML={{
                      __html: resizeSvgArtboard(activeItem.previewSvg, 220, Math.round((220 * currentHeight) / currentWidth), marginPercent)
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                    <FileCode size={32} className="mb-1 text-slate-300" />
                    <p className="text-[10px] font-bold">{activeItem.file.name}</p>
                    <p className="text-[8px] text-slate-400">Siap Dikonversi</p>
                  </div>
                )}
              </div>

              {/* Edit in Illustrator Studio Button */}
              {activeItem.previewSvg && (
                <button
                  type="button"
                  onClick={() => setIsStudioOpen(true)}
                  className="w-full py-2 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Edit di Illustrator Vector Studio</span>
                </button>
              )}

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <ShieldAlert size={14} className="text-emerald-500 shrink-0" />
                <span>Garis hijau putus-putus menunjukkan area batas aman agar tidak dipotong kurator.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vector Studio Modal (Full Illustrator Style Vector Workspace) */}
      {activeItem && activeItem.previewSvg && (
        <VectorStudioModal
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          fileName={activeItem.file.name}
          initialSvg={activeItem.previewSvg}
          artboardWidth={currentWidth}
          artboardHeight={currentHeight}
          marginPercent={marginPercent}
          onSave={handleSaveStudioData}
        />
      )}
    </div>
  );
};
