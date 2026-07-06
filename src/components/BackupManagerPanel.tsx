import React, { useState, useRef, useEffect } from 'react';
import { Database, Download, Upload, Cloud, HardDrive, History, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BackupManagerPanel: React.FC<{
  user: any;
  db: any;
  handleBackupJSON: () => void;
  handleImportJSON: (data: any[]) => void;
  autoBackup: boolean;
  setAutoBackup: (v: boolean) => void;
  activeTool: string;
}> = ({ user, db, handleBackupJSON, handleImportJSON, autoBackup, setAutoBackup, activeTool }) => {
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [cloudHistory, setCloudHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showRestoreModal && user && db) {
      setLoading(true);
      import('../firebase').then(({ doc, getDoc }) => {
        getDoc(doc(db, 'users', user.uid)).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.metadataGenHistory) {
              setCloudHistory(data.metadataGenHistory);
            }
          }
          setLoading(false);
        }).catch(err => {
          console.error(err);
          setLoading(false);
        });
      });
    }
  }, [showRestoreModal, user, db]);

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
    if (!user || !db) return;
    // We can just trigger JSON download for manual backup, or we can trigger cloud backup if they want.
    // The user requested: Backup Now -> Membuat backup manual.
    // Export CSV / JSON -> Mengekspor metadata.
    // Since handleBackupJSON does both local JSON and cloud save (in App.tsx), we just call it.
    handleBackupJSON();
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
              
              <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-slate-400">Loading history...</div>
                ) : cloudHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No backup history found.</div>
                ) : (
                  cloudHistory.filter(b => b.tool === activeTool || !b.tool).map((batch: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-colors flex items-center justify-between cursor-pointer"
                      onClick={() => restoreFromCloud(batch)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{batch.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {batch.items?.length || 0} items • {batch.tool || 'Unknown Tool'}
                        </p>
                      </div>
                      <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Restore
                      </div>
                    </div>
                  ))
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
