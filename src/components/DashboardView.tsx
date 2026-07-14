import { getDailyLimit } from '../../constants';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ImageIcon, Film, FileCode, Zap, BookOpen, 
  ArrowRight, ShieldCheck, Activity, BarChart2, CheckCircle, 
  AlertTriangle, Clock, HelpCircle, Key, Gift, Tag, Ticket, Copy, Check
} from 'lucide-react';
import { ToolType, FileItem } from '../../types';
import { supabase } from '../supabase';

import { FeatureGuideButton } from './FeatureGuideModal';

interface DashboardPromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number;
  usedCount: number;
  description: string;
  startDate?: string;
  endDate?: string;
}

interface DashboardViewProps {
  files: FileItem[];
  setActiveTool: (tool: ToolType) => void;
  setShowInfoModal: (show: boolean) => void;
  successfulFilesCount: number;
  filesToGenerateCount: number;
  filesWithErrorCount: number;
  unprocessedFilesCount: number;
  generationMode: string;
  isLicensed?: boolean;
  appName?: string;
  pricingTier?: string;
  whatsAppLink?: string;
  setShowActivation?: (show: boolean) => void;
  imageDailyCount?: number;
  videoDailyCount?: number;
  vectorDailyCount?: number;
  t: any;
  userName?: string;
  trialDaysLeft?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  files,
  setActiveTool,
  setShowInfoModal,
  successfulFilesCount,
  filesToGenerateCount,
  filesWithErrorCount,
  unprocessedFilesCount,
  generationMode,
  isLicensed = false,
  appName = 'MetaZo PRO',
  pricingTier = 'Rp 149.000 / Bulan',
  whatsAppLink = 'https://wa.me/+6282275408171',
  setShowActivation,
  imageDailyCount = 0,
  videoDailyCount = 0,
  vectorDailyCount = 0,
  t,
  userName = '',
  trialDaysLeft
}) => {
  // Compute some quick statistics
  const totalFiles = files.length;
  const processedPercent = totalFiles > 0 ? Math.round((successfulFilesCount / totalFiles) * 100) : 0;
  
  // Format-wise file count
  const imageFilesCount = files.filter(f => {
    const ext = f.file.name.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  }).length;
  
  const videoFilesCount = files.filter(f => {
    const ext = f.file.name.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mov', 'webm'].includes(ext);
  }).length;

  const vectorFilesCount = files.filter(f => {
    const ext = f.file.name.split('.').pop()?.toLowerCase() || '';
    return ['svg', 'eps', 'ai'].includes(ext);
  }).length;

  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }
    if (isRightSwipe) {
      setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
    }
  };
  const [promoCodes, setPromoCodes] = React.useState<DashboardPromoCode[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const fetchPromos = async () => {
      setIsLoadingPromos(true);
      try {
        if (!supabase) {
          setPromoCodes([]);
          setIsLoadingPromos(false);
          return;
        }
        const { data, error } = await supabase.from('promos').select('*').limit(5);
        if (error) throw error;
        if (!active) return;
        const list: DashboardPromoCode[] = [];
        const now = new Date();
        (data || []).forEach((row: any) => {
          const usedCount = Number(row.used_count ?? row.usedCount ?? 0);
          const maxUses = Number(row.max_uses ?? row.maxUses ?? 0);
          
          // Filter out expired by uses
          if (usedCount >= maxUses) return;

          // Filter out which hasn't started yet
          const startDate = row.start_date || row.startDate;
          if (startDate) {
            const start = new Date(startDate);
            if (now < start) return;
          }

          // Filter out which has ended
          const endDateStr = row.end_date || row.endDate;
          if (endDateStr) {
            const end = endDateStr.includes('T') ? new Date(endDateStr) : new Date(endDateStr + 'T23:59:59');
            if (now > end) return;
          }

          list.push({
            id: row.id || row.key || '',
            code: row.code || row.id || '',
            type: row.type || 'free_premium',
            value: Number(row.value || 0),
            maxUses,
            usedCount,
            description: row.description || '',
            startDate: startDate || '',
            endDate: endDateStr || '',
          });
        });
        if (list.length > 0) {
          setPromoCodes(list);
        } else {
          setPromoCodes([]);
        }
      } catch (error) {
        console.warn("Failed to load promos for dashboard view:", error);
        setPromoCodes([]);
      } finally {
        if (active) setIsLoadingPromos(false);
      }
    };
    fetchPromos();
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const slides = React.useMemo(() => {
    const baseSlides = [
      {
        badge: t.language === 'Bahasa' ? "GENERATOR METADATA" : "METADATA GENERATOR",
        title: <>{t.hero_title_part1} <span className="text-emerald-300">{t.hero_title_part2}</span> {t.hero_title_part3}</>,
        desc: t.hero_description
      },
      {
        badge: t.language === 'Bahasa' ? "GENERATOR PROMPT AI" : "AI PROMPT GENERATOR",
        title: <>{t.language === 'Bahasa' ? "OPTIMASI" : "PROMPT"} <span className="text-emerald-300">PROMPT</span> {t.language === 'Bahasa' ? "TEKS" : "OPTIMIZATION"}</>,
        desc: t.language === 'Bahasa' 
          ? "Ubah konsep sederhana menjadi prompt visual yang kompleks dan kaya detail untuk platform generative AI." 
          : "Transform simple concepts into highly detailed and optimized visual prompts for AI generation platforms."
      },
      {
        badge: t.language === 'Bahasa' ? "INSPEKSI KUALITAS" : "QUALITY INSPECTOR",
        title: <>{t.language === 'Bahasa' ? "AUDIT" : "TECHNICAL"} <span className="text-emerald-300">STANDAR</span> {t.language === 'Bahasa' ? "TEKNIS" : "AUDIT"}</>,
        desc: t.language === 'Bahasa'
          ? "Pengecekan dan inspeksi kualitas visual secara otomatis mendeteksi masalah sebelum aset ditolak oleh agensi."
          : "Automated quality checks and visual inspection to detect issues before assets are rejected by agencies."
      },
      {
        badge: t.language === 'Bahasa' ? "KALENDER KONTEN" : "CONTENT CALENDAR",
        title: <>{t.language === 'Bahasa' ? "IDE" : "COMMERCIAL"} <span className="text-emerald-300">EVENT</span> {t.language === 'Bahasa' ? "KOMERSIAL" : "IDEAS"}</>,
        desc: t.language === 'Bahasa'
          ? "Temukan ide acara, tren lokal, dan liburan global untuk strategi portofolio stock bulanan Anda."
          : "Discover global events, trending holidays, and seasonal ideas for your monthly stock portfolio strategy."
      }
    ];

    if (!isLicensed) {
      baseSlides.push(
        {
          badge: t.language === 'Bahasa' ? "AKSES PREMIUM" : "PREMIUM ACCESS",
          title: <>{t.language === 'Bahasa' ? "PRO" : "UNLIMITED"} <span className="text-amber-300">SUBSCRIPTION</span> {t.language === 'Bahasa' ? "PLAN" : "PLAN"}</>,
          desc: t.language === 'Bahasa'
            ? "Berlangganan untuk membuka semua fitur premium, batas bulk process tanpa batas, dan performa AI yang lebih optimal."
            : "Subscribe to unlock all premium features, unlimited bulk processing, and optimized AI performance."
        },
        {
          badge: "SUPPORT",
          title: <>SUPPORT <span className="text-amber-300">KAMI</span></>,
          desc: t.language === 'Bahasa'
            ? "Dukung perkembangan aplikasi ini dengan berdonasi melalui teer.id/johan3008."
            : "Support the development of this application by donating via teer.id/johan3008."
        }
      );
    }
    return baseSlides;
  }, [isLicensed, t]);

  const safeCurrentSlide = currentSlide >= slides.length ? 0 : currentSlide;
  const activeSlide = slides[safeCurrentSlide] || { badge: "", title: "", desc: "" };

  React.useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. HERO GRADIENT WELCOME BAR */}
      <div 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#7c3aed] via-[#3a5ec5] to-[#224abe] text-white p-6 sm:p-8 shadow-xl touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="absolute right-0 bottom-0 top-0 w-2/5 opacity-10 pointer-events-none">
          <svg className="w-full h-full text-white" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,100 100,0 100,100" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl min-h-[160px] overflow-hidden flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={safeCurrentSlide} 
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className={`${safeCurrentSlide === slides.length - 1 ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (safeCurrentSlide === slides.length - 1) {
                  window.open('https://teer.id/johan3008', '_blank');
                }
              }}
            >
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles size={12} className="text-amber-400 fill-amber-400/25" />
                <span>{activeSlide.badge}</span>
              </div>
            </div>
            {userName && (
              <div className="text-sm sm:text-base font-semibold text-emerald-300 mb-2">
                Selamat Datang, {userName} 👋
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-tight select-none">
              {activeSlide.title}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-100/90 font-medium leading-relaxed max-w-xl min-h-[40px]">
              {activeSlide.desc}
            </p>
            {safeCurrentSlide === slides.length - 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('https://teer.id/johan3008', '_blank');
                }}
                className="mt-4 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[10px] uppercase tracking-wide rounded-full transition-all flex items-center space-x-1.5 shadow-lg"
              >
                <span>Dukung Sekarang</span>
              </button>
            )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            
            {/* Slide Navigation Pagination */}
            <div className="flex items-center space-x-2 border-r border-white/20 pr-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === safeCurrentSlide ? 'w-6 bg-emerald-300' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Removed PREMIUM LICENSE & SAAS MONETIZATION STATUS BOARD */}

      {/* PROMO / VOUCHER HIGHLIGHT BANNER — Only visible for Free Trial users */}
      {(!isLicensed && trialDaysLeft !== undefined && trialDaysLeft > 0 && promoCodes.length > 0) && (
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-violet-500/30 text-slate-800 dark:text-white p-6 shadow-lg shadow-black/5 dark:shadow-violet-950/15">
          {/* Background glow effects */}
          <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-violet-500/10 dark:bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-10 bottom-0 -ml-16 -mb-16 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="relative p-4 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-3xl text-white shadow-lg shrink-0 scale-95 sm:scale-100">
                <Gift size={28} className="text-amber-300" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 text-[9px] font-black uppercase tracking-widest mb-1.5">
                  <Ticket size={10} />
                  <span>{t.language === 'Bahasa' ? "KUPON PROMO SPESIAL" : "ACTIVE COUPON CODES"}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                  {t.language === 'Bahasa' ? "Dapatkan Potongan Harga & Akses Premium Gratis!" : "Get Direct Discounts & Free Premium Access!"}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl mt-1">
                  {t.language === 'Bahasa' 
                    ? "Gunakan kupon promo aktif di bawah ini untuk mengaktifkan fitur unggulan PRO secara instan tanpa biaya tambahan."
                    : "Copy and utilize any of our active vouchers inside the activation form to unlock high-tier priority metadata pipelines."}
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto shrink-0 flex flex-col gap-2.5 min-w-[280px]">
              {isLoadingPromos ? (
                <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Memuat info promo...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400 block mb-0.5">
                    {t.language === 'Bahasa' ? "Salin Voucher Aktif:" : "Copy Active Vouchers:"}
                  </span>
                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                    {promoCodes.map((p) => (
                      <div 
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500/50 rounded-xl transition-all group/item"
                      >
                        <div className="flex flex-col min-w-[120px] max-w-[175px]">
                          <div className="flex items-center space-x-1 flex-wrap">
                            <span className="text-xs font-black text-[#7c3aed] dark:text-amber-300 tracking-wider uppercase">
                              {p.code}
                            </span>
                            {p.endDate && (
                              <span className="text-[7.5px] bg-red-100 dark:bg-red-950/60 text-red-750 dark:text-red-400 font-extrabold px-1 py-0.2 rounded shrink-0" title={`Berakhir ${p.endDate}`}>
                                Exp: {p.endDate}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate">
                            {p.description || (p.type === 'free_premium' ? `${p.value} Hari Premium` : `Diskon ${p.value}%`)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(p.code)}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center space-x-1.5 shrink-0 select-none ${copiedCode === p.code ? 'bg-emerald-600 dark:bg-emerald-650 text-white dark:text-emerald-100' : 'bg-violet-100 dark:bg-violet-605/30 hover:bg-violet-600 hover:text-white text-violet-700 dark:text-violet-300'}`}
                        >
                          {copiedCode === p.code ? (
                            <>
                              <CheckCircle size={10} className="text-emerald-400 fill-emerald-400/20" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Action Trigger */}
              <button
                onClick={() => setShowActivation?.(true)}
                className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99] text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-violet-600/20 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>{t.language === 'Bahasa' ? "Buka Menu Aktivasi Promo" : "Open Promo Claim Menu"}</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHOOSE YOUR WORKSPACE GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <Activity size={16} className="text-[#7c3aed]" />
            <span>{t.workspace_title}</span>
          </h3>
          <span className="text-[10px] font-black text-[#7c3aed] uppercase tracking-widest bg-[#7c3aed]/5 border border-[#7c3aed]/10 px-2 py-0.5 rounded-xl">{t.workspace_modes}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Image Workspace */}
          <div className="group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-white/5 p-5 shadow-md shadow-black/5 hover:shadow-xl hover:border-[#7c3aed]/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none">
              <ImageIcon size={72} className="text-[#7c3aed]" />
            </div>
            
            <div>
              <div className="w-10 h-10 rounded-[1.5rem] bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4 border border-violet-500/20 group-hover:scale-105 transition-transform">
                <ImageIcon size={18} />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-[#7c3aed] transition-colors">
                {t.image_ws_title}
              </h4>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                {t.image_ws_desc}
              </p>

              {!isLicensed && (
                <div className="mb-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                    <span>{t.daily_quota}</span>
                    <span className={imageDailyCount >= getDailyLimit() ? "text-red-500" : "text-[#7c3aed]"}>{imageDailyCount}/{getDailyLimit()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${imageDailyCount >= getDailyLimit() ? 'bg-red-550' : 'bg-[#7c3aed]'}`} style={{ width: `${Math.min(100, (imageDailyCount / getDailyLimit()) * 100)}%` }} />
                  </div>
                  {imageDailyCount >= getDailyLimit() && (
                    <span className="text-[9px] text-red-500 font-black block mt-1.5 leading-none">{t.quota_exhausted}</span>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTool(ToolType.IMAGE)}
              className="w-full py-2 bg-[#7c3aed] hover:bg-violet-600 text-white font-extrabold text-[11px] rounded-[1.5rem] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-black/5 hover:shadow group-hover:translate-x-1 hover:scale-[1.01] cursor-pointer"
            >
              <span>{t.image_ws_cta}</span>
            </button>
          </div>

          {/* Card 2: Video Workspace */}
          <div className="group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-white/5 p-5 shadow-md shadow-black/5 hover:shadow-xl hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none">
              <Film size={72} className="text-purple-500" />
            </div>
            
            <div>
              <div className="w-10 h-10 rounded-[1.5rem] bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 border border-purple-500/20 group-hover:scale-105 transition-transform">
                <Film size={18} />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-purple-500 transition-colors">
                {t.video_ws_title}
              </h4>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                {t.video_ws_desc}
              </p>

              {!isLicensed && (
                <div className="mb-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                    <span>{t.daily_quota}</span>
                    <span className={videoDailyCount >= getDailyLimit() ? "text-red-500" : "text-purple-500"}>{videoDailyCount}/{getDailyLimit()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${videoDailyCount >= getDailyLimit() ? 'bg-red-550' : 'bg-purple-555'}`} style={{ width: `${Math.min(100, (videoDailyCount / getDailyLimit()) * 100)}%` }} />
                  </div>
                  {videoDailyCount >= getDailyLimit() && (
                    <span className="text-[9px] text-red-500 font-black block mt-1.5 leading-none">{t.quota_exhausted}</span>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTool(ToolType.VIDEO)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] rounded-[1.5rem] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-black/5 hover:shadow group-hover:translate-x-1 hover:scale-[1.01] cursor-pointer"
            >
              <span>{t.video_ws_cta}</span>
            </button>
          </div>

          {/* Card 3: Vector Workspace */}
          <div className="group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-white/5 p-5 shadow-md shadow-black/5 hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none">
              <FileCode size={72} className="text-emerald-500" />
            </div>
            
            <div>
              <div className="w-10 h-10 rounded-[1.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <FileCode size={18} />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-emerald-500 transition-colors">
                {t.vector_ws_title}
              </h4>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                {t.vector_ws_desc}
              </p>

              {!isLicensed && (
                <div className="mb-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                    <span>{t.daily_quota}</span>
                    <span className={vectorDailyCount >= getDailyLimit() ? "text-red-500" : "text-emerald-500"}>{vectorDailyCount}/{getDailyLimit()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${vectorDailyCount >= getDailyLimit() ? 'bg-red-550' : 'bg-emerald-600'}`} style={{ width: `${Math.min(100, (vectorDailyCount / getDailyLimit()) * 100)}%` }} />
                  </div>
                  {vectorDailyCount >= getDailyLimit() && (
                    <span className="text-[9px] text-red-500 font-black block mt-1.5 leading-none">{t.quota_exhausted}</span>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTool(ToolType.VECTOR)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-750 text-white font-extrabold text-[11px] rounded-[1.5rem] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-black/5 hover:shadow group-hover:translate-x-1 hover:scale-[1.01] cursor-pointer"
            >
              <span>{t.vector_ws_cta}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. CORE ANALYTICS GRAPHICS & STATS DOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STATS PANEL */}
        <div className="lg:col-span-1 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/5 rounded-3xl p-5 shadow-md shadow-black/5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100 dark:border-white/5">
              <BarChart2 size={15} className="text-violet-500" />
              <span>{t.queue_status_title}</span>
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{t.status_success}</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{successfulFilesCount} {t.hero_stats_file}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                  <span>{t.status_ready}</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{filesToGenerateCount} {t.hero_stats_file}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{t.status_draft}</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{unprocessedFilesCount} {t.hero_stats_file}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{t.status_error}</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{filesWithErrorCount} {t.hero_stats_file}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.success_rate}</span>
                  <span className="text-xs font-black text-emerald-500">{processedPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${processedPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* FILE DISTRIBUTION GRID */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/5 rounded-3xl p-5 shadow-md shadow-black/5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100 dark:border-white/5">
              <Zap size={14} className="text-emerald-500 animate-pulse" />
              <span>{t.dist_title}</span>
            </h3>

            {totalFiles === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center select-none">
                <HelpCircle size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{t.no_files_title}</p>
                <p className="text-[10px] font-bold text-slate-400/80 dark:text-slate-600/70 mt-1">{t.no_files_desc}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span className="flex items-center space-x-2"><ImageIcon size={14} className="text-violet-500" /> <span>{t.dist_image_label}</span></span>
                    <span>{imageFilesCount} {t.hero_stats_file} ({Math.round((imageFilesCount / totalFiles) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-2xl transition-all" style={{ width: `${(imageFilesCount / totalFiles) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span className="flex items-center space-x-2"><Film size={14} className="text-purple-500" /> <span>{t.dist_video_label}</span></span>
                    <span>{videoFilesCount} {t.hero_stats_file} ({Math.round((videoFilesCount / totalFiles) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-2xl transition-all" style={{ width: `${(videoFilesCount / totalFiles) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span className="flex items-center space-x-2"><FileCode size={14} className="text-emerald-500" /> <span>{t.dist_vector_label}</span></span>
                    <span>{vectorFilesCount} {t.hero_stats_file} ({Math.round((vectorFilesCount / totalFiles) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-2xl transition-all" style={{ width: `${(vectorFilesCount / totalFiles) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-slate-100 dark:border-white/5 text-center">
            {/* Stock portal integration statuses */}
            {['Adobe Stock', 'Shutterstock', 'Freepik', 'Vecteezy', 'Canva'].map((portal, idx) => (
              <div key={portal} className="p-1 px-1.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase truncate">{portal}</span>
                <span className="inline-flex items-center space-x-1 mt-0.5 text-[8px] font-bold text-emerald-500 uppercase">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>{t.portal_ready}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
