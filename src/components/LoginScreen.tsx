import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Key, Image as ImageIcon, Film, FileText, Layers, 
  ArrowRight, ShieldCheck, HelpCircle, Sun, Moon, Globe, Loader2, AlertCircle, Mail, Lock, X
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, auth, runSandboxGoogleSignIn, signInWithTokens } from '../supabase';
import LogoImage from '../assets/images/mz_pro_logo_1780923659277.png';
import { AppLanguage } from '../../constants';
import { Meteors } from './Meteors';

const AnimatedAppName: React.FC<{ name: string; fontSizeClass?: string }> = ({ name, fontSizeClass = "text-lg" }) => {
  const chars = name.split('');
  return (
    <div className="flex items-center flex-wrap select-none font-black tracking-tight leading-none uppercase">
      {chars.map((char, index) => (
        <motion.span
          key={index}
          className={`inline-block text-slate-950 dark:text-white hover:text-[#7c3aed] dark:hover:text-[#a78bfa] transition-colors duration-150 ${fontSizeClass}`}
          whileHover={{
            y: -4,
            scale: 1.15,
            transition: { type: 'spring', stiffness: 400, damping: 10 }
          }}
          style={{ display: 'inline-block', originY: 1 }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </div>
  );
};

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  theme,
  setTheme,
  language,
  setLanguage,
  t
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorHeader, setErrorHeader] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  
  // Email/Password states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [showGoogleChoice, setShowGoogleChoice] = useState(false);
  
  // Manual Token / Redirect URL override states
  const [showManualTokenInput, setShowManualTokenInput] = useState(false);
  const [manualTokenUrl, setManualTokenUrl] = useState('');
  const [manualTokenError, setManualTokenError] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorHeader(language === 'id' ? "Silakan masukkan alamat email Anda terlebih dahulu di kotak input." : "Please enter your email address in the input field first.");
      setResetSuccessMessage('');
      return;
    }
    
    setIsLoading(true);
    setErrorHeader('');
    setResetSuccessMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccessMessage(language === 'id' ? "Email pemulihan kata sandi telah dikirim! Silakan periksa kotak masuk Anda." : "Password reset email has been sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errMsg = err.message;
      if (err.code === "auth/invalid-email") {
        errMsg = language === 'id' ? "Format email tidak valid." : "Invalid email format.";
      } else if (err.code === "auth/user-not-found") {
        errMsg = language === 'id' ? "Email tidak terdaftar." : "Email address not found.";
      }
      setErrorHeader(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setErrorHeader('');
    try {
      if (isRegisterMode) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (result.user) onLoginSuccess(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user) onLoginSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      let errMsg = err.message;
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        errMsg = language === 'id' ? "Email atau kata sandi salah." : "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = language === 'id' ? "Email sudah terdaftar." : "Email is already registered.";
      } else if (err.code === "auth/weak-password") {
        errMsg = language === 'id' ? "Kata sandi terlalu lemah (minimal 6 karakter)." : "Password should be at least 6 characters.";
      }
      setErrorHeader(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantGoogleLogin = async () => {
    setIsLoading(true);
    setErrorHeader('');
    try {
      const result = runSandboxGoogleSignIn();
      if (result.user) {
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Instant Google Sign-In Error:", err);
      setErrorHeader(err.message || "Simulated sign-in failed.");
    } finally {
      setIsLoading(false);
      setShowGoogleChoice(false);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenUrl) return;
    
    setIsLoading(true);
    setManualTokenError('');
    try {
      let inputStr = manualTokenUrl.trim();
      
      let accessToken = '';
      let refreshToken = '';
      
      if (inputStr.includes('#') || inputStr.includes('?')) {
        const hashPart = inputStr.includes('#') ? inputStr.split('#')[1] : '';
        const queryPart = inputStr.includes('?') ? inputStr.split('?')[1].split('#')[0] : '';
        const params = new URLSearchParams(hashPart || queryPart);
        accessToken = params.get('access_token') || '';
        refreshToken = params.get('refresh_token') || '';
      } else if (inputStr.includes('access_token=')) {
        const params = new URLSearchParams(inputStr);
        accessToken = params.get('access_token') || '';
        refreshToken = params.get('refresh_token') || '';
      } else {
        accessToken = inputStr;
      }
      
      if (!accessToken) {
        throw new Error(
          language === 'id' 
            ? 'Format URL/Token tidak valid. Silakan salin seluruh alamat (URL) dari halaman Google yang macet.' 
            : 'Invalid URL/Token format. Please copy the entire address (URL) from the stuck Google window.'
        );
      }
      
      const result = await signInWithTokens(accessToken, refreshToken);
      if (result.user) {
        onLoginSuccess(result.user);
        setShowGoogleChoice(false);
      }
    } catch (err: any) {
      console.error("Manual Session Auth Error:", err);
      setManualTokenError(err.message || "Failed to set auth session.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorHeader('');
    setShowGoogleChoice(true);
    setShowManualTokenInput(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onLoginSuccess(result.user);
        setShowGoogleChoice(false);
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      let errMsg = "Sign-in failed. Please retry.";
      if (err.code === "auth/popup-blocked") {
        errMsg = language === 'id' 
          ? "Popup diblokir oleh browser Anda. Mohon izinkan popup untuk situs ini."
          : "Popup was blocked by your browser. Please outline popups for this site.";
      } else if (err.code === "auth/cancelled-popup-request") {
        errMsg = language === 'id'
          ? "Permintaan popup dibatalkan karena popup baru dibuka."
          : "Popup request canceled by another popup being opened.";
      } else if (err.code === "auth/popup-closed-by-user") {
        errMsg = language === 'id'
          ? "Proses masuk dibatalkan karena jendela login ditutup sebelum selesai."
          : "Login cancelled because the sign-in window was closed before completion.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setErrorHeader(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Content dictionary for Indonesian and English
  const loginTranslations = {
    id: {
      tag: "Mesin Metadata AI Tercanggih",
      title_part1: "Kontributor",
      title_part2: "Visual Lebih",
      title_part3: "Optimal",
      sub_desc: "Masuk untuk merevolusi workflow stock portal Anda. MetaZo PRO menganalisis foto, ilustrasi, vektor, dan video secara instan dengan kecerdasan buatan.",
      benefits_banner: "Fitur Unggulan MetaZo PRO",
      btn_login: "Masuk dengan akun Google",
      btn_logging_in: "Menghubungkan Akun...",
      secure_badge: "Koneksi Google Aman & Terenkripsi",
      help: "Hubungi Support WhatsApp",
      feature_1_title: "Deteksi Visual Berbasis AI",
      feature_1_desc: "Menganalisis foto, vektor EPS, & video untuk mengenali objek, suasana, warna dominan, dan konsep artistik terdalam.",
      feature_2_title: "Metadata Siap Pakai",
      feature_2_desc: "Menghasilkan Judul, Deskripsi, dan 25-45 kata kunci tertarget yang dikalibrasi untuk SEO pasar stock global.",
      feature_3_title: "Ekspor File CSV Instan",
      feature_3_desc: "Unduh hasil penganalisisan batch dengan standard struktur industri untuk Adobe Stock, Shutterstock, dll.",
    },
    en: {
      tag: "Advanced AI Metadata Engine",
      title_part1: "Streamline",
      title_part2: "Your Creator",
      title_part3: "Workflow",
      sub_desc: "Sign in to supercharge your stock contributor workflow. MetaZo PRO analyzes photos, illustrations, vectors, and videos instantly using cutting-edge AI.",
      benefits_banner: "Premium MetaZo PRO Features",
      btn_login: "Sign in with Google",
      btn_logging_in: "Connecting Account...",
      secure_badge: "Secured & Encrypted via Google Auth",
      help: "Contact WhatsApp Support",
      feature_1_title: "AI Visual Grounding",
      feature_1_desc: "Analyze photos, EPS vectors & video files to recognize deep concepts, activities, frames, and lighting setup.",
      feature_2_title: "SEO-Calibrated Metadata",
      feature_2_desc: "Output optimized Titles, Descriptions and up to 49 niche-relevant keywords instantly to maximize sales.",
      feature_3_title: "Instant Batch CSV Exports",
      feature_3_desc: "Download generated attributes matching specifications of Adobe Stock, Shutterstock, Canva, and more.",
    }
  };

  const tc = loginTranslations[language] || loginTranslations.en;

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between overflow-x-hidden relative bg-[#f8f9fc] dark:bg-[#090d16] text-[#5a5c69] dark:text-slate-100 ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* 1. BACKGROUND GLOW EFFECTS (Cosmic Theme) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft Radial Orbs - Dark Theme */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 dark:bg-violet-900/15 blur-[120px] transition-opacity duration-500" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-blue-500/10 dark:bg-indigo-900/20 blur-[130px] transition-opacity duration-500" />
        
        {/* Grid Overlay Line Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)]" />
        
        {/* Shooting stars background effect */}
        <Meteors number={12} />
      </div>

      {/* 2. HEADER BAR (Control center) */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 select-none">
          <motion.div 
            whileHover={{ rotate: 360, scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-9 h-9 bg-gradient-to-br from-[#7c3aed] to-[#224abe] rounded-[1.25rem] flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer"
          >
            <img src={LogoImage} alt="MetaZo PRO Logo" className="w-full h-full object-cover scale-[1.05]" />
          </motion.div>
          <AnimatedAppName name="MetaZo PRO" fontSizeClass="text-lg" />
        </div>

        <div className="flex items-center space-x-3">
          {/* Language Swap */}
          <button 
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
            className="px-3 py-1.5 flex items-center space-x-1.5 text-xs font-bold bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:scale-105 active:scale-95 transition-all focus:outline-none"
            title="Change Language"
          >
            <Globe size={13} />
            <span className="uppercase">{language}</span>
          </button>

          {/* Theme Switch */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/5 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:scale-105 active:scale-95 transition-all focus:outline-none"
            title="Toggle Visual Theme"
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* 3. HERO & CARD SPLIT MAIN SCREEN */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 my-auto">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Block: Aesthetic Marketing Copy (5 columns) */}
          <div className="lg:col-span-6 flex flex-col space-y-6 text-left max-w-xl mx-auto lg:mx-0">
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2 px-3 py-1 bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/20 rounded-full w-fit"
            >
              <Sparkles size={12} className="text-[#7c3aed]" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7c3aed] dark:text-[#a78bfa]">
                {tc.tag}
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]"
            >
              {tc.title_part1} <span className="bg-gradient-to-r from-[#7c3aed] to-indigo-500 bg-clip-text text-transparent">{tc.title_part2}</span> {tc.title_part3}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[11.5px] sm:text-xs text-slate-500 dark:text-slate-400/90 leading-relaxed font-semibold"
            >
              {tc.sub_desc}
            </motion.p>

            {/* Feature Points Grid */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4 pt-1 border-t border-slate-200/60 dark:border-slate-800/60"
            >
              {[
                { title: tc.feature_1_title, desc: tc.feature_1_desc, icon: <Layers className="text-violet-500 shrink-0 mt-0.5" size={15} /> },
                { title: tc.feature_2_title, desc: tc.feature_2_desc, icon: <Sparkles className="text-amber-500 shrink-0 mt-0.5" size={15} /> },
                { title: tc.feature_3_title, desc: tc.feature_3_desc, icon: <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={15} /> },
              ].map((f, i) => (
                <div key={i} className="flex space-x-3.5 group">
                  <div className="w-7 h-7 bg-white dark:bg-slate-900 border border-slate-250 dark:border-white/5 rounded-2xl flex items-center justify-center shadow-sm">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight group-hover:text-[#7c3aed] transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400/80 leading-normal font-medium max-w-sm mt-0.5">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Block: Elegant Login Gating Card (6 columns, shifted) */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end relative">

            {/* Mascot Character Animation */}
            <motion.div
              className="absolute -top-20 sm:-top-24 right-8 sm:right-16 z-0 hidden lg:flex flex-col items-center pointer-events-none"
              initial={{ y: 80, opacity: 0, rotate: 10 }}
              animate={isHovered ? { y: 0, opacity: 1, rotate: 0 } : { y: 80, opacity: 0, rotate: 10 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
               {/* Speech Bubble */}
               <div className="bg-[#7c3aed] text-white px-3 py-2 rounded-t-2xl rounded-bl-2xl shadow-lg relative flex items-center justify-center translate-x-8
                               before:content-[''] before:absolute before:-bottom-2 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-[#7c3aed]">
                  <span className="text-[11px] font-bold tracking-wide whitespace-nowrap">
                    {language === 'id' ? 'Klik ini yuk! 👇' : 'Click here! 👇'}
                  </span>
               </div>
               <div className="text-6xl mt-2 drop-shadow-2xl select-none origin-bottom" style={{ textShadow: "0 10px 20px rgba(0,0,0,0.3)" }}>
                 🤖
               </div>
            </motion.div>

            <motion.div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/5 p-8 sm:p-10 shadow-2xl shadow-violet-500/5 relative overflow-hidden group z-10"
            >
              {/* Dynamic top focus border accent */}
              <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-violet-600 via-[#7c3aed] to-indigo-600" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                
                {/* MetaZo Pro Glow Circle */}
                <div className="relative select-none">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#7c3aed] to-[#224abe] rounded-full blur-md opacity-25 scale-110" />
                  <motion.div 
                    whileHover={{ rotate: 360, scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="relative w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#224abe] rounded-[1.75rem] flex items-center justify-center shadow-xl border border-white/10 dark:border-slate-800 overflow-hidden cursor-pointer"
                  >
                    <img src={LogoImage} alt="MetaZo Logo Large" className="w-full h-full object-cover scale-[1.05]" />
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-[#a78bfa] font-extrabold uppercase tracking-widest text-[8.5px]">
                    {language === 'id' ? 'Aktivasi Portal Multi-Aset' : 'Core Workspace Activation'}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {language === 'id' ? 'Selamat Datang Kembali' : 'Welcome to MetaZo PRO'}
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold max-w-xs leading-relaxed mx-auto">
                    {language === 'id' 
                      ? 'Kelola ratusan aset digital sekaligus secara otomatis dengan dashboard stock intelligence tercanggih.' 
                      : 'Sign in utilizing your Google account to explore metadata scaling & AI key management.'}
                  </p>
                </div>

                {/* Error Banner if any */}
                {errorHeader && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-left text-red-600 dark:text-red-400 flex items-start space-x-2 shadow-sm"
                  >
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <div className="text-[10px] font-bold leading-normal">
                      <span className="uppercase block tracking-wide">{language === 'id' ? 'Pemberitahuan' : 'Notification'}</span>
                      <span className="font-semibold block normal-case mt-0.5 text-slate-800 dark:text-red-300/90">{errorHeader}</span>
                    </div>
                  </motion.div>
                )}

                {/* Reset Password Success Banner */}
                {resetSuccessMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left text-emerald-600 dark:text-emerald-400 flex items-start space-x-2 shadow-sm"
                  >
                    <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                    <div className="text-[10px] font-bold leading-normal">
                      <span className="uppercase block tracking-wide">{language === 'id' ? 'Sukses' : 'Success'}</span>
                      <span className="font-semibold block normal-case mt-0.5 text-slate-800 dark:text-emerald-300/90">{resetSuccessMessage}</span>
                    </div>
                  </motion.div>
                )}

                {/* Email / Password Form */}
                <form className="w-full space-y-4" onSubmit={handleEmailLoginOrRegister}>
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={language === 'id' ? "Email / Gmail" : "Email / Gmail"}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-slate-900 dark:text-white placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={language === 'id' ? "Kata Sandi" : "Password"}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-slate-900 dark:text-white placeholder:text-slate-400"
                          required={!isRegisterMode || password.length > 0}
                        />
                      </div>
                      
                      {!isRegisterMode && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-[10px] text-slate-500 dark:text-slate-400 font-bold hover:text-[#7c3aed] dark:hover:text-[#a78bfa] transition-colors cursor-pointer"
                          >
                            {language === 'id' ? 'Lupa Kata Sandi?' : 'Forgot Password?'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all disabled:opacity-75"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : (
                      isRegisterMode 
                        ? (language === 'id' ? 'Daftar' : 'Register')
                        : (language === 'id' ? 'Masuk dengan Email' : 'Sign In with Email')
                    )}
                  </button>
                </form>

                {/* Toggle Register/Login */}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-bold hover:text-[#7c3aed] dark:hover:text-[#a78bfa] transition-colors"
                >
                  {isRegisterMode 
                    ? (language === 'id' ? 'Sudah punya akun? Masuk' : 'Already have an account? Sign in')
                    : (language === 'id' ? 'Belum punya akun? Daftar' : "Don't have an account? Register")}
                </button>

                <div className="flex items-center w-full">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                  <span className="px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'id' ? 'Atau' : 'Or'}</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                </div>

                {/* Main Action Google Sign-In Button */}
                <button
                  type="button"
                  onClick={() => setShowGoogleChoice(true)}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 active:scale-[0.98] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-3.5 disabled:opacity-75 disabled:cursor-not-allowed group/btn"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin text-violet-500 dark:text-slate-900" />
                  ) : (
                    // Beautiful Custom SVG Google icon matching official specifications
                    <svg className="w-4 h-4 shrink-0 transition-transform group-hover/btn:scale-110" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span>{isLoading ? tc.btn_logging_in : tc.btn_login}</span>
                </button>

                {/* Shield credentials reassurance badge */}
                <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500 pb-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest">{tc.secure_badge}</span>
                </div>

              </div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* 4. FOOTER CREDENTIALS */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {language === 'id' ? '🔐 Didirikan dengan dedicasi @2026 MetaZo PRO.' : '🔐 Formulated with extreme accuracy ©2026 MetaZo PRO.'}
        </p>

        <div className="flex items-center space-x-4">
          <a 
            href={t?.whatsapp_link || 'https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr'} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[10px] font-black uppercase text-slate-500 hover:text-[#7c3aed] dark:text-slate-400 dark:hover:text-amber-50 tracking-wider transition-colors"
          >
            {tc.help}
          </a>
        </div>
      </footer>

      {/* GOOGLE SIGN IN METHOD SELECTION MODAL */}
      <AnimatePresence>
        {showGoogleChoice && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setShowGoogleChoice(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden flex flex-col text-[#5a5c69] dark:text-slate-100"
            >
              {/* Accent glowing gradient behind logo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 dark:from-violet-500/10 dark:to-indigo-500/10 blur-xl rounded-full" />

              {/* Close button */}
              <button 
                onClick={() => setShowGoogleChoice(false)} 
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-full transition-colors focus:outline-none"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center pb-5 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md mb-3 border border-slate-200 dark:border-white/5">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                </div>
                
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {language === 'id' ? 'Metode Masuk Google' : 'Google Sign-In Method'}
                </h3>
                
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
                  {language === 'id' ? 'Pilih salah satu metode masuk' : 'Choose your preferred sign-in method'}
                </p>
              </div>

              {/* Options */}
              <div className="py-6 space-y-4">
                {/* 1. Sandbox Simulated Sign In (Highly Recommended) */}
                <button
                  type="button"
                  onClick={handleInstantGoogleLogin}
                  className="w-full text-left p-4 bg-violet-500/5 hover:bg-violet-500/10 dark:bg-violet-500/10 dark:hover:bg-violet-500/15 border-2 border-[#7c3aed]/40 hover:border-[#7c3aed] rounded-3xl transition-all cursor-pointer group flex items-start space-x-3.5"
                >
                  <div className="w-8 h-8 bg-[#7c3aed]/10 text-[#7c3aed] rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-tight">
                        {language === 'id' ? '1. Masuk Cepat (Rekomendasi)' : '1. Fast Sign-In (Recommended)'}
                      </span>
                      <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest bg-[#34a853]/15 text-[#34a853] dark:text-[#34a853] rounded-full uppercase">
                        {language === 'id' ? 'Langsung' : 'Instant'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mt-1">
                      {language === 'id' 
                        ? 'Langsung masuk menggunakan Akun Google Simulasi secara aman tanpa pendaftaran / setup tambahan.' 
                        : 'Instantly sign in with a secure, pre-configured sandbox Google profile. No dashboard setup required.'}
                    </p>
                  </div>
                </button>

                {/* 2. Real Google Sign In (Requires Supabase Setup) */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 border-2 border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-3xl transition-all cursor-pointer group flex items-start space-x-3.5"
                >
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl flex items-center justify-center shrink-0">
                    <Globe size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                        {language === 'id' ? '2. Akun Google Asli' : '2. Real Google Account'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mt-1">
                      {language === 'id' 
                        ? 'Masuk menggunakan email Google asli Anda. Memerlukan integrasi Google Provider aktif di dashboard Supabase Anda.' 
                        : 'Authenticates with your real personal Google account. Requires Google OAuth enabled in your Supabase dashboard.'}
                    </p>
                  </div>
                </button>

                {/* Manual Token / localhost:3000 workaround helper */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualTokenInput(!showManualTokenInput)}
                    className="text-[10px] font-black text-[#7c3aed] dark:text-[#a78bfa] hover:text-[#6d28d9] hover:underline cursor-pointer uppercase tracking-wider bg-violet-500/10 px-3.5 py-1.5 rounded-full inline-flex items-center space-x-1"
                  >
                    <span>{showManualTokenInput 
                      ? (language === 'id' ? '▲ Tutup Solusi Solutif' : '▲ Close Help Workaround')
                      : (language === 'id' ? '👉 Jendela Google macet / "localhost menolak terhubung"?' : '👉 Google window stuck / "localhost refused to connect"?')}</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showManualTokenInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-3.5 bg-gradient-to-br from-amber-500/10 to-violet-500/10 dark:from-amber-500/15 dark:to-violet-500/15 p-5 rounded-[2rem] border-2 border-amber-500/30 text-left"
                    >
                      <div className="space-y-2">
                        <span className="text-amber-600 dark:text-amber-400 block text-[10px] uppercase tracking-wider font-black flex items-center space-x-1.5">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>
                            {language === 'id' ? 'KONEKSI ANDA BAGUS! INI BUKAN MASALAH JARINGAN:' : 'YOUR INTERNET IS FINE! THIS IS NOT A NETWORK ISSUE:'}
                          </span>
                        </span>
                        
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed normal-case">
                          {language === 'id' 
                            ? 'Aplikasi ini berjalan di cloud server sandbox (AI Studio). Saat login dengan Google Asli, sistem akan mengarahkan (redirect) ke "localhost:3000" di browser Anda. Karena localhost:3000 tidak berjalan di HP/PC Anda, browser Anda akan salah mendeteksi sebagai "koneksi ditolak".'
                            : 'This app is running in a secure cloud sandbox. When using the Real Google sign-in, it redirects back to "localhost:3000" which is not running locally on your PC/phone, triggering a connection refused page.'}
                        </p>

                        <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

                        <span className="text-[#7c3aed] dark:text-[#a78bfa] block text-[9px] uppercase tracking-wider font-black">
                          {language === 'id' ? '✅ PILIHAN SOLUSI TERBAIK:' : '✅ CHOOSE A SOLUTION BELOW:'}
                        </span>

                        <div className="space-y-2 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          {/* Method A */}
                          <div className="bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-violet-500/20">
                            <p className="text-[#7c3aed] dark:text-[#a78bfa] text-[9px] uppercase tracking-wider font-black mb-0.5">
                              {language === 'id' ? 'CARA A: MASUK INSTAN (SANGAT DIREKOMENDASIKAN)' : 'METHOD A: FAST INSTANT SIGN-IN (HIGHLY RECOMMENDED)'}
                            </p>
                            <p className="font-semibold text-slate-600 dark:text-slate-300 text-[9px]">
                              {language === 'id'
                                ? 'Gunakan opsi "1. Masuk Cepat" di atas. Ini adalah akun Google simulasi resmi yang masuk dalam 1 detik tanpa konfigurasi apa pun.'
                                : 'Simply choose "Option 1: Fast Sign-In" above. It uses a built-in sandbox Google account to bypass authentication limits.'}
                            </p>
                          </div>

                          {/* Method B */}
                          <div className="bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-amber-500/20">
                            <p className="text-amber-600 dark:text-amber-400 text-[9px] uppercase tracking-wider font-black mb-1">
                              {language === 'id' ? 'CARA B: BYPASS DENGAN COPY-PASTE ALAMAT URL' : 'METHOD B: BYPASS VIA COPY-PASTING THE STUCK URL'}
                            </p>
                            <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[9px] font-medium leading-normal normal-case">
                              <li>
                                {language === 'id' 
                                  ? 'Buka/klik opsi "2. Akun Google Asli" di atas.' 
                                  : 'Click the "2. Real Google Account" button above.'}
                              </li>
                              <li>
                                {language === 'id' 
                                  ? 'Ketika jendela baru browser Google terbuka dan macet dengan pesan "localhost menolak terhubung" (atau ERR_CONNECTION_REFUSED), SALIN (COPY) seluruh isi alamat/URL dari kolom atas browser baru tersebut.' 
                                  : 'When the new window gets stuck on "localhost refused to connect", COPY the entire URL from the address bar of that stuck window.'}
                              </li>
                              <li>
                                {language === 'id' 
                                  ? 'TEMPEL (PASTE) URL yang Anda salin ke kotak di bawah ini dan tekan "Selesaikan Masuk".' 
                                  : 'PASTE that copied URL into the input field below and click "Complete Sign-In".'}
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={manualTokenUrl}
                          onChange={(e) => setManualTokenUrl(e.target.value)}
                          placeholder={language === 'id' ? "Tempel (Paste) URL localhost yang Anda salin di sini..." : "Paste the copied localhost URL here..."}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-[#7c3aed]/30 dark:border-slate-700 rounded-2xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-[#7c3aed] text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner"
                          required
                        />
                        {manualTokenError && (
                          <div className="text-[9px] font-bold text-red-500 dark:text-red-400 flex items-start space-x-1 bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                            <AlertCircle size={11} className="shrink-0 mt-0.5" />
                            <span>{manualTokenError}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleManualTokenSubmit}
                        disabled={isLoading}
                        className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-[0.98] text-white font-black text-[10px] uppercase tracking-wider rounded-2xl shadow-lg transition-all disabled:opacity-75 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <Sparkles size={11} />
                            <span>{language === 'id' ? 'Selesaikan Masuk & Mulai' : 'Complete Sign-In & Launch'}</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notice footer */}
              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed text-center px-4">
                {language === 'id'
                  ? 'Gunakan opsi 1 jika Anda melihat error "provider is not enabled" di dashboard Supabase.'
                  : 'Please choose Option 1 if you encounter the "provider is not enabled" error in Supabase.'}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
