import React from 'react';
import { 
  Sparkles, ImageIcon, Film, FileCode, Zap, BookOpen, 
  ArrowRight, ShieldCheck, Activity, BarChart2, CheckCircle, 
  AlertTriangle, Clock, HelpCircle, Key
} from 'lucide-react';
import { ToolType, FileItem } from '../../types';

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
  whatsAppLink = 'https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H',
  setShowActivation,
  imageDailyCount = 0,
  videoDailyCount = 0,
  vectorDailyCount = 0,
  t
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

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. HERO GRADIENT WELCOME BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#7c3aed] via-[#3a5ec5] to-[#224abe] text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 bottom-0 top-0 w-2/5 opacity-10 pointer-events-none">
          <svg className="w-full h-full text-white" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,100 100,0 100,100" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl min-h-[160px] flex flex-col justify-center">
          <div 
            key={currentSlide} 
            className={`animate-in fade-in slide-in-from-right-4 duration-500 ${currentSlide === slides.length - 1 ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (currentSlide === slides.length - 1) {
                window.open('https://teer.id/johan3008', '_blank');
              }
            }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest mb-4">
              <Sparkles size={12} className="text-amber-400 fill-amber-400/25" />
              <span>{slides[currentSlide].badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-tight select-none">
              {slides[currentSlide].title}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-100/90 font-medium leading-relaxed max-w-xl min-h-[40px]">
              {slides[currentSlide].desc}
            </p>
            {currentSlide === slides.length - 1 && (
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
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            
            {/* Slide Navigation Pagination */}
            <div className="flex items-center space-x-2 border-r border-white/20 pr-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === currentSlide ? 'w-6 bg-emerald-300' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PREMIUM LICENSE & SAAS MONETIZATION STATUS BOARD */}
      {isLicensed ? (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-xl shadow-emerald-500/10">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white/20 text-white rounded-2xl shrink-0 mt-0.5">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                {t.license_active_title}
              </h4>
              <p className="text-xs font-medium text-emerald-50 leading-relaxed mt-1">
                {t.license_active_desc} {appName}.
              </p>
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <span className="px-4 py-2 bg-white text-emerald-700 font-extrabold text-[11px] rounded-full uppercase tracking-widest shadow-lg">
              {t.license_pro_badge}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border-2 border-amber-400/30 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 shadow-md shadow-black/5 shadow-amber-500/5 select-none">
          {!isLicensed && (
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 mt-1">
                <Key size={22} />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center space-x-2">
                  <span>{t.trial_badge}</span>
                </h4>
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mt-1.5">
                  {t.trial_desc_part1} <strong className="text-slate-900 dark:text-slate-100 font-semibold">{appName}</strong> {t.trial_desc_part2} <strong className="text-amber-600 dark:text-amber-400 font-bold">{pricingTier}</strong>.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setShowActivation?.(true)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-black text-[11px] uppercase tracking-wider rounded-full transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {t.trial_cta_license}
            </button>
            <a
              href={`${whatsAppLink}?text=Halo%20Admin%2C%20saya%20tertarik%20membeli%20lisensi%20aktif%20SaaS%20${encodeURIComponent(appName || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-wider rounded-full transition-all flex items-center justify-center cursor-pointer"
            >
              {t.trial_cta_admin}
            </a>
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
                    <span className={imageDailyCount >= 30 ? "text-red-500" : "text-[#7c3aed]"}>{imageDailyCount}/30</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${imageDailyCount >= 30 ? 'bg-red-550' : 'bg-[#7c3aed]'}`} style={{ width: `${Math.min(100, (imageDailyCount / 30) * 100)}%` }} />
                  </div>
                  {imageDailyCount >= 30 && (
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
                    <span className={videoDailyCount >= 30 ? "text-red-500" : "text-purple-500"}>{videoDailyCount}/30</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${videoDailyCount >= 30 ? 'bg-red-550' : 'bg-purple-555'}`} style={{ width: `${Math.min(100, (videoDailyCount / 30) * 100)}%` }} />
                  </div>
                  {videoDailyCount >= 30 && (
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
                    <span className={vectorDailyCount >= 30 ? "text-red-500" : "text-emerald-500"}>{vectorDailyCount}/30</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${vectorDailyCount >= 30 ? 'bg-red-550' : 'bg-emerald-600'}`} style={{ width: `${Math.min(100, (vectorDailyCount / 30) * 100)}%` }} />
                  </div>
                  {vectorDailyCount >= 30 && (
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
