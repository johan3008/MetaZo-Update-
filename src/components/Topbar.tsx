import React from 'react';
import { Menu, Search, Sun, Moon, Info, Heart, ShieldAlert, Settings } from 'lucide-react';

interface TopbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  setShowInfoModal: (s: boolean) => void;
  setShowSettingsModal: (s: boolean) => void;
  t: any;
  setShowActivation?: (show: boolean) => void;
  isLicensed?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  searchQuery,
  setSearchQuery,
  theme,
  setTheme,
  sidebarOpen,
  setSidebarOpen,
  setShowInfoModal,
  setShowSettingsModal,
  t,
  setShowActivation,
  isLicensed
}) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="h-16 shrink-0 bg-white dark:bg-[#111827] border-b border-[#e3e6f0]/60 dark:border-white/5 shadow-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
      {/* LEFT: HAMBURGER & TIME */}
      <div className="flex items-center space-x-3.5 flex-1 min-w-0">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
        >
          <Menu size={20} />
        </button>

        {/* TIME DISPLAY */}
        <div className="hidden sm:flex items-center space-x-3 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-inner">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter mb-0.5">
              Current System Time
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-sm font-black text-slate-700 dark:text-emerald-400 font-mono tracking-widest leading-none">
                {formatTime(time)}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">
                {formatDate(time)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: SYSTEM HEALTH PILL, THEME SWAP, PROFILE */}
      <div className="flex items-center space-x-3">
        {/* Core status badge */}
        <div className="hidden lg:flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 transition-colors">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            STABILITY CORE ONLINE
          </span>
        </div>

        {/* Dynamic License Badge */}
        {isLicensed ? (
          <button 
            type="button"
            onClick={() => setShowActivation?.(true)}
            className="text-[10px] font-black uppercase bg-emerald-500/10 dark:bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-600 dark:text-emerald-400 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Kelola Lisensi / Berhenti Langganan"
          >
            👑 PRO ACTIVE
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowActivation?.(true)}
            className="text-[10px] font-black uppercase bg-amber-500/10 dark:bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-600 dark:text-amber-400 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-pulse"
            title="Aktivasi Lisensi Resmi / Mulai Pro"
          >
            ⚠️ TRIAL EVAL
          </button>
        )}

        {/* Theme Swapper */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Info Dialogue Trigger */}
        <button 
          onClick={() => setShowInfoModal(true)}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none flex items-center space-x-1"
          title="Information Manual"
        >
          <Info size={17} />
        </button>

        {/* Settings Dialogue Trigger */}
        <button 
          onClick={() => setShowSettingsModal(true)}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none flex items-center space-x-1"
          title="Settings & API Key"
        >
          <Settings size={17} className="animate-hover-spin" />
        </button>

      </div>
    </header>
  );
};
