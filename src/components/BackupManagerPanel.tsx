import React, { useState, useRef, useEffect } from 'react';
import { Database, Download, Upload, Cloud, HardDrive, History, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, getDocs, orderBy, limit } from '../firebase';

export const BackupManagerPanel: React.FC<{
  user: any;
  db: any;
  isLicensed?: boolean;
  handleBackupJSON: () => void;
  handleImportJSON: (data: any[]) => void;
  autoBackup: boolean;
  setAutoBackup: (v: boolean) => void;
  activeTool: string;
  handleCloudBackup?: () => void;
}> = ({ user, db, isLicensed = false, handleBackupJSON, handleImportJSON, autoBackup, setAutoBackup, activeTool, handleCloudBackup }) => {
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [cloudHistory, setCloudHistory] = useState<any[]>([]);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isD1Configured, setIsD1Configured] = useState<boolean | null>(null);
  const [d1ErrorType, setD1ErrorType] = useState<'CREDENTIALS_MISSING' | 'CREDENTIALS_INVALID' | 'DATABASE_INVALID' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && showRestoreModal) {
      try {
        const localBackupsKey = `metazo_local_backups_${user.uid}`;
        const existingStr = localStorage.getItem(localBackupsKey);
        if (existingStr) {
          setLocalHistory(JSON.parse(existingStr));
        } else {
          setLocalHistory([]);
        }
      } catch (e) {
        console.warn('Failed to load local backup history:', e);
        setLocalHistory([]);
      }
    }
  }, [showRestoreModal, user]);

  useEffect(() => {
    if (user) {
      if (isLicensed) {
        setIsD1Configured(true);
        setD1ErrorType(null);
        return;
      }
      fetch(`/api/d1-backup/history?uid=${user.uid}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.code === 'CREDENTIALS_MISSING') {
            setIsD1Configured(false);
            setD1ErrorType('CREDENTIALS_MISSING');
          } else if (resData.code === 'CREDENTIALS_INVALID') {
            setIsD1Configured(false);
            setD1ErrorType('CREDENTIALS_INVALID');
          } else if (resData.code === 'DATABASE_INVALID') {
            setIsD1Configured(false);
            setD1ErrorType('DATABASE_INVALID');
          } else if (resData.success === false) {
            setIsD1Configured(false);
            setD1ErrorType('CREDENTIALS_INVALID');
          } else {
            setIsD1Configured(true);
            setD1ErrorType(null);
          }
        })
        .catch(() => {
          setIsD1Configured(false);
          setD1ErrorType('CREDENTIALS_MISSING');
        });
    }
  }, [user, isLicensed]);

  useEffect(() => {
    if (showRestoreModal && user) {
      setLoading(true);
      if (isLicensed) {
        console.log('[Firebase Firestore] Loading backup history from Firestore...');
        const backupsCol = collection(db, 'users', user.uid, 'backups');
        const qBackups = query(backupsCol, orderBy('createdAt', 'desc'), limit(30));
        getDocs(qBackups)
          .then(querySnapshot => {
            const history: any[] = [];
            querySnapshot.forEach(docSnap => {
              history.push({
                id: docSnap.id,
                ...docSnap.data()
              });
            });
            setCloudHistory(history);
            setIsD1Configured(true);
            setD1ErrorType(null);
            setLoading(false);
          })
          .catch(err => {
            console.error('[Firebase Firestore] Failed to load backup history:', err);
            setLoading(false);
          });
        return;
      }

      fetch(`/api/d1-backup/history?uid=${user.uid}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success && Array.isArray(resData.data)) {
            setCloudHistory(resData.data);
            setIsD1Configured(true);
            setD1ErrorType(null);
          } else {
            if (resData.code === 'CREDENTIALS_MISSING') {
              setIsD1Configured(false);
              setD1ErrorType('CREDENTIALS_MISSING');
            } else if (resData.code === 'CREDENTIALS_INVALID') {
              setIsD1Configured(false);
              setD1ErrorType('CREDENTIALS_INVALID');
            } else if (resData.code === 'DATABASE_INVALID') {
              setIsD1Configured(false);
              setD1ErrorType('DATABASE_INVALID');
            } else {
              setIsD1Configured(false);
              setD1ErrorType('CREDENTIALS_INVALID');
            }
            console.warn('[Cloudflare D1] Failed to retrieve cloud history:', resData.error);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('[Cloudflare D1] Error loading backup history:', err);
          setLoading(false);
        });
    }
  }, [showRestoreModal, user, isLicensed, db]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          handleImportJSON(json);
        } else if (json.items && Array.isArray(json.items)) {
          handleImportJSON(json.items);
        } else {
          alert('Invalid backup format.');
        }
      } catch (err) {
        alert('Failed to parse JSON backup.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBackupNow = () => {
    if (!user) return;
    // We can just trigger JSON download for manual backup, or we can trigger cloud backup if they want.
    // The user requested: Backup Now -> Membuat backup manual.
    // Export CSV / JSON -> Mengekspor metadata.
    // Since handleBackupJSON does both local JSON and cloud save (in App.tsx), we just call it.
    handleBackupJSON();
    if (handleCloudBackup) {
      handleCloudBackup();
    }
  };

  const restoreFromCloud = (batch: any) => {
    if (batch && batch.items && Array.isArray(batch.items)) {
      handleImportJSON(batch.items);
      setShowRestoreModal(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-[2rem] border border-[#e3e6f0]/60 dark:border-white/5 p-6 shadow-sm mb-8 mt-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Backup & Restore</h3>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Manage your metadata backups (Cloud & Local)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer">
              Auto Backup
            </label>
            <button 
              onClick={() => setAutoBackup(!autoBackup)}
              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative flex items-center ${
                autoBackup ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div 
                className={`w-3.5 h-3.5 rounded-full bg-white transition-all shadow-md transform ${
                  autoBackup ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {isLicensed ? (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-[1.5rem] flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Penyimpanan Cloud Aktif (Firebase Firestore)</h4>
            <p className="text-[10px] text-emerald-700/90 dark:text-emerald-400/85 leading-relaxed mt-1">
              Sebagai akun <strong>PRO / Langganan</strong>, seluruh data Anda secara otomatis tersinkronisasi dan disimpan dengan aman di cloud Firebase Firestore tanpa memerlukan konfigurasi tambahan.
            </p>
          </div>
        </div>
      ) : (
        <>
          {isD1Configured === false && d1ErrorType === 'CREDENTIALS_MISSING' && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-[1.5rem] flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">Cloudflare D1 Belum Dikonfigurasi</h4>
                <p className="text-[10px] text-amber-700/90 dark:text-amber-400/85 leading-relaxed mt-1">
                  Penyimpanan Cloud (Auto Backup, Restore, dan Import) membutuhkan konfigurasi kredensial database Cloudflare D1. Harap tambahkan <code className="bg-amber-100/80 dark:bg-amber-950 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900 dark:text-amber-300">CLOUDFLARE_API_TOKEN</code> di menu Settings di kanan atas layar.
                </p>
              </div>
            </div>
          )}

          {isD1Configured === false && d1ErrorType === 'CREDENTIALS_INVALID' && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-[1.5rem] flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">Kredensial Cloudflare Tidak Valid</h4>
                <p className="text-[10px] text-rose-700/90 dark:text-rose-400/85 leading-relaxed mt-1">
                  Gagal menghubungi database Cloudflare D1. Harap pastikan <code className="bg-rose-100/80 dark:bg-rose-950 px-1.5 py-0.5 rounded font-mono font-bold text-rose-900 dark:text-rose-300">CLOUDFLARE_API_TOKEN</code> dan <code className="bg-rose-100/80 dark:bg-rose-950 px-1.5 py-0.5 rounded font-mono font-bold text-rose-900 dark:text-rose-300">CLOUDFLARE_ACCOUNT_ID</code> di menu Settings sudah benar.
                </p>
              </div>
            </div>
          )}

          {isD1Configured === false && d1ErrorType === 'DATABASE_INVALID' && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-[1.5rem] flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">Cloudflare D1 Database ID Tidak Valid / Tidak Ditemui</h4>
                <p className="text-[10px] text-rose-700/90 dark:text-rose-400/85 leading-relaxed mt-1">
                  Gagal menemukan database D1 di dalam akun Cloudflare Anda. Harap tambahkan environment variable <code className="bg-rose-100/80 dark:bg-rose-950 px-1.5 py-0.5 rounded font-mono font-bold text-rose-900 dark:text-rose-300">CLOUDFLARE_D1_DATABASE_ID</code> di menu Settings dengan ID database D1 yang aktif di dalam Cloudflare Console Anda.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={handleBackupNow}
          className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-[1.5rem] transition-all group"
        >
          <Cloud size={24} className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Backup Now</span>
          <span className="text-[9px] text-slate-400 text-center mt-1">Save to Cloud & JSON</span>
        </button>

        <button
          onClick={() => setShowRestoreModal(true)}
          className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 rounded-[1.5rem] transition-all group"
        >
          <History size={24} className="text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Restore</span>
          <span className="text-[9px] text-slate-400 text-center mt-1">From Cloud History</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-violet-50 dark:bg-slate-900 dark:hover:bg-violet-900/20 border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500/50 rounded-[1.5rem] transition-all group"
        >
          <Upload size={24} className="text-slate-400 group-hover:text-violet-500 mb-2 transition-colors" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Import</span>
          <span className="text-[9px] text-slate-400 text-center mt-1">Load from JSON</span>
        </button>
        
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload} 
        />
      </div>

      <AnimatePresence>
        {showRestoreModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRestoreModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4 flex items-center gap-2">
                <History className="text-blue-500" />
                Restore from Cloud
              </h2>
              
              <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-slate-400">Loading history...</div>
                ) : localHistory.filter(b => b.tool === activeTool || !b.tool).length === 0 && cloudHistory.filter(b => b.tool === activeTool || !b.tool).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No backup history found.</div>
                ) : (
                  <>
                    {localHistory.filter(b => b.tool === activeTool || !b.tool).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <HardDrive size={12} />
                          Penyimpanan Lokal (Browser)
                        </h3>
                        {localHistory.filter(b => b.tool === activeTool || !b.tool).map((batch: any, idx: number) => (
                          <div 
                            key={`local-${idx}`}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-400 transition-colors flex items-center justify-between cursor-pointer"
                            onClick={() => restoreFromCloud(batch)}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{batch.timestamp}</span>
                                <span className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[8px] font-bold rounded">LOKAL</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {batch.items?.length || 0} items • {batch.tool || 'Unknown Tool'}
                              </p>
                            </div>
                            <div className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              Restore
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {cloudHistory.filter(b => b.tool === activeTool || !b.tool).length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Cloud size={12} />
                          Penyimpanan Awan (Cloudflare D1)
                        </h3>
                        {cloudHistory.filter(b => b.tool === activeTool || !b.tool).map((batch: any, idx: number) => (
                          <div 
                            key={`cloud-${idx}`}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-colors flex items-center justify-between cursor-pointer"
                            onClick={() => restoreFromCloud(batch)}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{batch.timestamp}</span>
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-bold rounded">AWAN</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {batch.items?.length || 0} items • {batch.tool || 'Unknown Tool'}
                              </p>
                            </div>
                            <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              Restore
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <button 
                onClick={() => setShowRestoreModal(false)}
                className="mt-6 w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
