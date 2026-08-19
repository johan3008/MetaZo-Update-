import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Zap, Globe, User, BookOpen, Clock, Heart, Award, Sparkles, Send, Flame } from 'lucide-react';
import LogoImage from '../assets/images/mz_pro_logo_1780923659277.png';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  t: any;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, theme, t }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200/80 dark:border-white/10 relative max-h-[90vh] overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          {/* Accent glowing gradient behind logo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 dark:from-violet-500/10 dark:to-indigo-500/10 blur-xl rounded-full" />

          {/* Close button with float animation */}
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-full transition-colors"
          >
            <X size={16} />
          </button>

          {/* Header Section */}
          <div className="flex flex-col items-center text-center pb-5 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
            <motion.div 
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 12 }}
              className="w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#224abe] rounded-[1.75rem] flex items-center justify-center shadow-xl mb-4 border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer"
            >
              <img src={LogoImage} alt="MetaZo PRO Logo" className="w-full h-full object-cover scale-[1.35]" />
            </motion.div>
            
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center justify-center gap-1.5">
              <span>MetaZo</span>
              <span className="text-[#7c3aed]">PRO</span>
              <span className="px-2 py-0.5 text-[9px] font-black tracking-widest bg-emerald-500/10 text-emerald-500 rounded-full dark:bg-emerald-500/20">v1.3.0</span>
            </h2>
            
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
              AI-Powered Microstock Portfolio Accelerator
            </p>
          </div>

          {/* Scrollable Content */}
          <div className="py-6 space-y-6 text-slate-600 dark:text-slate-300">
            
            {/* 1. Introduction & Background (Seluk Beluk) */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-indigo-500 dark:text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
                <BookOpen size={14} />
                <span>Seluk Beluk Aplikasi</span>
              </h3>
              <p className="text-xs leading-relaxed font-semibold text-slate-500 dark:text-slate-400">
                <strong className="text-slate-800 dark:text-slate-200">MetaZo PRO</strong> dirancang khusus sebagai solusi mutakhir bagi para kontributor microstock (Adobe Stock, Shutterstock, Freepik, Vecteezy, dll) dalam mengatasi salah satu tantangan paling melelahkan: pengisian metadata dan riset pasar.
              </p>
              <p className="text-xs leading-relaxed font-semibold text-slate-500 dark:text-slate-400">
                Dengan mengintegrasikan teknologi kecerdasan buatan (Gemini Pro Vision, GPT-4o, Llama 3 dll) yang dieksekusi secara mulus di sisi server, platform ini secara instan menganalisis komposisi visual, sudut kamera, nuansa warna, gaya artistik, serta potensi komersial instan dari aset Anda. Hal ini mereduksi alur kerja manual dari beberapa jam menjadi hitungan detik.
              </p>
            </div>

            {/* 2. Core Intelligent Engine (Metode Pemrosesan) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-[#7c3aed] mb-2">
                  <Zap size={14} className="fill-current" />
                  <span className="text-xs font-black uppercase tracking-wider">Otomatisasi Metadata</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Pemrosesan file tunggal (Standard) atau massal (Batch) yang menghasilkan Judul ramah SEO, Deskripsi bermakna komersial tinggi, serta 50 Keyword akurat yang siap diekspor dalam format CSV sesuai agensi target.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-emerald-500 mb-2">
                  <Sparkles size={14} />
                  <span className="text-xs font-black uppercase tracking-wider">Prompt & Quality Audit</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Penyaringan instan kualitas aset (Image QC) untuk mendeteksi noise, lisensi logo bocor, blur, serta generator formula prompt estetika dari referensi visual guna mempermudah pembuatan karya seni AI baru.
                </p>
              </div>
            </div>

            {/* 3. The Creator & Vision (Pembuatan) */}
            <div className="p-5 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-[2rem] border border-violet-500/15 dark:border-violet-500/10 space-y-3">
              <div className="flex items-center gap-2.5">
                <motion.div 
                  whileHover={{ rotate: 360, scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#224abe] rounded-[1.1rem] flex items-center justify-center shadow-md border border-slate-200/50 dark:border-slate-800/10 overflow-hidden cursor-pointer"
                >
                  <img src={LogoImage} alt="MetaZo PRO Logo" className="w-full h-full object-cover scale-[1.35]" />
                </motion.div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Kreator & Pengembang</h3>
                  <p className="text-[10px] font-black text-indigo-500 dark:text-violet-300 uppercase tracking-widest mt-0.5">Johan Chrismant Founded 2026</p>
                </div>
              </div>
              
              <p className="text-xs leading-relaxed font-semibold text-slate-500 dark:text-slate-400 pt-1">
                Dibuat dengan penuh dedikasi oleh <strong className="text-slate-800 dark:text-slate-250">Johan Chrismant</strong> untuk memberdayakan komunitas kreator konten microstock di Indonesia dan seluruh dunia. Visi pembuatannya adalah menyajikan asisten AI yang luar biasa andal, jujur dalam arsitektur, berkecepatan tinggi, dan terjangkau demi menghindarkan kontributor dari rasa lelah berlebih.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <a 
                  href="https://teer.id/johan3008" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-3.5 py-2 bg-[#7c3aed] hover:bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Heart size={12} className="fill-current text-rose-300" />
                  <span>Dukung Johan (Teer.id)</span>
                </a>
                
                <a 
                  href="https://wa.me/+6282275408171" // Just a placeholder, actually uses help link from translations or similar
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Globe size={12} className="text-emerald-500" />
                  <span>Hubungi Creator</span>
                </a>
              </div>
            </div>

            {/* 4. Commitment / Slogan */}
            <div className="text-center font-bold italic text-slate-400 dark:text-slate-500 text-[10px] tracking-wide flex items-center justify-center gap-1">
              <Flame size={12} className="text-[#7c3aed]" />
              <span>Memangkas Waktu, Melipatgandakan Royalti Konten Anda.</span>
            </div>

          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-200/65 dark:border-slate-800/65 shrink-0 flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs uppercase rounded-2xl transition-all shadow-sm cursor-pointer"
            >
              Kembali ke Aplikasi
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
