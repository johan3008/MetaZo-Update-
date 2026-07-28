import { getDailyLimit } from '../../constants';
import React, { useState, useRef } from 'react';
import { 
  ImageIcon, Upload, Wand2, Copy, Check, AlertCircle, RefreshCw, X, Sliders, Sparkles, Trash2, Layers, Grid
} from 'lucide-react';
import { FeatureGuideButton } from './FeatureGuideModal';

interface PromptImageViewProps {
  t: any;
  aiOptions?: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
  uiLanguage?: string;
}
import { copyToClipboard as robustCopy } from '../utils';
import { getHeaders } from '../../services/geminiService';

interface ImageItem {
  id: string;
  data: string;
  name: string;
  loading: boolean;
  result?: {
    prompt: string;
    description: string;
  };
  error?: string | null;
}

const PREMIUM_ONLY_STYLES = [
  'Embroidery',
  'Disney Cartoon',
  'Lego Style',
  'Voxel Art',
  'Graphic Design'
];

const DARK_HORROR_SUB_STYLES = [
  { id: 'Dark Horror Aesthetic', label: 'Classic / Mixed', desc: 'Campuran estetika horor gelap secara umum.' },
  { id: 'Grimdark', label: 'Grimdark', desc: 'Bayangan menekan dan hiper-detail fantasi gelap.' },
  { id: 'Gothic Horror', label: 'Gothic Horror', desc: 'Kabut menakutkan dan arsitektur kuno yang membusuk.' },
  { id: 'Infernal / Hellscape', label: 'Infernal / Hellscape', desc: 'Elemen iblis, lahar, dan api.' },
  { id: 'Macabre Art', label: 'Macabre Art', desc: 'Lingkungan yang menyeramkan dengan detail surealisme gelap.' },
  { id: 'Occult Horror', label: 'Occult Horror', desc: 'Rune kuno, ritual sihir gelap, dan suasana misterius.' },
  { id: 'Cinematic Horror Concept Art', label: 'Cinematic Horror Concept Art', desc: 'Pencahayaan chiaroscuro berbayang pekat ala film.' },
  { id: 'Painterly Digital Art', label: 'Painterly Digital Art', desc: 'Goresan kuas tebal (impasto) ala mahakarya lukisan digital.' }
];

const STYLE_OPTIONS = (t: any) => [
  { id: 'Photorealistic', label: t.style_photorealistic || 'Photorealistic', icon: '📷', desc: 'Realism' },
  { id: 'Cinematic', label: t.style_cinematic || 'Cinematic', icon: '🎬', desc: 'Movie light' },
  { id: 'Adobe Stock', label: t.style_adobe_stock || 'Adobe Stock', icon: '💎', desc: 'Commercial' },
  { id: 'Editorial', label: t.style_editorial || 'Editorial', icon: '📖', desc: 'Magazine' },
  { id: 'Lifestyle', label: t.style_lifestyle || 'Lifestyle', icon: '✨', desc: 'Natural' },
  { id: 'Fine Art', label: t.style_fine_art || 'Fine Art', icon: '🏛️', desc: 'Artistic' },
  { id: '3D Render', label: '3D Render', icon: '🧊', desc: 'Octane Engine' },
  { id: 'Anime', label: 'Anime', icon: '🌸', desc: 'Japanese' },
  { id: 'Embroidery', label: 'Embroidery', icon: '🧵', desc: 'Needlework' },
  { id: 'Disney Cartoon', label: 'Disney Cartoon', icon: '🏰', desc: 'Animation' },
  { id: 'Dark Horror Aesthetic', label: 'Dark Horror Aesthetic', icon: '🦇', desc: 'Macabre' },
  { id: 'Lego Style', label: 'Lego Style', icon: '🧱', desc: 'Bricks' },
  { id: 'Voxel Art', label: 'Voxel Art', icon: '🟩', desc: 'Cubes' },
  { id: 'Graphic Design', label: 'Graphic Design', icon: '📐', desc: 'Commercial Design' }
];

export const PromptImageView: React.FC<PromptImageViewProps> = ({ 
  t, 
  aiOptions,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  setShowLimitModal,
  uiLanguage = 'en'
}) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const handleFilesRef = useRef(handleFiles);
  useEffect(() => {
    handleFilesRef.current = handleFiles;
  }, [handleFiles]);

  useEffect(() => {
    const handleGlobalDrop = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.files && customEvent.detail.files.length > 0) {
        handleFilesRef.current(customEvent.detail.files);
      }
    };
    window.addEventListener('globalFileDrop', handleGlobalDrop);
    return () => window.removeEventListener('globalFileDrop', handleGlobalDrop);
  }, []);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [styleCategory, setStyleCategory] = useState('Cinematic');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
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

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    
    setGlobalError(null);
    const newItems: ImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      try {
        const data = await resizeAndProcess(file);
        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data,
          name: file.name,
          loading: false
        });
      } catch (err) {
        console.error("Error processing file:", file.name, err);
      }
    }

    if (newItems.length > 0) {
      setImages(prev => [...prev, ...newItems]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Auto trigger batch analysis for the newly added items automatically!
      await analyzeBatch(newItems);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };



  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAll = () => {
    setImages([]);
    setGlobalError(null);
  };

  const analyzeBatch = async (itemsToAnalyze?: ImageItem[], forceAll = false) => {
    const unanalyzed = itemsToAnalyze || (forceAll ? images : images.filter(img => !img.result && !img.loading));
    if (unanalyzed.length === 0) return;

    if (!isLicensed && PREMIUM_ONLY_STYLES.includes(styleCategory)) {
      setGlobalError(uiLanguage === 'id' 
        ? `Gaya "${styleCategory}" hanya tersedia untuk pengguna Premium/Langganan. Silakan upgrade akun Anda!` 
        : `The style "${styleCategory}" is only available for Premium/Subscription users. Please upgrade your account!`);
      return;
    }

    if (!isLicensed && dailyGenCount + unanalyzed.length > getDailyLimit()) {
      setGlobalError(`Batas Trial Terlampaui. Sisa kuota Anda hari ini adalah ${Math.max(0, getDailyLimit() - dailyGenCount)} kali generate, tetapi Anda mencoba memproses ${unanalyzed.length} gambar.`);
      if (setShowLimitModal) {
        setShowLimitModal(true);
      }
      return;
    }

    setLoadingBatch(true);
    setBatchProgress(0);
    setGlobalError(null);

    // Filter images that haven't been processed yet
    const pendingImages = unanalyzed.map(img => img.data);
    const pendingIds = unanalyzed.map(img => img.id);

    // Mark as loading locally
    setImages(prev => prev.map(img => 
      pendingIds.includes(img.id) ? { ...img, loading: true, error: null } : img
    ));

    try {
      // Simulate progress increments
      const progressInterval = setInterval(() => {
        setBatchProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 5;
        });
      }, 500);

      const response = await fetch('/api/analyze-batch-image-to-prompt', {
        method: 'POST',
        headers: getHeaders(aiOptions),
        body: JSON.stringify({
          images: pendingImages,
          styleCategory,
          model: aiOptions?.model
        })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error("Gagal menganalisis batch gambar.");
      }

      const results = await response.json();
      setBatchProgress(100);
      
      setImages(prev => prev.map(img => {
        const idx = pendingIds.indexOf(img.id);
        if (idx !== -1 && results[idx]) {
          return { ...img, loading: false, result: results[idx] };
        }
        return img;
      }));

      if (incrementDailyCount) {
        incrementDailyCount(unanalyzed.length);
      }
    } catch (err: any) {
      console.error("Batch Analysis error:", err);
      setGlobalError(err.message || "Gagal dalam analisis batch.");
      // Reset loading state for failed items
      setImages(prev => prev.map(img => 
        pendingIds.includes(img.id) ? { ...img, loading: false, error: "Gagal analisis" } : img
      ));
    } finally {
      setTimeout(() => setLoadingBatch(false), 300);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    const success = await robustCopy(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const currentStyleOptions = STYLE_OPTIONS(t);

  return (
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-1 border-b border-slate-200 dark:border-white/5 pb-4 relative overflow-hidden">
        {/* Progress Bar */}
        {loadingBatch && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-300 ease-out z-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${batchProgress}%` }}
          />
        )}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <ImageIcon className="text-emerald-500" size={24} />
            {t.image_studio_title}
            <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full tracking-widest font-black ml-2 animate-pulse">BATCH ENABLED</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">
            {t.image_studio_subtitle}
          </p>
        </div>
        
        <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
          <FeatureGuideButton 
            title={t.guide_prompt_image_title} 
            description={t.guide_prompt_image_desc} 
            t={t} 
          />
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-[1.5rem] text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <Layers size={12} className="text-emerald-500 animate-bounce" />
            <span>{t.image_studio_version}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload & Config (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          {!isLicensed && (
            <div className="bg-emerald-500/5 dark:bg-black/20 p-4 rounded-2xl border border-emerald-500/15 dark:border-white/5 shadow-inner">
              <div className="flex justify-between text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t.prompt_image_trial_label}
                </span>
                <span className={dailyGenCount >= getDailyLimit() ? "text-red-500 font-semibold" : "text-emerald-500 font-semibold"}>
                  {dailyGenCount}/{getDailyLimit()} {t.prompt_image_generate_count}
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
                <span className="text-[10px] text-red-500 font-extrabold block mt-2 leading-tight">
                  {t.prompt_image_trial_expired}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mt-1.5 leading-tight">
                  {t.prompt_image_trial_remaining} <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{Math.max(0, getDailyLimit() - dailyGenCount)} {t.prompt_image_trial_times}</strong>.
                </span>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-6 shadow-md shadow-black/5">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.image_studio_upload_label}
                </label>
                {images.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] text-red-500 font-black uppercase hover:underline">
                    {t.image_studio_clear_all} ({images.length})
                  </button>
                )}
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 transition-all duration-300 border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-black/30 hover:border-emerald-500/40"
              >
                <div className="p-4 rounded-full shadow-md flex items-center justify-center transform transition-transform bg-white dark:bg-slate-800">
                  <Upload size={20} className="text-emerald-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    {t.image_studio_drag_drop}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium tracking-tight">{t.image_studio_support_multiple}</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden" 
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.image_studio_target_label}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {currentStyleOptions.map((opt: any) => {
                  const isLocked = PREMIUM_ONLY_STYLES.includes(opt.id) && !isLicensed;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (isLocked) {
                          setGlobalError(uiLanguage === 'id' 
                            ? `Gaya "${opt.label}" adalah fitur Premium. Silakan upgrade akun Anda!` 
                            : `The style "${opt.label}" is a Premium feature. Please upgrade your account!`);
                          return;
                        }
                        setStyleCategory(opt.id);
                        setGlobalError(null);
                      }}
                      className={`flex flex-col items-start justify-center p-3 rounded-[1.2rem] text-left transition-all border relative ${
                        isLocked
                          ? 'bg-slate-100 dark:bg-black/10 text-slate-400 dark:text-slate-500 border-slate-200/40 dark:border-white/5 opacity-60 cursor-not-allowed'
                          : styleCategory === opt.id
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5 w-full">
                        <span className="text-sm">{opt.icon}</span>
                        <span className={`text-[10px] font-black uppercase truncate flex-1 ${styleCategory === opt.id && !isLocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</span>
                        {isLocked ? (
                          <span className="text-[10px] text-amber-500" title="Premium">🔒</span>
                        ) : styleCategory === opt.id && (
                          <Check size={12} className="text-emerald-500" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate w-full">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {globalError && (
              <div className="flex items-center space-x-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-[1.5rem] text-[10px] font-bold text-red-500">
                <AlertCircle size={14} />
                <span>{globalError}</span>
              </div>
            )}

            {(() => {
              const hasUnanalyzed = images.some(img => !img.result);
              const canAnalyze = images.length > 0;
              return (
                <button
                  onClick={() => analyzeBatch(undefined, !hasUnanalyzed)}
                  disabled={loadingBatch || !canAnalyze}
                  className={`w-full py-3.5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center space-x-3 transition-all duration-300 relative overflow-hidden ${
                    loadingBatch || !canAnalyze
                      ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-white/5' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 active:scale-[0.98]'
                  }`}
                >
                  {loadingBatch && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                      style={{ width: `${batchProgress}%` }}
                    />
                  )}
                  {loadingBatch ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      <span>{t.image_studio_btn_analyzing.replace('{count}', images.filter(img => img.loading).length.toString()).replace('{progress}', Math.round(batchProgress).toString())}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="animate-pulse" />
                      <span>
                        {hasUnanalyzed 
                          ? t.image_studio_btn_analyze.replace('{count}', images.filter(img => !img.result).length.toString())
                          : `Analisis Ulang dengan Estetika: ${styleCategory}`
                        }
                      </span>
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>

        {/* Right Column: Results Dashboard (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-md shadow-black/5 min-h-[600px] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <Grid size={16} className="text-emerald-500" />
                <h3 className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  {t.image_studio_dashboard_title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {t.image_studio_status_label.replace('{finished}', images.filter(img => img.result).length.toString()).replace('{total}', images.length.toString())}
                </span>
                {images.some(img => img.result) && (
                  <>
                    <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2" />
                    <button 
                      onClick={() => {
                        const allPrompts = images
                          .filter(img => img.result)
                          .map(img => `--- ${img.name} ---\n${img.result?.prompt}`)
                          .join('\n\n');
                        copyToClipboard(allPrompts, 'all-batch');
                      }}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase transition-all ${
                        copiedId === 'all-batch'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {copiedId === 'all-batch' ? <Check size={12} /> : <Layers size={12} />}
                      <span>{copiedId === 'all-batch' ? t.image_studio_btn_copied_all : t.image_studio_btn_copy_all}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto max-h-[800px] custom-scrollbar">
              {images.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-5 py-20 transition-all">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="p-8 bg-white dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-white/10 shadow-xl shadow-black/5 relative z-10 transition-transform duration-500 group-hover:scale-110">
                      <ImageIcon size={48} className="text-emerald-500/80 drop-shadow-md" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{t.image_studio_empty_title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs leading-relaxed">
                      {t.image_studio_empty_desc}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center justify-center pt-2 opacity-60">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {images.map((item) => (
                    <div key={item.id} className={`group relative bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
                      item.loading ? 'border-emerald-500/50 shadow-emerald-500/10 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-white/10 hover:border-emerald-500/30'
                    }`}>
                      <div className="flex flex-col md:flex-row min-h-[200px]">
                        {/* Image Preview Thumb */}
                        <div className="w-full md:w-56 h-48 md:h-auto relative bg-slate-100 dark:bg-black shrink-0 border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5">
                          <img src={item.data} alt={item.name} className="w-full h-full object-cover md:absolute inset-0" />
                          <button 
                            onClick={() => removeImage(item.id)}
                            className="absolute top-3 left-3 p-2 bg-black/60 hover:bg-red-500 text-white rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                          {item.loading && (
                            <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                              <RefreshCw size={28} className="text-emerald-400 animate-spin" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Processing...</span>
                            </div>
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate max-w-[200px]">{item.name}</h4>
                                {item.result ? (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                    <Check size={10} />
                                    <span>{styleCategory} Success</span>
                                  </div>
                                ) : item.loading ? (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                                    <RefreshCw size={10} className="animate-spin" />
                                    <span>AI Processing...</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-500/10 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                    <Layers size={10} />
                                    <span>Queued</span>
                                  </div>
                                )}
                              </div>
                              {item.result && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => analyzeBatch([item])}
                                    className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase transition-all bg-white dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/5 shadow-md shadow-black/5"
                                    title="Regenerasi dengan Target Estetika terpilih"
                                  >
                                    <RefreshCw size={12} className={item.loading ? "animate-spin" : ""} />
                                    <span>Regen</span>
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(item.result?.prompt || '', item.id)}
                                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase transition-all ${
                                      copiedId === item.id 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-white dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/5 shadow-md shadow-black/5'
                                    }`}
                                  >
                                    {copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
                                    <span>{copiedId === item.id ? 'Copied' : 'Salin'}</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {item.loading ? (
                              <div className="space-y-2 animate-pulse">
                                <div className="h-3 w-full bg-slate-200 dark:bg-white/5 rounded-full" />
                                <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/5 rounded-full" />
                                <div className="h-20 w-full bg-slate-200/50 dark:bg-white/5 rounded-[1.5rem] mt-4" />
                              </div>
                            ) : item.error ? (
                              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-[1.5rem] text-[10px] font-bold text-red-500 flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>{item.error}</span>
                              </div>
                            ) : item.result ? (
                              <div className="space-y-4 animate-in fade-in duration-500">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Caption Deskripsi</label>
                                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed border-l-2 border-emerald-500 pl-3">
                                    {item.result.description}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">AI Prompt Optimized</label>
                                  </div>
                                  <div className="relative group/copy">
                                    <div className="p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 group-hover/copy:border-emerald-500/30 transition-colors">
                                      <code className="text-[11px] font-mono font-medium text-slate-800 dark:text-slate-300 break-words leading-relaxed select-all">
                                        {item.result.prompt}
                                      </code>
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(item.result?.prompt || '', item.id)}
                                      className="absolute top-2 right-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl hover:bg-emerald-500 hover:text-white text-slate-400 hover:border-emerald-500 shadow-sm opacity-0 group-hover/copy:opacity-100 transition-all border border-slate-100 dark:border-white/5"
                                    >
                                      {copiedId === item.id ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[1.5rem] py-10 opacity-40">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Menunggu Antrian...</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-black/40 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-2xl">
                <Sparkles size={14} className="text-emerald-500" />
              </div>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-black text-slate-800 dark:text-slate-200">Tips:</span> Gunakan mode batch untuk memproses ribuan referensi visual ke dalam prompt AI yang sangat presisi dalam hitungan detik. Semua hasil dioptimasi untuk <span className="underline decoration-emerald-500 underline-offset-2">Midjourney</span>, <span className="underline decoration-emerald-500 underline-offset-2">DALL-E 3</span>, dan <span className="underline decoration-emerald-500 underline-offset-2">Adobe Firefly</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
