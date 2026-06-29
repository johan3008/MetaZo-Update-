import { getDailyLimit } from '../../constants';
import React, { useState } from 'react';
import { getHeaders } from '../../services/geminiService';
import { Upload, CheckCircle, AlertCircle, Sparkles, Loader2, FileImage, ChevronDown, ChevronUp, Trash2, Zap, Eye, EyeOff, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QualityReport {
  recommendation: "PASS" | "FAIL";
  overall_score: number;
  legal_status: string;
  technical_issues: string[];
  strengths: string[];
  detailed_feedback: string;
  heatmaps?: { type: "noise" | "focus" | "lighting" | "ip_violation" | "artifact"; x: number; y: number; intensity: number; raw_value: string }[];
}

import { FeatureGuideButton } from './FeatureGuideModal';

export const ImageQualityCheck: React.FC<{ 
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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Record<string, QualityReport>>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // removed toggleReportExpand helper since it's not used
  const [progress, setProgress] = useState(0);
  const [tolerance, setTolerance] = useState<'STRICT' | 'MEDIUM' | 'LOOSE'>('MEDIUM');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [showHeatmaps, setShowHeatmaps] = useState<Set<string>>(new Set());
  const [activeComplianceTab, setActiveComplianceTab] = useState<string | null>(null);

  const toggleHeatmap = (fileName: string) => {
    const next = new Set(showHeatmaps);
    if (next.has(fileName)) {
      next.delete(fileName);
    } else {
      next.add(fileName);
    }
    setShowHeatmaps(next);
  };

  const toggleReportExpand = (fileName: string) => {
    const next = new Set(expandedReports);
    if (next.has(fileName)) {
      next.delete(fileName);
    } else {
      next.add(fileName);
    }
    setExpandedReports(next);
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={`qc-skeleton-${i}`} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-[1.5rem] p-5 border border-slate-200 dark:border-white/5 h-[400px] flex flex-col animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
            <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
          </div>
          <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700/50 rounded-[1.5rem] mb-4" />
          <div className="space-y-3">
            <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
            <div className="grid grid-cols-1 gap-2">
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-700/50 rounded-2xl" />
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-700/50 rounded-2xl" />
              <div className="w-full h-8 bg-slate-200 dark:bg-slate-700/50 rounded-2xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const handleClearAll = () => {
    Object.keys(previews).forEach(key => URL.revokeObjectURL(previews[key]));
    setFiles([]);
    setPreviews({});
    setReports({});
    setError(null);
    setShowHeatmaps(new Set());
  };

  const handleRemoveReport = (fileName: string) => {
    setReports(prev => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setPreviews(prev => {
      const next = { ...prev };
      if (next[fileName]) {
        URL.revokeObjectURL(next[fileName]);
        delete next[fileName];
      }
      return next;
    });
  };

  const resizeAndProcess = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    if (fileArray.length === 0) return;

    // Filter out duplicate files by name to ensure clean state
    const existingNames = new Set(files.map(f => f.name));
    const newFiles = fileArray.filter(f => !existingNames.has(f.name));

    if (newFiles.length === 0) return;

    // Append new files to existing files
    setFiles(prev => [...prev, ...newFiles]);
    
    // Append new previews to existing previews
    const updatedPreviews = { ...previews };
    newFiles.forEach(file => {
      updatedPreviews[file.name] = URL.createObjectURL(file);
    });
    setPreviews(updatedPreviews);
    
    setError(null);
    setIsDragging(false);

    // Auto-trigger analysis for newly added files immediately
    await handleAnalyze(newFiles);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(e.target.files);
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
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleAnalyze = async (filesToAnalyze?: any) => {
    const targetFiles = Array.isArray(filesToAnalyze) ? filesToAnalyze : files;
    if (targetFiles.length === 0) return;

    if (!isLicensed && dailyGenCount + targetFiles.length > getDailyLimit()) {
      setError(`Batas Trial Terlampaui. Sisa kuota Anda hari ini adalah ${Math.max(0, getDailyLimit() - dailyGenCount)} kali audit, tetapi Anda mencoba memproses ${targetFiles.length} gambar.`);
      if (setShowLimitModal) {
        setShowLimitModal(true);
      }
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);
    
    // Merge new analysis reports into existing reports!
    const updatedReports = { ...reports };

    const progressPerFile = 100 / targetFiles.length;

    for (let i = 0; i < targetFiles.length; i++) {
      const file = targetFiles[i];
      const startProgress = i * progressPerFile;
      
      try {
        // Increment internally a bit
        setProgress(startProgress + 5);
        
        const base64Image = await resizeAndProcess(file);
        setProgress(startProgress + 15);

        const response = await fetch('/api/check-image-quality', {
          method: 'POST',
          headers: getHeaders(aiOptions),
          body: JSON.stringify({ image: base64Image, tolerance, language: t.language || 'English' }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to analyze ${file.name}`);
        }
        const data = await response.json();
        updatedReports[file.name] = data;
        setReports({ ...updatedReports });
        
        if (incrementDailyCount) {
          incrementDailyCount(1);
        }

        setProgress(startProgress + progressPerFile);
      } catch (err: any) {
        setError(err.message);
      }
    }
    setProgress(100);
    setTimeout(() => setLoading(true), 100); // Trigger a quick refresh state if needed
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      {/* Brand Header - Premium Overhaul */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-emerald-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
          {/* Progress Bar Glow */}
          {loading && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-violet-500 to-emerald-600 transition-all duration-500 ease-out z-50"
              style={{ width: `${progress}%` }}
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
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                  {t.qc_title} <span className="text-emerald-500">{t.qc_title_check}</span>
                </h2>
                <FeatureGuideButton 
                  title={t.guide_image_check_title} 
                  description={t.guide_image_check_desc} 
                  t={t} 
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.15em]">
                  {t.qc_subtitle}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {(files.length > 0 || Object.keys(reports).length > 0) && (
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 border border-slate-200 dark:border-white/10"
              >
                <Trash2 size={13} />
                {t.qc_btn_reset}
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={files.length === 0 || loading}
              className="relative group/btn flex items-center gap-3 px-8 py-3.5 bg-slate-900 dark:bg-emerald-500 hover:bg-black dark:hover:bg-emerald-400 text-white dark:text-slate-950 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 shadow-2xl shadow-slate-900/10 dark:shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} className="group-hover/btn:animate-bounce" />}
              {loading ? t.qc_btn_analyzing : t.qc_btn_analyze}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Stats & Upload */}
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
            </div>
          )}

          {/* Upload Hub - Now Placed Prominently at the Top */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-2 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.qc_upload_hub}</h3>
              {files.length > 0 && (
                <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {files.length} {t.language === 'Bahasa' ? 'Aset' : 'Assets'}
                </span>
              )}
            </div>
            
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group m-4 h-36 md:h-44 cursor-pointer border-2 border-dashed rounded-2xl flex flex-col items-center justify-center space-y-3 transition-all duration-500 ${isDragging ? 'border-emerald-500 bg-emerald-500/5 scale-[0.98]' : 'border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 hover:border-emerald-500/50'}`}
            >
              <div className={`p-3 rounded-2xl bg-white dark:bg-white/5 shadow-md transition-transform duration-500 group-hover:scale-110 ${isDragging ? 'rotate-12' : ''}`}>
                <Upload className="text-emerald-500" size={24} />
              </div>
              <div className="text-center px-4">
                <span className="block text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight">
                  {isDragging ? t.qc_release_images : t.qc_drop_images_here}
                </span>
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center justify-center gap-1.5">
                  <FileImage size={11} /> {t.qc_multiple_upload}
                </span>
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} multiple className="hidden" />
            </label>

            <AnimatePresence>
              {files.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-4 pb-4 space-y-3"
                >
                  <div className="flex justify-between items-center bg-slate-100 dark:bg-black/40 px-3 py-2 rounded-[1.5rem]">
                    <p className="font-black text-[9px] uppercase text-slate-500 tracking-widest">{t.qc_queue_assets}: {files.length}</p>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {files.map((file, idx) => (
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={`${file.name}-${idx}`} 
                        className="flex items-center gap-3 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 p-2 rounded-2xl hover:shadow-md transition-all group"
                      >
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                          {previews[file.name] && (
                            <img src={previews[file.name]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                          <p className="text-[8px] text-slate-400 font-black uppercase">{t.qc_pending_audit}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveReport(file.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                          title={t.language === 'Bahasa' ? 'Hapus' : 'Remove'}
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tolerance Card - Interactive Pill Selector */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t.qc_tolerance_label}</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'STRICT', label: t.language === 'Bahasa' ? 'Ketat' : 'Strict', sub: t.language === 'Bahasa' ? 'Presisi' : 'Hardcore' },
                { value: 'MEDIUM', label: t.language === 'Bahasa' ? 'Sedang' : 'Medium', sub: t.language === 'Bahasa' ? 'Standar' : 'Standard' },
                { value: 'LOOSE', label: t.language === 'Bahasa' ? 'Longgar' : 'Loose', sub: t.language === 'Bahasa' ? 'Uji Coba' : 'Playground' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTolerance(opt.value as any)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${
                    tolerance === opt.value
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 font-black'
                      : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold'
                  }`}
                >
                  <span className="text-[10px] uppercase leading-none">{opt.label}</span>
                  <span className={`text-[8px] mt-1 font-bold opacity-75 uppercase tracking-tighter ${tolerance === opt.value ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Adobe Stock IP Refusal & Quality Compliance Guide - Placed Below Controls */}
          <div className="bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/15 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertCircle size={15} className="shrink-0 animate-pulse" />
              <h4 className="text-[11px] font-black tracking-wider uppercase">
                {t.language === 'Bahasa' ? 'KETERANGAN PENOLAKAN KUALITAS & IP ADOBE' : 'ADOBE QUALITY & IP REFUSAL COMPLIANCE'}
              </h4>
            </div>
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.language === 'Bahasa' 
                ? 'Panduan kepatuhan visual resmi Adobe Stock untuk menghindari penolakan karena masalah kekayaan intelektual (IP Refusal) atau cacat kualitas teknis.'
                : 'Official Adobe Stock visual compliance guide to prevent rejections due to Intellectual Property (IP Refusal) or technical quality issues.'
              }
            </p>

            <div className="space-y-2">
              {[
                {
                  id: 'brands',
                  title: t.language === 'Bahasa' ? '1. Merek Dagang & Logo' : '1. Trademarks & Logos',
                  desc: t.language === 'Bahasa' 
                    ? 'Penolakan mutlak jika terdapat logo, nama produk, atau grafis identitas yang dilindungi hak cipta (misalnya logo centang Nike, logo Apple, Starbucks, dll) di pakaian, perangkat, atau latar belakang.'
                    : 'Absolute rejection if there are brand logos, trademarked names, or proprietary graphic design elements (e.g. Nike Swoosh, Apple logo, Starbucks) visible on clothing, screens, or backgrounds.',
                  examples: 'Nike, Adidas, Apple, Starbucks, Samsung, Coca-Cola'
                },
                {
                  id: 'designs',
                  title: t.language === 'Bahasa' ? '2. Desain Produk Khas' : '2. Proprietary Product Designs',
                  desc: t.language === 'Bahasa' 
                    ? 'Bentuk fisik produk yang sangat ikonik dilindungi secara hukum. Hindari menampilkan bentuk bodi iPhone utuh, pola grille depan mobil Jeep, bentuk boneka LEGO / Brick LEGO, mainan Rubik, sol sepatu Adidas 3 strip.'
                    : 'Uniquely recognizable physical product designs are legally protected. Avoid depicting full iPhone body shapes, Jeep front grilles, LEGO minifigures/bricks, Rubik\'s cubes, or Adidas 3-stripes shoes.',
                  examples: 'LEGO, Rubik, Jeep Grille, iPhone Body, Vespa'
                },
                {
                  id: 'landmarks',
                  title: t.language === 'Bahasa' ? '3. Bangunan & Karya Seni' : '3. Protected Landmarks',
                  desc: t.language === 'Bahasa' 
                    ? 'Arsitektur modern tertentu melarang penggunaan komersial tanpa izin. Menara Eiffel pada malam hari dilarang karena lampu hiasnya dipatenkan. Begitu juga Gedung Opera Sydney, piramida kaca Louvre, Kastil Disney, dan Burj Al Arab.'
                    : 'Certain modern structures prohibit commercial usage. The Eiffel Tower illuminated at night is forbidden as its lights are patented. Similarly, Sydney Opera House, Louvre Pyramid, Disney Castle, and Burj Al Arab.',
                  examples: 'Eiffel (Night), Disney Castle, Sydney Opera House, Louvre Pyramid'
                },
                {
                  id: 'characters',
                  title: t.language === 'Bahasa' ? '4. Karakter & Klub Olahraga' : '4. Characters & Sports Clubs',
                  desc: t.language === 'Bahasa' 
                    ? 'Karakter fiksi dari komik, film, atau kartun (Mickey Mouse, Hello Kitty, anime) serta logo klub olahraga profesional, seragam tim, dan trofi piala resmi tidak boleh diunggah sebagai konten komersial.'
                    : 'Fictional characters from comics, movies, or cartoons (Mickey Mouse, Hello Kitty, anime), along with sports team logos, official uniforms, and trophies, cannot be uploaded for commercial stock.',
                  examples: 'Mickey Mouse, Hello Kitty, Barca/Madrid Logos, World Cup'
                },
                {
                  id: 'tech_issues',
                  title: t.language === 'Bahasa' ? '5. Kualitas Teknis & AI' : '5. Tech Quality & AI Artifacts',
                  desc: t.language === 'Bahasa' 
                    ? 'Karya Generative AI sangat ketat dipantau. Penolakan terjadi jika ada cacat anatomi (jari kelebihan/aneh, mata ganda), noda noise piksel, distorsi teks tulisan tidak bermakna, blur di area utama, atau resolusi kurang tajam.'
                    : 'Generative AI content is strictly scrutinized. Rejections occur for anatomical deformities (6 fingers, distorted faces), pixel noise artifacts, illegible/mangled text, out-of-focus subjects, or low resolution upscale issues.',
                  examples: 'Anatomical Glitches, Text Gibberish, Noise, Soft Focus'
                }
              ].map((item) => {
                const isOpen = activeComplianceTab === item.id;
                return (
                  <div key={item.id} className="border border-slate-200/50 dark:border-white/5 rounded-xl bg-white/40 dark:bg-black/20 overflow-hidden transition-all duration-300">
                    <button
                      onClick={() => setActiveComplianceTab(isOpen ? null : item.id)}
                      className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
                    >
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                        {item.title}
                      </span>
                      <ChevronDown 
                        size={13} 
                        className={`text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} 
                      />
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] space-y-2 bg-amber-500/[0.01]"
                        >
                          <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                            {item.desc}
                          </p>
                          <div className="bg-slate-100 dark:bg-black/30 p-2 rounded-lg flex flex-col gap-1">
                            <span className="text-[8px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                              {t.language === 'Bahasa' ? 'CONTOH KASUS PENOLAKAN:' : 'REJECTION CASES EXAMPLES:'}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-bold font-mono text-[9px] leading-tight">
                              {item.examples}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Audit Reports */}
        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-qc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center justify-center text-center py-20 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 flex items-center justify-center">
                       <Loader2 size={48} className="text-emerald-500 animate-[spin_1.5s_linear_infinite]" />
                       <Sparkles size={24} className="text-emerald-400 absolute animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                      {t.qc_analyzing_text}
                    </h3>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                      {t.qc_analyzing_desc}
                    </p>
                  </div>
                </div>
                <LoadingSkeleton />
              </motion.div>
            ) : Object.keys(reports).length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[600px] flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl"
              >
                <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 mb-6">
                  <FileImage size={48} className="text-slate-200 dark:text-slate-800" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center max-w-[250px]">
                  {t.qc_info_empty}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="results-qc"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {Object.entries(reports).map(([fileName, report], rIdx) => {
                  const r = report as QualityReport;
                  const isPassed = r.recommendation === "PASS";

                  return (
                    <motion.div 
                      key={`${fileName}-${rIdx}`}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: rIdx * 0.1 }}
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
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex flex-col items-end">
                             <p className={`text-[18px] font-black leading-none ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>{r.overall_score}</p>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1 whitespace-nowrap">{t.qc_score_label}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveReport(fileName)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title={t.language === 'Bahasa' ? 'Hapus Analisis' : 'Remove Analysis'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Image Stage */}
                      {previews[fileName] && (
                        <div className="image-check-viewer relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-inner group-hover:scale-[1.02] transition-transform duration-700">
                          <img 
                            src={previews[fileName]} 
                            alt={fileName} 
                            className={`w-full h-full object-cover transition-all duration-500 ${showHeatmaps.has(fileName) ? 'brightness-[0.4] grayscale-[0.5]' : ''}`}
                            referrerPolicy="no-referrer"
                          />
                          
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
                                    artifact: 'bg-orange-500'
                                  };
                                  const labels = {
                                    noise: t.language === 'Bahasa' ? 'Grain & Noise' : 'Grain & Noise',
                                    focus: t.language === 'Bahasa' ? 'Fokus Kurang' : 'Soft Focus',
                                    lighting: t.language === 'Bahasa' ? 'Masalah Cahaya' : 'Lighting Issue',
                                    ip_violation: t.language === 'Bahasa' ? 'Pelanggaran IP' : 'IP Violation',
                                    artifact: t.language === 'Bahasa' ? 'Artifak AI' : 'AI Artifact'
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
                        <div className={`p-4 rounded-2xl border ${r.legal_status.includes('VIOLATION') ? 'bg-rose-500/5 border-rose-500/20 text-rose-600' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'}`}>
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">{t.qc_legal_status}</p>
                          <p className="text-[11px] font-bold">{r.legal_status}</p>
                        </div>

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
                                <div className="grid grid-cols-1 gap-3 pt-2">
                                  {/* Strengths */}
                                  <div className="bg-slate-100/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tight mb-2">{t.qc_strengths}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {r.strengths.map((s, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded text-[10px] font-bold">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Technical Issues */}
                                  <div className="bg-slate-100/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-tight mb-2">{t.qc_tech_analysis}</p>
                                    <ul className="space-y-1">
                                      {r.technical_issues.map((issue, idx) => (
                                        <li key={idx} className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                          <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                          {issue}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Detailed Feedback */}
                                  <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-2xl mt-2">
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2">{t.qc_detailed_feedback}</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                                      {r.detailed_feedback}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
