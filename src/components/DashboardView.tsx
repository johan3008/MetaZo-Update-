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
  vectorDailyCount = 0
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. HERO GRADIENT WELCOME BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4e73df] via-[#3a5ec5] to-[#224abe] text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 bottom-0 top-0 w-2/5 opacity-10 pointer-events-none">
          <svg className="w-full h-full text-white" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,100 100,0 100,100" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest mb-4">
            <Sparkles size={12} className="text-amber-400 fill-amber-400/25" />
            <span>AI-Driven Metadata Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-tight select-none">
            Solusi Unggul Pengoptimal <span className="text-emerald-300">Stock Asset</span> Anda
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-100/90 font-medium leading-relaxed max-w-xl">
            MetaZo mengintegrasikan kecerdasan model Vision-LLM mutakhir untuk membedah visual aset Anda secara presisi guna menghasilkan judul, deskripsi deskriptif, dan pengelompokan tag terindeks bagi ragam portal stock global.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              onClick={() => setShowInfoModal(true)}
              className="px-4 py-2 bg-emerald-400 text-slate-900 font-extrabold text-xs rounded-xl shadow-lg hover:bg-emerald-300 hover:scale-[1.03] transition-all flex items-center space-x-1.5 uppercase cursor-pointer"
            >
              <BookOpen size={14} />
              <span>Petunjuk Penggunaan</span>
            </button>
            <div className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 select-none text-white font-extrabold text-xs rounded-xl transition-all flex items-center space-x-1.5 uppercase">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>Mode: {generationMode.toUpperCase()} ({totalFiles} Diunggah)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PREMIUM LICENSE & SAAS MONETIZATION STATUS BOARD */}
      {isLicensed ? (
        <div className="bg-emerald-550/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0 mt-0.5">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs sm:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider animate-pulse">
                Lisensi Komersial Aktif • {appName} PRO
              </h4>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                Salinan berlisensi penuh dibeli secara sah untuk workflow profesional terakreditasi oleh {appName} Reseller Network. Semua fitur pengunggahan cerdas dan ekspor batch telah aktif tanpa pembatasan.
              </p>
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <span className="px-3 py-1 bg-emerald-500 text-white font-extrabold text-[10px] rounded-full uppercase tracking-widest">
              ★ ACTIVE PRO
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 border border-amber-500/25 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
          {!isLicensed && (
            <div className="flex items-start space-x-3.5">
              <div className="p-2 sm:p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 mt-0.5">
                <Key size={18} className="rotate-45" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>Versi Evaluasi Gratis • Batasan Trial Aktif</span>
                </h4>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mt-0.5">
                  Anda sedang mencoba copy gratis aplikasi {appName}. Dapatkan lisensi premium seharga <strong className="text-slate-800 dark:text-slate-200">{pricingTier}</strong> untuk memproses batch massal tak terbatas serta menghapus kuncian token trial.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
            <button
              onClick={() => setShowActivation?.(true)}
              className="px-4.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-900 font-black text-[10.5px] uppercase tracking-wider rounded-xl transition-all shadow shadow-amber-500/10 cursor-pointer"
            >
              Masukkan Key
            </button>
            <a
              href={`${whatsAppLink}?text=Halo%20Admin%2C%20saya%20tertarik%20membeli%20lisensi%20aktif%20SaaS%20${encodeURIComponent(appName || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4.5 py-2 bg-slate-950 dark:bg-slate-800 w-full sm:w-auto text-center hover:bg-slate-850 text-white font-black text-[10.5px] uppercase tracking-wider rounded-xl transition-all"
            >
              Hubungi Admin
            </a>
          </div>
        </div>
      )}

      {/* 3. CHOOSE YOUR WORKSPACE GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <Activity size={16} className="text-[#4e73df]" />
            <span>Pilih Ruang Kerja AI (Workspace)</span>
          </h3>
          <span className="text-[10px] font-black text-[#4e73df] uppercase tracking-widest bg-[#4e73df]/5 border border-[#4e73df]/10 px-2 py-0.5 rounded-md">3 Mode Aktif</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Image Workspace */}
          <div className="group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-white/5 p-5 shadow-sm hover:shadow-xl hover:border-[#4e73df]/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none">
              <ImageIcon size={72} className="text-[#4e73df]" />
            </div>
            
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 border border-blue-500/20 group-hover:scale-105 transition-transform">
                <ImageIcon size={18} />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-[#4e73df] transition-colors">
                Image AI Workspace
              </h4>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                Kompatibel dengan file foto, raster ilustrasi, atau screenshot berformat <strong className="text-slate-700 dark:text-slate-200">JPG, PNG & WEBP</strong>. Deteksi warna, struktur visual, elemen estetika, dan lokasi otomatis.
              </p>

              {!isLicensed && (
                <div className="mb-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                    <span>Trial Hari Ini</span>
                    <span className={imageDailyCount >= 50 ? "text-red-500" : "text-[#4e73df]"}>{imageDailyCount}/50 Aset</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${imageDailyCount >= 50 ? 'bg-red-550' : 'bg-[#4e73df]'}`} style={{ width: `${Math.min(100, (imageDailyCount / 50) * 100)}%` }} />
                  </div>
                  {imageDailyCount >= 50 && (
                    <span className="text-[9px] text-red-500 font-black block mt-1.5 leading-none">⚠️ Batas tercapai. Coba di esok hari.</span>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTool(ToolType.IMAGE)}
              className="w-full py-2 bg-[#4e73df] hover:bg-blue-600 text-white font-extrabold text-[11px] rounded-xl uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-sm hover:shadow group-hover:translate-x-1 hover:scale-[1.01] cursor-pointer"
            >
              <span>Mulai Optimasi Gambar</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card 2: Video Workspace */}
          <div className="group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-white/5 p-5 shadow-sm hover:shadow-xl hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none">
              <Film size={72} className="text-purple-500" />
            </div>
            
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 border border-purple-500/20 group-hover:scale-105 transition-transform">
                <Film size={18} />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-purple-500 transition-colors">
                Video AI Workspace
              </h4>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                Didesain khusus untuk klip video footage berformat <strong className="text-slate-700 dark:text-slate-200">MP4, MOV & WEBM</strong>. Menganalisis sekuen gambar dinamis serta mencocokkan gaya sinematografi objek bergerak.
              </p>

              {!isLicensed && (
                <div className="mb-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                    <span>Trial Hari Ini</span>
                    <span className={videoDailyCount >= 50 ? "text-red-500" : "text-purple-500"}>{videoDailyCount}/50 Aset</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${videoDailyCount >= 50 ? 'bg-red-550' : 'bg-purple-555'}`} style={{ width: `${Math.min(100, (videoDailyCount / 50) * 100)}%` }} />
                  </div>
                  {videoDailyCount >= 50 && (
                    <span className="text-[9px] text-red-500 font-black block mt-1.5 leading-none">⚠️ Batas tercapai. Coba di esok hari.</span>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTool(ToolType.VIDEO)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] rounded-xl uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-sm hover:shadow group-hover:translate-x-1 hover:scale-[1.01] cursor-pointer"
            >
              <span>Mulai Optimasi Video</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card 3: Vector Workspace */}
          <div className="group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-white/5 p-5 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 pointer-events-none">
              <FileCode size={72} className="text-emerald-500" />
            </div>
            
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <FileCode size={18} />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-emerald-500 transition-colors">
                Vector AI Workspace
              </h4>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
                Dibuat untuk berkas gambar ilustrasi berbasis garis/vektor yang fleksibel seperti <strong className="text-slate-700 dark:text-slate-200">SVG, EPS & AI</strong>. Menghasilkan pencarian tag terarah untuk kebutuhan elemen web UI/UX.
              </p>

              {!isLicensed && (
                <div className="mb-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                    <span>Trial Hari Ini</span>
                    <span className={vectorDailyCount >= 50 ? "text-red-500" : "text-emerald-500"}>{vectorDailyCount}/50 Aset</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${vectorDailyCount >= 50 ? 'bg-red-550' : 'bg-emerald-555'}`} style={{ width: `${Math.min(100, (vectorDailyCount / 50) * 100)}%` }} />
                  </div>
                  {vectorDailyCount >= 50 && (
                    <span className="text-[9px] text-red-500 font-black block mt-1.5 leading-none">⚠️ Batas tercapai. Coba di esok hari.</span>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTool(ToolType.VECTOR)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-750 text-white font-extrabold text-[11px] rounded-xl uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-sm hover:shadow group-hover:translate-x-1 hover:scale-[1.01] cursor-pointer"
            >
              <span>Mulai Optimasi Vektor</span>
              <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </div>

      {/* 3. CORE ANALYTICS GRAPHICS & STATS DOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STATS PANEL */}
        <div className="lg:col-span-1 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100 dark:border-white/5">
              <BarChart2 size={15} className="text-blue-500" />
              <span>Status Antrean Data</span>
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Metadata Oke</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{successfulFilesCount} File</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-[#4e73df]" />
                  <span>Siap Diproses AI</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{filesToGenerateCount} File</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Draf Belum Dikonfigurasi</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{unprocessedFilesCount} File</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Masalah / Error</span>
                </div>
                <span className="text-xs font-black text-slate-850 dark:text-slate-200">{filesWithErrorCount} File</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Persentase Sukses</span>
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
        <div className="lg:col-span-2 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/5 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100 dark:border-white/5">
              <Zap size={14} className="text-emerald-500 animate-pulse" />
              <span>Distribusi Format Upload</span>
            </h3>

            {totalFiles === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center select-none">
                <HelpCircle size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Belum Ada File Terunggah</p>
                <p className="text-[10px] font-bold text-slate-400/80 dark:text-slate-600/70 mt-1">Gunakan tab menu "Metadata Gen" untuk mengunggah file Anda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span className="flex items-center space-x-2"><ImageIcon size={14} className="text-blue-500" /> <span>Ruang Kerja Gambar (Image)</span></span>
                    <span>{imageFilesCount} File ({Math.round((imageFilesCount / totalFiles) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-lg transition-all" style={{ width: `${(imageFilesCount / totalFiles) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span className="flex items-center space-x-2"><Film size={14} className="text-purple-500" /> <span>Ruang Kerja Video (Video)</span></span>
                    <span>{videoFilesCount} File ({Math.round((videoFilesCount / totalFiles) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-lg transition-all" style={{ width: `${(videoFilesCount / totalFiles) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span className="flex items-center space-x-2"><FileCode size={14} className="text-emerald-500" /> <span>Ruang Kerja Vektor (Vector)</span></span>
                    <span>{vectorFilesCount} File ({Math.round((vectorFilesCount / totalFiles) * 100)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-lg transition-all" style={{ width: `${(vectorFilesCount / totalFiles) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-slate-100 dark:border-white/5 text-center">
            {/* Stock portal integration statuses */}
            {['Adobe Stock', 'Shutterstock', 'Freepik', 'Vecteezy', 'Canva'].map((portal, idx) => (
              <div key={portal} className="p-1 px-1.5 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase truncate">{portal}</span>
                <span className="inline-flex items-center space-x-1 mt-0.5 text-[8px] font-bold text-emerald-500 uppercase">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>Siap</span>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
