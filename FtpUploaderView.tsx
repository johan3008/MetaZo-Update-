import React, { useState, useEffect, useRef } from 'react';
import { 
  Crown, Server, UploadCloud, CheckCircle2, AlertCircle, Loader2, Play, Trash2, 
  Key, Lock, Unlock, Globe, RefreshCw, FileUp, FileText, Check, X, 
  ExternalLink, ShieldCheck, Eye, EyeOff, HelpCircle, FolderUp, 
  HardDrive, Sparkles, Layers, ArrowRight, ShieldAlert, FileImage, 
  FileVideo, FileCode, CheckSquare, Square, Download, Upload, Cpu, Zap,
  Activity, CheckCircle, Clock, PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FtpAccountConfig, FtpUploadJobItem, FtpProtocol } from '@/types';

interface FtpUploaderViewProps {
  t: any;
  isLicensed?: boolean;
  onNavigateToMetadata?: () => void;
  uiLanguage?: 'id' | 'en';
  setShowActivationModal?: (show: boolean) => void;
}

export const DEFAULT_FTP_ACCOUNTS: FtpAccountConfig[] = [
  {
    id: 'adobestock',
    agencyKey: 'adobestock',
    agencyName: 'Adobe Stock',
    host: 'sftp.contributor.adobestock.com',
    port: 22,
    protocol: 'sftp',
    username: '',
    password: '',
    remoteDir: '/',
    enabled: true
  },
  {
    id: 'shutterstock',
    agencyKey: 'shutterstock',
    agencyName: 'Shutterstock',
    host: 'ftp.shutterstock.com',
    port: 21,
    protocol: 'ftp',
    username: '',
    password: '',
    remoteDir: '/',
    enabled: true
  },
  {
    id: 'freepik',
    agencyKey: 'freepik',
    agencyName: 'Freepik',
    host: 'ftp.freepik.com',
    port: 21,
    protocol: 'ftp',
    username: '',
    password: '',
    remoteDir: '/',
    enabled: true
  },
  {
    id: 'dreamstime',
    agencyKey: 'dreamstime',
    agencyName: 'Dreamstime',
    host: 'upload.dreamstime.com',
    port: 21,
    protocol: 'ftp',
    username: '',
    password: '',
    remoteDir: '/',
    enabled: false
  },
  {
    id: 'pond5',
    agencyKey: 'pond5',
    agencyName: 'Pond5',
    host: 'ftp.pond5.com',
    port: 21,
    protocol: 'ftp',
    username: '',
    password: '',
    remoteDir: '/',
    enabled: false
  },
  {
    id: '123rf',
    agencyKey: '123rf',
    agencyName: '123RF',
    host: 'ftp.123rf.com',
    port: 21,
    protocol: 'ftp',
    username: '',
    password: '',
    remoteDir: '/',
    enabled: false
  },
  {
    id: 'depositphotos',
    agencyKey: 'depositphotos',
    agencyName: 'Depositphotos',
    host: 'ftp.depositphotos.com',
    port: 21,
    protocol: 'ftp',
    username: '',
    password: '',
    remoteDir: '/',
    enabled: false
  }
];

const AGENCY_META: Record<string, { badgeColor: string; textColor: string; borderColor: string; iconEmoji: string; protocolTag: string }> = {
  adobestock: {
    badgeColor: 'bg-rose-500/10 dark:bg-rose-500/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-500/30',
    iconEmoji: '🔴',
    protocolTag: 'SFTP Port 22'
  },
  shutterstock: {
    badgeColor: 'bg-red-500/10 dark:bg-red-500/20',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-500/30',
    iconEmoji: '🟥',
    protocolTag: 'FTP Port 21'
  },
  freepik: {
    badgeColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/30',
    iconEmoji: '🔷',
    protocolTag: 'FTP Port 21'
  },
  dreamstime: {
    badgeColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
    iconEmoji: '🟢',
    protocolTag: 'FTP Port 21'
  },
  pond5: {
    badgeColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
    iconEmoji: '🟡',
    protocolTag: 'FTP Port 21'
  },
  '123rf': {
    badgeColor: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: 'border-indigo-500/30',
    iconEmoji: '🟣',
    protocolTag: 'FTP Port 21'
  },
  depositphotos: {
    badgeColor: 'bg-violet-500/10 dark:bg-violet-500/20',
    textColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-500/30',
    iconEmoji: '🟣',
    protocolTag: 'FTP Port 21'
  }
};

export const FtpUploaderView: React.FC<FtpUploaderViewProps> = ({
  t,
  isLicensed = false,
  onNavigateToMetadata,
  uiLanguage = 'id',
  setShowActivationModal
}) => {
  const isIndo = uiLanguage === 'id';
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'upload' | 'settings' | 'guide'>('upload');
  
  // Accounts state
  const [accounts, setAccounts] = useState<FtpAccountConfig[]>(() => {
    try {
      const saved = localStorage.getItem('mz_ftp_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return DEFAULT_FTP_ACCOUNTS.map(def => {
            const found = parsed.find((p: any) => p.id === def.id || p.agencyKey === def.agencyKey);
            return found ? { ...def, ...found } : def;
          });
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved FTP accounts", e);
    }
    return DEFAULT_FTP_ACCOUNTS;
  });

  // Show / hide passwords map
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Connection testing state
  const [testingMap, setTestingMap] = useState<Record<string, 'testing' | 'success' | 'error'>>({});
  const [testMessageMap, setTestMessageMap] = useState<Record<string, string>>({});

  // Files queue
  const [uploadQueue, setUploadQueue] = useState<FtpUploadJobItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Global multi-agency selection for new files
  const [selectedAgenciesForUpload, setSelectedAgenciesForUpload] = useState<string[]>(() => {
    return ['adobestock', 'shutterstock', 'freepik'];
  });

  // Custom Account Modal / Add state
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customAgencyName, setCustomAgencyName] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [customPort, setCustomPort] = useState(21);
  const [customProtocol, setCustomProtocol] = useState<FtpProtocol>('ftp');
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [customRemoteDir, setCustomRemoteDir] = useState('/');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mz_ftp_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.warn("Failed to persist FTP accounts", e);
    }
  }, [accounts]);

  const updateAccountField = (id: string, field: keyof FtpAccountConfig, val: any) => {
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, [field]: val } : acc));
  };

  const toggleAgencySelectedGlobal = (agencyKey: string) => {
    setSelectedAgenciesForUpload(prev => 
      prev.includes(agencyKey) ? prev.filter(k => k !== agencyKey) : [...prev, agencyKey]
    );
  };

  // Test FTP Connection
  const handleTestConnection = async (acc: FtpAccountConfig) => {
    if (!isLicensed) {
      setShowActivationModal?.(true);
      return;
    }
    if (!acc.host || !acc.username || !acc.password) {
      setTestingMap(prev => ({ ...prev, [acc.id]: 'error' }));
      setTestMessageMap(prev => ({ 
        ...prev, 
        [acc.id]: isIndo ? 'Host, Username, & Password wajib diisi.' : 'Host, Username, & Password are required.' 
      }));
      return;
    }

    setTestingMap(prev => ({ ...prev, [acc.id]: 'testing' }));
    setTestMessageMap(prev => ({ ...prev, [acc.id]: isIndo ? 'Menghubungkan ke server...' : 'Connecting to server...' }));

    try {
      const res = await fetch('/api/ftp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: acc.host,
          port: acc.port,
          protocol: acc.protocol,
          username: acc.username,
          password: acc.password,
          remoteDir: acc.remoteDir || '/'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestingMap(prev => ({ ...prev, [acc.id]: 'success' }));
        setTestMessageMap(prev => ({ ...prev, [acc.id]: data.message || (isIndo ? 'Koneksi Berhasil!' : 'Connection Successful!') }));
      } else {
        setTestingMap(prev => ({ ...prev, [acc.id]: 'error' }));
        setTestMessageMap(prev => ({ ...prev, [acc.id]: data.error || (isIndo ? 'Koneksi Gagal.' : 'Connection Failed.') }));
      }
    } catch (err: any) {
      setTestingMap(prev => ({ ...prev, [acc.id]: 'error' }));
      setTestMessageMap(prev => ({ ...prev, [acc.id]: err.message || (isIndo ? 'Gagal menghubungi server backend lokal.' : 'Backend connection error.') }));
    }
  };

  // File Drop & Select Handler
  const handleFilesAdded = (filesList: FileList | File[]) => {
    const newItems: FtpUploadJobItem[] = [];
    const enabledAgencies = accounts.filter(a => a.enabled && a.username && a.password).map(a => a.agencyKey);
    const targetAgencies = selectedAgenciesForUpload.length > 0 
      ? selectedAgenciesForUpload 
      : (enabledAgencies.length > 0 ? enabledAgencies : ['adobestock']);

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const agencyStatusMap: Record<string, 'pending' | 'uploading' | 'success' | 'error'> = {};
      const agencyErrorsMap: Record<string, string> = {};

      targetAgencies.forEach(key => {
        agencyStatusMap[key] = 'pending';
      });

      newItems.push({
        id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        filename: file.name,
        fileSize: file.size,
        targetAgencies: [...targetAgencies],
        status: 'pending',
        progress: 0,
        agencyStatus: agencyStatusMap,
        agencyErrors: agencyErrorsMap,
        createdAt: new Date().toISOString()
      });
    }

    setUploadQueue(prev => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeQueueItem = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearCompletedQueue = () => {
    setUploadQueue(prev => prev.filter(item => item.status !== 'success'));
  };

  const clearAllQueue = () => {
    if (isUploading) {
      if (confirm(isIndo ? 'Proses upload sedang berjalan. Yakin ingin membatalkan dan menghapus antrian?' : 'Upload in progress. Cancel and clear queue?')) {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setIsUploading(false);
        setActiveUploadId(null);
        setUploadQueue([]);
      }
    } else {
      setUploadQueue([]);
    }
  };

  // Upload runner
  const startUploadQueue = async () => {
    if (isUploading) return;
    const pendingJobs = uploadQueue.filter(j => j.status === 'pending' || j.status === 'error');
    if (pendingJobs.length === 0) {
      alert(isIndo ? 'Tidak ada file dalam antrian yang siap diunggah.' : 'No files in queue ready for upload.');
      return;
    }

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    for (const job of uploadQueue) {
      if (job.status === 'success') continue;

      setActiveUploadId(job.id);
      setUploadQueue(prev => prev.map(item => item.id === job.id ? { ...item, status: 'uploading', progress: 5 } : item));

      let overallSuccess = true;
      let anyUploaded = false;

      for (const agencyKey of job.targetAgencies) {
        const account = accounts.find(a => a.agencyKey === agencyKey);
        if (!account || !account.username || !account.password) {
          setUploadQueue(prev => prev.map(item => {
            if (item.id !== job.id) return item;
            return {
              ...item,
              agencyStatus: { ...item.agencyStatus, [agencyKey]: 'error' },
              agencyErrors: { ...item.agencyErrors, [agencyKey]: isIndo ? 'Kredensial belum diisi' : 'Missing credentials' }
            };
          }));
          overallSuccess = false;
          continue;
        }

        // Set agency status uploading
        setUploadQueue(prev => prev.map(item => {
          if (item.id !== job.id) return item;
          return {
            ...item,
            agencyStatus: { ...item.agencyStatus, [agencyKey]: 'uploading' }
          };
        }));

        try {
          const formData = new FormData();
          formData.append('file', job.file);
          formData.append('host', account.host);
          formData.append('port', String(account.port));
          formData.append('protocol', account.protocol);
          formData.append('username', account.username);
          formData.append('password', account.password);
          formData.append('remoteDir', account.remoteDir || '/');

          const response = await fetch('/api/ftp/upload', {
            method: 'POST',
            body: formData,
            signal: abortControllerRef.current?.signal
          });

          const data = await response.json();

          if (response.ok && data.success) {
            anyUploaded = true;
            setUploadQueue(prev => prev.map(item => {
              if (item.id !== job.id) return item;
              return {
                ...item,
                agencyStatus: { ...item.agencyStatus, [agencyKey]: 'success' }
              };
            }));
          } else {
            overallSuccess = false;
            setUploadQueue(prev => prev.map(item => {
              if (item.id !== job.id) return item;
              return {
                ...item,
                agencyStatus: { ...item.agencyStatus, [agencyKey]: 'error' },
                agencyErrors: { ...item.agencyErrors, [agencyKey]: data.error || 'Upload error' }
              };
            }));
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsUploading(false);
            setActiveUploadId(null);
            return;
          }
          overallSuccess = false;
          setUploadQueue(prev => prev.map(item => {
            if (item.id !== job.id) return item;
            return {
              ...item,
              agencyStatus: { ...item.agencyStatus, [agencyKey]: 'error' },
              agencyErrors: { ...item.agencyErrors, [agencyKey]: err.message || 'Koneksi gagal' }
            };
          }));
        }
      }

      setUploadQueue(prev => prev.map(item => {
        if (item.id !== job.id) return item;
        return {
          ...item,
          status: overallSuccess ? 'success' : (anyUploaded ? 'partial' : 'error'),
          progress: 100
        };
      }));
    }

    setIsUploading(false);
    setActiveUploadId(null);
  };

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAgencyName || !customHost || !customUsername) return;

    const newKey = customAgencyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newAcc: FtpAccountConfig = {
      id: `custom_${Date.now()}`,
      agencyKey: newKey,
      agencyName: customAgencyName,
      host: customHost,
      port: customPort,
      protocol: customProtocol,
      username: customUsername,
      password: customPassword,
      remoteDir: customRemoteDir || '/',
      enabled: true
    };

    setAccounts(prev => [...prev, newAcc]);
    setShowAddCustomModal(false);
    setCustomAgencyName('');
    setCustomHost('');
    setCustomPort(21);
    setCustomProtocol('ftp');
    setCustomUsername('');
    setCustomPassword('');
    setCustomRemoteDir('/');
  };

  const deleteCustomAccount = (id: string) => {
    if (confirm(isIndo ? 'Hapus konfigurasi akun FTP ini?' : 'Delete this FTP configuration?')) {
      setAccounts(prev => prev.filter(a => a.id !== id));
    }
  };

  // Helper file icon
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext || '')) {
      return <FileImage className="text-violet-500 shrink-0" size={20} />;
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
      return <FileVideo className="text-pink-500 shrink-0" size={20} />;
    }
    if (['eps', 'svg', 'ai', 'pdf'].includes(ext || '')) {
      return <FileCode className="text-amber-500 shrink-0" size={20} />;
    }
    return <FileText className="text-slate-400 shrink-0" size={20} />;
  };

  // Stats calculation
  const totalFiles = uploadQueue.length;
  const successFiles = uploadQueue.filter(j => j.status === 'success').length;
  const pendingFiles = uploadQueue.filter(j => j.status === 'pending' || j.status === 'uploading').length;
  const configuredAccountsCount = accounts.filter(a => a.enabled && a.username && a.password).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      
      {/* 1. Header Banner matching MetaZo PRO Design Language */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 dark:from-slate-900 dark:via-slate-900/95 dark:to-violet-950/40 p-6 sm:p-8 border border-slate-800 dark:border-white/5 shadow-2xl">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-[#7c3aed] to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/25 text-white ring-4 ring-violet-500/10 shrink-0">
              <UploadCloud size={28} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 font-extrabold uppercase tracking-widest text-[9px]">
                  SFTP & FTP TLS
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-extrabold uppercase tracking-widest text-[9px] flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{configuredAccountsCount} {isIndo ? 'Agensi Terkonfigurasi' : 'Agencies Configured'}</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1.5">
                Auto FTP & SFTP Stock Uploader
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-2xl mt-1 leading-relaxed">
                {isIndo 
                  ? 'Unggah otomatis batch file (Gambar, Video, Vektor, CSV) ke Adobe Stock (SFTP Port 22), Shutterstock, Freepik, dan agensi microstock lainnya sekaligus.'
                  : 'Automate direct batch uploads (Images, Footage, Vectors, CSV) to Adobe Stock (SFTP Port 22), Shutterstock, Freepik, and microstock agencies in one click.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 shadow-sm"
            >
              <Key size={14} className="text-amber-400" />
              <span>{isIndo ? 'Kelola Kredensial' : 'Manage Keys'}</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className="px-4 py-2.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2"
            >
              <HelpCircle size={14} className="text-violet-400" />
              <span>{isIndo ? 'Panduan FTP' : 'FTP Guide'}</span>
            </button>
          </div>
        </div>

        {/* 4 Mini Metrics Row matching MetaZo MetricsRow */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 dark:border-white/5">
          <div className="bg-slate-800/40 dark:bg-slate-950/40 backdrop-blur-md rounded-2xl p-3.5 border border-white/5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{isIndo ? 'Total File Antrean' : 'Queue Files'}</p>
            <p className="text-xl font-black text-white mt-1">{totalFiles}</p>
          </div>
          <div className="bg-slate-800/40 dark:bg-slate-950/40 backdrop-blur-md rounded-2xl p-3.5 border border-white/5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">{isIndo ? 'Siap Diunggah' : 'Pending'}</p>
            <p className="text-xl font-black text-amber-400 mt-1">{pendingFiles}</p>
          </div>
          <div className="bg-slate-800/40 dark:bg-slate-950/40 backdrop-blur-md rounded-2xl p-3.5 border border-white/5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">{isIndo ? 'Berhasil Terkirim' : 'Completed'}</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{successFiles}</p>
          </div>
          <div className="bg-slate-800/40 dark:bg-slate-950/40 backdrop-blur-md rounded-2xl p-3.5 border border-white/5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400">{isIndo ? 'Agensi Aktif' : 'Active Portals'}</p>
            <p className="text-xl font-black text-violet-400 mt-1">{accounts.filter(a => a.enabled).length}</p>
          </div>
        </div>
      </div>

      {/* 2. Top Pill Tabs Navigation */}
      <div className="flex bg-slate-100 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner w-fit max-w-full overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'upload'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/80 font-bold'
          }`}
        >
          <UploadCloud size={15} />
          <span>{isIndo ? '🚀 Batch Auto Uploader' : '🚀 Batch Auto Uploader'}</span>
          {totalFiles > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeTab === 'upload' ? 'bg-white/20 text-white' : 'bg-violet-500/20 text-violet-400'}`}>
              {totalFiles}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/80 font-bold'
          }`}
        >
          <Key size={15} />
          <span>{isIndo ? '⚙️ Pengaturan Akun FTP / SFTP' : '⚙️ FTP / SFTP Accounts'}</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === 'guide'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/80 font-bold'
          }`}
        >
          <HelpCircle size={15} />
          <span>{isIndo ? '📖 Panduan Kredensial Agensi' : '📖 Agency Credentials Guide'}</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      <AnimatePresence mode="wait">
      {/* PRO / SUBSCRIPTION ACTIVATION GATE */}
      {!isLicensed && activeTab !== 'guide' ? (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-900 to-indigo-950/80 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/60 p-8 sm:p-12 border border-amber-500/30 shadow-2xl text-center space-y-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider shadow-sm">
              <Crown size={14} className="text-amber-400 animate-bounce" />
              <span>{isIndo ? 'Fitur Eksklusif PRO & Berlangganan' : 'Exclusive PRO & Subscriber Feature'}</span>
            </div>

            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30 text-slate-950 ring-8 ring-amber-500/10">
              <Lock size={36} strokeWidth={2.5} />
            </div>

            <div className="space-y-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {isIndo ? 'Akses Auto FTP & SFTP Uploader Terkunci' : 'FTP & SFTP Auto Uploader Locked'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl mx-auto">
                {isIndo
                  ? 'Otomatisasi pengiriman aset visual (Foto, Video 4K, Vektor EPS/SVG, & File CSV) langsung ke Adobe Stock (SFTP Port 22), Shutterstock, Freepik, dan agensi lainnya secara paralel hanya tersedia untuk pengguna Akun Pro / Berlangganan.'
                  : 'Automated direct multi-agency uploading (Photos, 4K Footage, Vectors, & CSV) to Adobe Stock (SFTP Port 22), Shutterstock, Freepik, and other stock portals is exclusively available for Pro accounts.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                  <Zap size={14} />
                  <span>{isIndo ? 'Multi-Agency Concurrent Upload' : 'Multi-Agency Upload'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {isIndo ? 'Kirim batch file ke banyak agensi sekaligus dalam 1 kali klik.' : 'Dispatch batch files to multiple agencies simultaneously.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck size={14} />
                  <span>{isIndo ? 'Dukungan SFTP Port 22 & TLS' : 'SFTP Port 22 & TLS Support'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {isIndo ? 'Kompatibel penuh dengan SFTP Adobe Stock & FTP TLS Shutterstock.' : 'Fully compatible with Adobe Stock SFTP & Shutterstock TLS.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center space-x-2 text-violet-400 font-bold text-xs">
                  <Layers size={14} />
                  <span>{isIndo ? 'Antrean Batch Tanpa Batas' : 'Unlimited Batch Queue'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {isIndo ? 'Upload puluhan hingga ratusan aset tanpa kuota harian.' : 'Upload large batches without daily limits.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                  <Key size={14} />
                  <span>{isIndo ? 'Kredensial Aman di Komputer Anda' : 'Secure Local Credentials'}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {isIndo ? 'Password dan host tersimpan lokal dengan keamanan terenkripsi.' : 'Credentials securely stored on your local device.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowActivationModal?.(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <Crown size={16} />
                <span>{isIndo ? 'Aktivasi Lisensi PRO Sekarang' : 'Activate PRO License Now'}</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <HelpCircle size={15} />
                <span>{isIndo ? 'Baca Panduan Kredensial FTP' : 'Read FTP Setup Guide'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (<>
        
        {/* ======================= TAB 1: BATCH AUTO UPLOADER ======================= */}
        {activeTab === 'upload' && (
          <motion.div
            key="tab-upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Target Agencies Quick Selector Strip */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/5 rounded-3xl p-5 shadow-xl shadow-slate-900/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                    <Sparkles size={14} className="text-violet-500" />
                    <span>{isIndo ? 'Target Agensi Pengunggahan Global' : 'Global Target Agencies'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {isIndo ? 'File yang baru ditambahkan akan otomatis diunggah ke semua agensi yang dicentang di bawah ini.' : 'New files added to queue will target the selected microstock agencies below.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    const allKeys = accounts.filter(a => a.enabled).map(a => a.agencyKey);
                    if (selectedAgenciesForUpload.length === allKeys.length) {
                      setSelectedAgenciesForUpload([]);
                    } else {
                      setSelectedAgenciesForUpload(allKeys);
                    }
                  }}
                  className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 hover:underline uppercase tracking-wider cursor-pointer"
                >
                  {selectedAgenciesForUpload.length === accounts.filter(a => a.enabled).length 
                    ? (isIndo ? 'Batal Pilih Semua' : 'Deselect All') 
                    : (isIndo ? 'Pilih Semua Agensi' : 'Select All Agencies')}
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {accounts.filter(a => a.enabled).map(acc => {
                  const isSelected = selectedAgenciesForUpload.includes(acc.agencyKey);
                  const meta = AGENCY_META[acc.agencyKey] || { badgeColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20', iconEmoji: '🌐', protocolTag: acc.protocol.toUpperCase() };
                  const isConfigured = !!(acc.username && acc.password);

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleAgencySelectedGlobal(acc.agencyKey)}
                      className={`px-3.5 py-2.5 rounded-2xl border text-xs font-extrabold transition-all flex items-center space-x-2.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/20 scale-[1.02]' 
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-violet-400/50'
                      }`}
                    >
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="opacity-40" />}
                      <span>{acc.agencyName}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${isSelected ? 'bg-white/20 text-white' : meta.textColor + ' bg-slate-200 dark:bg-slate-900'}`}>
                        {acc.protocol.toUpperCase()}
                      </span>
                      {!isConfigured && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20" title={isIndo ? 'Kredensial belum diisi' : 'Missing credentials'} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drop Zone Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-[2rem] p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 group overflow-hidden ${
                isDragOver
                  ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700/80 bg-white/50 dark:bg-slate-900/40 hover:border-violet-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesAdded(e.target.files);
                  }
                }}
              />

              <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 via-[#7c3aed] to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-violet-500/20 group-hover:scale-110 transition-transform">
                  <FolderUp size={30} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {isIndo ? 'Tarik & Letakkan File atau Klik untuk Memilih' : 'Drag & Drop Files or Click to Browse'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                    {isIndo 
                      ? 'Mendukung gambar (.jpg, .png, .webp), footage video (.mp4, .mov), vektor (.eps, .svg), dan metadata (.csv).'
                      : 'Supports images (.jpg, .png, .webp), video footage (.mp4, .mov), vectors (.eps, .svg), and metadata (.csv).'}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    JPG / PNG / WEBP
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    MP4 / MOV
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    EPS / SVG / AI
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    CSV METADATA
                  </span>
                </div>
              </div>
            </div>

            {/* Queue Management Bar & Upload Runner */}
            {uploadQueue.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/5 rounded-3xl p-5 shadow-xl shadow-slate-900/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-violet-500 animate-pulse" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {isIndo ? 'Daftar Antrean Unggahan' : 'Upload Queue List'} ({uploadQueue.length} {isIndo ? 'File' : 'Files'})
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                    <button
                      onClick={clearCompletedQueue}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      {isIndo ? 'Bersihkan Sukses' : 'Clear Done'}
                    </button>
                    <button
                      onClick={clearAllQueue}
                      className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5"
                    >
                      <Trash2 size={13} />
                      <span>{isIndo ? 'Kosongkan Semua' : 'Clear All'}</span>
                    </button>
                    
                    <button
                      onClick={startUploadQueue}
                      disabled={isUploading || pendingFiles === 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>{isIndo ? 'Mengunggah Antrean...' : 'Uploading Queue...'}</span>
                        </>
                      ) : (
                        <>
                          <Play size={15} className="fill-current" />
                          <span>{isIndo ? 'Mulai Upload Semua' : 'Start Batch Upload'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Queue Items List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[480px] overflow-y-auto pr-1">
                  {uploadQueue.map((job) => {
                    const isJobActive = activeUploadId === job.id;
                    const formatBytes = (bytes: number) => {
                      if (bytes === 0) return '0 B';
                      const k = 1024;
                      const sizes = ['B', 'KB', 'MB', 'GB'];
                      const i = Math.floor(Math.log(bytes) / Math.log(k));
                      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                    };

                    return (
                      <div key={job.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                        
                        {/* File details */}
                        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                            {getFileIcon(job.filename)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate" title={job.filename}>
                              {job.filename}
                            </p>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                              <span>{formatBytes(job.fileSize)}</span>
                              <span>•</span>
                              <span>{job.targetAgencies.length} {isIndo ? 'Agensi Tujuan' : 'Agencies'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Agency status badges */}
                        <div className="flex items-center flex-wrap gap-1.5 sm:max-w-md justify-start sm:justify-end">
                          {job.targetAgencies.map((agencyKey) => {
                            const agencyStatus = job.agencyStatus[agencyKey] || 'pending';
                            const agencyError = job.agencyErrors[agencyKey];
                            const meta = AGENCY_META[agencyKey] || { badgeColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20', iconEmoji: '🌐', protocolTag: 'FTP' };
                            const acc = accounts.find(a => a.agencyKey === agencyKey);
                            const label = acc?.agencyName || agencyKey;

                            return (
                              <div
                                key={agencyKey}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center space-x-1.5 ${
                                  agencyStatus === 'success'
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : agencyStatus === 'uploading'
                                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                                    : agencyStatus === 'error'
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                                title={agencyError || agencyStatus}
                              >
                                {agencyStatus === 'uploading' && <Loader2 size={11} className="animate-spin" />}
                                {agencyStatus === 'success' && <CheckCircle2 size={11} />}
                                {agencyStatus === 'error' && <AlertCircle size={11} />}
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => removeQueueItem(job.id)}
                            disabled={isJobActive}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-25"
                            title={isIndo ? 'Hapus dari antrean' : 'Remove from queue'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ======================= TAB 2: SETTINGS (FTP ACCOUNTS) ======================= */}
        {activeTab === 'settings' && (
          <motion.div
            key="tab-settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header Description & Add Custom Server */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 shadow-xl shadow-slate-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {isIndo ? 'Konfigurasi Akun & Kredensial Agensi Stok' : 'Microstock Agency Accounts & Credentials'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xl mt-0.5">
                  {isIndo 
                    ? 'Data kredensial Anda disimpan secara lokal dan aman di browser komputer Anda. Gunakan tombol "Tes Koneksi" untuk memverifikasi handshake server.'
                    : 'Credentials are encrypted and stored locally in your browser. Use "Test Connection" to verify real-time handshake.'}
                </p>
              </div>

              <button
                onClick={() => setShowAddCustomModal(true)}
                className="px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-500/20 transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>{isIndo ? '+ Tambah Custom Server' : '+ Add Custom Server'}</span>
              </button>
            </div>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {accounts.map((acc) => {
                const isTesting = testingMap[acc.id] === 'testing';
                const testStatus = testingMap[acc.id];
                const testMsg = testMessageMap[acc.id];
                const isShowPass = showPasswordMap[acc.id] || false;
                const meta = AGENCY_META[acc.agencyKey] || { badgeColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-slate-500/20', iconEmoji: '🌐', protocolTag: acc.protocol.toUpperCase() };

                return (
                  <div
                    key={acc.id}
                    className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border rounded-3xl p-6 shadow-xl shadow-slate-900/5 space-y-4 transition-all ${
                      acc.enabled ? 'border-slate-200 dark:border-slate-800' : 'opacity-60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{meta.iconEmoji}</span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {acc.agencyName}
                          </h4>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${meta.badgeColor} ${meta.textColor}`}>
                            {meta.protocolTag}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {acc.id.startsWith('custom_') && (
                          <button
                            onClick={() => deleteCustomAccount(acc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                            title={isIndo ? 'Hapus' : 'Delete'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acc.enabled}
                            onChange={(e) => updateAccountField(acc.id, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7c3aed]"></div>
                        </label>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                            Host / Server
                          </label>
                          <input
                            type="text"
                            value={acc.host}
                            onChange={(e) => updateAccountField(acc.id, 'host', e.target.value)}
                            placeholder="sftp.example.com"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                            Port
                          </label>
                          <input
                            type="number"
                            value={acc.port}
                            onChange={(e) => updateAccountField(acc.id, 'port', parseInt(e.target.value) || 21)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                          {isIndo ? 'Username / Contributor ID' : 'Username / Contributor ID'}
                        </label>
                        <input
                          type="text"
                          value={acc.username}
                          onChange={(e) => updateAccountField(acc.id, 'username', e.target.value)}
                          placeholder={isIndo ? 'Masukkan Contributor ID / Username' : 'Enter Contributor ID / Username'}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                          {isIndo ? 'Password / FTP Key' : 'Password / FTP Key'}
                        </label>
                        <div className="relative">
                          <input
                            type={isShowPass ? 'text' : 'password'}
                            value={acc.password}
                            onChange={(e) => updateAccountField(acc.id, 'password', e.target.value)}
                            placeholder={isIndo ? 'Masukkan Password FTP' : 'Enter FTP Password'}
                            className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordMap(prev => ({ ...prev, [acc.id]: !isShowPass }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {isShowPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Test Connection Button & Message */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(acc)}
                          disabled={isTesting}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                        >
                          {isTesting ? <Loader2 size={13} className="animate-spin text-violet-500" /> : <RefreshCw size={13} />}
                          <span>{isTesting ? (isIndo ? 'Menguji...' : 'Testing...') : (isIndo ? '🔌 Tes Koneksi' : '🔌 Test Connection')}</span>
                        </button>

                        {testStatus === 'success' && (
                          <span className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                            <CheckCircle size={13} />
                            <span>{isIndo ? 'Terhubung' : 'Connected'}</span>
                          </span>
                        )}
                        {testStatus === 'error' && (
                          <span className="text-[11px] font-bold text-rose-500 flex items-center space-x-1">
                            <AlertCircle size={13} />
                            <span>{isIndo ? 'Gagal' : 'Failed'}</span>
                          </span>
                        )}
                      </div>

                      {testMsg && (
                        <p className={`text-[10px] font-semibold leading-relaxed p-2 rounded-xl border ${
                          testStatus === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {testMsg}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ======================= TAB 3: GUIDE ======================= */}
        {activeTab === 'guide' && (
          <motion.div
            key="tab-guide"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center space-x-2">
                  <HelpCircle size={20} className="text-violet-500" />
                  <span>{isIndo ? 'Panduan Lengkap Kredensial FTP / SFTP Agensi Mikrostock' : 'Complete Microstock Agency FTP / SFTP Guide'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {isIndo 
                    ? 'Berikut langkah resmi untuk mendapatkan ID Pengunggah & Password FTP dari masing-masing portal kontributor:' 
                    : 'Official steps to obtain your FTP Uploader ID and Password from agency contributor dashboards:'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Adobe Stock */}
                <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🔴</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Adobe Stock (SFTP)</h4>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                    <li>Buka portal <a href="https://contributor.stock.adobe.com" target="_blank" rel="noreferrer" className="text-rose-500 font-bold underline">Adobe Stock Contributor</a>.</li>
                    <li>Klik menu <strong>Unggah (Upload)</strong> di bagian atas.</li>
                    <li>Pilih tab <strong>SFTP</strong>.</li>
                    <li>Salin <strong>Contributor ID</strong> Anda (sebagai Username) dan klik <strong>Generate Password</strong> untuk membuat Password SFTP.</li>
                    <li>Adobe Stock menggunakan <strong>SFTP Port 22</strong> (bukan FTP biasa).</li>
                  </ol>
                </div>

                {/* Shutterstock */}
                <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🟥</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Shutterstock (FTP)</h4>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                    <li>Masuk ke <a href="https://submit.shutterstock.com" target="_blank" rel="noreferrer" className="text-red-500 font-bold underline">Shutterstock Contributor</a>.</li>
                    <li>Buka menu profil atau klik tombol <strong>Unggah</strong>.</li>
                    <li>Pilih metode <strong>FTP</strong>.</li>
                    <li>Gunakan email atau Contributor ID akun Anda sebagai <strong>Username</strong> dan password login akun Anda sebagai <strong>Password</strong>.</li>
                    <li>Host: <code className="font-mono text-[11px] bg-red-500/10 px-1 py-0.5 rounded">ftp.shutterstock.com</code> (Port 21).</li>
                  </ol>
                </div>

                {/* Freepik */}
                <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🔷</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Freepik (FTP)</h4>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                    <li>Buka panel <a href="https://contributor.freepik.com" target="_blank" rel="noreferrer" className="text-blue-500 font-bold underline">Freepik Contributor</a>.</li>
                    <li>Buka halaman <strong>Files &gt; Upload</strong>.</li>
                    <li>Pilih tab <strong>FTP</strong>.</li>
                    <li>Salin <strong>FTP Username</strong> dan klik tombol generate <strong>FTP Password</strong>.</li>
                    <li>Host: <code className="font-mono text-[11px] bg-blue-500/10 px-1 py-0.5 rounded">ftp.freepik.com</code> (Port 21).</li>
                  </ol>
                </div>

                {/* Dreamstime */}
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🟢</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Dreamstime (FTP)</h4>
                  </div>
                  <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                    <li>Masuk ke akun <a href="https://www.dreamstime.com" target="_blank" rel="noreferrer" className="text-emerald-500 font-bold underline">Dreamstime</a> Anda.</li>
                    <li>Buka menu <strong>Management Area &gt; FTP Upload</strong>.</li>
                    <li>Gunakan <strong>User ID / Username</strong> dan password FTP yang tercantum di halaman tersebut.</li>
                    <li>Host: <code className="font-mono text-[11px] bg-emerald-500/10 px-1 py-0.5 rounded">upload.dreamstime.com</code> (Port 21).</li>
                  </ol>
                </div>

              </div>
            </div>
          </motion.div>
        )}
        </>
      )}
      </AnimatePresence>

      {/* Custom Server Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {isIndo ? 'Tambah Custom FTP / SFTP Server' : 'Add Custom FTP / SFTP Server'}
              </h3>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomAccount} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  {isIndo ? 'Nama Agensi / Server' : 'Agency / Server Name'}
                </label>
                <input
                  type="text"
                  required
                  value={customAgencyName}
                  onChange={(e) => setCustomAgencyName(e.target.value)}
                  placeholder="Misal: Vecteezy FTP / Pond5"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Host / Server Address
                  </label>
                  <input
                    type="text"
                    required
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="ftp.agency.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={customPort}
                    onChange={(e) => setCustomPort(parseInt(e.target.value) || 21)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Protokol
                </label>
                <div className="flex space-x-2">
                  {(['ftp', 'ftps', 'sftp'] as FtpProtocol[]).map((proto) => (
                    <button
                      key={proto}
                      type="button"
                      onClick={() => {
                        setCustomProtocol(proto);
                        if (proto === 'sftp') setCustomPort(22);
                        else setCustomPort(21);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        customProtocol === proto
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {proto.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase"
                >
                  {isIndo ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-violet-500/25"
                >
                  {isIndo ? 'Simpan Akun' : 'Save Account'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
