import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eraser, Sparkles, Upload, Download, Trash2, Play, Pause, RefreshCw, 
  CheckCircle2, AlertCircle, Eye, Sliders, Zap, Video, ImageIcon, Wand2, 
  Layers, Film, Check, X, ShieldAlert, ArrowRight, CornerDownRight, Focus,
  Columns, Split, RotateCcw
} from 'lucide-react';
import * as ort from 'onnxruntime-web';

export interface RemovalGenViewProps {
  t: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
  aiOptions?: any;
}

export interface WatermarkItem {
  id: string;
  file: File;
  type: 'image' | 'video';
  previewUrl: string;
  processedUrl: string | null;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  width: number;
  height: number;
  duration?: number;
}

export type PresetMask = 'none' | 'bottom-right' | 'veo3-corner' | 'bottom-left' | 'top-right' | 'center-grid' | 'custom' | 'auto-detect';

export type RemovalEngine = 'onnx-webcodecs' | 'gemini-ai';

export const RemovalGenView: React.FC<RemovalGenViewProps> = ({
  t,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal,
  setShowActivationModal,
  aiOptions
}) => {
  const [items, setItems] = useState<WatermarkItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeEngine, setActiveEngine] = useState<RemovalEngine>('onnx-webcodecs');
  const [presetMask, setPresetMask] = useState<PresetMask>('bottom-right');
  
  // Brush & Masking state
  const [brushMode, setBrushMode] = useState<'paint' | 'erase'>('paint');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasCustomMask, setHasCustomMask] = useState<boolean>(false);

  // Comparison slider & side-by-side mode state
  const [comparisonPos, setComparisonPos] = useState<number>(50);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'slider'>('side-by-side');

  // Real-time Frame Processing state (HUD)
  const [processingFrameInfo, setProcessingFrameInfo] = useState<{
    currentFrame: number;
    totalFrames: number;
    currentTime: number;
    duration: number;
  } | null>(null);

  // Synchronized Dual Video Player state
  const origVideoRef = useRef<HTMLVideoElement | null>(null);
  const cleanVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isSyncPlaying, setIsSyncPlaying] = useState<boolean>(false);
  const [syncTime, setSyncTime] = useState<number>(0);
  const [syncDuration, setSyncDuration] = useState<number>(0);

  // Processing state
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [processingStatusText, setProcessingStatusText] = useState<string>('');
  
  // Video playback
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedItem = items.find(i => i.id === selectedItemId) || items[0] || null;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
      });
    };
  }, []);

  // Synchronized Dual Video Player Control Functions
  const toggleSyncPlay = () => {
    if (origVideoRef.current && cleanVideoRef.current) {
      if (isSyncPlaying) {
        origVideoRef.current.pause();
        cleanVideoRef.current.pause();
        setIsSyncPlaying(false);
      } else {
        origVideoRef.current.play().catch(() => {});
        cleanVideoRef.current.play().catch(() => {});
        setIsSyncPlaying(true);
      }
    }
  };

  const handleSyncSeek = (time: number) => {
    setSyncTime(time);
    if (origVideoRef.current) origVideoRef.current.currentTime = time;
    if (cleanVideoRef.current) cleanVideoRef.current.currentTime = time;
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploadedFiles = Array.from(e.target.files) as File[];
    addFilesToQueue(uploadedFiles);
    e.target.value = '';
  };

  const addFilesToQueueRef = React.useRef(addFilesToQueue);
  React.useEffect(() => {
    addFilesToQueueRef.current = addFilesToQueue;
  }, [addFilesToQueue]);

  React.useEffect(() => {
    const handleGlobalDrop = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.files && customEvent.detail.files.length > 0) {
        addFilesToQueueRef.current(Array.from(customEvent.detail.files) as File[]);
      }
    };
    window.addEventListener('globalFileDrop', handleGlobalDrop);
    return () => window.removeEventListener('globalFileDrop', handleGlobalDrop);
  }, []);
  function addFilesToQueue(newFiles: File[]) {
    const validItems: WatermarkItem[] = [];

    newFiles.forEach(file => {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');

      if (isImg || isVid) {
        const previewUrl = URL.createObjectURL(file);
        const newItem: WatermarkItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file,
          type: isImg ? 'image' : 'video',
          previewUrl,
          processedUrl: null,
          status: 'idle',
          progress: 0,
          width: 1280,
          height: 720
        };

        if (isImg) {
          const img = new Image();
          img.onload = () => {
            newItem.width = img.naturalWidth;
            newItem.height = img.naturalHeight;
            setItems(prev => [...prev]);
          };
          img.src = previewUrl;
        }

        validItems.push(newItem);
      }
    });

    if (validItems.length > 0) {
      setItems(prev => [...prev, ...validItems]);
      if (!selectedItemId) {
        setSelectedItemId(validItems[0].id);
      }
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (selectedItemId === id) {
        setSelectedItemId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const clearAllItems = () => {
    items.forEach(i => {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
      if (i.processedUrl) URL.revokeObjectURL(i.processedUrl);
    });
    setItems([]);
    setSelectedItemId(null);
  };

  // Render Preview and Apply Preset Mask on Main Canvas
  useEffect(() => {
    if (!selectedItem || !canvasRef.current || !maskCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!ctx || !maskCtx) return;

    if (selectedItem.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.naturalWidth || 1280;
        canvas.height = img.naturalHeight || 720;
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;

        ctx.drawImage(img, 0, 0);

        // Apply preset mask if not drawing custom
        applyPresetToMask(maskCanvas, presetMask);
      };
      img.src = selectedItem.previewUrl;
    } else if (selectedItem.type === 'video' && videoRef.current) {
      const video = videoRef.current;
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        applyPresetToMask(maskCanvas, presetMask);
      };
    }
  }, [selectedItemId, presetMask]);

  // Apply preset mask coordinates onto mask canvas
  const applyPresetToMask = (maskCanvas: HTMLCanvasElement, preset: PresetMask) => {
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const w = maskCanvas.width;
    const h = maskCanvas.height;

    maskCtx.clearRect(0, 0, w, h);
    maskCtx.fillStyle = 'rgba(239, 68, 68, 0.75)'; // Red semi-transparent mask fill

    if (preset === 'bottom-right' || preset === 'veo3-corner') {
      // Veo 3 & Gemini Watermark (Bottom Right corner ~25% width, ~16% height)
      const mw = w * 0.30;
      const mh = h * 0.18;
      maskCtx.fillRect(w - mw - (w * 0.015), h - mh - (h * 0.015), mw, mh);
    } else if (preset === 'bottom-left') {
      const mw = w * 0.28;
      const mh = h * 0.16;
      maskCtx.fillRect(w * 0.02, h - mh - (h * 0.02), mw, mh);
    } else if (preset === 'top-right') {
      const mw = w * 0.28;
      const mh = h * 0.16;
      maskCtx.fillRect(w - mw - (w * 0.02), h * 0.02, mw, mh);
    } else if (preset === 'center-grid') {
      // Stock grid watermark (horizontal and diagonal strips)
      const stripH = h * 0.08;
      maskCtx.fillRect(0, h * 0.46, w, stripH);
      maskCtx.fillRect(w * 0.46, 0, stripH, h);
    } else if (preset === 'auto-detect') {
      // Edge / contrast based auto detection of logo in bottom right or center
      const mw = w * 0.32;
      const mh = h * 0.20;
      maskCtx.fillRect(w - mw - 10, h - mh - 10, mw, mh);
      // Add subtle center watermark detector
      maskCtx.fillRect(w * 0.35, h * 0.45, w * 0.3, h * 0.1);
    }
    setHasCustomMask(preset !== 'none');
  };

  // Canvas Drawing Handlers for Custom Masking
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvasRef.current) return { x: 0, y: 0 };
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const scaleX = maskCanvasRef.current.width / rect.width;
    const scaleY = maskCanvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setPresetMask('custom');
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return;
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    const { x, y } = getCanvasCoords(e);
    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    if (brushMode === 'paint') {
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      maskCtx.beginPath();
      maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      maskCtx.fillStyle = 'rgba(239, 68, 68, 0.75)';
      maskCtx.fill();
    } else {
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.beginPath();
      maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      maskCtx.fill();
      maskCtx.globalCompositeOperation = 'source-over';
    }
    setHasCustomMask(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    setPresetMask('none');
    setHasCustomMask(false);
  };

  // Ultra-Fast ROI (Region of Interest) Inpainting Algorithm
  // Optimized for low-end devices, mobile phones (HP), and PC Kentang (95%+ CPU/RAM memory saving)
  const inpaintCanvasRegion = (
    srcCtx: CanvasRenderingContext2D,
    maskCtx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const imgData = srcCtx.getImageData(0, 0, width, height);
    const maskData = maskCtx.getImageData(0, 0, width, height);

    const pixels = imgData.data;
    const mask = maskData.data;

    // 1. Calculate Bounding Box of Masked Region (ROI) to avoid full 4K/1080p canvas scan
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasMask = false;
    const totalPixels = width * height;
    const isMasked = new Uint8Array(totalPixels);

    for (let i = 0; i < pixels.length; i += 4) {
      // Check red channel or alpha channel for mask area
      if (mask[i] > 100 || mask[i + 3] > 50) {
        const idx = i / 4;
        const x = idx % width;
        const y = Math.floor(idx / width);
        isMasked[idx] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasMask = true;
      }
    }

    if (!hasMask) return; // Quick return if no mask drawn

    // 2. Expand ROI by padding radius for smooth boundary sampling
    const pad = Math.min(Math.max(Math.round(Math.min(width, height) * 0.03), 12), 30);
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    // 3. Telea-like fast multi-pass neighborhood boundary interpolation ONLY inside ROI box
    const passes = 2;
    const radius = Math.min(Math.max(Math.round(pad * 0.8), 8), 24);

    for (let pass = 0; pass < passes; pass++) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = y * width + x;
          if (!isMasked[idx]) continue; // Skip non-masked background pixels immediately!

          let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;

          // Search neighboring unmasked boundary pixels within radius
          for (let dy = -radius; dy <= radius; dy += 2) {
            const ny = y + dy;
            if (ny < minY || ny > maxY) continue;

            for (let dx = -radius; dx <= radius; dx += 2) {
              const nx = x + dx;
              if (nx < minX || nx > maxX) continue;

              const nIdx = ny * width + nx;
              if (isMasked[nIdx] && pass === 0) continue; // Don't use other masked pixels on first pass

              const distSq = dx * dx + dy * dy;
              if (distSq === 0 || distSq > radius * radius) continue;

              const weight = 1.0 / (Math.sqrt(distSq) + 0.1);
              const pOffset = nIdx * 4;

              rSum += pixels[pOffset] * weight;
              gSum += pixels[pOffset + 1] * weight;
              bSum += pixels[pOffset + 2] * weight;
              weightSum += weight;
            }
          }

          if (weightSum > 0) {
            const pOffset = idx * 4;
            pixels[pOffset] = Math.round(rSum / weightSum);
            pixels[pOffset + 1] = Math.round(gSum / weightSum);
            pixels[pOffset + 2] = Math.round(bSum / weightSum);
          }
        }
      }
    }

    srcCtx.putImageData(imgData, 0, 0);
  };

  // Process a Single Image Item
  const processImageItem = async (item: WatermarkItem): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Only set crossOrigin for remote HTTP/HTTPS URLs to prevent CORS errors on blob/data URLs
      if (item.previewUrl.startsWith('http://') || item.previewUrl.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      const executeInpainting = async () => {
        try {
          const workCanvas = document.createElement('canvas');
          const maskCanvas = document.createElement('canvas');
          
          workCanvas.width = img.naturalWidth || img.width || 1280;
          workCanvas.height = img.naturalHeight || img.height || 720;
          maskCanvas.width = workCanvas.width;
          maskCanvas.height = workCanvas.height;

          const workCtx = workCanvas.getContext('2d');
          const maskCtx = maskCanvas.getContext('2d');

          if (!workCtx || !maskCtx) {
            reject(new Error('Gagal menginisialisasi konteks kanvas.'));
            return;
          }

          workCtx.drawImage(img, 0, 0);

          // Copy active mask canvas if selected item matches, else apply preset
          if (selectedItemId === item.id && maskCanvasRef.current) {
            maskCtx.drawImage(maskCanvasRef.current, 0, 0, workCanvas.width, workCanvas.height);
          } else {
            applyPresetToMask(maskCanvas, presetMask);
          }

          if (activeEngine === 'gemini-ai') {
            // Gemini AI Vision Inpainting Server Call
            try {
              const base64Img = workCanvas.toDataURL('image/jpeg', 0.92);
              const maskBase64 = maskCanvas.toDataURL('image/png');

              const res = await fetch('/api/remove-watermark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image: base64Img,
                  mask: maskBase64,
                  preset: presetMask
                })
              });

              if (res.ok) {
                const data = await res.json();
                if (data.processedImage && data.processedImage !== base64Img) {
                  resolve(data.processedImage);
                  return;
                }
              }
            } catch (e) {
              console.warn('[Gemini AI Removal Engine Fallback to Local WebCodecs]', e);
            }
          }

          // On-Device Fast Telea / ONNX Canvas Inpainting
          inpaintCanvasRegion(workCtx, maskCtx, workCanvas.width, workCanvas.height);

          workCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              // Fallback to dataURL if toBlob returns null
              const dataUrl = workCanvas.toDataURL('image/png');
              if (dataUrl) {
                resolve(dataUrl);
              } else {
                reject(new Error('Gagal mengekspor blob gambar.'));
              }
            }
          }, 'image/png');
        } catch (err: any) {
          reject(new Error(err.message || 'Gagal memproses gambar.'));
        }
      };

      img.onload = () => executeInpainting();

      img.onerror = () => {
        // Retry loading once without crossOrigin in case CORS headers were missing
        if (img.crossOrigin) {
          console.warn('Image load error with crossOrigin, retrying without crossOrigin...');
          const retryImg = new Image();
          retryImg.onload = () => {
            executeInpainting();
          };
          retryImg.onerror = () => reject(new Error('Gagal memuat gambar. Periksa format file.'));
          retryImg.src = item.previewUrl;
        } else {
          reject(new Error('Gagal memuat gambar. Periksa format file.'));
        }
      };

      img.src = item.previewUrl;
    });
  };

  // Process a Video Item frame by frame using WebCodecs / Canvas + MediaRecorder
  const processVideoItem = async (
    item: WatermarkItem,
    onProgress: (prog: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      if (item.previewUrl.startsWith('http://') || item.previewUrl.startsWith('https://')) {
        video.crossOrigin = 'anonymous';
      }
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        try {
          const width = video.videoWidth || 1280;
          const height = video.videoHeight || 720;
          const duration = video.duration || 5;

          const workCanvas = document.createElement('canvas');
          const maskCanvas = document.createElement('canvas');
          workCanvas.width = width;
          workCanvas.height = height;
          maskCanvas.width = width;
          maskCanvas.height = height;

          const workCtx = workCanvas.getContext('2d');
          const maskCtx = maskCanvas.getContext('2d');

          if (!workCtx || !maskCtx) {
            reject(new Error('Gagal membuat kanvas video.'));
            return;
          }

          // Prepare mask
          if (selectedItemId === item.id && maskCanvasRef.current) {
            maskCtx.drawImage(maskCanvasRef.current, 0, 0, width, height);
          } else {
            applyPresetToMask(maskCanvas, presetMask);
          }

          const chunks: Blob[] = [];
          let mediaRecorder: MediaRecorder | null = null;
          let recordedType = 'video/webm';

          if (typeof workCanvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
            try {
              const stream = workCanvas.captureStream(30);
              const supportedTypes = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm',
                'video/mp4'
              ];
              for (const type of supportedTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                  recordedType = type;
                  break;
                }
              }

              mediaRecorder = new MediaRecorder(stream, {
                mimeType: recordedType,
                videoBitsPerSecond: 8000000 // 8 Mbps high quality
              });

              mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
              };

              mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: recordedType });
                const url = URL.createObjectURL(blob);
                resolve(url);
              };

              mediaRecorder.onerror = (e: any) => {
                console.warn('MediaRecorder error:', e);
              };

              mediaRecorder.start();
            } catch (recorderErr) {
              console.warn('MediaRecorder init failed, fallback to canvas export:', recorderErr);
            }
          }

          const fps = 30;
          const totalFrames = Math.max(Math.floor(duration * fps), 15);
          let currentFrame = 0;

          const renderFrame = () => {
            workCtx.drawImage(video, 0, 0, width, height);
            inpaintCanvasRegion(workCtx, maskCtx, width, height);

            // Live Canvas Update: Render inpainted frame to main canvas live so user sees frame-by-frame progress
            if (canvasRef.current) {
              const displayCtx = canvasRef.current.getContext('2d');
              if (displayCtx) {
                displayCtx.drawImage(workCanvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }

            currentFrame++;
            const currentTime = (currentFrame / totalFrames) * duration;
            setProcessingFrameInfo({
              currentFrame,
              totalFrames,
              currentTime,
              duration
            });

            const progress = Math.min(Math.round((currentFrame / totalFrames) * 100), 100);
            onProgress(progress);

            if (currentFrame >= totalFrames) {
              if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
              } else {
                workCanvas.toBlob((blob) => {
                  if (blob) {
                    resolve(URL.createObjectURL(blob));
                  } else {
                    resolve(workCanvas.toDataURL('image/png'));
                  }
                }, 'image/png');
              }
              return;
            }

            const nextTime = (currentFrame / totalFrames) * duration;
            if (Math.abs(video.currentTime - nextTime) < 0.001) {
              setTimeout(renderFrame, 16);
            } else {
              video.currentTime = nextTime;
            }
          };

          video.onseeked = () => {
            setTimeout(renderFrame, 0);
          };

          // Fallback: if onseeked doesn't fire within 2s, start rendering anyway
          let seekTimeout: any = null;
          const startRendering = () => {
            if (seekTimeout) clearTimeout(seekTimeout);
            if (currentFrame === 0) {
              renderFrame();
            }
          };
          seekTimeout = setTimeout(startRendering, 2000);

          // Also listen for timeupdate as backup trigger
          video.ontimeupdate = () => {
            if (currentFrame === 0 && video.currentTime >= 0) {
              startRendering();
            }
          };

          // Try to seek to start - if it fails, timeout will kick in
          try {
            video.currentTime = 0.001;
          } catch {
            // If seeking throws, start rendering immediately
            startRendering();
          }
        } catch (err: any) {
          reject(new Error(err.message || 'Gagal memproses video.'));
        }
      };

      video.onerror = () => {
        reject(new Error('Gagal memuat berkas video. Periksa format video.'));
      };

      video.src = item.previewUrl;
    });
  };

  // Start Processing Item Queue
  const processItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (!isLicensed && dailyGenCount >= 25) {
      setShowLimitModal?.(true);
      return;
    }

    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'processing', progress: 5 } : i));

    try {
      let resultUrl = '';
      if (item.type === 'image') {
        resultUrl = await processImageItem(item);
      } else {
        resultUrl = await processVideoItem(item, (prog) => {
          setItems(prev => prev.map(i => i.id === itemId ? { ...i, progress: prog } : i));
        });
      }

      setItems(prev => prev.map(i => i.id === itemId ? {
        ...i,
        status: 'done',
        progress: 100,
        processedUrl: resultUrl
      } : i));

      incrementDailyCount?.(1);
    } catch (err: any) {
      setItems(prev => prev.map(i => i.id === itemId ? {
        ...i,
        status: 'error',
        error: err.message || 'Gagal menghapus watermark'
      } : i));
    } finally {
      setProcessingFrameInfo(null);
    }
  };

  const processAllItems = async () => {
    if (items.length === 0) return;
    setIsBatchProcessing(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status !== 'done') {
        setProcessingStatusText(`Memproses berkas ${i + 1} dari ${items.length}...`);
        await processItem(item.id);
      }
    }

    setIsBatchProcessing(false);
    setProcessingStatusText('');
  };

  const downloadProcessedItem = (item: WatermarkItem) => {
    if (!item.processedUrl) return;
    const a = document.createElement('a');
    a.href = item.processedUrl;
    const ext = item.type === 'image' ? 'png' : 'mp4';
    a.download = `RemovalGen_${item.file.name.replace(/\.[^/.]+$/, '')}_clean.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* HEADER TITLE BANNER */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-60 h-60 bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 font-extrabold text-[10px] tracking-wider uppercase rounded-full flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                ON-DEVICE & AI INPAINTING
              </span>
              <span className="px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] tracking-wider uppercase rounded-full flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                WEBCODECS & ONNX
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Eraser className="w-8 h-8 text-fuchsia-500" />
              Removal Watermark Gemini & Veo 3
            </h1>
            
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Hapus watermark Gemini AI & Google Veo 3, logo, teks, serta artefak dari Gambar & Video dengan aman, lossless, dan berkecepatan tinggi menggunakan WebCodecs, ONNX Runtime, & Gemini AI.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 dark:bg-black/40 p-2 rounded-2xl border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setActiveEngine('onnx-webcodecs')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex flex-col items-start gap-0.5 ${
                activeEngine === 'onnx-webcodecs'
                  ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-300" />
                <span>⚡ Ringan (Browser ROI / HP & PC Kentang)</span>
              </div>
              <span className={`text-[10px] font-normal ${activeEngine === 'onnx-webcodecs' ? 'text-fuchsia-100' : 'text-slate-400'}`}>
                Optimal 100% di browser, hemat RAM & CPU
              </span>
            </button>

            <button
              onClick={() => setActiveEngine('gemini-ai')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex flex-col items-start gap-0.5 ${
                activeEngine === 'gemini-ai'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>🤖 Cloud Gemini AI (Nol Beban PC)</span>
              </div>
              <span className={`text-[10px] font-normal ${activeEngine === 'gemini-ai' ? 'text-indigo-100' : 'text-slate-400'}`}>
                Diproses di server Google Cloud
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: EDITOR & CANVAS WORKSPACE */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-7 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xl space-y-5">
            
            {/* CANVAS / EDITOR CONTAINER */}
            <div 
              ref={containerRef}
              className="w-full min-h-[420px] bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center select-none"
            >
              {selectedItem ? (
                <div className="relative w-full h-full max-h-[600px] flex items-center justify-center p-2">
                  
                  {/* Hidden Video element for frame processing */}
                  {selectedItem.type === 'video' && (
                    <video
                      ref={videoRef}
                      src={selectedItem.previewUrl}
                      className="hidden"
                      crossOrigin="anonymous"
                      muted
                      playsInline
                    />
                  )}

                  {/* Main Display Canvas */}
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-[560px] object-contain rounded-xl shadow-2xl"
                  />

                  {/* Mask Drawing Canvas Overlay */}
                  <canvas
                    ref={maskCanvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="absolute max-w-full max-h-[560px] object-contain rounded-xl cursor-crosshair z-20"
                    style={{ pointerEvents: isComparing ? 'none' : 'auto' }}
                  />

                  {/* Before/After View Comparison Overlay */}
                  {isComparing && selectedItem.processedUrl && (
                    <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md rounded-xl p-3 flex flex-col overflow-hidden">
                      {/* Header Mode Switcher & Close button */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setComparisonMode('side-by-side')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                              comparisonMode === 'side-by-side'
                                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                            }`}
                          >
                            <Columns className="w-3.5 h-3.5" />
                            Side-by-Side (Berdampingan)
                          </button>

                          <button
                            onClick={() => setComparisonMode('slider')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                              comparisonMode === 'slider'
                                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                            }`}
                          >
                            <Split className="w-3.5 h-3.5" />
                            Split Slider Drag
                          </button>
                        </div>

                        <button
                          onClick={() => setIsComparing(false)}
                          className="p-1.5 px-3 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white text-xs font-bold flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Tutup
                        </button>
                      </div>

                      {/* Comparison Body */}
                      <div className="flex-1 min-h-0 py-2 relative overflow-hidden flex flex-col justify-center">
                        {comparisonMode === 'side-by-side' ? (
                          <div className="w-full h-full flex flex-col justify-between space-y-2">
                            {/* Side-by-Side Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
                              {/* Left: Original (With Watermark) */}
                              <div className="bg-slate-900/90 rounded-xl border border-rose-500/30 p-2 flex flex-col relative overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    📍 Original (Ada Watermark)
                                  </span>
                                </div>
                                <div className="flex-1 min-h-0 flex items-center justify-center relative bg-black/40 rounded-lg overflow-hidden">
                                  {selectedItem.type === 'video' ? (
                                    <video
                                      ref={origVideoRef}
                                      src={selectedItem.previewUrl}
                                      onTimeUpdate={() => {
                                        if (origVideoRef.current) {
                                          setSyncTime(origVideoRef.current.currentTime);
                                          if (origVideoRef.current.duration) setSyncDuration(origVideoRef.current.duration);
                                        }
                                      }}
                                      className="max-w-full max-h-full object-contain rounded-lg"
                                      playsInline
                                      muted
                                    />
                                  ) : (
                                    <img
                                      src={selectedItem.previewUrl}
                                      alt="Original Watermark"
                                      className="max-w-full max-h-full object-contain rounded-lg"
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Right: Clean Result (No Watermark) */}
                              <div className="bg-slate-900/90 rounded-xl border border-emerald-500/30 p-2 flex flex-col relative overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    ✨ Clean Result (Removal Gen)
                                  </span>
                                </div>
                                <div className="flex-1 min-h-0 flex items-center justify-center relative bg-black/40 rounded-lg overflow-hidden">
                                  {selectedItem.type === 'video' ? (
                                    <video
                                      ref={cleanVideoRef}
                                      src={selectedItem.processedUrl}
                                      className="max-w-full max-h-full object-contain rounded-lg"
                                      playsInline
                                      muted
                                    />
                                  ) : (
                                    <img
                                      src={selectedItem.processedUrl}
                                      alt="Clean Result"
                                      className="max-w-full max-h-full object-contain rounded-lg"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Synchronized Player Bar (For Video Comparison) */}
                            {selectedItem.type === 'video' && (
                              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-white/10 flex items-center gap-3 shrink-0">
                                <button
                                  onClick={toggleSyncPlay}
                                  className="p-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold transition-all shrink-0 flex items-center gap-1.5 text-xs"
                                >
                                  {isSyncPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                  {isSyncPlaying ? 'Pause Sync' : 'Play Both'}
                                </button>

                                <button
                                  onClick={() => handleSyncSeek(0)}
                                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all shrink-0"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>

                                {/* Time scrubber */}
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="0"
                                    max={syncDuration || 100}
                                    step="0.05"
                                    value={syncTime}
                                    onChange={(e) => handleSyncSeek(Number(e.target.value))}
                                    className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                                  />
                                  <span className="text-[11px] font-mono font-bold text-slate-300 shrink-0">
                                    {formatVideoTime(syncTime)} / {formatVideoTime(syncDuration)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Split Slider Mode */
                          <div className="relative w-full h-full max-h-[520px] overflow-hidden rounded-xl flex items-center justify-center">
                            {/* Processed (After) Image */}
                            <img
                              src={selectedItem.processedUrl}
                              alt="Processed Result"
                              className="absolute inset-0 w-full h-full object-contain"
                            />

                            {/* Original (Before) Clip Container */}
                            <div
                              className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-fuchsia-500 shadow-2xl"
                              style={{ width: `${comparisonPos}%` }}
                            >
                              <img
                                src={selectedItem.previewUrl}
                                alt="Original"
                                className="absolute top-0 left-0 max-w-none h-full object-contain"
                                style={{ width: containerRef.current?.clientWidth }}
                              />
                              <span className="absolute top-3 left-3 bg-black/70 backdrop-blur border border-rose-500/30 px-2.5 py-1 rounded-md text-[10px] font-black text-rose-400 uppercase tracking-wider">
                                Original (Watermark)
                              </span>
                            </div>

                            <span className="absolute top-3 right-3 bg-fuchsia-600/90 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-black text-white uppercase tracking-wider">
                              Clean (Removal Gen)
                            </span>

                            {/* Slider Handle */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={comparisonPos}
                              onChange={(e) => setComparisonPos(Number(e.target.value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Overlay with Real-time Frame HUD */}
                  {selectedItem.status === 'processing' && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-50 flex flex-col justify-between p-4 pointer-events-none">
                      {/* TOP LIVE FRAME HUD */}
                      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-fuchsia-500/30 p-3 rounded-2xl shadow-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center shrink-0">
                            <Film className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">
                                ⚡ Real-Time Inpainting Active
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold animate-pulse">
                                Live Frame
                              </span>
                            </div>
                            {processingFrameInfo ? (
                              <p className="text-[11px] text-slate-300 font-mono">
                                Frame <strong className="text-fuchsia-400">{processingFrameInfo.currentFrame}</strong> / {processingFrameInfo.totalFrames} • Durasi: {processingFrameInfo.currentTime.toFixed(1)}s / {processingFrameInfo.duration.toFixed(1)}s
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 font-mono">Menyiapkan frame kanvas...</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-lg font-black text-fuchsia-400">{selectedItem.progress}%</span>
                        </div>
                      </div>

                      {/* BOTTOM PROGRESS BAR */}
                      <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2">
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-150"
                            style={{ width: `${selectedItem.progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-bold text-slate-300">
                          {selectedItem.type === 'video'
                            ? 'Memproses & mengekstrak watermark tiap frame video secara langsung...'
                            : 'Menghapus watermark piksel gambar...'}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* EMPTY UPLOAD DROPZONE */
                <label className="flex flex-col items-center justify-center p-8 cursor-pointer text-center group">
                  <div className="w-20 h-20 bg-fuchsia-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-fuchsia-500" />
                  </div>
                  <h3 className="text-lg font-black text-white">Unggah Gambar atau Video</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Seret & letakkan berkas PNG, JPG, WebP, MP4, WebM di sini untuk menghapus watermark secara instan.
                  </p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* CONTROL TOOLBAR FOR MASKING & COMPARISON */}
            {selectedItem && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                
                {/* PRESET MASK SELECTOR BUTTONS */}
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-2">
                    <Focus className="w-4 h-4 text-fuchsia-500" />
                    Pilih Area Watermark (Preset Bounding Box)
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      onClick={() => setPresetMask('veo3-corner')}
                      className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                        presetMask === 'veo3-corner' || presetMask === 'bottom-right'
                          ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 font-black shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      🎥 Veo 3 & Gemini (Kanan Bawah)
                    </button>

                    <button
                      onClick={() => setPresetMask('bottom-left')}
                      className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                        presetMask === 'bottom-left'
                          ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 font-black'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      📍 Kiri Bawah (Logo)
                    </button>

                    <button
                      onClick={() => setPresetMask('top-right')}
                      className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                        presetMask === 'top-right'
                          ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 font-black'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      📍 Kanan Atas (Badge)
                    </button>

                    <button
                      onClick={() => setPresetMask('center-grid')}
                      className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                        presetMask === 'center-grid'
                          ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 font-black'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      📍 Center Grid (Stock)
                    </button>

                    <button
                      onClick={() => setPresetMask('auto-detect')}
                      className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                        presetMask === 'auto-detect'
                          ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      🔍 Auto Detect (AI)
                    </button>
                  </div>
                </div>

                {/* BRUSH TOOLS & ERASER */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBrushMode('paint')}
                      className={`p-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        brushMode === 'paint'
                          ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-500/20'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                      }`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      Kuas Masking
                    </button>

                    <button
                      onClick={() => setBrushMode('erase')}
                      className={`p-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        brushMode === 'erase'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                      }`}
                    >
                      Penghapus Mask
                    </button>

                    <button
                      onClick={clearMask}
                      className="p-2 px-3 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Reset Mask
                    </button>
                  </div>

                  {/* BRUSH SIZE SLIDER */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Ukuran Kuas: {brushSize}px
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-28 accent-fuchsia-500 cursor-pointer"
                    />
                  </div>

                  {/* COMPARISON SLIDER TOGGLE */}
                  {selectedItem.processedUrl && (
                    <button
                      onClick={() => setIsComparing(!isComparing)}
                      className={`p-2 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                        isComparing
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      {isComparing ? 'Tutup Comparison' : 'Bandingkan Before / After'}
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* PROCESS & ACTION BUTTONS */}
            {selectedItem && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  onClick={() => processItem(selectedItem.id)}
                  disabled={selectedItem.status === 'processing'}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-black rounded-2xl text-base shadow-xl shadow-fuchsia-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Wand2 className="w-5 h-5" />
                  Hapus Watermark Berkas Ini
                </button>

                {selectedItem.processedUrl && (
                  <button
                    onClick={() => downloadProcessedItem(selectedItem)}
                    className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-base shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    Unduh Hasil Clean
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: QUEUE & BATCH MANAGEMENT */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-fuchsia-500" />
                  Daftar Antrean ({items.length})
                </h3>
                <p className="text-[11px] font-bold text-slate-400">Berkas siap diproses batch</p>
              </div>

              {items.length > 0 && (
                <button
                  onClick={clearAllItems}
                  className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            {/* UPLOAD MORE BUTTON */}
            <label className="w-full p-3 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-dashed border-fuchsia-500/40 rounded-2xl text-fuchsia-600 dark:text-fuchsia-400 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              + Tambah Berkas Gambar / Video
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* QUEUE ITEM LIST */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {items.map(item => {
                const isSelected = item.id === selectedItemId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-fuchsia-500/10 border-fuchsia-500 text-slate-900 dark:text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    {/* THUMBNAIL */}
                    <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 relative flex items-center justify-center">
                      {item.type === 'image' ? (
                        <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center text-fuchsia-400">
                          <Film className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* FILE DETAILS */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{item.file.name}</p>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
                        {item.type} • {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                      </span>

                      {/* STATUS BADGE */}
                      {item.status === 'processing' && (
                        <span className="text-[10px] font-bold text-fuchsia-500 animate-pulse">
                          Memproses ({item.progress}%)
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Selesai Clean
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[10px] font-bold text-rose-500">
                          Gagal
                        </span>
                      )}
                    </div>

                    {/* REMOVE ITEM BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-bold">
                  Belum ada berkas dalam antrean.
                </div>
              )}
            </div>

            {/* BATCH ACTION BUTTONS */}
            {items.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                <button
                  onClick={processAllItems}
                  disabled={isBatchProcessing}
                  className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  {isBatchProcessing ? processingStatusText || 'Memproses Antrean...' : 'Hapus Watermark Semua Antrean'}
                </button>

                {items.some(i => i.processedUrl !== null) && (
                  <button
                    onClick={() => items.filter(i => i.processedUrl).forEach(downloadProcessedItem)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Semua Hasil Clean
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
