import React from 'react';
import { Menu, Search, Sun, Moon, Info, Heart, ShieldAlert, Settings, Globe, LogOut } from 'lucide-react';
import { AppLanguage } from '../../constants';

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
  uiLanguage: AppLanguage;
  setUiLanguage: (lang: AppLanguage) => void;
  user?: any;
  onSignOut?: () => void;
  activeAccountsCount?: number;
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
  isLicensed,
  uiLanguage,
  setUiLanguage,
  user,
  onSignOut,
  activeAccountsCount = 0
}) => {
  const [time, setTime] = React.useState(new Date());
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    <header className="h-16 shrink-0 bg-white dark:bg-[#111827] border-b border-[#e3e6f0]/60 dark:border-white/5 shadow-md shadow-black/5 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
      {/* LEFT: HAMBURGER & TIME */}
      <div className="flex items-center space-x-3.5 flex-1 min-w-0">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors focus:outline-none"
        >
          <Menu size={20} />
        </button>

        {/* TIME DISPLAY */}
        <div className="hidden sm:flex items-center space-x-3 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-200/50 dark:border-white/5 shadow-inner">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter mb-0.5">
              {t.topbar_system_time}
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
            {activeAccountsCount} Active Accounts
          </span>
        </div>

        {/* Dynamic License Badge */}
        {isLicensed ? (
          <button 
            type="button"
            onClick={() => setShowActivation?.(true)}
            className="text-[10px] font-black uppercase bg-emerald-500/10 dark:bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-600 dark:text-emerald-400 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title={t.sidebar_manage_license}
          >
            {t.topbar_pro_active}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowActivation?.(true)}
            className="text-[10px] font-black uppercase bg-amber-500/10 dark:bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-600 dark:text-amber-400 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-pulse"
            title={t.sidebar_activation_tooltip}
          >
            {t.topbar_trial_eval}
          </button>
        )}

        {/* Language Swapper */}
        <button 
          onClick={() => setUiLanguage(uiLanguage === 'en' ? 'id' : 'en')}
          className="hidden md:flex p-2 items-center space-x-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors focus:outline-none"
          title={t.language}
        >
          <Globe size={17} />
          <span className="text-[10px] font-black uppercase">{uiLanguage}</span>
        </button>

        {/* Theme Swapper */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden md:flex p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors focus:outline-none"
          title={t.topbar_toggle_theme}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>



        {/* Authenticated User Profile & Sign Out Dropdown */}
        {user && (
          <div ref={menuRef} className="relative flex items-center pl-2 border-l border-slate-200/60 dark:border-white/5">
            <button 
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-1 focus:outline-none hover:opacity-80 active:scale-95 transition-all p-1 rounded-2xl"
              title={uiLanguage === 'id' ? 'Menu Akun' : 'Account Menu'}
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Profile'} 
                  className="w-7 h-7 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm" 
                />
              ) : (
                <div className="w-7 h-7 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black uppercase shadow-sm">
                  {user.email ? user.email.substring(0, 2) : 'MZ'}
                </div>
              )}
            </button>

            {menuOpen && (
              <div 
                id="profile-dropdown-menu"
                className="absolute right-0 top-11 w-64 bg-white dark:bg-[#1f2937] border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-xl py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* User Details */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 mb-1.5">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    {uiLanguage === 'id' ? 'Akun Pengguna' : 'User Account'}
                  </p>
                  {user.displayName && (
                    <p className="text-xs font-black text-slate-800 dark:text-white truncate mt-0.5">
                      {user.displayName}
                    </p>
                  )}
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {user.email}
                  </p>
                  
                  {/* License Info inside dropdown */}
                  <div className="mt-2 flex">
                    {isLicensed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {t.topbar_pro_active}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {t.topbar_trial_eval}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions - Mobile & Tablet only (<md screen size) */}
                <div className="block md:hidden border-b border-slate-100 dark:border-white/5 pb-1.5 mb-1.5">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-4 mb-1">
                    {uiLanguage === 'id' ? 'Akses Cepat' : 'Quick Access'}
                  </p>

                  {/* Language switch */}
                  <button 
                    type="button"
                    onClick={() => {
                      setUiLanguage(uiLanguage === 'en' ? 'id' : 'en');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Globe size={14} className="text-slate-400" />
                      <span>{uiLanguage === 'id' ? 'Bahasa Indonesia' : 'English Language'}</span>
                    </div>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-black text-slate-500">
                      {uiLanguage.toUpperCaseCustom ? uiLanguage.toUpperCaseCustom() : uiLanguage.toUpperCase()}
                    </span>
                  </button>

                  {/* Theme Switch */}
                  <button 
                    type="button"
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
                    <span>{theme === 'dark' ? (uiLanguage === 'id' ? 'Mode Terang' : 'Light Theme') : (uiLanguage === 'id' ? 'Mode Gelap' : 'Dark Theme')}</span>
                  </button>
                </div>

                {/* Modals & Triggers */}
                <div className="space-y-0.5 pb-1.5 border-b border-slate-100 dark:border-white/5 mb-1">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowInfoModal(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center space-x-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Info size={14} className="text-slate-400" />
                    <span>{t.topbar_info_manual || (uiLanguage === 'id' ? 'Panduan Manual' : 'User Manual')}</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(true);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center space-x-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Settings size={14} className="text-slate-400" />
                    <span>{t.topbar_settings_api || (uiLanguage === 'id' ? 'Kunci API & Akses' : 'API License Keys')}</span>
                  </button>
                </div>

                {/* Sign Out Action */}
                <div className="px-1.5 pt-1 border-t border-slate-100 dark:border-white/5 mt-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                        setMenuOpen(false);
                        window.open('https://teer.id/johan3008', '_blank');
                    }}
                    className="w-full px-2.5 py-1.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl flex items-center space-x-2.5 text-xs font-black text-amber-600 dark:text-amber-400 transition-colors mb-1"
                  >
                    <Heart size={14} />
                    <span>{uiLanguage === 'id' ? 'Dukung (Donate)' : 'Support (Donate)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSignOut?.();
                    }}
                    className="w-full px-2.5 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl flex items-center space-x-2.5 text-xs font-black text-red-600 dark:text-red-400 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>{uiLanguage === 'id' ? 'Keluar Akun' : 'Sign Out Profile'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
