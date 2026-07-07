import React, { useState, useEffect } from 'react';
import { getDailyLimit } from '../../constants';
import { 
  Key, Sparkles, CheckCircle2, AlertTriangle, MessageCircle, 
  CreditCard, ShoppingCart, ShieldCheck, Shield, Save, RotateCcw, Copy, Heart, Check, HelpCircle, Lock,
  Trash2, RefreshCw, Download, Mail, Send, Search, Plus, ListFilter, Gift, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, doc, getDoc, getDocs, collection, setDoc, deleteDoc, updateDoc, onSnapshot } from '../supabase';

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
  userId?: string;

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
  userId,
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
  const [tempPayInfo, setTempPayInfo] = useState(() => {
    const saved = localStorage.getItem('mz_reseller_pay_info');
    if (saved && saved.includes('BCA 817')) {
      const newVal = 'Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom';
      localStorage.setItem('mz_reseller_pay_info', newVal);
      return newVal;
    }
    return saved || 'Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom';
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dynamic Subscription Pricing State Definitions
  const [price30Days, setPrice30Days] = useState(() => localStorage.getItem('mz_price_30_days') || 'Rp 50.000');
  const [price30DaysUSD, setPrice30DaysUSD] = useState(() => localStorage.getItem('mz_price_30_days_usd') || '$2');
  const [priceUnlimited, setPriceUnlimited] = useState(() => localStorage.getItem('mz_price_unlimited') || 'Rp 250.000');
  const [priceUnlimitedUSD, setPriceUnlimitedUSD] = useState(() => localStorage.getItem('mz_price_unlimited_usd') || '$14');
  
  const [tempPrice30Days, setTempPrice30Days] = useState(() => localStorage.getItem('mz_price_30_days') || 'Rp 50.000');
  const [tempPrice30DaysUSD, setTempPrice30DaysUSD] = useState(() => localStorage.getItem('mz_price_30_days_usd') || '$2');
  const [tempPriceUnlimited, setTempPriceUnlimited] = useState(() => localStorage.getItem('mz_price_unlimited') || 'Rp 250.000');
  const [tempPriceUnlimitedUSD, setTempPriceUnlimitedUSD] = useState(() => localStorage.getItem('mz_price_unlimited_usd') || '$14');

  // Pakasir Configuration States
  const [pakasirProject, setPakasirProject] = useState(() => import.meta.env.VITE_PAKASIR_PROJECT_SLUG || localStorage.getItem('mz_pakasir_project') || '');
  const [pakasirApiKey, setPakasirApiKey] = useState(() => import.meta.env.VITE_PAKASIR_API_KEY || localStorage.getItem('mz_pakasir_apikey') || '');
  const [tempPakasirProject, setTempPakasirProject] = useState(() => import.meta.env.VITE_PAKASIR_PROJECT_SLUG || localStorage.getItem('mz_pakasir_project') || '');
  const [tempPakasirApiKey, setTempPakasirApiKey] = useState(() => import.meta.env.VITE_PAKASIR_API_KEY || localStorage.getItem('mz_pakasir_apikey') || '');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [checkoutDataUrl, setCheckoutDataUrl] = useState('');
  const [checkoutOrderId, setCheckoutOrderId] = useState('');
  const [checkoutAmount, setCheckoutAmount] = useState(0);
  const [checkoutPlan, setCheckoutPlan] = useState('');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Promo Code States
  interface PromoCode {
    id: string;
    code: string;
    type: 'free_premium' | 'discount';
    value: number;
    maxUses: number;
    usedCount: number;
    description: string;
    createdAt?: string;
    startDate?: string;
    endDate?: string;
  }
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [isPromosLoading, setIsPromosLoading] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'free_premium' | 'discount'>('free_premium');
  const [newPromoValue, setNewPromoValue] = useState(30);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(100);
  const [newPromoDesc, setNewPromoDesc] = useState('');
  const [newPromoStartDate, setNewPromoStartDate] = useState('');
  const [newPromoEndDate, setNewPromoEndDate] = useState('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('');
  const [promoErrorMsg, setPromoErrorMsg] = useState('');

  // Applied User Promo Code States
  const [appliedPromoInput, setAppliedPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoApplySuccess, setPromoApplySuccess] = useState('');
  const [promoApplyError, setPromoApplyError] = useState('');

  const [activePromoState, setActivePromoState] = useState<PromoCode | null>(null);
  const activePromo = activePromoState;
  const setActivePromo = setActivePromoState;

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
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(() => {
    return localStorage.getItem('last_firestore_quota_error') === new Date().toDateString();
  });

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
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'used'>('ready');

  const filteredKeys = backendKeys.filter(k => {
    if (filterStatus === 'ready') return !k.activated;
    if (filterStatus === 'used') return k.activated;
    return true;
  });

  // === ADMIN ACCOUNT CONFIG ===
  const ADMIN_EMAILS = ['johanchrismant4@gmail.com'];
  const isAdminAccount = (userEmail ? ADMIN_EMAILS.includes(userEmail) : false) || (userId && import.meta.env.VITE_ADMIN_UID && userId === import.meta.env.VITE_ADMIN_UID);
  const showResellerHub = isResellerUnlocked || isAdminAccount;
  const [portalTab, setPortalTab] = useState<'branding' | 'keys' | 'promo' | 'audit'>('branding');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  // ============================

  useEffect(() => {
    const handlePayInfo = (e: any) => setTempPayInfo(e.detail);
    window.addEventListener('mz_pay_info_updated', handlePayInfo);
    return () => window.removeEventListener('mz_pay_info_updated', handlePayInfo);
  }, []);

  const fetchBackendKeys = async () => {
    if (onlyModal) return;
    setIsKeysLoading(true);
    try {
      const qSnap = await getDocs(collection(db, 'keys'));
      const keysList: LicenseKeyBackend[] = [];
      qSnap.forEach((doc) => {
        let activatedBy = doc.data().activatedBy || '';
        const firstActivatedBy = doc.data().firstActivatedBy || '';
        let ownerId = firstActivatedBy || activatedBy;
        if (userId && userEmail && ownerId === userId) {
           activatedBy = userEmail;
           // Automatically heal the database for this user
           updateDoc(doc.ref, { activatedBy: userEmail, firstActivatedBy: userEmail }).catch(()=>{});
        }
        const data = doc.data();
        keysList.push({
          key: doc.id,
          activated: !!data.activated,
          activatedBy: activatedBy || '',
          activatedAt: data.activatedAt || '',
          duration: data.duration || 'unlimited'
        });
      });
      keysList.sort((a, b) => a.key.localeCompare(b.key));
      setBackendKeys(keysList);
      localStorage.setItem('mz_backend_keys_cache', JSON.stringify(keysList));
    } catch (err: any) {
      const errMsg = err?.message || (err && typeof err === 'object' && 'message' in err ? String((err as any).message) : '') || String(err);
      const errCode = (err && typeof err === 'object' && 'code' in err ? String((err as any).code) : '');
      const isPermissionErr = errMsg.toLowerCase().includes('permission') || 
                              errMsg.toLowerCase().includes('denied') ||
                              errCode.toLowerCase().includes('permission') ||
                              errCode.toLowerCase().includes('denied');
      if (err?.message?.includes('Quota') || err?.message?.includes('quota') || err?.message?.includes('exhausted')) {
        setIsQuotaExceeded(true);
        localStorage.setItem('last_firestore_quota_error', new Date().toDateString());
      }
      if (!isPermissionErr) {
        console.error('Failed to fetch keys from Firestore:', err);
        handleFirestoreError(err, OperationType.LIST, 'keys');
      }
      let cached = localStorage.getItem('mz_backend_keys_cache');
      if (!cached) {
        cached = JSON.stringify([]);
      }
      try {
        setBackendKeys(JSON.parse(cached));
      } catch(e) { console.error("Cache parsing error", e); }
    } finally {
      setIsKeysLoading(false);
    }
  };

  const fetchPromosFromDb = async () => {
    setIsPromosLoading(true);
    setPromoErrorMsg('');
    try {
      const querySnapshot = await getDocs(collection(db, 'promos'));
      const list: PromoCode[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          code: data.code || docSnap.id,
          type: data.type || 'free_premium',
          value: Number(data.value || 0),
          maxUses: Number(data.maxUses || 0),
          usedCount: Number(data.usedCount || 0),
          description: data.description || '',
          createdAt: data.createdAt || '',
          startDate: data.startDate || '',
          endDate: data.endDate || ''
        });
      });
      setPromos(list);
      localStorage.setItem('mz_promos_cache', JSON.stringify(list));
    } catch (e: any) {
      console.error("Error loading promo codes:", e);
      if (e?.message?.includes('Quota') || e?.message?.includes('quota') || e?.message?.includes('exhausted')) {
        setIsQuotaExceeded(true);
        localStorage.setItem('last_firestore_quota_error', new Date().toDateString());
      }
      setPromoErrorMsg('Gagal mengambil daftar promo.');
      let cached = localStorage.getItem('mz_promos_cache');
      if (!cached) {
        cached = JSON.stringify([]);
      }
      try {
        setPromos(JSON.parse(cached));
      } catch(err) { console.error("Cache parsing error", err); }
    } finally {
      setIsPromosLoading(false);
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoErrorMsg('');
    setPromoSuccessMsg('');

    const code = newPromoCode.trim().toUpperCase();
    if (!code) {
      setPromoErrorMsg('Kode promo tidak boleh kosong.');
      return;
    }

    try {
      setIsPromosLoading(true);
      const promoObj = {
        code,
        type: newPromoType,
        value: Number(newPromoValue),
        maxUses: Number(newPromoMaxUses),
        usedCount: 0,
        description: newPromoDesc.trim(),
        createdAt: new Date().toISOString(),
        startDate: newPromoStartDate || null,
        endDate: newPromoEndDate || null
      };

      // save to Firestore
      await setDoc(doc(db, 'promos', code), promoObj);
      setPromoSuccessMsg(`Kode promo ${code} berhasil dibuat!`);
      
      // Reset form
      setNewPromoCode('');
      setNewPromoDesc('');
      setNewPromoStartDate('');
      setNewPromoEndDate('');
      
      // reload directory
      await fetchPromosFromDb();
    } catch (err: any) {
      console.error("Failed to create promo in Firestore, falling back to local storage:", err);
      
      const promoObj = {
        id: code,
        code,
        type: newPromoType,
        value: Number(newPromoValue),
        maxUses: Number(newPromoMaxUses),
        usedCount: 0,
        description: newPromoDesc.trim(),
        createdAt: new Date().toISOString(),
        startDate: newPromoStartDate || null,
        endDate: newPromoEndDate || null
      };
      
      let cached = localStorage.getItem('mz_promos_cache');
      let currentList: PromoCode[] = [];
      if (cached) {
        try {
          currentList = JSON.parse(cached);
        } catch(errEx) {}
      }
      const updatedList = [promoObj, ...currentList.filter(p => p.code !== code)];
      setPromos(updatedList);
      localStorage.setItem('mz_promos_cache', JSON.stringify(updatedList));

      setPromoSuccessMsg(`Kode promo ${code} berhasil dibuat secara lokal (Sandbox Mode)!`);
      setNewPromoCode('');
      setNewPromoDesc('');
      setNewPromoStartDate('');
      setNewPromoEndDate('');
    } finally {
      setIsPromosLoading(false);
    }
  };

  const handleDeletePromoCode = async (promoId: string) => {
    if (!window.confirm(`Hapus kode promo ${promoId}?`)) return;
    setPromoErrorMsg('');
    setPromoSuccessMsg('');
    try {
      setIsPromosLoading(true);
      await deleteDoc(doc(db, 'promos', promoId));
      setPromoSuccessMsg('Kode promo berhasil dihapus.');
      await fetchPromosFromDb();
    } catch (err: any) {
      console.error("Failed to delete promo in Firestore, falling back to local storage:", err);
      let cached = localStorage.getItem('mz_promos_cache');
      let currentList: PromoCode[] = [];
      if (cached) {
        try {
          currentList = JSON.parse(cached);
        } catch(errEx) {}
      }
      const updatedList = currentList.filter(p => p.id !== promoId);
      setPromos(updatedList);
      localStorage.setItem('mz_promos_cache', JSON.stringify(updatedList));
      setPromoSuccessMsg('Kode promo berhasil dihapus secara lokal (Sandbox Mode).');
    } finally {
      setIsPromosLoading(false);
    }
  };

  useEffect(() => {
    if (onlyModal) return;

    if (!showResellerHub) {
      setIsKeysLoading(false);
      setIsPromosLoading(false);
      return;
    }

    setIsKeysLoading(true);
    setIsPromosLoading(true);

    // 1. Realtime listener for keys
    const unsubKeys = onSnapshot(collection(db, 'keys'), (qSnap) => {
      const keysList: LicenseKeyBackend[] = [];
      qSnap.forEach((doc) => {
        let activatedBy = doc.data().activatedBy || '';
        const firstActivatedBy = doc.data().firstActivatedBy || '';
        let ownerId = firstActivatedBy || activatedBy;
        if (userId && userEmail && ownerId === userId) {
           activatedBy = userEmail;
           // Automatically heal the database for this user
           updateDoc(doc.ref, { activatedBy: userEmail, firstActivatedBy: userEmail }).catch(()=>{});
        }
        const data = doc.data();
        keysList.push({
          key: doc.id,
          activated: !!data.activated,
          activatedBy: activatedBy || '',
          activatedAt: data.activatedAt || '',
          duration: data.duration || 'unlimited'
        });
      });
      keysList.sort((a, b) => a.key.localeCompare(b.key));
      setBackendKeys(keysList);
      localStorage.setItem('mz_backend_keys_cache', JSON.stringify(keysList));
      setIsKeysLoading(false);
    }, (err) => {
      const errMsg = err?.message || (err && typeof err === 'object' && 'message' in err ? String((err as any).message) : '') || String(err);
      const errCode = (err && typeof err === 'object' && 'code' in err ? String((err as any).code) : '');
      const isPermissionErr = errMsg.toLowerCase().includes('permission') || 
                              errMsg.toLowerCase().includes('denied') ||
                              errCode.toLowerCase().includes('permission') ||
                              errCode.toLowerCase().includes('denied');
      if (err?.message?.includes('Quota') || err?.message?.includes('quota') || err?.message?.includes('exhausted')) {
        setIsQuotaExceeded(true);
        localStorage.setItem('last_firestore_quota_error', new Date().toDateString());
      }
      if (!isPermissionErr) {
        console.error('Realtime Firestore keys subscription error, loading cached data:', err);
        handleFirestoreError(err, OperationType.LIST, 'keys');
      }
      let cached = localStorage.getItem('mz_backend_keys_cache');
      if (!cached) {
        cached = JSON.stringify([]);
      }
      try {
        setBackendKeys(JSON.parse(cached));
      } catch(e) { console.error("Cache parsing error", e); }
      setIsKeysLoading(false);
    });

    // 2. Realtime listener for promos
    const unsubPromos = onSnapshot(collection(db, 'promos'), (qSnap) => {
      const list: PromoCode[] = [];
      qSnap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          code: data.code || docSnap.id,
          type: data.type || 'free_premium',
          value: Number(data.value || 0),
          maxUses: Number(data.maxUses || 0),
          usedCount: Number(data.usedCount || 0),
          description: data.description || '',
          createdAt: data.createdAt || '',
          startDate: data.startDate || '',
          endDate: data.endDate || ''
        });
      });
      setPromos(list);
      localStorage.setItem('mz_promos_cache', JSON.stringify(list));
      setIsPromosLoading(false);
    }, (err) => {
      const errMsg = err?.message || (err && typeof err === 'object' && 'message' in err ? String((err as any).message) : '') || String(err);
      const errCode = (err && typeof err === 'object' && 'code' in err ? String((err as any).code) : '');
      const isPermissionErr = errMsg.toLowerCase().includes('permission') || 
                              errMsg.toLowerCase().includes('denied') ||
                              errCode.toLowerCase().includes('permission') ||
                              errCode.toLowerCase().includes('denied');
      if (err?.message?.includes('Quota') || err?.message?.includes('quota') || err?.message?.includes('exhausted')) {
        setIsQuotaExceeded(true);
        localStorage.setItem('last_firestore_quota_error', new Date().toDateString());
      }
      if (!isPermissionErr) {
        console.error("Realtime Firestore promos subscription error, loading cached data:", err);
      }
      setPromoErrorMsg(isPermissionErr ? 'Menggunakan data promo lokal (Sandbox Mode).' : 'Gagal mengambil daftar promo real-time (Quota exceeded). Menggunakan data lokal.');
      let cached = localStorage.getItem('mz_promos_cache');
      if (!cached) {
        cached = JSON.stringify([]);
      }
      try {
        setPromos(JSON.parse(cached));
      } catch(e) {}
      setIsPromosLoading(false);
    });

    return () => {
      unsubKeys();
      unsubPromos();
    };
  }, [onlyModal, showResellerHub]);

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
    const generatedCount = keysCountToGen;
    const newlyCreated: LicenseKeyBackend[] = [];
    try {
      for (let i = 0; i < generatedCount; i++) {
        const newKey = generateRandomKey();
        const keyData = {
          key: newKey,
          activated: false,
          activatedBy: '',
          activatedAt: '',
          duration: selectedDuration,
          createdAt: new Date().toISOString()
        };
        newlyCreated.push(keyData);
        await setDoc(doc(db, 'keys', newKey), keyData);
      }
      await fetchBackendKeys();
    } catch (err) {
      console.error('Failed to generate keys in Firestore, falling back to local storage:', err);
      handleFirestoreError(err, OperationType.WRITE, 'keys');
      
      // Fallback: Append newlyCreated to the local cache!
      let cached = localStorage.getItem('mz_backend_keys_cache');
      let currentList: LicenseKeyBackend[] = [];
      if (cached) {
        try {
          currentList = JSON.parse(cached);
        } catch(e) {}
      }
      const updatedList = [...newlyCreated, ...currentList];
      setBackendKeys(updatedList);
      localStorage.setItem('mz_backend_keys_cache', JSON.stringify(updatedList));
      alert(`Firestore Quota Terlampaui! Sistem beralih ke Mode Sandbox Offline. ${generatedCount} Serial Key baru berhasil digenerate secara lokal untuk simulasi.`);
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
      console.error('Failed to delete key inside Firestore, falling back to local storage:', err);
      handleFirestoreError(err, OperationType.DELETE, `keys/${keyToDelete}`);
      
      let cached = localStorage.getItem('mz_backend_keys_cache');
      let currentList: LicenseKeyBackend[] = [];
      if (cached) {
        try {
          currentList = JSON.parse(cached);
        } catch(e) {}
      }
      const updatedList = currentList.filter(k => k.key !== keyToDelete);
      setBackendKeys(updatedList);
      localStorage.setItem('mz_backend_keys_cache', JSON.stringify(updatedList));
      alert(`Key ${keyToDelete} berhasil dihapus secara lokal (Sandbox Mode).`);
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
        activatedAt: '',
        firstActivatedBy: ''
      });
      await fetchBackendKeys();
      alert(`Key ${keyToReset} berhasil direset.`);
    } catch (err) {
      console.error('Failed to reset key inside Firestore, falling back to local storage:', err);
      handleFirestoreError(err, OperationType.UPDATE, `keys/${keyToReset}`);
      
      let cached = localStorage.getItem('mz_backend_keys_cache');
      let currentList: LicenseKeyBackend[] = [];
      if (cached) {
        try {
          currentList = JSON.parse(cached);
        } catch(e) {}
      }
      const updatedList = currentList.map(k => k.key === keyToReset ? { ...k, activated: false, activatedBy: '', activatedAt: '', firstActivatedBy: '' } : k);
      setBackendKeys(updatedList);
      localStorage.setItem('mz_backend_keys_cache', JSON.stringify(updatedList));
      alert(`Key ${keyToReset} berhasil direset secara lokal (Sandbox Mode).`);
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

  useEffect(() => {
    const fetchBrandingPrices = async () => {
      try {
        const docRef = doc(db, 'branding', 'main');
        const dSnap = await getDoc(docRef);
        if (dSnap.exists()) {
          const data = dSnap.data();
          if (data.price30Days) {
            setPrice30Days(data.price30Days);
            setTempPrice30Days(data.price30Days);
          }
          if (data.price30DaysUSD) {
            setPrice30DaysUSD(data.price30DaysUSD);
            setTempPrice30DaysUSD(data.price30DaysUSD);
          }
          if (data.priceUnlimited) {
            setPriceUnlimited(data.priceUnlimited);
            setTempPriceUnlimited(data.priceUnlimited);
          }
          if (data.priceUnlimitedUSD) {
            setPriceUnlimitedUSD(data.priceUnlimitedUSD);
            setTempPriceUnlimitedUSD(data.priceUnlimitedUSD);
          }
          if (data.pakasirProject) {
            setPakasirProject(data.pakasirProject);
            setTempPakasirProject(data.pakasirProject);
          }
          if (data.pakasirApiKey) {
            setPakasirApiKey(data.pakasirApiKey);
            setTempPakasirApiKey(data.pakasirApiKey);
          }
        }
      } catch (err) {
        console.warn('Silent pricing load fail:', err);
      }
    };
    fetchBrandingPrices();
  }, []);

  const handleSaveResellerSettings = async () => {
    setIsKeysLoading(true);
    try {
      await setDoc(doc(db, 'branding', 'main'), {
        appName: tempAppName.trim() || 'MetaZo PRO',
        appSubtitle: tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant',
        whatsAppLink: tempWhatsApp.trim() || 'https://wa.me/+6282275408171',
        pricingTier: tempPricingTier.trim() || 'Rp 149.000 / Bulan',
        licenseSeed: tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026',
        payInfo: tempPayInfo.trim(),
        price30Days: tempPrice30Days.trim() || 'Rp 50.000',
        price30DaysUSD: tempPrice30DaysUSD.trim() || '$2',
        priceUnlimited: tempPriceUnlimited.trim() || 'Rp 250.000',
        priceUnlimitedUSD: tempPriceUnlimitedUSD.trim() || '$14',
        pakasirProject: tempPakasirProject.trim(),
        pakasirApiKey: tempPakasirApiKey.trim(),
        updatedAt: new Date().toISOString()
      });

      localStorage.setItem('mz_reseller_app_name', tempAppName.trim() || 'MetaZo PRO');
      localStorage.setItem('mz_reseller_app_subtitle', tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant');
      localStorage.setItem('mz_reseller_whatsapp', tempWhatsApp.trim() || 'https://wa.me/+6282275408171');
      localStorage.setItem('mz_reseller_price', tempPricingTier.trim() || 'Rp 149.000 / Bulan');
      localStorage.setItem('mz_reseller_seed', tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026');
      localStorage.setItem('mz_reseller_pay_info', tempPayInfo.trim());
      localStorage.setItem('mz_price_30_days', tempPrice30Days.trim() || 'Rp 50.000');
      localStorage.setItem('mz_price_30_days_usd', tempPrice30DaysUSD.trim() || '$2');
      localStorage.setItem('mz_price_unlimited', tempPriceUnlimited.trim() || 'Rp 250.000');
      localStorage.setItem('mz_price_unlimited_usd', tempPriceUnlimitedUSD.trim() || '$14');
      localStorage.setItem('mz_pakasir_project', tempPakasirProject.trim());
      localStorage.setItem('mz_pakasir_apikey', tempPakasirApiKey.trim());

      setAppName(tempAppName.trim() || 'MetaZo PRO');
      setAppSubtitle(tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant');
      setWhatsAppLink(tempWhatsApp.trim() || 'https://wa.me/+6282275408171');
      setPricingTier(tempPricingTier.trim() || 'Rp 149.000 / Bulan');
      setLicenseSeed(tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026');
      setPrice30Days(tempPrice30Days.trim() || 'Rp 50.000');
      setPrice30DaysUSD(tempPrice30DaysUSD.trim() || '$2');
      setPriceUnlimited(tempPriceUnlimited.trim() || 'Rp 250.000');
      setPriceUnlimitedUSD(tempPriceUnlimitedUSD.trim() || '$14');
      setPakasirProject(tempPakasirProject.trim());
      setPakasirApiKey(tempPakasirApiKey.trim());

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save branding in Firestore, falling back to local storage:', err);
      handleFirestoreError(err, OperationType.WRITE, 'branding/main');
      
      // Update local storage and React states anyway!
      localStorage.setItem('mz_reseller_app_name', tempAppName.trim() || 'MetaZo PRO');
      localStorage.setItem('mz_reseller_app_subtitle', tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant');
      localStorage.setItem('mz_reseller_whatsapp', tempWhatsApp.trim() || 'https://wa.me/+6282275408171');
      localStorage.setItem('mz_reseller_price', tempPricingTier.trim() || 'Rp 149.000 / Bulan');
      localStorage.setItem('mz_reseller_seed', tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026');
      localStorage.setItem('mz_reseller_pay_info', tempPayInfo.trim());
      localStorage.setItem('mz_price_30_days', tempPrice30Days.trim() || 'Rp 50.000');
      localStorage.setItem('mz_price_30_days_usd', tempPrice30DaysUSD.trim() || '$2');
      localStorage.setItem('mz_price_unlimited', tempPriceUnlimited.trim() || 'Rp 250.000');
      localStorage.setItem('mz_price_unlimited_usd', tempPriceUnlimitedUSD.trim() || '$14');
      localStorage.setItem('mz_pakasir_project', tempPakasirProject.trim());
      localStorage.setItem('mz_pakasir_apikey', tempPakasirApiKey.trim());

      setAppName(tempAppName.trim() || 'MetaZo PRO');
      setAppSubtitle(tempAppSubtitle.trim() || 'AI-Powered Metadata Assistant');
      setWhatsAppLink(tempWhatsApp.trim() || 'https://wa.me/+6282275408171');
      setPricingTier(tempPricingTier.trim() || 'Rp 149.000 / Bulan');
      setLicenseSeed(tempLicenseSeed.trim() || 'MZPRO-COMMERCIAL-2026');
      setPrice30Days(tempPrice30Days.trim() || 'Rp 50.000');
      setPrice30DaysUSD(tempPrice30DaysUSD.trim() || '$2');
      setPriceUnlimited(tempPriceUnlimited.trim() || 'Rp 250.000');
      setPriceUnlimitedUSD(tempPriceUnlimitedUSD.trim() || '$14');
      setPakasirProject(tempPakasirProject.trim());
      setPakasirApiKey(tempPakasirApiKey.trim());

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      alert('Firestore Quota Terlampaui! Branding Anda berhasil disimpan secara lokal (Sandbox Mode) dan langsung diterapkan.');
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
          whatsAppLink: 'https://wa.me/+6282275408171',
          pricingTier: 'Rp 149.000 / Bulan',
          licenseSeed: 'MZPRO-COMMERCIAL-2026',
          payInfo: 'Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom',
          price30Days: 'Rp 50.000',
          price30DaysUSD: '$2',
          priceUnlimited: 'Rp 250.000',
          priceUnlimitedUSD: '$14',
          pakasirProject: '',
          pakasirApiKey: '',
          updatedAt: new Date().toISOString()
        });
        localStorage.removeItem('mz_reseller_app_name');
        localStorage.removeItem('mz_reseller_app_subtitle');
        localStorage.removeItem('mz_reseller_whatsapp');
        localStorage.removeItem('mz_reseller_price');
        localStorage.removeItem('mz_reseller_seed');
        localStorage.removeItem('mz_reseller_pay_info');
        localStorage.removeItem('mz_price_30_days');
        localStorage.removeItem('mz_price_30_days_usd');
        localStorage.removeItem('mz_price_unlimited');
        localStorage.removeItem('mz_price_unlimited_usd');
        localStorage.removeItem('mz_pakasir_project');
        localStorage.removeItem('mz_pakasir_apikey');

        setAppName('MetaZo PRO');
        setAppSubtitle('AI-Powered Metadata Assistant');
        setWhatsAppLink('https://wa.me/+6282275408171');
        setPricingTier('Rp 149.000 / Bulan');
        setLicenseSeed('MZPRO-COMMERCIAL-2026');
        setTempPayInfo('Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom');
        setPrice30Days('Rp 50.000');
        setPrice30DaysUSD('$2');
        setPriceUnlimited('Rp 250.000');
        setPriceUnlimitedUSD('$14');
        setTempPrice30Days('Rp 50.000');
        setTempPrice30DaysUSD('$2');
        setTempPriceUnlimited('Rp 250.000');
        setTempPriceUnlimitedUSD('$14');
        setPakasirProject('');
        setPakasirApiKey('');
        setTempPakasirProject('');
        setTempPakasirApiKey('');

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1500);
      } catch (err) {
        console.error('Failed to reset branding settings in Firestore, falling back to local storage:', err);
        handleFirestoreError(err, OperationType.WRITE, 'branding/main');

        localStorage.removeItem('mz_reseller_app_name');
        localStorage.removeItem('mz_reseller_app_subtitle');
        localStorage.removeItem('mz_reseller_whatsapp');
        localStorage.removeItem('mz_reseller_price');
        localStorage.removeItem('mz_reseller_seed');
        localStorage.removeItem('mz_reseller_pay_info');
        localStorage.removeItem('mz_price_30_days');
        localStorage.removeItem('mz_price_30_days_usd');
        localStorage.removeItem('mz_price_unlimited');
        localStorage.removeItem('mz_price_unlimited_usd');
        localStorage.removeItem('mz_pakasir_project');
        localStorage.removeItem('mz_pakasir_apikey');

        setAppName('MetaZo PRO');
        setAppSubtitle('AI-Powered Metadata Assistant');
        setWhatsAppLink('https://wa.me/+6282275408171');
        setPricingTier('Rp 149.000 / Bulan');
        setLicenseSeed('MZPRO-COMMERCIAL-2026');
        setTempPayInfo('Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom');
        setPrice30Days('Rp 50.000');
        setPrice30DaysUSD('$2');
        setPriceUnlimited('Rp 250.000');
        setPriceUnlimitedUSD('$14');
        setTempPrice30Days('Rp 50.000');
        setTempPrice30DaysUSD('$2');
        setTempPriceUnlimited('Rp 250.000');
        setTempPriceUnlimitedUSD('$14');
        setPakasirProject('');
        setPakasirApiKey('');
        setTempPakasirProject('');
        setTempPakasirApiKey('');

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1500);
        alert('Branding Anda berhasil disetel ulang secara lokal (Sandbox Mode).');
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
    return false;
  };

  // Helper to calculate discounted pricing text dynamically
  const getDiscountedPrice = (priceStr: string, discountPercent: number) => {
    if (!discountPercent || discountPercent <= 0) return priceStr;
    
    // Extract numbers from the price string
    const cleanNumStr = priceStr.replace(/[^0-9]/g, '');
    const originalVal = parseInt(cleanNumStr, 10);
    if (isNaN(originalVal)) return priceStr; 
    
    const discountedVal = Math.round(originalVal * (1 - discountPercent / 100));
    
    // Format based on currency type
    if (priceStr.startsWith('Rp')) {
      const formatted = new Intl.NumberFormat('id-ID').format(discountedVal);
      return `Rp ${formatted}`;
    } else if (priceStr.includes('$')) {
      return `$${discountedVal}`;
    }
    return `${discountedVal}`;
  };

  // Apply user-submitted promo code inside user-facing interface
  const handleApplyUserPromoCode = async () => {
    setPromoApplyError('');
    setPromoApplySuccess('');
    
    const cleanPromo = appliedPromoInput.trim().toUpperCase();
    if (!cleanPromo) {
      setPromoApplyError('Masukkan kode promo terlebih dahulu.');
      return;
    }

    setIsApplyingPromo(true);
    try {
      const promoRef = doc(db, 'promos', cleanPromo);
      const docSnap = await getDoc(promoRef);
      
      if (!docSnap.exists()) {
        setPromoApplyError('Kode promo salah atau tidak valid.');
        setIsApplyingPromo(false);
        return;
      }

      const pData = docSnap.data();
      const usedCount = Number(pData.usedCount) || 0;
      const maxUses = Number(pData.maxUses) || 99999;
      
      const now = new Date();
      if (pData.startDate) {
        const start = new Date(pData.startDate);
        if (now < start) {
          setPromoApplyError(`Kode promo belum aktif. Promo ini mulai berlaku tanggal ${pData.startDate}.`);
          setIsApplyingPromo(false);
          return;
        }
      }

      if (pData.endDate) {
        const endStr = pData.endDate;
        const end = endStr.includes('T') ? new Date(endStr) : new Date(endStr + 'T23:59:59');
        if (now > end) {
          setPromoApplyError('Kode promo ini sudah kedaluwarsa (expired).');
          setIsApplyingPromo(false);
          return;
        }
      }

      if (usedCount >= maxUses) {
        setPromoApplyError('Kode promo sudah melebihi batas penggunaan.');
        setIsApplyingPromo(false);
        return;
      }

      // If it's a discount type promo
      if (pData.type === 'discount') {
        const discountPromo: PromoCode = {
          id: docSnap.id,
          code: docSnap.id,
          type: 'discount',
          value: Number(pData.value) || 0,
          maxUses,
          usedCount,
          description: pData.description || ''
        };
        setActivePromo(discountPromo);
        setPromoApplySuccess(`Kode promo ${cleanPromo} diterapkan! Potongan harga ${pData.value}%!`);
        
        // Track promo usage increment
        await updateDoc(promoRef, {
          usedCount: usedCount + 1
        }).catch(e => console.warn(e));
        
      } else if (pData.type === 'free_premium') {
        // Direct Activation Key Generation!
        const durationDays = Number(pData.value) || 30;
        const durationStr = durationDays === 30 ? '30days' : `${durationDays}days`;
        
        // Generate a localized unique claimed key
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const generatedLicenseKey = `PROMO-${cleanPromo}-${randomStr}`;
        
        let devId = localStorage.getItem('mz_device_id');
        if (!devId) {
          devId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
          localStorage.setItem('mz_device_id', devId);
        }

        const generatedKeyRef = doc(db, 'keys', generatedLicenseKey);
        
        // Write standard key document structure
        await setDoc(generatedKeyRef, {
          key: generatedLicenseKey,
          activated: true,
          activatedBy: userEmail || devId,
          activatedAt: new Date().toISOString(),
          duration: durationStr,
          promoCode: cleanPromo,
          createdAt: new Date().toISOString()
        });

        // Sync with db user model if userId exists
        if (userId) {
          const userRef = doc(db, 'users', userId);
          await setDoc(userRef, {
            licenseKey: generatedLicenseKey,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => {
            console.warn('db_op', err);
          });
        }

        // Apply immediately inside the client
        localStorage.setItem('mz_license_key', generatedLicenseKey);
        setLicenseKey(generatedLicenseKey);
        
        // Increment use counter
        await updateDoc(promoRef, {
          usedCount: usedCount + 1
        }).catch(e => console.warn(e));

        setPromoApplySuccess(`Promo berhasil! Premium ${durationDays} Hari diaktifkan gratis!`);
        alert(`Selamat! Anda mendapatkan akses PREMIUM ${durationDays} Hari secara gratis menggunakan kode promo: ${cleanPromo}.`);
        
        setTimeout(() => {
          setShowActivation(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Apply promo error, trying local cache fallback:', err);
      
      // Look up promo locally
      let cachedPromos = localStorage.getItem('mz_promos_cache');
      let foundPromo: any = null;
      if (cachedPromos) {
        try {
          const list: any[] = JSON.parse(cachedPromos);
          foundPromo = list.find(p => p.code === cleanPromo || p.id === cleanPromo);
        } catch(e) {}
      }
      
      if (foundPromo) {
        const usedCount = Number(foundPromo.usedCount) || 0;
        const maxUses = Number(foundPromo.maxUses) || 99999;
        
        const now = new Date();
        if (foundPromo.startDate) {
          const start = new Date(foundPromo.startDate);
          if (now < start) {
            setPromoApplyError(`Kode promo belum aktif. Promo ini mulai berlaku tanggal ${foundPromo.startDate}.`);
            setIsApplyingPromo(false);
            return;
          }
        }

        if (foundPromo.endDate) {
          const endStr = foundPromo.endDate;
          const end = endStr.includes('T') ? new Date(endStr) : new Date(endStr + 'T23:59:59');
          if (now > end) {
            setPromoApplyError('Kode promo ini sudah kedaluwarsa (expired).');
            setIsApplyingPromo(false);
            return;
          }
        }

        if (usedCount >= maxUses) {
          setPromoApplyError('Kode promo sudah melebihi batas penggunaan.');
          setIsApplyingPromo(false);
          return;
        }

        if (foundPromo.type === 'discount') {
          setActivePromo(foundPromo);
          setPromoApplySuccess(`Kode promo ${cleanPromo} diterapkan! Potongan harga ${foundPromo.value}%!`);
          
          // Increment locally
          foundPromo.usedCount = usedCount + 1;
          if (cachedPromos) {
            try {
              const list: any[] = JSON.parse(cachedPromos);
              const updated = list.map(p => (p.code === cleanPromo || p.id === cleanPromo) ? foundPromo : p);
              localStorage.setItem('mz_promos_cache', JSON.stringify(updated));
              setPromos(updated);
            } catch(e) {}
          }
        } else if (foundPromo.type === 'free_premium') {
          const durationDays = Number(foundPromo.value) || 30;
          const durationStr = durationDays === 30 ? '30days' : `${durationDays}days`;
          const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
          const generatedLicenseKey = `PROMO-${cleanPromo}-${randomStr}`;
          
          let devId = localStorage.getItem('mz_device_id');
          if (!devId) {
            devId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
            localStorage.setItem('mz_device_id', devId);
          }

          // Apply locally
          localStorage.setItem('mz_license_key', generatedLicenseKey);
          setLicenseKey(generatedLicenseKey);
          
          // Increment promo count locally
          foundPromo.usedCount = usedCount + 1;
          if (cachedPromos) {
            try {
              const list: any[] = JSON.parse(cachedPromos);
              const updated = list.map(p => (p.code === cleanPromo || p.id === cleanPromo) ? foundPromo : p);
              localStorage.setItem('mz_promos_cache', JSON.stringify(updated));
              setPromos(updated);
            } catch(e) {}
          }
          
          // Also save generated key to local cache!
          const keyData = {
            key: generatedLicenseKey,
            activated: true,
            activatedBy: userEmail || devId,
            activatedAt: new Date().toISOString(),
            duration: durationStr,
            promoCode: cleanPromo,
            createdAt: new Date().toISOString()
          };
          
          let cachedKeys = localStorage.getItem('mz_backend_keys_cache');
          let currentKeysList: any[] = [];
          if (cachedKeys) {
            try {
              currentKeysList = JSON.parse(cachedKeys);
            } catch(e) {}
          }
          const updatedKeys = [keyData, ...currentKeysList];
          localStorage.setItem('mz_backend_keys_cache', JSON.stringify(updatedKeys));
          setBackendKeys(updatedKeys);

          setPromoApplySuccess(`Promo berhasil! Premium ${durationDays} Hari diaktifkan gratis!`);
          alert(`Selamat! Anda mendapatkan akses PREMIUM ${durationDays} Hari secara gratis menggunakan kode promo: ${cleanPromo}.`);
          
          setTimeout(() => {
            setShowActivation(false);
          }, 1500);
        }
      } else {
        setPromoApplyError('Terjadi kesalahan saat menerapkan kode promo atau kode tidak valid dalam mode offline.');
      }
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleCheckoutWithPakasir = async (amount: number, planDesc: string) => {
    if (!pakasirProject || !pakasirApiKey) {
      alert("Admin belum mengkonfigurasi Integrasi Pakasir.");
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const orderId = `MZPRO-${Date.now()}`;
      
      const response = await fetch('/api/pakasir/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug: pakasirProject,
          apiKey: pakasirApiKey,
          orderId: orderId,
          amount: amount,
          redirectUrl: window.location.href
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setCheckoutUrl(data.paymentUrl);
      setCheckoutDataUrl(data.dataUrl);
      setCheckoutOrderId(orderId);
      setCheckoutAmount(amount);
      setCheckoutPlan(planDesc);

    } catch (err: any) {
      console.error("Pakasir Checkout Failed:", err);
      alert("Gagal membuat pembayaran Pakasir: " + err.message);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    setIsCheckoutLoading(true);
    try {
      const response = await fetch('/api/pakasir/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug: pakasirProject,
          apiKey: pakasirApiKey,
          orderId: checkoutOrderId,
          amount: checkoutAmount
        })
      });
      const data = await response.json();
      if (data.status === 'SUCCESS' || data.status === 'SETTLED' || data.status === 'PAID' || data.status === 'completed' || data.status === 'COMPLETED') {
         const newKey = generateRandomKey();
         const duration = checkoutPlan.includes('30') ? '30days' : 'unlimited';
         
         let devId = localStorage.getItem('mz_device_id');
         if (!devId) {
           devId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
           localStorage.setItem('mz_device_id', devId);
         }

         await setDoc(doc(db, 'keys', newKey), {
          key: newKey,
          activated: true,
          activatedBy: userEmail || devId,
          activatedAt: new Date().toISOString(),
          duration: duration,
          createdAt: new Date().toISOString()
        });
        
        if (userId) {
          const userRef = doc(db, 'users', userId);
          await setDoc(userRef, {
            licenseKey: newKey,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(err => {
            console.warn('db_op', err);
          });
        }
        
        localStorage.setItem('mz_license_key', newKey);
        setLicenseKey(newKey);
        
        // Refresh backend keys in SaaSPortal so it immediately reflects in the reseller audit
        await fetchBackendKeys().catch(e => console.error("Failed to refresh keys:", e));
        
        // Try to send email
        if (userEmail) {
          try {
             await fetch('/api/send-key', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 email: userEmail,
                 licenseKey: newKey,
                 appName: tempAppName || 'MetaZo PRO',
                 caption: `Terima kasih atas pembayaran Anda! Akun Anda kini berstatus PRO dengan paket ${duration === '30days' ? '30 Hari' : 'Unlimited'}. Berikut adalah salinan License Key Anda.`
               })
             });
          } catch(e) {
             console.error("Failed to send key email:", e);
          }
        }

        setInputKey(newKey);
        setActivationSuccess(true);
        setActivationError('');
        setTimeout(() => {
          setActivationSuccess(false);
          setCheckoutUrl('');
          setCheckoutDataUrl('');
          setShowActivation(false);
        }, 2500);
      } else {
        alert("Pembayaran belum selesai. Status: " + data.status);
      }
    } catch (err: any) {
       alert("Gagal cek status: " + err.message);
    } finally {
       setIsCheckoutLoading(false);
    }
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
    const currentSeed = licenseSeed.trim().toUpperCase();
    
    // Prevent activating a second key if already licensed
    if (isLicensed && licenseKey && targetKeyFormatted !== currentSeed && targetKeyFormatted !== 'MZPRO-COMMERCIAL-2026') {
      if (targetKeyFormatted !== licenseKey.toUpperCase()) {
        setActivationError(localStorage.getItem('mz_language') === 'Bahasa'
          ? 'Akun Anda sudah memiliki lisensi aktif. Satu akun hanya dapat memiliki 1 lisensi aktif.'
          : 'Your account already has an active license. One account can only have 1 active license.');
        setIsActivating(false);
        return;
      }
    }

    const syncUserDb = async (key: string) => {
      if (userId) {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          licenseKey: key,
          cancelledSubscription: false,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => {
          console.warn('db_op', err);
        });
      }
    };

    if (targetKeyFormatted === currentSeed || targetKeyFormatted === 'MZPRO-COMMERCIAL-2026') {
      localStorage.removeItem('mz_cancelled_subscription');
      localStorage.setItem('mz_license_key', targetKeyFormatted);
      await syncUserDb(targetKeyFormatted);
      setLicenseKey(targetKeyFormatted);
      setActivationSuccess(true);
      setActivationError('');
      setTimeout(() => {
        setActivationSuccess(false);
        setShowActivation(false);
      }, 2500);
      setIsActivating(false);
      return;
    }

    localStorage.removeItem('mz_cancelled_subscription');
    const keyRef = doc(db, 'keys', targetKeyFormatted);

    try {
      const dSnap = await getDoc(keyRef);

      if (dSnap.exists()) {
        const data = dSnap.data();
        const isEmail = (str: string) => str && str.includes('@');
        const keyActivatedBy = data.activatedBy || '';
        const firstActivatedBy = data.firstActivatedBy || '';
        const ownerId = firstActivatedBy || keyActivatedBy;

        if (ownerId) {
          const isOwner = (
            ownerId === devId || 
            (userId && ownerId === userId) ||
            (userEmail && ownerId.toLowerCase() === userEmail.toLowerCase())
          );

          if (isOwner) {
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

            // Allowed! Owner is reactivating or using it
            await updateDoc(keyRef, {
              activated: true,
              cancelled: false,
              activatedBy: userEmail || devId,
              firstActivatedBy: userEmail || devId,
              updatedAt: new Date().toISOString()
            }).catch(console.error);

            localStorage.setItem('mz_license_key', targetKeyFormatted);
            await syncUserDb(targetKeyFormatted);
            setLicenseKey(targetKeyFormatted);
            setActivationSuccess(true);
            setActivationError('');
            setTimeout(() => {
              setActivationSuccess(false);
              setShowActivation(false);
            }, 2500);
          } else {
            setActivationError(localStorage.getItem('mz_language') === 'Bahasa'
              ? 'Kunci lisensi ini sudah terdaftar oleh akun lain! Satu lisensi hanya bisa digunakan untuk satu akun.'
              : 'This license key is already registered to another account! One license can only be used on one account.');
          }
        } else {
          // Unactivated single-use key -> activate and bind permanently to this account!
          await updateDoc(keyRef, {
            activated: true,
            cancelled: false,
            activatedBy: userEmail || devId,
            firstActivatedBy: userEmail || devId,
            activatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          localStorage.setItem('mz_license_key', targetKeyFormatted);
          await syncUserDb(targetKeyFormatted);
          setLicenseKey(targetKeyFormatted);
          setActivationSuccess(true);
          setActivationError('');
          setTimeout(() => {
            setActivationSuccess(false);
            setShowActivation(false);
          }, 2500);
        }
      } else {
        setActivationError(t.activation_error_invalid);
      }
    } catch (err) {
      console.warn('Firestore activate check error, attempting offline/cached check:', err);
      
      // Check local cache
      let cachedKeys = localStorage.getItem('mz_backend_keys_cache');
      let foundInCache: any = null;
      if (cachedKeys) {
        try {
          const list: LicenseKeyBackend[] = JSON.parse(cachedKeys);
          foundInCache = list.find(k => k.key === targetKeyFormatted);
        } catch(e) {}
      }
      
      if (foundInCache) {
        const isEmail = (str: string) => str && str.includes('@');
        const keyActivatedBy = foundInCache.activatedBy || '';
        const firstActivatedBy = foundInCache.firstActivatedBy || '';
        const ownerId = firstActivatedBy || keyActivatedBy;
        
        let offlineRejected = false;
        if (ownerId) {
          const isOwner = (
            ownerId === devId || 
            (userId && ownerId === userId) ||
            (userEmail && ownerId.toLowerCase() === userEmail.toLowerCase())
          );
          if (!isOwner) {
            offlineRejected = true;
          }
        }

        if (offlineRejected) {
          setActivationError(localStorage.getItem('mz_language') === 'Bahasa'
            ? 'Kunci lisensi ini sudah terdaftar oleh akun lain! Satu lisensi hanya bisa digunakan untuk satu akun.'
            : 'This license key is already registered to another account! One license can only be used on one account.');
          setIsActivating(false);
          return;
        }
        
        // Allowed
        foundInCache.activated = true;
        foundInCache.cancelled = false;
        foundInCache.activatedBy = userEmail || devId;
        if (!foundInCache.firstActivatedBy) {
          foundInCache.firstActivatedBy = userEmail || devId;
        }
        if (!foundInCache.activatedAt) {
          foundInCache.activatedAt = new Date().toISOString();
        }
        
        let cachedKeys2 = localStorage.getItem('mz_backend_keys_cache');
        if (cachedKeys2) {
          try {
            let list2: LicenseKeyBackend[] = JSON.parse(cachedKeys2);
            const updated = list2.map(k => k.key === targetKeyFormatted ? foundInCache : k);
            localStorage.setItem('mz_backend_keys_cache', JSON.stringify(updated));
            setBackendKeys(updated);
          } catch(e) {}
        }
        
        localStorage.setItem('mz_license_key', targetKeyFormatted);
        await syncUserDb(targetKeyFormatted);
        setLicenseKey(targetKeyFormatted);
        setActivationSuccess(true);
        setActivationError('');
        setTimeout(() => {
          setActivationSuccess(false);
          setShowActivation(false);
        }, 2500);
      } else {
        setActivationError('Koneksi database/lisensi bermasalah, dan serial key Anda tidak terdaftar untuk aktivasi offline.');
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleRemoveLicenseKey = async () => {
    const keyToRemove = localStorage.getItem('mz_license_key');
    if (keyToRemove) {
      try {
        await updateDoc(doc(db, 'keys', keyToRemove.trim().toUpperCase()), {
          activated: false,
          activatedBy: '',
          activatedAt: '',
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Could not deactivate key in keys collection:", e);
      }
    }

    localStorage.removeItem('mz_license_key');
    localStorage.setItem('mz_cancelled_subscription', 'true');
    // Fully return to trial mode by resetting the trial period
    localStorage.setItem('mz_trial_start', new Date().toISOString());
    
    // Clear all daily usage in localStorage to reset quota
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('mz_daily_gen_') || key.startsWith('daily_gen_') || key.includes('_daily_gen_'))) {
        localStorage.removeItem(key);
      }
    }
    
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        licenseKey: '',
        cancelledSubscription: true,
        trialStart: new Date().toISOString(),
        dailyUsage: {
          [dateStr]: {} // Clear today's daily usage in Firestore to reset quota to 0/25
        },
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn('db_op', err);
      });
    }

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
        !showResellerHub ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Elegant Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-white shadow-xl">
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#7c3aed]/10 rounded-full blur-3xl pointer-events-none" />
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
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-md shadow-black/5">
                <div className="w-6 h-6 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-500">
                  <Sparkles size={12} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Whitelabel UI</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Ubah nama aplikasi, subjudul, harga, & kontak WhatsApp support untuk pembeli seketika.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-md shadow-black/5">
                <div className="w-6 h-6 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                  <Key size={12} className="rotate-45" />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Key Generator</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Batch-mencetak Serial Key lisensi unik sekali-pakai secara dinamis di Firestore.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-md shadow-black/5">
                <div className="w-6 h-6 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                  <CreditCard size={12} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Pelacak Aktivasi</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Pantau alamat email dan ID perangkat pembeli yang mengaktifkan kunci, serta cabut lisensi kapan saja.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-2xl flex flex-col space-y-1 shadow-md shadow-black/5">
                <div className="w-6 h-6 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                  <ShieldCheck size={12} />
                </div>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Penyemaian Serial</h3>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold font-sans">
                  Sematkan sandi validasi master cadangan yang andal untuk validasi lisensi offline instan.
                </p>
              </div>
            </div>

            {/* Notice for non-admins */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 shadow-md text-center">
              <span className="text-red-500 font-extrabold uppercase tracking-wider text-[10px] block mb-1">Akses Ditolak</span>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-[9px] leading-relaxed">
                Halaman ini hanya dapat diakses oleh akun Administrator (Owner). Anda tidak memiliki otorisasi untuk membuka konfigurasi Reseller. Hubungi owner utama jika merasa ini sebuah kesalahan.
              </p>
            </div>

            {/* Decal Quote Footer */}
            <div className="text-center bg-slate-100/50 dark:bg-white/5 p-3 rounded-[1.5rem] border border-slate-200/50 dark:border-transparent">
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-relaxed">
                "Ubah software menjadi aset penghasil pendapatan mandiri."
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-100">
            <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-2 text-[#7c3aed]">
                <Sparkles size={16} className="animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider">Owner & Reseller Control Hub {isAdminAccount && <span className="ml-2 bg-violet-600 text-white px-2 py-0.5 rounded-full text-[9px] shadow-sm">ADMIN MODE</span>}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-[10.5px] leading-relaxed">
                Anda berniat menjual aplikasi ini kembali? Ubah identitas visual, syarat tagih, kontak personal, serta key pembeli secara dinamis sesuai kebutuhan branding Anda.
              </p>
            </div>

            {isQuotaExceeded && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-3 text-amber-700 dark:text-amber-400 animate-in fade-in duration-300">
                <div className="p-1 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Sparkles size={14} className="animate-spin duration-1000" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider">Firestore Quota Limit Reached (Sandbox Mode Active)</h4>
                  <p className="text-[9.5px] leading-relaxed opacity-90">
                    Aplikasi mendeteksi batas kuota baca/tulis harian database Firestore telah terlampaui. Sistem telah beralih ke <strong>Mode Sandbox Offline</strong> secara cerdas. Anda tetap dapat mengedit branding, membuat lisensi key baru, menghapus data, dan menyetel ulang portal secara real-time karena semua modifikasi sekarang disimulasikan dan dicadangkan dengan aman di memori lokal browser Anda.
                  </p>
                </div>
              </div>
            )}

            {/* Admin Tabs */}
            <div className="flex font-semibold text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPortalTab('branding')}
                className={`py-2 px-4 rounded-lg transition-all flex-1 ${portalTab === 'branding' ? 'bg-white dark:bg-slate-900 shadow text-violet-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                Branding & Prices
              </button>
              <button
                type="button"
                onClick={() => setPortalTab('keys')}
                className={`py-2 px-4 rounded-lg transition-all flex-1 ${portalTab === 'keys' ? 'bg-white dark:bg-slate-900 shadow text-violet-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                Key Generator
              </button>
              <button
                type="button"
                onClick={() => setPortalTab('promo')}
                className={`py-2 px-4 rounded-lg transition-all flex-1 ${portalTab === 'promo' ? 'bg-white dark:bg-slate-900 shadow text-violet-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                Promo Codes
              </button>
              <button
                type="button"
                onClick={() => setPortalTab('audit')}
                className={`py-2 px-4 rounded-lg transition-all flex-1 ${portalTab === 'audit' ? 'bg-white dark:bg-slate-900 shadow text-emerald-600' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                License Audit
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 pb-4">
              
              {portalTab === 'branding' && (
                <>
                  {/* BRANDING SETUP GRID */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 mb-4">
                    <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 mb-3">
                      <Sparkles size={14} className="text-[#7c3aed]" />
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-bold text-xs focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Subtitle / Slogan</label>
                    <input
                      type="text"
                      placeholder="Contoh: AI-Powered Metadata Assistant"
                      value={tempAppSubtitle}
                      onChange={(e) => setTempAppSubtitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-medium text-xs focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-medium text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Custom WhatsApp Link / Support</label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Contoh: https://wa.me/..."
                      value="https://wa.me/+6282275408171"
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs opacity-60 cursor-not-allowed text-slate-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Payment / Order Transfer Instructions</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Bank Neo Commerce ... a/n Nama Anda"
                      value={tempPayInfo}
                      onChange={(e) => setTempPayInfo(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-all line-clamp-3"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Pakasir Project Slug</label>
                    <input
                      type="text"
                      placeholder="e.g. metazo-pro"
                      value={tempPakasirProject}
                      onChange={(e) => setTempPakasirProject(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Pakasir API Key</label>
                    <input
                      type="password"
                      placeholder="pakasir_live_..."
                      value={tempPakasirApiKey}
                      onChange={(e) => setTempPakasirApiKey(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs focus:ring-1 focus:ring-emerald-500 transition-all text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Subcription Price Editor */}
                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/70">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">Adjust Subscription Plan Prices</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">30 Days (IDR)</label>
                      <input
                        type="text"
                        placeholder="Rp 50.000"
                        value={tempPrice30Days}
                        onChange={(e) => setTempPrice30Days(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none font-bold text-[10px] focus:ring-1 focus:ring-emerald-500 transition-all text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">30 Days (USD)</label>
                      <input
                        type="text"
                        placeholder="$2"
                        value={tempPrice30DaysUSD}
                        onChange={(e) => setTempPrice30DaysUSD(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none font-bold text-[10px] focus:ring-1 focus:ring-emerald-500 transition-all text-[#7c3aed]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Unlimited (IDR)</label>
                      <input
                        type="text"
                        placeholder="Rp 250.000"
                        value={tempPriceUnlimited}
                        onChange={(e) => setTempPriceUnlimited(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none font-bold text-[10px] focus:ring-1 focus:ring-emerald-500 transition-all text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Unlimited (USD)</label>
                      <input
                        type="text"
                        placeholder="$14"
                        value={tempPriceUnlimitedUSD}
                        onChange={(e) => setTempPriceUnlimitedUSD(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none font-bold text-[10px] focus:ring-1 focus:ring-emerald-500 transition-all text-[#7c3aed]"
                      />
                    </div>
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
                      className="flex-1 bg-amber-500/5 dark:bg-amber-900/10 border border-amber-500/20 dark:border-amber-500/30 rounded-[1.5rem] px-3 py-2 outline-none font-mono font-bold text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(tempLicenseSeed, 'seed')}
                      className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-[1.5rem] transition-colors"
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
              
              {/* ACTION BUTTONS FOR BRANDING */}
              <div className="flex items-center space-x-2 mt-4">
                <button
                  type="button"
                  onClick={handleSaveResellerSettings}
                  disabled={isKeysLoading}
                  className="flex-1 py-3 px-4 bg-[#7c3aed] hover:bg-violet-600 text-white font-black uppercase tracking-widest rounded-[1.5rem] text-[10px] shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
                  title="Simpan & Terapkan Perubahan Identitas"
                >
                  <Save size={13} className={isKeysLoading ? 'animate-pulse' : ''} />
                  <span>{saveSuccess ? 'Berhasil Disimpan!' : 'Update Label & Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetResellerSettings}
                  disabled={isKeysLoading}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 shrink-0 disabled:opacity-50"
                  title="Kembalikan semua teks ke default pabrik"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
                {setIsResellerUnlocked && !isAdminAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Kunci dan sembunyikan kembali menu Reseller ini?")) {
                        setIsResellerUnlocked(false);
                        localStorage.removeItem('mz_reseller_unlocked');
                        alert("Akses Reseller telah dikunci & disembunyikan!");
                      }
                    }}
                    className="py-3 px-4 bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 font-extrabold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 shrink-0"
                    title="Kunci & Sembunyikan Menu Reseller"
                  >
                    <Lock size={13} />
                    <span>Kunci</span>
                  </button>
                )}
              </div>
              </>
              )}

              {portalTab === 'keys' && (
                <>
              {/* NEW SERIAL KEY ENGINE FOR SELLING (SINGLE USE) */}
              <div className="border border-slate-100 dark:border-white/5 pt-4 space-y-3 rounded-xl p-3">
                <div className="bg-slate-100/60 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200">
                    <Key size={14} className="text-[#7c3aed] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider">🔑 KELOLA SERIAL KEY SATU KALI PAKAI (UNTUK DIJUAL)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] leading-relaxed">
                    Generate Serial Key acak unik untuk dijual ke pengguna. Setiap key hanya bisa diaktivasi sekali pasca input oleh satu user, mencegah sharing lisensi antar pembeli!

                  </p>
                </div>

                {/* Key Maker Generator Input */}
                <div className="p-3 bg-slate-100/30 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 rounded-[1.5rem] flex items-center gap-3">
                  <div className="space-y-0.5 shrink-0">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Jumlah Key</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={keysCountToGen}
                      onChange={(e) => setKeysCountToGen(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-2 py-1 text-center font-bold text-xs outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-0.5 min-w-[100px] flex-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider block">Durasi</label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value as '30days' | 'unlimited')}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-2 py-1 font-bold text-xs outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="30days">30 Hari</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateKeys}
                    disabled={isKeysLoading}
                    className="py-2.5 px-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-extrabold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 cursor-pointer shrink-0"
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
                      className="hover:text-violet-500 transition-colors flex items-center space-x-0.5"
                      title="Refresh List"
                    >
                      <RefreshCw size={10} className={isKeysLoading ? 'animate-spin' : ''} />
                      <span>Perbarui</span>
                    </button>
                  </div>

                  <div className="flex bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-1 text-[10px] font-bold uppercase tracking-wider">
                    <button type="button" onClick={() => setFilterStatus('all')} className={`flex-1 py-1 rounded transition-colors ${filterStatus === 'all' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>Semua</button>
                    <button type="button" onClick={() => setFilterStatus('ready')} className={`flex-1 py-1 rounded transition-colors ${filterStatus === 'ready' ? 'bg-white dark:bg-slate-700 shadow text-emerald-500 dark:text-emerald-400' : 'text-slate-500'}`}>Tersedia</button>
                    <button type="button" onClick={() => setFilterStatus('used')} className={`flex-1 py-1 rounded transition-colors ${filterStatus === 'used' ? 'bg-white dark:bg-slate-700 shadow text-violet-500 dark:text-violet-400' : 'text-slate-500'}`}>Terpakai</button>
                  </div>

                  <div className="max-h-[180px] overflow-y-auto border border-slate-100 dark:border-slate-900 rounded-[1.5rem] bg-slate-50/50 dark:bg-slate-950/30 custom-scrollbar divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                    {filteredKeys.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 dark:text-slate-500 font-semibold text-[10px]">
                        {backendKeys.length === 0 ? 'Belum ada Serial Key di database. Munculkan dengan generator di atas!' : 'Tidak ada key yang sesuai filter.'}
                      </div>
                    ) : (
                      filteredKeys.map((kObj, i) => (
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
                              <div className="text-[9px] text-[#7c3aed] font-bold flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                <span className="truncate">Terpakai: {kObj.activatedBy}</span>
                                <span className="px-1.5 py-0.5 text-[7.5px] bg-violet-500/10 text-violet-600 dark:text-[#7c3aed] rounded font-black uppercase tracking-wide">
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
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex gap-2 shadow-inner">
                                <input 
                                  type="email"
                                  placeholder="Input email penerima..."
                                  value={emailAddress}
                                  onChange={(e) => setEmailAddress(e.target.value)}
                                  className="flex-1 bg-transparent text-[10px] outline-none font-bold placeholder:text-slate-400"
                                  autoFocus
                                />
                              </div>
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 mt-1 shadow-inner">
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
                                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[9px] font-black uppercase rounded-2xl flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all"
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
              </>
              )}

              {portalTab === 'promo' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Promo Code Info Banner */}
                  <div className="bg-gradient-to-r from-violet-500/15 via-purple-500/10 to-transparent border border-violet-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1 flex items-center space-x-2">
                        <Sparkles size={16} className="animate-pulse" />
                        <span>Promo & Discount Code Center</span>
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                        Buat kode voucher diskon untuk memotong biaya langganan, atau buat kode promo premium gratis untuk kampanye marketing Anda.
                      </p>
                    </div>
                  </div>

                  {/* Dual Grid: Create Promo on Left, List on Right */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Create form */}
                    <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 md:col-span-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <Plus size={12} className="text-violet-500" />
                        <span>Buat Promo Baru</span>
                      </span>

                      <form onSubmit={handleCreatePromoCode} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Kode Promo</label>
                          <input
                            type="text"
                            placeholder="Contoh: MERDEKA88"
                            value={newPromoCode}
                            onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 outline-none font-mono font-black text-xs uppercase focus:ring-1 focus:ring-violet-500 transition-all text-violet-700 dark:text-violet-400"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Tipe Promo</label>
                          <select
                            value={newPromoType}
                            onChange={(e) => {
                              const typeVal = e.target.value as 'free_premium' | 'discount';
                              setNewPromoType(typeVal);
                              setNewPromoValue(typeVal === 'free_premium' ? 30 : 20);
                            }}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none font-bold text-xs focus:ring-1 focus:ring-violet-500 transition-all text-slate-800 dark:text-white"
                          >
                            <option value="free_premium" className="bg-white dark:bg-slate-900">Akses Premium Gratis</option>
                            <option value="discount" className="bg-white dark:bg-slate-900">Potongan Harga (%)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">
                            {newPromoType === 'free_premium' ? 'Durasi Akses Gratis' : 'Persentase Diskon'}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max={newPromoType === 'discount' ? 100 : 365}
                              value={newPromoValue}
                              onChange={(e) => setNewPromoValue(Number(e.target.value))}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-2.5 pr-8 py-1.5 outline-none font-bold text-xs focus:ring-1 focus:ring-violet-500 transition-all text-slate-800 dark:text-white"
                              required
                            />
                            <span className="absolute right-3 top-2 text-[9px] font-black text-slate-400 uppercase">
                              {newPromoType === 'free_premium' ? 'Hari' : '%'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Batas Jumlah Penggunaan</label>
                          <input
                            type="number"
                            min="1"
                            value={newPromoMaxUses}
                            onChange={(e) => setNewPromoMaxUses(Number(e.target.value))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 outline-none font-bold text-xs focus:ring-1 focus:ring-violet-500 transition-all text-slate-800 dark:text-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Mulai Promo</label>
                            <input
                              type="date"
                              value={newPromoStartDate}
                              onChange={(e) => setNewPromoStartDate(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none font-medium text-xs focus:ring-1 focus:ring-violet-500 transition-all text-slate-800 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Selesai Promo</label>
                            <input
                              type="date"
                              value={newPromoEndDate}
                              onChange={(e) => setNewPromoEndDate(e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none font-medium text-xs focus:ring-1 focus:ring-violet-500 transition-all text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-700 dark:text-slate-400 font-bold uppercase tracking-wider text-[8px] block">Deskripsi / Catatan</label>
                          <input
                            type="text"
                            placeholder="Contoh: Diskon 20% Promo Lebaran"
                            value={newPromoDesc}
                            onChange={(e) => setNewPromoDesc(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 outline-none font-medium text-xs focus:ring-1 focus:ring-violet-500 transition-all text-slate-800 dark:text-white"
                          />
                        </div>

                        {promoErrorMsg && (
                          <p className="text-[9px] font-bold text-red-500 dark:text-red-400">
                            ⚠️ {promoErrorMsg}
                          </p>
                        )}
                        {promoSuccessMsg && (
                          <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            🎉 {promoSuccessMsg}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isPromosLoading}
                          className="w-full py-2 bg-[#7c3aed] hover:bg-violet-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                        >
                          <Plus size={10} />
                          <span>Buat Kode Promo</span>
                        </button>
                      </form>
                    </div>

                    {/* Promos Directory list */}
                    <div className="space-y-3 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <ListFilter size={12} className="text-slate-400" />
                          <span>Daftar Kode Promo Aktif</span>
                        </span>
                        <button
                          type="button"
                          onClick={fetchPromosFromDb}
                          className="text-[9px] font-bold text-[#7c3aed] hover:underline flex items-center space-x-1"
                          title="Refresh"
                        >
                          <RefreshCw size={10} className={isPromosLoading ? 'animate-spin' : ''} />
                          <span>Refresh</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                        {isPromosLoading && promos.length === 0 ? (
                          <p className="text-center text-[10px] text-slate-400 py-6 font-semibold animate-pulse">Memuat kode promo...</p>
                        ) : promos.length === 0 ? (
                          <div className="text-center border border-slate-200 dark:border-white/5 py-12 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10">
                            <Gift size={24} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                            <p className="text-[10px] text-slate-400 font-bold">Belum ada kode promo terdaftar.</p>
                          </div>
                        ) : (
                          promos.map((p) => {
                            const isExpired = p.usedCount >= p.maxUses;
                            return (
                              <div
                                key={p.id}
                                className={`p-3 border rounded-2xl flex items-center justify-between transition-all ${
                                  isExpired 
                                    ? 'bg-slate-100/50 dark:bg-slate-950/20 border-slate-200/40 dark:border-white/5 opacity-55' 
                                    : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-white/5 hover:border-violet-500/20 dark:hover:border-violet-500/20 shadow-sm'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-black text-xs text-slate-800 dark:text-white tracking-wide bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                                      {p.code}
                                    </span>
                                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                      p.type === 'free_premium' 
                                        ? 'bg-violet-100 dark:bg-violet-500/10 text-[#7c3aed]' 
                                        : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'
                                    }`}>
                                      {p.type === 'free_premium' ? 'Free Access' : 'Discount'}
                                    </span>
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                    {p.description || 'Tanpa catatan'} • {p.type === 'free_premium' ? `${p.value} Hari PREMIUM` : `Potongan ${p.value}%`}
                                  </p>
                                  {(p.startDate || p.endDate) && (
                                    <p className="text-[8.5px] font-semibold text-violet-600 dark:text-violet-400">
                                      🗓️ Periode: {p.startDate || 'Mulai Sekarang'} s/d {p.endDate || 'Seterusnya'}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[8px] font-semibold text-slate-400">Penggunaan:</span>
                                    <span className={`text-[8.5px] font-black ${isExpired ? 'text-red-500' : 'text-slate-600 dark:text-slate-350'}`}>
                                      {p.usedCount} / {p.maxUses}
                                    </span>
                                    <div className="h-1 w-16 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden ml-1">
                                      <div 
                                        className={`h-full ${isExpired ? 'bg-red-500' : 'bg-violet-500'}`}
                                        style={{ width: `${Math.min(100, (p.usedCount / p.maxUses) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePromoCode(p.id)}
                                  className="p-2 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition-all cursor-pointer"
                                  title="Hapus Promo"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {portalTab === 'audit' && (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wider mb-1">License Audit Tracker</h4>
                      <p className="text-[10px] font-semibold opacity-80 max-w-sm">
                        Lacak aktivasi kunci produk secara real-time. Anda bisa mencari pengguna atau produk yang telah melakukan validasi dengan menginput email atau key.
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Cari email pengguna atau license key..." 
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-semibold outline-none focus:border-emerald-500 transition-colors"
                    />
                    <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left max-w-full text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">License Key</th>
                          <th className="px-4 py-3 font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">User Email</th>
                          <th className="px-4 py-3 font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Type</th>
                          <th className="px-4 py-3 font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Duration</th>
                          <th className="px-4 py-3 font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Activation Date</th>
                          <th className="px-4 py-3 font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {backendKeys
                          .filter(k => 
                            k.key.toLowerCase().includes(auditSearchQuery.toLowerCase()) || 
                            (k.activatedBy || '').toLowerCase().includes(auditSearchQuery.toLowerCase())
                          )
                          .map((k, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-[10px]">{k.key}</td>
                              <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">{k.activatedBy || 'N/A'}</td>
                              <td className="px-4 py-3 font-semibold text-[10px] text-slate-600 dark:text-slate-300">
                                {k.activated ? (k.duration === 'unlimited' ? 'Unlimited PRO' : (k.duration === '30days' ? '30 Days PRO' : `${k.duration} PRO`)) : 'Free Trial'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-[10px]">
                                {k.activated ? (k.duration === 'unlimited' ? 'Lifetime' : (k.duration === '30days' ? '30 Hari' : `${k.duration}`)) : '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-[10px]">{k.activatedAt ? new Date(k.activatedAt).toLocaleString() : '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${k.activated ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400'}`}>
                                  <span className={`w-1 h-1 rounded-full ${k.activated ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                                  <span>{k.activated ? 'Active' : 'Free Trial'}</span>
                                </span>
                              </td>
                            </tr>
                        ))}
                        {backendKeys.filter(k => k.key.toLowerCase().includes(auditSearchQuery.toLowerCase()) || (k.activatedBy || '').toLowerCase().includes(auditSearchQuery.toLowerCase())).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              Tidak ada data aktivasi yang sesuai pencarian.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 sm:p-10 max-w-2xl w-full shadow-2xl border border-slate-100 dark:border-white/10 flex flex-col relative max-h-[90vh] overflow-y-auto transition-all"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button - Hide if trial expired and not licensed */}
              {(!(trialDaysLeft !== undefined && trialDaysLeft <= 0 && !isLicensed)) && (
                <button 
                  onClick={() => setShowActivation(false)}
                  className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-705 rounded-full cursor-pointer transition-colors z-20"
                >
                  <X size={15} />
                </button>
              )}

              {/* Header Info */}
              <div className="text-center space-y-2 mb-8 relative">
                <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-violet-500/10 via-violet-500/5 to-amber-500/10 text-[#7c3aed] dark:text-violet-400 rounded-2xl flex items-center justify-center shadow-sm mb-4 animate-in fade-in zoom-in duration-300">
                  <Key size={24} className="rotate-45" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {trialDaysLeft !== undefined && trialDaysLeft <= 0 && !isLicensed ? t.activation_modal_title_trial_expired : t.activation_modal_title_normal}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-none">
                  {t.activation_modal_unlock_premium} {appName}
                </p>
                <div className="h-[3px] w-14 bg-gradient-to-r from-violet-600 via-[#7c3aed] to-amber-500 mx-auto rounded-full mt-4" />
              </div>

              {/* Status Display */}
              {isLicensed ? (
                <div className="bg-emerald-555/5 dark:bg-emerald-500/5 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 rounded-3xl p-5 sm:p-6 text-center space-y-4 mb-6">
                  {showCancelConfirm ? (
                    <div className="space-y-4 p-1">
                      <div className="text-red-550 flex justify-center">
                        <AlertTriangle size={28} className="animate-bounce" />
                      </div>
                      <h4 className="font-extrabold uppercase text-xs tracking-wider text-red-500">{t.activation_confirm_stop_title}</h4>
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                        {t.activation_confirm_stop_desc}
                      </p>
                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={handleRemoveLicenseKey}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] rounded-2xl uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          {t.activation_btn_stop_yes}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(false)}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] rounded-2xl uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {t.activation_btn_stop_no}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <CheckCircle2 size={36} className="text-emerald-500 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-black uppercase text-xs tracking-widest text-emerald-500">{t.activation_active_status}</h4>
                        <p className="text-[11px] font-semibold text-slate-650 dark:text-slate-300 mt-2">
                          {t.activation_key_registered} <code className="font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20 dark:text-emerald-400 select-all font-bold">{licenseKey}</code>
                        </p>
                        {subDaysLeft !== undefined && subDaysLeft !== null && (
                          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] py-1.5 px-3 rounded-2xl flex items-center justify-center space-x-1.5 mx-auto w-fit">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            <span>{t.activation_subscription_left} {Math.ceil(subDaysLeft)} {t.activation_days_left}</span>
                          </div>
                        )}
                        <p className="text-[10px] font-medium text-slate-450 dark:text-slate-500 mt-3 leading-relaxed">
                          {t.activation_commercial_notice}
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full py-3 bg-red-650/10 hover:bg-red-600 hover:text-white text-red-600 font-black text-[10px] rounded-2xl uppercase tracking-wider transition-all cursor-pointer border border-red-500/20 shadow-sm flex items-center justify-center space-x-1.5"
                      >
                        <span>{t.activation_btn_unsubscribe}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {trialDaysLeft !== undefined && trialDaysLeft <= 0 ? (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-5 text-center space-y-1.5 shadow-sm animate-pulse">
                      <div className="flex items-center justify-center text-red-505 space-x-1.5 font-black text-[11px] uppercase tracking-wider">
                        <AlertTriangle size={15} className="text-red-500" />
                        <span>{t.activation_trial_expired_hero}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-semibold text-[10.5px] leading-relaxed">
                        {t.activation_trial_expired_desc}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/20 rounded-3xl p-5 text-center space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-center text-amber-600 dark:text-amber-400 space-x-2 font-black text-[11px] uppercase tracking-widest text-center">
                        <AlertTriangle size={14} className="animate-bounce" />
                        <span>
                          {t.activation_trial_active_hero} ({trialDaysLeft !== undefined && trialDaysLeft < 9000 ? `${Math.ceil(trialDaysLeft)} ${t.activation_trial_active_days}` : t.language === 'Bahasa' ? 'Tanpa Batas Hari' : 'No Expiry'})
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-[10.5px] leading-relaxed">
                        {t.activation_trial_active_desc}
                      </p>
                    </div>
                  )}

                  {/* Subscription Plans */}
                  <div className="space-y-3 mt-4 mb-4">
                    <label className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] block text-center sm:text-left">{t.language === 'Bahasa' ? 'PILIH PAKET' : 'CHOOSE PLAN'}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Free Trial */}
                      <div className="border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-[2rem] p-4 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col justify-between transition-all">
                        <div className="space-y-2 text-center">
                          <h5 className="font-extrabold text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none">{t.language === 'Bahasa' ? 'UJI COBA' : 'FREE TRIAL'}</h5>
                          <p className="text-slate-800 dark:text-slate-200 font-black text-sm tracking-tight">{t.language === 'Bahasa' ? 'Gratis' : 'Free'}</p>
                          <ul className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 space-y-2 mt-4 text-left border-t border-slate-150 dark:border-slate-800/80 pt-3">
                            <li className="flex items-start space-x-1.5"><Check size={8} className="text-slate-400 mt-1 shrink-0" /><span>{t.language === 'Bahasa' ? 'Tanpa Batas Hari' : 'Unlimited Trial Days'}</span></li>
                            <li className="flex items-start space-x-1.5"><Check size={8} className="text-slate-400 mt-1 shrink-0" /><span>{t.language === 'Bahasa' ? 'Semua Fitur Terbuka' : 'All Features Unlocked'}</span></li>
                            <li className="flex items-start space-x-1.5"><Check size={8} className="text-slate-400 mt-1 shrink-0" /><span>{t.language === 'Bahasa' ? `Batas ${getDailyLimit()} Generasi / Hari` : `${getDailyLimit()} Generations / Day Limit`}</span></li>
                          </ul>
                        </div>
                      </div>
                      {/* 30 Days Plan */}
                      <div className="border border-[#7c3aed]/50 hover:border-[#7c3aed] rounded-[2rem] p-4 bg-gradient-to-b from-violet-500/[0.04] to-transparent flex flex-col justify-between relative shadow-lg shadow-violet-500/[0.03] hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute top-0 right-4 transform -translate-y-1/2">
                          <span className="bg-[#7c3aed] text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider">Pro</span>
                        </div>
                        <div className="space-y-2 text-center">
                          <h5 className="font-extrabold text-[11px] uppercase tracking-widest text-[#7c3aed] dark:text-violet-400 leading-none">30 DAYS PLAN</h5>
                          <p className="text-[#7c3aed] dark:text-blue-200 font-black text-sm tracking-tight flex flex-col justify-center items-center">
                            {activePromo?.type === 'discount' && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 line-through tracking-tight">
                                {t.language === 'Bahasa' ? price30Days : price30DaysUSD}
                              </span>
                            )}
                            <span className="text-[#7c3aed] dark:text-violet-300 font-black">
                              {t.language === 'Bahasa' 
                                ? (activePromo?.type === 'discount' ? getDiscountedPrice(price30Days, activePromo.value) : price30Days) 
                                : (activePromo?.type === 'discount' ? getDiscountedPrice(price30DaysUSD, activePromo.value) : price30DaysUSD)
                              }
                            </span>
                          </p>
                          <ul className="text-[9.5px] font-bold text-slate-650 dark:text-slate-350 space-y-2 mt-4 text-left border-t border-violet-100 dark:border-violet-950/40 pt-3">
                            <li className="flex items-center space-x-1.5"><Check size={8} className="text-[#7c3aed]" /><span>{t.language === 'Bahasa' ? 'Akses 30 Hari' : '30 Days Access'}</span></li>
                            <li className="flex items-center space-x-1.5"><Check size={8} className="text-[#7c3aed]" /><span>{t.language === 'Bahasa' ? 'Tanpa Batas Harian' : 'Unlimited Limits'}</span></li>
                            <li className="flex items-center space-x-1.5"><Check size={8} className="text-[#7c3aed]" /><span>Premium AI Engine</span></li>
                          </ul>
                        </div>
                      </div>
                      {/* Unlimited Plan */}
                      <div className="border border-amber-500/40 hover:border-amber-500 rounded-[2rem] p-4 bg-gradient-to-b from-amber-500/[0.04] to-transparent flex flex-col justify-between relative shadow-lg shadow-amber-500/[0.02] hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute top-0 right-4 transform -translate-y-1/2">
                          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider">Best</span>
                        </div>
                        <div className="space-y-2 text-center">
                          <h5 className="font-extrabold text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400 leading-none">UNLIMITED</h5>
                          <p className="text-amber-650 dark:text-amber-400 font-black text-sm tracking-tight flex flex-col justify-center items-center">
                            {activePromo?.type === 'discount' && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 line-through tracking-tight">
                                {t.language === 'Bahasa' ? priceUnlimited : priceUnlimitedUSD}
                              </span>
                            )}
                            <span className="text-amber-600 dark:text-amber-400 font-black">
                              {t.language === 'Bahasa' 
                                ? (activePromo?.type === 'discount' ? getDiscountedPrice(priceUnlimited, activePromo.value) : priceUnlimited) 
                                : (activePromo?.type === 'discount' ? getDiscountedPrice(priceUnlimitedUSD, activePromo.value) : priceUnlimitedUSD)
                              }
                            </span>
                          </p>
                          <ul className="text-[9.5px] font-bold text-slate-650 dark:text-slate-350 space-y-2 mt-4 text-left border-t border-amber-100 dark:border-amber-950/40 pt-3">
                            <li className="flex items-center space-x-1.5"><Check size={8} className="text-amber-550 dark:text-amber-450" /><span>{t.language === 'Bahasa' ? 'Akses Selamanya' : 'Lifetime Access'}</span></li>
                            <li className="flex items-center space-x-1.5"><Check size={8} className="text-amber-550 dark:text-amber-450" /><span>{t.language === 'Bahasa' ? 'Tanpa Batas' : 'Unlimited Limits'}</span></li>
                            <li className="flex items-center space-x-1.5"><Check size={8} className="text-amber-555 dark:text-amber-450" /><span>Prioritas Support</span></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="text-[10.5px] font-bold text-slate-600 dark:text-slate-350 flex items-center space-x-2">
                        <div className="w-5 h-5 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
                          <MessageCircle size={12} />
                        </div>
                        <span>{t.language === 'Bahasa' ? 'Beli Lisensi Via WhatsApp:' : 'Buy License via WhatsApp:'}</span>
                      </div>
                      <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:bg-[#20ba56] text-white text-[9.5px] font-black uppercase tracking-wider px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-sm shadow-[#25D366]/10">
                        <MessageCircle size={11} className="fill-white" />
                        <span>WHATSAPP</span>
                      </a>
                    </div>
                  </div>

                  {/* Promo Input Section */}
                  <div className="bg-[#7c3aed]/5 dark:bg-slate-900/30 p-4 rounded-[2rem] border border-violet-500/10 space-y-3 mt-3 shadow-sm">
                    <div className="flex items-center space-x-2 text-[#7c3aed] dark:text-violet-405">
                      <Sparkles size={13} className="animate-pulse text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.language === 'Bahasa' ? 'Miliki Kode Promo / Diskon?' : 'Have a Promo / Discount Code?'}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: PROMO50"
                        value={appliedPromoInput}
                        onChange={(e) => {
                          setAppliedPromoInput(e.target.value.toUpperCase());
                          setPromoApplyError('');
                          setPromoApplySuccess('');
                        }}
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none font-mono font-bold text-xs focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-all uppercase text-[#7c3aed] dark:text-violet-400 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleApplyUserPromoCode}
                        disabled={isApplyingPromo}
                        className="px-5 py-2.5 bg-[#7c3aed] text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-[#6d28d9] transition-colors shrink-0 cursor-pointer disabled:opacity-50 shadow-md shadow-violet-550/10"
                      >
                        {isApplyingPromo ? t.language === 'Bahasa' ? 'Memproses' : 'Processing' : t.language === 'Bahasa' ? 'Terapkan' : 'Apply'}
                      </button>
                    </div>

                    {promoApplyError && (
                      <p className="text-[10px] font-bold text-red-500 dark:text-red-400 pl-2 border-l-2 border-red-500">
                        ⚠️ {promoApplyError}
                      </p>
                    )}

                    {promoApplySuccess && (
                      <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 pl-2 border-l-2 border-emerald-500 animate-bounce">
                        🎉 {promoApplySuccess}
                      </p>
                    )}

                    {activePromo && (
                      <div className="flex items-center justify-between text-[10.5px] text-slate-700 dark:text-slate-300 bg-emerald-500/10 dark:bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/20">
                        <span>Aktif: <strong className="text-emerald-600 dark:text-emerald-400 font-black uppercase text-xs">{activePromo.code}</strong> {activePromo.type === 'discount' ? `(Potongan ${activePromo.value}%)` : `(Akses Premium ${activePromo.value} Hari!)`}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePromo(null);
                            setPromoApplySuccess('');
                          }}
                          className="bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white font-black px-2.5 py-1.5 rounded-lg text-[9px] tracking-wide transition uppercase cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Activation input */}
                  <div className="space-y-2 mt-2 border-t border-slate-100 dark:border-[#1e293b] pt-4">
                    <label className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] block text-center sm:text-left">{t.activation_input_label}</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t.activation_input_placeholder}
                        value={inputKey}
                        onChange={(e) => {
                          setInputKey(e.target.value.toUpperCase());
                          setActivationError('');
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 outline-none font-mono font-bold text-xs focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] transition-all whitespace-nowrap overflow-x-auto text-slate-900 dark:text-slate-100 text-center tracking-wider placeholder:text-slate-400"
                      />
                      <Key size={14} className="text-slate-400 absolute left-3 w-4 h-4 top-[14px] rotate-45" />
                    </div>
                    
                    {activationError && (
                      <p className="text-[10px] font-extrabold text-red-500 border-l-2 border-red-500 pl-2 mt-1.5 uppercase transition-all">
                        ⚠️ {activationError}
                      </p>
                    )}

                    {activationSuccess && (
                      <motion.p 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[10px] font-black text-emerald-500 border-l-2 border-emerald-500 pl-2 mt-1.5 uppercase transition-all"
                      >
                        {t.activation_success_waiting}
                      </motion.p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyLicenseKey}
                    disabled={isActivating || !inputKey.trim()}
                    className="w-full mt-3 py-3.5 bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-violet-600 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-violet-500/10 cursor-pointer"
                  >
                    {isActivating ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    <span>{isActivating ? t.activation_btn_process : t.activation_btn_activate}</span>
                  </button>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-[#1e293b] space-y-3">
                    <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                      {t.language === 'Bahasa' ? 'Perlu Bantuan Aktivasi?' : 'Need Activation Help?'}
                    </h5>
                    <button
                      type="button"
                      onClick={() => window.open(whatsAppLink, '_blank')}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <MessageCircle size={14} />
                      <span>{t.language === 'Bahasa' ? 'Hubungi Support' : 'Contact Support'}</span>
                    </button>
                  </div>

                  {/* Need support details */}
                  <div className="pt-4 border-t border-slate-100 dark:border-[#1e293b] space-y-3">
                    <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                      {t.activation_no_license_title}
                    </h5>
                    
                    {checkoutDataUrl ? (
                      <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-lg">
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          Scan QRIS Untuk Membayar
                        </span>
                        <img src={checkoutDataUrl} alt="QRIS" className="w-48 h-48 rounded-xl shadow-sm border border-slate-200 p-1" />
                        <div className="flex flex-col space-y-2 w-full">
                          <button
                            onClick={checkPaymentStatus}
                            disabled={isCheckoutLoading}
                            className="w-full py-3 bg-emerald-500 text-white font-black text-[11px] rounded-xl uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
                          >
                            {isCheckoutLoading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            <span>{isCheckoutLoading ? 'Mengecek...' : 'Cek Status Pembayaran'}</span>
                          </button>
                          <div className="flex space-x-2 w-full">
                             <a
                              href={checkoutUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2.5 bg-[#7c3aed] text-white font-black text-[10px] rounded-xl uppercase tracking-wider text-center"
                             >
                               Buka Link
                             </a>
                             <button
                              onClick={() => { setCheckoutUrl(''); setCheckoutDataUrl(''); }}
                              className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] rounded-xl uppercase tracking-wider"
                             >
                               Batal
                             </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-violet-500/[0.03] hover:bg-violet-500/[0.05] border border-violet-500/10 rounded-2xl flex flex-col items-center text-center space-y-1.5 transition-all">
                          <Gift size={18} className="text-[#7c3aed] animate-bounce" />
                          <span className="text-[11px] font-black text-[#7c3aed] dark:text-violet-400 uppercase tracking-widest">{t.activation_personal_activation}</span>
                          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">{t.activation_license_price} <strong className="text-slate-800 dark:text-white">{activePromo?.type === 'discount' ? getDiscountedPrice(pricingTier, activePromo.value) : pricingTier}</strong></span>
                          <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">{tempPayInfo}</span>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                          {pakasirProject && pakasirApiKey && (
                            <div className="flex gap-2 w-full">
                              <button
                                onClick={() => {
                                  const match = price30Days.replace(/\./g, '').match(/\d+/);
                                  let amount = match ? parseInt(match[0], 10) : 50000;
                                  if (amount < 500) amount = amount * 16000;
                                  if (activePromo?.type === 'discount') {
                                    amount = Math.floor(amount - (amount * (activePromo.value / 100)));
                                  }
                                  handleCheckoutWithPakasir(amount, "Subscription 30 Days");
                                }}
                                disabled={isCheckoutLoading}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isCheckoutLoading ? <RefreshCw size={15} className="animate-spin" /> : <CreditCard size={15} />}
                                <span>{isCheckoutLoading ? 'Wait' : 'QRIS 30 Hari'}</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  const match = priceUnlimited.replace(/\./g, '').match(/\d+/);
                                  let amount = match ? parseInt(match[0], 10) : 250000;
                                  if (amount < 500) amount = amount * 16000;
                                  if (activePromo?.type === 'discount') {
                                    amount = Math.floor(amount - (amount * (activePromo.value / 100)));
                                  }
                                  handleCheckoutWithPakasir(amount, "Subscription Unlimited");
                                }}
                                disabled={isCheckoutLoading}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isCheckoutLoading ? <RefreshCw size={15} className="animate-spin" /> : <CreditCard size={15} />}
                                <span>{isCheckoutLoading ? 'Wait' : 'QRIS Unlimited'}</span>
                              </button>
                            </div>
                          )}
                          <a
                            href={`${whatsAppLink}?text=Halo%20Admin%2C%20saya%20tertarik%20membeli%20lisensi%20aktif%20SaaS%20${encodeURIComponent(appName)}%20premium.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/15"
                          >
                            <MessageCircle size={15} className="animate-pulse" />
                            <span>{t.activation_buy_whatsapp}</span>
                          </a>
                        </div>
                      </>
                    )}
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
