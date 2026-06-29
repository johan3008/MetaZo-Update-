import React from 'react';
import { ImageQualityCheck } from './ImageQualityCheck';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export const ImageCheckView: React.FC<{ 
  t: any;
  aiOptions?: any;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: (amount?: number) => void;
  setShowLimitModal?: (show: boolean) => void;
}> = ({ t, aiOptions, isLicensed, dailyGenCount, incrementDailyCount, setShowLimitModal }) => {
  const isBahasa = t.language === 'Bahasa';

  return (
    <div className="w-full space-y-6">
      {/* Persistent Adobe IP Refusal Compliance Banner with custom entrance animation */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden bg-slate-900 dark:bg-slate-950 border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-xl"
      >
        {/* Subtle orange ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        
        <div className="relative flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex gap-3 items-start">
            <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-500 shrink-0">
              <ShieldAlert size={22} className="animate-pulse" />
            </div>
            <div className="space-y-1 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  {isBahasa ? 'Panduan Kepatuhan Penolakan IP Adobe' : 'Adobe IP Refusal Compliance Standards'}
                </h3>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {isBahasa ? 'Penting' : 'Critical'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {isBahasa 
                  ? 'Adobe Stock sangat ketat terhadap konten komersial yang menampilkan logo, merek dagang, desain produk eksklusif (misal: bodi iPhone, grille Jeep, LEGO), atau karya arsitektur modern yang dilindungi hak cipta. Selalu lakukan audit visual menyeluruh untuk memastikan aset Anda bebas dari potensi penolakan ini.'
                  : 'Adobe Stock enforces strict guidelines on commercial content featuring trademarks, registered designs (e.g., iPhone frame, Jeep grilles, LEGO bricks), or copyrighted modern architecture. Run detailed visual audits to protect your contributor portfolio and prevent automated refusals.'}
              </p>
            </div>
          </div>
          
          <div className="shrink-0 pt-2 md:pt-0">
            <a 
              href="https://helpx.adobe.com/stock/contributor/help/known-image-restrictions.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 rounded-xl border border-amber-500/20 hover:border-amber-500/30 transition-all duration-300 shadow-sm whitespace-nowrap"
            >
              <span>{isBahasa ? 'Buka Panduan Adobe HelpX' : 'View Adobe HelpX Guidelines'}</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Quick reminder tags */}
        <div className="relative mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-slate-400 font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{isBahasa ? 'Logo & Merek' : 'Logos & Trademarks'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{isBahasa ? 'Desain Industri Terproteksi' : 'Proprietary Product Shapes'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{isBahasa ? 'Karya Arsitektur Modern' : 'Protected Modern Landmarks'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{isBahasa ? 'Karakter Hak Cipta & AI' : 'Copyrighted Characters & AI Artifacts'}</span>
          </div>
        </div>
      </motion.div>

      <ImageQualityCheck 
        t={t} 
        aiOptions={aiOptions} 
        isLicensed={isLicensed}
        dailyGenCount={dailyGenCount}
        incrementDailyCount={incrementDailyCount}
        setShowLimitModal={setShowLimitModal}
      />
    </div>
  );
};

