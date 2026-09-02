import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Scissors, Upload, Download, Sparkles, CheckCircle2, Trash2, Eye, 
  RefreshCcw, AlertCircle, Loader2, ArrowRight, Layers, Palette, 
  Maximize2, Image as ImageIcon, Sliders, Check, ExternalLink, ShieldCheck,
  Paintbrush, Eraser, Undo2, RotateCcw, SlidersHorizontal, Sparkle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { removeBackground } from '@imgly/background-removal';

interface BgRemoverViewProps {
  t: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
  onSendToMetadataGen?: (files: File[]) => void;
  uiLanguage?: string;
}

interface BgItem {
  id: string;
  file: File;
  originalUrl: string;
  resultUrl: string | null;
  resultBlob: Blob | null;
  rawBlob?: Blob | null;
  rawUrl?: string | null;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  progressText?: string;
  error?: string;
}

type BgMode = 'transparent' | 'white' | 'black' | 'custom' | 'blur';

// Algoritma High-Precision Edge Refinement (Choke, Feathering & Color Decontamination)
const refineCutoutEdge = (
  originalUrl: string,
  cutoutBlob: Blob,
  chokePx: number = 1.0,
  smoothPx: number = 0.5
): Promise<Blob> => {
  return new Promise((resolve) => {
    const imgCutout = new Image();
    imgCutout.crossOrigin = 'anonymous';

    imgCutout.onload = () => {
      const width = imgCutout.naturalWidth || imgCutout.width;
      const height = imgCutout.naturalHeight || imgCutout.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(cutoutBlob);
        return;
      }

      ctx.drawImage(imgCutout, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // 1. Choke / Morphological Erosion on Alpha (Memotong halo warna latar belakang lama yang bocor di tepi)
      if (chokePx > 0) {
        const alphaCopy = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
          alphaCopy[i] = data[i * 4 + 3];
        }

        const radius = Math.max(1, Math.min(4, Math.round(chokePx)));
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const currentAlpha = alphaCopy[idx];
            if (currentAlpha === 0) continue;

            let minNeighbor = currentAlpha;
            for (let dy = -radius; dy <= radius; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= height) continue;
              for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                const nAlpha = alphaCopy[ny * width + nx];
                if (nAlpha < minNeighbor) {
                  minNeighbor = nAlpha;
                }
              }
            }
            data[idx * 4 + 3] = minNeighbor;
          }
        }
      }

      // 2. Feathering & Anti-Aliasing (Menghaluskan tepi potongan agar bebas dari gerigi/pixelated)
      if (smoothPx > 0) {
        const alphaCopy = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
          alphaCopy[i] = data[i * 4 + 3];
        }

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const a = alphaCopy[idx];
            if (a > 0 && a < 255) {
              let sum = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  sum += alphaCopy[(y + dy) * width + (x + dx)];
                }
              }
              data[idx * 4 + 3] = Math.round(sum / 9);
            }
          }
        }
      }

      // 3. Color Decontamination (Menetralkan discolorasi halo pada helai rambut dan kain)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const a = data[idx + 3];
          if (a > 0 && a < 210) {
            let found = false;
            for (let r = 1; r <= 3 && !found; r++) {
              for (let dy = -r; dy <= r && !found; dy++) {
                for (let dx = -r; dx <= r && !found; dx++) {
                  const ny = y + dy;
                  const nx = x + dx;
                  if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
                  const nIdx = (ny * width + nx) * 4;
                  if (data[nIdx + 3] >= 240) {
                    data[idx] = data[nIdx];
                    data[idx + 1] = data[nIdx + 1];
                    data[idx + 2] = data[nIdx + 2];
                    found = true;
                  }
                }
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob || cutoutBlob);
      }, 'image/png', 1.0);
    };

    imgCutout.onerror = () => resolve(cutoutBlob);
    imgCutout.src = URL.createObjectURL(cutoutBlob);
  });
};

export const BgRemoverView: React.FC<BgRemoverViewProps> = ({
  t,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal,
  setShowActivationModal,
  onSendToMetadataGen,
  uiLanguage = 'id'
}) => {
  const isIndonesian = uiLanguage === 'id' || !uiLanguage || uiLanguage === 'Bahasa';
  
  const [items, setItems] = useState<BgItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [bgMode, setBgMode] = useState<BgMode>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#3b82f6');
  const [isDragging, setIsDragging] = useState(false);

  // Model Quality & Edge Refinement States
  const [modelQuality, setModelQuality] = useState<'ultra' | 'balanced'>('ultra');
  const [edgeChoke, setEdgeChoke] = useState<number>(1.0); // 0 sampai 3 px
  const [edgeSmooth, setEdgeSmooth] = useState<number>(0.5); // 0 sampai 2 px
  const [isApplyingEdge, setIsApplyingEdge] = useState(false);

  // Manual Touch-Up Studio States
  const [isTouchUpOpen, setIsTouchUpOpen] = useState(false);
  const [touchUpTool, setTouchUpTool] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [touchUpHistory, setTouchUpHistory] = useState<ImageData[]>([]);
  const touchUpCanvasRef = useRef<HTMLCanvasElement>(null);
  const touchUpOriginalImgRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isSlidingRef = useRef(false);

  // Active item reference
  const activeItem = items.find(it => it.id === activeItemId) || items[0] || null;

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach(it => {
        try { URL.revokeObjectURL(it.originalUrl); } catch (_) {}
        if (it.resultUrl) {
          try { URL.revokeObjectURL(it.resultUrl); } catch (_) {}
        }
        if (it.rawUrl) {
          try { URL.revokeObjectURL(it.rawUrl); } catch (_) {}
        }
      });
    };
  }, []);

  // Handle file addition
  const handleAddFiles = (fileList: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    const newItems: BgItem[] = validFiles.map(file => ({
      id: `bg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      originalUrl: URL.createObjectURL(file),
      resultUrl: null,
      resultBlob: null,
      rawBlob: null,
      rawUrl: null,
      status: 'idle',
      progress: 0,
      progressText: isIndonesian ? 'Menunggu antrean...' : 'Waiting in queue...'
    }));

    setItems(prev => [...prev, ...newItems]);
    if (!activeItemId && newItems.length > 0) {
      setActiveItemId(newItems[0].id);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Process a single item with Ultra IS-Net & automatic Edge De-haloing
  const processItem = async (item: BgItem): Promise<{ blob: Blob; url: string; rawBlob: Blob; rawUrl: string }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const config = {
          model: modelQuality === 'ultra' ? ('isnet' as const) : ('isnet_fp16' as const),
          rescale: true,
          device: 'gpu' as const,
          progress: (key: string, current: number, total: number) => {
            if (total > 0) {
              const pct = Math.min(100, Math.round((current / total) * 100));
              setItems(prev => prev.map(it => {
                if (it.id === item.id) {
                  let text = isIndonesian ? `Memproses AI (${pct}%)...` : `Processing AI (${pct}%)...`;
                  if (key.includes('fetch')) {
                    text = isIndonesian ? `Mengunduh model Ultra IS-Net (${pct}%)...` : `Loading AI model (${pct}%)...`;
                  }
                  return { ...it, progress: pct, progressText: text };
                }
                return it;
              }));
            }
          },
          output: {
            format: 'image/png' as const,
            quality: 1.0
          }
        };

        const rawResultBlob = await removeBackground(item.file, config);
        const rawUrl = URL.createObjectURL(rawResultBlob);

        // Langsung terapkan penyempurnaan tepi dan penghilangan halo otomatis
        const refinedBlob = await refineCutoutEdge(item.originalUrl, rawResultBlob, edgeChoke, edgeSmooth);
        const resultUrl = URL.createObjectURL(refinedBlob);
        
        resolve({ blob: refinedBlob, url: resultUrl, rawBlob: rawResultBlob, rawUrl });
      } catch (err: any) {
        console.error('[BackgroundRemover] Error processing image:', err);
        reject(err);
      }
    });
  };

  // Terapkan penyesuaian tepi (Edge Choke / Feathering) ulang ke item aktif
  const handleApplyEdgeRefinement = async () => {
    if (!activeItem || (!activeItem.rawBlob && !activeItem.resultBlob)) return;
    setIsApplyingEdge(true);
    try {
      const sourceBlob = activeItem.rawBlob || activeItem.resultBlob!;
      const refined = await refineCutoutEdge(activeItem.originalUrl, sourceBlob, edgeChoke, edgeSmooth);
      const url = URL.createObjectURL(refined);
      setItems(prev => prev.map(it => it.id === activeItem.id ? {
        ...it,
        resultBlob: refined,
        resultUrl: url
      } : it));
    } catch (e) {
      console.warn('Failed to refine edge:', e);
    } finally {
      setIsApplyingEdge(false);
    }
  };

  // Run batch processing
  const handleStartProcessing = async () => {
    if (isProcessingQueue) return;

    // Check free trial limit if not licensed
    if (!isLicensed && dailyGenCount >= 25) {
      setShowLimitModal?.(true);
      return;
    }

    const pendingItems = items.filter(it => it.status === 'idle' || it.status === 'error');
    if (pendingItems.length === 0) return;

    setIsProcessingQueue(true);

    for (const item of pendingItems) {
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'processing', progress: 5, progressText: isIndonesian ? 'Menginisialisasi AI...' : 'Initializing AI...' } : it));

      try {
        const { blob, url, rawBlob, rawUrl } = await processItem(item);
        setItems(prev => prev.map(it => it.id === item.id ? {
          ...it,
          status: 'done',
          progress: 100,
          progressText: isIndonesian ? 'Selesai' : 'Done',
          resultBlob: blob,
          resultUrl: url,
          rawBlob,
          rawUrl
        } : it));

        incrementDailyCount?.(1);
      } catch (err: any) {
        setItems(prev => prev.map(it => it.id === item.id ? {
          ...it,
          status: 'error',
          progress: 0,
          progressText: isIndonesian ? 'Gagal memproses' : 'Processing failed',
          error: err.message || 'Error removing background'
        } : it));
      }
    }

    setIsProcessingQueue(false);
  };

  // Re-process single item
  const handleRetryItem = async (itemId: string) => {
    const item = items.find(it => it.id === itemId);
    if (!item || item.status === 'processing') return;

    setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: 'processing', progress: 5, error: undefined } : it));

    try {
      const { blob, url, rawBlob, rawUrl } = await processItem(item);
      setItems(prev => prev.map(it => it.id === itemId ? {
        ...it,
        status: 'done',
        progress: 100,
        resultBlob: blob,
        resultUrl: url,
        rawBlob,
        rawUrl
      } : it));
      incrementDailyCount?.(1);
    } catch (err: any) {
      setItems(prev => prev.map(it => it.id === itemId ? {
        ...it,
        status: 'error',
        progress: 0,
        error: err.message || 'Error'
      } : it));
    }
  };

  // Delete item from queue
  const handleDeleteItem = (itemId: string) => {
    const item = items.find(it => it.id === itemId);
    if (item) {
      try { URL.revokeObjectURL(item.originalUrl); } catch (_) {}
      if (item.resultUrl) {
        try { URL.revokeObjectURL(item.resultUrl); } catch (_) {}
      }
    }
    setItems(prev => prev.filter(it => it.id !== itemId));
    if (activeItemId === itemId) {
      const remaining = items.filter(it => it.id !== itemId);
      setActiveItemId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Clear all
  const handleClearAll = () => {
    items.forEach(it => {
      try { URL.revokeObjectURL(it.originalUrl); } catch (_) {}
      if (it.resultUrl) {
        try { URL.revokeObjectURL(it.resultUrl); } catch (_) {}
      }
    });
    setItems([]);
    setActiveItemId(null);
  };

  // Slider dragging logic
  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((x / rect.width) * 100);
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => {
    isSlidingRef.current = true;
  };

  const handleTouchStart = () => {
    isSlidingRef.current = true;
  };

  useEffect(() => {
    const handleMouseUp = () => {
      isSlidingRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isSlidingRef.current) {
        handleSliderMove(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isSlidingRef.current && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleSliderMove]);

  // Start Touch-Up Modal
  const handleOpenTouchUp = () => {
    if (!activeItem || !activeItem.resultUrl) return;
    setIsTouchUpOpen(true);
  };

  // Initialize Touch-Up Canvas when modal opens
  useEffect(() => {
    if (!isTouchUpOpen || !activeItem || !activeItem.resultUrl) return;

    const canvas = touchUpCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgCutout = new Image();
    const imgOrig = new Image();
    let count = 0;

    const setup = () => {
      count++;
      if (count < 2) return;

      canvas.width = imgCutout.naturalWidth || imgCutout.width;
      canvas.height = imgCutout.naturalHeight || imgCutout.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgCutout, 0, 0);

      touchUpOriginalImgRef.current = imgOrig;
      setTouchUpHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    imgCutout.crossOrigin = 'anonymous';
    imgOrig.crossOrigin = 'anonymous';
    imgCutout.onload = setup;
    imgOrig.onload = setup;
    imgCutout.src = activeItem.resultUrl;
    imgOrig.src = activeItem.originalUrl;
  }, [isTouchUpOpen, activeItemId]);

  const paintStroke = (x: number, y: number) => {
    const canvas = touchUpCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    if (touchUpTool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (touchUpTool === 'restore' && touchUpOriginalImgRef.current) {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(touchUpOriginalImgRef.current, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = touchUpCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastPosRef.current = { x, y };
    paintStroke(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = touchUpCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (lastPosRef.current) {
      const dist = Math.hypot(x - lastPosRef.current.x, y - lastPosRef.current.y);
      const step = Math.max(1, brushSize / 4);
      const steps = Math.ceil(dist / step);
      for (let i = 1; i <= steps; i++) {
        const ix = lastPosRef.current.x + (x - lastPosRef.current.x) * (i / steps);
        const iy = lastPosRef.current.y + (y - lastPosRef.current.y) * (i / steps);
        paintStroke(ix, iy);
      }
    } else {
      paintStroke(x, y);
    }
    lastPosRef.current = { x, y };
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;
    const canvas = touchUpCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setTouchUpHistory(prev => [...prev.slice(-15), currentData]);
  };

  const handleUndoTouchUp = () => {
    if (touchUpHistory.length <= 1) return;
    const newHistory = [...touchUpHistory];
    newHistory.pop();
    const prevState = newHistory[newHistory.length - 1];
    setTouchUpHistory(newHistory);

    const canvas = touchUpCanvasRef.current;
    if (!canvas || !prevState) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(prevState, 0, 0);
    }
  };

  const handleSaveTouchUp = () => {
    const canvas = touchUpCanvasRef.current;
    if (!canvas || !activeItem) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setItems(prev => prev.map(it => it.id === activeItem.id ? {
        ...it,
        resultBlob: blob,
        resultUrl: url
      } : it));
      setIsTouchUpOpen(false);
    }, 'image/png', 1.0);
  };

  // Export composite or transparent PNG
  const handleDownload = async (item: BgItem) => {
    if (!item.resultUrl || !item.resultBlob) return;

    // If transparent mode, download original PNG result directly
    if (bgMode === 'transparent') {
      const a = document.createElement('a');
      a.href = item.resultUrl;
      const baseName = item.file.name.replace(/\.[^/.]+$/, "");
      a.download = `${baseName}_cutout_transparent.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // If color or blur, composite on canvas
    try {
      const imgCutout = new Image();
      imgCutout.crossOrigin = 'anonymous';
      imgCutout.src = item.resultUrl;
      await new Promise(res => { imgCutout.onload = res; });

      const canvas = document.createElement('canvas');
      canvas.width = imgCutout.naturalWidth || 1000;
      canvas.height = imgCutout.naturalHeight || 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (bgMode === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgMode === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgMode === 'custom') {
        ctx.fillStyle = customBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgMode === 'blur') {
        const imgOrig = new Image();
        imgOrig.crossOrigin = 'anonymous';
        imgOrig.src = item.originalUrl;
        await new Promise(res => { imgOrig.onload = res; });
        ctx.filter = 'blur(20px)';
        ctx.drawImage(imgOrig, -20, -20, canvas.width + 40, canvas.height + 40);
        ctx.filter = 'none';
      }

      ctx.drawImage(imgCutout, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        const baseName = item.file.name.replace(/\.[^/.]+$/, "");
        a.download = `${baseName}_cutout_${bgMode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 'image/png', 1.0);
    } catch (e) {
      console.warn('Composite download fallback to transparent PNG:', e);
      const a = document.createElement('a');
      a.href = item.resultUrl;
      a.download = `${item.file.name}_cutout.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Download all completed items
  const handleDownloadAll = () => {
    const doneItems = items.filter(it => it.status === 'done' && it.resultUrl);
    doneItems.forEach((it, idx) => {
      setTimeout(() => {
        handleDownload(it);
      }, idx * 250);
    });
  };

  // Send to MetadataGen
  const handleSendToMetadata = (item: BgItem) => {
    if (!item.resultBlob || !onSendToMetadataGen) return;
    const baseName = item.file.name.replace(/\.[^/.]+$/, "");
    const cutoutFile = new File([item.resultBlob], `${baseName}_cutout.png`, { type: 'image/png' });
    onSendToMetadataGen([cutoutFile]);
  };

  // Counts
  const totalCount = items.length;
  const doneCount = items.filter(it => it.status === 'done').length;
  const pendingCount = items.filter(it => it.status === 'idle' || it.status === 'error').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-2 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Scissors className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400">
                  Background Remover Pro
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                  AI WebGPU / WASM
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                {isIndonesian 
                  ? 'Hapus latar belakang foto subjek, orang & produk dengan presisi helai rambut sekelas Pixelcut' 
                  : 'Remove photo backgrounds with pixel-perfect hair-level precision matching Pixelcut standards'}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>100% Gratis & Privasi Lokal</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <Sparkles size={14} className="text-violet-500" />
            <span>Alpha Matting 4K Ready</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Upload & Queue (Left) vs Interactive Before/After Studio (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Upload & Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Model Quality Mode Toggle */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center">
                <Sparkle size={16} />
              </div>
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  {isIndonesian ? 'Model AI Presisi' : 'AI Precision Engine'}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  {modelQuality === 'ultra' 
                    ? (isIndonesian ? 'IS-Net FP32 (Presisi Studio Tertinggi)' : 'IS-Net FP32 (Highest Studio Detail)')
                    : (isIndonesian ? 'IS-Net FP16 (Cepat & Seimbang)' : 'IS-Net FP16 (Fast & Balanced)')}
                </div>
              </div>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/60 dark:border-white/5 text-[10px] font-black uppercase">
              <button
                type="button"
                onClick={() => setModelQuality('ultra')}
                title="Model 32-bit presisi maksimal untuk helai rambut dan serat mikro"
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  modelQuality === 'ultra'
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Ultra FP32
              </button>
              <button
                type="button"
                onClick={() => setModelQuality('balanced')}
                title="Model 16-bit cepat dan hemat memori"
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  modelQuality === 'balanced'
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Balanced
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 rounded-3xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden group ${
              isDragging 
                ? 'border-violet-500 bg-violet-500/10 scale-[1.01]' 
                : 'border-slate-300 dark:border-white/10 hover:border-violet-500/50 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
            }`}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files) handleAddFiles(e.target.files);
                e.target.value = '';
              }} 
            />

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform shadow-md">
              <Upload size={24} />
            </div>

            <div>
              <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {isIndonesian ? 'Klik atau Tarik Gambar ke Sini' : 'Click or Drag Images Here'}
              </p>
              <p className="text-[11px] text-slate-400 font-bold mt-1">
                {isIndonesian ? 'Mendukung JPG, PNG, WEBP (Bisa multi-file batch)' : 'Supports JPG, PNG, WEBP (Batch multi-files)'}
              </p>
            </div>
          </div>

          {/* Action Bar (Start Batch & Clear) */}
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartProcessing}
                disabled={isProcessingQueue || pendingCount === 0}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
              >
                {isProcessingQueue ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{isIndonesian ? 'Sedang Memproses...' : 'Processing Batch...'}</span>
                  </>
                ) : (
                  <>
                    <Scissors size={16} />
                    <span>{isIndonesian ? `Hapus Background (${pendingCount} File)` : `Remove Background (${pendingCount})`}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleClearAll}
                title={isIndonesian ? 'Hapus Semua Antrean' : 'Clear All'}
                disabled={isProcessingQueue}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 border border-slate-200 dark:border-white/5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Queue List */}
          {items.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {isIndonesian ? `Daftar Antrean (${doneCount}/${totalCount} Selesai)` : `Queue List (${doneCount}/${totalCount} Done)`}
                </span>
                {doneCount > 1 && (
                  <button
                    onClick={handleDownloadAll}
                    className="text-[9px] font-black uppercase text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={10} />
                    <span>{isIndonesian ? 'Unduh Semua Selesai' : 'Download All Done'}</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                {items.map(it => {
                  const isActive = it.id === activeItemId;
                  return (
                    <div
                      key={it.id}
                      onClick={() => setActiveItemId(it.id)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isActive 
                          ? 'bg-violet-500/10 border-violet-500/40 shadow-sm' 
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 relative border border-black/5 dark:border-white/5">
                        <img 
                          src={it.resultUrl || it.originalUrl} 
                          alt={it.file.name} 
                          className="w-full h-full object-cover" 
                        />
                        {it.status === 'done' && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check size={9} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* File Info & Status */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {it.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className="text-slate-400 font-semibold font-mono">
                            {(it.file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className={`font-black uppercase text-[9px] ${
                            it.status === 'done' ? 'text-emerald-500' :
                            it.status === 'processing' ? 'text-violet-500' :
                            it.status === 'error' ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {it.progressText || it.status}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {it.status === 'processing' && (
                          <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
                              style={{ width: `${it.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action buttons per item */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {it.status === 'error' && (
                          <button
                            onClick={() => handleRetryItem(it.id)}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Coba Lagi"
                          >
                            <RefreshCcw size={14} />
                          </button>
                        )}
                        {it.status === 'done' && (
                          <button
                            onClick={() => handleDownload(it)}
                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            title="Unduh PNG"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(it.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Studio & Split Slider (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeItem ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-5">
              
              {/* Top Studio Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <span>Pratinjau Hasil Cutout</span>
                    {activeItem.status === 'done' && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        HD TRANSPARENT
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold truncate max-w-sm">
                    {activeItem.file.name}
                  </p>
                </div>

                {/* Background Selector Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBgMode('transparent')}
                    title="Transparan (PNG Cutout)"
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'transparent'
                        ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '4px 4px' }} />
                    <span>PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgMode('white')}
                    title="Background Putih Bersih (Microstock & E-Commerce Standard)"
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'white'
                        ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                    <span>Putih</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgMode('black')}
                    title="Background Hitam"
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'black'
                        ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-black border border-slate-600" />
                    <span>Hitam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgMode('blur')}
                    title="Background Asli Di-blur (Bokeh)"
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      bgMode === 'blur'
                        ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Layers size={11} />
                    <span>Blur</span>
                  </button>

                  {/* Custom Color Picker */}
                  <label 
                    title="Warna Latar Kustom"
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                      bgMode === 'custom' 
                        ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <input 
                      type="color" 
                      value={customBgColor} 
                      onChange={(e) => {
                        setCustomBgColor(e.target.value);
                        setBgMode('custom');
                      }} 
                      className="w-3.5 h-3.5 rounded-full overflow-hidden cursor-pointer border-0 p-0" 
                    />
                    <Palette size={11} />
                  </label>
                </div>
              </div>

              {/* Edge Refinement & Touch-Up Toolbar */}
              {activeItem.status === 'done' && (
                <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
                        <SlidersHorizontal size={14} />
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        {isIndonesian ? 'Sempurnakan Tepi (Anti-Halo)' : 'Edge Refinement (De-halo)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenTouchUp}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-violet-500/20 cursor-pointer active:scale-95"
                    >
                      <Paintbrush size={13} />
                      <span>{isIndonesian ? 'Kuas Touch-Up Manual 🖌️' : 'Manual Touch-Up Brush 🖌️'}</span>
                    </button>
                  </div>

                  {/* Sliders Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Choke Slider */}
                    <div className="space-y-1.5 bg-white dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        <span>{isIndonesian ? 'Potong Sisa Halo (Choke):' : 'Trim Edge Halo (Choke):'}</span>
                        <span className="font-mono text-violet-500 font-black">{edgeChoke.toFixed(1)} px</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="3"
                        step="0.5"
                        value={edgeChoke}
                        onChange={(e) => setEdgeChoke(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                      <p className="text-[9px] text-slate-400">
                        {isIndonesian ? 'Memotong piksel tepi agar warna background lama tidak bocor.' : 'Shrinks alpha mask to cut off leaked background color fringe.'}
                      </p>
                    </div>

                    {/* Smooth Slider */}
                    <div className="space-y-1.5 bg-white dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        <span>{isIndonesian ? 'Kehalusan Tepi (Feather):' : 'Edge Smoothness:'}</span>
                        <span className="font-mono text-violet-500 font-black">{edgeSmooth.toFixed(1)} px</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="2"
                        step="0.5"
                        value={edgeSmooth}
                        onChange={(e) => setEdgeSmooth(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                      <p className="text-[9px] text-slate-400">
                        {isIndonesian ? 'Menghaluskan tepi potongan agar tidak bergerigi/kaku.' : 'Softens cut edges to eliminate jagged pixelation.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-medium italic">
                      {isIndonesian ? '💡 Geser slider lalu klik "Terapkan" untuk memperbarui potongan' : '💡 Adjust sliders then click "Apply" to refine'}
                    </span>
                    <button
                      type="button"
                      disabled={isApplyingEdge}
                      onClick={handleApplyEdgeRefinement}
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-violet-500/20 cursor-pointer active:scale-95"
                    >
                      {isApplyingEdge ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      <span>{isIndonesian ? 'Terapkan Tepi Bersih' : 'Apply Clean Edge'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Before / After Split Comparison Canvas */}
              <div 
                ref={sliderContainerRef}
                className="relative w-full h-[420px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 select-none shadow-inner cursor-ew-resize group/viewer"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                {/* Background Layer (Left Side: Original Image) */}
                <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img 
                    src={activeItem.originalUrl} 
                    alt="Original" 
                    className="w-full h-full object-contain pointer-events-none" 
                  />
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white border border-white/10 shadow-lg">
                    {isIndonesian ? 'Foto Asli (Sebelum)' : 'Original (Before)'}
                  </div>
                </div>

                {/* Foreground Layer (Right Side: Result with selected BG) - Clipped via Slider */}
                {activeItem.resultUrl ? (
                  <div 
                    className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center transition-none"
                    style={{
                      clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
                      backgroundColor: bgMode === 'white' ? '#ffffff' : bgMode === 'black' ? '#000000' : bgMode === 'custom' ? customBgColor : 'transparent',
                      backgroundImage: bgMode === 'transparent' ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)' : bgMode === 'blur' ? `url(${activeItem.originalUrl})` : 'none',
                      backgroundSize: bgMode === 'transparent' ? '16px 16px' : 'cover',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                    }}
                  >
                    {/* If blur mode, apply backdrop blur */}
                    {bgMode === 'blur' && (
                      <div className="absolute inset-0 backdrop-blur-xl bg-black/20" />
                    )}

                    <img 
                      src={activeItem.resultUrl} 
                      alt="Cutout Result" 
                      className="w-full h-full object-contain pointer-events-none relative z-10" 
                    />

                    <div className="absolute top-4 right-4 bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white border border-emerald-400 shadow-lg z-20">
                      {isIndonesian ? 'Hasil Cutout (Sesudah)' : 'Cutout (After)'}
                    </div>
                  </div>
                ) : (
                  /* While not processed yet, show overlay with process button */
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shadow-lg border border-white/10 animate-bounce">
                      <Scissors size={20} />
                    </div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">
                      {activeItem.status === 'processing' 
                        ? (activeItem.progressText || 'Memproses AI...') 
                        : (isIndonesian ? 'Klik Tombol di Bawah untuk Hapus Background' : 'Click Below to Remove Background')}
                    </p>
                    {activeItem.status === 'processing' ? (
                      <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-300"
                          style={{ width: `${activeItem.progress}%` }}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRetryItem(activeItem.id)}
                        className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-violet-500/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Scissors size={14} />
                        <span>{isIndonesian ? 'Proses Gambar Ini Sekarang' : 'Process This Image Now'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Draggable Divider Handle */}
                {activeItem.resultUrl && (
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-ew-resize z-30"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl border-2 border-violet-600 flex items-center justify-center text-violet-600">
                      <Sliders size={14} className="rotate-90" />
                    </div>
                  </div>
                )}
              </div>

              {/* Slider instruction */}
              {activeItem.resultUrl && (
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>◀ {isIndonesian ? 'Foto Asli' : 'Original'}</span>
                  <span className="text-violet-500">{sliderPosition}% Split</span>
                  <span>{isIndonesian ? 'Hasil Cutout' : 'Cutout'} ▶</span>
                </div>
              )}

              {/* Action Buttons for Active Result */}
              {activeItem.resultUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={() => handleDownload(activeItem)}
                    className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <Download size={16} />
                    <span>{isIndonesian ? `Unduh PNG (${bgMode.toUpperCase()})` : `Download PNG (${bgMode.toUpperCase()})`}</span>
                  </button>

                  {onSendToMetadataGen && (
                    <button
                      onClick={() => handleSendToMetadata(activeItem)}
                      title="Kirim hasil cutout langsung ke MetadataGen untuk dibuatkan Judul, Deskripsi & Keywords"
                      className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-[#7c3aed] via-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <Sparkles size={16} className="text-amber-300" />
                      <span>Go to MetadataGen 🚀</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 min-h-[460px]">
              <div className="w-16 h-16 rounded-3xl bg-violet-500/10 text-violet-500 flex items-center justify-center border border-violet-500/20">
                <ImageIcon size={32} />
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  {isIndonesian ? 'Belum Ada Gambar yang Dipilih' : 'No Image Selected'}
                </h4>
                <p className="text-xs text-slate-400 font-bold mt-1.5 leading-relaxed">
                  {isIndonesian 
                    ? 'Unggah satu atau beberapa gambar di panel kiri. Hasil potongan transparan sekelas Pixelcut akan langsung tampil di sini dengan fitur Before/After slider interaktif.'
                    : 'Upload one or multiple images in the left panel. Transparent cutout results matching Pixelcut quality will appear here with an interactive Before/After comparison slider.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Touch-Up Studio Modal */}
      <AnimatePresence>
        {isTouchUpOpen && activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5"
          >
            {/* Modal Top Bar */}
            <div className="w-full max-w-6xl bg-slate-900/95 border border-white/10 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-2xl flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
                  <Paintbrush size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <span>{isIndonesian ? 'Studio Touch-Up Kuas Manual' : 'Manual Touch-Up Studio'}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold">
                      PIXEL PRECISION
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isIndonesian ? 'Sapukan kuas untuk menghapus sisa background atau pulihkan bagian yang terpotong' : 'Paint to erase background leftovers or restore clipped parts'}
                  </p>
                </div>
              </div>

              {/* Tools Switcher (Erase vs Restore) */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setTouchUpTool('erase')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    touchUpTool === 'erase'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eraser size={14} />
                  <span>{isIndonesian ? 'Hapus (Erase)' : 'Erase'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTouchUpTool('restore')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    touchUpTool === 'restore'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Paintbrush size={14} />
                  <span>{isIndonesian ? 'Pulihkan (Restore)' : 'Restore'}</span>
                </button>
              </div>

              {/* Brush Size Slider */}
              <div className="flex items-center gap-2.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {isIndonesian ? 'Ukuran Kuas:' : 'Brush Size:'}
                </span>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-24 sm:w-32 accent-violet-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
                <span className="text-xs font-mono font-black text-violet-400 w-8 text-right">
                  {brushSize}px
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndoTouchUp}
                  disabled={touchUpHistory.length <= 1}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-all border border-white/5 cursor-pointer"
                  title="Undo"
                >
                  <Undo2 size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsTouchUpOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-white/5 cursor-pointer"
                >
                  {isIndonesian ? 'Batal' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveTouchUp}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                >
                  <Check size={14} />
                  <span>{isIndonesian ? 'Simpan Perubahan' : 'Save Cutout'}</span>
                </button>
              </div>
            </div>

            {/* Modal Canvas Center */}
            <div className="flex-1 w-full max-w-6xl my-3 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center relative bg-[#0a0a0a] shadow-inner p-2">
              {/* Checkerboard Pattern */}
              <div 
                className="absolute inset-0 opacity-40 pointer-events-none" 
                style={{
                  backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                }}
              />

              <canvas
                ref={touchUpCanvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="relative z-10 max-h-[72vh] max-w-full object-contain cursor-crosshair shadow-2xl rounded-lg"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
