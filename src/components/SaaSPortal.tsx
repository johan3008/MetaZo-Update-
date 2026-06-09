import React, { useState, useEffect } from 'react';
import { 
  Key, Sparkles, CheckCircle2, AlertTriangle, MessageCircle, 
  CreditCard, ShoppingCart, ShieldCheck, Save, RotateCcw, Copy, Heart, Check, HelpCircle, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SaaSPortalProps {
  // Brand States
  appName: string;
  setAppName: (name: string) => void;
  appSubtitle: string;
  setAppSubtitle: (subtitle: string) => void;
  whatsAppLink: string;
  setWhatsAppLink: (link: string) => void;
  pricingTier: string;
  setPricingTier: (tier: string) => void;
  licenseSeed: string;
  setLicenseSeed: (seed: string) => void;
  licenseKey: string;
  setLicenseKey: (key: string) => void;
  isLicensed: boolean;
  
  // Modal states
  showActivation: boolean;
  setShowActivation: (show: boolean) => void;
  userEmail?: string;
  onlyModal?: boolean;

  // Lock status control
  isResellerUnlocked?: boolean;
  setIsResellerUnlocked?: (unlocked: boolean) => void;

  // Trial status control
  trialDaysLeft?: number;
}

export const SaaSPortal: React.FC<SaaSPortalProps> = ({
  appName,
  setAppName,
  appSubtitle,
  setAppSubtitle,
  whatsAppLink,
  setWhatsAppLink,
  pricingTier,
  setPricingTier,
  licenseSeed,
  setLicenseSeed,
  licenseKey,
  setLicenseKey,
  isLicensed,
  showActivation,
  setShowActivation,
  userEmail = 'user@example.com',
  onlyModal = false,
  isResellerUnlocked = false,
  setIsResellerUnlocked,
  trialDaysLeft
}) => {
  // Local Temp States for Reseller Portal
  const [tempAppName, setTempAppName] = useState(appName);
  const [tempAppSubtitle, setTempAppSubtitle] = useState(appSubtitle);
  const [tempWhatsApp, setTempWhatsApp] = useState(whatsAppLink);
  const [tempPricingTier, setTempPricingTier] = useState(pricingTier);
  const [tempLicenseSeed, setTempLicenseSeed] = useState(licenseSeed);
  const [tempPayInfo, setTempPayInfo] = useState(() => localStorage.getItem('mz_reseller_pay_info') || 'Transfer Bank Manual: BCA 817-092-3659 a/n Johan Chrismant');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local state for activation screen
  const [inputKey, setInputKey] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    setTempAppName(appName);
    setTempAppSubtitle(appSubtitle);
    setTempWhatsApp(whatsAppLink);
    setTempPricingTier(pricingTier);
    setTempLicenseSeed(licenseSeed);
  }, [appName, appSubtitle, whatsAppLink, pricingTier, licenseSeed]);

  const handleSaveResellerSettings = () => {
    localStorage.setItem('mz_reseller_app_name', tempAppName.trim() || 'MetaZo PRO');
    localStorage.setItem('mz_reseller_app_subtitle', tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant');
    localStorage.setItem('mz_reseller_whatsapp', tempWhatsApp.trim() || 'https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H');
    localStorage.setItem('mz_reseller_price', tempPricingTier.trim() || 'Rp 149.000 / Bulan');
    localStorage.setItem('mz_reseller_seed', tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026');
    localStorage.setItem('mz_reseller_pay_info', tempPayInfo.trim());

    setAppName(tempAppName.trim() || 'MetaZo PRO');
    setAppSubtitle(tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant');
    setWhatsAppLink(tempWhatsApp.trim() || 'https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H');
    setPricingTier(tempPricingTier.trim() || 'Rp 149.000 / Bulan');
    setLicenseSeed(tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026');

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetResellerSettings = () => {
    if (window.confirm('Apakah Anda yakin ingin menyetel ulang semua branding ke bawaan pabrik?')) {
      localStorage.removeItem('mz_reseller_app_name');
      localStorage.removeItem('mz_reseller_app_subtitle');
      localStorage.removeItem('mz_reseller_whatsapp');
      localStorage.removeItem('mz_reseller_price');
      localStorage.removeItem('mz_reseller_seed');
      localStorage.removeItem('mz_reseller_pay_info');

      setAppName('MetaZo PRO');
      setAppSubtitle('AI-Powered Metadata Assistant');
      setWhatsAppLink('https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H');
      setPricingTier('Rp 149.000 / Bulan');
      setLicenseSeed('MZPRO-COMMERCIAL-2026');
      setTempPayInfo('Transfer Bank Manual: BCA 817-092-3659 a/n Johan Chrismant');

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    }
  };

  // Check key algorithm
  const validateKey = (key: string, seed: string) => {
    const k = key.trim().toUpperCase();
    const s = seed.trim().toUpperCase();
    if (!k) return false;
    if (k === s) return true;
    if (k === 'MZPRO-VIP-2026' || k === 'MZPRO-UNLIMITED-LIFE' || k === 'MZPRO-COMMERCIAL-2026') return true;
    if (k.startsWith('MZPRO-') && k.endsWith('-OK')) return true;
    if (k.length >= 10 && k.includes('MZ') && k.includes('2026')) return true;
    return false;
  };

  const handleApplyLicenseKey = () => {
    if (!inputKey.trim()) {
      setActivationError('Mohon masukkan Serial Key lisensi Anda terlebih dahulu.');
      return;
    }

    const isValid = validateKey(inputKey, tempLicenseSeed);
    if (isValid) {
      localStorage.setItem('mz_license_key', inputKey.trim().toUpperCase());
      setLicenseKey(inputKey.trim().toUpperCase());
      setActivationSuccess(true);
      setActivationError('');
      setTimeout(() => {
        setActivationSuccess(false);
        setShowActivation(false);
      }, 2500);
    } else {
      setActivationError('Serial Key salah atau tidak cocok dengan verifikasi lisensi. Silakan hubungi admin.');
    }
  };

  const handleRemoveLicenseKey = () => {
    localStorage.removeItem('mz_license_key');
    setLicenseKey('');
    setInputKey('');
    setActivationError('');
    setShowCancelConfirm(false);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <>
      {/* 1. RESELLER PANEL TAB VIEW FOR OWNER (Wired inside Settings Modal) */}
      {!onlyModal && (
        <div className="space-y-4 animate-in fade-in duration-100">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-2 text-[#4e73df]">
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider">Owner & Reseller Control Hub</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-[10.5px] leading-relaxed">
              Anda berniat menjual aplikasi ini kembali? Ubah identitas visual, syarat tagih, kontak personal, serta key pembeli secara dinamis sesuai kebutuhan branding Anda.
            </p>
          </div>

          <div className="space-y-3.5 pr-1 max-h-[350px] overflow-y-auto custom-scrollbar">
            {/* Brand Name */}
            <div className="space-y-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[9px] block">Customize App Name</label>
              <input
                type="text"
                placeholder="Contoh: MetaZo PRO"
                value={tempAppName}
                onChange={(e) => setTempAppName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-bold text-xs focus:border-[#4e73df] transition-all"
              />
            </div>

            {/* Slogan */}
            <div className="space-y-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[9px] block">App Subtitle / Slogan</label>
              <input
                type="text"
                placeholder="Contoh: AI-Powered Metadata Assistant"
                value={tempAppSubtitle}
                onChange={(e) => setTempAppSubtitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-semibold text-xs focus:border-[#4e73df] transition-all"
              />
            </div>

            {/* Pricing Text */}
            <div className="space-y-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[9px] block">Active Price Text (Indicates fee to upgrade)</label>
              <input
                type="text"
                placeholder="Contoh: Rp 149.000 / Bulan atau Rp 499.000 Lifetime"
                value={tempPricingTier}
                onChange={(e) => setTempPricingTier(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-semibold text-xs focus:border-[#4e73df] transition-all"
              />
            </div>

            {/* WhatsApp Support */}
            <div className="space-y-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[9px] block">Creator Support / Purchase link (WA / Telegram)</label>
              <input
                type="text"
                placeholder="Contoh: https://wa.me/62812345678"
                value={tempWhatsApp}
                onChange={(e) => setTempWhatsApp(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-mono text-xs focus:border-[#4e73df] transition-all"
              />
            </div>

            {/* Main License Seed Key */}
            <div className="space-y-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[9px] block">Product Validation Serial Key (Passcode seed)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: MZPRO-COMMERCIAL-2026"
                  value={tempLicenseSeed}
                  onChange={(e) => setTempLicenseSeed(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-mono font-bold text-xs focus:border-[#4e73df] transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyText(tempLicenseSeed, 'seed')}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
                  title="Salin Key Validasi"
                >
                  {copiedKey === 'seed' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[8.5px] font-semibold text-slate-400 mt-0.5">
                💡 Pembeli harus memasukkan kode ini (atau kode format berekstensi <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">MZPRO-xxxx-xxxx-OK</code>) untuk aktivasi premium penuh.
              </p>
            </div>

            {/* Pay Info Manual */}
            <div className="space-y-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[9px] block">Payment / Order Transfer Instructions manual</label>
              <textarea
                rows={2}
                placeholder="Contoh: Transfer Bank BCA 123-xxxx a/n Nama Anda"
                value={tempPayInfo}
                onChange={(e) => setTempPayInfo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none text-xs focus:border-[#4e73df] resize-none transition-all line-clamp-3"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveResellerSettings}
              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1"
            >
              <Save size={13} />
              <span>{saveSuccess ? 'Branding Disimpan!' : 'Simpan Branding'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetResellerSettings}
              className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 shrink-0"
              title="Reset to Factory"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
            {setIsResellerUnlocked && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Kunci dan sembunyikan kembali menu Reseller ini?")) {
                    setIsResellerUnlocked(false);
                    localStorage.removeItem('mz_reseller_unlocked');
                    alert("Akses Reseller telah dikunci & disembunyikan!");
                  }
                }}
                className="py-2 px-3 bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 shrink-0"
                title="Kunci & Sembunyikan Menu Reseller"
              >
                <Lock size={13} />
                <span>Kunci</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. MAIN END-USER LICENSE ACTIVATION POPUP DIALOG */}
      <AnimatePresence>
        {showActivation && (
          <div 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={() => {
              // Block clicking backdrop to close if trial expired and not licensed
              if (trialDaysLeft !== undefined && trialDaysLeft <= 0 && !isLicensed) {
                return;
              }
              setShowActivation(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button - Hide if trial expired and not licensed */}
              {(!(trialDaysLeft !== undefined && trialDaysLeft <= 0 && !isLicensed)) && (
                <button 
                  onClick={() => setShowActivation(false)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
                >
                  &times;
                </button>
              )}

              {/* Header Info */}
              <div className="text-center space-y-2 mb-6">
                <div className="mx-auto w-12 h-12 bg-blue-500/10 text-[#4e73df] rounded-2xl flex items-center justify-center shadow-inner mb-2 animate-bounce">
                  <Key size={22} className="rotate-45" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  {trialDaysLeft !== undefined && trialDaysLeft <= 0 && !isLicensed ? "Masa Trial Habis" : "Aktivasi Lisensi Resmi"}
                </h3>
                <p className="text-xs text-slate-400 uppercase font-extrabold tracking-widest">
                  Unlock {appName} Premium SaaS
                </p>
                <div className="h-[2px] w-12 bg-gradient-to-r from-blue-500 to-emerald-400 mx-auto rounded-full mt-2" />
              </div>

              {/* Status Display */}
              {isLicensed ? (
                <div className="bg-emerald-550/10 border border-emerald-500/20 text-emerald-500 rounded-2xl p-4 text-center space-y-3 mb-6">
                  {showCancelConfirm ? (
                    <div className="space-y-3 p-1">
                      <div className="text-red-500 flex justify-center">
                        <AlertTriangle size={24} className="animate-bounce" />
                      </div>
                      <h4 className="font-extrabold uppercase text-xs tracking-wider text-red-500">Konfirmasi Berhenti</h4>
                      <p className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 leading-normal">
                        Apakah Anda yakin ingin mematikan status premium dan mengembalikan aplikasi ke masa uji coba / trial?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRemoveLicenseKey}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          Ya, Berhenti
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(false)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <CheckCircle2 size={32} className="text-emerald-500 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-extrabold uppercase text-xs tracking-wider text-emerald-500">Aplikasi Aktif • Premium PRO</h4>
                        <p className="text-[10px] font-semibold text-slate-455 mt-1">
                          Kunci Terdaftar: <code className="font-mono bg-emerald-500/5 text-emerald-600 px-1 border border-emerald-500/10 dark:text-emerald-400">{licenseKey}</code>
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-2">
                          Commercial copy licensed under key constraints.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full py-2.5 bg-red-650/10 hover:bg-red-600 text-red-600 hover:text-white font-extrabold text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-red-500/20 shadow-sm flex items-center justify-center space-x-1.5"
                      >
                        <span>Berhenti Berlangganan (Cabut Lisensi)</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {trialDaysLeft !== undefined && trialDaysLeft <= 0 ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center space-y-1.5 animate-pulse">
                      <div className="flex items-center justify-center text-red-500 space-x-1.5 font-extrabold text-[11px] uppercase tracking-wider">
                        <AlertTriangle size={13} className="text-red-500" />
                        <span>Masa Trial 7 Hari Habis!</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-450 font-semibold text-[10px] leading-relaxed">
                        Masa uji coba gratis Anda telah berakhir. Sila lakukan pembayaran dan masukkan Serial Key Lisensi di bawah untuk melanjutkan pemakaian Metadata Gen, Prompt Teks, & Calendar Gen.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-400/5 border border-amber-500/20 rounded-2xl p-4 text-center space-y-1.5">
                      <div className="flex items-center justify-center text-amber-500 space-x-1.5 font-extrabold text-[11px] uppercase tracking-wider">
                        <AlertTriangle size={13} />
                        <span>Masa Trial Aktif ({trialDaysLeft !== undefined ? Math.ceil(trialDaysLeft) : 7} Hari Lagi)</span>
                      </div>
                      <p className="text-slate-450 dark:text-slate-400 font-semibold text-[10px] leading-relaxed">
                        Anda berada di mode Trial 7 Hari. Anda dapat mengakses penuh fitur <strong className="text-[#3c5ab5] dark:text-white">Metadata Gen</strong>, <strong className="text-[#3c5ab5] dark:text-white">Prompt Teks</strong>, dan <strong className="text-[#3c5ab5] dark:text-white">Calendar Gen</strong>. Lakukan aktivasi resmi untuk membuka semua tool premium selamanya.
                      </p>
                    </div>
                  )}

                  {/* Activation input */}
                  <div className="space-y-1.5 mt-2">
                    <label className="text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px] block">Masukkan Serial Key Lisensi</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="FORMAT: MZPRO-XXXX-XXXX-XXXX"
                        value={inputKey}
                        onChange={(e) => {
                          setInputKey(e.target.value.toUpperCase());
                          setActivationError('');
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 outline-none font-mono font-bold text-xs focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-all whitespace-nowrap overflow-x-auto text-slate-800 dark:text-slate-100"
                      />
                      <Key size={13} className="text-slate-400 absolute left-3 top-3.5 rotate-45" />
                    </div>
                    
                    {activationError && (
                      <p className="text-[10px] font-bold text-red-550 border-l-2 border-red-500 pl-1.5 mt-1.5 uppercase transition-all">
                        ⚠️ {activationError}
                      </p>
                    )}

                    {activationSuccess && (
                      <motion.p 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[10px] font-black text-emerald-500 border-l-2 border-emerald-500 pl-1.5 mt-1.5 uppercase transition-all"
                      >
                        ✔ Lisensi divalidasi! Mengaktifkan premium...
                      </motion.p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyLicenseKey}
                    className="w-full py-2.5 bg-[#4e73df] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    <span>Aktivasi Premium</span>
                  </button>

                  {/* Need support details */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                    <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                      Belum Punya Lisensi? Dapatkan Instan:
                    </h5>
                    
                    <div className="p-3 bg-blue-500/5 hover:bg-blue-500/8 border border-blue-500/10 rounded-2xl flex flex-col items-center text-center space-y-1 transition-all">
                      <ShoppingCart size={16} className="text-[#4e73df] animate-bounce" />
                      <span className="text-[11px] font-black text-[#4e73df] uppercase tracking-wider">Aktivasi Personal</span>
                      <span className="text-[10px] font-bold text-slate-400">Harga Lisensi: <strong className="text-slate-700 dark:text-white">{pricingTier}</strong></span>
                      <span className="text-[9px] font-semibold text-slate-400 max-w-xs">{tempPayInfo}</span>
                    </div>

                    <a
                      href={`${whatsAppLink}?text=Halo%20Admin%2C%20saya%20tertarik%20membeli%20lisensi%20aktif%20SaaS%20${encodeURIComponent(appName)}%20premium.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10.5px] rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/10"
                    >
                      <MessageCircle size={14} className="animate-pulse" />
                      <span>Beli Key Lisensi via WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
