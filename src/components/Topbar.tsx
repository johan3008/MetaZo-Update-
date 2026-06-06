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
  t
}) => {
  return (
    <header className="h-16 shrink-0 bg-white dark:bg-[#111827] border-b border-[#e3e6f0]/60 dark:border-white/5 shadow-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
      {/* LEFT: HAMBURGER & SEARCH */}
      <div className="flex items-center space-x-3.5 flex-1 min-w-0">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
        >
          <Menu size={20} />
        </button>

        {/* SEARCH BOX */}
        <div className="hidden sm:flex items-center w-full max-w-[280px] relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700/80">
          <input 
            type="text" 
            placeholder="Search queue files..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent px-3 py-2 outline-none text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400" 
          />
          <div className="bg-[#4e73df] h-10 w-10 flex items-center justify-center text-white cursor-pointer hover:bg-blue-650 transition-colors">
            <Search size={13} />
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
