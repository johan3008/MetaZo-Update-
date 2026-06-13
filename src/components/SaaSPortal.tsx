import React, { useState, useEffect } from 'react';
import { 
  Key, Sparkles, CheckCircle2, AlertTriangle, MessageCircle, 
  CreditCard, ShoppingCart, ShieldCheck, Shield, Save, RotateCcw, Copy, Heart, Check, HelpCircle, Lock,
  Trash2, RefreshCw, Download, Mail, Send
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
  subDaysLeft?: number | null;
  t: any;
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
  trialDaysLeft,
  subDaysLeft = null,
  t
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

  // Email sending states
  const [activeEmailKey, setActiveEmailKey] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailCaption, setEmailCaption] = useState('Terima kasih telah berlangganan layanan PRO kami.');
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Single-use multi-key engine states
  interface LicenseKeyBackend {
    key: string;
    activated: boolean;
    activatedBy: string;
    activatedAt: string;
    duration?: string;
  }
  const [backendKeys, setBackendKeys] = useState<LicenseKeyBackend[]>([]);
  const [keysCountToGen, setKeysCountToGen] = useState(5);
  const [selectedDuration, setSelectedDuration] = useState<'30days' | 'unlimited'>('30days');
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
          activatedAt: data.activatedAt || '',
          duration: data.duration || 'unlimited'
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
          duration: selectedDuration,
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
    setIsKeysLoading(true);
    try {
      await deleteDoc(doc(db, 'keys', keyToDelete));
      await fetchBackendKeys();
      alert(`Key ${keyToDelete} berhasil dihapus.`);
    } catch (err) {
      console.error('Failed to delete key inside Firestore:', err);
      alert(`Gagal menghapus key: ${err}`);
      handleFirestoreError(err, OperationType.DELETE, `keys/${keyToDelete}`);
    } finally {
      setIsKeysLoading(false);
    }
  };

  const handleResetKey = async (keyToReset: string) => {
    setIsKeysLoading(true);
    try {
      await updateDoc(doc(db, 'keys', keyToReset), {
        activated: false,
        activatedBy: '',
        activatedAt: ''
      });
      await fetchBackendKeys();
      alert(`Key ${keyToReset} berhasil direset.`);
    } catch (err) {
      console.error('Failed to reset key inside Firestore:', err);
      alert(`Gagal mereset key: ${err}`);
      handleFirestoreError(err, OperationType.UPDATE, `keys/${keyToReset}`);
    } finally {
      setIsKeysLoading(false);
    }
  };

  const handleDownloadKey = (key: string) => {
    const element = document.createElement("a");
    const file = new Blob([`LICENSE KEY ${appName.toUpperCase()}\n\nSerial Key: ${key}\nTanggal Generate: ${new Date().toLocaleDateString()}\nStatus: Siap Pakai\n\nSimpan key ini untuk aktivasi premium aplikasi.`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `License_${key}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadAllKeys = () => {
    if (backendKeys.length === 0) return;
    const content = backendKeys.map(k => `${k.key}${k.activated ? ' (Used)' : ' (Ready)'}`).join('\n');
    const element = document.createElement("a");
    const file = new Blob([`DAFTAR SEMUA LICENSE KEY ${appName.toUpperCase()}\n\n${content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `All_Licenses_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSendToEmail = async (key: string) => {
    if (!emailAddress || !emailAddress.includes('@')) {
      alert('Mohon masukkan alamat email yang valid.');
      return;
    }

    setIsEmailSending(true);
    try {
      const response = await fetch('/api/send-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          licenseKey: key,
          appName: appName,
          caption: emailCaption
        })
      });

      if (response.ok) {
        alert(`Key berhasil dikirim ke ${emailAddress}`);
        setActiveEmailKey(null);
        setEmailAddress('');
        setEmailCaption('Terima kasih telah berlangganan layanan PRO kami.');
      } else {
        let errorMsg = 'Gagal mengirim email.';
        try {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Email send error:', err);
      alert(`Gagal mengirim email: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEmailSending(false);
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
      setActivationError(t.activation_error_empty);
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
            if (data.duration === '30days' && data.activatedAt) {
              const activatedTime = new Date(data.activatedAt).getTime();
              const nowTime = new Date().getTime();
              const elapsedMs = nowTime - activatedTime;
              const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
              if (elapsedDays > 30) {
                setActivationError(t.activation_error_expired);
                setIsActivating(false);
                return;
              }
            }
            localStorage.setItem('mz_license_key', targetKeyFormatted);
            setLicenseKey(targetKeyFormatted);
            setActivationSuccess(true);
            setActivationError('');
            setTimeout(() => {
              setActivationSuccess(false);
              setShowActivation(false);
            }, 2500);
          } else {
            setActivationError(t.activation_error_used);
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
          setActivationError(t.activation_error_invalid);
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
        setActivationError(t.activation_error_offline);
        handleFirestoreError(err, OperationType.GET, `keys/${targetKeyFormatted}`);
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleRemoveLicenseKey = () => {
    localStorage.removeItem('mz_license_key');
    // Fully return to trial mode by resetting the trial period
    localStorage.setItem('mz_trial_start', new Date().toISOString());
    setLicenseKey('');
    setInputKey('');
    setActivationError('');
    setShowCancelConfirm(false);
    alert("Lisensi telah dihapus. Aplikasi akan dimuat ulang.");
    window.location.reload(); // Force reload to ensure App state updates
  };

  const handleCopyText = (text: string, label: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          setCopiedKey(label);
          setTimeout(() => setCopiedKey(''), 2500);
        }).catch((err) => {
          console.warn('Clipboard API failed, using fallback', err);
          fallbackCopyText(text, label);
        });
      } else {
        fallbackCopyText(text, label);
      }
    } catch (e) {
      console.warn('Clipboard write failure, trying fallback', e);
      fallbackCopyText(text, label);
    }
  };

  const fallbackCopyText = (text: string, label: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Make it non-disruptive
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    
    // Check if there is active element to restore later
    const activeEl = document.activeElement as HTMLElement | null;
    
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
      const successful = document.execCommand("copy");
      if (successful) {
        setCopiedKey(label);
        setTimeout(() => setCopiedKey(''), 2500);
      } else {
        console.error("Fallback copy command was unsuccessful");
      }
    } catch (err) {
      console.error("Fallback copy failed completely", err);
    }
    
    document.body.removeChild(textArea);
    if (activeEl) {
      activeEl.focus();
    }
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

            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 pb-4">
              {/* BRANDING SETUP GRID */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 mb-4">
                <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 mb-3">
                  <Sparkles size={14} className="text-[#4e73df]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">A. Brand Identity Customization</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">App Name</label>
                    <input
                      type="text"
                      placeholder="Contoh: MetaZo PRO"
                      value={tempAppName}
                      onChange={(e) => setTempAppName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-bold text-xs focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Subtitle / Slogan</label>
                    <input
                      type="text"
                      placeholder="Contoh: AI-Powered Metadata Assistant"
                      value={tempAppSubtitle}
                      onChange={(e) => setTempAppSubtitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-medium text-xs focus:border-[#4e73df] focus:ring-1 focus:ring-[#4e73df] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* COMMERCE SETUP GRID */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 mb-4">
                <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 mb-3">
                  <ShoppingCart size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">B. Commerce & Purchase Info</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Pricing Text Display</label>
                    <input
                      type="text"
                      placeholder="Contoh: Rp 149.000 / Bulan"
                      value={tempPricingTier}
                      onChange={(e) => setTempPricingTier(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-medium text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Custom WhatsApp Link / Support</label>
                    <input
                      type="text"
                      placeholder="Contoh: https://wa.me/..."
                      value={tempWhatsApp}
                      onChange={(e) => setTempWhatsApp(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Payment / Order Transfer Instructions</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Transfer Bank BCA 123-xxxx a/n Nama Anda"
                      value={tempPayInfo}
                      onChange={(e) => setTempPayInfo(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-all line-clamp-3"
                    />
                  </div>
                </div>
              </div>

              {/* SECURITY SETUP GRID */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-amber-800/20 mb-4">
                <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 mb-3">
                  <Shield size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">C. Core Validation Settings</span>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Product Validation Serial Key (Passcode Seed)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: MZPRO-COMMERCIAL-2026"
                      value={tempLicenseSeed}
                      onChange={(e) => setTempLicenseSeed(e.target.value.toUpperCase())}
                      className="flex-1 bg-amber-500/5 dark:bg-amber-900/10 border border-amber-500/20 dark:border-amber-500/30 rounded-xl px-3 py-2 outline-none font-mono font-bold text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(tempLicenseSeed, 'seed')}
                      className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-xl transition-colors"
                      title="Salin Key Validasi"
                    >
                      {copiedKey === 'seed' ? <Check size={14} className="text-amber-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[8.5px] font-semibold text-slate-400 mt-1">
                    🚨 Pembeli harus memasukkan kode ini untuk mengaktivasi fitur premium secara offline/manual jika tidak memakai fitur single-use serial key.
                  </p>
                </div>
              </div>

              {/* NEW SERIAL KEY ENGINE FOR SELLING (SINGLE USE) */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-3">
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
                      className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-xs outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-0.5 min-w-[100px] flex-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Durasi</label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value as '30days' | 'unlimited')}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 font-bold text-xs outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="30days">30 Hari</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateKeys}
                    disabled={isKeysLoading}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 cursor-pointer shrink-0"
                  >
                    <RefreshCw size={12} className={isKeysLoading ? 'animate-spin' : ''} />
                    <span>{isKeysLoading ? 'Generating...' : 'Generate Key'}</span>
                  </button>
                </div>

                {/* Active Keys Database List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                       <span>Daftar Key di Database ({backendKeys.length})</span>
                       {backendKeys.length > 0 && (
                         <button 
                           type="button" 
                           onClick={handleDownloadAllKeys}
                           className="text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-0.5"
                           title="Download All as .txt"
                         >
                           <Download size={10} />
                           <span>Export</span>
                         </button>
                       )}
                    </div>
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
                        <React.Fragment key={kObj.key}>
                          <div className="p-2 flex items-center justify-between gap-2 hover:bg-slate-100/50 dark:hover:bg-slate-950/50 transition-colors">
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
                              <div className="text-[9px] text-[#4e73df] font-bold flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="truncate">Terpakai: {kObj.activatedBy}</span>
                                <span className="px-1.5 py-0.5 text-[7.5px] bg-blue-500/10 text-blue-600 dark:text-[#4e73df] rounded font-black uppercase tracking-wide">
                                  {kObj.duration === '30days' ? '30 Hari' : 'Unlimited'}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-emerald-500 font-bold flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Ready to Sell</span>
                                <span className="px-1.5 py-0.5 text-[7.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded font-black uppercase tracking-wide">
                                  {kObj.duration === '30days' ? '30 Hari' : 'Unlimited'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons on item */}
                          <div className="flex items-center gap-1 shrink-0">
                            {!kObj.activated && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadKey(kObj.key)}
                                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
                                  title="Unduh .txt"
                                >
                                  <Download size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeEmailKey === kObj.key) {
                                      setActiveEmailKey(null);
                                    } else {
                                      setActiveEmailKey(kObj.key);
                                      setEmailAddress('');
                                    }
                                  }}
                                  className={`p-1 rounded transition-colors ${activeEmailKey === kObj.key ? 'bg-indigo-500 text-white' : 'text-indigo-500 hover:bg-indigo-500/10'}`}
                                  title="Kirim ke Email"
                                >
                                  <Mail size={12} />
                                </button>
                              </>
                            )}
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
                        
                        {/* Inline Email Form */}
                        <AnimatePresence>
                          {activeEmailKey === kObj.key && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-2 pb-2 overflow-hidden"
                            >
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex gap-2 shadow-inner">
                                <input 
                                  type="email"
                                  placeholder="Input email penerima..."
                                  value={emailAddress}
                                  onChange={(e) => setEmailAddress(e.target.value)}
                                  className="flex-1 bg-transparent text-[10px] outline-none font-bold placeholder:text-slate-400"
                                  autoFocus
                                />
                              </div>
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 mt-1 shadow-inner">
                                <textarea 
                                  placeholder="Input caption/pesan..."
                                  value={emailCaption}
                                  onChange={(e) => setEmailCaption(e.target.value)}
                                  className="w-full bg-transparent text-[10px] outline-none font-medium h-12 resize-none placeholder:text-slate-400"
                                />
                              </div>
                              <div className="flex justify-end mt-2">
                                <button
                                  type="button"
                                  onClick={() => handleSendToEmail(kObj.key)}
                                  disabled={isEmailSending}
                                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[9px] font-black uppercase rounded-lg flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all"
                                >
                                  {isEmailSending ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
                                  {isEmailSending ? 'Menyiapkan...' : 'Kirim Sekarang'}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
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
                  {trialDaysLeft !== undefined && trialDaysLeft <= 0 && !isLicensed ? t.activation_modal_title_trial_expired : t.activation_modal_title_normal}
                </h3>
                <p className="text-xs text-slate-400 uppercase font-extrabold tracking-widest">
                  {t.activation_modal_unlock_premium} {appName}
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
                      <h4 className="font-extrabold uppercase text-xs tracking-wider text-red-500">{t.activation_confirm_stop_title}</h4>
                      <p className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 leading-normal">
                        {t.activation_confirm_stop_desc}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRemoveLicenseKey}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          {t.activation_btn_stop_yes}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(false)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {t.activation_btn_stop_no}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <CheckCircle2 size={32} className="text-emerald-500 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-extrabold uppercase text-xs tracking-wider text-emerald-500">{t.activation_active_status}</h4>
                        <p className="text-[10px] font-semibold text-slate-455 mt-1">
                          {t.activation_key_registered} <code className="font-mono bg-emerald-500/5 text-emerald-600 px-1 border border-emerald-500/10 dark:text-emerald-400">{licenseKey}</code>
                        </p>
                        {subDaysLeft !== undefined && subDaysLeft !== null && (
                          <div className="mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] py-1 px-1.5 rounded-lg flex items-center justify-center space-x-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>{t.activation_subscription_left} {Math.ceil(subDaysLeft)} {t.activation_days_left}</span>
                          </div>
                        )}
                        <p className="text-[9px] font-bold text-slate-400 mt-2">
                          {t.activation_commercial_notice}
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full py-2.5 bg-red-650/10 hover:bg-red-600 text-red-600 hover:text-white font-extrabold text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-red-500/20 shadow-sm flex items-center justify-center space-x-1.5"
                      >
                        <span>{t.activation_btn_unsubscribe}</span>
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
                        <span>{t.activation_trial_expired_hero}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-450 font-semibold text-[10px] leading-relaxed">
                        {t.activation_trial_expired_desc}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-400/5 border border-amber-500/20 rounded-2xl p-4 text-center space-y-1.5">
                      <div className="flex items-center justify-center text-amber-500 space-x-1.5 font-extrabold text-[11px] uppercase tracking-wider">
                        <AlertTriangle size={13} />
                        <span>{t.activation_trial_active_hero} ({trialDaysLeft !== undefined ? Math.ceil(trialDaysLeft) : 7} {t.activation_trial_active_days})</span>
                      </div>
                      <p className="text-slate-450 dark:text-slate-400 font-semibold text-[10px] leading-relaxed">
                        {t.activation_trial_active_desc}
                      </p>
                    </div>
                  )}

                  {/* Subscription Plans */}
                  <div className="space-y-2 mt-4 mb-4">
                    <label className="text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px] block mb-2">{t.language === 'Bahasa' ? 'Pilih Paket' : 'Choose Plan'}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Free Trial */}
                      <div className="border border-slate-200 dark:border-white/10 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between transition-all">
                        <div className="space-y-1 text-center">
                          <h5 className="font-extrabold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-200">{t.language === 'Bahasa' ? 'Uji Coba' : 'Free Trial'}</h5>
                          <p className="text-slate-600 dark:text-slate-400 font-black text-xs">Gratis</p>
                          <ul className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 space-y-1 mt-2 text-left">
                            <li className="flex items-start space-x-1"><Check size={8} className="text-slate-400 mt-0.5 shrink-0" /><span>{t.language === 'Bahasa' ? 'Akses 7 Hari' : '7 Days Access'}</span></li>
                            <li className="flex items-start space-x-1"><Check size={8} className="text-slate-400 mt-0.5 shrink-0" /><span>{t.language === 'Bahasa' ? 'Hanya Metadata Gen, Prompt Image, Calendar Gen' : 'Metadata Gen, Prompt Image, Calendar Gen only'}</span></li>
                            <li className="flex items-start space-x-1"><Check size={8} className="text-slate-400 mt-0.5 shrink-0" /><span>{t.language === 'Bahasa' ? 'Batas 30 Generasi / Hari' : '30 Generations / Day Limit'}</span></li>
                          </ul>
                        </div>
                      </div>
                      {/* 30 Days Plan */}
                      <div className="border border-[#4e73df] rounded-xl p-3 bg-blue-500/5 flex flex-col justify-between relative shadow-sm hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2">
                          <span className="bg-[#4e73df] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">Pro</span>
                        </div>
                        <div className="space-y-1 text-center">
                          <h5 className="font-extrabold text-[11px] uppercase tracking-wide text-[#4e73df] dark:text-blue-400">30 Days Plan</h5>
                          <p className="text-[#4e73df] dark:text-blue-300 font-black text-xs">Rp 50.000</p>
                          <ul className="text-[9px] font-bold text-slate-600 dark:text-slate-300 space-y-1 mt-2 text-left">
                            <li className="flex items-center space-x-1"><Check size={8} className="text-[#4e73df]" /><span>{t.language === 'Bahasa' ? 'Akses 30 Hari' : '30 Days Access'}</span></li>
                            <li className="flex items-center space-x-1"><Check size={8} className="text-[#4e73df]" /><span>{t.language === 'Bahasa' ? 'Tanpa Batas Harian' : 'Unlimited Limits'}</span></li>
                            <li className="flex items-center space-x-1"><Check size={8} className="text-[#4e73df]" /><span>Premium AI Engine</span></li>
                          </ul>
                        </div>
                      </div>
                      {/* Unlimited Plan */}
                      <div className="border border-amber-500 rounded-xl p-3 bg-amber-500/5 flex flex-col justify-between relative shadow-sm hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2">
                          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">Best</span>
                        </div>
                        <div className="space-y-1 text-center">
                          <h5 className="font-extrabold text-[11px] uppercase tracking-wide text-amber-600 dark:text-amber-400">Unlimited</h5>
                          <p className="text-amber-600 dark:text-amber-400 font-black text-xs">Rp 99.000</p>
                          <ul className="text-[9px] font-bold text-slate-600 dark:text-slate-300 space-y-1 mt-2 text-left">
                            <li className="flex items-center space-x-1"><Check size={8} className="text-amber-500" /><span>{t.language === 'Bahasa' ? 'Akses Selamanya' : 'Lifetime Access'}</span></li>
                            <li className="flex items-center space-x-1"><Check size={8} className="text-amber-500" /><span>{t.language === 'Bahasa' ? 'Tanpa Batas' : 'Unlimited Limits'}</span></li>
                            <li className="flex items-center space-x-1"><Check size={8} className="text-amber-500" /><span>Prioritas Support</span></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                        <ShoppingCart size={12} className="text-emerald-500" />
                        <span>{t.language === 'Bahasa' ? 'Beli lisensi melalui WhatsApp:' : 'Buy license via WhatsApp:'}</span>
                      </div>
                      <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all shadow-sm">
                        <MessageCircle size={10} />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {/* Activation input */}
                  <div className="space-y-1.5 mt-2">
                    <label className="text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px] block">{t.activation_input_label}</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t.activation_input_placeholder}
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
                        {t.activation_success_waiting}
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
                    <span>{isActivating ? t.activation_btn_process : t.activation_btn_activate}</span>
                  </button>

                  {/* Need support details */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                    <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                      {t.activation_no_license_title}
                    </h5>
                    
                    <div className="p-3 bg-blue-500/5 hover:bg-blue-500/8 border border-blue-500/10 rounded-2xl flex flex-col items-center text-center space-y-1 transition-all">
                      <ShoppingCart size={16} className="text-[#4e73df] animate-bounce" />
                      <span className="text-[11px] font-black text-[#4e73df] uppercase tracking-wider">{t.activation_personal_activation}</span>
                      <span className="text-[10px] font-bold text-slate-400">{t.activation_license_price} <strong className="text-slate-700 dark:text-white">{pricingTier}</strong></span>
                      <span className="text-[9px] font-semibold text-slate-400 max-w-xs">{tempPayInfo}</span>
                    </div>

                    <a
                      href={`${whatsAppLink}?text=Halo%20Admin%2C%20saya%20tertarik%20membeli%20lisensi%20aktif%20SaaS%20${encodeURIComponent(appName)}%20premium.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10.5px] rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/10"
                    >
                      <MessageCircle size={14} className="animate-pulse" />
                      <span>{t.activation_buy_whatsapp}</span>
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
