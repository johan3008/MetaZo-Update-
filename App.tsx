
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sun, Moon, HelpCircle, X, Zap, Clock, Info, FileCode, Film, ImageIcon, Sparkles,
  AlertCircle, Copy, Check, RefreshCcw, Download, Trash2, ArrowRight, CheckCircle2,
  Heart, Menu, ChevronLeft, ChevronRight, Search, AlertTriangle, Settings, Loader2,
  Plus, Key, Lock
} from 'lucide-react';
import { ToolType, GenerationMode, FileItem, ProgressInfo } from './types';
import { Sidebar } from './src/components/Sidebar';
import { Topbar } from './src/components/Topbar';
import { MetricsRow } from './src/components/MetricsRow';
import { UploadPanel } from './src/components/UploadPanel';
import { AiConfigPanel } from './src/components/AiConfigPanel';
import { ExportPanel } from './src/components/ExportPanel';
import { FeatureGuideButton } from './src/components/FeatureGuideModal';
import { ReviewQueue } from './src/components/ReviewQueue';
import { DashboardView } from './src/components/DashboardView';
import { PromptGenView } from './src/components/PromptGenView';
import { PromptImageView } from './src/components/PromptImageView';
import { PromptVideoView } from './src/components/PromptVideoView';
import { ImageCheckView } from './src/components/ImageCheckView';
import { CalendarGenView } from './src/components/CalendarGenView';
import { SaaSPortal } from './src/components/SaaSPortal';
import { TRANSLATIONS, AppLanguage, ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO } from './constants';
import { generateStockMetadata, generateBatchStockMetadata } from './services/geminiService';
import { copyToClipboard } from './src/utils';
import UTIF from 'utif';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './src/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { LoginScreen } from './src/components/LoginScreen';

// --- IndexedDB Helper for Auto-Resume ---
const DB_NAME = 'EPS_Batch_DB';
const STORE_NAME = 'app_state_store';

// Keep an in-memory fallback in case IndexedDB is blocked or disabled (common in sandboxed iframes)
const inMemoryFallback: Record<string, any> = {};

const initDB = (): Promise<IDBDatabase | null> => {
    return new Promise((resolve) => {
        try {
            if (typeof indexedDB === 'undefined' || !indexedDB) {
                resolve(null);
                return;
            }
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                try {
                    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                        request.result.createObjectStore(STORE_NAME);
                    }
                } catch (e) {
                    console.warn("IDB upgrade error:", e);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => {
                console.warn("IDB open blocked/error (falling back):", e);
                resolve(null);
            };
        } catch (err) {
            console.warn("IDB initialization error (falling back to memory):", err);
            resolve(null);
        }
    });
};

const saveStateToDB = async (state: any) => {
    try {
        const db = await initDB();
        if (!db) {
            inMemoryFallback['current_batch'] = state;
            try { localStorage.setItem('current_batch_backup', JSON.stringify(state)); } catch (e) {}
            return;
        }
        return new Promise<void>((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(state, 'current_batch');
                tx.oncomplete = () => resolve();
                tx.onerror = () => {
                    inMemoryFallback['current_batch'] = state;
                    resolve();
                };
            } catch (e) {
                inMemoryFallback['current_batch'] = state;
                resolve();
            }
        });
    } catch (err) {
        inMemoryFallback['current_batch'] = state;
    }
};

const loadStateFromDB = async (): Promise<any> => {
    try {
        const db = await initDB();
        if (!db) {
            if (inMemoryFallback['current_batch']) return inMemoryFallback['current_batch'];
            try {
                const backup = localStorage.getItem('current_batch_backup');
                if (backup) return JSON.parse(backup);
            } catch (e) {}
            return null;
        }
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get('current_batch');
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result);
                    } else {
                        if (inMemoryFallback['current_batch']) {
                            resolve(inMemoryFallback['current_batch']);
                        } else {
                            try {
                                const backup = localStorage.getItem('current_batch_backup');
                                resolve(backup ? JSON.parse(backup) : null);
                            } catch (e) {
                                resolve(null);
                            }
                        }
                    }
                };
                request.onerror = () => {
                    try {
                        const backup = localStorage.getItem('current_batch_backup');
                        resolve(backup ? JSON.parse(backup) : (inMemoryFallback['current_batch'] || null));
                    } catch (e) {
                        resolve(inMemoryFallback['current_batch'] || null);
                    }
                };
            } catch (e) {
                try {
                    const backup = localStorage.getItem('current_batch_backup');
                    resolve(backup ? JSON.parse(backup) : (inMemoryFallback['current_batch'] || null));
                } catch (err) {
                    resolve(inMemoryFallback['current_batch'] || null);
                }
            }
        });
    } catch (err) {
        return inMemoryFallback['current_batch'] || null;
    }
};

const clearStateFromDB = async () => {
    try {
        delete inMemoryFallback['current_batch'];
        try { localStorage.removeItem('current_batch_backup'); } catch (e) {}
        const db = await initDB();
        if (!db) return;
        return new Promise<void>((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete('current_batch');
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (e) {
                resolve();
            }
        });
    } catch (err) {
        // Safe skip
    }
};
// ----------------------------------------

// --- BACKGROUND THROTTLING BYPASS TRICKS ---
// 1. Web Worker based timeout to bypass browser's 1000ms clamp on setTimeout in background tabs
const backgroundSafeTimeout = (ms: number): Promise<void> => {
    return new Promise(resolve => {
        try {
            const blob = new Blob([`setTimeout(() => postMessage('tick'), ${ms});`], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const worker = new Worker(url);
            worker.onmessage = () => {
                resolve();
                worker.terminate();
                URL.revokeObjectURL(url);
            };
        } catch (e) {
            setTimeout(resolve, ms);
        }
    });
};

// 2. Silent AudioContext & Ghost Audio Loop to keep the tab's media pipeline and timers active
const SILENT_WAV_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAwADAA==";
let keepAliveAudioEl: HTMLAudioElement | null = null;
let keepAliveAudioCtx: AudioContext | null = null;
let keepAliveOscillator: OscillatorNode | null = null;
let keepAliveVideoEl: HTMLVideoElement | null = null; // Trik Licik 2: Silent Video (PiP hack without PiP)
let keepAliveCanvas: HTMLCanvasElement | null = null;

const startTabKeepAlive = () => {
    try {
        // --- TRIK LICIK 1 & 2: GHOST AUDIO LOOP + CANVAS STREAM 1x1 ---
        if (!keepAliveCanvas) {
            keepAliveCanvas = document.createElement('canvas');
            keepAliveCanvas.width = 1;
            keepAliveCanvas.height = 1;
            const ctx = keepAliveCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, 1, 1);
            }
        }
        
        // Buat stream 1 fps dari canvas (super enteng)
        const canvasStream = keepAliveCanvas.captureStream(1) as any;

        // Web Audio API Keep-Alive untuk disambungkan ke canvas Stream
        if (!keepAliveAudioCtx) {
            keepAliveAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (keepAliveAudioCtx.state === 'suspended') {
            keepAliveAudioCtx.resume();
        }
        if (!keepAliveOscillator) {
            keepAliveOscillator = keepAliveAudioCtx.createOscillator();
            const gainNode = keepAliveAudioCtx.createGain();
            gainNode.gain.value = 0; // mutlak silent
            
            // Connect ke stream destination
            const dest = keepAliveAudioCtx.createMediaStreamDestination();
            keepAliveOscillator.connect(gainNode);
            gainNode.connect(dest);
            gainNode.connect(keepAliveAudioCtx.destination);
            keepAliveOscillator.start();
            
            // Gabungkan video track (hitam) dengan audio track (silent)
            if (dest.stream.getAudioTracks().length > 0 && canvasStream.getVideoTracks().length > 0) {
                canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
            }
        }

        if (!keepAliveVideoEl) {
            keepAliveVideoEl = document.createElement('video');
            keepAliveVideoEl.setAttribute('playsinline', '');
            keepAliveVideoEl.setAttribute('muted', '');
            keepAliveVideoEl.setAttribute('loop', '');
            keepAliveVideoEl.style.display = 'none';
            document.body.appendChild(keepAliveVideoEl);
        }
        
        keepAliveVideoEl.srcObject = canvasStream;
        keepAliveVideoEl.play().then(() => {
            // --- TRIK LICIK 5: PICTURE-IN-PICTURE (PiP) PHANTOM ---
            if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
                keepAliveVideoEl?.requestPictureInPicture().catch(() => {});
            }
        }).catch(() => {});

        // --- OS LEVEL WAKE LOCK ---
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen').catch(() => {});
        }
    } catch (e) {
        console.error("Keep-alive audio/video failed", e);
    }
};

const stopTabKeepAlive = () => {
    try {
        if (keepAliveAudioEl) {
            keepAliveAudioEl.pause();
        }
        if (keepAliveVideoEl) {
            keepAliveVideoEl.pause();
            if (document.pictureInPictureElement === keepAliveVideoEl) {
                document.exitPictureInPicture().catch(() => {});
            }
        }
        if (keepAliveOscillator) {
            keepAliveOscillator.stop();
            keepAliveOscillator.disconnect();
            keepAliveOscillator = null;
        }
        if (keepAliveAudioCtx && keepAliveAudioCtx.state === 'running') {
            keepAliveAudioCtx.suspend();
        }
    } catch (e) {
        console.error("Stop keep-alive failed", e);
    }
};
// -------------------------------------------

// Setup PDF.js worker (now handled in pdfWorker.ts)

const extractEPSClientSide = async (file: File): Promise<string | null> => {
    try {
        // TRICK: Disposable Web Worker to prevent memory leaks
        // The worker handles reading the file, searching for PDF/TIFF/JPEG, and rendering.
        return new Promise<string | null>((resolve) => {
            const worker = new Worker(new URL('./src/workers/epsWorker.ts', import.meta.url), { type: 'module' });
            
            // Timeout to kill worker if it hangs (15 seconds)
            const timeoutId = setTimeout(() => {
                worker.terminate();
                console.warn("EPS Worker timed out");
                resolve(null);
            }, document.hidden ? 120000 : 15000); // ADAPTIVE TIME BOMB

            worker.onmessage = (e) => {
                clearTimeout(timeoutId);
                if (e.data.success) {
                    const objectUrl = URL.createObjectURL(e.data.blob);
                    resolve(objectUrl);
                } else {
                    console.warn("Worker failed to extract EPS preview:", e.data.error);
                    resolve(null);
                }
                // Kill worker immediately after it's done to free memory (Burn and Replace)
                worker.terminate();
            };

            worker.onerror = (err) => {
                clearTimeout(timeoutId);
                console.warn("EPS Worker error:", err);
                worker.terminate();
                resolve(null);
            };

            // Pass the File object directly to the worker
            worker.postMessage({ file });
        });
    } catch (e) {
        console.error("Client-side EPS extraction failed", e);
        return null;
    }
};

const CardBase: React.FC<{ children: React.ReactNode, className?: string, themeColor?: 'blue' | 'purple' | 'emerald' }> = ({ children, className = "", themeColor }) => {
    let topIndicatorClass = "from-transparent via-blue-500/20 to-transparent";
    if (themeColor === 'purple') topIndicatorClass = "from-transparent via-purple-500/20 to-transparent";
    if (themeColor === 'emerald') topIndicatorClass = "from-transparent via-emerald-500/20 to-transparent";

    return (
        <div className={`bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl rounded-[2.25rem] border border-slate-200/80 dark:border-white/5 p-8 shadow-xl flex flex-col transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 relative overflow-hidden group ${className}`}>
            <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${topIndicatorClass} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
            {children}
        </div>
    );
};

const CopyBox: React.FC<{ 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    isTextArea?: boolean,
    themeColor?: 'blue' | 'purple' | 'emerald',
    showLengthRating?: boolean 
}> = ({ label, value, onChange, isTextArea = false, themeColor = 'blue', showLengthRating = false }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!value) return;
        const success = await copyToClipboard(value);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const focusRingClass = themeColor === 'purple' 
        ? 'focus:ring-purple-500/10 focus:border-purple-500/80 dark:focus:border-purple-400/80' 
        : themeColor === 'emerald' 
            ? 'focus:ring-emerald-500/10 focus:border-emerald-500/80 dark:focus:border-emerald-400/80' 
            : 'focus:ring-violet-500/10 focus:border-violet-500/80 dark:focus:border-blue-400/80';

    const count = value ? value.length : 0;
    let ratingColor = "bg-slate-300 dark:bg-slate-700";
    let ratingText = "";
    let ratingTextColor = "text-slate-400 dark:text-slate-500";
    let percentage = Math.min(100, (count / 200) * 100);

    if (count > 0) {
        if (count >= 50 && count <= 200) {
            ratingColor = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
            ratingText = "Ideal: 50-200 chars for optimal SEO indexing";
            ratingTextColor = "text-emerald-500 dark:text-emerald-400";
        } else if (count > 200) {
            ratingColor = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]";
            ratingText = "Too long! Exceeds 200 characters maximum";
            ratingTextColor = "text-red-500 dark:text-red-400";
        } else {
            ratingColor = "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]";
            ratingText = "Short: consider 50+ chars to boost search index";
            ratingTextColor = "text-amber-500 dark:text-amber-450";
        }
    }

    return (
        <div className="space-y-1.5 group/box relative">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em]">{label}</label>
                <button onClick={handleCopy} className="p-2 sm:p-1.5 rounded-[1.5rem] bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-500/12 hover:text-violet-500 dark:hover:text-violet-400 transition-all text-slate-400 dark:text-slate-300 hover:scale-105 active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center">
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
            </div>
            {isTextArea ? (
                <textarea 
                    className={`w-full p-4 bg-white/50 dark:bg-slate-900/40 border border-slate-300/50 dark:border-white/10 rounded-2xl text-[12px] leading-relaxed outline-none focus:ring-4 ${focusRingClass} focus:border-blue-400 dark:focus:border-blue-700/50 transition-all min-h-[90px] resize-none font-medium text-slate-700 dark:text-slate-200 shadow-inner`} 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                />
            ) : (
                <input 
                    type="text" 
                    className={`w-full p-4 bg-white/50 dark:bg-slate-900/40 border border-slate-300/50 dark:border-white/10 rounded-2xl text-[12px] outline-none focus:ring-4 ${focusRingClass} focus:border-blue-400 dark:focus:border-blue-700/50 transition-all font-semibold text-slate-700 dark:text-slate-200 shadow-inner`} 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                />
            )}
            {showLengthRating && value && (
                <div className="mt-1 px-1 space-y-1 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                        <span className={ratingTextColor}>{ratingText}</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{count} / 200 chars</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${ratingColor} transition-all duration-300`} style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const KeywordList: React.FC<{ 
    keywords: string[], 
    onChange: (keywords: string[]) => void, 
    label: string,
    themeColor?: 'blue' | 'purple' | 'emerald' 
}> = ({ keywords, onChange, label, themeColor = 'blue' }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const seen = new Set<string>();
    const uniqueKeywords = keywords.filter(k => {
      const normalized = k.toLowerCase().trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    if (uniqueKeywords.length !== keywords.length) {
      onChange(uniqueKeywords);
    }
  }, [keywords, onChange]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newKeywords = [...keywords];
    const draggedKeyword = newKeywords[draggedIndex];
    
    newKeywords.splice(draggedIndex, 1);
    newKeywords.splice(index, 0, draggedKeyword);
    
    onChange(newKeywords);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleCopy = async () => {
    if (!keywords.length) return;
    const success = await copyToClipboard(keywords.join(', '));
    if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemove = (index: number) => {
    const newKeywords = [...keywords];
    newKeywords.splice(index, 1);
    onChange(newKeywords);
  };

  const handleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      const newKeywords = [...keywords, ...e.currentTarget.value.split(',').map(k => k.trim()).filter(k => k)];
      onChange(newKeywords);
      e.currentTarget.value = '';
    }
  };

  const focusRingClass = themeColor === 'purple' 
      ? 'focus-within:ring-purple-500/10 focus-within:border-purple-500/80 dark:focus-within:border-purple-400/80' 
      : themeColor === 'emerald' 
          ? 'focus-within:ring-emerald-500/10 focus-within:border-emerald-500/80 dark:focus-within:border-emerald-400/80' 
          : 'focus-within:ring-violet-500/10 focus-within:border-violet-500/80 dark:focus-within:border-blue-400/80';

  let borderActiveAccent = themeColor === 'purple' ? 'hover:border-purple-500/60' : themeColor === 'emerald' ? 'hover:border-emerald-500/60' : 'hover:border-violet-500/60';

  const count = keywords.length;
  let ratingText = "Ideal keyword volume range is 25-45. Standard: 10-49.";
  let ratingTextColor = "text-slate-400 dark:text-slate-500";
  let ratingBg = "bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-500 dark:text-slate-400";

  if (count > 0) {
      if (count >= 25 && count <= 45) {
          ratingText = "Perfect: 25-45 keywords boosts findability and matches stock algorithms";
          ratingTextColor = "text-emerald-600 dark:text-emerald-400";
          ratingBg = "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/15";
      } else if (count > 49) {
          ratingText = "Critical: Max 49 keywords. Adobe/Shutterstock will REJECT upload if >= 50!";
          ratingTextColor = "text-red-500 dark:text-red-400";
          ratingBg = "bg-red-500/5 dark:bg-red-500/10 border-red-500/15";
      } else if (count < 10) {
          ratingText = "Suggest at least 15 keywords for optimal stock search indexing";
          ratingTextColor = "text-amber-600 dark:text-amber-400";
          ratingBg = "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/15";
      } else {
          ratingText = "Good depth of keywords. Range from 10 to 49 is generally accepted.";
          ratingTextColor = "text-indigo-600 dark:text-indigo-400";
          ratingBg = "bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-550/15";
      }
  }

  return (
    <div className="space-y-1.5 group/box relative">
      <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em]">{label} ({keywords.length})</label>
          <button onClick={handleCopy} className="p-2 sm:p-1.5 rounded-[1.5rem] bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-500/12 hover:text-violet-500 dark:hover:text-violet-400 transition-all text-slate-400 dark:text-slate-300 hover:scale-105 active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center">
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
      </div>
      <div className={`w-full p-4 bg-slate-50/60 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 rounded-2xl min-h-[90px] flex flex-wrap gap-2 items-start focus-within:ring-4 ${focusRingClass} transition-all`}>
        {keywords.map((keyword, index) => (
          <div
            key={`${keyword}-${index}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center space-x-1 px-3 py-1 bg-white/95 dark:bg-slate-800/90 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-grab active:cursor-grabbing transition-all ${draggedIndex === index ? 'opacity-50 scale-95 shadow-lg' : `hover:shadow-md hover:bg-violet-50/10 dark:hover:bg-slate-800 ${borderActiveAccent}`}`}
          >
            <span>{keyword}</span>
            <button 
              onClick={() => handleRemove(index)}
              className="text-slate-400/80 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1 focus:outline-none"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <input 
          type="text" 
          placeholder="Add keyword (press Enter)..." 
          onKeyDown={handleAdd}
          className="flex-grow min-w-[140px] bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400/80 py-1 font-medium"
        />
      </div>
      {count > 0 && (
          <div className={`mt-1.5 px-3 py-1.5 rounded-[1.5rem] border text-[9px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${ratingBg}`}>
              <span className={ratingTextColor}>{ratingText}</span>
              <span className={`font-mono px-1.5 py-0.5 rounded-xl ${count > 49 ? 'bg-red-500 text-white' : count >= 25 && count <= 45 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100/50 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>{count} / 49 tags</span>
          </div>
      )}
    </div>
  );
};

const FilePreview: React.FC<{ 
  fileItem: FileItem, 
  onClose: () => void,
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>,
  setPreviewFile: React.Dispatch<React.SetStateAction<FileItem | null>>
}> = ({ fileItem, onClose, setFiles, setPreviewFile }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(fileItem.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [fileItem]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-violet-400 transition-colors bg-black/50 rounded-full"
        >
          <X size={24} />
        </button>
        
        {fileItem.file.type.startsWith('video/') ? (
          <video 
            src={url || undefined} 
            controls 
            autoPlay 
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
          />
        ) : fileItem.file.type.startsWith('image/') ? (
          <img 
            src={url || undefined} 
            alt="Preview" 
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
          />
        ) : (
          <div className="w-full max-w-md h-64 bg-slate-800 rounded-2xl flex flex-col items-center justify-center text-white shadow-2xl">
            <FileCode size={64} className="mb-4 text-slate-400" />
            <p className="font-bold text-center px-4 truncate w-full">{fileItem.customFileName || fileItem.file.name}</p>
            <p className="text-sm text-slate-400 mt-2">Preview not available</p>
          </div>
        )}
        <div className="mt-4 text-white font-bold tracking-wide text-sm bg-black/80 px-4 py-2 rounded-full flex items-center max-w-[90%]">
          <input
            type="text"
            value={fileItem.customFileName ?? fileItem.file.name}
            onChange={(e) => {
              const newName = e.target.value;
              setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, customFileName: newName } : f));
              setPreviewFile(prev => prev ? { ...prev, customFileName: newName } : null);
            }}
            className="bg-transparent border-b border-transparent hover:border-slate-500 focus:border-white outline-none w-full truncate cursor-text transition-colors pb-0 text-center"
            title="Edit Filename"
          />
        </div>
      </div>
    </div>
  );
};

// --- VIDEO EXTRACTION (HYBRID APPROACH) ---
let sharedVideoWorker: Worker | null = null;
let videoWorkerJobId = 0;

// Queue mechanism for worker to prevent concurrent execution and handle crashes
let workerQueue: (() => void)[] = [];
let isWorkerBusy = false;

const acquireWorker = (): Promise<void> => {
    return new Promise(resolve => {
        if (!isWorkerBusy) {
            isWorkerBusy = true;
            resolve();
        } else {
            workerQueue.push(resolve);
        }
    });
};

const releaseWorker = () => {
    if (workerQueue.length > 0) {
        const next = workerQueue.shift();
        next?.();
    } else {
        isWorkerBusy = false;
    }
};

let workerUseCount = 0;
const MAX_WORKER_USES = 5;

let cachedFfmpegCoreUrl = '';
let cachedFfmpegWasmUrl = '';

const getFfmpegUrls = async () => {
    if (cachedFfmpegCoreUrl && cachedFfmpegWasmUrl) {
        return { coreURL: cachedFfmpegCoreUrl, wasmURL: cachedFfmpegWasmUrl };
    }
    try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        cachedFfmpegCoreUrl = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        cachedFfmpegWasmUrl = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        return { coreURL: cachedFfmpegCoreUrl, wasmURL: cachedFfmpegWasmUrl };
    } catch (e) {
        console.warn("Failed to pre-fetch FFmpeg URLs", e);
        return null;
    }
};

const extractVideoWithWorker = async (file: File): Promise<string[]> => {
    await acquireWorker();
    
    return new Promise<string[]>(async (resolve, reject) => {
        if (!sharedVideoWorker) {
            sharedVideoWorker = new Worker(new URL('./src/workers/videoWorker.ts', import.meta.url), { type: 'module' });
            const urls = await getFfmpegUrls();
            sharedVideoWorker.postMessage({ type: 'init', urls });
            workerUseCount = 0;
        }
        
        const currentId = ++videoWorkerJobId;
        
        // Timeout to kill worker if it hangs (5 minutes for video)
        let timeoutId = setTimeout(() => {
            if (sharedVideoWorker) {
                sharedVideoWorker.terminate();
                sharedVideoWorker = null; // Force recreate next time
            }
            releaseWorker();
            reject(new Error("Video Worker timed out (Initial)"));
        }, 300000);

        const messageHandler = (e: MessageEvent) => {
            if (e.data.id !== currentId) return; // Ignore messages from other jobs
            
            if (e.data.type === 'progress') {
                // Reset timeout on progress.
                // Saat background tab, proses FFmpeg bisa lebih lambat,
                // tapi selama masih ada progress, kita beri waktu tambahan 5 menit per progress.
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (sharedVideoWorker) {
                        sharedVideoWorker.terminate();
                        sharedVideoWorker = null;
                    }
                    releaseWorker();
                    reject(new Error("Video Worker timed out (No progress)"));
                }, 300000);
                return;
            }
            
            sharedVideoWorker?.removeEventListener('message', messageHandler);
            sharedVideoWorker?.removeEventListener('error', errorHandler);
            clearTimeout(timeoutId);
            
            if (e.data.success) {
                const frameUrls = e.data.framesBlobs.map((blob: Blob) => URL.createObjectURL(blob));
                
                workerUseCount++;
                if (workerUseCount >= MAX_WORKER_USES) {
                    sharedVideoWorker?.terminate();
                    sharedVideoWorker = null;
                    workerUseCount = 0;
                }
                
                releaseWorker();
                resolve(frameUrls);
            } else {
                // KILL WORKER ON ERROR TO PREVENT POISONING NEXT JOBS
                if (sharedVideoWorker) {
                    sharedVideoWorker.terminate();
                    sharedVideoWorker = null;
                    workerUseCount = 0;
                }
                releaseWorker();
                reject(new Error(e.data.error || "Worker failed to extract video frames"));
            }
        };
        
        const errorHandler = (err: ErrorEvent) => {
            clearTimeout(timeoutId);
            sharedVideoWorker?.removeEventListener('message', messageHandler);
            sharedVideoWorker?.removeEventListener('error', errorHandler);
            sharedVideoWorker?.terminate();
            sharedVideoWorker = null;
            workerUseCount = 0;
            releaseWorker();
            reject(new Error(`Worker crashed: ${err.message || 'Unknown error'}`));
        };

        sharedVideoWorker.addEventListener('message', messageHandler);
        sharedVideoWorker.addEventListener('error', errorHandler);
        sharedVideoWorker.postMessage({ file, id: currentId });
    });
};

const extractVideoNative = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.preload = 'auto'; // Help it load faster
        
        // --- TRIK LICIK 2: ATTACH KE DOM (TERSEMBUNYI) ---
        // Browser sering men-throttle video yang tidak ada di DOM.
        // Kita tempelkan ke body tapi sembunyikan sepenuhnya.
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.opacity = '0';
        document.body.appendChild(video);
        
        // --- TRIK LICIK: ANTI-THROTTLING BACKGROUND TAB ---
        // Hubungkan video ke Web Audio API dengan volume 0.
        // Tambahkan juga Oscillator (suara buatan) agar browser mengira tab ini
        // sedang memutar musik secara aktif, sehingga proses decoding video
        // tidak akan pernah dibekukan meskipun video aslinya tidak bersuara (bisu).
        let audioCtx: AudioContext | null = null;
        let audioSource: MediaElementAudioSourceNode | null = null;
        let gainNode: GainNode | null = null;
        let oscillator: OscillatorNode | null = null;
        
        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // 1. Hubungkan video ke audio context
            audioSource = audioCtx.createMediaElementSource(video);
            
            // 2. Buat suara buatan (nada beep)
            oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = 440;
            
            // 3. Mute total keduanya
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0; 
            
            audioSource.connect(gainNode);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
        } catch (e) {
            console.warn("AudioContext trick failed", e);
        }
        // --------------------------------------------------
        
        let isResolved = false;
        const cleanup = () => {
            video.pause();
            video.removeAttribute('src');
            video.load();
            
            // Hapus dari DOM
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
            
            // Bersihkan AudioContext
            if (oscillator) {
                try { oscillator.stop(); } catch(e){}
                oscillator.disconnect();
            }
            if (audioSource) audioSource.disconnect();
            if (gainNode) gainNode.disconnect();
            if (audioCtx && audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {});
            }
        };

        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                reject(new Error("Native video extraction timed out"));
            }
        }, document.hidden ? 120000 : 15000); // ADAPTIVE TIME BOMB

        video.onloadedmetadata = async () => {
            try {
                const duration = video.duration;
                if (!duration || duration === Infinity) throw new Error("Invalid duration");
                
                const frameWidth = 320;
                const frameHeight = Math.floor(frameWidth * (video.videoHeight / video.videoWidth));

                const seekTimes = [
                    duration * 0.1, // Start (10%)
                    duration * 0.5, // Middle (50%)
                    duration * 0.9  // End (90%)
                ];
                const extractedFrames: string[] = [];

                for (let i = 0; i < seekTimes.length; i++) {
                    const time = seekTimes[i];
                    video.currentTime = time;
                    
                    await new Promise<void>((res, rej) => {
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked);
                            res();
                        };
                        video.addEventListener('seeked', onSeeked);
                        setTimeout(() => {
                            video.removeEventListener('seeked', onSeeked);
                            rej(new Error("Seek timeout"));
                        }, document.hidden ? 60000 : 10000); // ADAPTIVE TIME BOMB FOR SEEK
                    });

                    const canvas = document.createElement('canvas');
                    canvas.width = frameWidth;
                    canvas.height = frameHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, frameWidth, frameHeight);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                        extractedFrames.push(dataUrl);
                    }
                }
                
                isResolved = true;
                clearTimeout(timeoutId);
                cleanup();
                resolve(extractedFrames);
            } catch (err) {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                    cleanup();
                    reject(err);
                }
            }
        };

        video.onerror = () => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutId);
                cleanup();
                reject(new Error("Video load error"));
            }
        };

        video.src = URL.createObjectURL(file);
    });
};

const extractVideoHybrid = async (file: File): Promise<string[]> => {
    try {
        console.log(`[${file.name}] Trying native hardware-accelerated extraction...`);
        const frames = await extractVideoNative(file);
        console.log(`[${file.name}] Native extraction successful.`);
        return frames;
    } catch (err) {
        console.warn(`[${file.name}] Native extraction failed or timed out. Falling back to FFmpeg Worker as secondary solution...`, err);
        return await extractVideoWithWorker(file);
    }
};

const toSentenceCase = (text: string) => {
    if (!text) return text;
    const trimmed = text.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light';
  });
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.DASHBOARD);
  const [prefilledSubject, setPrefilledSubject] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const filesRef = useRef<FileItem[]>([]);
  
  // --- TRIK LICIK 4: SYNCHRONOUS STATE UPDATE ---
  // Di background tab, React 18 sering menunda (batch) atau bahkan menghentikan
  // eksekusi useEffect. Jika kita hanya mengandalkan useEffect untuk mengupdate filesRef,
  // loop background kita akan membaca data basi (stale data) dan macet/mengulang file yang sama.
  // Fungsi ini memastikan filesRef diupdate secara sinkron (detik itu juga) sebelum React re-render.
  const updateFiles = useCallback((updater: (prev: FileItem[]) => FileItem[]) => {
      filesRef.current = updater(filesRef.current);
      setFiles(filesRef.current);
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [keywordCount, setKeywordCount] = useState<number | string>('');
  const [keywordMode, setKeywordMode] = useState<'mixed' | 'single' | 'multi'>(() => (localStorage.getItem('mz_keyword_mode') as 'mixed' | 'single' | 'multi') || 'mixed');
  const [activeAccountsCount, setActiveAccountsCount] = useState<number>(0);

  // 1. Mark current user as online
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    const markOnline = async () => {
        try {
            await updateDoc(userRef, { lastSeen: serverTimestamp() });
        } catch (e) {
            console.error('Error marking online:', e);
        }
    };
    
    markOnline();
    const interval = setInterval(markOnline, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [auth.currentUser]);

  // 2. Fetch truly active (online) users
  useEffect(() => {
    const fetchActiveAccounts = async () => {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const q = query(collection(db, 'users'), where('lastSeen', '>', fiveMinutesAgo));
            const snapshot = await getDocs(q);
            setActiveAccountsCount(snapshot.size);
        } catch (e) {
            console.error('Error fetching online accounts:', e);
        }
    };
    
    fetchActiveAccounts();
    const interval = setInterval(fetchActiveAccounts, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const [uiLanguage, setUiLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('mz_ui_language');
      if (saved === 'id' || saved === 'en') return saved as AppLanguage;
    } catch (e) {}
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('mz_ui_language', uiLanguage);
  }, [uiLanguage]);

  useEffect(() => {
    localStorage.setItem('mz_keyword_mode', keywordMode);
  }, [keywordMode]);

  const [aiCreativity, setAiCreativity] = useState<number>(0.7);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.STANDARD);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [exportAdobe, setExportAdobe] = useState(true);
  const [exportShutterstock, setExportShutterstock] = useState(false);
  const [exportVecteezy, setExportVecteezy] = useState(false);
  const [exportCanva, setExportCanva] = useState(false);
  const [exportFreepik, setExportFreepik] = useState(false);
  const [shutterstockDescMode, setShutterstockDescMode] = useState<'desc' | 'title_desc'>('desc');
  const [triggerAutoDownload, setTriggerAutoDownload] = useState(0);
  
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
      return !sessionStorage.getItem('vixer_welcomed');
  });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoLanguage, setInfoLanguage] = useState<'id' | 'en'>('id');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'reseller'>('gemini');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia'>(() => {
    return (localStorage.getItem('ai_provider') || 'gemini') as any;
  });

  // Reseller & License state
  const [isResellerUnlocked, setIsResellerUnlocked] = useState(() => localStorage.getItem('mz_reseller_unlocked') === 'true');
  const [resellerClicks, setResellerClicks] = useState(0);
  const [showResellerUnlockInput, setShowResellerUnlockInput] = useState(false);
  const [resellerPasscodeVal, setResellerPasscodeVal] = useState('');
  const [resellerPasscodeError, setResellerPasscodeError] = useState('');

  const [mzAppName, setMzAppName] = useState(() => localStorage.getItem('mz_reseller_app_name') || 'MetaZo PRO');
  const [mzAppSubtitle, setMzAppSubtitle] = useState(() => localStorage.getItem('mz_reseller_app_subtitle') || 'AI-Powered Metadata Assistant');
  const [mzWhatsApp, setMzWhatsApp] = useState(() => localStorage.getItem('mz_reseller_whatsapp') || 'https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H');
  const [mzPriceText, setMzPriceText] = useState(() => localStorage.getItem('mz_reseller_price') || '');
  const [mzLicenseSeed, setMzLicenseSeed] = useState(() => localStorage.getItem('mz_reseller_seed') || 'MZPRO-COMMERCIAL-2026');
  const [mzLicenseKey, setMzLicenseKey] = useState(() => localStorage.getItem('mz_license_key') || '');
  const [isMzLicensed, setIsMzLicensed] = useState(false);
  const [subDaysLeft, setSubDaysLeft] = useState<number | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Daily Asset Generation Tracking for Trial Users
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [cloudDailyCounts, setCloudDailyCounts] = useState<{ [key in ToolType]?: number }>({});

  const getDailyCount = useCallback((type: ToolType): number => {
    const dateStr = getTodayDateString();
    const cloudVal = cloudDailyCounts[type];
    const val = localStorage.getItem(`mz_daily_gen_${type}_${dateStr}`);
    const localVal = val ? parseInt(val) || 0 : 0;
    return typeof cloudVal === 'number' ? Math.max(cloudVal, localVal) : localVal;
  }, [cloudDailyCounts]);

  const getTotalDailyCount = useCallback((): number => {
    const tools = [
      ToolType.IMAGE, 
      ToolType.VIDEO, 
      ToolType.VECTOR, 
      ToolType.PROMPT_GEN,
      ToolType.PROMPT_IMAGE,
      ToolType.PROMPT_VIDEO,
      ToolType.PROMPT_IMAGE_CHECK,
      ToolType.CALENDAR_GEN
    ];
    return tools.reduce((sum, tool) => sum + getDailyCount(tool), 0);
  }, [getDailyCount]);

  const [dailyGenCounts, setDailyGenCounts] = useState<{ [key in ToolType]?: number }>({});

  const refreshDailyCounts = useCallback(() => {
    setDailyGenCounts({
      [ToolType.IMAGE]: getDailyCount(ToolType.IMAGE),
      [ToolType.VIDEO]: getDailyCount(ToolType.VIDEO),
      [ToolType.VECTOR]: getDailyCount(ToolType.VECTOR),
      [ToolType.DASHBOARD]: 0,
      [ToolType.PROMPT_GEN]: getDailyCount(ToolType.PROMPT_GEN),
      [ToolType.PROMPT_IMAGE]: getDailyCount(ToolType.PROMPT_IMAGE),
      [ToolType.PROMPT_VIDEO]: getDailyCount(ToolType.PROMPT_VIDEO),
      [ToolType.PROMPT_IMAGE_CHECK]: getDailyCount(ToolType.PROMPT_IMAGE_CHECK),
      [ToolType.VECTOR_EPS]: 0,
      [ToolType.CALENDAR_GEN]: getDailyCount(ToolType.CALENDAR_GEN)
    });
  }, [getDailyCount]);

  const incrementDailyCount = useCallback((type: ToolType, amount: number = 1) => {
    const dateStr = getTodayDateString();
    const current = getDailyCount(type);
    const newVal = current + amount;
    localStorage.setItem(`mz_daily_gen_${type}_${dateStr}`, String(newVal));
    
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        [`dailyUsage.${dateStr}.${type}`]: newVal,
        updatedAt: new Date().toISOString()
      }).catch(err => {
        // Fallback setDoc
        setDoc(userRef, {
          dailyUsage: {
            [dateStr]: {
              [type]: newVal
            }
          },
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(e => {
          console.error("Failed to set user cloud document:", e);
        });
      });
    }

    refreshDailyCounts();
  }, [getDailyCount, refreshDailyCounts, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Live real-time sync user profile (license key & subscription/trial status) from Firestore
  useEffect(() => {
    if (!user) {
      setCloudDailyCounts({});
      return;
    }

    const dateStr = getTodayDateString();
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // 1. Sync license key
        if (data.licenseKey !== undefined) {
          const cloudKey = data.licenseKey || '';
          setMzLicenseKey(cloudKey);
          if (cloudKey) {
            localStorage.setItem('mz_license_key', cloudKey);
          } else {
            localStorage.removeItem('mz_license_key');
          }
        }

        // 2. Sync trialStart
        if (data.trialStart) {
          localStorage.setItem('mz_trial_start', data.trialStart);
        }

        // 3. Sync daily gen counts for today
        if (data.dailyUsage && data.dailyUsage[dateStr]) {
          const usageToday = data.dailyUsage[dateStr];
          setCloudDailyCounts(usageToday);
          // Sync to localStorage for offline access/backup
          Object.keys(usageToday).forEach((typeKey) => {
            localStorage.setItem(`mz_daily_gen_${typeKey}_${dateStr}`, String(usageToday[typeKey]));
          });
        } else {
          setCloudDailyCounts({});
        }
      } else {
        // Init cloud user profile if missing
        const localKey = localStorage.getItem('mz_license_key') || '';
        const localTrialStart = localStorage.getItem('mz_trial_start') || new Date().toISOString();
        localStorage.setItem('mz_trial_start', localTrialStart);

        // Prepopulate standard daily counts to cloud if any
        const initialUsage: any = {};
        const tools = [
          ToolType.IMAGE, 
          ToolType.VIDEO, 
          ToolType.VECTOR, 
          ToolType.PROMPT_GEN,
          ToolType.PROMPT_IMAGE,
          ToolType.PROMPT_VIDEO,
          ToolType.PROMPT_IMAGE_CHECK,
          ToolType.CALENDAR_GEN
        ];
        tools.forEach((t) => {
          const val = localStorage.getItem(`mz_daily_gen_${t}_${dateStr}`);
          if (val) {
            initialUsage[t] = parseInt(val) || 0;
          }
        });

        setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || '',
          licenseKey: localKey,
          trialStart: localTrialStart,
          dailyUsage: {
            [dateStr]: initialUsage
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(err => {
          console.error("Error bootstrapping cloud user profile:", err);
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        });
      }
    }, (error) => {
      console.warn("Firestore user load error:", error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Keep daily counts refreshed when cloudDailyCounts changes
  useEffect(() => {
    refreshDailyCounts();
  }, [cloudDailyCounts, refreshDailyCounts]);

  // Live real-time sync branding from Firestore
  useEffect(() => {
    const docRef = doc(db, 'branding', 'main');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.appName) {
          setMzAppName(data.appName);
          localStorage.setItem('mz_reseller_app_name', data.appName);
        }
        if (data.appSubtitle) {
          setMzAppSubtitle(data.appSubtitle);
          localStorage.setItem('mz_reseller_app_subtitle', data.appSubtitle);
        }
        if (data.whatsAppLink) {
          setMzWhatsApp(data.whatsAppLink);
          localStorage.setItem('mz_reseller_whatsapp', data.whatsAppLink);
        }
        if (data.pricingTier) {
          setMzPriceText(data.pricingTier);
          localStorage.setItem('mz_reseller_price', data.pricingTier);
        }
        if (data.licenseSeed) {
          setMzLicenseSeed(data.licenseSeed);
          localStorage.setItem('mz_reseller_seed', data.licenseSeed);
        }
      } else {
        // Init fallback bootstrap
        setDoc(docRef, {
          appName: 'MetaZo PRO',
          appSubtitle: 'AI-Powered Metadata Assistant',
          whatsAppLink: 'https://chat.whatsapp.com/L7pY6H8Y6H8Y6H8Y6H8Y6H',
          pricingTier: 'Rp 149.000 / Bulan',
          licenseSeed: 'MZPRO-COMMERCIAL-2026',
          payInfo: 'Transfer Bank Manual: BCA 817-092-3659 a/n Johan Chrismant',
          updatedAt: new Date().toISOString()
        }).catch(err => {
          console.error('Bootstrap branding error:', err);
          handleFirestoreError(err, OperationType.WRITE, 'branding/main');
        });
      }
    }, (error) => {
      console.warn('Firestore branding load error, keeping local cached entries:', error);
      handleFirestoreError(error, OperationType.GET, 'branding/main');
    });
    return () => unsubscribe();
  }, []);

  // Trial Period tracking (Unlimited)
  const [trialDaysLeft, setTrialDaysLeft] = useState(() => {
    return 99999;
  });

  // Automatically check trial status on mount or when licensing changes
  useEffect(() => {
    if (!isMzLicensed && trialDaysLeft <= 0) {
      setShowActivationModal(true);
    }
  }, [isMzLicensed, trialDaysLeft]);

  // Wrapped activeTool setter to enforce trial constraints
  const handleSetActiveTool = (tool: ToolType) => {
    // Free Trial has unlocked all tools ("Semua fiturnya kebuka")
    setActiveTool(tool);
  };

  useEffect(() => {
    const k = mzLicenseKey.trim().toUpperCase();
    if (!k) {
      setIsMzLicensed(false);
      setSubDaysLeft(null);
      return;
    }

    const s = mzLicenseSeed.trim().toUpperCase();
    const isOfflineValid = 
      k === s ||
      k === 'MZPRO-VIP-2026' || 
      k === 'MZPRO-UNLIMITED-LIFE' || 
      k === 'MZPRO-COMMERCIAL-2026' ||
      (k.startsWith('MZPRO-') && k.endsWith('-OK')) ||
      (k.length >= 10 && k.includes('MZ') && k.includes('2026'));

    if (isOfflineValid) {
      setIsMzLicensed(true);
      setSubDaysLeft(null);
      return;
    }

    let devId = localStorage.getItem('mz_device_id');
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
      localStorage.setItem('mz_device_id', devId);
    }

    getDoc(doc(db, 'keys', k))
      .then(dSnap => {
        if (dSnap.exists()) {
          const data = dSnap.data();
          if (data.activated) {
            // Check if 30days subscription is expired
            if (data.duration === '30days' && data.activatedAt) {
              const activatedTime = new Date(data.activatedAt).getTime();
              const nowTime = new Date().getTime();
              const elapsedMs = nowTime - activatedTime;
              const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
              const remainingDays = 30 - elapsedDays;

              if (remainingDays <= 0) {
                setIsMzLicensed(false);
                setSubDaysLeft(null);
                localStorage.removeItem('mz_license_key');
                setMzLicenseKey('');
                alert('Masa berlangganan 30 Hari Anda telah habis! Sistem secara otomatis mematikan lisensi terdaftar dan mengembalikan Anda ke masa trial.');
                return;
              }
              setSubDaysLeft(Math.max(0, remainingDays));
            } else {
              setSubDaysLeft(null);
            }
            setIsMzLicensed(true);
          } else {
            setIsMzLicensed(false);
            setSubDaysLeft(null);
            localStorage.removeItem('mz_license_key');
            setMzLicenseKey('');
          }
        } else {
          setIsMzLicensed(false);
          setSubDaysLeft(null);
          localStorage.removeItem('mz_license_key');
          setMzLicenseKey('');
        }
      })
      .catch(err => {
        console.error('License validator connection error:', err);
        handleFirestoreError(err, OperationType.GET, `keys/${k}`);
      });
  }, [mzLicenseKey, mzLicenseSeed]);

  const handleTryUnlockReseller = (typedVal?: string) => {
    const val = (typedVal !== undefined ? typedVal : resellerPasscodeVal).trim();
    if (val === 'METAZO-OWNER-2026' || val === 'METAZO-RESELLER-2026') {
      setIsResellerUnlocked(true);
      localStorage.setItem('mz_reseller_unlocked', 'true');
      setActiveSettingsTab('reseller');
      setShowResellerUnlockInput(false);
      setResellerPasscodeVal('');
      setResellerPasscodeError('');
    } else {
      setResellerPasscodeError('Passcode salah atau kedaluwarsa!');
    }
  };

  const [geminiKeysList, setGeminiKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('gemini_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [groqKeysList, setGroqKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('groq_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [mistralKeysList, setMistralKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('mistral_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [openaiKeysList, setOpenaiKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('openai_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [openrouterKeysList, setOpenrouterKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('openrouter_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [blackboxKeysList, setBlackboxKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('blackbox_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [nvidiaKeysList, setNvidiaKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('nvidia_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [selectedNvidiaModel, setSelectedNvidiaModel] = useState<string>(localStorage.getItem('mz_nvidia_model') || 'stepfun-ai/step-3.5-flash');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<'auto' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3-flash' | 'gemma-4-31b-it'>(() => (localStorage.getItem('mz_gemini_model') as any) || 'auto');
  const [selectedGroqModel, setSelectedGroqModel] = useState<'llama-3.3-70b-versatile' | 'llama-4-scout-17b-16e-instruct'>(() => (localStorage.getItem('mz_groq_model') as any) || 'llama-3.3-70b-versatile');

  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [newGroqKey, setNewGroqKey] = useState('');
  const [newMistralKey, setNewMistralKey] = useState('');
  const [newOpenaiKey, setNewOpenaiKey] = useState('');
  const [newOpenrouterKey, setNewOpenrouterKey] = useState('');
  const [newBlackboxKey, setNewBlackboxKey] = useState('');
  const [newNvidiaKey, setNewNvidiaKey] = useState('');

  const [keyTestingIndex, setKeyTestingIndex] = useState<number | null>(null);
  const [keyTestProvider, setKeyTestProvider] = useState<'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { type: 'success' | 'error' | 'quota'; message: string }>>({}); // "provider-index"
  const [hasCustomKeySaved, setHasCustomKeySaved] = useState(() => {
    const geminiSaved = (localStorage.getItem('gemini_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const groqSaved = (localStorage.getItem('groq_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const mistralSaved = (localStorage.getItem('mistral_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const openaiSaved = (localStorage.getItem('openai_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const openrouterSaved = (localStorage.getItem('openrouter_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const blackboxSaved = (localStorage.getItem('blackbox_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const nvidiaSaved = (localStorage.getItem('nvidia_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    
    return (
      geminiSaved.length > 0 ||
      groqSaved.length > 0 ||
      mistralSaved.length > 0 ||
      openaiSaved.length > 0 ||
      openrouterSaved.length > 0 ||
      blackboxSaved.length > 0 ||
      nvidiaSaved.length > 0
    );
  });

  useEffect(() => {
    if (showSettingsModal) {
      const gSaved = localStorage.getItem('gemini_api_key') || '';
      const grSaved = localStorage.getItem('groq_api_key') || '';
      const mSaved = localStorage.getItem('mistral_api_key') || '';
      const oSaved = localStorage.getItem('openai_api_key') || '';
      const orSaved = localStorage.getItem('openrouter_api_key') || '';
      const bSaved = localStorage.getItem('blackbox_api_key') || '';
      const nSaved = localStorage.getItem('nvidia_api_key') || '';
      const pSaved = (localStorage.getItem('ai_provider') || 'gemini') as 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia';

      const gParsed = gSaved.split(',').map(k => k.trim()).filter(Boolean);
      const grParsed = grSaved.split(',').map(k => k.trim()).filter(Boolean);
      const mParsed = mSaved.split(',').map(k => k.trim()).filter(Boolean);
      const oParsed = oSaved.split(',').map(k => k.trim()).filter(Boolean);
      const orParsed = orSaved.split(',').map(k => k.trim()).filter(Boolean);
      const bParsed = bSaved.split(',').map(k => k.trim()).filter(Boolean);
      const nParsed = nSaved.split(',').map(k => k.trim()).filter(Boolean);

      setGeminiKeysList(gParsed);
      setGroqKeysList(grParsed);
      setMistralKeysList(mParsed);
      setOpenaiKeysList(oParsed);
      setOpenrouterKeysList(orParsed);
      setBlackboxKeysList(bParsed);
      setNvidiaKeysList(nParsed);
      
      setNewGeminiKey('');
      setNewGroqKey('');
      setNewMistralKey('');
      setNewOpenaiKey('');
      setNewOpenrouterKey('');
      setNewBlackboxKey('');
      setNewNvidiaKey('');

      setSelectedProvider(pSaved);
      setHasCustomKeySaved(
        gParsed.length > 0 || 
        grParsed.length > 0 || 
        mParsed.length > 0 ||
        oParsed.length > 0 ||
        orParsed.length > 0 ||
        bParsed.length > 0 ||
        nParsed.length > 0
      );
      setKeyTestingIndex(null);
      setKeyTestProvider(null);
      setKeyTestResults({});
    }
  }, [showSettingsModal]);

  const handleTestKeyAtIndex = async (provider: 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia', index: number, keyValue: string) => {
    if (!keyValue.trim()) return;
    setKeyTestingIndex(index);
    setKeyTestProvider(provider);

    const compoundKey = `${provider}-${index}`;
    setKeyTestResults(prev => {
      const copy = { ...prev };
      delete copy[compoundKey];
      return copy;
    });

    let endpoint = '/api/test-gemini-key';
    if (provider === 'groq') endpoint = '/api/test-groq-key';
    if (provider === 'mistral') endpoint = '/api/test-mistral-key';
    if (provider === 'openai') endpoint = '/api/test-openai-key';
    if (provider === 'openrouter') endpoint = '/api/test-openrouter-key';
    if (provider === 'blackbox') endpoint = '/api/test-blackbox-key';
    if (provider === 'nvidia') endpoint = '/api/test-nvidia-key';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyValue.trim() })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.quotaExceeded) {
          setKeyTestResults(prev => ({
            ...prev,
            [compoundKey]: { type: 'quota', message: 'Quota habis (RESOURCE_EXHAUSTED)' }
          }));
        } else {
          setKeyTestResults(prev => ({
            ...prev,
            [compoundKey]: { type: 'success', message: 'Key valid & terkoneksi!' }
          }));
        }
      } else {
        setKeyTestResults(prev => ({
          ...prev,
          [compoundKey]: { type: 'error', message: data.error || 'Key salah atau tidak valid.' }
        }));
      }
    } catch (e: any) {
      setKeyTestResults(prev => ({
        ...prev,
        [compoundKey]: { type: 'error', message: e.message || 'Koneksi error.' }
      }));
    } finally {
      setKeyTestingIndex(null);
      setKeyTestProvider(null);
    }
  };

  const handleAddApiKey = (provider: 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia') => {
    let key = '';
    let currentList: string[] = [];
    
    if (provider === 'gemini') {
      key = newGeminiKey.trim();
      currentList = geminiKeysList;
    } else if (provider === 'groq') {
      key = newGroqKey.trim();
      currentList = groqKeysList;
    } else if (provider === 'mistral') {
      key = newMistralKey.trim();
      currentList = mistralKeysList;
    } else if (provider === 'openai') {
      key = newOpenaiKey.trim();
      currentList = openaiKeysList;
    } else if (provider === 'openrouter') {
      key = newOpenrouterKey.trim();
      currentList = openrouterKeysList;
    } else if (provider === 'blackbox') {
      key = newBlackboxKey.trim();
      currentList = blackboxKeysList;
    } else if (provider === 'nvidia') {
      key = newNvidiaKey.trim();
      currentList = nvidiaKeysList;
    }

    if (!key) return;
    if (currentList.some(k => k === key)) {
      alert("API Key ini sudah ada dalam daftar!");
      return;
    }

    if (provider === 'gemini') {
      setGeminiKeysList(prev => [...prev, key]);
      setNewGeminiKey('');
    } else if (provider === 'groq') {
      setGroqKeysList(prev => [...prev, key]);
      setNewGroqKey('');
    } else if (provider === 'mistral') {
      setMistralKeysList(prev => [...prev, key]);
      setNewMistralKey('');
    } else if (provider === 'openai') {
      setOpenaiKeysList(prev => [...prev, key]);
      setNewOpenaiKey('');
    } else if (provider === 'openrouter') {
      setOpenrouterKeysList(prev => [...prev, key]);
      setNewOpenrouterKey('');
    } else if (provider === 'blackbox') {
      setBlackboxKeysList(prev => [...prev, key]);
      setNewBlackboxKey('');
    } else if (provider === 'nvidia') {
      setNvidiaKeysList(prev => [...prev, key]);
      setNewNvidiaKey('');
    }
  };

  const handleDeleteApiKey = (provider: 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia', index: number) => {
    let listSetter: any;
    let list: string[] = [];

    if (provider === 'gemini') {
      listSetter = setGeminiKeysList;
      list = geminiKeysList;
    } else if (provider === 'groq') {
      listSetter = setGroqKeysList;
      list = groqKeysList;
    } else if (provider === 'mistral') {
      listSetter = setMistralKeysList;
      list = mistralKeysList;
    } else if (provider === 'openai') {
      listSetter = setOpenaiKeysList;
      list = openaiKeysList;
    } else if (provider === 'openrouter') {
      listSetter = setOpenrouterKeysList;
      list = openrouterKeysList;
    } else if (provider === 'blackbox') {
      listSetter = setBlackboxKeysList;
      list = blackboxKeysList;
    } else if (provider === 'nvidia') {
      listSetter = setNvidiaKeysList;
      list = nvidiaKeysList;
    }

    listSetter((prev: string[]) => prev.filter((_, i) => i !== index));

    setKeyTestResults(prev => {
      const updated = { ...prev };
      list.forEach((_, i) => {
        delete updated[`${provider}-${i}`];
      });

      const filtered = list.filter((_, i) => i !== index);
      filtered.forEach((kValue, i) => {
        const oldIndex = i < index ? i : i + 1;
        const oldRes = prev[`${provider}-${oldIndex}`];
        if (oldRes) {
          updated[`${provider}-${i}`] = oldRes;
        }
      });

      return updated;
    });
  };

  const handleSaveKey = () => {
    const cleanGemini = geminiKeysList.map(k => k.trim()).filter(Boolean);
    const cleanGroq = groqKeysList.map(k => k.trim()).filter(Boolean);
    const cleanMistral = mistralKeysList.map(k => k.trim()).filter(Boolean);
    const cleanOpenai = openaiKeysList.map(k => k.trim()).filter(Boolean);
    const cleanOpenrouter = openrouterKeysList.map(k => k.trim()).filter(Boolean);
    const cleanBlackbox = blackboxKeysList.map(k => k.trim()).filter(Boolean);
    const cleanNvidia = nvidiaKeysList.map(k => k.trim()).filter(Boolean);

    if (cleanGemini.length > 0) {
      localStorage.setItem('gemini_api_key', cleanGemini.join(','));
    } else {
      localStorage.removeItem('gemini_api_key');
    }

    if (cleanGroq.length > 0) {
      localStorage.setItem('groq_api_key', cleanGroq.join(','));
    } else {
      localStorage.removeItem('groq_api_key');
    }

    if (cleanMistral.length > 0) {
      localStorage.setItem('mistral_api_key', cleanMistral.join(','));
    } else {
      localStorage.removeItem('mistral_api_key');
    }

    if (cleanOpenai.length > 0) {
      localStorage.setItem('openai_api_key', cleanOpenai.join(','));
    } else {
      localStorage.removeItem('openai_api_key');
    }

    if (cleanOpenrouter.length > 0) {
      localStorage.setItem('openrouter_api_key', cleanOpenrouter.join(','));
    } else {
      localStorage.removeItem('openrouter_api_key');
    }

    if (cleanBlackbox.length > 0) {
      localStorage.setItem('blackbox_api_key', cleanBlackbox.join(','));
    } else {
      localStorage.removeItem('blackbox_api_key');
    }

    if (cleanNvidia.length > 0) {
      localStorage.setItem('nvidia_api_key', cleanNvidia.join(','));
    } else {
      localStorage.removeItem('nvidia_api_key');
    }

    localStorage.setItem('ai_provider', selectedProvider);
    setHasCustomKeySaved(
      cleanGemini.length > 0 || 
      cleanGroq.length > 0 || 
      cleanMistral.length > 0 || 
      cleanOpenai.length > 0 || 
      cleanOpenrouter.length > 0 || 
      cleanBlackbox.length > 0 || 
      cleanNvidia.length > 0
    );
    setShowSettingsModal(false);
  };

  const handleResetKey = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('groq_api_key');
    localStorage.removeItem('mistral_api_key');
    localStorage.removeItem('ai_provider');
    
    setGeminiKeysList([]);
    setGroqKeysList([]);
    setMistralKeysList([]);
    setSelectedProvider('gemini');
    setHasCustomKeySaved(false);
    setKeyTestResults({});
  };

  const handleCloseWelcome = () => {
      sessionStorage.setItem('vixer_welcomed', 'true');
      setShowWelcomeScreen(false);
  };
  
  const [autoDownloadCSV, setAutoDownloadCSVState] = useState(false);
  const [mobileTab, setMobileTab] = useState<'upload' | 'ai' | 'review'>('upload');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const autoDownloadCSVRef = useRef(false);
  const setAutoDownloadCSV = (val: boolean) => {
      setAutoDownloadCSVState(val);
      autoDownloadCSVRef.current = val;
      if (val) {
          setExportAdobe(true);
          setExportShutterstock(true);
          setExportVecteezy(true);
          setExportCanva(true);
          setExportFreepik(true);
      } else {
          setExportAdobe(false);
          setExportShutterstock(false);
          setExportVecteezy(false);
          setExportCanva(false);
          setExportFreepik(false);
      }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopGenerationRef = useRef(false);

  // Auto-Resume from IndexedDB
  useEffect(() => {
      // Preload video worker to avoid slow initialization later
      if (!sharedVideoWorker) {
          sharedVideoWorker = new Worker(new URL('./src/workers/videoWorker.ts', import.meta.url), { type: 'module' });
          sharedVideoWorker.postMessage({ type: 'init' });
      }

      const checkResume = async () => {
          try {
              const state = await loadStateFromDB();
              if (state && state.files && state.files.length > 0) {
                  console.log("Resuming batch from IndexedDB...");
                  
                  // Reset stuck states. If a file was extracting/generating during the crash, mark it as failed
                  // so it doesn't hang the UI forever.
                  const cleanedFiles = state.files.map((f: any) => {
                      if (f.isExtracting || f.isGenerating) {
                          return { 
                              ...f, 
                              isExtracting: false, 
                              isGenerating: false, 
                              error: f.error || "Gagal diproses karena server kehabisan memori. Silakan coba lagi." 
                          };
                      }
                      return f;
                  });
                  
                  updateFiles(() => cleanedFiles);
                  setKeywordCount(state.keywordCount);
                  setCustomPrompt(state.customPrompt);
                  setActiveTool(state.activeTool);
                  setGenerationMode(state.generationMode);
                  if (state.keywordMode) {
                      setKeywordMode(state.keywordMode);
                  }
                  
                  // Clear the DB so we don't resume again on next normal refresh
                  await clearStateFromDB();
                  
                  // Wait a tiny bit for state to settle, then auto-start
                  setTimeout(() => {
                      // Don't use isRetry=true here, because we want to process files that haven't been processed yet.
                      // The ones that crashed now have an error, so they won't be auto-retried (preventing infinite crash loops).
                      // The user can manually click "Retry Failed" later if they want.
                      handleGenerateAll(false);
                  }, 1000);
              }
          } catch (e) {
              console.warn("Failed to load state from DB:", e);
          }
      };
      checkResume();
  }, []);

  useEffect(() => {
      if (triggerAutoDownload > 0 && autoDownloadCSVRef.current) {
          handleExport();
      }
  }, [triggerAutoDownload]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      try { localStorage.setItem('theme', 'dark'); } catch (e) {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('theme', 'light'); } catch (e) {}
    }
  }, [theme]);

  const extractFramesForFile = async (file: File, ext: string): Promise<string[]> => {
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          return new Promise<string[]>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                  const img = new Image();
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      // Reduce MAX_SIZE to 768px. AI doesn't need high res, and this makes base64 7x smaller!
                      const MAX_SIZE = 768;
                      let width = img.width;
                      let height = img.height;
                      
                      if (width > MAX_SIZE || height > MAX_SIZE) {
                          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                          width *= ratio;
                          height *= ratio;
                      }
                      
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                          ctx.fillStyle = '#FFFFFF';
                          ctx.fillRect(0, 0, width, height);
                          ctx.drawImage(img, 0, 0, width, height);
                          // Lower quality to 0.6 for massive speedup in network transfer
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                          canvas.width = 0;
                          canvas.height = 0;
                          resolve([dataUrl]);
                      } else {
                          resolve([e.target?.result as string]);
                      }
                  };
                  img.onerror = () => resolve([e.target?.result as string]);
                  img.src = e.target?.result as string;
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
          });
      } else if (['mp4', 'mov', 'webm'].includes(ext)) {
          const frames = await extractVideoHybrid(file);
          if (frames && frames.length >= 3) {
              return [frames[0], frames[1], frames[2]];
          } else if (frames && frames.length > 0) {
              return [frames[0]];
          } else {
              throw new Error("Failed to extract video frames. Format might be unsupported or corrupted.");
          }
      } else if (ext === 'svg') {
          return new Promise<string[]>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                  let svgData = e.target?.result as string;
                  const img = new Image();
                  img.crossOrigin = "Anonymous";
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const originalWidth = img.width || 1024;
                      const originalHeight = img.height || 1024;
                      
                      // Scale down to max 768px
                      const scale = Math.min(768 / originalWidth, 768 / originalHeight);
                      canvas.width = originalWidth * scale;
                      canvas.height = originalHeight * scale;
                      
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                          ctx.fillStyle = '#FFFFFF';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                          canvas.width = 0;
                          canvas.height = 0;
                          resolve([dataUrl]);
                      } else {
                          resolve([svgData]);
                      }
                  };
                  img.onerror = () => resolve([svgData]);
                  img.src = svgData;
              };
              reader.readAsDataURL(file);
          });
      } else if (ext === 'eps' || ext === 'ai') {
          const clientSidePreview = await extractEPSClientSide(file);
          if (clientSidePreview) {
              return [clientSidePreview];
          } else {
              let retryCount = 0;
              const maxRetries = 3; // Reduced to 3 retries because if the server OOMs repeatedly, it will never succeed
              while (retryCount < maxRetries) {
                  if (stopGenerationRef.current) throw new Error("Cancelled by user");
                  
                  try {
                      let response;
                      const fileExt = file.name.split('.').pop();
                      const getUrlRes = await fetch(`/api/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'application/postscript')}`);
                      const getUrlData = await getUrlRes.json().catch(() => ({}));
                      
                      let uploadedUrl = null;

                      if (getUrlRes.ok && getUrlData.uploadUrl && getUrlData.fileUrl) {
                          // TRICK: S3 is configured, upload linearly via presigned URL to solve "masalah file large"
                          console.log('Using presigned URL to upload large file:', file.name);
                          const putRes = await fetch(getUrlData.uploadUrl, {
                              method: 'PUT',
                              body: file,
                              headers: { 'Content-Type': file.type || 'application/postscript' }
                          });
                          if (!putRes.ok) throw new Error(`Failed to upload to storage: ${putRes.status}`);
                          uploadedUrl = getUrlData.fileUrl;
                      } else {
                          // Try Vercel Blob if S3 fails or is unconfigured
                          try {
                              const { upload } = await import('@vercel/blob/client');
                              const blob = await upload(file.name, file, {
                                  access: 'public',
                                  handleUploadUrl: '/api/upload-vercel-blob'
                              });
                              uploadedUrl = blob.url;
                          } catch (blobErr) {
                              // Silently fallback to multipart if Vercel Blob isn't configured
                          }
                      }

                      if (uploadedUrl) {
                          // Now ask the server to process the URL
                          response = await fetch(`/api/convert-eps-url?t=${Date.now()}_${Math.random()}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ fileUrl: uploadedUrl })
                          });
                      } else {
                          // S3 not configured or failed, fallback to multipart
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          // TRICK: Append a cache-buster to prevent the proxy from caching a 200 OK HTML response
                          response = await fetch(`/api/convert-eps?t=${Date.now()}_${Math.random()}`, {
                              method: 'POST',
                              body: formData
                          });
                      }
                      
                      const contentType = response.headers.get("content-type");
                      
                      // TRICK: If the server restarted, Vite might intercept the POST request and return index.html (Status 200).
                      // We must detect this and throw a specific error to trigger a retry.
                      if (contentType && contentType.includes("text/html")) {
                          throw new Error("CONTAINER_RESTARTING: Server returned HTML instead of image");
                      }
                      
                      if (!response.ok) {
                          // If it's a 413 error, payload is too large
                          if (response.status === 413) {
                              const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('meta-zo-update.vercel.app');
                              const platformLimit = isVercel ? "4.5MB (Vercel limit)" : "500MB (Server limit)";
                              throw new Error(`File is too large. ${platformLimit} exceeded. Try optimizing your EPS/AI file or deploy to a platform with higher body limits.`);
                          }
                          // If it's a 500 error, Ghostscript failed (e.g., memory limit). Don't retry, it will just fail again.
                          if (response.status === 500) {
                              const data = await response.json().catch(() => ({}));
                              throw new Error(`Ghostscript Error: ${data.error || 'Failed to convert'}`);
                          }
                          throw new Error(`Server error (${response.status})`);
                      }
                      
                      if (contentType && contentType.indexOf("image/jpeg") !== -1) {
                          const blob = await response.blob();
                          // TRICK: Use Object URL instead of Data URL (base64) to save massive amounts of browser RAM.
                          // A 1MB JPEG becomes a 1.3MB base64 string. 100 files = 130MB of strings in React state!
                          // Object URLs are just pointers to the blob in memory, much more efficient.
                          const objectUrl = URL.createObjectURL(blob);
                          return [objectUrl];
                      } else if (contentType && contentType.indexOf("application/json") !== -1) {
                          // Fallback in case server returns JSON error
                          const data = await response.json();
                          if (data.error) throw new Error(data.error);
                      }
                      
                      const text = await response.text().catch(() => 'no text');
                      throw new Error(`CONTAINER_RESTARTING_DEBUG: status=${response.status}, type=${contentType}, body=${text.substring(0, 100)}`);
                  } catch (err: any) {
                      // Only retry on actual network errors or 502/503/504 (container restarting/timeout)
                      const isNetworkOrRestart = err.message.includes('CONTAINER_RESTARTING') || 
                                                 err.message.includes('Server error (502)') || 
                                                 err.message.includes('Server error (503)') || 
                                                 err.message.includes('Server error (504)') || 
                                                 err.message.includes('Failed to fetch') ||
                                                 err.message.includes('network');
                                                 
                      const isCapacityLimit = err.message.includes('429') ||
                                              err.message.includes('capacity') ||
                                              err.message.includes('maximum');
                                                 
                      if (isNetworkOrRestart || isCapacityLimit) {
                          retryCount++;
                          if (retryCount < maxRetries) {
                              console.warn(`EPS conversion failed (${err.message}), retrying ${retryCount}/${maxRetries}...`);
                              // TRICK: If rate limited, wait 5 seconds. If restarting, wait 20s.
                              const delay = isCapacityLimit ? 5000 : 20000;
                              await new Promise(resolve => setTimeout(resolve, delay));
                              continue;
                          } else {
                              // TRICK: If we exhausted all retries and it's still restarting, the server is truly stuck or memory is completely fragmented.
                              console.error("Max retries reached. Server keeps failing.");
                              throw new Error("Gagal diproses karena kerumitan file. Server secara otomatis memutus koneksi (Out Of Memory). Harap perkecil ukuran/kerumitan EPS Anda sebelum diunggah.");
                          }
                      }
                      throw new Error(`Failed to convert Vector (EPS/AI): ${err.message}`);
                  }
              }
              throw new Error("Failed to convert Vector (EPS/AI) after multiple attempts.");
          }
      }
      throw new Error("Unsupported file format.");
  };

  const handleFileChange = async (event: any) => {
    const selectedFiles = Array.from(event.target.files as FileList || []);
    if (!selectedFiles.length) return;

    const initialFiles: FileItem[] = [];

    const allowedImageExts = ['jpg', 'jpeg', 'png', 'webp'];
    const allowedVideoExts = ['mp4', 'mov', 'webm'];
    const allowedVectorExts = ['svg', 'eps', 'ai'];

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

        let errorMsg: string | null = null;
        
        let isValid = false;
        if (activeTool === ToolType.IMAGE && allowedImageExts.includes(ext)) isValid = true;
        else if (activeTool === ToolType.VIDEO && allowedVideoExts.includes(ext)) isValid = true;
        else if (activeTool === ToolType.VECTOR && allowedVectorExts.includes(ext)) isValid = true;

        if (!isValid) continue; // Skip unsupported files silently or handle validation but since it's forced * we skip.

        // File Size Validation
        const isVector = allowedVectorExts.includes(ext);
        const maxVectorSize = 500 * 1024 * 1024; // 500MB for everyone since we use Cloud Storage
        
        if (isVector && file.size > maxVectorSize) {
            errorMsg = `File too large. Maximum 500MB for Vector (EPS/AI). Please optimize your file below 500MB.`;
        }

        let thumbnail = null;
        if (!errorMsg) {
            if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'mp4', 'mov', 'webm'].includes(ext)) {
                thumbnail = URL.createObjectURL(file);
            }
        }

        initialFiles.push({
            id,
            file,
            title: '',
            description: '',
            keywords: [],
            adobeCategoryId: '',
            shutterstockCategory1: '',
            shutterstockCategory2: '',
            isGenerating: false,
            isExtracting: false,
            error: errorMsg,
            thumbnail: thumbnail,
            analysisFrames: []
        });
    }

    updateFiles(prev => [...prev, ...initialFiles]);
    
    if (initialFiles.length > 0) {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(50); } catch (e) {}
      }
      setMobileTab('ai');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processOneFile = async (fileItem: FileItem): Promise<boolean> => {
    if (stopGenerationRef.current) return false;
    
    // If the file already has an error (e.g. file size limit set during selection), don't process it.
    if (fileItem.error) {
        console.warn(`Skipping file ${fileItem.id} due to pre-existing error: ${fileItem.error}`);
        return false;
    }

    try {
        if (!isMzLicensed) {
            const totalToday = getTotalDailyCount();
            if (totalToday >= 30) {
                setShowLimitModal(true);
                throw new Error("Limit harian telah habis.");
            }
        }

        updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, isGenerating: true } : f));
        
        let analysisFrames = fileItem.analysisFrames;
        
        if (!analysisFrames || analysisFrames.length === 0) {
            updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, isExtracting: true } : f));
            const ext = fileItem.file.name.split('.').pop()?.toLowerCase() || '';
            analysisFrames = await extractFramesForFile(fileItem.file, ext);
            updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, isExtracting: false, analysisFrames } : f));
        }

        if (!analysisFrames || analysisFrames.length === 0) {
            throw new Error("Tidak ada data visual untuk dianalisis.");
        }
        
        let retryCount = 0;
        const maxRetries = 10; // Allow multiple retries for rate limits

        while (retryCount < maxRetries) {
            if (stopGenerationRef.current) return false;

            try {
              const kCount = keywordCount || 25;
              let modelParam: string | undefined = undefined;
              if (selectedProvider === 'gemini') {
                  modelParam = selectedGeminiModel === 'auto' ? undefined : selectedGeminiModel;
              } else if (selectedProvider === 'groq') {
                  modelParam = selectedGroqModel;
              } else if (selectedProvider === 'nvidia') {
                  modelParam = selectedNvidiaModel;
              }
              const aiOptions = {
                provider: selectedProvider,
                geminiKeys: geminiKeysList,
                groqKeys: groqKeysList,
                mistralKeys: mistralKeysList,
                openaiKeys: openaiKeysList,
                openrouterKeys: openrouterKeysList,
                nvidiaKeys: nvidiaKeysList,
                blackboxKeys: blackboxKeysList
              };
              const metadata = await generateStockMetadata(analysisFrames, kCount, customPrompt, activeTool, aiCreativity, modelParam, keywordMode, aiOptions);
              
              updateFiles(prev => prev.map(f => f.id === fileItem.id ? {
                ...f,
                title: toSentenceCase(metadata.title),
                description: metadata.description,
                keywords: metadata.keywords,
                adobeCategoryId: metadata.category_id,
                shutterstockCategory1: metadata.shutterstock_category_1,
                shutterstockCategory2: metadata.shutterstock_category_2,
                categoryReason: metadata.category_reason,
                isGenerating: false,
                error: null
              } : f));
              
              if (!isMzLicensed) {
                incrementDailyCount(activeTool, 1);
              }

              return true; // Success
            } catch (err: any) {
              const errorMessage = err.message || "Failed to contact AI";
              
              // Check for rate limit error (429)
              if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                  setIsPaused(true);
                  updateFiles(prev => prev.map(f => f.id === fileItem.id ? { 
                    ...f, 
                    error: "API Limit reached. Waiting to try again..." 
                  } : f));
                  
                  // Wait for 30 seconds before retrying
                  await backgroundSafeTimeout(30000);
                  setIsPaused(false);
                  retryCount++;
                  continue; // Try again
              }

              throw new Error(errorMessage);
            }
        }
        
        throw new Error("Processing failed after multiple attempts due to API limit.");
    } catch (err: any) {
        const errMsg = err?.message || (typeof err === 'string' ? err : "Failed to process file.");
        updateFiles(prev => prev.map(f => f.id === fileItem.id ? { 
            ...f, 
            isGenerating: false, 
            isExtracting: false,
            error: errMsg 
        } : f));
        return true;
    }
  };

  const processBatchFiles = async (chunk: FileItem[]): Promise<boolean> => {
    if (stopGenerationRef.current) return false;

    try {
        if (!isMzLicensed) {
            const totalToday = getTotalDailyCount();
            if (totalToday >= 30) {
                setShowLimitModal(true);
                throw new Error("Limit harian telah habis.");
            }
        }

        // 1. Mark as extracting/generating
        updateFiles(prev => prev.map(f => chunk.find(c => c.id === f.id) ? { ...f, isGenerating: true } : f));

        // 2. Extract frames for those that need it
        const itemsToProcess: { id: string, frames: string[] }[] = [];
        for (const fileItem of chunk) {
            let frames = fileItem.analysisFrames;
            if (!frames || frames.length === 0) {
                updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, isExtracting: true } : f));
                const ext = fileItem.file.name.split('.').pop()?.toLowerCase() || '';
                try {
                    frames = await extractFramesForFile(fileItem.file, ext);
                    updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, isExtracting: false, analysisFrames: frames } : f));
                } catch (err: any) {
                    const errMsg = err?.message || (typeof err === 'string' ? err : "Failed to extract file.");
                    updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, isExtracting: false, isGenerating: false, error: errMsg } : f));
                    continue;
                }
            }
            if (frames && frames.length > 0) {
                itemsToProcess.push({ id: fileItem.id, frames });
            }
        }

        let finalItemsToProcess = itemsToProcess;
        if (!isMzLicensed) {
            const totalToday = getTotalDailyCount();
            const remaining = Math.max(0, 30 - totalToday);
            if (finalItemsToProcess.length > remaining) {
                const allowed = finalItemsToProcess.slice(0, remaining);
                const excluded = finalItemsToProcess.slice(remaining);
                updateFiles(prev => prev.map(f => {
                    if (excluded.some(ex => ex.id === f.id)) {
                        return { ...f, isGenerating: false, isExtracting: false, error: "Limit harian telah habis." };
                    }
                    return f;
                }));
                if (remaining === 0) setShowLimitModal(true);
                finalItemsToProcess = allowed;
            }
        }

        if (finalItemsToProcess.length === 0) return true;

        // 3. Call API
        let retryCount = 0;
        const maxRetries = 10;
        while (retryCount < maxRetries) {
            if (stopGenerationRef.current) return false;
            try {
                const kCount = keywordCount || 25;
                let modelParam: string | undefined = undefined;
                if (selectedProvider === 'gemini') {
                    modelParam = selectedGeminiModel === 'auto' ? undefined : selectedGeminiModel;
                } else if (selectedProvider === 'groq') {
                    modelParam = selectedGroqModel;
                } else if (selectedProvider === 'nvidia') {
                    modelParam = selectedNvidiaModel;
                }
                const aiOptions = {
                  provider: selectedProvider,
                  geminiKeys: geminiKeysList,
                  groqKeys: groqKeysList,
                  mistralKeys: mistralKeysList,
                  openaiKeys: openaiKeysList,
                  openrouterKeys: openrouterKeysList,
                  nvidiaKeys: nvidiaKeysList,
                  blackboxKeys: blackboxKeysList
                };
                const batchResults = await generateBatchStockMetadata(finalItemsToProcess, kCount, customPrompt, activeTool, aiCreativity, modelParam, keywordMode, aiOptions);

                // 4. Update state
                updateFiles(prev => prev.map(f => {
                    const result = batchResults.find(r => r.id === f.id);
                    if (result) {
                        return {
                            ...f,
                            title: toSentenceCase(result.metadata.title),
                            description: result.metadata.description,
                            keywords: result.metadata.keywords,
                            adobeCategoryId: result.metadata.category_id,
                            shutterstockCategory1: result.metadata.shutterstock_category_1,
                            shutterstockCategory2: result.metadata.shutterstock_category_2,
                            categoryReason: result.metadata.category_reason,
                            isGenerating: false,
                            error: null
                        };
                    } else if (finalItemsToProcess.some(fi => fi.id === f.id)) {
                        // Mark as failed if it was part of batch but no result was returned
                        return { ...f, isGenerating: false, error: "Model did not return result for this asset in batch" };
                    }
                    return f;
                }));

                if (!isMzLicensed) {
                    incrementDailyCount(activeTool, batchResults.length);
                }

                return true;
            } catch (err: any) {
                const errorMessage = err.message || "Failed to contact AI";
                if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                    setIsPaused(true);
                    updateFiles(prev => prev.map(f => chunk.find(c => c.id === f.id) ? { ...f, error: "API Limit reached. Waiting..." } : f));
                    await backgroundSafeTimeout(30000);
                    setIsPaused(false);
                    retryCount++;
                    continue;
                }
                throw new Error(errorMessage);
            }
        }
        throw new Error("Processing failed after multiple attempts.");
    } catch (err: any) {
         const errMsg = err?.message || (typeof err === 'string' ? err : "Failed to process file.");
         updateFiles(prev => prev.map(f => chunk.find(c => c.id === f.id) ? { ...f, isGenerating: false, isExtracting: false, error: errMsg } : f));
         return true;
    }
  };

  const handleGenerateAll = async (isRetry = false) => {
    if (!isMzLicensed) {
      const totalToday = getTotalDailyCount();
      if (totalToday >= 30) {
        setShowLimitModal(true);
        return;
      }
    }

    // Initial check to see if there's anything to do at all
    const currentFilesForCheck = filesRef.current;
    const initialPending = isRetry 
        ? currentFilesForCheck.filter(f => f.error) 
        : currentFilesForCheck.filter(f => !f.title && !f.error);
        
    if (!initialPending.length) return;

    setIsLoading(true);
    setMobileTab('review');
    startTabKeepAlive();
    stopGenerationRef.current = false;
    const startTime = Date.now();
    
    // Extracted loop so we can wrap it in Web Locks API
    const processingLoop = async () => {
        let processedInThisRun = 0;

        while (!stopGenerationRef.current) {
            const currentFiles = filesRef.current;
            
            // What needs processing?
            const pending = isRetry
                ? currentFiles.filter(f => f.error && !f.isExtracting) // If retry, only retry failed ones that aren't extracting // If retry, only retry failed ones that aren't extracting // If retry, only retry failed ones that aren't extracting
                : currentFiles.filter(f => !f.title && !f.error); // If normal, process un-generated, un-errored ones // If normal, process un-generated, un-errored ones // If normal, process un-generated, un-errored ones
                
            if (pending.length === 0) {
                break; // All done!
            }

            // Which ones are ready right now?
            const ready = pending.filter(f => !f.isExtracting && !f.isGenerating);
            
            if (ready.length === 0) {
                // Some files are still extracting or generating. Wait and poll.
                await backgroundSafeTimeout(500);
                continue;
            }

            // Process a chunk
            // Increase batch size to 10 for images to save massive amounts of API calls!
            let maxBatch = 10;
            if (activeTool === ToolType.VIDEO) maxBatch = 3;
            else if (activeTool === ToolType.VECTOR) maxBatch = 5;
            
            const chunkSize = generationMode === GenerationMode.BATCH ? maxBatch : 1;
            const chunk = ready.slice(0, chunkSize);
            
            try {
                if (generationMode === GenerationMode.BATCH) {
                    await processBatchFiles(chunk);
                    processedInThisRun += chunk.length;
                } else {
                    for (const file of chunk) {
                        if (stopGenerationRef.current) break;
                        await processOneFile(file);
                        processedInThisRun++;
                    }
                }
            } catch (err: any) {
                console.error("Batch processing error:", err);
            }
            
            // Update progress info
            const latestFiles = filesRef.current;
            const totalToProcess = isRetry 
                ? latestFiles.filter(f => f.error).length + processedInThisRun
                : latestFiles.filter(f => !f.title && !f.error).length + processedInThisRun;
                
            setProgressInfo({
                current: processedInThisRun,
                total: totalToProcess,
                duration: Math.floor((Date.now() - startTime) / 1000)
            });
        }

        if (!stopGenerationRef.current && processedInThisRun > 0) {
            setTriggerAutoDownload(Date.now());
        }

        setIsLoading(false);
        setIsPaused(false);
        stopTabKeepAlive();
        stopGenerationRef.current = false;
        setTimeout(() => setProgressInfo(null), 5000);
    };

    // --- TRICK 3: WEB LOCKS API ---
    // Requests an official "Lock" from the browser/OS, signaling that there is a critical 
    // process running so this CPU thread should not be throttled in the background.
    if ('locks' in navigator) {
        navigator.locks.request('vixer-hard-processing', async () => {
            await processingLoop();
        }).catch(err => {
            console.warn("Web Locks API failed, falling back to normal loop.", err);
            processingLoop();
        });
    } else {
        await processingLoop();
    }
  };

  const handleStopGeneration = () => {
      stopGenerationRef.current = true;
      setIsLoading(false);
      setIsPaused(false);
      stopTabKeepAlive();
      // Clean up any files that were stuck in "generating" state
      updateFiles(prev => prev.map(f => f.isGenerating ? { ...f, isGenerating: false, error: "Cancelled by user" } : f));
  };

  const handleExport = () => {
    const validFiles = files.filter(f => f.title);
    if (!validFiles.length) return;

    const getExportFilename = (originalName: string) => {
        return originalName;
    };

    if (exportAdobe) {
      // Adobe Stock CSV Format: Filename,Title,Keywords,Category
      const headers = ['Filename', 'Title', 'Keywords', 'Category'];
      const rows = validFiles.map(f => [
          getExportFilename(f.customFileName || f.file.name), 
          `"${f.title.replace(/"/g, '""')}"`, 
          `"${f.keywords.join(', ').replace(/"/g, '""')}"`, 
          f.adobeCategoryId
      ]);
      const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetazoAI_Export_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportShutterstock) {
      // Shutterstock CSV Format: Filename,Description,Keywords,Categories,Editorial,Mature content,illustration
      const headers = ['Filename', 'Description', 'Keywords', 'Categories', 'Editorial', 'Mature content', 'illustration'];
      const rows = validFiles.map(f => {
          const categoryName = ADOBE_CATEGORIES.find(c => c.id === f.adobeCategoryId)?.name || '';
          
          let combinedDescription = f.description || f.title;
          if (shutterstockDescMode === 'title_desc' && f.description && f.title !== f.description) {
              // Ensure title doesn't already end with a dot before adding one
              const cleanTitle = f.title.trim().replace(/\.$/, '');
              combinedDescription = `${cleanTitle}. ${f.description.trim()}`;
          }

          return [
              getExportFilename(f.customFileName || f.file.name),
              `"${combinedDescription.replace(/"/g, '""')}"`,
              `"${f.keywords.join(',').replace(/"/g, '""')}"`,
              `"${[f.shutterstockCategory1, f.shutterstockCategory2].filter(Boolean).filter(c => c.toLowerCase() !== 'arts').map(c => c.toLowerCase()).join(', ')}"`,
              'no',
              'no',
              activeTool === ToolType.VECTOR ? 'yes' : 'no'
          ];
      });
      const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Shutterstock_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportVecteezy) {
      // Vecteezy CSV Format: Filename,Title,Description,Keywords,License,Id
      const headers = ['Filename', 'Title', 'Description', 'Keywords', 'License', 'Id'];
      const rows = validFiles.map(f => {
          const escapeCsv = (str: string) => {
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
          };
          
          const removeSpecialChars = (str: string) => {
              // 1. Normalize and remove accents/diacritics (e.g., é -> e)
              let cleaned = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              // 2. Remove any character that is NOT a letter (a-z, A-Z), number (0-9), space, or common punctuation (.,-)
              // This strictly strips out non-ASCII characters (like Cyrillic, Chinese, Emoji etc)
              cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,-]/g, "");
              // 3. Remove excess whitespace
              return cleaned.replace(/\s+/g, ' ').trim();
          };
          
          const cleanTitle = removeSpecialChars(f.title);
          const titleField = escapeCsv(cleanTitle);
          
          // Filter out forbidden keywords and remove special characters for Vecteezy
          const forbiddenKeywords = ['photo', 'vector', 'video'];
          const filteredKeywords = f.keywords
              .map(k => removeSpecialChars(k))
              .filter(k => k.length > 0 && !forbiddenKeywords.includes(k.toLowerCase().trim()));
          const keywordsField = `"${filteredKeywords.join(', ').replace(/"/g, '""')}"`;
          
          // Sanitize filename for Vecteezy: replace spaces, '(', and ')' with '_'
          // Example: "nama (1).mp4" -> "nama__1_.mp4"
          const originalFilename = getExportFilename(f.customFileName || f.file.name);
          const vecteezyFilename = originalFilename.split(' ').join('_').split('(').join('_').split(')').join('_');
          
          return [
              escapeCsv(vecteezyFilename),
              titleField,
              titleField, // Description matches Title
              keywordsField,
              'Free', // License automatically set to Free
              '' // Id left empty
          ];
      });
      // Do NOT use BOM (\ufeff) for Vecteezy, their parser fails to read "Filename" if BOM is present
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Vecteezy_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportCanva) {
      // Canva CSV Format: filename,title,keywords,description
      const headers = ['filename', 'title', 'keywords', 'description'];
      const rows = validFiles.map(f => {
          const escapeCsv = (str: string) => {
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
          };
          
          return [
              escapeCsv(getExportFilename(f.customFileName || f.file.name)),
              escapeCsv(f.title),
              `"${f.keywords.slice(0, 20).join(',').replace(/"/g, '""')}"`, // Canva uses comma without space, max 20 keywords
              escapeCsv(f.description || f.title)
          ];
      });
      // No BOM for Canva to be safe
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Canva_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportFreepik) {
      // Freepik CSV Format: File name;Title;Keywords;Prompt;Model
      const headers = ['File name', 'Title', 'Keywords', 'Prompt', 'Model'];
      const rows = validFiles.map(f => {
          const escapeCsv = (str: string) => {
              if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
          };
          
          return [
              escapeCsv(getExportFilename(f.customFileName || f.file.name)),
              escapeCsv(f.title),
              escapeCsv(f.keywords.join(',')), // Freepik keywords comma separated
              '', // Prompt
              ''  // Model
          ];
      });
      // Freepik uses semicolon separator
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Freepik_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  };

  const handleDeleteFile = (id: string) => {
    const fileItem = files.find(f => f.id === id);
    if (fileItem && fileItem.analysisFrames) {
        fileItem.analysisFrames.forEach(frame => {
            if (frame.startsWith('blob:')) {
                URL.revokeObjectURL(frame);
            }
        });
    }
    updateFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRegenerateFile = async (fileItem: FileItem) => {
    updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, error: null, isGenerating: true } : f));
    await processOneFile({ ...fileItem, error: null });
  };

  const t = TRANSLATIONS[uiLanguage];

  if (isCheckingAuth) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-[#f8f9fc] dark:bg-[#090d16] text-[#5a5c69] dark:text-slate-100 transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <Loader2 size={40} className="animate-spin text-[#7c3aed]" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Memuat MetaZo PRO...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen 
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} 
        theme={theme} 
        setTheme={setTheme} 
        language={uiLanguage}
        setLanguage={setUiLanguage}
        t={t} 
      />
    );
  }

  const hasFiles = files.length > 0;
  const filesToGenerateCount = files.filter(f => !f.title && !f.error && !f.isExtracting).length;
  const filesWithErrorCount = files.filter(f => f.error).length;
  const isAnythingGenerating = files.some(f => f.isGenerating || f.isExtracting);
  const canDownload = hasFiles && files.some(f => f.title);
  const successfulFilesCount = files.filter(f => f.title).length;
  const isAllFinished = hasFiles && !isAnythingGenerating && files.every(f => f.title || f.error);

  return (
    <div className={`min-h-screen flex bg-[#f8f9fc] dark:bg-[#090d16] text-[#5a5c69] dark:text-slate-100 transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex flex-1 w-full bg-transparent overflow-hidden relative">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTool={activeTool} 
        setActiveTool={handleSetActiveTool} 
        sidebarCollapsed={sidebarCollapsed} 
        setSidebarCollapsed={setSidebarCollapsed} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        generationMode={generationMode} 
        setGenerationMode={setGenerationMode} 
        t={t} 
        filesLength={files.length} 
        isLicensed={isMzLicensed}
        setShowActivation={setShowActivationModal}
        onUnlockReseller={() => setShowResellerUnlockInput(true)}
        appName={mzAppName}
      />

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar Header */}
        <Topbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          theme={theme} 
          setTheme={setTheme} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          setShowInfoModal={setShowInfoModal} 
          setShowSettingsModal={setShowSettingsModal}
          t={t} 
          setShowActivation={setShowActivationModal}
          isLicensed={!!isMzLicensed}
          uiLanguage={uiLanguage}
          setUiLanguage={setUiLanguage}
          user={user}
          activeAccountsCount={activeAccountsCount}
          onSignOut={async () => {
            try {
              await signOut(auth);
            } catch (err) {
              console.error("Sign out error", err);
            }
          }}
        />

        {/* Core Dashboard Stage */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {activeTool === ToolType.DASHBOARD ? (
            <DashboardView 
              files={files}
              setActiveTool={handleSetActiveTool}
              setShowInfoModal={setShowInfoModal}
              successfulFilesCount={successfulFilesCount}
              filesToGenerateCount={filesToGenerateCount}
              filesWithErrorCount={filesWithErrorCount}
              unprocessedFilesCount={filesToGenerateCount}
              generationMode={generationMode}
              isLicensed={isMzLicensed}
              appName={mzAppName}
              pricingTier={mzPriceText || t.default_pricing}
              whatsAppLink={mzWhatsApp}
              setShowActivation={setShowActivationModal}
              imageDailyCount={dailyGenCounts[ToolType.IMAGE] || 0}
              videoDailyCount={dailyGenCounts[ToolType.VIDEO] || 0}
              vectorDailyCount={dailyGenCounts[ToolType.VECTOR] || 0}
              t={t}
              userName={user?.displayName || user?.email?.split('@')[0] || ''}
            />
          ) : activeTool === ToolType.PROMPT_GEN ? (
            <PromptGenView 
              t={t} 
              prefilledSubject={prefilledSubject} 
              onPrefillConsumed={() => setPrefilledSubject('')} 
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_GEN] || 0}
              incrementDailyCount={() => incrementDailyCount(ToolType.PROMPT_GEN)}
              aiOptions={{
                provider: selectedProvider,
                geminiKeys: geminiKeysList,
                groqKeys: groqKeysList,
                mistralKeys: mistralKeysList,
                openaiKeys: openaiKeysList,
                openrouterKeys: openrouterKeysList,
                nvidiaKeys: nvidiaKeysList,
                blackboxKeys: blackboxKeysList
              }}
            />
          ) : activeTool === ToolType.PROMPT_IMAGE ? (
            <PromptImageView 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_IMAGE] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE, amount)}
              setShowLimitModal={setShowLimitModal}
              aiOptions={{
                provider: selectedProvider,
                geminiKeys: geminiKeysList,
                groqKeys: groqKeysList,
                mistralKeys: mistralKeysList,
                openaiKeys: openaiKeysList,
                openrouterKeys: openrouterKeysList,
                nvidiaKeys: nvidiaKeysList,
                blackboxKeys: blackboxKeysList
              }}
            />
          ) : activeTool === ToolType.PROMPT_VIDEO ? (
            <PromptVideoView 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_VIDEO] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_VIDEO, amount)}
              setShowLimitModal={setShowLimitModal}
              aiOptions={{
                provider: selectedProvider,
                geminiKeys: geminiKeysList,
                groqKeys: groqKeysList,
                mistralKeys: mistralKeysList,
                openaiKeys: openaiKeysList,
                openrouterKeys: openrouterKeysList,
                nvidiaKeys: nvidiaKeysList,
                blackboxKeys: blackboxKeysList
              }}
            />
          ) : activeTool === ToolType.PROMPT_IMAGE_CHECK ? (
            <ImageCheckView 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_IMAGE_CHECK] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE_CHECK, amount)}
              setShowLimitModal={setShowLimitModal}
              aiOptions={{
                provider: selectedProvider,
                geminiKeys: geminiKeysList,
                groqKeys: groqKeysList,
                mistralKeys: mistralKeysList,
                openaiKeys: openaiKeysList,
                openrouterKeys: openrouterKeysList,
                nvidiaKeys: nvidiaKeysList,
                blackboxKeys: blackboxKeysList
              }}
            />
          ) : activeTool === ToolType.CALENDAR_GEN ? (
            <CalendarGenView 
              t={t}
              onSendToPrompt={(text) => {
                setPrefilledSubject(text);
                handleSetActiveTool(ToolType.PROMPT_GEN);
              }}
              aiOptions={{
                provider: selectedProvider,
                geminiKeys: geminiKeysList,
                groqKeys: groqKeysList,
                mistralKeys: mistralKeysList,
                openaiKeys: openaiKeysList,
                openrouterKeys: openrouterKeysList,
                nvidiaKeys: nvidiaKeysList,
                blackboxKeys: blackboxKeysList
              }}
            />
          ) : (
            <>
              {/* Welcome Intro Row */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-1 relative overflow-hidden border-b border-slate-200 dark:border-white/5 pb-4">
                {/* Global Progress Bar for Batch Metadata Generation */}
                {isLoading && progressInfo && (
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-300 ease-out z-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
                  />
                )}
                
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                      {activeTool === ToolType.IMAGE ? "Image AI Workspace" : activeTool === ToolType.VIDEO ? "Video AI Workspace" : "Vector AI Workspace"}
                    </h2>
                    <FeatureGuideButton 
                      title={activeTool === ToolType.IMAGE ? t.guide_image_title : activeTool === ToolType.VIDEO ? t.guide_video_title : t.guide_vector_title}
                      description={activeTool === ToolType.IMAGE ? t.guide_image_desc : activeTool === ToolType.VIDEO ? t.guide_video_desc : t.guide_vector_desc}
                      t={t}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">
                    {activeTool === ToolType.IMAGE && "JPG, PNG & WEBP metadata optimizer"}
                    {activeTool === ToolType.VIDEO && "Frame sequential MP4/MOV metadata assistant"}
                    {activeTool === ToolType.VECTOR && "EPS, SVG & AI graphic indexing assistant"}
                  </p>
                </div>
                {/* Live active form formats overlay */}
                <div className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[1.5rem] font-bold text-xs flex items-center space-x-2 text-slate-500 dark:text-slate-400 shadow-md shadow-black/5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse bg-violet-500`} />
                  <span>
                    {activeTool === ToolType.IMAGE && "Supports: JPEG, PNG, WEBP"}
                    {activeTool === ToolType.VIDEO && "Supports: MP4, MOV, WEBM"}
                    {activeTool === ToolType.VECTOR && "Supports: SVG, EPS, AI"}
                  </span>
                </div>
              </div>

              {/* Core Analytics Cards Block */}
              <MetricsRow 
                filesLength={files.length} 
                successfulFilesCount={successfulFilesCount} 
                filesToGenerateCount={filesToGenerateCount} 
                filesWithErrorCount={filesWithErrorCount} 
              />

              {/* Handheld Segment Switches (Hidden on Desktop) */}
              <div className="flex lg:hidden w-full bg-slate-100 dark:bg-slate-900 rounded-[1.5rem] p-1 border border-slate-200 dark:border-white/5">
                {['upload', 'ai', 'review'].map((tab) => {
                  const label = tab === 'upload' ? '1. Upload' : tab === 'ai' ? '2. AI Config' : '3. Queue';
                  return (
                    <button
                      key={tab}
                      onClick={() => setMobileTab(tab as any)}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all ${
                        mobileTab === tab 
                          ? 'bg-[#7c3aed] text-white shadow-md shadow-black/5' 
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Section Row 1: Upload Panel (Left Component) and Gemini Automation Panel (Right Component) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <UploadPanel 
                  activeTool={activeTool} 
                  isDragging={isDragging} 
                  setIsDragging={setIsDragging} 
                  handleFileChange={handleFileChange} 
                  fileInputRef={fileInputRef} 
                  files={files} 
                  setPreviewFile={setPreviewFile} 
                  updateFiles={updateFiles} 
                  mobileTab={mobileTab} 
                  setMobileTab={setMobileTab} 
                  t={t} 
                />

                <AiConfigPanel 
                  activeTool={activeTool} 
                  customPrompt={customPrompt} 
                  setCustomPrompt={setCustomPrompt} 
                  keywordCount={keywordCount} 
                  setKeywordCount={setKeywordCount} 
                  keywordMode={keywordMode}
                  setKeywordMode={setKeywordMode}
                  aiCreativity={aiCreativity}
                  setAiCreativity={setAiCreativity}
                  isLoading={isLoading} 
                  progressInfo={progressInfo} 
                  isPaused={isPaused} 
                  filesToGenerateCount={filesToGenerateCount} 
                  filesWithErrorCount={filesWithErrorCount} 
                  handleGenerateAll={handleGenerateAll} 
                  handleStopGeneration={handleStopGeneration} 
                  mobileTab={mobileTab} 
                  setMobileTab={setMobileTab} 
                  t={t} 
                  hasFiles={files.length > 0} 
                />
              </div>

              {/* Section Row 2: Queue Review & Editor Component */}
              <ReviewQueue 
                files={files} 
                activeTool={activeTool} 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                setPreviewFile={setPreviewFile} 
                updateFiles={updateFiles} 
                handleDeleteFile={handleDeleteFile} 
                handleRegenerateFile={handleRegenerateFile}
                mobileTab={mobileTab} 
                setMobileTab={setMobileTab} 
                t={t} 
                isAllFinished={isAllFinished} 
                successfulFilesCount={successfulFilesCount} 
                canDownload={canDownload}
                isLoading={isLoading}
                progressInfo={progressInfo}
                aiOptions={{
                  provider: selectedProvider,
                  geminiKeys: geminiKeysList,
                  groqKeys: groqKeysList,
                  mistralKeys: mistralKeysList,
                  openaiKeys: openaiKeysList,
                  openrouterKeys: openrouterKeysList,
                  nvidiaKeys: nvidiaKeysList,
                  blackboxKeys: blackboxKeysList
                }}
              />

              {/* Section Row 3: Bulk Export Integration Panels */}
              {hasFiles && (
                <ExportPanel 
                  exportAdobe={exportAdobe} 
                  setExportAdobe={setExportAdobe} 
                  exportShutterstock={exportShutterstock} 
                  setExportShutterstock={setExportShutterstock} 
                  exportVecteezy={exportVecteezy} 
                  setExportVecteezy={setExportVecteezy} 
                  exportCanva={exportCanva} 
                  setExportCanva={setExportCanva} 
                  exportFreepik={exportFreepik} 
                  setExportFreepik={setExportFreepik} 
                  shutterstockDescMode={shutterstockDescMode} 
                  setShutterstockDescMode={setShutterstockDescMode} 
                  autoDownloadCSV={autoDownloadCSV} 
                  setAutoDownloadCSV={setAutoDownloadCSV} 
                  canDownload={canDownload} 
                  handleExport={handleExport} 
                  t={t} 
                />
              )}
            </>
          )}
        </main>

        <footer className="text-center py-6 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#090d16] mt-auto">
          <p>{t.footer_text} | v1.1.1 PRO</p>
        </footer>
      </div>

      {previewFile && (
        <FilePreview 
          fileItem={previewFile} 
          onClose={() => setPreviewFile(null)} 
          setFiles={setFiles}
          setPreviewFile={setPreviewFile}
        />
      )}

      {showWelcomeScreen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/5 text-center flex flex-col items-center">
            <div className="w-12 h-12 mb-4 bg-[#7c3aed] rounded-[1.5rem] flex items-center justify-center shadow animate-pulse">
              <Zap className="text-white fill-white" size={24} />
            </div>
            <h2 className="text-sm font-black text-[#7c3aed] mb-2 uppercase">{t.welcome_title}</h2>
            <p className="text-xs text-slate-500 mb-6 font-semibold bg-emerald-500/5 px-2 py-1 rounded">{t.welcome_subtitle}</p>
            <div className="text-left w-full mb-6">
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">{t.welcome_features_label}</p>
              <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4">
                <li>{t.welcome_feature1}</li>
                <li>{t.welcome_feature2}</li>
                <li>{t.welcome_feature3}</li>
                <li>{t.welcome_feature4}</li>
              </ul>
            </div>
            <button onClick={handleCloseWelcome} className="w-full py-2.5 bg-[#7c3aed] hover:bg-violet-600 text-white font-bold rounded-2xl text-xs uppercase">{t.welcome_get_started}</button>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={14} /></button>
            <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-200 dark:border-white/5">
              <span className="p-1.5 bg-violet-500/10 rounded-2xl">
                <Info size={16} className="text-[#7c3aed]" />
              </span>
              <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{t.info_modal_title}</h2>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div>
                <h3 className="font-extrabold text-[#7c3aed] dark:text-violet-400 uppercase tracking-wider mb-2 text-[11px]">{t.info_modal_operational_guide}</h3>
                <ol className="space-y-2.5 list-decimal pl-4">
                  <li>
                    <strong className="text-slate-800 dark:text-white">{t.info_modal_step1_title}</strong>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.info_modal_step1_desc_p1} <strong className="text-[#7c3aed]">Image</strong>, <strong className="text-purple-500">Video</strong>, {t.common_or} <strong className="text-emerald-500">Vector</strong> {t.info_modal_step1_desc_p2}</p>
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-white">{t.info_modal_step2_title}</strong>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.info_modal_step2_desc}</p>
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-white">{t.info_modal_step3_title}</strong>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-bold italic text-violet-500 bg-violet-500/5 p-1 rounded">{t.info_modal_step3_desc_highlight}</p>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-1">{t.info_modal_step3_desc_main}</p>
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-white">{t.info_modal_step4_title}</strong>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.info_modal_step4_desc}</p>
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-white">{t.info_modal_step5_title}</strong>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.info_modal_step5_desc}</p>
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-white">{t.info_modal_step6_title}</strong>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.info_modal_step6_desc}</p>
                  </li>
                </ol>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-extrabold text-emerald-500 uppercase tracking-wider mb-2 text-[11px]">{t.info_modal_tips_title}</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-2.5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5">
                    <span className="font-black text-slate-800 dark:text-white text-[10px] uppercase">{t.info_modal_std_mode_title}</span>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.info_modal_std_mode_desc}</p>
                  </div>
                  <div className="p-2.5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5">
                    <span className="font-black text-slate-800 dark:text-white text-[10px] uppercase">{t.info_modal_batch_mode_title}</span>
                    <p className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.info_modal_batch_mode_desc}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-extrabold text-[#7c3aed] dark:text-violet-400 uppercase tracking-wider mb-2 text-[11px]">{t.info_modal_trial_premium_title}</h3>
                <div className="space-y-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    <p><strong className="text-slate-800 dark:text-white">{t.info_modal_trial_mode_label}</strong> {t.info_modal_trial_mode_desc}</p>
                    <p><strong className="text-slate-800 dark:text-white">{t.info_modal_premium_mode_label}</strong> {t.info_modal_premium_mode_desc}</p>
                    <p>{t.info_modal_license_cta}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-extrabold text-violet-500 uppercase tracking-wider mb-2 text-[11px]">{t.info_modal_supported_formats}</h3>
                <ul className="grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase">
                  <li className="p-1.5 rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20">JPEG, PNG, WEBP</li>
                  <li className="p-1.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20">MP4, MOV, WEBM</li>
                  <li className="p-1.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">SVG, EPS, AI</li>
                </ul>
              </div>
            </div>
            
            <button onClick={() => setShowInfoModal(false)} className="mt-6 w-full py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold rounded-2xl text-xs uppercase shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">{t.info_modal_close_button}</button>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={14} /></button>
            
            <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-200 dark:border-white/5 shrink-0 select-none">
              <span className="p-1.5 bg-violet-500/10 rounded-2xl">
                <Settings size={16} className="text-[#7c3aed] animate-spin-slow" />
              </span>
              <div className="flex-1 flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{t.settings_modal_title}</h2>
              </div>
            </div>
            
            {/* Pemilihan Provider Utama */}
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shrink-0 shadow-inner">
              <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2">{t.settings_main_provider_label}</label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSelectedProvider(val);
                  setActiveSettingsTab(val);
                }}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
              >
                {[
                  { id: 'gemini', name: 'Gemini', desc: 'Google AI' },
                  { id: 'groq', name: 'Groq', desc: 'Llama 4 Scout / Vision' },
                  { id: 'mistral', name: 'Mistral', desc: 'Mistral Large' },
                  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o / DALL-E' },
                  { id: 'openrouter', name: 'Open Router', desc: 'Multi-LLM access' },
                  { id: 'blackbox', name: 'Blackbox AI', desc: 'Code specialized' },
                  { id: 'nvidia', name: 'NVIDIA', desc: 'NVIDIA NIM' }
                ].map(prov => (
                  <option key={prov.id} value={prov.id}>
                    {prov.name} - {prov.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* TAB Tombol */}
            <select
              value={activeSettingsTab}
              onChange={(e) => setActiveSettingsTab(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all mb-4 shadow-md shadow-black/5"
            >
              {(['gemini', 'groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'reseller'] as const).map(tab => (
                <option key={tab} value={tab}>
                  {tab === 'reseller' ? '💻 Reseller Portal' : `${tab.toUpperCase()} Keys`}
                </option>
              ))}
            </select>

            {/* Tab Content */}
            <div className="space-y-4 text-xs font-semibold overflow-y-auto pr-1 flex-1 scrollbar-thin">
              {activeSettingsTab === 'gemini' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2">{t.settings_gemini_model_label}</label>
                    <select
                      value={selectedGeminiModel}
                      onChange={(e) => {
                          const val = e.target.value as any;
                          setSelectedGeminiModel(val);
                          localStorage.setItem('mz_gemini_model', val);
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                    >
                      <option value="auto">{t.settings_gemini_model_auto}</option>
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                      <option value="gemini-3-flash">Gemini 3 Flash</option>
                      <option value="gemma-4-31b-it">Gemma 4 31B IT (Free RPD 1.5K)</option>
                    </select>
                  </div>
                  
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    {t.settings_gemini_desc}
                  </p>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">{t.settings_gemini_key_list} ({geminiKeysList.length})</label>
                    
                    {geminiKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">{t.settings_use_default_key}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {geminiKeysList.map((key, index) => {
                          const keyId = `gemini-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`gemini-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'gemini';
                          const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                          
                          return (
                            <div key={keyId} className="flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <Key size={12} className="text-slate-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{maskedKey}</span>
                                
                                {testResult && (
                                  <span 
                                    title={testResult.message}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${
                                    testResult.type === 'success' 
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                                      : testResult.type === 'quota'
                                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-305'
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350'
                                  }`}>
                                    {testResult.type === 'success' ? 'AKTIF/OK' : testResult.type === 'quota' ? 'QUOTA LIMIT' : 'ERROR'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyAtIndex('gemini', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('gemini', index)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Gemini</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="API Key Gemini (AIzaSy...)"
                        value={newGeminiKey}
                        onChange={(e) => setNewGeminiKey(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddApiKey('gemini')}
                        disabled={!newGeminiKey.trim()}
                        className="py-2 px-3 bg-[#7c3aed] hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 shrink-0"
                      >
                        <Plus size={12} />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'openai' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Simpan API Key OpenAI pribadi Anda untuk mengakses kemampuan GPT-4o dan DALL-E.
                  </p>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key OpenAI ({openaiKeysList.length})</label>
                    
                    {openaiKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key OpenAI ditambahkan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {openaiKeysList.map((key, index) => {
                          const keyId = `openai-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`openai-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'openai';
                          const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                          
                          return (
                            <div key={keyId} className="flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <Key size={12} className="text-slate-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{maskedKey}</span>
                                
                                {testResult && (
                                  <span 
                                    title={testResult.message}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${
                                    testResult.type === 'success' 
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350'
                                  }`}>
                                    {testResult.type === 'success' ? 'AKTIF/OK' : 'ERROR'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyAtIndex('openai', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('openai', index)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key OpenAI</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="API Key OpenAI (sk-proj...)"
                        value={newOpenaiKey}
                        onChange={(e) => setNewOpenaiKey(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddApiKey('openai')}
                        className="px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'openrouter' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Simpan API Key Open Router Anda untuk mengakses berbagai model LLM.
                  </p>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key Open Router ({openrouterKeysList.length})</label>
                    
                    {openrouterKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key Open Router ditambahkan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {openrouterKeysList.map((key, index) => {
                          const keyId = `openrouter-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`openrouter-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'openrouter';
                          const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                          
                          return (
                            <div key={keyId} className="flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <Key size={12} className="text-slate-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{maskedKey}</span>
                                
                                {testResult && (
                                  <span 
                                    title={testResult.message}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${
                                    testResult.type === 'success' 
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350'
                                  }`}>
                                    {testResult.type === 'success' ? 'AKTIF/OK' : 'ERROR'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyAtIndex('openrouter', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('openrouter', index)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Open Router</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="API Key Open Router (sk-or...)"
                        value={newOpenrouterKey}
                        onChange={(e) => setNewOpenrouterKey(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddApiKey('openrouter')}
                        className="px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'blackbox' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Simpan API Key Blackbox AI Anda untuk kemampuan coding yang terspesialisasi.
                  </p>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key Blackbox AI ({blackboxKeysList.length})</label>
                    
                    {blackboxKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key Blackbox AI ditambahkan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {blackboxKeysList.map((key, index) => {
                          const keyId = `blackbox-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`blackbox-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'blackbox';
                          const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                          
                          return (
                            <div key={keyId} className="flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <Key size={12} className="text-slate-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{maskedKey}</span>
                                
                                {testResult && (
                                  <span 
                                    title={testResult.message}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${
                                    testResult.type === 'success' 
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350'
                                  }`}>
                                    {testResult.type === 'success' ? 'AKTIF/OK' : 'ERROR'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyAtIndex('blackbox', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('blackbox', index)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Blackbox AI</label>
                    <div className="flex gap-2">
                       <input
                        type="password"
                        placeholder="API Key Blackbox AI"
                        value={newBlackboxKey}
                        onChange={(e) => setNewBlackboxKey(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddApiKey('blackbox')}
                        className="px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'nvidia' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Simpan API Key NVIDIA Anda untuk mengakses NVIDIA NIM.
                  </p>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key NVIDIA ({nvidiaKeysList.length})</label>
                    
                    {nvidiaKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key NVIDIA ditambahkan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {nvidiaKeysList.map((key, index) => {
                          const keyId = `nvidia-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`nvidia-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'nvidia';
                          const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                          
                          return (
                            <div key={keyId} className="flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <Key size={12} className="text-slate-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{maskedKey}</span>
                                
                                {testResult && (
                                  <span 
                                    title={testResult.message}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${
                                    testResult.type === 'success' 
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350'
                                  }`}>
                                    {testResult.type === 'success' ? 'AKTIF/OK' : 'ERROR'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyAtIndex('nvidia', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('nvidia', index)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key NVIDIA</label>
                    <div className="flex gap-2">
                       <input
                        type="password"
                        placeholder="API Key NVIDIA"
                        value={newNvidiaKey}
                        onChange={(e) => setNewNvidiaKey(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddApiKey('nvidia')}
                        className="px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Pilih Model</label>
                    <select
                      value={selectedNvidiaModel}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedNvidiaModel(val);
                        localStorage.setItem('mz_nvidia_model', val);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                    >
                      <option value="stepfun-ai/step-3.5-flash">Stepfun 3.5 Flash (New! - Recommended)</option>
                      <option value="nvidia/llama-3.1-nemotron-70b-instruct">Nemotron 70B (Recommended for SEO)</option>
                      <option value="meta/llama-3.2-90b-vision-instruct">Llama 3.2 90B Vision (Highest Quality)</option>
                      <option value="meta/llama-3.2-11b-vision-instruct">Llama 3.2 11B Vision (Fast)</option>
                      <option value="meta/llama-3.1-405b-instruct">Llama 3.1 405B (Ultra Powerful)</option>
                      <option value="google/paligemma-3b-224-base">Palingemma 3B (Experimental)</option>
                      <option value="stepfun/step-1.5v-vision">Stepfun 1.5V Vision</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'groq' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Masukkan API Key Groq Anda. Gunakan model tercepat untuk pemrosesan metadata.
                  </p>

                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2">Pilih Model Groq</label>
                    <select
                      value={selectedGroqModel}
                      onChange={(e) => {
                          const val = e.target.value as any;
                          setSelectedGroqModel(val);
                          localStorage.setItem('mz_groq_model', val);
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                    >
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
                      <option value="llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B Instruct</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key Groq ({groqKeysList.length})</label>
                    
                    {groqKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key Groq ditambahkan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {groqKeysList.map((key, index) => {
                          const keyId = `groq-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`groq-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'groq';
                          const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                          
                          return (
                            <div key={keyId} className="flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <Key size={12} className="text-slate-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{maskedKey}</span>
                                
                                {testResult && (
                                  <span 
                                    title={testResult.message}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${
                                    testResult.type === 'success' 
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350'
                                  }`}>
                                    {testResult.type === 'success' ? 'AKTIF/OK' : 'ERROR'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyAtIndex('groq', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('groq', index)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Groq</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="API Key Groq (gsk_...)"
                        value={newGroqKey}
                        onChange={(e) => setNewGroqKey(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddApiKey('groq')}
                        disabled={!newGroqKey.trim()}
                        className="py-2 px-3 bg-[#7c3aed] hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 shrink-0"
                      >
                        <Plus size={12} />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'mistral' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Masukkan API Key Mistral Anda. Model-model Mistral (<code className="font-mono text-[10px]">mistral-large-latest</code> dan <code className="font-mono text-[10px]">pixtral-12b</code>) memiliki akurasi kosa kata yang luar biasa, puitis, dan didesain khusus untuk optimasi metadata kelas atas.
                  </p>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key Mistral ({mistralKeysList.length})</label>
                    
                    {mistralKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key Mistral ditambahkan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {mistralKeysList.map((key, index) => {
                          const keyId = `mistral-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`mistral-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'mistral';
                          const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                          
                          return (
                            <div key={keyId} className="flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <Key size={12} className="text-slate-400 shrink-0" />
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{maskedKey}</span>
                                
                                {testResult && (
                                  <span 
                                    title={testResult.message}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${
                                    testResult.type === 'success' 
                                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                                      : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350'
                                  }`}>
                                    {testResult.type === 'success' ? 'AKTIF/OK' : 'ERROR'}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestKeyAtIndex('mistral', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('mistral', index)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="Hapus Key"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Mistral</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="API Key Mistral (mX...)"
                        value={newMistralKey}
                        onChange={(e) => setNewMistralKey(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddApiKey('mistral')}
                        disabled={!newMistralKey.trim()}
                        className="py-2 px-3 bg-[#7c3aed] hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 shrink-0"
                      >
                        <Plus size={12} />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'reseller' && (
                <SaaSPortal 
                  appName={mzAppName}
                  setAppName={setMzAppName}
                  appSubtitle={mzAppSubtitle}
                  setAppSubtitle={setMzAppSubtitle}
                  whatsAppLink={mzWhatsApp}
                  setWhatsAppLink={setMzWhatsApp}
                  pricingTier={mzPriceText}
                  setPricingTier={setMzPriceText}
                  licenseSeed={mzLicenseSeed}
                  setLicenseSeed={setMzLicenseSeed}
                  licenseKey={mzLicenseKey}
                  setLicenseKey={setMzLicenseKey}
                  isLicensed={isMzLicensed}
                  showActivation={showActivationModal}
                  setShowActivation={setShowActivationModal}
                  userEmail={user?.email || "johanchrismant4@gmail.com"}
                  userId={user?.uid}
                  isResellerUnlocked={isResellerUnlocked}
                  setIsResellerUnlocked={setIsResellerUnlocked}
                  trialDaysLeft={trialDaysLeft}
                  subDaysLeft={subDaysLeft}
                  t={t}
                />
              )}

              {/* Status Penggunaan info footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-[1.5rem] border border-slate-250 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Status Provider Aktif</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-violet-500/20 text-blue-700 dark:text-blue-300 font-black text-[9px] uppercase tracking-wider">
                  {selectedProvider.toUpperCase()} PROVIDER
                </span>
              </div>
            </div>
            
            <div className="flex gap-2.5 mt-6 shrink-0 pt-3 border-t border-slate-200 dark:border-white/5">
              {(geminiKeysList.length > 0 || groqKeysList.length > 0 || mistralKeysList.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetKey}
                  className="px-4 py-2 bg-red-50 dark:bg-red-500/5 hover:bg-red-100 text-red-600 dark:text-red-450 font-semibold rounded-[1.5rem] text-xs transition-colors border border-red-200/50 dark:border-red-500/10"
                >
                  Hapus Semua
                </button>
              )}
              <button 
                onClick={handleSaveKey} 
                className="flex-1 py-1.5 bg-[#7c3aed] hover:bg-violet-600 text-white font-bold rounded-[1.5rem] text-xs uppercase shadow transition-colors"
              >
                Simpan & Pasang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Serial Activation Popup Overlay */}
      <SaaSPortal 
        appName={mzAppName}
        setAppName={setMzAppName}
        appSubtitle={mzAppSubtitle}
        setAppSubtitle={setMzAppSubtitle}
        whatsAppLink={mzWhatsApp}
        setWhatsAppLink={setMzWhatsApp}
        pricingTier={mzPriceText}
        setPricingTier={setMzPriceText}
        licenseSeed={mzLicenseSeed}
        setLicenseSeed={setMzLicenseSeed}
        licenseKey={mzLicenseKey}
        setLicenseKey={setMzLicenseKey}
        isLicensed={isMzLicensed}
        showActivation={showActivationModal}
        setShowActivation={setShowActivationModal}
        userEmail={user?.email || "johanchrismant4@gmail.com"}
        userId={user?.uid}
        onlyModal={true}
        trialDaysLeft={trialDaysLeft}
        subDaysLeft={subDaysLeft}
        t={t}
      />

      {/* Hidden Custom Secure Reseller Passcode Dialog Overlay */}
      {showResellerUnlockInput && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => {
          setShowResellerUnlockInput(false);
          setResellerPasscodeVal('');
          setResellerPasscodeError('');
        }}>
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button 
              type="button"
              onClick={() => {
                setShowResellerUnlockInput(false);
                setResellerPasscodeVal('');
                setResellerPasscodeError('');
              }} 
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
            >
              <X size={14} />
            </button>
            <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-200 dark:border-white/5">
              <Lock size={15} className="text-[#7c3aed]" />
              <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Owner / Reseller Access</h2>
            </div>
            
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-4 leading-relaxed">
              Silakan masukkan passcode otorisasi Anda untuk membuka fitur administrasi reseller:
            </p>

            <div className="space-y-3">
              <input
                type="password"
                placeholder="Masukkan Passcode Reseller"
                value={resellerPasscodeVal}
                onChange={(e) => {
                  setResellerPasscodeVal(e.target.value);
                  setResellerPasscodeError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTryUnlockReseller();
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3.5 py-2.5 outline-none font-bold text-xs focus:border-[#7c3aed] dark:text-white transition-all text-slate-900"
                autoFocus
              />
              
              {resellerPasscodeError && (
                <p className="text-[10px] text-red-500 font-extrabold uppercase tracking-wide">⚠️ {resellerPasscodeError}</p>
              )}

              <button
                type="button"
                onClick={() => handleTryUnlockReseller()}
                className="w-full py-2.5 bg-[#7c3aed] hover:bg-violet-600 text-white font-black text-xs uppercase rounded-[1.5rem] transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Aktifkan Akses</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Harian Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowLimitModal(false)}>
          <div className="bg-white dark:bg-[#111827] rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowLimitModal(false)} 
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <Clock size={40} className="text-amber-500" />
            </div>
            
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Limit Tercapai</h2>
            <p className="text-base font-bold text-[#7c3aed] mb-4">Coba Besok lagi ya</p>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl w-full mb-6 border border-slate-100 dark:border-white/5">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Limit harian telah habis. Anda telah memproses <span className="text-slate-800 dark:text-white font-black">30 aset</span> hari ini. 
                Sila kembali besok atau aktifkan akun PRO untuk memproses tanpa batas.
              </p>
            </div>

            <button
              onClick={() => {
                // Placeholder for donation link
                alert('Terima kasih! Silakan arahkan ke halaman donasi (misal: Saweria/Trakteer).');
              }}
              className="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase rounded-xl transition-all shadow-sm"
            >
              Dukung Kami (Donate)
            </button>
            
            <button
              onClick={() => setShowLimitModal(false)}
              className="mt-3 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
            >
              Mungkin Nanti
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default App;
