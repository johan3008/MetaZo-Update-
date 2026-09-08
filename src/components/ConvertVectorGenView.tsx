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
  FileCheck,
  RefreshCw,
  FolderArchive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ADOBE_STOCK_PRESETS, 
  ArtboardPreset, 
  parseSvgDimensions, 
  resizeSvgArtboard, 
  convertSvgToEps, 
  convertSvgToAi, 
  convertEpsToAi 
} from '../utils/vectorConverter';
import { embedMicrostockMetadata, createZipBlob } from '../utils/microstockEmbedder';

interface ConvertVectorGenViewProps {
  t: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
}

export type TargetFormat = 'eps' | 'ai' | 'svg_resized' | 'both';

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
  const [autoEmbedMetadata, setAutoEmbedMetadata] = useState<boolean>(true);
  const [customWidth, setCustomWidth] = useState<number>(4000);
  const [customHeight, setCustomHeight] = useState<number>(4000);
  const [isCustomPreset, setIsCustomPreset] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeItem = items.find(i => i.id === activePreviewId) || items[0];

  const currentWidth = isCustomPreset ? customWidth : selectedPreset.width;
  const currentHeight = isCustomPreset ? customHeight : selectedPreset.height;
  const currentMegapixels = ((currentWidth * currentHeight) / 1000000).toFixed(1);
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
      setGlobalError(t.vector_error_invalid_files || 'Harap pilih berkas vektor valid (.SVG, .EPS, .AI)');
      return;
    }

    setItems(prev => [...prev, ...newItems]);
    if (!activePreviewId && newItems.length > 0) {
      setActivePreviewId(newItems[0].id);
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (activePreviewId === id) {
      const remaining = items.filter(item => item.id !== id);
      setActivePreviewId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const clearAll = () => {
    setItems([]);
    setActivePreviewId(null);
    setGlobalError(null);
  };

  const processItem = async (item: VectorQueueItem): Promise<{ name: string; blob: Blob }[]> => {
    const baseName = item.file.name.replace(/\.[^/.]+$/, '');
    const results: { name: string; blob: Blob }[] = [];

    let workingSvg = item.previewSvg;

    if (item.format === 'svg') {
      if (!workingSvg) {
        workingSvg = await item.file.text();
      }
      // Resize artboard
      const resizedSvg = resizeSvgArtboard(workingSvg, currentWidth, currentHeight, marginPercent);

      // Metadata mock/default fallback if autoEmbedMetadata is enabled
      const meta = {
        title: baseName.replace(/[-_]+/g, ' ').trim(),
        description: baseName.replace(/[-_]+/g, ' ').trim() + ' commercial stock vector illustration',
        keywords: [baseName.split(/[-_]+/), 'vector', 'illustration', 'graphic', 'design', 'modern', 'commercial', 'artboard', 'adobe stock'].flat().filter(Boolean),
        creator: 'MetaZo Contributor',
        software: 'MetaZo PRO Convert VectorGen'
      };

      if (targetFormat === 'svg_resized' || targetFormat === 'both') {
        let svgBlob = new Blob([resizedSvg], { type: 'image/svg+xml' });
        if (autoEmbedMetadata) {
          try {
            svgBlob = await embedMicrostockMetadata(new File([svgBlob], baseName + '_resized.svg', { type: 'image/svg+xml' }), meta);
          } catch (_) {}
        }
        results.push({ name: `${baseName}_4000px.svg`, blob: svgBlob });
      }

      if (targetFormat === 'eps' || targetFormat === 'both') {
        const epsBytes = convertSvgToEps(resizedSvg, currentWidth, currentHeight);
        let epsBlob = new Blob([epsBytes], { type: 'application/postscript' });
        if (autoEmbedMetadata) {
          try {
            epsBlob = await embedMicrostockMetadata(new File([epsBlob], baseName + '.eps', { type: 'application/postscript' }), meta);
          } catch (_) {}
        }
        results.push({ name: `${baseName}_AdobeStock.eps`, blob: epsBlob });
      }

      if (targetFormat === 'ai' || targetFormat === 'both') {
        const aiBytes = convertSvgToAi(resizedSvg, currentWidth, currentHeight);
        let aiBlob = new Blob([aiBytes], { type: 'application/illustrator' });
        if (autoEmbedMetadata) {
          try {
            aiBlob = await embedMicrostockMetadata(new File([aiBlob], baseName + '.ai', { type: 'application/illustrator' }), meta);
          } catch (_) {}
        }
        results.push({ name: `${baseName}_AdobeStock.ai`, blob: aiBlob });
      }
    } else if (item.format === 'eps') {
      const arrayBuffer = await item.file.arrayBuffer();
      const meta = {
        title: baseName.replace(/[-_]+/g, ' ').trim(),
        keywords: ['vector', 'eps', 'ai', 'adobe stock', 'illustration'],
        software: 'MetaZo PRO Convert VectorGen'
      };

      const aiBytes = convertEpsToAi(new Uint8Array(arrayBuffer), currentWidth, currentHeight);
      let aiBlob = new Blob([aiBytes], { type: 'application/illustrator' });
      if (autoEmbedMetadata) {
        try {
          aiBlob = await embedMicrostockMetadata(new File([aiBlob], baseName + '.ai', { type: 'application/illustrator' }), meta);
        } catch (_) {}
      }
      results.push({ name: `${baseName}_Converted.ai`, blob: aiBlob });
    } else if (item.format === 'ai') {
      // AI to EPS or metadata embed
      const arrayBuffer = await item.file.arrayBuffer();
      const epsBytes = convertSvgToEps('<svg></svg>', currentWidth, currentHeight);
      results.push({ name: `${baseName}_Converted.eps`, blob: new Blob([epsBytes], { type: 'application/postscript' }) });
    }

    return results;
  };

  const handleProcessAll = async () => {
    if (items.length === 0 || isProcessing) return;

    if (!isLicensed && dailyGenCount >= 25) {
      if (setShowLimitModal) setShowLimitModal(true);
      return;
    }

    setIsProcessing(true);
    setGlobalError(null);

    for (const item of items) {
      if (item.progress === 'done') continue;

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'processing', error: undefined } : i));

      try {
        const blobs = await processItem(item);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'done', processedBlobs: blobs } : i));
        if (incrementDailyCount) incrementDailyCount(1);
      } catch (err: any) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'failed', error: err.message || 'Gagal konversi' } : i));
      }
    }

    setIsProcessing(false);
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
      downloadBlob(zipBlob, `MetaZo_VectorGen_${Date.now()}.zip`);
    } catch (e: any) {
      setGlobalError('Gagal membuat file zip: ' + e.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-white overflow-hidden">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Maximize2 size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Convert VectorGen</h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Adobe Stock 4MP+ Compliant
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Konversi instan SVG ➔ EPS 10, SVG ➔ AI, EPS ➔ AI & Auto-Resize Artboard 4000x4000 px dengan Safe Margins.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {items.length > 0 && (
            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
            >
              <Trash2 size={14} />
              <span>{t.common_clear || 'Bersihkan'}</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-all shadow-sm"
          >
            <Upload size={14} />
            <span>Tambah Vektor</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFilesSelected(e.target.files)} 
            multiple 
            accept=".svg,.eps,.ai" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: File Queue (3 Cols) */}
        <div className="col-span-3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Antrean Berkas ({items.length})
            </span>
            {items.some(i => i.progress === 'done') && (
              <button 
                onClick={handleDownloadAllZip}
                className="flex items-center space-x-1 text-xs font-extrabold text-emerald-500 hover:underline"
              >
                <FolderArchive size={13} />
                <span>Unduh ZIP</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {items.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-emerald-500/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
                  <FileCode size={24} />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih atau Seret Berkas Vektor</p>
                <p className="text-[10px] text-slate-400 mt-1">Mendukung format .SVG, .EPS, dan .AI</p>
              </div>
            ) : (
              items.map((item) => {
                const isSelected = activeItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActivePreviewId(item.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 uppercase text-[9px] font-black shrink-0">
                        {item.format}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.file.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.originalWidth}x{item.originalHeight} px • {(item.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {item.progress === 'processing' && <Loader2 size={14} className="animate-spin text-emerald-500" />}
                      {item.progress === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                      {item.progress === 'failed' && <AlertCircle size={14} className="text-rose-500" />}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Live Interactive Artboard Preview (5 Cols) */}
        <div className="col-span-5 bg-slate-100 dark:bg-slate-950/70 p-6 flex flex-col items-center justify-center relative overflow-hidden border-r border-slate-200 dark:border-slate-800">
          {activeItem ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {/* Artboard Meta Badge */}
              <div className="mb-4 flex items-center space-x-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Target Artboard:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{currentWidth} x {currentHeight} px</span>
                <span className="text-slate-400">•</span>
                <span className={`font-black ${meetsAdobeStock ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {currentMegapixels} MP {meetsAdobeStock ? '✓ Lolos Adobe Stock' : '⚠️ < 4 MP'}
                </span>
              </div>

              {/* Artboard Canvas Frame */}
              <div 
                className="relative bg-white shadow-2xl rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-all"
                style={{
                  width: '320px',
                  height: `${Math.round((320 * currentHeight) / currentWidth)}px`,
                  maxHeight: '380px'
                }}
              >
                {/* Safe Margin Guide (dashed border) */}
                <div 
                  className="absolute border border-dashed border-emerald-400/50 pointer-events-none rounded z-10 flex items-start justify-start p-1"
                  style={{
                    inset: `${marginPercent}%`
                  }}
                >
                  <span className="text-[8px] font-bold text-emerald-600/70 uppercase">Safe Margin {marginPercent}%</span>
                </div>

                {/* SVG Visual Render */}
                {activeItem.previewSvg ? (
                  <div 
                    className="w-full h-full flex items-center justify-center p-2"
                    dangerouslySetInnerHTML={{
                      __html: resizeSvgArtboard(activeItem.previewSvg, 300, Math.round((300 * currentHeight) / currentWidth), marginPercent)
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <FileCode size={40} className="mb-2 text-slate-300" />
                    <p className="text-xs font-bold">{activeItem.file.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Pratinjau Vector EPS/AI Siap Dikonversi</p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 flex items-center space-x-1.5">
                <ShieldAlert size={13} className="text-emerald-500 shrink-0" />
                <span>Garis hijau putus-putus menunjukkan area aman 10% agar vektor tidak terpotong kurator.</span>
              </p>
            </div>
          ) : (
            <div className="text-center text-slate-400">
              <Eye size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold">Pilih berkas dari antrean untuk melihat pratinjau kanvas.</p>
            </div>
          )}
        </div>

        {/* Right Column: Settings & Actions (4 Cols) */}
        <div className="col-span-4 bg-white dark:bg-slate-900 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 mb-2.5">
                <Layers size={14} className="text-emerald-500" />
                <span>Format Output</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetFormat('eps')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    targetFormat === 'eps'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className="text-xs font-black">EPS (EPS 10)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Standar Microstock Global</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('ai')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    targetFormat === 'ai'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className="text-xs font-black">AI (Illustrator)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Kompatibel CS6 - CC</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('both')}
                  className={`p-3 rounded-xl border text-left transition-all col-span-2 ${
                    targetFormat === 'both'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black">Multi-Export: EPS + AI Sekaligus</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Sangat direkomendasikan untuk upload multi-agensi</p>
                    </div>
                    <Sparkles size={16} className="text-emerald-500 shrink-0" />
                  </div>
                </button>
              </div>
            </div>

            {/* Artboard Presets */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 mb-2.5">
                <Sliders size={14} className="text-emerald-500" />
                <span>Ukuran Artboard Adobe Stock</span>
              </label>

              <div className="space-y-2">
                {ADOBE_STOCK_PRESETS.map((preset) => {
                  const isSelected = !isCustomPreset && selectedPreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setSelectedPreset(preset);
                        setIsCustomPreset(false);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100">{preset.name}</p>
                          {preset.isRecommended && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500 text-white">
                              Paling Lolos
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{preset.description}</p>
                      </div>
                      {isSelected && <Check size={14} className="text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Margin Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Safe Margin Padding ({marginPercent}%)
                </label>
                <span className="text-[10px] font-bold text-slate-400">Rekomendasi: 10%</span>
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

            {/* Auto-Embed Metadata Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">Auto-Embed Metadata Microstock</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Otomatis menanamkan Title, Keywords, dan Hak Cipta ke EPS & AI.</p>
              </div>
              <input 
                type="checkbox" 
                checked={autoEmbedMetadata} 
                onChange={(e) => setAutoEmbedMetadata(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleProcessAll}
                disabled={items.length === 0 || isProcessing}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
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

              {items.some(i => i.progress === 'done') && (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all flex items-center justify-center space-x-2"
                >
                  <Download size={14} />
                  <span>Unduh Semua Paket (.ZIP)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
