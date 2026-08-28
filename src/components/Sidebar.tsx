import React, { useState } from 'react';
import LogoImage from '../assets/images/mz_pro_logo_1780923659277.png';
import { motion } from 'motion/react';
import { 
  Heart, Zap, ImageIcon, Film, FileCode, Clock, ChevronLeft, ChevronRight, X, HelpCircle,
  ChevronDown, Sparkles, LayoutDashboard, Wand2, Type, MessageCircle, CheckCircle,
  Calendar, CreditCard, Info, Receipt, VolumeX, Video, Eraser, Star
} from 'lucide-react';
import { ToolType, GenerationMode, toolToPath } from '../../types';

const AnimatedAppName: React.FC<{ name: string; fontSizeClass?: string }> = ({ name, fontSizeClass = "text-base" }) => {
  const chars = name.split('');
  return (
    <div className="flex items-center flex-wrap select-none font-black tracking-tight leading-none">
      {chars.map((char, index) => (
        <motion.span
          key={index}
          className={`inline-block text-slate-900 dark:text-white hover:text-[#7c3aed] dark:hover:text-[#a78bfa] transition-colors duration-150 ${fontSizeClass}`}
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

interface SidebarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (c: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  t: any;
  filesLength: number;
  isLicensed?: boolean;
  isCheckingLicense?: boolean;
  setShowActivation?: (show: boolean) => void;
  onUnlockReseller?: () => void;
  appName?: string;
  unreadChatCount?: number;
  onShowAbout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTool,
  setActiveTool,
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarOpen,
  setSidebarOpen,
  generationMode,
  setGenerationMode,
  t,
  filesLength,
  isLicensed = false,
  isCheckingLicense = false,
  setShowActivation,
  onUnlockReseller,
  appName,
  unreadChatCount = 0,
  onShowAbout
}) => {
  const [metadataGenOpen, setMetadataGenOpen] = useState(true);
  const [promptGenOpen, setPromptGenOpen] = useState(true);
  const [logoClicks, setLogoClicks] = useState(0);

  const customAppName = appName || localStorage.getItem('mz_reseller_app_name') || 'MetaZo PRO';

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      onUnlockReseller?.();
      setLogoClicks(0);
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, tool: ToolType) => {
    e.preventDefault();
    setActiveTool(tool);
    setSidebarOpen(false); // Close mobile drawer if open
  };

  const navItemClass = (tool: ToolType) => {
    const isActive = activeTool === tool;
    let base = "flex items-center space-x-3 px-4 py-3 rounded-full text-sm font-extrabold transition-all ";
    if (isActive) {
      base += "bg-slate-900 text-[#ffffff] dark:bg-slate-100 dark:text-slate-900 shadow-md shadow-black/5 scale-[1.02]";
    } else {
      base += "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-amber-50";
    }
    return base;
  };

  const isMetadataGenActive = activeTool === ToolType.IMAGE || activeTool === ToolType.VIDEO || activeTool === ToolType.VECTOR;

  const isPromptGenActive = activeTool === ToolType.PROMPT_GEN || activeTool === ToolType.PROMPT_IMAGE || activeTool === ToolType.PROMPT_VIDEO;

  const SidebarContent = (
    <>
      {/* Brand Header */}
      <div 
        onClick={handleLogoClick}
        className="flex items-center space-x-3 px-4 py-5 border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none active:scale-[0.99] transition-all"
        title="MetaZo PRO Stock Assistant"
      >
        <motion.div 
          whileHover={{ rotate: 360, scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-9 h-9 bg-gradient-to-br from-[#7c3aed] to-[#224abe] rounded-[1.5rem] flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer shrink-0"
        >
          <img src={LogoImage} alt="MetaZo PRO Logo" className="w-full h-full object-cover scale-[1.05]" />
        </motion.div>
        {!sidebarCollapsed && (
          <div className="flex flex-col select-none">
            <AnimatedAppName name={customAppName} fontSizeClass="text-base" />
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse shrink-0" />
              STOCK ASSISTANT
            </motion.span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {/* Step Header */}
        <div>
          {!sidebarCollapsed && (
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] px-2.5 mb-2.5">
              {t.sidebar_core_generators}
            </p>
          )}
          <nav className="space-y-1">
            {/* Dashboard Button */}
            <a 
              href={toolToPath[ToolType.DASHBOARD]}
              onClick={(e) => handleNavClick(e, ToolType.DASHBOARD)}
              className={`block w-full text-left ${navItemClass(ToolType.DASHBOARD)} mb-1.5`}
            >
              <LayoutDashboard size={16} className={activeTool === ToolType.DASHBOARD ? "text-white dark:text-slate-900" : "text-slate-400"} />
              {!sidebarCollapsed && <span>{t.sidebar_dashboard}</span>}
            </a>

            {/* Metadata Gen tab and dropdown */}
            <div className="space-y-1">
              <button 
                onClick={() => {
                  if (sidebarCollapsed) {
                    setSidebarCollapsed(false);
                    setMetadataGenOpen(true);
                  } else {
                    setMetadataGenOpen(!metadataGenOpen);
                  }
                }}
                className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                  isMetadataGenActive 
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95" 
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Sparkles size={16} className={isMetadataGenActive ? "text-violet-600 dark:text-violet-400 animate-pulse" : "text-slate-400"} />
                  {!sidebarCollapsed && <span>{t.sidebar_metadata_gen}</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className={`text-slate-400 transition-transform duration-300 ${metadataGenOpen ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>

              {/* Sub-items list */}
              {metadataGenOpen && !sidebarCollapsed && (
                <div className="pl-3.5 pr-1 py-1 space-y-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-1 animate-in slide-in-from-top-1 duration-200">
                  <a href={toolToPath[ToolType.IMAGE]} onClick={(e) => handleNavClick(e, ToolType.IMAGE)}
                    className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTool === ToolType.IMAGE 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-black/5 font-black border-l-2 border-violet-500 pl-2.5" 
                        : "text-slate-250 hover:bg-white/5 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <ImageIcon size={14} className={activeTool === ToolType.IMAGE ? "text-emerald-400" : "text-slate-400"} />
                    <span>{t.image_tool} {t.common_editor}</span></a>

                  <a href={toolToPath[ToolType.VIDEO]} onClick={(e) => handleNavClick(e, ToolType.VIDEO)}
                    className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTool === ToolType.VIDEO 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-black/5 font-black border-l-2 border-violet-500 pl-2.5" 
                        : "text-slate-250 hover:bg-white/5 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <Film size={14} className={activeTool === ToolType.VIDEO ? "text-purple-400" : "text-slate-400"} />
                    <span>{t.video_tool} {t.common_editor}</span></a>

                  <a href={toolToPath[ToolType.VECTOR]} onClick={(e) => handleNavClick(e, ToolType.VECTOR)}
                    className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTool === ToolType.VECTOR 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-black/5 font-black border-l-2 border-violet-500 pl-2.5" 
                        : "text-slate-250 hover:bg-white/5 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <FileCode size={14} className={activeTool === ToolType.VECTOR ? "text-amber-400" : "text-slate-400"} />
                    <span>{t.vector_tool} {t.common_editor}</span></a>
                </div>
              )}
            </div>

            {/* Prompt Gen Button/Dropdown */}
            <div className="space-y-1">
              <button 
                onClick={() => {
                  if (sidebarCollapsed) {
                    setSidebarCollapsed(false);
                    setPromptGenOpen(true);
                  } else {
                    setPromptGenOpen(!promptGenOpen);
                  }
                }}
                className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                  isPromptGenActive 
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95" 
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Wand2 size={16} className={isPromptGenActive ? "text-slate-900 dark:text-white rotate-12 transition-transform" : "text-slate-400"} />
                  {!sidebarCollapsed && <span>{t.sidebar_prompt_gen}</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown 
                    size={14} 
                    className={`text-slate-400 transition-transform duration-300 ${promptGenOpen ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>

              {/* Sub-items list for Prompt Gen */}
              {promptGenOpen && !sidebarCollapsed && (
                <div className="pl-3.5 pr-1 py-1 space-y-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-1 animate-in slide-in-from-top-1 duration-200">
                  <a href={toolToPath[ToolType.PROMPT_GEN]} onClick={(e) => handleNavClick(e, ToolType.PROMPT_GEN)}
                    className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTool === ToolType.PROMPT_GEN 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-black/5 font-black border-l-2 border-violet-500 pl-2.5" 
                        : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <Type size={14} className={activeTool === ToolType.PROMPT_GEN ? "text-emerald-400" : "text-slate-400"} />
                    <span>{t.sidebar_prompt_text}</span></a>

                  <a href={toolToPath[ToolType.PROMPT_IMAGE]} onClick={(e) => handleNavClick(e, ToolType.PROMPT_IMAGE)}
                    className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTool === ToolType.PROMPT_IMAGE 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-black/5 font-black border-l-2 border-violet-500 pl-2.5" 
                        : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <ImageIcon size={14} className={activeTool === ToolType.PROMPT_IMAGE ? "text-emerald-400" : "text-slate-400"} />
                    <span>{t.sidebar_prompt_image}</span></a>

                  <a href={toolToPath[ToolType.PROMPT_VIDEO]} onClick={(e) => handleNavClick(e, ToolType.PROMPT_VIDEO)}
                    className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTool === ToolType.PROMPT_VIDEO 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-black/5 font-black border-l-2 border-violet-500 pl-2.5" 
                        : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <Film size={14} className={activeTool === ToolType.PROMPT_VIDEO ? "text-emerald-400" : "text-slate-400"} />
                    <span>{t.sidebar_prompt_video}</span></a>
                </div>
              )}
            </div>

                        <a href={toolToPath[ToolType.PROMPT_IMAGE_CHECK]} onClick={(e) => handleNavClick(e, ToolType.PROMPT_IMAGE_CHECK)}
              className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                activeTool === ToolType.PROMPT_IMAGE_CHECK 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 border-l-4 border-violet-500" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CheckCircle size={16} className={activeTool === ToolType.PROMPT_IMAGE_CHECK ? "text-emerald-400" : "text-slate-400"} />
              {!sidebarCollapsed && <span>{t.sidebar_image_check}</span>}
            </a>

            <a href={toolToPath[ToolType.CALENDAR_GEN]} onClick={(e) => handleNavClick(e, ToolType.CALENDAR_GEN)}
              className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                activeTool === ToolType.CALENDAR_GEN 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 border-l-4 border-violet-500" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Calendar size={16} className={activeTool === ToolType.CALENDAR_GEN ? "text-emerald-400" : "text-slate-400"} />
              {!sidebarCollapsed && <span>{t.sidebar_calendar_gen}</span>}
            </a>

            <a href={toolToPath[ToolType.MUTE_VIDEO]} onClick={(e) => handleNavClick(e, ToolType.MUTE_VIDEO)}
              className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                activeTool === ToolType.MUTE_VIDEO 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 border-l-4 border-violet-500" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <VolumeX size={16} className={activeTool === ToolType.MUTE_VIDEO ? "text-rose-400" : "text-slate-400"} />
              {!sidebarCollapsed && <span>{t.sidebar_mute_video || "Mute Video Gen"}</span>}
            </a>

            <a href={toolToPath[ToolType.MOTION_GEN]} onClick={(e) => handleNavClick(e, ToolType.MOTION_GEN)}
              className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                activeTool === ToolType.MOTION_GEN 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 border-l-4 border-indigo-500" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Video size={16} className={activeTool === ToolType.MOTION_GEN ? "text-indigo-400" : "text-slate-400"} />
              {!sidebarCollapsed && <span>{t.sidebar_motion_gen || "Motion Gen"}</span>}
            </a>

            <a href={toolToPath[ToolType.REMOVAL_GEN]} onClick={(e) => handleNavClick(e, ToolType.REMOVAL_GEN)}
              className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all duration-200 ${
                activeTool === ToolType.REMOVAL_GEN 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 border-l-4 border-fuchsia-500" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Eraser size={16} className={activeTool === ToolType.REMOVAL_GEN ? "text-fuchsia-400" : "text-slate-400"} />
              {!sidebarCollapsed && <span>{t.sidebar_removal_gen || "Removal Gen"}</span>}
            </a>
          </nav>
        </div>

        {/* AI System Tuning */}
        <div>
          {!sidebarCollapsed && (
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] px-2.5 mb-3">
              {t.sidebar_processing_mode}
            </p>
          )}
          <div className={`space-y-1 ${sidebarCollapsed ? 'items-center flex flex-col' : ''}`}>
            <button
              onClick={() => setGenerationMode(GenerationMode.STANDARD)}
              className={`w-full text-left flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                generationMode === GenerationMode.STANDARD
                  ? 'bg-amber-500 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400/80 hover:bg-white/5'
              }`}
            >
              <Clock size={14} />
              {!sidebarCollapsed && <span>{t.generation_mode_standard} {t.common_mode}</span>}
            </button>
            <button
              onClick={() => setGenerationMode(GenerationMode.BATCH)}
              className={`w-full text-left flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                generationMode === GenerationMode.BATCH
                  ? 'bg-emerald-500 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400/80 hover:bg-white/5'
              }`}
            >
              <Zap size={14} className="animate-pulse" />
              {!sidebarCollapsed && <span>{t.generation_mode_batch} {t.common_mode}</span>}
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div>
          {!sidebarCollapsed && (
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] px-2.5 mb-2.5">
              {t.sidebar_resources}
            </p>
          )}
          <nav className="space-y-1">
            {isLicensed ? (
              <button 
                type="button"
                onClick={() => setShowActivation?.(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-2xl text-[10px] font-black text-emerald-400 mb-1.5 transition-all text-left cursor-pointer"
                title={t.sidebar_manage_license}
              >
                <div className="flex items-center space-x-2 truncate">
                  <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{t.sidebar_pro_active}</span>}
                </div>
                {!sidebarCollapsed && <span className="text-[9px] opacity-75 underline font-bold uppercase hover:text-slate-900 dark:text-white shrink-0">{t.sidebar_manage}</span>}
              </button>
            ) : isCheckingLicense ? (
              <div 
                className="w-full flex items-center justify-center py-2 bg-slate-500/10 border border-slate-500/20 rounded-2xl text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1.5 animate-pulse"
              >
                {!sidebarCollapsed && <span>{t.language === 'Bahasa' ? 'Memverifikasi...' : 'Verifying...'}</span>}
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setShowActivation?.(true)}
                className="w-full flex items-center space-x-3 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 hover:brightness-110 active:scale-[0.98] rounded-2xl text-[10.5px] font-black shadow-md transition-all mb-1.5 cursor-pointer"
              >
                <Sparkles size={14} className="shrink-0 animate-bounce text-amber-900" />
                {!sidebarCollapsed && <span>{t.sidebar_activation_premium}</span>}
              </button>
            )}

            {/* Banner Support removed */}

            <button 
              type="button"
              onClick={() => window.open('https://teer.id/johan3008', '_blank')}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all cursor-pointer mb-1.5"
            >
              <Heart size={14} />
              {!sidebarCollapsed && <span>{t.sidebar_donate || 'Dukung Kami'}</span>}
            </button>

            <button 
              type="button"
              onClick={() => setShowActivation?.(true)}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer mb-1.5"
            >
              <CreditCard size={14} className="text-amber-400" />
              {!sidebarCollapsed && <span>{t.sidebar_subscription_plan}</span>}
            </button>
            <button 
              type="button"
              onClick={() => setShowActivation?.(true)}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer mb-1.5"
            >
              <Receipt size={14} className="text-blue-400" />
              {!sidebarCollapsed && <span>{t.language === 'id' ? 'Tagihan (Billing)' : 'Billing'}</span>}
            </button>

            {/* Community Reviews Menu Item */}
            <a 
              href={toolToPath[ToolType.REVIEWS] || '/CommunityReviews'} 
              onClick={(e) => handleNavClick(e, ToolType.REVIEWS)}
              className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 mb-1.5 ${
                activeTool === ToolType.REVIEWS 
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md border-l-4 border-amber-400" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Star size={14} className={activeTool === ToolType.REVIEWS ? "text-amber-400 fill-amber-400" : "text-amber-400"} />
              {!sidebarCollapsed && <span>{t.language === 'Bahasa' ? '⭐ Ulasan & Rating' : '⭐ Reviews & Ratings'}</span>}
            </a>

            <button 
              type="button"
              onClick={onShowAbout}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer mb-1.5 animate-none"
            >
              <Info size={14} className="text-[#7c3aed]" />
              {!sidebarCollapsed && <span>{t.sidebar_about || 'Tentang MetaZo PRO'}</span>}
            </button>

            <a 
              href={t.whatsapp_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <MessageCircle size={14} className="text-emerald-400 animate-pulse" />
              {!sidebarCollapsed && <span>{t.help_button}</span>}
            </a>
          </nav>
        </div>
      </div>

      {/* Sidebar Footer / Toggle */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {!sidebarCollapsed && (
          <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pl-2">
            v1.3.0
          </div>
        )}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`p-2 bg-white/10 hover:bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl transition-all ${sidebarCollapsed ? 'mx-auto' : ''}`}
          title={sidebarCollapsed ? t.sidebar_expand : t.sidebar_collapse}
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`sticky top-0 h-screen shrink-0 border-r border-[#e3e6f0]/40 dark:border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-400 hidden md:flex flex-col z-30`}
      >
        {SidebarContent}
      </aside>

      {/* MOBILE SLIDE-OUT DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-300">
          {/* Overlay mask */}
          <div 
            onClick={() => setSidebarOpen(false)} 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
          />
          {/* Drawer main panel */}
          <div className="relative w-64 h-full bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-400 flex flex-col p-4 z-10 shadow-2xl justify-between">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white rounded-full hover:bg-black/20"
            >
              <X size={16} />
            </button>
            <div className="flex-1 flex flex-col h-full select-none">
              <div 
                onClick={handleLogoClick}
                className="flex items-center space-x-3 px-1 py-5 border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none active:scale-[0.99] transition-all"
              >
                <motion.div 
                  whileHover={{ rotate: 360, scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-9 h-9 bg-gradient-to-br from-[#7c3aed] to-[#224abe] rounded-[1.5rem] flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer shrink-0"
                >
                  <img src={LogoImage} alt="MetaZo PRO Logo" className="w-full h-full object-cover scale-[1.05]" />
                </motion.div>
                <div className="flex flex-col select-none">
                  <AnimatedAppName name={customAppName} fontSizeClass="text-sm" />
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse shrink-0" />
                    STOCK ASSISTANT
                  </motion.span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pt-6 space-y-6">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">
                    {t.sidebar_core_tools}
                  </p>
                  <nav className="space-y-1.5">
                    {/* Dashboard Button for Mobile */}
                    <button 
                      onClick={() => { setActiveTool(ToolType.DASHBOARD); setSidebarOpen(false); }} 
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                        activeTool === ToolType.DASHBOARD 
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' 
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      } mb-1.5`}
                    >
                      <LayoutDashboard size={14} className={activeTool === ToolType.DASHBOARD ? "text-slate-900 dark:text-white animate-pulse" : "text-slate-400"} />
                      <span>{t.sidebar_dashboard}</span></button>

                    {/* Metadata Gen Dropdown for Mobile */}
                    <div className="space-y-1">
                      <button 
                        onClick={() => setMetadataGenOpen(!metadataGenOpen)}
                        className={`w-full text-left flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                          isMetadataGenActive 
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white" 
                            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Sparkles size={14} className={isMetadataGenActive ? "text-violet-600 dark:text-violet-400 animate-pulse" : "text-slate-400"} />
                          <span>{t.sidebar_metadata_gen}</span>
                        </div>
                        <ChevronDown 
                          size={12} 
                          className={`text-slate-400 transition-transform duration-300 ${metadataGenOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>

                      {/* Sub-items list */}
                      {metadataGenOpen && (
                        <div className="pl-3.5 pr-1 py-1 space-y-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-1 animate-in slide-in-from-top-1 duration-200">
                          <button 
                            onClick={() => { setActiveTool(ToolType.IMAGE); setSidebarOpen(false); }}
                            className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              activeTool === ToolType.IMAGE 
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-l-2 border-violet-500 pl-2.5" 
                                : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5"
                            }`}
                          >
                            <ImageIcon size={12} className={activeTool === ToolType.IMAGE ? "text-emerald-400" : "text-slate-400"} />
                            <span>{t.image_tool} Editor</span></button>

                          <button 
                            onClick={() => { setActiveTool(ToolType.VIDEO); setSidebarOpen(false); }}
                            className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              activeTool === ToolType.VIDEO 
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-l-2 border-violet-500 pl-2.5" 
                                : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5"
                            }`}
                          >
                            <Film size={12} className={activeTool === ToolType.VIDEO ? "text-purple-400" : "text-slate-400"} />
                            <span>{t.video_tool} Editor</span></button>

                          <button 
                            onClick={() => { setActiveTool(ToolType.VECTOR); setSidebarOpen(false); }}
                            className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              activeTool === ToolType.VECTOR 
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-l-2 border-violet-500 pl-2.5" 
                                : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5"
                            }`}
                          >
                            <FileCode size={12} className={activeTool === ToolType.VECTOR ? "text-amber-400" : "text-slate-400"} />
                            <span>{t.vector_tool} Editor</span></button>
                        </div>
                      )}
                    </div>

                    {/* Prompt Gen Dropdown for Mobile */}
                    <div className="space-y-1">
                      <button 
                        onClick={() => setPromptGenOpen(!promptGenOpen)}
                        className={`w-full text-left flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                          isPromptGenActive 
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white" 
                            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Wand2 size={14} className={isPromptGenActive ? "text-slate-900 dark:text-white" : "text-slate-400"} />
                          <span>{t.sidebar_prompt_gen}</span>
                        </div>
                        <ChevronDown 
                          size={12} 
                          className={`text-slate-400 transition-transform duration-300 ${promptGenOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>

                      {/* Sub-items list for Mobile */}
                      {promptGenOpen && (
                        <div className="pl-3.5 pr-1 py-1 space-y-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-1 animate-in slide-in-from-top-1 duration-200">
                          <button 
                            onClick={() => { setActiveTool(ToolType.PROMPT_GEN); setSidebarOpen(false); }}
                            className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              activeTool === ToolType.PROMPT_GEN 
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-l-2 border-violet-500 pl-2.5" 
                                : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5"
                            }`}
                          >
                            <Type size={12} className={activeTool === ToolType.PROMPT_GEN ? "text-emerald-400" : "text-slate-400"} />
                            <span>{t.sidebar_prompt_text}</span></button>

                          <button 
                            onClick={() => { setActiveTool(ToolType.PROMPT_IMAGE); setSidebarOpen(false); }}
                            className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              activeTool === ToolType.PROMPT_IMAGE 
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-l-2 border-violet-500 pl-2.5" 
                                : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5"
                            }`}
                          >
                            <ImageIcon size={12} className={activeTool === ToolType.PROMPT_IMAGE ? "text-emerald-400" : "text-slate-400"} />
                            <span>{t.sidebar_prompt_image}</span></button>

                          <button 
                            onClick={() => { setActiveTool(ToolType.PROMPT_VIDEO); setSidebarOpen(false); }}
                            className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              activeTool === ToolType.PROMPT_VIDEO 
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-l-2 border-violet-500 pl-2.5" 
                                : "text-slate-600 dark:text-slate-400/80 hover:bg-white/5"
                            }`}
                          >
                            <Film size={12} className={activeTool === ToolType.PROMPT_VIDEO ? "text-emerald-400" : "text-slate-400"} />
                            <span>{t.sidebar_prompt_video}</span></button>
                        </div>
                      )}
                    </div>

                                        <button 
                      onClick={() => { setActiveTool(ToolType.PROMPT_IMAGE_CHECK); setSidebarOpen(false); }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        activeTool === ToolType.PROMPT_IMAGE_CHECK 
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 border-violet-500" 
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <CheckCircle size={14} className={activeTool === ToolType.PROMPT_IMAGE_CHECK ? "text-emerald-400" : "text-slate-400"} />
                      <span>{t.sidebar_image_check}</span></button>

                    <button 
                      onClick={() => { setActiveTool(ToolType.CALENDAR_GEN); setSidebarOpen(false); }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        activeTool === ToolType.CALENDAR_GEN 
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 border-violet-500" 
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Calendar size={14} className={activeTool === ToolType.CALENDAR_GEN ? "text-emerald-400" : "text-slate-400"} />
                      <span>{t.sidebar_calendar_gen}</span></button>

                    <button 
                      onClick={() => { setActiveTool(ToolType.MUTE_VIDEO); setSidebarOpen(false); }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        activeTool === ToolType.MUTE_VIDEO 
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 border-rose-500" 
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <VolumeX size={14} className={activeTool === ToolType.MUTE_VIDEO ? "text-rose-400" : "text-slate-400"} />
                      <span>{t.sidebar_mute_video || "Mute Video Gen"}</span></button>

                    <button 
                      onClick={() => { setActiveTool(ToolType.MOTION_GEN); setSidebarOpen(false); }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        activeTool === ToolType.MOTION_GEN 
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 border-indigo-500" 
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Video size={14} className={activeTool === ToolType.MOTION_GEN ? "text-indigo-400" : "text-slate-400"} />
                      <span>{t.sidebar_motion_gen || "Motion Gen"}</span></button>

                    <button 
                      onClick={() => { setActiveTool(ToolType.REMOVAL_GEN); setSidebarOpen(false); }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        activeTool === ToolType.REMOVAL_GEN 
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-l-4 border-fuchsia-500" 
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Eraser size={14} className={activeTool === ToolType.REMOVAL_GEN ? "text-fuchsia-400" : "text-slate-400"} />
                      <span>{t.sidebar_removal_gen || "Removal Gen"}</span></button>
                  </nav>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">
                    {t.sidebar_tuning}
                  </p>
                  <div className="space-y-1.5">
                    <button onClick={() => { setGenerationMode(GenerationMode.STANDARD); setSidebarOpen(false); }} className={`w-full text-left flex items-center space-x-3 px-4 py-2 rounded-2xl text-xs font-bold ${generationMode === GenerationMode.STANDARD ? 'bg-amber-500 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400/80 hover:bg-white/5'}`}>
                      <Clock size={13} />
                      <span>{t.generation_mode_standard} Mode</span></button>
                    <button onClick={() => { setGenerationMode(GenerationMode.BATCH); setSidebarOpen(false); }} className={`w-full text-left flex items-center space-x-3 px-4 py-2 rounded-2xl text-xs font-bold ${generationMode === GenerationMode.BATCH ? 'bg-emerald-500 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400/80 hover:bg-white/5'}`}>
                      <Zap size={13} />
                      <span>{t.generation_mode_batch} Mode</span></button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <button 
                onClick={() => { onShowAbout?.(); setSidebarOpen(false); }}
                className="w-full text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-[1.5rem] flex items-center justify-center space-x-2 cursor-pointer mb-1.5"
              >
                <Info size={14} />
                <span>{t.sidebar_about || 'Tentang MetaZo PRO'}</span></button>

              <a href={t.whatsapp_link} target="_blank" rel="noopener noreferrer" className="w-full text-center py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white text-xs font-black rounded-[1.5rem] flex items-center justify-center space-x-2">
                <MessageCircle size={14} />
                <span>{t.help_button}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
