import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, Layers, CopyCheck, AlertTriangle, CheckCircle2, Trash2, 
  Eye, Download, Filter, RefreshCw, Sliders, ArrowRight, ShieldAlert,
  Sparkles, Check, X, Info, Zap, ZoomIn, ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FeatureGuideButton } from './FeatureGuideModal';

export interface ImageFingerprint {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width: number;
  height: number;
  dHash: string; // Difference hash (64-bit hex)
  pHash: string; // Perceptual average hash (64-bit hex)
  colorHist: number[]; // 32-bin normalized RGB histogram
  sharpnessScore: number; // Laplacian gradient variance approximation
  clusterId?: number;
  isBestPick?: boolean;
  selectedForSubmission: boolean;
}

export interface SimilarityPair {
  imgA: ImageFingerprint;
  imgB: ImageFingerprint;
  similarity: number; // 0 to 100%
  risk: 'HIGH' | 'MODERATE' | 'SAFE';
}

export interface SimilarityCluster {
  id: number;
  images: ImageFingerprint[];
  avgSimilarity: number;
  risk: 'HIGH' | 'MODERATE' | 'SAFE';
  bestPickId: string;
}

export const AntiSpamView: React.FC<{
  t: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  setShowActivationModal?: (show: boolean) => void;
}> = ({
  t,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal,
  setShowActivationModal
}) => {
  const isIndo = t.language === 'Bahasa';
  const [items, setItems] = useState<ImageFingerprint[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, step: '' });
  const [threshold, setThreshold] = useState<number>(80); // Default 80% similarity threshold
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'moderate' | 'safe'>('all');
  const [comparingPair, setComparingPair] = useState<SimilarityPair | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // 1. FAST CLIENT-SIDE VISUAL FINGERPRINTING (Canvas dHash + pHash)
  // -------------------------------------------------------------
  const computeFingerprint = (file: File): Promise<ImageFingerprint> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const previewUrl = URL.createObjectURL(file);
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        // 1.1 Compute dHash (9x8 grayscale canvas -> 64-bit gradient)
        const dCanvas = document.createElement('canvas');
        dCanvas.width = 9;
        dCanvas.height = 8;
        const dCtx = dCanvas.getContext('2d', { willReadFrequently: true });
        let dHash = '';
        if (dCtx) {
          dCtx.drawImage(img, 0, 0, 9, 8);
          const imgData = dCtx.getImageData(0, 0, 9, 8).data;
          const grays: number[][] = [];
          for (let y = 0; y < 8; y++) {
            grays[y] = [];
            for (let x = 0; x < 9; x++) {
              const idx = (y * 9 + x) * 4;
              grays[y][x] = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
            }
          }
          let bits = '';
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              bits += grays[y][x] > grays[y][x + 1] ? '1' : '0';
            }
          }
          for (let i = 0; i < 64; i += 4) {
            dHash += parseInt(bits.substring(i, i + 4), 2).toString(16);
          }
        }

        // 1.2 Compute 32-bin Color Histogram & Sharpness on a 64x64 canvas
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 64;
        sCanvas.height = 64;
        const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
        const hist = new Array(32).fill(0);
        let laplacianSum = 0;
        let pHash = '';

        if (sCtx) {
          sCtx.drawImage(img, 0, 0, 64, 64);
          const sData = sCtx.getImageData(0, 0, 64, 64).data;
          let totalLuma = 0;
          const lumas: number[] = [];

          for (let i = 0; i < sData.length; i += 4) {
            const r = sData[i];
            const g = sData[i + 1];
            const b = sData[i + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            lumas.push(luma);
            totalLuma += luma;

            const bin = Math.min(31, Math.floor((r + g + b) / (3 * 8)));
            hist[bin]++;
          }

          const totalPix = 64 * 64;
          for (let b = 0; b < 32; b++) {
            hist[b] = hist[b] / totalPix;
          }

          for (let y = 1; y < 63; y++) {
            for (let x = 1; x < 63; x++) {
              const idx = y * 64 + x;
              const center = lumas[idx];
              const diff = Math.abs(center - lumas[idx - 1]) +
                           Math.abs(center - lumas[idx + 1]) +
                           Math.abs(center - lumas[idx - 64]) +
                           Math.abs(center - lumas[idx + 64]);
              laplacianSum += diff;
            }
          }

          const avgLuma = totalLuma / totalPix;
          let pBits = '';
          for (let i = 0; i < 64; i++) {
            const sampleIdx = Math.floor(i * (totalPix / 64));
            pBits += lumas[sampleIdx] >= avgLuma ? '1' : '0';
          }
          for (let i = 0; i < 64; i += 4) {
            pHash += parseInt(pBits.substring(i, i + 4), 2).toString(16);
          }
        }

        const sharpnessScore = Math.min(100, Math.round((laplacianSum / (62 * 62 * 4)) * 2));

        resolve({
          id: Math.random().toString(36).substring(2, 11),
          file,
          previewUrl,
          name: file.name,
          size: file.size,
          width,
          height,
          dHash: dHash || '0000000000000000',
          pHash: pHash || '0000000000000000',
          colorHist: hist,
          sharpnessScore,
          selectedForSubmission: true
        });
      };
      img.onerror = () => reject(new Error('Failed to load image for fingerprinting'));
      img.src = previewUrl;
    });
  };

  // -------------------------------------------------------------
  // 2. SIMILARITY SCORE CALCULATION
  // -------------------------------------------------------------
  const getHammingDistance = (hex1: string, hex2: string): number => {
    let distance = 0;
    const len = Math.min(hex1.length, hex2.length);
    for (let i = 0; i < len; i++) {
      const v1 = parseInt(hex1[i], 16) || 0;
      const v2 = parseInt(hex2[i], 16) || 0;
      let xor = v1 ^ v2;
      while (xor > 0) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  };

  const getCosineSimilarity = (v1: number[], v2: number[]): number => {
    let dot = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }
    const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
    return mag === 0 ? 0 : dot / mag;
  };

  const calculateSimilarity = (imgA: ImageFingerprint, imgB: ImageFingerprint): number => {
    const dDist = getHammingDistance(imgA.dHash, imgB.dHash);
    const dSim = Math.max(0, 1 - dDist / 32);

    const pDist = getHammingDistance(imgA.pHash, imgB.pHash);
    const pSim = Math.max(0, 1 - pDist / 32);

    const colorSim = getCosineSimilarity(imgA.colorHist, imgB.colorHist);

    const arA = imgA.width / (imgA.height || 1);
    const arB = imgB.width / (imgB.height || 1);
    const arSim = Math.min(arA, arB) / Math.max(arA, arB);

    const totalSim = (dSim * 0.45) + (pSim * 0.25) + (colorSim * 0.20) + (arSim * 0.10);
    return Math.min(100, Math.max(0, Math.round(totalSim * 100)));
  };

  // -------------------------------------------------------------
  // 3. CLUSTERING & BEST PICK SELECTION
  // -------------------------------------------------------------
  const clusters: SimilarityCluster[] = useMemo(() => {
    if (items.length === 0) return [];

    const n = items.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i: number): number => {
      if (parent[i] === i) return i;
      return (parent[i] = find(parent[i]));
    };
    const union = (i: number, j: number) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent[rootI] = rootJ;
    };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sim = calculateSimilarity(items[i], items[j]);
        if (sim >= threshold) {
          union(i, j);
        }
      }
    }

    const clusterMap = new Map<number, ImageFingerprint[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!clusterMap.has(root)) clusterMap.set(root, []);
      clusterMap.get(root)!.push(items[i]);
    }

    const result: SimilarityCluster[] = [];
    let clusterIdx = 1;

    for (const [, group] of clusterMap.entries()) {
      let sumSim = 0;
      let count = 0;
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          sumSim += calculateSimilarity(group[a], group[b]);
          count++;
        }
      }
      const avgSimilarity = count > 0 ? Math.round(sumSim / count) : 0;

      let bestPick = group[0];
      let bestScore = -1;
      for (const img of group) {
        const score = img.sharpnessScore * 0.7 + ((img.width * img.height) / 1000000) * 0.3;
        if (score > bestScore) {
          bestScore = score;
          bestPick = img;
        }
      }

      let risk: 'HIGH' | 'MODERATE' | 'SAFE' = 'SAFE';
      if (group.length > 1) {
        if (avgSimilarity >= 85) risk = 'HIGH';
        else if (avgSimilarity >= 75) risk = 'MODERATE';
        else risk = 'SAFE';
      }

      result.push({
        id: clusterIdx++,
        images: group,
        avgSimilarity: group.length > 1 ? avgSimilarity : 0,
        risk,
        bestPickId: bestPick.id
      });
    }

    return result.sort((a, b) => {
      const order = { HIGH: 0, MODERATE: 1, SAFE: 2 };
      if (order[a.risk] !== order[b.risk]) return order[a.risk] - order[b.risk];
      return b.images.length - a.images.length;
    });
  }, [items, threshold]);

  useEffect(() => {
    if (clusters.length === 0) return;
    const bestIds = new Set(clusters.map(c => c.bestPickId));
    setItems(prev => prev.map(img => ({
      ...img,
      isBestPick: bestIds.has(img.id)
    })));
  }, [clusters.length, threshold]);

  // -------------------------------------------------------------
  // 4. FILE UPLOAD HANDLER
  // -------------------------------------------------------------
  const handleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => 
      f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif)$/i.test(f.name)
    );
    if (validFiles.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: validFiles.length, step: isIndo ? 'Mengekstrak visual fingerprint...' : 'Extracting visual fingerprints...' });

    const newItems: ImageFingerprint[] = [];
    for (let i = 0; i < validFiles.length; i++) {
      try {
        const fp = await computeFingerprint(validFiles[i]);
        newItems.push(fp);
        setProgress({ current: i + 1, total: validFiles.length, step: isIndo ? `Memproses ${validFiles[i].name}...` : `Processing ${validFiles[i].name}...` });
      } catch (err) {
        console.warn('Fingerprint error for', validFiles[i].name, err);
      }
    }

    setItems(prev => [...prev, ...newItems]);
    setIsProcessing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // -------------------------------------------------------------
  // 5. SMART CURATOR ACTIONS
  // -------------------------------------------------------------
  const selectBestPicksOnly = () => {
    const bestIds = new Set(clusters.map(c => c.bestPickId));
    setItems(prev => prev.map(img => ({
      ...img,
      selectedForSubmission: bestIds.has(img.id)
    })));
  };

  const toggleSelect = (id: string) => {
    setItems(prev => prev.map(img => img.id === id ? { ...img, selectedForSubmission: !img.selectedForSubmission } : img));
  };

  const clearAll = () => {
    items.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
  };

  const exportAuditReport = () => {
    const reportData = clusters.map(c => ({
      cluster_id: c.id,
      risk_level: c.risk,
      similarity_score: `${c.avgSimilarity}%`,
      total_images_in_group: c.images.length,
      primary_best_pick: c.images.find(i => i.id === c.bestPickId)?.name || '',
      images_list: c.images.map(i => i.name).join('; '),
      action_recommended: c.risk === 'HIGH' ? 'Reject/Prune redundant variations (Similar Content Risk)' : 'Safe for Commercial Submission'
    }));

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Anti_Spam_Audit_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // 6. FILTERED CLUSTERS
  // -------------------------------------------------------------
  const filteredClusters = clusters.filter(c => {
    if (activeFilter === 'high') return c.risk === 'HIGH';
    if (activeFilter === 'moderate') return c.risk === 'MODERATE';
    if (activeFilter === 'safe') return c.risk === 'SAFE' || c.images.length === 1;
    return true;
  });

  const highRiskCount = clusters.filter(c => c.risk === 'HIGH').length;
  const moderateCount = clusters.filter(c => c.risk === 'MODERATE').length;
  const safeCount = clusters.filter(c => c.risk === 'SAFE' || c.images.length === 1).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30">
              <CopyCheck size={20} className="stroke-[2.5]" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isIndo ? 'Anti-Spam & "Similar Content" Batch Checker' : 'Anti-Spam & Similar Content Batch Checker'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isIndo 
              ? 'Deteksi otomatis variasi gambar yang terlalu mirip & cegah penolakan "Similar Content / Spam" kurator Adobe Stock & Shutterstock.' 
              : 'Automatically detect excessive duplicate variations and avoid "Similar Content / Spam" rejections on Adobe Stock & Shutterstock.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FeatureGuideButton
            title={isIndo ? 'Panduan Anti-Spam Similar Checker' : 'Anti-Spam Similar Checker Guide'}
            description={isIndo 
              ? 'Fitur ini menganalisis ratusan gambar dalam satu batch menggunakan visual fingerprinting (dHash + pHash + RGB histogram) untuk mengelompokkan variasi yang terlalu mirip.\n\n📌 Mengapa Ini Penting?\n• Kurator Adobe Stock & Shutterstock secara rutin menolak batch foto/AI yang sudutnya hanya bergeser sedikit dengan alasan "Similar Content / Spam".\n• Fitur ini otomatis menyarankan 1 foto tertajam (Best Pick) dan merekomendasikan untuk menyingkirkan duplikat berlebih sebelum di-upload.'
              : 'This feature analyzes batch images using visual fingerprinting (dHash + pHash + color histograms) to cluster excessive duplicate variations.\n\n📌 Why is this crucial?\n• Adobe Stock & Shutterstock curators strictly reject submissions with minor angle shifts under "Similar Content / Spam".\n• This tool automatically picks the sharpest shot (Best Pick) and prunes redundant variations before submission.'}
          />
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all"
            >
              <Trash2 size={14} />
              <span>{isIndo ? 'Bersihkan' : 'Clear All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Dropzone */}
      {items.length === 0 ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragActive 
              ? 'border-amber-500 bg-amber-500/10 scale-[1.01]' 
              : 'border-slate-300 dark:border-white/10 hover:border-amber-500/50 bg-slate-50/50 dark:bg-white/[0.01]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <Upload size={32} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                {isIndo ? 'Tarik & Letakkan Batch Foto / Ilustrasi di Sini' : 'Drag & Drop Batch Photos / Illustrations Here'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {isIndo 
                  ? 'Mendukung hingga 500+ file (JPG, PNG, WebP) sekaligus. Diproses instan & aman langsung di browser.' 
                  : 'Supports 500+ files (JPG, PNG, WebP) at once. Instant and secure client-side processing.'}
              </p>
            </div>
            <button
              type="button"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all"
            >
              {isIndo ? 'PILIH FOLDER / BATCH GAMBAR' : 'CHOOSE BATCH IMAGES'}
            </button>
          </div>
        </div>
      ) : (
        /* Batch Dashboard View */
        <div className="space-y-6">
          {/* Controls & Statistics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {isIndo ? 'Total Gambar Dipindai' : 'Total Images Scanned'}
              </span>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100">{items.length}</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                  {isIndo ? 'Klaster Risiko Spam (>85%)' : 'High Spam Risk (>85%)'}
                </span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400">{highRiskCount} {isIndo ? 'Klaster' : 'Clusters'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                {isIndo ? 'Variasi Serupa (75%-84%)' : 'Moderate Variations'}
              </span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">{moderateCount} {isIndo ? 'Klaster' : 'Clusters'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                {isIndo ? 'Konten Unik & Aman' : 'Safe & Unique Content'}
              </span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{safeCount} {isIndo ? 'Aset' : 'Assets'}</p>
            </div>
          </div>

          {/* Action Toolbar & Threshold Slider */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Threshold Slider */}
            <div className="flex items-center gap-3">
              <Sliders size={16} className="text-amber-500 shrink-0" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {isIndo ? 'Sensitivitas Kemiripan:' : 'Similarity Threshold:'}
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {threshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-44 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/60">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isIndo ? 'Semua' : 'All'} ({clusters.length})
              </button>
              <button
                onClick={() => setActiveFilter('high')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'high' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-500'
                }`}
              >
                {isIndo ? 'Risiko Tinggi' : 'High Risk'} ({highRiskCount})
              </button>
              <button
                onClick={() => setActiveFilter('moderate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'moderate' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-amber-500'
                }`}
              >
                {isIndo ? 'Moderat' : 'Moderate'} ({moderateCount})
              </button>
              <button
                onClick={() => setActiveFilter('safe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'safe' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-500'
                }`}
              >
                {isIndo ? 'Aman' : 'Safe'} ({safeCount})
              </button>
            </div>

            {/* Smart Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={selectBestPicksOnly}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black tracking-wide shadow-md shadow-amber-500/20 transition-all"
                title={isIndo ? 'Otomatis pilih 1 variasi tertajam & singkirkan duplikat' : 'Automatically select 1 best variation per cluster'}
              >
                <Sparkles size={14} />
                <span>{isIndo ? 'Pilih Terbaik Saja' : 'Pick Best Only'}</span>
              </button>

              <button
                onClick={exportAuditReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all"
                title={isIndo ? 'Unduh Laporan Audit Kemiripan JSON' : 'Export JSON audit report'}
              >
                <Download size={14} />
                <span>{isIndo ? 'Laporan JSON' : 'Export Report'}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all"
                title={isIndo ? 'Tambah Gambar' : 'Add More Images'}
              >
                <Upload size={16} />
              </button>
            </div>
          </div>

          {/* Clusters Grid */}
          <div className="space-y-4">
            {filteredClusters.length === 0 ? (
              <div className="p-12 text-center border rounded-3xl bg-slate-50/50 dark:bg-white/[0.01] border-slate-200/50 dark:border-white/5">
                <p className="text-xs font-bold text-slate-400">
                  {isIndo ? 'Tidak ada klaster dalam kategori filter ini.' : 'No clusters found for this filter.'}
                </p>
              </div>
            ) : (
              filteredClusters.map((cluster) => {
                const isHigh = cluster.risk === 'HIGH';
                const isModerate = cluster.risk === 'MODERATE';
                const isSafe = cluster.risk === 'SAFE';

                return (
                  <div
                    key={cluster.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      isHigh 
                        ? 'bg-rose-500/[0.02] border-rose-500/20 dark:bg-rose-500/[0.01]' 
                        : isModerate
                          ? 'bg-amber-500/[0.02] border-amber-500/20 dark:bg-amber-500/[0.01]'
                          : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5'
                    }`}
                  >
                    {/* Cluster Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-white/5 pb-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                          isHigh 
                            ? 'bg-rose-500 text-white' 
                            : isModerate
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isHigh ? (isIndo ? '⚠️ RISIKO SPAM TINGGI' : '⚠️ HIGH SPAM RISK') : isModerate ? (isIndo ? 'VARIASI SERUPA' : 'MODERATE VARIATION') : (isIndo ? 'AMAN & UNIK' : 'SAFE & UNIQUE')}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {isIndo ? `Klaster #${cluster.id}` : `Cluster #${cluster.id}`} ({cluster.images.length} {isIndo ? 'Gambar' : 'Images'})
                        </h4>
                        {cluster.avgSimilarity > 0 && (
                          <span className="text-xs font-bold text-slate-400">
                            • {isIndo ? 'Tingkat Kemiripan:' : 'Similarity:'} <strong className={isHigh ? 'text-rose-500' : 'text-amber-500'}>{cluster.avgSimilarity}%</strong>
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        {isHigh && (
                          <span className="text-rose-500 font-bold">
                            {isIndo ? 'Disarankan hanya submit 1 variasi terbaik' : 'Recommended: Submit 1 best pick only'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cluster Images Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {cluster.images.map((img) => {
                        const isBestPick = img.id === cluster.bestPickId;
                        const isSelected = img.selectedForSubmission;

                        return (
                          <div
                            key={img.id}
                            className={`relative rounded-2xl overflow-hidden border p-2 flex flex-col justify-between transition-all group ${
                              isSelected
                                ? isBestPick
                                  ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/30'
                                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-white/10'
                                : 'bg-slate-100/50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-white/5 opacity-50'
                            }`}
                          >
                            {/* Best Pick Badge */}
                            {isBestPick && (
                              <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                                <Sparkles size={9} />
                                <span>{isIndo ? 'TERBAIK' : 'BEST PICK'}</span>
                              </div>
                            )}

                            {/* Checkbox Toggle */}
                            <button
                              onClick={() => toggleSelect(img.id)}
                              className={`absolute top-3 right-3 z-10 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                isSelected ? 'bg-emerald-500 text-white shadow' : 'bg-black/40 text-transparent hover:bg-black/60 border border-white/20'
                              }`}
                            >
                              <Check size={12} className="stroke-[3]" />
                            </button>

                            {/* Image Preview */}
                            <div className="aspect-square rounded-xl overflow-hidden bg-slate-950 relative mb-2">
                              <img
                                src={img.previewUrl}
                                alt={img.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                              />
                            </div>

                            {/* Details */}
                            <div className="space-y-1 text-[9px]">
                              <p className="font-bold text-slate-700 dark:text-slate-200 truncate" title={img.name}>
                                {img.name}
                              </p>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>{img.width}x{img.height}</span>
                                <span className="font-mono">{img.sharpnessScore}% Sharp</span>
                              </div>
                            </div>

                            {/* Side-by-Side Inspect Button */}
                            {cluster.images.length > 1 && (
                              <button
                                onClick={() => {
                                  const other = cluster.images.find(otherImg => otherImg.id !== img.id) || cluster.images[0];
                                  setComparingPair({
                                    imgA: img,
                                    imgB: other,
                                    similarity: cluster.avgSimilarity,
                                    risk: cluster.risk
                                  });
                                }}
                                className="mt-2 w-full py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-[8.5px] font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center gap-1"
                              >
                                <Eye size={10} />
                                <span>{isIndo ? 'Bandingkan' : 'Compare'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      <AnimatePresence>
        {comparingPair && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                    comparingPair.risk === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {comparingPair.similarity}% {isIndo ? 'Kemiripan' : 'Similarity'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isIndo ? 'Perbandingan Visual Berdampingan' : 'Side-by-Side Visual Comparison'}
                  </h3>
                </div>
                <button
                  onClick={() => setComparingPair(null)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-500 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Two Images Side by Side */}
              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                <div className="space-y-2 flex flex-col">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                    <span className="truncate">{comparingPair.imgA.name}</span>
                    <span className="text-[10px] font-mono text-amber-500">{comparingPair.imgA.sharpnessScore}% Sharp</span>
                  </div>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-200 dark:border-white/10 flex-1">
                    <img src={comparingPair.imgA.previewUrl} alt="A" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-2 flex flex-col">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                    <span className="truncate">{comparingPair.imgB.name}</span>
                    <span className="text-[10px] font-mono text-amber-500">{comparingPair.imgB.sharpnessScore}% Sharp</span>
                  </div>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-200 dark:border-white/10 flex-1">
                    <img src={comparingPair.imgB.previewUrl} alt="B" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Guidance Bottom */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                <span>
                  {isIndo 
                    ? 'Jika kedua gambar hanya memiliki sedikit perbedaan sudut/zoom, kurator akan menolak salah satunya sebagai "Similar Content". Pilih hanya 1 yang paling tajam.' 
                    : 'If both images share the same subject with minor angle shifts, curators will reject one under "Similar Content". Keep only the sharpest shot.'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
