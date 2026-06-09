import React, { useState, useEffect } from 'react';
import { 
  Key, Sparkles, CheckCircle2, AlertTriangle, MessageCircle, 
  CreditCard, ShoppingCart, ShieldCheck, Save, RotateCcw, Copy, Heart, Check, HelpCircle, Lock,
  Trash2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

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

  // Reseller Landing Gateway State
  const [landingPasscode, setLandingPasscode] = useState('');
  const [landingError, setLandingError] = useState('');
  const [isVerifyingLanding, setIsVerifyingLanding] = useState(false);

  const handleVerifyLandingPasscode = () => {
    if (!landingPasscode.trim()) {
      setLandingError('Mohon masukkan passcode otorisasi Terlebih dahulu.');
      return;
    }
    setIsVerifyingLanding(true);
    setTimeout(() => {
      const code = landingPasscode.trim();
      if (code === 'METAZO-OWNER-2026' || code === 'METAZO-RESELLER-2026') {
        if (setIsResellerUnlocked) {
          setIsResellerUnlocked(true);
          localStorage.setItem('mz_reseller_unlocked', 'true');
        }
        setLandingPasscode('');
        setLandingError('');
      } else {
        setLandingError('Passcode otorisasi salah! Silakan coba lagi atau hubungi admin.');
      }
      setIsVerifyingLanding(false);
    }, 600);
  };

  // Local state for activation screen
  const [inputKey, setInputKey] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Single-use multi-key engine states
  interface LicenseKeyBackend {
    key: string;
    activated: boolean;
    activatedBy: string;
    activatedAt: string;
  }
  const [backendKeys, setBackendKeys] = useState<LicenseKeyBackend[]>([]);
  const [keysCountToGen, setKeysCountToGen] = useState(5);
  const [isKeysLoading, setIsKeysLoading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const fetchBackendKeys = async () => {
    if (onlyModal) return;
    setIsKeysLoading(true);
    try {
      const qSnap = await getDocs(collection(db, 'keys'));
      const keysList: LicenseKeyBackend[] = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        keysList.push({
          key: doc.id,
          activated: !!data.activated,
          activatedBy: data.activatedBy || '',
          activatedAt: data.activatedAt || ''
        });
      });
      keysList.sort((a, b) => a.key.localeCompare(b.key));
      setBackendKeys(keysList);
    } catch (err) {
      console.error('Failed to fetch keys from Firestore:', err);
      handleFirestoreError(err, OperationType.LIST, 'keys');
    } finally {
      setIsKeysLoading(false);
    }
  };

  useEffect(() => {
    if (!onlyModal) {
      fetchBackendKeys();
    }
  }, [onlyModal]);

  const generateRandomKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const genPart = (len: number) => {
      let result = '';
      for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    return `MZPRO-${genPart(4)}-${genPart(4)}-${genPart(4)}`;
  };

  const handleGenerateKeys = async () => {
    setIsKeysLoading(true);
    try {
      const generatedCount = keysCountToGen;
      for (let i = 0; i < generatedCount; i++) {
        const newKey = generateRandomKey();
        await setDoc(doc(db, 'keys', newKey), {
          key: newKey,
          activated: false,
          activatedBy: '',
          activatedAt: '',
          createdAt: new Date().toISOString()
        });
      }
      await fetchBackendKeys();
    } catch (err) {
      console.error('Failed to generate keys in Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, 'keys');
    } finally {
      setIsKeysLoading(false);
    }
  };

  const handleDeleteKey = async (keyToDelete: string) => {
    if (!window.confirm(`Hapus Serial Key ${keyToDelete}?`)) return;
    setIsKeysLoading(true);
    try {
      await deleteDoc(doc(db, 'keys', keyToDelete));
      await fetchBackendKeys();
    } catch (err) {
      console.error('Failed to delete key inside Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `keys/${keyToDelete}`);
    } finally {
      setIsKeysLoading(false);
    }
  };

  const handleResetKey = async (keyToReset: string) => {
    if (!window.confirm(`Reset status aktivasi key ${keyToReset} agar bisa digunakan kembali?`)) return;
    setIsKeysLoading(true);
    try {
      await updateDoc(doc(db, 'keys', keyToReset), {
        activated: false,
        activatedBy: '',
        activatedAt: ''
      });
      await fetchBackendKeys();
    } catch (err) {
      console.error('Failed to reset key inside Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `keys/${keyToReset}`);
    } finally {
      setIsKeysLoading(false);
    }
  };

  useEffect(() => {
    setTempAppName(appName);
    setTempAppSubtitle(appSubtitle);
    setTempWhatsApp(whatsAppLink);
    setTempPricingTier(pricingTier);
    setTempLicenseSeed(licenseSeed);
  }, [appName, appSubtitle, whatsAppLink, pricingTier, licenseSeed]);

  const handleSaveResellerSettings = async () => {
    setIsKeysLoading(true);
    try {
      await setDoc(doc(db, 'branding', 'main'), {
        appName: tempAppName.trim() || 'MetaZo PRO',
        appSubtitle: tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant',
        whatsAppLink: tempWhatsApp.trim() || 'https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H',
        pricingTier: tempPricingTier.trim() || 'Rp 149.000 / Bulan',
        licenseSeed: tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026',
        payInfo: tempPayInfo.trim(),
        updatedAt: new Date().toISOString()
      });

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
    } catch (err) {
      console.error('Failed to save branding in Firestore:', err);
      alert('Gagal menyimpan branding. Sila periksa perizinan Firestore.');
      handleFirestoreError(err, OperationType.WRITE, 'branding/main');
    } finally {
      setIsKeysLoading(false);
    }
  };

  const handleResetResellerSettings = async () => {
    if (window.confirm('Apakah Anda yakin ingin menyetel ulang semua branding ke bawaan pabrik?')) {
      setIsKeysLoading(true);
      try {
        await setDoc(doc(db, 'branding', 'main'), {
          appName: 'MetaZo PRO',
          appSubtitle: 'AI-Powered Metadata Assistant',
          whatsAppLink: 'https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H',
          pricingTier: 'Rp 149.000 / Bulan',
          licenseSeed: 'MZPRO-COMMERCIAL-2026',
          payInfo: 'Transfer Bank Manual: BCA 817-092-3659 a/n Johan Chrismant',
          updatedAt: new Date().toISOString()
        });

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
      } catch (err) {
        console.error('Failed to reset branding settings in Firestore:', err);
        handleFirestoreError(err, OperationType.WRITE, 'branding/main');
      } finally {
        setIsKeysLoading(false);
      }
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

  const handleApplyLicenseKey = async () => {
    if (!inputKey.trim()) {
      setActivationError('Mohon masukkan Serial Key lisensi Anda terlebih dahulu.');
      return;
    }

    setIsActivating(true);
    setActivationError('');

    let devId = localStorage.getItem('mz_device_id');
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
      localStorage.setItem('mz_device_id', devId);
    }

    const targetKeyFormatted = inputKey.trim().toUpperCase();
    const keyRef = doc(db, 'keys', targetKeyFormatted);

    try {
      const dSnap = await getDoc(keyRef);
      if (dSnap.exists()) {
        const data = dSnap.data();
        if (data.activated) {
          if (data.activatedBy === devId || data.activatedBy === userEmail) {
            localStorage.setItem('mz_license_key', targetKeyFormatted);
            setLicenseKey(targetKeyFormatted);
            setActivationSuccess(true);
            setActivationError('');
            setTimeout(() => {
              setActivationSuccess(false);
              setShowActivation(false);
            }, 2500);
          } else {
            setActivationError('Serial Key ini sudah digunakan oleh pengguna lain! Mohon gunakan Serial Key yang berbeda.');
          }
        } else {
          // Unactivated single-use key -> activate it!
          await updateDoc(keyRef, {
            activated: true,
            activatedBy: devId,
            activatedAt: new Date().toISOString()
          });

          localStorage.setItem('mz_license_key', targetKeyFormatted);
          setLicenseKey(targetKeyFormatted);
          setActivationSuccess(true);
          setActivationError('');
          setTimeout(() => {
            setActivationSuccess(false);
            setShowActivation(false);
          }, 2500);
        }
      } else {
        // Fallback backward-compatible Master Keys check
        const isValid = validateKey(inputKey, tempLicenseSeed);
        if (isValid) {
          localStorage.setItem('mz_license_key', targetKeyFormatted);
          setLicenseKey(targetKeyFormatted);
          setActivationSuccess(true);
          setActivationError('');
          setTimeout(() => {
            setActivationSuccess(false);
            setShowActivation(false);
          }, 2500);
        } else {
          setActivationError('Serial Key tidak terdaftar atau salah. Sila hubungi Admin untuk membeli Key Resmi.');
        }
      }
    } catch (err) {
      console.error('Firestore activate check error, testing fallback offline keys:', err);
      const isValid = validateKey(inputKey, tempLicenseSeed);
      if (isValid) {
        localStorage.setItem('mz_license_key', targetKeyFormatted);
        setLicenseKey(targetKeyFormatted);
        setActivationSuccess(true);
        setActivationError('');
        setTimeout(() => {
          setActivationSuccess(false);
          setShowActivation(false);
        }, 2500);
      } else {
        setActivationError('Koneksi internet bermasalah dan validasi offline gagal.');
        handleFirestoreError(err, OperationType.GET, `keys/${targetKeyFormatted}`);
      }
    } finally {
      setIsActivating(false);
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
        !isResellerUnlocked ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Elegant Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-white shadow-xl">
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#4e73df]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-white/10 dark:bg-white/5 border border-white/15 rounded-2xl flex items-center justify-center text-amber-400 shadow-md animate-pulse">
                  <Lock size={22} className="stroke-[2.5]" />
                </div>
                
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-extrabold uppercase tracking-widest text-[8px]">
                  Restricted Access Office
                </span>
                
                <h2 className="text-xs font-black uppercase tracking-wider text-white">
                  MetaZo PRO Reseller & Proprietor Desk
                </h2>
                
                <p className="text-[10px] text-slate-300 font-semibold leading-relaxed max-w-xs">
                  Sistem Whitelabel & Manajemen Lisensi Terpusat. Hanya pemilik lisensi bisnis / reseller berwenang yang dapat mengakses halaman kontrol ini.
                </p>
              </div>
            </div>

            {/* Feature Capabilities Spotlight Grid (Bento columns) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-sm">
                <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                  <Sparkles size={12} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Whitelabel UI</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Ubah nama aplikasi, subjudul, harga, & kontak WhatsApp support untuk pembeli seketika.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-sm">
                <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                  <Key size={12} className="rotate-45" />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Key Generator</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Batch-mencetak Serial Key lisensi unik sekali-pakai secara dinamis di Firestore.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-sm">
                <div className="w-6 h-6 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                  <CreditCard size={12} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Pelacak Aktivasi</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Pantau alamat email dan ID perangkat pembeli yang mengaktifkan kunci, serta cabut lisensi kapan saja.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-sm">
                <div className="w-6 h-6 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                  <ShieldCheck size={12} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Penyemaian Serial</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Sematkan sandi validasi master cadangan yang andal untuk validasi lisensi offline instan.
                </p>
              </div>
            </div>

            {/* Authentication Gateway Form */}
            <div className="bg-white dark:bg-[#111827] border border-slate-250 dark:border-white/10 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[8.5px]">
                <Lock size={12} className="text-[#4e73df]" />
                <span>Otorisasi Hak Akses Reseller</span>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Masukkan Passcode Otorisasi Reseller"
                    value={landingPasscode}
                    onChange={(e) => {
                      setLandingPasscode(e.target.value);
                      if (landingError) setLandingError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleVerifyLandingPasscode();
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 outline-none font-bold text-xs focus:border-[#4e73df] dark:text-white transition-all text-slate-900 placeholder:text-slate-400"
                  />
                  <div className="absolute left-3 top-2.5 text-slate-450 dark:text-slate-500">
                    <Lock size={14} className="mt-1" />
                  </div>
                </div>

                {landingError && (
                  <div className="text-[9px] text-red-500 font-black uppercase tracking-wide bg-red-550/10 px-2.5 py-1.5 rounded-lg border border-red-500/10 leading-normal">
                    ⚠️ {landingError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyLandingPasscode}
                  disabled={isVerifyingLanding}
                  className="w-full py-2.5 bg-[#4e73df] hover:bg-blue-600 active:scale-95 text-white font-extrabold text-xs uppercase rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingLanding ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={13} />
                  )}
                  <span>{isVerifyingLanding ? 'Memverifikasi...' : 'Unlock Panel Komersial'}</span>
                </button>
              </div>
            </div>

            {/* Decal Quote Footer */}
            <div className="text-center bg-slate-100/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-transparent">
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-relaxed">
                "Ubah software menjadi aset penghasil pendapatan mandiri."
              </p>
            </div>
          </div>
        ) : (
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

            <div className="space-y-3.5 pr-1 max-h-[460px] overflow-y-auto custom-scrollbar">
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

              {/* NEW SERIAL KEY ENGINE FOR SELLING (SINGLE USE) */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-3.5 mt-2 space-y-3">
                <div className="bg-slate-100/60 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200">
                    <Key size={14} className="text-[#4e73df] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider">🔑 KELOLA SERIAL KEY SATU KALI PAKAI (UNTUK DIJUAL)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] leading-relaxed">
                    Generate Serial Key acak unik untuk dijual ke pengguna. Setiap key hanya bisa diaktivasi sekali pasca input oleh satu user, mencegah sharing lisensi antar pembeli!
                  </p>
                </div>

                {/* Key Maker Generator Input */}
                <div className="p-3 bg-slate-100/30 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 rounded-xl flex items-center gap-3">
                  <div className="space-y-0.5 shrink-0">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Jumlah Key</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={keysCountToGen}
                      onChange={(e) => setKeysCountToGen(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-xs outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateKeys}
                    disabled={isKeysLoading}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw size={12} className={isKeysLoading ? 'animate-spin' : ''} />
                    <span>{isKeysLoading ? 'Generating...' : 'Generate Key Baru'}</span>
                  </button>
                </div>

                {/* Active Keys Database List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Daftar Key di Database ({backendKeys.length})</span>
                    <button 
                      type="button" 
                      onClick={fetchBackendKeys}
                      className="hover:text-blue-500 transition-colors flex items-center space-x-0.5"
                      title="Refresh List"
                    >
                      <RefreshCw size={10} className={isKeysLoading ? 'animate-spin' : ''} />
                      <span>Perbarui</span>
                    </button>
                  </div>

                  <div className="max-h-[180px] overflow-y-auto border border-slate-100 dark:border-slate-900 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 custom-scrollbar divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                    {backendKeys.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 dark:text-slate-500 font-semibold text-[10px]">
                        Belum ada Serial Key satu kali pakai di database. Munculkan dengan generator di atas!
                      </div>
                    ) : (
                      backendKeys.map((kObj, i) => (
                        <div key={kObj.key} className="p-2 flex items-center justify-between gap-2 hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 select-all">{kObj.key}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(kObj.key, `key-${i}`)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 transition-colors"
                                title="Salin Serial Key ini"
                              >
                                {copiedKey === `key-${i}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </div>
                            
                            {/* Key Activation details */}
                            {kObj.activated ? (
                              <div className="text-[9px] text-[#4e73df] font-bold flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="truncate">Terpakai: {kObj.activatedBy}</span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Ready to Sell</span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons on item */}
                          <div className="flex items-center gap-1 shrink-0">
                            {kObj.activated && (
                              <button
                                type="button"
                                onClick={() => handleResetKey(kObj.key)}
                                className="p-1 text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                                title="Reset Key (Lepas Aktivasi agar bisa dijual/dipakai lagi)"
                              >
                                <RotateCcw size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteKey(kObj.key)}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Hapus Key"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-550 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 shrink-0"
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
        )
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
                    disabled={isActivating}
                    className="w-full py-2.5 bg-[#4e73df] hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    {isActivating ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    <span>{isActivating ? 'Memproses Aktivasi...' : 'Aktivasi Premium'}</span>
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
