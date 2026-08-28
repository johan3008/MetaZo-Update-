
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Moon, HelpCircle, X, Zap, Clock, Info, FileCode, Film, ImageIcon, Sparkles,
  AlertCircle, Copy, Check, RefreshCcw, Download, Trash2, ArrowRight, CheckCircle2,
  Heart, Menu, ChevronLeft, ChevronRight, Search, AlertTriangle, Settings, Loader2,
  Plus, Key, Lock, MessageCircle, Monitor, Palette, Gift, Tag, ExternalLink
} from 'lucide-react';
import { ToolType, GenerationMode, FileItem, ProgressInfo, toolToPath } from './types';
import { Sidebar } from './src/components/Sidebar';
import { Topbar } from './src/components/Topbar';
import { MetricsRow } from './src/components/MetricsRow';
import { UploadPanel } from './src/components/UploadPanel';
import { AiConfigPanel } from './src/components/AiConfigPanel';
import { ExportPanel } from './src/components/ExportPanel';
import { BackupManagerPanel } from './src/components/BackupManagerPanel';
import { FeatureGuideButton } from './src/components/FeatureGuideModal';
import { ReviewQueue } from './src/components/ReviewQueue';
import { DashboardView } from './src/components/DashboardView';
import { PromptGenView } from './src/components/PromptGenView';
import { PromptImageView } from './src/components/PromptImageView';
import { PromptVideoView } from './src/components/PromptVideoView';
import { ImageCheckView } from './src/components/ImageCheckView';
import { VideoQualityCheck } from './src/components/VideoQualityCheck';
import { CalendarGenView } from './src/components/CalendarGenView';
import { MuteVideoView } from './src/components/MuteVideoView';
import { MotionGenView } from './src/components/MotionGenView';
import { RemovalGenView } from './src/components/RemovalGenView';
import { ReviewsView } from './src/components/ReviewsView';
import { AutoReviewPromptModal } from './src/components/AutoReviewPromptModal';
import { SaaSPortal } from './src/components/SaaSPortal';
import { FAQAccordion } from './src/components/FAQAccordion';
import { TRANSLATIONS, AppLanguage, getDailyLimit, ADOBE_CATEGORIES, SHUTTERSTOCK_CATEGORIES, SHUTTERSTOCK_CATEGORIES_VIDEO } from './constants';
import { generateStockMetadata, generateBatchStockMetadata } from './services/geminiService';
import { copyToClipboard } from './src/utils';
import UTIF from 'utif';
import piexif from 'piexifjs';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  doc, onSnapshot, setDoc, getDoc, updateDoc, getDocs, collection, query, where, serverTimestamp, orderBy, limit, addDoc,
  db, auth, handleFirestoreError, OperationType, onAuthStateChanged, User, signOut, deleteField 
} from './src/supabase';
import { LoginScreen } from './src/components/LoginScreen';
import { Meteors } from './src/components/Meteors';
import { AboutModal } from './src/components/AboutModal';

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
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    const handleCopy = async () => {
        if (!localValue) return;
        const success = await copyToClipboard(localValue);
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

    const count = localValue ? localValue.length : 0;
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
                    value={localValue} 
                    onChange={(e) => setLocalValue(e.target.value)} 
                    onBlur={handleBlur}
                />
            ) : (
                <input 
                    type="text" 
                    className={`w-full p-4 bg-white/50 dark:bg-slate-900/40 border border-slate-300/50 dark:border-white/10 rounded-2xl text-[12px] outline-none focus:ring-4 ${focusRingClass} focus:border-blue-400 dark:focus:border-blue-700/50 transition-all font-semibold text-slate-700 dark:text-slate-200 shadow-inner`} 
                    value={localValue} 
                    onChange={(e) => setLocalValue(e.target.value)} 
                    onBlur={handleBlur}
                />
            )}
            {showLengthRating && localValue && (
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

const FileNameInputRefined: React.FC<{
  initialName: string;
  onNameChange: (newName: string) => void;
}> = ({ initialName, onNameChange }) => {
  const [localName, setLocalName] = React.useState(initialName);
  React.useEffect(() => { setLocalName(initialName); }, [initialName]);

  const handleBlur = () => {
    if (localName !== initialName) {
      onNameChange(localName);
    }
  };

  return (
    <input
      type="text"
      value={localName}
      onChange={(e) => setLocalName(e.target.value)}
      onBlur={handleBlur}
      className="bg-transparent border-b border-transparent hover:border-slate-500 focus:border-white outline-none w-full truncate cursor-text transition-colors pb-0 text-center"
      title="Edit Filename"
    />
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
          <FileNameInputRefined
            initialName={fileItem.customFileName ?? fileItem.file.name}
            onNameChange={(newName) => {
              setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, customFileName: newName } : f));
              setPreviewFile(prev => prev ? { ...prev, customFileName: newName } : null);
            }}
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



const getToolFromPath = (path: string): ToolType | null => {
  const normalized = path.toLowerCase().replace(/^\/+/g, '').trim();
  switch (normalized) {
    case 'dashboard': return ToolType.DASHBOARD;
    case 'genmetadatagambar': return ToolType.IMAGE;
    case 'genmetadatavideo': return ToolType.VIDEO;
    case 'genmetadatavektor': return ToolType.VECTOR;
    case 'seotextprompt': return ToolType.PROMPT_GEN;
    case 'imagetoprompt': return ToolType.PROMPT_IMAGE;
    case 'videokeywordanalyzer': return ToolType.PROMPT_VIDEO;
    case 'aiqualitycheck': return ToolType.PROMPT_IMAGE_CHECK;
    
    case 'aivideoqualitycheck': return ToolType.PROMPT_VIDEO_CHECK;
    case 'epsconverter': return ToolType.VECTOR_EPS;
    case 'nichecalendar': return ToolType.CALENDAR_GEN;
    case 'mutevideogen': return ToolType.MUTE_VIDEO;
    case 'motiongen': return ToolType.MOTION_GEN;
    case 'removalgen': return ToolType.REMOVAL_GEN;
    case 'communityreviews': return ToolType.REVIEWS;
    case 'reviews': return ToolType.REVIEWS;
    default: return null;
  }
};

const toSentenceCase = (text: string) => {
    if (!text) return text;
    const trimmed = text.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const getFilesForTool = (allFiles: FileItem[], tool: ToolType) => {
  const allowedImageExts = ['jpg', 'jpeg', 'png', 'webp'];
  const allowedVideoExts = ['mp4', 'mov', 'webm'];
  const allowedVectorExts = ['svg', 'eps', 'ai'];

  return allFiles.filter(f => {
    if (!f.file || !f.file.name) return false;
    const ext = f.file.name.split('.').pop()?.toLowerCase() || '';
    if (tool === ToolType.IMAGE) return allowedImageExts.includes(ext);
    if (tool === ToolType.VIDEO) return allowedVideoExts.includes(ext);
    if (tool === ToolType.VECTOR) return allowedVectorExts.includes(ext);
    return true;
  });
};

const App: React.FC = () => {
  const [matchSystemTheme, setMatchSystemTheme] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('match_system_theme');
      return saved === 'true';
    } catch (e) {}
    return false;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedMatch = localStorage.getItem('match_system_theme');
      if (savedMatch === 'true') {
        if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      }
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light';
  });

  const applyThemeWithTransition = (newTheme: 'light' | 'dark', updateMatchSystemTheme = true) => {
    if (updateMatchSystemTheme) {
      setMatchSystemTheme(false);
    }
    
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme);
        });
      });
    } else {
      setTheme(newTheme);
    }
  };

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    applyThemeWithTransition(newTheme, true);
  };

  const [activeTool, setActiveTool] = useState<ToolType>(() => {
    const currentPath = window.location.pathname;
    const matchingTool = getToolFromPath(currentPath);
    return matchingTool || ToolType.DASHBOARD;
  });
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
  const [keywordMode, setKeywordMode] = useState<'mixed' | 'single' | 'multi'>(() => {
    const saved = localStorage.getItem('mz_keyword_mode');
    if (saved === 'mixed' || saved === 'single' || saved === 'multi') {
      return saved;
    }
    return 'mixed';
  });
  const [titleLength, setTitleLength] = useState<'short' | 'medium' | 'long'>(() => (localStorage.getItem('mz_title_length') as 'short' | 'medium' | 'long') || 'medium');
  const [metadataLanguage, setMetadataLanguage] = useState<string>(() => localStorage.getItem('mz_metadata_language') || 'en');
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeAccountsCount, setActiveAccountsCount] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  // 1. Mark current user as online with frequent heartbeat & activity updates
  useEffect(() => {
    const activeUser = user || auth.currentUser;
    if (!activeUser?.uid) return;
    
    const userRef = doc(db, 'users', activeUser.uid);
    
    const markOnline = async () => {
      try {
        const u = user || auth.currentUser;
        if (!u?.uid) return;
        const name = u.displayName || (u.email ? u.email.split('@')[0] : 'User');
        await setDoc(userRef, { 
          lastSeen: Date.now(),
          email: u.email || '',
          displayName: name,
          isOnline: true
        }, { merge: true });
      } catch (e) {
        console.info('Error marking online:', e);
      }
    };
    
    markOnline();
    const interval = setInterval(markOnline, 25000); // 25s heartbeat
    
    const handleBeforeUnload = () => {
      try {
        setDoc(userRef, { lastSeen: 0, isOnline: false }, { merge: true }).catch(() => {});
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // 2. Fetch truly active (online) users REALTIME
  useEffect(() => {
    const usersRef = collection(db, 'users');
    
    const evaluateSnapshot = (snapshot: any) => {
      const uniqueUsers = new Set<string>();
      // Active window threshold: 3 minutes (180,000 ms)
      const timeoutThreshold = Date.now() - 3 * 60 * 1000;
      
      if (snapshot && typeof snapshot.forEach === 'function') {
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          let isUserOnline = false;
          
          if (data && data.lastSeen !== undefined && data.lastSeen !== null) {
            let lastSeenTime = 0;
            if (typeof data.lastSeen === 'number') {
              lastSeenTime = data.lastSeen;
            } else if (data.lastSeen.toMillis) {
              lastSeenTime = data.lastSeen.toMillis();
            } else if (typeof data.lastSeen === 'string') {
              lastSeenTime = new Date(data.lastSeen).getTime();
            } else if (data.lastSeen.seconds) {
              lastSeenTime = data.lastSeen.seconds * 1000;
            }
            
            if (lastSeenTime > timeoutThreshold) {
              isUserOnline = true;
            }
          }
          
          if (isUserOnline) {
            let nameToShow = data.displayName || (data.email ? data.email.split('@')[0] : '');
            if (!nameToShow && data.email) nameToShow = data.email;
            if (nameToShow && nameToShow !== 'Unknown') {
              uniqueUsers.add(nameToShow);
            }
          }
        });
      }
      
      const currentActiveUser = user || auth.currentUser;
      if (currentActiveUser) {
        const myName = currentActiveUser.displayName || (currentActiveUser.email ? currentActiveUser.email.split('@')[0] : 'User');
        if (myName && myName !== 'Unknown') {
          uniqueUsers.add(myName);
        }
      }
      
      const usersList = Array.from(uniqueUsers);
      const finalCount = Math.max(usersList.length, currentActiveUser ? 1 : 0);
      
      setActiveUsers(prev => {
        if (JSON.stringify(prev) === JSON.stringify(usersList)) return prev;
        return usersList;
      });
      setActiveAccountsCount(finalCount);
    };

    let lastSnapshot: any = null;
    let unsubSnapshot: (() => void) | null = null;
    try {
      unsubSnapshot = onSnapshot(usersRef, (snapshot) => {
        lastSnapshot = snapshot;
        evaluateSnapshot(snapshot);
      }, (error) => {
        console.warn("Active accounts realtime error:", error);
        evaluateSnapshot(null);
      });
    } catch (e) {
      console.warn("Error subscribing to users collection:", e);
      evaluateSnapshot(null);
    }
    
    const forceUpdateInterval = setInterval(() => {
      if (lastSnapshot) {
        evaluateSnapshot(lastSnapshot);
      } else {
        evaluateSnapshot(null);
      }
    }, 15000);

    return () => {
      unsubSnapshot?.();
      clearInterval(forceUpdateInterval);
    };
  }, [user]);

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

  useEffect(() => {
    localStorage.setItem('mz_title_length', titleLength);
  }, [titleLength]);

  useEffect(() => {
    localStorage.setItem('mz_metadata_language', metadataLanguage);
  }, [metadataLanguage]);

  // Cek status R2 saat aplikasi dimuat
  useEffect(() => {
    if (r2Status === null) {
      fetch(`/api/r2-status?t=${Date.now()}`)
        .then(r => r.json())
        .then(data => setR2Status(!!data.configured))
        .catch(() => setR2Status(false));
    }
  }, []); // eslint-disable-line

  const [aiCreativity, setAiCreativity] = useState<number>(0.7);
  const [aiModelPerformance, setAiModelPerformance] = useState<'speed' | 'detail'>('detail');
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.STANDARD);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [exportAdobe, setExportAdobe] = useState(true);
  const [exportShutterstock, setExportShutterstock] = useState(false);
  const [exportVecteezy, setExportVecteezy] = useState(false);
  const [exportCanva, setExportCanva] = useState(false);
  const [exportFreepik, setExportFreepik] = useState(false);
  const [exportPond5, setExportPond5] = useState(false);
  const [exportDepositPhotos, setExportDepositPhotos] = useState(false);
  const [exportMiriCanvas, setExportMiriCanvas] = useState(false);
  const [export123RF, setExport123RF] = useState(false);
  const [shutterstockDescMode, setShutterstockDescMode] = useState<'desc' | 'title_desc'>('desc');
  const [triggerAutoDownload, setTriggerAutoDownload] = useState(0);
  
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
      return !sessionStorage.getItem('vixer_welcomed');
  });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [infoLanguage, setInfoLanguage] = useState<'id' | 'en'>('id');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'bluesminds' | 'aivene' | 'zai'>(() => {
    const val = localStorage.getItem('ai_provider') || 'gemini';
    const validProviders = ['gemini', 'groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'bluesminds', 'aivene', 'zai'];
    if (!validProviders.includes(val)) { localStorage.setItem('ai_provider', 'gemini'); return 'gemini'; }
    return val as any;
  });
  const [activeSettingsTab, setActiveSettingsTab] = useState<'appearance' | 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'bluesminds' | 'aivene' | 'zai' | 'reseller' | 'faq_billing'>(selectedProvider);

  useEffect(() => {
    if (showSettingsModal) {
      setActiveSettingsTab(selectedProvider);
    }
  }, [showSettingsModal, selectedProvider]);

  // Reseller & License state
  const [mzAppName, setMzAppName] = useState(() => localStorage.getItem('mz_reseller_app_name') || 'MetaZo PRO');
  const [mzAppSubtitle, setMzAppSubtitle] = useState(() => localStorage.getItem('mz_reseller_app_subtitle') || 'AI-Powered Metadata Assistant');
  const [mzWhatsApp, setMzWhatsApp] = useState(() => localStorage.getItem('mz_reseller_whatsapp') || 'https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr');
  const [mzPriceText, setMzPriceText] = useState(() => localStorage.getItem('mz_reseller_price') || '');
  const [mzLicenseSeed, setMzLicenseSeed] = useState(() => localStorage.getItem('mz_reseller_seed') || 'MZPRO-COMMERCIAL-2026');
  const [mzLicenseKey, setMzLicenseKey] = useState(() => localStorage.getItem('mz_license_key') || '');
  const [isMzLicensedState, setIsMzLicensed] = useState(() => { const k = (localStorage.getItem('mz_license_key') || '').trim().toUpperCase(); return !!k; });
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const isMzLicensed = isMzLicensedState;
  const [subDaysLeft, setSubDaysLeft] = useState<number | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Promo Window States
  const [showPromoWindow, setShowPromoWindow] = useState(false);
  const [hasSyncedProfile, setHasSyncedProfile] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [lastUid, setLastUid] = useState<string | null>(null);

  const [promoCodesForModal, setPromoCodesForModal] = useState<any[]>([]);
  const [copiedCodeInModal, setCopiedCodeInModal] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid !== lastUid) {
      setHasInitiallyLoaded(false);
      setLastUid(user?.uid || null);
    }
  }, [user?.uid, lastUid]);

  useEffect(() => {
    if (!isCheckingAuth && hasSyncedProfile && !isCheckingLicense) {
      setHasInitiallyLoaded(true);
    }
  }, [isCheckingAuth, hasSyncedProfile, isCheckingLicense]);

  // Failsafe timer to guarantee loading screen never gets permanently stuck
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setHasInitiallyLoaded(true);
      setIsCheckingAuth(false);
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
    }, 1200);
    return () => clearTimeout(safetyTimer);
  }, [user?.uid]);

  const isAdminAccount = !!user && ((import.meta.env.VITE_ADMIN_UID && user.uid === import.meta.env.VITE_ADMIN_UID) || (user.email && ['johanchrismant4@gmail.com'].includes(user.email)));
  const isResellerUnlocked = isAdminAccount;
  const setIsResellerUnlocked = () => {};

  // --- Real-time Chat Notifications, Chime Synthesizer & Toasting Stack ---
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [preselectedChatPeer, setPreselectedChatPeer] = useState<any>(null);
  const [chatToasts, setChatToasts] = useState<Array<{
    id: string;
    senderName: string;
    text: string;
    isGlobal: boolean;
    peerId?: string;
    peerEmail?: string;
  }>>([]);

  const sessionStartTime = useRef<number>(Date.now());
  const notifiedMessageIds = useRef<Set<string>>(new Set());

  // Load last read timestamps from local storage
  const [lastReadGlobal, setLastReadGlobal] = useState<number>(() => {
    const val = localStorage.getItem('mz_last_read_global');
    return val ? parseInt(val) || 0 : Date.now();
  });
  
  const [lastReadRooms, setLastReadRooms] = useState<{[roomId: string]: number}>(() => {
    const val = localStorage.getItem('mz_last_read_rooms');
    try {
      return val ? JSON.parse(val) || {} : {};
    } catch {
      return {};
    }
  });

  // Reset or mark read handler
  const handleMarkRead = useCallback((type: 'global' | 'direct', peerId?: string) => {
    const now = Date.now();
    if (type === 'global') {
      localStorage.setItem('mz_last_read_global', now.toString());
      setLastReadGlobal(now);
    } else if (type === 'direct' && peerId) {
      setLastReadRooms(prev => {
        const updated = { ...prev, [peerId]: now };
        localStorage.setItem('mz_last_read_rooms', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  // Standard crystal-clear procedural sound synthesizer
  const playNotificationChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playTone(587.33, now, 0.12); // D5
      playTone(698.46, now + 0.06, 0.18); // F5
    } catch (e) {
      console.warn("Audio Context blocked or not supported", e);
    }
  }, []);

  // Toast dispatcher helper
  const pushNotificationToast = useCallback((msg: {
    id: string;
    senderName: string;
    text: string;
    isGlobal: boolean;
    peerId?: string;
    peerEmail?: string;
  }) => {
    setChatToasts(prev => {
      if (prev.some(t => t.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setTimeout(() => {
      setChatToasts(prev => prev.filter(t => t.id !== msg.id));
    }, 6000);
  }, []);

  // Master real-time listeners for unread counts & toast dispatch
  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      return;
    }

    sessionStartTime.current = Date.now();
    const unreadCounts: { [channel: string]: number } = {};

    const updateCombinedCount = () => {
      const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
      setUnreadChatCount(total);
    };

    // 1. Subscribe to Global Messages
    const globalMessagesRef = collection(db, 'global_messages');
    const globalQuery = query(globalMessagesRef, orderBy('timestamp', 'desc'), limit(30));
    
    const unsubscribeGlobal = onSnapshot(globalQuery, (snapshot) => {
      let globalUnread = 0;
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const msgId = docSnap.id;
        const timestamp = d.timestamp?.toDate ? d.timestamp.toDate().getTime() : (d.timestamp || Date.now());
        
        if (d.senderUid !== user.uid) {
          if (timestamp > lastReadGlobal) {
            globalUnread++;
            
            if (timestamp > sessionStartTime.current && !notifiedMessageIds.current.has(msgId)) {
              notifiedMessageIds.current.add(msgId);
              playNotificationChime();
              pushNotificationToast({
                id: msgId,
                senderName: d.senderName || d.senderEmail?.split('@')[0] || 'User',
                text: d.text || '',
                isGlobal: true
              });
            }
          }
        }
      });
      
      unreadCounts['global'] = globalUnread;
      updateCombinedCount();
    }, (err) => console.warn('Global messages snapshot error:', err));

    // 2. Subscribe to user DM Rooms where user is a participant
    const roomsQuery1 = query(collection(db, 'chats'), where('user1', '==', user.uid));
    const roomsQuery2 = query(collection(db, 'chats'), where('user2', '==', user.uid));
    
    const activeSubscribers: { [roomId: string]: () => void } = {};

    const monitorRoomMessages = (roomId: string, partnerId: string, partnerEmail: string, partnerName: string) => {
      if (activeSubscribers[roomId]) return;

      const q = query(collection(db, 'chats', roomId, 'messages'), orderBy('timestamp', 'desc'), limit(20));
      activeSubscribers[roomId] = onSnapshot(q, (snapshot) => {
        let roomUnread = 0;
        
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const msgId = docSnap.id;
          const timestamp = d.timestamp?.toDate ? d.timestamp.toDate().getTime() : (d.timestamp || Date.now());
          
          if (d.senderUid !== user.uid) {
            const lastReadTime = lastReadRooms[partnerId] || 0;
            if (timestamp > lastReadTime) {
              roomUnread++;
              
              if (timestamp > sessionStartTime.current && !notifiedMessageIds.current.has(msgId)) {
                notifiedMessageIds.current.add(msgId);
                playNotificationChime();
                pushNotificationToast({
                  id: msgId,
                  senderName: d.senderName || d.senderEmail?.split('@')[0] || partnerName || 'User',
                  text: d.text || '',
                  isGlobal: false,
                  peerId: partnerId,
                  peerEmail: partnerEmail
                });
              }
            }
          }
        });
        
        unreadCounts[roomId] = roomUnread;
        updateCombinedCount();
      }, (err) => console.warn('Room messages snapshot error:', err));
    };

    const processRoomDocs = (snapshot: any) => {
      snapshot.forEach((docSnap: any) => {
        const d = docSnap.data();
        const roomId = docSnap.id;
        const isUser1 = d.user1 === user.uid;
        const partnerId = isUser1 ? d.user2 : d.user1;
        const partnerEmail = isUser1 ? d.user2Email : d.user1Email;
        const partnerName = isUser1 ? d.user2Name : d.user1Name;
        
        monitorRoomMessages(roomId, partnerId, partnerEmail, partnerName);
      });
    };

    const unsubscribeRooms1 = onSnapshot(roomsQuery1, processRoomDocs, (err) => console.warn('Rooms1 snapshot error', err));
    const unsubscribeRooms2 = onSnapshot(roomsQuery2, processRoomDocs, (err) => console.warn('Rooms2 snapshot error', err));

    return () => {
      unsubscribeGlobal();
      unsubscribeRooms1();
      unsubscribeRooms2();
      Object.values(activeSubscribers).forEach(unsub => unsub());
    };
  }, [user, lastReadGlobal, lastReadRooms, playNotificationChime, pushNotificationToast]);

  // Daily Asset Generation Tracking for Trial Users
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [cloudDailyCounts, setCloudDailyCounts] = useState<{ [key: string]: number }>({});

  const getDailyCount = useCallback((type: ToolType): number => {
    const dateStr = getTodayDateString();
    const suffix = isMzLicensed ? '_PRO' : '_TRIAL';
    const key = `${type}${suffix}`;
    const cloudVal = cloudDailyCounts[key];
    const val = localStorage.getItem(`mz_daily_gen_${key}_${dateStr}`);
    const localVal = val ? parseInt(val) || 0 : 0;
    return typeof cloudVal === 'number' ? Math.max(cloudVal, localVal) : localVal;
  }, [cloudDailyCounts, isMzLicensed]);

  const getTotalDailyCount = useCallback((): number => {
    const tools = [
      ToolType.IMAGE, 
      ToolType.VIDEO, 
      ToolType.VECTOR, 
      ToolType.PROMPT_GEN,
      ToolType.PROMPT_IMAGE,
      ToolType.PROMPT_VIDEO,
      ToolType.PROMPT_IMAGE_CHECK,
      ToolType.PROMPT_VIDEO_CHECK,
      ToolType.PROMPT_VIDEO_CHECK,
      ToolType.CALENDAR_GEN,
      ToolType.MUTE_VIDEO,
      ToolType.MOTION_GEN
    ];
    return tools.reduce((sum, tool) => sum + getDailyCount(tool), 0);
  }, [getDailyCount]);

  const [dailyGenCounts, setDailyGenCounts] = useState<{ [key: string]: number }>({});

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
      [ToolType.PROMPT_VIDEO_CHECK]: getDailyCount(ToolType.PROMPT_VIDEO_CHECK),
      [ToolType.VECTOR_EPS]: 0,
      [ToolType.CALENDAR_GEN]: getDailyCount(ToolType.CALENDAR_GEN),
      [ToolType.MUTE_VIDEO]: getDailyCount(ToolType.MUTE_VIDEO),
      [ToolType.MOTION_GEN]: getDailyCount(ToolType.MOTION_GEN)
    });
  }, [getDailyCount]);

  const incrementDailyCount = useCallback((type: ToolType, amount: number = 1) => {
    const dateStr = getTodayDateString();
    const current = getDailyCount(type);
    const newVal = current + amount;
    const suffix = isMzLicensed ? '_PRO' : '_TRIAL';
    const key = `${type}${suffix}`;
    localStorage.setItem(`mz_daily_gen_${key}_${dateStr}`, String(newVal));
    
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        [`dailyUsage.${dateStr}.${key}`]: newVal,
        updatedAt: new Date().toISOString()
      }).catch(err => {
        // Fallback setDoc
        setDoc(userRef, {
          dailyUsage: {
            [dateStr]: {
              [key]: newVal
            }
          },
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      });
    }
    
    refreshDailyCounts();
  }, [getDailyCount, refreshDailyCounts, user, isMzLicensed]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Live real-time sync user profile (license key & subscription/trial status) from Firestore
  useEffect(() => {
    setHasSyncedProfile(false);
    if (!user) {
      setCloudDailyCounts({});
      return;
    }

    const dateStr = getTodayDateString();
    
    // Check if quota exceeded today
    const lastQuotaError = localStorage.getItem('last_firestore_quota_error');
    if (lastQuotaError && lastQuotaError === new Date().toDateString()) {
      console.warn("Skipping Firestore user read due to previous quota error");
      setHasSyncedProfile(true);
      return;
    }

    const findActiveKeyForEmail = async (email: string): Promise<string> => {
      if (!email) return '';
      const keysRef = collection(db, 'keys');
      try {
        const q1 = query(keysRef, where('activatedBy', '==', email), where('activated', '==', true));
        const qSnap1 = await getDocs(q1);
        if (!qSnap1.empty) {
          return qSnap1.docs[0].id;
        }
        if (email.toLowerCase() !== email) {
          const q2 = query(keysRef, where('activatedBy', '==', email.toLowerCase()), where('activated', '==', true));
          const qSnap2 = await getDocs(q2);
          if (!qSnap2.empty) {
            return qSnap2.docs[0].id;
          }
        }
      } catch (err) {
        console.warn('Error querying keys collection:', err);
      }
      return '';
    };
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // 1. Sync license key (with local backup protection & keys collection fallback)
        const localKey = localStorage.getItem('mz_license_key') || '';
        const cloudKey = data.licenseKey || '';
        const cancelled = (data.cancelledSubscription === true && !cloudKey && !localKey) || (data.cancelledSubscription !== false && localStorage.getItem('mz_cancelled_subscription') === 'true' && !cloudKey && !localKey);

        if (cancelled) {
          setMzLicenseKey((prev) => {
                  
                  return '';
                });
          localStorage.removeItem('mz_license_key');
          localStorage.setItem('mz_cancelled_subscription', 'true');
          setHasSyncedProfile(true);
        } else {
          const activeKey = cloudKey || localKey || '';
          
          if (activeKey) {
            setMzLicenseKey((prev) => {
              
              return activeKey;
            });
            setIsCheckingLicense(true);
            localStorage.setItem('mz_license_key', activeKey);
            localStorage.removeItem('mz_cancelled_subscription');
            
            if (cloudKey !== activeKey || data.cancelledSubscription) {
              setDoc(userDocRef, {
                licenseKey: activeKey,
                cancelledSubscription: false,
                updatedAt: new Date().toISOString()
              }, { merge: true })
              .then(() => {
                // Defer: validator will set setHasSyncedProfile(true) when validation completes
              })
              .catch(e => {
                console.info('db_op', e);
                // In case of error, we can set true to avoid being stuck, but typically validator will run anyway.
              });
            } else {
              // Defer: validator will set setHasSyncedProfile(true) when validation completes
            }
          } else {
            // Attempt to restore from keys collection if both cloud and local are empty
            findActiveKeyForEmail(user.email || '').then((foundKey) => {
              if (foundKey) {
                setMzLicenseKey((prev) => {
                  
                  return foundKey;
                });
                setIsCheckingLicense(true);
                localStorage.setItem('mz_license_key', foundKey);
                localStorage.removeItem('mz_cancelled_subscription');
                setDoc(userDocRef, {
                  licenseKey: foundKey,
                  cancelledSubscription: false,
                  updatedAt: new Date().toISOString()
                }, { merge: true })
                .then(() => {
                  // Defer: validator will set setHasSyncedProfile(true)
                })
                .catch(e => {
                  console.info('db_op', e);
                });
              } else {
                setMzLicenseKey((prev) => {
                  
                  return '';
                });
                setHasSyncedProfile(true);
              }
            });
          }
        }

        // 2. Sync trialStart
        if (data.trialStart) {
          localStorage.setItem('mz_trial_start', data.trialStart);
          setTrialDaysLeft(99999);
        }

        // 3. Sync daily gen counts for today
        if (data.dailyUsage && data.dailyUsage[dateStr]) {
          const usageToday = data.dailyUsage[dateStr];
          setCloudDailyCounts((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(usageToday)) return prev;
            return usageToday;
          });
          // Sync to localStorage for offline access/backup
          Object.keys(usageToday).forEach((typeKey) => {
            localStorage.setItem(`mz_daily_gen_${typeKey}_${dateStr}`, String(usageToday[typeKey]));
          });
        } else {
          setCloudDailyCounts((prev) => Object.keys(prev).length === 0 ? prev : {});
        }

        // 4. Settings Sync: Keep local API keys fully in user control
        // Do not let background polling snapshot overwrite user's local deletions
        setHasCustomKeySaved(
          (localStorage.getItem('gemini_api_key') || '').length > 0 ||
          (localStorage.getItem('groq_api_key') || '').length > 0 ||
          (localStorage.getItem('mistral_api_key') || '').length > 0 ||
          (localStorage.getItem('openai_api_key') || '').length > 0 ||
          (localStorage.getItem('openrouter_api_key') || '').length > 0 ||
          (localStorage.getItem('blackbox_api_key') || '').length > 0 ||
          (localStorage.getItem('nvidia_api_key') || '').length > 0 ||
          (localStorage.getItem('bluesminds_api_key') || '').length > 0 ||
          (localStorage.getItem('aivene_api_key') || '').length > 0 ||
          (localStorage.getItem('zai_api_key') || '').length > 0
        );
      } else {
        // Init cloud user profile if missing
        const localKey = localStorage.getItem('mz_license_key') || '';
        
        const proceedWithInit = (finalKey: string) => {
          const localTrialStart = localStorage.getItem('mz_trial_start') || new Date().toISOString();
          localStorage.setItem('mz_trial_start', localTrialStart);
          setTrialDaysLeft(99999);

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
            ToolType.CALENDAR_GEN,
            ToolType.MUTE_VIDEO,
            ToolType.MOTION_GEN
          ];
          tools.forEach((t) => {
            const val = localStorage.getItem(`mz_daily_gen_${t}_${dateStr}`);
            if (val) {
              initialUsage[t] = parseInt(val) || 0;
            }
          });

          // Prepopulate settings to cloud
          const initialSettings = {
             gemini_api_key: localStorage.getItem('gemini_api_key') || '',
             groq_api_key: localStorage.getItem('groq_api_key') || '',
             mistral_api_key: localStorage.getItem('mistral_api_key') || '',
             openai_api_key: localStorage.getItem('openai_api_key') || '',
             openrouter_api_key: localStorage.getItem('openrouter_api_key') || '',
             blackbox_api_key: localStorage.getItem('blackbox_api_key') || '',
             nvidia_api_key: localStorage.getItem('nvidia_api_key') || '',
             bluesminds_api_key: localStorage.getItem('bluesminds_api_key') || '',
             aivene_api_key: localStorage.getItem('aivene_api_key') || '',
             zai_api_key: localStorage.getItem('zai_api_key') || '',
             ai_provider: localStorage.getItem('ai_provider') || 'gemini',
             mz_gemini_model: localStorage.getItem('mz_gemini_model') || '',
             mz_groq_model: localStorage.getItem('mz_groq_model') || '',
             mz_nvidia_model: localStorage.getItem('mz_nvidia_model') || '',
             mz_aivene_model: localStorage.getItem('mz_aivene_model') || '',
              uiLanguage: localStorage.getItem('mz_ui_language') || 'en',
              keywordMode: (() => {
                 const saved = localStorage.getItem('mz_keyword_mode');
                 if (saved === 'mixed' || saved === 'single' || saved === 'multi') {
                   return saved;
                 }
                 return 'mixed';
               })(),
              titleLength: localStorage.getItem('mz_title_length') || 'medium',
              metadataLanguage: localStorage.getItem('mz_metadata_language') || 'en'
          };

          const resolvedKey = finalKey || '';
          if (resolvedKey) {
            localStorage.removeItem('mz_cancelled_subscription');
          }
          const isCancelled = resolvedKey ? false : (localStorage.getItem('mz_cancelled_subscription') === 'true');
          if (resolvedKey) {
            setMzLicenseKey((prev) => {
            
            return resolvedKey;
          });
            setIsCheckingLicense(true);
            localStorage.setItem('mz_license_key', resolvedKey);
          }

          setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName || '',
            licenseKey: resolvedKey,
            cancelledSubscription: isCancelled,
            trialStart: localTrialStart,
            dailyUsage: {
              [dateStr]: initialUsage
            },
            settings: initialSettings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
              }, { merge: true })
              .then(() => {
                if (!resolvedKey) {
                  setHasSyncedProfile(true);
                }
              })
              .catch(err => {
                console.info('db_op', err);
                handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
                if (!resolvedKey) {
                  setHasSyncedProfile(true);
                }
              });
        };

        if (localKey) {
          proceedWithInit(localKey);
        } else {
          findActiveKeyForEmail(user.email || '').then((foundKey) => {
            if (foundKey) {
              setMzLicenseKey((prev) => {
                  
                  return foundKey;
                });
              setIsCheckingLicense(true);
              localStorage.setItem('mz_license_key', foundKey);
              proceedWithInit(foundKey);
            } else {
              proceedWithInit('');
            }
          });
        }
      }
    }, (error) => {
      console.warn("Firestore user load error:", error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribeUser();
  }, [user]);

  // Keep daily counts refreshed when cloudDailyCounts changes
  useEffect(() => {
    refreshDailyCounts();
  }, [cloudDailyCounts, refreshDailyCounts]);

  // Sync branding from Firestore
  useEffect(() => {
    const docRef = doc(db, 'branding', 'main');
    getDoc(docRef).then((snapshot) => {
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
        if (data.payInfo) {
          let payInfoToSave = data.payInfo;
          if (payInfoToSave.includes('BCA 817')) {
            payInfoToSave = 'Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom';
            setDoc(docRef, { payInfo: payInfoToSave }, { merge: true }).catch(() => {});
          }
          localStorage.setItem('mz_reseller_pay_info', payInfoToSave);
          // dispatch custom event to notify SaaSPortal
          window.dispatchEvent(new CustomEvent('mz_pay_info_updated', { detail: payInfoToSave }));
        }
      } else {
        // Init fallback bootstrap
        setDoc(docRef, {
          appName: 'MetaZo PRO',
          appSubtitle: 'AI-Powered Metadata Assistant',
          whatsAppLink: 'https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr',
          pricingTier: 'Rp 149.000 / Bulan',
          licenseSeed: 'MZPRO-COMMERCIAL-2026',
          payInfo: 'Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom',
          updatedAt: new Date().toISOString()
              }, { merge: true }).catch(err => {
          console.info('db_op', err);
          handleFirestoreError(err, OperationType.WRITE, 'branding/main');
        });
      }
    }).catch((error) => {
      console.warn('Firestore branding load error, keeping local cached entries:', error);
    });
  }, []);

  // Trial Period tracking (Unlimited Trial Days)
  const [trialDaysLeft, setTrialDaysLeft] = useState(() => {
    return 99999;
  });

  // Automatically check trial status on mount or when licensing changes
  useEffect(() => {
    if (!isMzLicensed && trialDaysLeft <= 0) {
      setShowActivationModal(true);
    }
  }, [isMzLicensed, trialDaysLeft]);

  // Fetch active promo codes for the Login Promo modal in realtime
  useEffect(() => {
    if (!user) return;
    const unsubPromos = onSnapshot(query(collection(db, 'promos'), limit(15)), (qSnap) => {
      const list: any[] = [];
      const now = new Date();
      qSnap.forEach((doc) => {
        const data = doc.data();
        const usedCount = Number(data.usedCount) || 0;
        const maxUses = Number(data.maxUses) || 99999;
        
        if (usedCount >= maxUses) return;
        
        if (data.endDate) {
          const endStr = data.endDate;
          const end = endStr.includes('T') ? new Date(endStr) : new Date(endStr + 'T23:59:59');
          if (now > end) return;
        }
        
        list.push({ id: doc.id, ...data });
      });
      setPromoCodesForModal(list);
      localStorage.setItem('mz_promos_cache', JSON.stringify(list));
    }, (err) => {
      const errMsg = err?.message || (err && typeof err === 'object' && 'message' in err ? String((err as any).message) : '') || String(err);
      const errCode = (err && typeof err === 'object' && 'code' in err ? String((err as any).code) : '');
      const isPermissionErr = errMsg.toLowerCase().includes('permission') || 
                              errMsg.toLowerCase().includes('denied') ||
                              errCode.toLowerCase().includes('permission') ||
                              errCode.toLowerCase().includes('denied');
      if (!isPermissionErr) {
        console.warn("Failed to subscribe to promos for modal, loading cached:", err);
      }
      
      if (isPermissionErr) {
        setPromoCodesForModal([]);
        return;
      }

      let cached = localStorage.getItem('mz_promos_cache');
      if (!cached) {
        const seedPromos = [
          { id: "MZPROMO2026", code: "MZPROMO2026", type: "discount", value: 50, maxUses: 500, usedCount: 124, description: "Promo Spesial Tahun 2026 (Diskon 50%)", createdAt: new Date().toISOString(), startDate: "2026-01-01", endDate: "2027-12-31" },
          { id: "FREEPREMIUM7D", code: "FREEPREMIUM7D", type: "free_premium", value: 7, maxUses: 1000, usedCount: 312, description: "Akses Premium Gratis 7 Hari", createdAt: new Date().toISOString(), startDate: "2026-01-01", endDate: "2027-12-31" },
          { id: "METAZOPRO20", code: "METAZOPRO20", type: "discount", value: 20, maxUses: 100, usedCount: 15, description: "Kupon Diskon 20% MetaZo PRO", createdAt: new Date().toISOString(), startDate: "2026-01-01", endDate: "2027-12-31" }
        ];
        localStorage.setItem('mz_promos_cache', JSON.stringify(seedPromos));
        cached = JSON.stringify(seedPromos);
      }
      try {
        setPromoCodesForModal(JSON.parse(cached));
      } catch(e) {}
    });

    return () => unsubPromos();
  }, [user]);

  // Login promo modal removed per user request

  const handleSetActiveTool = (tool: ToolType) => {
    setActiveTool(tool);
    const path = toolToPath[tool] || '/Dashboard';
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (!isIframe && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    
    // Interactive: Scroll to top smoothly when changing tabs
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    
    // Also scroll the main scrollable container if it has a generic scrollbar (optional fallback)
    const mainScrollAreas = document.querySelectorAll('.overflow-y-auto');
    mainScrollAreas.forEach(area => {
      area.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  };

  // Sync route path state, auth redirection, and listen for back/forward navigation popstate events
  useEffect(() => {
    if (isCheckingAuth) return;

    const currentPath = window.location.pathname;
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (!user) {
      if (currentPath !== '/Login') {
        const tool = getToolFromPath(currentPath);
        if (tool && tool !== ToolType.DASHBOARD) {
          localStorage.setItem('mz_redirect_after_login', currentPath);
        }
        if (!isIframe) {
          window.history.replaceState(null, '', '/Login');
        }
      }
    } else {
      if (currentPath === '/Login' || currentPath === '/' || currentPath === '') {
        const savedRedirect = localStorage.getItem('mz_redirect_after_login');
        localStorage.removeItem('mz_redirect_after_login');
        const redirectTool = savedRedirect ? getToolFromPath(savedRedirect) : null;
        
        if (redirectTool) {
          setActiveTool(redirectTool);
          if (!isIframe) {
            window.history.replaceState(null, '', toolToPath[redirectTool]);
          }
        } else {
          setActiveTool(ToolType.DASHBOARD);
          if (!isIframe) {
            window.history.replaceState(null, '', '/Dashboard');
          }
        }
      } else {
        const tool = getToolFromPath(currentPath);
        if (tool && tool !== activeTool) {
          setActiveTool(tool);
        }
      }
    }

    const handlePopState = () => {
      if (!user) {
        if (!isIframe && window.location.pathname !== '/Login') {
          window.history.replaceState(null, '', '/Login');
        }
        return;
      }
      const tool = getToolFromPath(window.location.pathname);
      if (tool) {
        setActiveTool(tool);
      } else {
        setActiveTool(ToolType.DASHBOARD);
        if (!isIframe && window.location.pathname !== '/Dashboard') {
          window.history.replaceState(null, '', '/Dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTool, user, isCheckingAuth]);

  useEffect(() => {
    
    if (isCheckingAuth) return;
    const k = mzLicenseKey.trim().toUpperCase();
    
    if (!k) {
      
      setIsMzLicensed(false);
      setSubDaysLeft(null);
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
      return;
    }

    setIsCheckingLicense(true);

    const currentSeed = localStorage.getItem('mz_reseller_seed')?.trim().toUpperCase() || 'MZPRO-COMMERCIAL-2026';
    if (k === currentSeed || k === 'MZPRO-COMMERCIAL-2026') {
      setIsMzLicensed(true);
      setSubDaysLeft(null);
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
      return;
    }

    let devId = localStorage.getItem('mz_device_id');
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
      localStorage.setItem('mz_device_id', devId);
    }

    const clearLicenseKey = (msg?: string) => {
      setIsMzLicensed(false);
      setSubDaysLeft(null);
      localStorage.removeItem('mz_license_key');
      setMzLicenseKey((prev) => {
                  
                  return '';
                });
      
      // Reset FREE TRIAL to 0
      const dateStr = getTodayDateString();
      Object.values(ToolType).forEach(type => {
        localStorage.removeItem(`mz_daily_gen_${type}_TRIAL_${dateStr}`);
      });

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Remove free trial counts from db
        const updates: any = {
          licenseKey: '',
          updatedAt: new Date().toISOString()
        };
        Object.values(ToolType).forEach(type => {
          updates[`dailyUsage.${dateStr}.${type}_TRIAL`] = deleteField();
        });
        
        updateDoc(userRef, updates).catch(() => {});
      }
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
      if (msg) alert(msg);
      
      refreshDailyCounts();
    };

    getDoc(doc(db, 'keys', k))
      .then(dSnap => {
        console.log("License check: key", k, "exists:", dSnap.exists());
        if (dSnap.exists()) {
          const data = dSnap.data();
          console.log("License check: data:", data);
          if (data.activated) {
            // Check if this key belongs to another account (1 key 1 account restriction)
            const currentEmail = user?.email || '';
            const keyActivatedBy = data.activatedBy || '';
            const firstActivatedBy = data.firstActivatedBy || '';
            const ownerId = firstActivatedBy || keyActivatedBy;
            const isEmail = (str: string) => str.includes('@');
            let isRejected = false;

            if (user) {
              if (!ownerId || ownerId.toLowerCase() === currentEmail.toLowerCase() || ownerId === user.uid) {
                // Valid! If it's a UID, upgrade it to email
                if (ownerId === user.uid && currentEmail) {
                  updateDoc(doc(db, 'keys', k), { activatedBy: currentEmail, firstActivatedBy: currentEmail }).catch(e => console.info('db_op', e));
                } else if (!ownerId && currentEmail) {
                  updateDoc(doc(db, 'keys', k), { activatedBy: currentEmail, firstActivatedBy: currentEmail }).catch(e => console.info('db_op', e));
                }
              } else if (ownerId === devId) {
                if (currentEmail) {
                  updateDoc(doc(db, 'keys', k), { activatedBy: currentEmail, firstActivatedBy: currentEmail }).catch(e => console.info('db_op', e));
                }
              } else {
                // Reject key if it belongs to another user
                isRejected = true;
              }
            } else {
              if (ownerId && isEmail(ownerId)) {
                setIsMzLicensed(false);
                setIsCheckingLicense(false);
                setHasSyncedProfile(true);
                return;
              } else if (ownerId && ownerId !== devId) {
                // Reject key if it belongs to another device
                isRejected = true;
              }
            }

            if (isRejected) {
              clearLicenseKey();
              return;
            }

            // Link device-bound activation to user's email when they log in
            if (user && user.email && (!ownerId || !isEmail(ownerId))) {
              updateDoc(doc(db, 'keys', k), { activatedBy: user.email, firstActivatedBy: user.email }).catch(e => console.info('db_op', e));
            }

            // Check if 30days subscription is expired
            if (data.duration === '30days' && data.activatedAt) {
              const activatedTime = new Date(data.activatedAt).getTime();
              const nowTime = new Date().getTime();
              const elapsedMs = nowTime - activatedTime;
              const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
              const remainingDays = 30 - elapsedDays;

              if (remainingDays <= 0) {
                clearLicenseKey('Masa berlangganan 30 Hari Anda telah habis! Sistem secara otomatis mematikan lisensi terdaftar dan mengembalikan Anda ke masa trial.');
                return;
              }
              setSubDaysLeft(Math.max(0, remainingDays));
            } else {
              setSubDaysLeft(null);
            }
            setIsMzLicensed(true);
          } else {
            clearLicenseKey();
          }
        } else {
          clearLicenseKey();
        }
      })
      .catch(err => {
        console.warn('License validator connection error, retaining local state:', err);
        // Retain local state only if a local key is present and was previously active
        setIsMzLicensed((prev) => prev && !!localStorage.getItem('mz_license_key'));
      })
      .finally(() => {
        setIsCheckingLicense(false);
        setHasSyncedProfile(true);
      });
  }, [mzLicenseKey, user, isCheckingAuth]);

  // Passcode logic removed for UID-based Admin Access

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
  const [bluesmindsKeysList, setBluesmindsKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('bluesminds_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [aiveneKeysList, setAiveneKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('aivene_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [zaiKeysList, setZaiKeysList] = useState<string[]>(() => {
    return (localStorage.getItem('zai_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
  });
  const [selectedNvidiaModel, setSelectedNvidiaModel] = useState<string>(localStorage.getItem('mz_nvidia_model') || 'stepfun-ai/step-3.5-flash');
  const [selectedAiveneModel, setSelectedAiveneModel] = useState<string>(localStorage.getItem('mz_aivene_model') || 'auto');
  const [selectedZaiModel, setSelectedZaiModel] = useState<string>(localStorage.getItem('mz_zai_model') || 'glm-5.2');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<'auto' | 'gemini-3.6-flash' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3-flash' | 'gemini-2.0-flash' | 'gemini-1.5-flash' | 'gemini-1.5-flash-8b' | 'gemma-4-31b-it'>(() => (localStorage.getItem('mz_gemini_model') as any) || 'auto');
  const [selectedGroqModel, setSelectedGroqModel] = useState<'llama-3.3-70b-versatile' | 'llama-4-scout-17b-16e-instruct'>(() => (localStorage.getItem('mz_groq_model') as any) || 'llama-3.3-70b-versatile');

  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [newGroqKey, setNewGroqKey] = useState('');
  const [newMistralKey, setNewMistralKey] = useState('');
  const [newOpenaiKey, setNewOpenaiKey] = useState('');
  const [newOpenrouterKey, setNewOpenrouterKey] = useState('');
  const [newBlackboxKey, setNewBlackboxKey] = useState('');
  const [newNvidiaKey, setNewNvidiaKey] = useState('');
  const [newBluesmindsKey, setNewBluesmindsKey] = useState('');
  const [newAiveneKey, setNewAiveneKey] = useState('');
  const [newZaiKey, setNewZaiKey] = useState('');

  const [serverKeysStatus, setServerKeysStatus] = useState<Record<string, boolean>>({});
  const [keyTestingIndex, setKeyTestingIndex] = useState<number | null>(null);
  const [keyTestProvider, setKeyTestProvider] = useState<'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'bluesminds' | 'aivene' | 'zai' | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { type: 'success' | 'error' | 'quota'; message: string }>>({}); // "provider-index"
  const [hasCustomKeySaved, setHasCustomKeySaved] = useState(() => {
    const geminiSaved = (localStorage.getItem('gemini_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const groqSaved = (localStorage.getItem('groq_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const mistralSaved = (localStorage.getItem('mistral_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const openaiSaved = (localStorage.getItem('openai_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const openrouterSaved = (localStorage.getItem('openrouter_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const blackboxSaved = (localStorage.getItem('blackbox_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const nvidiaSaved = (localStorage.getItem('nvidia_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const bluesmindsSaved = (localStorage.getItem('bluesminds_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const aiveneSaved = (localStorage.getItem('aivene_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    const zaiSaved = (localStorage.getItem('zai_api_key') || '').split(',').map(k => k.trim()).filter(Boolean);
    
    return (
      geminiSaved.length > 0 ||
      groqSaved.length > 0 ||
      mistralSaved.length > 0 ||
      openaiSaved.length > 0 ||
      openrouterSaved.length > 0 ||
      blackboxSaved.length > 0 ||
      nvidiaSaved.length > 0 ||
      bluesmindsSaved.length > 0 ||
      aiveneSaved.length > 0 ||
      zaiSaved.length > 0
    );
  });

  const fetchProviderStatus = async () => {
    try {
      const response = await fetch('/api/provider-status');
      const data = await response.json();
      setServerKeysStatus(data);
    } catch (err) {
      console.warn('Gagal memuat status provider bawaan server:', err);
    }
  };

  useEffect(() => {
    if (showSettingsModal) {
      if (Object.keys(serverKeysStatus).length === 0) {
        fetchProviderStatus();
      }
      
      const gSaved = localStorage.getItem('gemini_api_key') || '';
      const grSaved = localStorage.getItem('groq_api_key') || '';
      const mSaved = localStorage.getItem('mistral_api_key') || '';
      const oSaved = localStorage.getItem('openai_api_key') || '';
      const orSaved = localStorage.getItem('openrouter_api_key') || '';
      const bSaved = localStorage.getItem('blackbox_api_key') || '';
      const nSaved = localStorage.getItem('nvidia_api_key') || '';
      const blSaved = localStorage.getItem('bluesminds_api_key') || '';
      const aSaved = localStorage.getItem('aivene_api_key') || '';
      const zSaved = localStorage.getItem('zai_api_key') || '';
      const validProviders = ['gemini', 'groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'bluesminds', 'aivene', 'zai'];
      const rawP = localStorage.getItem('ai_provider') || 'gemini';
      const pSaved = (validProviders.includes(rawP) ? rawP : 'gemini') as any;

      const gParsed = gSaved.split(',').map(k => k.trim()).filter(Boolean);
      const grParsed = grSaved.split(',').map(k => k.trim()).filter(Boolean);
      const mParsed = mSaved.split(',').map(k => k.trim()).filter(Boolean);
      const oParsed = oSaved.split(',').map(k => k.trim()).filter(Boolean);
      const orParsed = orSaved.split(',').map(k => k.trim()).filter(Boolean);
      const bParsed = bSaved.split(',').map(k => k.trim()).filter(Boolean);
      const nParsed = nSaved.split(',').map(k => k.trim()).filter(Boolean);
      const blParsed = blSaved.split(',').map(k => k.trim()).filter(Boolean);
      const aParsed = aSaved.split(',').map(k => k.trim()).filter(Boolean);
      const zParsed = zSaved.split(',').map(k => k.trim()).filter(Boolean);

      setGeminiKeysList(gParsed);
      setGroqKeysList(grParsed);
      setMistralKeysList(mParsed);
      setOpenaiKeysList(oParsed);
      setOpenrouterKeysList(orParsed);
      setBlackboxKeysList(bParsed);
      setNvidiaKeysList(nParsed);
      setBluesmindsKeysList(blParsed);
      setAiveneKeysList(aParsed);
      setZaiKeysList(zParsed);
      
      setNewGeminiKey('');
      setNewGroqKey('');
      setNewMistralKey('');
      setNewOpenaiKey('');
      setNewOpenrouterKey('');
      setNewBlackboxKey('');
      setNewNvidiaKey('');
      setNewBluesmindsKey('');
      setNewAiveneKey('');
      setNewZaiKey('');

      setSelectedProvider(pSaved);
      setHasCustomKeySaved(
        gParsed.length > 0 || 
        grParsed.length > 0 || 
        mParsed.length > 0 ||
        oParsed.length > 0 ||
        orParsed.length > 0 ||
        bParsed.length > 0 ||
        nParsed.length > 0 ||
        blParsed.length > 0 ||
        aParsed.length > 0 ||
        zParsed.length > 0
      );
      setKeyTestingIndex(null);
      setKeyTestProvider(null);
      setKeyTestResults({});
    }
  }, [showSettingsModal]);

  const handleTestKeyAtIndex = async (provider: 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'bluesminds' | 'aivene' | 'zai', index: number, keyValue: string) => {
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
    if (provider === 'bluesminds') endpoint = '/api/test-bluesminds-key';
    if (provider === 'aivene') endpoint = '/api/test-aivene-key';
    if (provider === 'zai') endpoint = '/api/test-zai-key';

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

  const handleAddApiKey = (provider: 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'bluesminds' | 'aivene' | 'zai') => {
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
    } else if (provider === 'bluesminds') {
      key = newBluesmindsKey.trim();
      currentList = bluesmindsKeysList;
    } else if (provider === 'aivene') {
      key = newAiveneKey.trim();
      currentList = aiveneKeysList;
    } else if (provider === 'zai') {
      key = newZaiKey.trim();
      currentList = zaiKeysList;
    }

    if (!key) return;
    if (currentList.some(k => k === key)) {
      alert("API Key ini sudah ada dalam daftar!");
      return;
    }

    const updatedList = [...currentList, key];

    if (provider === 'gemini') {
      setGeminiKeysList(updatedList);
      setNewGeminiKey('');
    } else if (provider === 'groq') {
      setGroqKeysList(updatedList);
      setNewGroqKey('');
    } else if (provider === 'mistral') {
      setMistralKeysList(updatedList);
      setNewMistralKey('');
    } else if (provider === 'openai') {
      setOpenaiKeysList(updatedList);
      setNewOpenaiKey('');
    } else if (provider === 'openrouter') {
      setOpenrouterKeysList(updatedList);
      setNewOpenrouterKey('');
    } else if (provider === 'blackbox') {
      setBlackboxKeysList(updatedList);
      setNewBlackboxKey('');
    } else if (provider === 'nvidia') {
      setNvidiaKeysList(updatedList);
      setNewNvidiaKey('');
    } else if (provider === 'bluesminds') {
      setBluesmindsKeysList(updatedList);
      setNewBluesmindsKey('');
    } else if (provider === 'aivene') {
      setAiveneKeysList(updatedList);
      setNewAiveneKey('');
    } else if (provider === 'zai') {
      setZaiKeysList(updatedList);
      setNewZaiKey('');
    }

    // Save immediately to localStorage
    localStorage.setItem(`${provider}_api_key`, updatedList.join(','));
    setHasCustomKeySaved(true);

    // Save immediately to Firestore if authenticated
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), {
        [`settings.${provider}_api_key`]: updatedList.join(','),
      }).catch(err => console.info('db_op', err));
    }
  };

  const handleDeleteApiKey = (provider: 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'bluesminds' | 'aivene' | 'zai', index: number) => {
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
    } else if (provider === 'bluesminds') {
      listSetter = setBluesmindsKeysList;
      list = bluesmindsKeysList;
    } else if (provider === 'aivene') {
      listSetter = setAiveneKeysList;
      list = aiveneKeysList;
    } else if (provider === 'zai') {
      listSetter = setZaiKeysList;
      list = zaiKeysList;
    }

    const filtered = list.filter((_, i) => i !== index);
    listSetter(filtered);

    // Save immediately to localStorage
    if (filtered.length > 0) {
      localStorage.setItem(`${provider}_api_key`, filtered.join(','));
    } else {
      localStorage.removeItem(`${provider}_api_key`);
    }

    // Save immediately to Firestore if authenticated
    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), {
        [`settings.${provider}_api_key`]: filtered.join(','),
      }).catch(err => console.info('db_op', err));
    }

    setKeyTestResults(prev => {
      const updated = { ...prev };
      list.forEach((_, i) => {
        delete updated[`${provider}-${i}`];
      });

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
    const cleanBluesminds = bluesmindsKeysList.map(k => k.trim()).filter(Boolean);
    const cleanAivene = aiveneKeysList.map(k => k.trim()).filter(Boolean);
    const cleanZai = zaiKeysList.map(k => k.trim()).filter(Boolean);

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

    if (cleanBluesminds.length > 0) {
      localStorage.setItem('bluesminds_api_key', cleanBluesminds.join(','));
    } else {
      localStorage.removeItem('bluesminds_api_key');
    }

    if (cleanAivene.length > 0) {
      localStorage.setItem('aivene_api_key', cleanAivene.join(','));
    } else {
      localStorage.removeItem('aivene_api_key');
    }

    if (cleanZai.length > 0) {
      localStorage.setItem('zai_api_key', cleanZai.join(','));
    } else {
      localStorage.removeItem('zai_api_key');
    }

    localStorage.setItem('ai_provider', selectedProvider);
    setHasCustomKeySaved(
      cleanGemini.length > 0 || 
      cleanGroq.length > 0 || 
      cleanMistral.length > 0 || 
      cleanOpenai.length > 0 || 
      cleanOpenrouter.length > 0 || 
      cleanBlackbox.length > 0 || 
      cleanNvidia.length > 0 ||
      cleanBluesminds.length > 0 ||
      cleanAivene.length > 0 ||
      cleanZai.length > 0
    );

    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), {
        'settings.gemini_api_key': cleanGemini.join(','),
        'settings.groq_api_key': cleanGroq.join(','),
        'settings.mistral_api_key': cleanMistral.join(','),
        'settings.openai_api_key': cleanOpenai.join(','),
        'settings.openrouter_api_key': cleanOpenrouter.join(','),
        'settings.blackbox_api_key': cleanBlackbox.join(','),
        'settings.nvidia_api_key': cleanNvidia.join(','),
        'settings.bluesminds_api_key': cleanBluesminds.join(','),
        'settings.aivene_api_key': cleanAivene.join(','),
        'settings.zai_api_key': cleanZai.join(','),
        'settings.ai_provider': selectedProvider,
      }).catch(err => console.info('db_op', err));
    }

    setShowSettingsModal(false);
  };

  const handleResetKey = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('groq_api_key');
    localStorage.removeItem('mistral_api_key');
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('openrouter_api_key');
    localStorage.removeItem('blackbox_api_key');
    localStorage.removeItem('nvidia_api_key');
    localStorage.removeItem('bluesminds_api_key');
    localStorage.removeItem('aivene_api_key');
    localStorage.removeItem('zai_api_key');
    localStorage.removeItem('ai_provider');
    
    setGeminiKeysList([]);
    setGroqKeysList([]);
    setMistralKeysList([]);
    setOpenaiKeysList([]);
    setOpenrouterKeysList([]);
    setBlackboxKeysList([]);
    setNvidiaKeysList([]);
    setBluesmindsKeysList([]);
    setAiveneKeysList([]);
    setZaiKeysList([]);
    setSelectedProvider('gemini');
    setHasCustomKeySaved(false);
    setKeyTestResults({});

    if (auth.currentUser) {
      updateDoc(doc(db, 'users', auth.currentUser.uid), {
        'settings.gemini_api_key': '',
        'settings.groq_api_key': '',
        'settings.mistral_api_key': '',
        'settings.openai_api_key': '',
        'settings.openrouter_api_key': '',
        'settings.blackbox_api_key': '',
        'settings.nvidia_api_key': '',
        'settings.bluesminds_api_key': '',
        'settings.aivene_api_key': '',
        'settings.zai_api_key': '',
        'settings.ai_provider': 'gemini',
      }).catch(err => console.info('db_op', err));
    }
  };

  const handleCloseWelcome = () => {
      sessionStorage.setItem('vixer_welcomed', 'true');
      setShowWelcomeScreen(false);
  };
  
  const [autoDownloadCSV, setAutoDownloadCSVState] = useState(false);
  const [autoBackup, setAutoBackupState] = useState(() => {
    try {
      return localStorage.getItem('mz_auto_backup') === 'true';
    } catch (e) {
      return false;
    }
  });
  const autoBackupRef = useRef(autoBackup);

  const setAutoBackup = (val: boolean) => {
      setAutoBackupState(val);
      autoBackupRef.current = val;
      try {
        localStorage.setItem('mz_auto_backup', val ? 'true' : 'false');
      } catch (e) {}
  };
  const [mobileTab, setMobileTab] = useState<'upload' | 'ai' | 'review'>('upload');
  const [returnToStartCountdown, setReturnToStartCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (returnToStartCountdown === null) return;
    if (returnToStartCountdown <= 0) {
      setReturnToStartCountdown(null);
      setMobileTab('upload');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const timer = setTimeout(() => {
      setReturnToStartCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [returnToStartCountdown]);

  const [r2Status, setR2Status] = useState<boolean | null>(null); // null = belum dicek, true = OK, false = belum dikonfigurasi
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [embedDownloading, setEmbedDownloading] = useState(false);
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
          setExportPond5(true);
          setExportDepositPhotos(true);
          setExportMiriCanvas(true);
          setExport123RF(true);
      } else {
          setExportAdobe(false);
          setExportShutterstock(false);
          setExportVecteezy(false);
          setExportCanva(false);
          setExportFreepik(false);
          setExportPond5(false);
          setExportDepositPhotos(false);
          setExportMiriCanvas(false);
          setExport123RF(false);
      }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopGenerationRef = useRef(false);
  const isProcessingLoopRef = useRef(false);

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
    try {
      localStorage.setItem('match_system_theme', String(matchSystemTheme));
    } catch (e) {}
  }, [matchSystemTheme]);

  useEffect(() => {
    if (!matchSystemTheme) return;
    
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      applyThemeWithTransition(e.matches ? 'dark' : 'light', false);
    };

    // Apply initially
    handleSystemThemeChange(mediaQuery);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, [matchSystemTheme]);

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
          // 1. Try to generate thumbnail JPG/PNG di sisi client
          const clientSidePreview = await extractEPSClientSide(file);
          
          // 2. Simpan EPS ke R2 (once, before any ghostscript logic)
          let uploadedUrl = null;
          let getUrlData = null;
          try {
              const fileExt = file.name.split('.').pop();
              const getUrlRes = await fetch(`/api/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'application/postscript')}`);
              getUrlData = await getUrlRes.json().catch(() => ({}));
              
              if (getUrlRes.ok && getUrlData.uploadUrl && getUrlData.fileUrl) {
                  console.log('Using presigned URL to upload EPS/AI file to R2:', file.name);
                  const putRes = await fetch(getUrlData.uploadUrl, {
                      method: 'PUT',
                      body: file,
                      headers: { 'Content-Type': file.type || 'application/postscript' }
                  });
                  if (!putRes.ok) throw new Error(`Failed to upload to storage: ${putRes.status}`);
                  uploadedUrl = getUrlData.fileUrl;
              } else {
                  // Try Vercel Blob if S3/R2 fails or is unconfigured
                  try {
                      const { upload } = await import('@vercel/blob/client');
                      const blob = await upload(file.name, file, {
                          access: 'public',
                          handleUploadUrl: '/api/upload-vercel-blob'
                      });
                      uploadedUrl = blob.url;
                  } catch (blobErr) {
                      console.warn("Vercel Blob failed:", blobErr);
                      // Silently fallback to multipart if Vercel Blob isn't configured
                  }
              }
          } catch (uploadErr: any) {
              console.warn("Failed to save EPS to R2/Storage:", uploadErr);
              if (uploadErr.message === 'Failed to fetch') {
                  throw new Error(`Gagal upload ke Cloudflare R2 (CORS Error). Pastikan Anda telah menambahkan setting CORS di dashboard Cloudflare R2 bucket Anda.`);
              }
          }

          // If client-side thumbnail succeeded, we just return it to AI Vision!
          if (clientSidePreview) {
              return [clientSidePreview];
          }
           
          // 3. Fallback: If client-side failed, use server-side Ghostscript
          let retryCount = 0;
          const maxRetries = 3; // Reduced to 3 retries because if the server OOMs repeatedly, it will never succeed
          while (retryCount < maxRetries) {
              if (stopGenerationRef.current) throw new Error("Cancelled by user");
              
              try {
                  let response;
                  try {
                    if (uploadedUrl) {
                        // Now ask the server to process the URL
                        response = await fetch(`/api/convert-eps?t=${Date.now()}_${Math.random()}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileUrl: uploadedUrl, pathKey: getUrlData?.pathKey })
                        });
                    } else {
                        // R2/S3 failed or unconfigured. 
                        // If we are on Vercel and file is > 4.5MB, this fallback will crash with 413 FUNCTION_PAYLOAD_TOO_LARGE.
                        // Throw specifically here to help user debug Cloudflare CORS / setup:
                        const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('meta-zo-update.vercel.app');
                        if (isVercel && file.size > 4.5 * 1024 * 1024) {
                            throw new Error(
                                `Upload ke Cloudflare R2 gagal, dan file ini (${(file.size/1024/1024).toFixed(1)}MB) terlalu besar untuk Vercel Fallback (Max 4.5MB).\n\n` +
                                `Cek CONSOLE BROWSER (F12) untuk melihat error 'PUT'. ` +
                                `Jika Anda melihat error CORS, pastikan Anda telah mengatur CORS di setting Bucket Cloudflare R2 Anda.`
                            );
                        }

                        // S3 not configured or failed, fallback to multipart
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        // TRICK: Append a cache-buster to prevent the proxy from caching a 200 OK HTML response
                        response = await fetch(`/api/convert-eps-multipart?t=${Date.now()}_${Math.random()}`, {
                            method: 'POST',
                            body: formData
                        });
                    }
                  } catch (fetchErr: any) {
                      if (fetchErr.message === 'Failed to fetch') {
                          throw new Error(`Koneksi terputus (Failed to fetch). Jika menggunakan Cloudflare R2, pastikan CORS dikonfigurasi dengan benar. Jika tanpa R2, ukuran file mungkin terlalu besar untuk diproses server.`);
                      }
                      throw fetchErr;
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
                          if (isVercel) {
                              throw new Error(
                                  `File terlalu besar â€” Vercel menolak body > 4.5MB.\n\n` +
                                  `âœ… SOLUSI: Tambahkan Cloudflare R2 ke Vercel Environment Variables:\n` +
                                  `  S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com\n` +
                                  `  S3_ACCESS_KEY_ID=...\n` +
                                  `  S3_SECRET_ACCESS_KEY=...\n` +
                                  `  S3_BUCKET_NAME=...\n` +
                                  `  S3_PUBLIC_URL=...\n\n` +
                                  `Setelah redeploy, file EPS/AI akan diupload langsung ke R2 (tanpa melalui Vercel). ` +
                                  `Lihat CLOUDFLARE_R2_SETUP.md atau cek /api/r2-status.`
                              );
                          }
                          throw new Error(`File is too large (>500MB Server limit). Please optimize your EPS/AI file.`);
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
                              console.error(`Max retries reached. Server keeps failing. Last error: ${err.message}`);
                              throw new Error(`Gagal diproses karena kerumitan file. Server secara otomatis memutus koneksi (Out Of Memory). Harap perkecil ukuran/kerumitan EPS Anda sebelum diunggah. Detail: ${err.message}`);
                          }
                      }
                      throw new Error(`Failed to convert Vector (EPS/AI): ${err.message}`);
                  }
              }
              throw new Error("Failed to convert Vector (EPS/AI) after multiple attempts.");
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

    // Auto-detect tool based on first file
    let targetTool = activeTool;
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (allowedImageExts.includes(ext)) { targetTool = ToolType.IMAGE; break; }
        if (allowedVideoExts.includes(ext)) { targetTool = ToolType.VIDEO; break; }
        if (allowedVectorExts.includes(ext)) { targetTool = ToolType.VECTOR; break; }
    }
    
    if (targetTool !== activeTool) {
        handleSetActiveTool(targetTool);
    }

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

        let errorMsg: string | null = null;
        
        let isValid = false;
        if (targetTool === ToolType.IMAGE && allowedImageExts.includes(ext)) isValid = true;
        else if (targetTool === ToolType.VIDEO && allowedVideoExts.includes(ext)) isValid = true;
        else if (targetTool === ToolType.VECTOR && allowedVectorExts.includes(ext)) isValid = true;

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
                            dreamstimeCategory: '',
                            miriCanvasCategory: '',
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
            if (totalToday >= getDailyLimit()) {
                setShowLimitModal(true);
                throw new Error("Limit harian telah habis.");
            }
        }

        updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, isGenerating: true } : f));
        
        // Auto scroll to active file card smoothly
        setTimeout(() => {
          const el = document.getElementById(`file-card-${fileItem.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 120);
        
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

        let exifMetadata = fileItem.exifMetadata;
        if (!exifMetadata && fileItem.file && fileItem.file.size > 0) {
            try {
                const formData = new FormData();
                formData.append('file', fileItem.file);
                const exifRes = await fetch('/api/extract-exif', {
                    method: 'POST',
                    body: formData
                });
                if (exifRes.ok) {
                    const exifJson = await exifRes.json();
                    if (exifJson.success && exifJson.metadata) {
                        exifMetadata = exifJson.metadata;
                        updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, exifMetadata } : f));
                    }
                }
            } catch (exifErr) {
                console.warn("Failed to extract EXIF on server:", exifErr);
            }
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
              } else if (selectedProvider === 'aivene') {
                  if (selectedAiveneModel === 'auto') {
                      const stableModels = ['gpt-4o-mini', 'gemini-3.6-flash', 'gemini-3.5-flash', 'deepseek-v4-flash', 'qwen3.5-flash'];
                      modelParam = stableModels[Math.floor(Math.random() * stableModels.length)];
                  } else {
                      modelParam = selectedAiveneModel;
                  }
              } else if (selectedProvider === 'zai') {
                  modelParam = selectedZaiModel;
              }
              const aiOptions = {
                provider: selectedProvider,
                geminiKeys: geminiKeysList,
                groqKeys: groqKeysList,
                mistralKeys: mistralKeysList,
                openaiKeys: openaiKeysList,
                openrouterKeys: openrouterKeysList,
                nvidiaKeys: nvidiaKeysList,
                blackboxKeys: blackboxKeysList,
                bluesmindsKeys: bluesmindsKeysList,
                aiveneKeys: aiveneKeysList,
                zaiKeys: zaiKeysList
              };
              const metadata = await generateStockMetadata(analysisFrames, kCount, customPrompt, activeTool, aiCreativity, modelParam, keywordMode, aiOptions, titleLength, metadataLanguage, aiModelPerformance, exifMetadata);
              
              updateFiles(prev => prev.map(f => f.id === fileItem.id ? {
                ...f,
                title: toSentenceCase(metadata.title),
                description: metadata.description,
                keywords: metadata.keywords,
                adobeCategoryId: metadata.category_id,
                shutterstockCategory1: metadata.shutterstock_category_1,
                shutterstockCategory2: metadata.shutterstock_category_2,
                            dreamstimeCategory: '',
                            miriCanvasCategory: '',
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
            if (totalToday >= getDailyLimit()) {
                setShowLimitModal(true);
                throw new Error("Limit harian telah habis.");
            }
        }

        // 1. Mark as extracting/generating
        updateFiles(prev => prev.map(f => chunk.find(c => c.id === f.id) ? { ...f, isGenerating: true } : f));

        // Auto scroll to the first active card in the batch smoothly
        setTimeout(() => {
          if (chunk && chunk.length > 0) {
            const el = document.getElementById(`file-card-${chunk[0].id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 120);

        // 2. Extract frames and EXIF for those that need it
        const itemsToProcess: { id: string, frames: string[], exifMetadata?: any }[] = [];
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

            let exifMetadata = fileItem.exifMetadata;
            if (!exifMetadata && fileItem.file && fileItem.file.size > 0) {
                try {
                    const formData = new FormData();
                    formData.append('file', fileItem.file);
                    const exifRes = await fetch('/api/extract-exif', {
                        method: 'POST',
                        body: formData
                    });
                    if (exifRes.ok) {
                        const exifJson = await exifRes.json();
                        if (exifJson.success && exifJson.metadata) {
                            exifMetadata = exifJson.metadata;
                            updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, exifMetadata } : f));
                        }
                    }
                } catch (exifErr) {
                    console.warn("Failed to extract EXIF in batch:", exifErr);
                }
            }

            if (frames && frames.length > 0) {
                itemsToProcess.push({ id: fileItem.id, frames, exifMetadata });
            }
        }

        let finalItemsToProcess = itemsToProcess;
        if (!isMzLicensed) {
            const totalToday = getTotalDailyCount();
            const remaining = Math.max(0, getDailyLimit() - totalToday);
            if (finalItemsToProcess.length > remaining) {
                const allowed = finalItemsToProcess.slice(0, remaining);
                const excluded = finalItemsToProcess.slice(remaining);
                updateFiles(prev => prev.map(f => {
                    if (excluded.some(ex => ex.id === f.id)) {
                        return { ...f, isGenerating: false, isExtracting: false, error: "Limit harian telah habis (25/hari)." };
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
                } else if (selectedProvider === 'aivene') {
                    if (selectedAiveneModel === 'auto') {
                        const stableModels = ['gpt-4o-mini', 'gemini-3.6-flash', 'gemini-3.5-flash', 'deepseek-v4-flash', 'qwen3.5-flash'];
                        modelParam = stableModels[Math.floor(Math.random() * stableModels.length)];
                    } else {
                        modelParam = selectedAiveneModel;
                    }
                } else if (selectedProvider === 'zai') {
                    modelParam = selectedZaiModel;
                }
                const aiOptions = {
                  provider: selectedProvider,
                  geminiKeys: geminiKeysList,
                  groqKeys: groqKeysList,
                  mistralKeys: mistralKeysList,
                  openaiKeys: openaiKeysList,
                  openrouterKeys: openrouterKeysList,
                  nvidiaKeys: nvidiaKeysList,
                  blackboxKeys: blackboxKeysList,
                  bluesmindsKeys: bluesmindsKeysList,
                  aiveneKeys: aiveneKeysList,
                  zaiKeys: zaiKeysList
                };
                const batchResults = await generateBatchStockMetadata(finalItemsToProcess, kCount, customPrompt, activeTool, aiCreativity, modelParam, keywordMode, aiOptions, titleLength, metadataLanguage, aiModelPerformance);

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
                            dreamstimeCategory: '',
                            miriCanvasCategory: '',
                            categoryReason: result.metadata.category_reason,
                            isGenerating: false,
                            error: null
                        };
                    } else if (finalItemsToProcess.some(fi => fi.id === f.id)) {
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
      if (totalToday >= getDailyLimit()) {
        setShowLimitModal(true);
        return;
      }

      // Check if Free tier user has supplied their own manual API Key:
      const hasAnyManualKey = geminiKeysList.length > 0 || 
                              groqKeysList.length > 0 || 
                              mistralKeysList.length > 0 || 
                              openaiKeysList.length > 0 || 
                              openrouterKeysList.length > 0 || 
                              blackboxKeysList.length > 0 || 
                              nvidiaKeysList.length > 0 || 
                              bluesmindsKeysList.length > 0 || 
                              aiveneKeysList.length > 0 || 
                              zaiKeysList.length > 0;
      if (!hasAnyManualKey) {
        alert(uiLanguage === 'id' 
          ? "Pengguna Akun Free (Kuota 25 Gambar/Hari) wajib memasukkan API Key Gemini gratis Anda sendiri di Pengaturan (⚙️). Dapatkan API Key gratis di Google AI Studio (1.500 gambar/hari).\n\nIngin generate otomatis tanpa repot memasukkan API Key & Unlimited? Silakan upgrade ke Akun Pro/Lisensi!"
          : "Free Tier users (25 Daily Limit) must provide your own free Gemini API Key in Settings (⚙️). Get a free API key at Google AI Studio (1,500 images/day).\n\nWant to generate without entering any API keys & with Unlimited access? Please upgrade to Pro/Licensed account!");
        setShowSettingsModal(true);
        return;
      }
    }

    // Initial check to see if there's anything to do at all
    const currentFilesForCheck = getFilesForTool(filesRef.current, activeTool);
    const initialPending = isRetry 
        ? currentFilesForCheck.filter(f => f.error) 
        : currentFilesForCheck.filter(f => !f.title && !f.error);
        
    if (!initialPending.length) return;

    setIsLoading(true);
    setMobileTab('review');
    setReturnToStartCountdown(null);
    startTabKeepAlive();
    
    // Smoothly scroll to the processing section (Queue) on desktop and mobile
    setTimeout(() => {
      const queueEl = document.getElementById('review-queue-section');
      if (queueEl) {
        queueEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    stopGenerationRef.current = false;
    const startTime = Date.now();
    
    // Extracted loop so we can wrap it in Web Locks API
    const processingLoop = async () => {
        if (isProcessingLoopRef.current) return;
        isProcessingLoopRef.current = true;
        let processedInThisRun = 0;

        try {
            while (!stopGenerationRef.current) {
                const currentFiles = getFilesForTool(filesRef.current, activeTool);
                
                // What needs processing?
                const pending = isRetry
                    ? currentFiles.filter(f => f.error && !f.isExtracting)
                    : currentFiles.filter(f => !f.title && !f.error);
                    
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

            // Reduce batch size to avoid hitting aggressive 429 TPM/RPM quota limits
            let maxBatch = 5;
            if (activeTool === ToolType.VIDEO) maxBatch = 2;
            else if (activeTool === ToolType.VECTOR) maxBatch = 3;
            
            const chunkSize = generationMode === GenerationMode.BATCH ? maxBatch : 1;
            const chunk = ready.slice(0, chunkSize);
            
            try {
                if (generationMode === GenerationMode.BATCH) {
                    await processBatchFiles(chunk);
                    processedInThisRun += chunk.length;
                    // Add a small delay between batches to respect rate limits
                    await backgroundSafeTimeout(2000);
                } else {
                    for (const file of chunk) {
                        if (stopGenerationRef.current) break;
                        await processOneFile(file);
                        processedInThisRun++;
                        // Add a small delay
                        await backgroundSafeTimeout(1500);
                    }
                }
            } catch (err: any) {
                console.error("Batch processing error:", err);
            }
            
            // Update progress info
            const latestFiles = getFilesForTool(filesRef.current, activeTool);
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
        
        // If successfully completed processing (not stopped) and processed files
        if (!stopGenerationRef.current && processedInThisRun > 0) {
            setReturnToStartCountdown(5); // Start a 5-second countdown to return to beginning
        }
        
        stopGenerationRef.current = false;
        setTimeout(() => setProgressInfo(null), 5000);
      } catch (err) {
          console.error("Processing loop error:", err);
          setIsLoading(false);
          setIsPaused(false);
          stopTabKeepAlive();
          stopGenerationRef.current = false;
      } finally {
          if (processedInThisRun > 0 && autoBackupRef.current) {
              setTimeout(() => handleCloudAutoBackup(filesRef.current), 1000);
          }
          isProcessingLoopRef.current = false;
      }
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
      setReturnToStartCountdown(null);
      stopTabKeepAlive();
      // Clean up any files that were stuck in "generating" state
      updateFiles(prev => prev.map(f => f.isGenerating ? { ...f, isGenerating: false, error: "Cancelled by user" } : f));
  };

  const handleBackupJSON = () => {
    const validFiles = files.filter(f => f.title);
    if (!validFiles.length) return;
    
    const backupData = validFiles.map(f => ({
      id: f.id,
      fileName: f.customFileName || f.file?.name || 'unnamed_file',
      title: f.title,
      description: f.description,
      keywords: f.keywords,
      adobeCategoryId: f.adobeCategoryId,
      shutterstockCategory1: f.shutterstockCategory1,
      shutterstockCategory2: f.shutterstockCategory2,
                            dreamstimeCategory: '',
                            miriCanvasCategory: '',
      categoryReason: f.categoryReason,
      timestamp: new Date().toISOString()
    }));
    
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `metazo_metadata_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error("Backup JSON failed", e);
    }
  };

  const handleImportJSON = (backupData: any[]) => {
    updateFiles(prev => {
      const newFiles = [...prev];
      
      const uniqueBackupItems: any[] = [];
      const seenNames = new Set<string>();
      const seenIds = new Set<string>();

      backupData.forEach(item => {
        const name = item.fileName || 'unnamed_file';
        const id = item.id;
        if (!seenNames.has(name) && (!id || !seenIds.has(id))) {
          seenNames.add(name);
          if (id) seenIds.add(id);
          uniqueBackupItems.push(item);
        }
      });
      
      uniqueBackupItems.forEach(backupItem => {
        const itemFileName = backupItem.fileName || 'unnamed_file';
        const existingIdx = newFiles.findIndex(f => 
          (f.customFileName || f.file?.name || 'unnamed_file') === itemFileName ||
          f.id === backupItem.id
        );

        if (existingIdx >= 0) {
          // Merge with existing to avoid duplicating
          newFiles[existingIdx] = {
            ...newFiles[existingIdx],
            title: backupItem.title || newFiles[existingIdx].title,
            description: backupItem.description || newFiles[existingIdx].description,
            keywords: backupItem.keywords || newFiles[existingIdx].keywords,
            adobeCategoryId: backupItem.adobeCategoryId || newFiles[existingIdx].adobeCategoryId,
            shutterstockCategory1: backupItem.shutterstockCategory1 || newFiles[existingIdx].shutterstockCategory1,
            shutterstockCategory2: backupItem.shutterstockCategory2 || newFiles[existingIdx].shutterstockCategory2,
                            dreamstimeCategory: '',
                            miriCanvasCategory: '',
            categoryReason: backupItem.categoryReason || newFiles[existingIdx].categoryReason,
            isGenerating: false,
            error: null
          };
        } else {
          // Create dummy file for imported metadata without corresponding actual file
          const ext = itemFileName.split('.').pop()?.toLowerCase();
          const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');
          const dummyFile = new File([], itemFileName, { type: isVideo ? 'video/mp4' : 'image/jpeg' });
          
          newFiles.push({
            id: backupItem.id || Math.random().toString(36).substring(2, 9),
            file: dummyFile,
            customFileName: itemFileName,
            thumbnail: null,
            analysisFrames: [],
            title: backupItem.title || '',
            description: backupItem.description || '',
            keywords: backupItem.keywords || [],
            adobeCategoryId: backupItem.adobeCategoryId || '',
            shutterstockCategory1: backupItem.shutterstockCategory1 || '',
            shutterstockCategory2: backupItem.shutterstockCategory2 || '',
                            dreamstimeCategory: '',
                            miriCanvasCategory: '',
            categoryReason: backupItem.categoryReason || '',
            isGenerating: false,
            error: null
          });
        }
      });
      return newFiles;
    });
    alert(`Successfully imported metadata. ${backupData.length} items loaded.`);
  };

  const handleCloudAutoBackup = (filesToBackup: FileItem[]) => {
    if (!user) return;
    const validFiles = filesToBackup.filter(f => f.title);
    if (!validFiles.length) return;
    
    const backupData = validFiles.map(f => ({
      id: f.id,
      fileName: f.customFileName || f.file?.name || 'unnamed_file',
      title: f.title,
      description: f.description,
      keywords: f.keywords,
      adobeCategoryId: f.adobeCategoryId,
      shutterstockCategory1: f.shutterstockCategory1,
      shutterstockCategory2: f.shutterstockCategory2,
                            dreamstimeCategory: '',
                            miriCanvasCategory: '',
      categoryReason: f.categoryReason,
      timestamp: new Date().toISOString()
    }));

    // Prevent duplicates if data (ignoring item timestamp) is identical
    const sanitizeForComparison = (items: any[]) => items.map(i => {
      const { timestamp, ...rest } = i;
      return rest;
    });

    try {
      const localBackupsKey = `metazo_local_backups_${user.uid}`;
      const existingStr = localStorage.getItem(localBackupsKey);
      let existingBackups = existingStr ? JSON.parse(existingStr) : [];
      if (!Array.isArray(existingBackups)) {
        existingBackups = [];
      }
      
      const isDuplicate = existingBackups.length > 0 && 
        existingBackups[0].tool === activeTool &&
        JSON.stringify(sanitizeForComparison(existingBackups[0].items)) === JSON.stringify(sanitizeForComparison(backupData));

      if (isDuplicate) {
        console.log('[Auto-backup] Skipped (duplicate data).');
        return;
      }

      const newLocalBackup = {
        batchId: `local-batch-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        tool: activeTool,
        items: backupData,
        createdAt: new Date().toISOString()
      };

      existingBackups.unshift(newLocalBackup);

      // Keep only last 30 backups to avoid localStorage overflow
      if (existingBackups.length > 30) {
        existingBackups = existingBackups.slice(0, 30);
      }

      localStorage.setItem(localBackupsKey, JSON.stringify(existingBackups));
      console.log('[Local Storage] Auto-backup saved successfully.');
    } catch (localErr) {
      console.warn('[Local Storage] Auto-backup failed to save locally:', localErr);
    }

    
    // Fully Cloud Storage using Supabase
    console.log('[Supabase] Saving backup to Supabase...');
    const batchId = `batch-${Date.now()}`;
    const newBackup = {
      uid: user.uid,
      batch_id: batchId,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tool: activeTool,
      items: JSON.stringify(backupData),
      created_at: new Date().toISOString()
    };
    
    addDoc(collection(db, 'metadata_backups'), newBackup)
      .then((docRef) => {
        console.log('[Supabase] Auto-backup saved successfully:', batchId);
      })
      .catch(err => {
        console.warn('[Supabase] Auto-backup failed:', err);
      });

  };

  // Debounced auto backup when files change
  useEffect(() => {
    if (!autoBackup) return;
    if (!user) return;
    if (files.length === 0) return;
    
    // Check if there is any actually generated/edited file
    const hasMetadata = files.some(f => f.title);
    if (!hasMetadata) return;

    const timer = setTimeout(() => {
      console.log('[Cloudflare D1] Triggering debounced auto-backup for files changes...');
      handleCloudAutoBackup(files);
    }, 5000); // 5s debounce to avoid spamming the database on typing/successive generations

    return () => clearTimeout(timer);
  }, [files, autoBackup, user?.uid]);

  const handleExport = () => {
    const toolFiles = getFilesForTool(files, activeTool);
    if (!toolFiles.length) return;

    const escapeCsv = (str: string) => {
        if (str === null || str === undefined) return '';
        const s = String(str).replace(/[\r\n]+/g, ' ').trim();
        if (s.includes(',') || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const escapeSemicolonCsv = (str: string) => {
        if (str === null || str === undefined) return '';
        const s = String(str).replace(/[\r\n]+/g, ' ').trim();
        if (s.includes(';') || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const getExportFilename = (originalName: string, originalFile: File) => {
        if (!originalFile || !originalFile.name) return originalName;
        const origExt = originalFile.name.split('.').pop()?.toLowerCase() || '';
        if (!origExt) return originalName;

        const suffix = `.${origExt}`;
        if (originalName.toLowerCase().endsWith(suffix)) {
            return originalName;
        }

        if (origExt === 'jpg' && originalName.toLowerCase().endsWith('.jpeg')) {
            return originalName;
        }
        if (origExt === 'jpeg' && originalName.toLowerCase().endsWith('.jpg')) {
            return originalName;
        }

        return `${originalName}.${origExt}`;
    };

    if (exportAdobe) {
      // Adobe Stock CSV Format: Filename,Title,Keywords,Category
      const headers = ['Filename', 'Title', 'Keywords', 'Category'];
      const rows = toolFiles.map(f => [
          escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)), 
          escapeCsv(f.title || ''), 
          escapeCsv((f.keywords || []).join(', ')), 
          escapeCsv(String(f.adobeCategoryId || ''))
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
      const rows = toolFiles.map(f => {
          let combinedDescription = f.description || f.title || '';
          if (shutterstockDescMode === 'title_desc' && f.description && f.title && f.title !== f.description) {
              const cleanTitle = f.title.trim().replace(/\.$/, '');
              combinedDescription = `${cleanTitle}. ${f.description.trim()}`;
          }

          return [
              escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
              escapeCsv(combinedDescription),
              escapeCsv((f.keywords || []).join(',')),
              escapeCsv([f.shutterstockCategory1, f.shutterstockCategory2].filter(Boolean).filter(c => c.toLowerCase() !== 'arts').map(c => c.toLowerCase()).join(', ')),
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
      const rows = toolFiles.map(f => {
          const removeSpecialChars = (str: string) => {
              let cleaned = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,-]/g, "");
              return cleaned.replace(/\s+/g, ' ').trim();
          };
          
          const cleanTitle = removeSpecialChars(f.title || '');
          const titleField = escapeCsv(cleanTitle);
          
          const forbiddenKeywords = ['photo', 'vector', 'video'];
          const filteredKeywords = (f.keywords || [])
              .map(k => removeSpecialChars(k))
              .filter(k => k.length > 0 && !forbiddenKeywords.includes(k.toLowerCase().trim()));
          const keywordsField = escapeCsv(filteredKeywords.join(', '));
          
          const originalFilename = getExportFilename(f.customFileName || f.file.name, f.file);
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
      const rows = toolFiles.map(f => {
          return [
              escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
              escapeCsv(f.title || ''),
              escapeCsv((f.keywords || []).slice(0, 20).join(',')), // Canva uses comma without space, max 20 keywords
              escapeCsv(f.description || f.title || '')
          ];
      });
      const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Canva_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportFreepik) {
      // Freepik CSV Format: File name;Title;Keywords;Prompt;Model
      const headers = ['File name', 'Title', 'Keywords', 'Prompt', 'Model'];
      const rows = toolFiles.map(f => {
          return [
              escapeSemicolonCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
              escapeSemicolonCsv(f.title || ''),
              escapeSemicolonCsv((f.keywords || []).join(',')), // Freepik keywords comma separated
              '', // Prompt
              ''  // Model
          ];
      });
      const csvContent = "\ufeff" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Freepik_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportPond5) {
      const headers = ['OriginalFilename', 'Title', 'Description', 'Keywords', 'Price', 'Editorial'];
      const rows = toolFiles.map(f => [
          escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
          escapeCsv(f.title || ''),
          escapeCsv(f.description || f.title || ''),
          escapeCsv((f.keywords || []).join(',')),
          '',
          'no'
      ]);
      const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Pond5_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportDepositPhotos) {
      const headers = ['Filename', 'Title', 'Description', 'Keywords'];
      const rows = toolFiles.map(f => [
          escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
          escapeCsv(f.title || ''),
          escapeCsv(f.description || f.title || ''),
          escapeCsv((f.keywords || []).join(','))
      ]);
      const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_DepositPhotos_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (exportMiriCanvas) {
      const headers = ['Filename', 'Name', 'Keywords'];
      const rows = toolFiles.map(f => [
          escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
          escapeCsv(f.title || ''),
          escapeCsv((f.keywords || []).join(','))
      ]);
      const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_MiriCanvas_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    if (export123RF) {
      const headers = ['filename', 'description', 'keywords'];
      const rows = toolFiles.map(f => [
          escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
          escapeCsv(f.title || f.description || ''),
          escapeCsv((f.keywords || []).join(','))
      ]);
      const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_123RF_${activeTool.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  };

  const handleDownloadEmbedded = async () => {
    const toolFiles = getFilesForTool(files, activeTool);
    const completedFiles = toolFiles.filter(f => (f.title || f.description) && f.file);
    if (completedFiles.length === 0) {
      alert(uiLanguage === 'id' ? 'Belum ada file dengan metadata selesai untuk diunduh.' : 'No completed files with metadata to embed.');
      return;
    }

    setEmbedDownloading(true);
    try {
      for (let i = 0; i < completedFiles.length; i++) {
        const item = completedFiles[i];
        const title = item.title?.trim() || item.description?.trim() || '';
        const description = item.description?.trim() || title;
        const keywords = item.keywords || [];

        // Build file export name directly from Metadata Title
        const origExt = (item.file.name.split('.').pop() || 'jpg').toLowerCase();
        const baseNameRaw = title || item.customFileName?.trim() || item.file.name.replace(/\.[^/.]+$/, '');
        const cleanName = baseNameRaw
          .replace(/[\\/:*?"<>|]/g, '')
          .replace(/\s+/g, ' ')
          .trim() || 'asset';
        const exportName = `${cleanName}.${origExt}`;

        let downloaded = false;

        try {
          const formData = new FormData();
          formData.append('file', item.file, exportName);
          formData.append('title', title);
          formData.append('description', description);
          formData.append('keywords', JSON.stringify(keywords));
          if (commonAiOptions?.model) formData.append('model', commonAiOptions.model);

          const reqHeaders = { ...getHeaders(commonAiOptions) };
          delete reqHeaders['Content-Type']; // CRITICAL: Allow browser to set boundary for multipart/form-data

          const resp = await fetch('/api/embed-metadata', {
            method: 'POST',
            headers: reqHeaders,
            body: formData
          });

          if (resp.ok) {
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await resp.json();
              if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
                downloaded = true;
              }
            } else {
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = exportName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 2000);
              downloaded = true;
            }
          } else {
            const errData = await resp.json().catch(() => ({}));
            console.error('[Download Embedded] Server error:', errData);
            throw new Error(errData.error || `Server status ${resp.status}`);
          }
        } catch (serverErr) {
          console.warn('[Download Embedded] Server embed failed, trying client fallback:', serverErr);
        }

        // Client-side fallback for JPEG files using piexifjs (with true UCS-2LE encoding for Windows Explorer)
        if (!downloaded && (item.file.type === 'image/jpeg' || item.file.name.toLowerCase().endsWith('.jpg') || item.file.name.toLowerCase().endsWith('.jpeg'))) {
          try {
            const dataUri = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(item.file);
            });

            let zeroth: any = {};
            let exif: any = {};
            let gps: any = {};
            try {
              const existing = piexif.load(dataUri);
              zeroth = existing['0th'] || {};
              exif = existing['Exif'] || {};
              gps = existing['GPS'] || {};
            } catch (_) {}

            // Helper to encode string as 2-byte UCS-2LE (UTF-16LE with null terminator) to prevent Chinese/Japanese mojibake in Windows
            const toUcs2Bytes = (str: string) => {
              const bytes: number[] = [];
              for (let i = 0; i < str.length; i++) {
                const code = str.charCodeAt(i);
                bytes.push(code & 0xFF, (code >> 8) & 0xFF);
              }
              bytes.push(0, 0);
              return bytes;
            };

            zeroth[piexif.ImageIFD.ImageDescription] = description;
            zeroth[piexif.ImageIFD.XPTitle] = toUcs2Bytes(title);
            zeroth[piexif.ImageIFD.XPComment] = toUcs2Bytes(description);
            zeroth[piexif.ImageIFD.XPKeywords] = toUcs2Bytes(keywords.join('; '));
            zeroth[piexif.ImageIFD.Software] = "MetaZo AI Assistant";

            const exifBytes = piexif.dump({ "0th": zeroth, "Exif": exif, "GPS": gps });
            const newImageDataUri = piexif.insert(exifBytes, dataUri);

            const byteString = atob(newImageDataUri.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let b = 0; b < byteString.length; b++) {
              ia[b] = byteString.charCodeAt(b);
            }
            const blob = new Blob([ab], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            downloaded = true;
          } catch (clientErr) {
            console.error('[Download Embedded] Client fallback error:', clientErr);
          }
        }

        // Client-side fallback for SVG files
        if (!downloaded && (item.file.type === 'image/svg+xml' || item.file.name.toLowerCase().endsWith('.svg'))) {
          try {
            let svgText = await item.file.text();
            const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, (c) => {
              switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
              }
            });
            const titleTag = `<title>${escapeXml(title)}</title>`;
            const descTag = `<desc>${escapeXml(description)}</desc>`;
            const keywordsXml = keywords.map(k => `<rdf:li>${escapeXml(k)}</rdf:li>`).join('');
            const metadataTag = `<metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:Description><dc:title>${escapeXml(title)}</dc:title><dc:description>${escapeXml(description)}</dc:description><dc:subject><rdf:Bag>${keywordsXml}</rdf:Bag></dc:subject><dc:format>image/svg+xml</dc:format></rdf:Description></rdf:RDF></metadata>`;

            svgText = svgText
              .replace(/<title[\s\S]*?<\/title>/gi, '')
              .replace(/<desc[\s\S]*?<\/desc>/gi, '')
              .replace(/<metadata[\s\S]*?<\/metadata>/gi, '');

            if (/<svg[^>]*>/i.test(svgText)) {
              svgText = svgText.replace(/(<svg[^>]*>)/i, `$1\n  ${titleTag}\n  ${descTag}\n  ${metadataTag}`);
              const blob = new Blob([svgText], { type: 'image/svg+xml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = exportName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 2000);
              downloaded = true;
            }
          } catch (svgErr) {
            console.error('[Download Embedded] SVG client fallback error:', svgErr);
          }
        }

        if (completedFiles.length > 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (e) {
      console.error('[Download Embedded] Error:', e);
    } finally {
      setEmbedDownloading(false);
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
    updateFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, error: null, title: '', isGenerating: false, isExtracting: false } : f));
    // Start queue so we pick it up safely
    setTimeout(() => {
        handleGenerateAll();
    }, 100);
  };

  const t = TRANSLATIONS[uiLanguage];

  if (!hasInitiallyLoaded && (isCheckingAuth || (user && (!hasSyncedProfile || isCheckingLicense)))) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-[#f8f9fc] dark:bg-[#090d16] text-[#5a5c69] dark:text-slate-100 ${theme === 'dark' ? 'dark' : ''}`}>
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
        onLoginSuccess={(loggedInUser) => {
          // no promo trigger
          setUser(loggedInUser);
        }} 
        theme={theme} 
        setTheme={handleSetTheme} 
        language={uiLanguage}
        setLanguage={setUiLanguage}
        t={t} 
      />
    );
  }

  const currentToolFiles = getFilesForTool(files, activeTool);
  const hasFiles = currentToolFiles.length > 0;
  const filesToGenerateCount = currentToolFiles.filter(f => !f.title && !f.error && !f.isExtracting).length;
  const filesWithErrorCount = currentToolFiles.filter(f => f.error).length;
  const isAnythingGenerating = currentToolFiles.some(f => f.isGenerating || f.isExtracting);
  const canDownload = hasFiles && currentToolFiles.some(f => f.title);
  const successfulFilesCount = currentToolFiles.filter(f => f.title).length;
  const isAllFinished = hasFiles && !isAnythingGenerating && currentToolFiles.every(f => f.title || f.error);

  const getDiscountedPriceAuto = (priceStr: string, discountPercent: number) => {
    if (!priceStr || typeof priceStr !== 'string') return priceStr;
    const cleanNumStr = priceStr.replace(/[^0-9]/g, '');
    if (!cleanNumStr) return priceStr;
    const originalVal = parseInt(cleanNumStr, 10);
    if (isNaN(originalVal)) return priceStr; 
    const discountedVal = Math.round(originalVal * (1 - discountPercent / 100));
    if (priceStr.startsWith('Rp')) {
      const formatted = new Intl.NumberFormat('id-ID').format(discountedVal);
      return `Rp. ${formatted}`;
    } else if (priceStr.includes('$')) {
      return `$${discountedVal}`;
    }
    return priceStr;
  };

  const isPromoActive = new Date() < new Date('2026-07-01T00:00:00+07:00');
  const price30DaysRaw = localStorage.getItem('mz_price_30_days') || 'Rp 50.000';
  const priceUnlimitedRaw = localStorage.getItem('mz_price_unlimited') || 'Rp 250.000';
  const price30DaysUSDRaw = localStorage.getItem('mz_price_30_days_usd') || '$2';
  const priceUnlimitedUSDRaw = localStorage.getItem('mz_price_unlimited_usd') || '$14';

  const autoPricingTierId = isPromoActive 
    ? `30 Hari ${getDiscountedPriceAuto(price30DaysRaw, 30)} - Unlimited ${getDiscountedPriceAuto(priceUnlimitedRaw, 30)}` 
    : `30 Hari ${price30DaysRaw} - Unlimited ${priceUnlimitedRaw}`;
    
  const autoPricingTierEn = isPromoActive 
    ? `30 Days ${getDiscountedPriceAuto(price30DaysUSDRaw, 30)} - Unlimited ${getDiscountedPriceAuto(priceUnlimitedUSDRaw, 30)}` 
    : `30 Days ${price30DaysUSDRaw} - Unlimited ${priceUnlimitedUSDRaw}`;

  const autoPricingTier = uiLanguage === 'id' ? autoPricingTierId : autoPricingTierEn;

  const globalModelParam = selectedProvider === 'gemini' ? (selectedGeminiModel === 'auto' ? undefined : selectedGeminiModel) :
                           selectedProvider === 'groq' ? selectedGroqModel :
                           selectedProvider === 'nvidia' ? selectedNvidiaModel :
                           selectedProvider === 'aivene' ? (selectedAiveneModel === 'auto' ? 'gpt-4o-mini' : selectedAiveneModel) :
                           selectedProvider === 'zai' ? selectedZaiModel : undefined;
  
  const commonAiOptions = {
    provider: selectedProvider,
    geminiKeys: geminiKeysList,
    groqKeys: groqKeysList,
    mistralKeys: mistralKeysList,
    openaiKeys: openaiKeysList,
    openrouterKeys: openrouterKeysList,
    nvidiaKeys: nvidiaKeysList,
    blackboxKeys: blackboxKeysList,
    bluesmindsKeys: bluesmindsKeysList,
    aiveneKeys: aiveneKeysList,
    zaiKeys: zaiKeysList,
    model: globalModelParam
  };

  return (
    <div 
      className={`min-h-[100dvh] flex bg-[#f8f9fc] dark:bg-[#090d16] text-[#5a5c69] dark:text-slate-100 ${theme === 'dark' ? 'dark' : ''} relative overflow-hidden transition-colors duration-500`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const isMainTool = [ToolType.DASHBOARD, ToolType.PROMPT_GEN, ToolType.IMAGE, ToolType.VIDEO, ToolType.VECTOR].includes(activeTool);
          if (isMainTool) {
            handleFileChange({ target: { files: e.dataTransfer.files } });
          } else {
            const dropEvent = new CustomEvent('globalFileDrop', { detail: { files: e.dataTransfer.files } });
            window.dispatchEvent(dropEvent);
          }
        }
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[9999] bg-white/40 dark:bg-[#090d16]/70 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
          <div className="absolute inset-6 border-4 border-dashed border-indigo-500/50 dark:border-indigo-400/40 rounded-[2.5rem] animate-pulse pointer-events-none" />
          
          <div className="bg-white dark:bg-slate-900/90 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-bounce shadow-indigo-500/20 dark:shadow-indigo-500/10 border border-slate-200 dark:border-white/10 backdrop-blur-xl">
            <div className="relative w-28 h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30 overflow-hidden">
              <div className="absolute inset-0 bg-white/20 dark:bg-black/10 animate-pulse" />
              <svg className="w-12 h-12 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 dark:from-indigo-400 dark:via-purple-400 dark:to-rose-400 uppercase tracking-[0.1em]">
              Drop Files Here
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-3 text-sm uppercase tracking-wider">
              Anywhere in the application area
            </p>
          </div>
        </div>
      )}
      {/* Immersive background decoration: Animated glowing mesh blobs & high-fidelity alignment grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute top-[8%] left-[4%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-purple-900/15 blur-[120px] animate-blob-1" />
        <div className="absolute bottom-[12%] right-[6%] w-[600px] h-[600px] rounded-full bg-emerald-400/8 dark:bg-pink-950/10 blur-[140px] animate-blob-2" />
        <div className="absolute top-[40%] left-[30%] w-[450px] h-[450px] rounded-full bg-rose-400/8 dark:bg-blue-950/15 blur-[130px] animate-blob-3" />
        <div className="absolute inset-0 grid-bg opacity-70"></div>
        {/* Custom luxury shooting star effect */}
        <Meteors number={16} />
      </div>

      <div className="flex flex-1 w-full bg-transparent overflow-hidden relative z-10">
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
        isCheckingLicense={isCheckingLicense}
        setShowActivation={setShowActivationModal}
        onUnlockReseller={() => {
          if (isAdminAccount) {
            setShowSettingsModal(true);
            setActiveSettingsTab('reseller');
          }
        }}
        appName={mzAppName}
        unreadChatCount={unreadChatCount}
        onShowAbout={() => setShowAboutModal(true)}
      />

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto">
        {/* Topbar Header */}
        <Topbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          theme={theme} 
          setTheme={handleSetTheme} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          setShowInfoModal={setShowInfoModal} 
          setShowSettingsModal={setShowSettingsModal}
          t={t} 
          setShowActivation={setShowActivationModal}
          isLicensed={!!isMzLicensed}
          isCheckingLicense={isCheckingLicense}
          uiLanguage={uiLanguage}
          setUiLanguage={setUiLanguage}
          user={user}
          activeAccountsCount={activeAccountsCount}
          activeUsers={activeUsers}
          onSignOut={async () => {
            try {
              if (auth.currentUser) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, { lastSeen: 0 }).catch(()=>console.info("onSignOut update error"));
              }
              await signOut(auth);
              localStorage.removeItem('mz_license_key');
              localStorage.removeItem('mz_trial_start');
              setMzLicenseKey('');
              setIsMzLicensed(false);
              setHasSyncedProfile(false);
              setIsCheckingLicense(true);
              setHasInitiallyLoaded(false);
            } catch (err) {
              console.error("Sign out error", err);
            }
          }}
        />

        {/* Core Dashboard Stage */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full h-full"
            >
              {activeTool === ToolType.DASHBOARD ? (
                <DashboardView 
                  userName={user?.displayName || user?.email?.split('@')[0] || ''}
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
                  pricingTier={autoPricingTier}
                  whatsAppLink={mzWhatsApp}
                  setShowActivation={setShowActivationModal}
                  imageDailyCount={dailyGenCounts[ToolType.IMAGE] || 0}
                  videoDailyCount={dailyGenCounts[ToolType.VIDEO] || 0}
                  vectorDailyCount={dailyGenCounts[ToolType.VECTOR] || 0}
                  t={t}
                  trialDaysLeft={trialDaysLeft}
                  promoCodes={promoCodesForModal}
                />
              ) : activeTool === ToolType.PROMPT_GEN ? (
            <PromptGenView 
              t={t} 
              uiLanguage={uiLanguage}
              prefilledSubject={prefilledSubject} 
              onPrefillConsumed={() => setPrefilledSubject('')} 
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_GEN] || 0}
              incrementDailyCount={() => incrementDailyCount(ToolType.PROMPT_GEN)}
              aiOptions={commonAiOptions}
              user={user}
              db={db}
            />
          ) : activeTool === ToolType.PROMPT_IMAGE ? (
            <PromptImageView 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_IMAGE] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE, amount)}
              setShowLimitModal={setShowLimitModal}
              aiOptions={commonAiOptions}
              uiLanguage={uiLanguage}
            />
          ) : activeTool === ToolType.PROMPT_VIDEO ? (
            <PromptVideoView 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_VIDEO] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_VIDEO, amount)}
              setShowLimitModal={setShowLimitModal}
              aiOptions={commonAiOptions}
              user={user}
              db={db}
              uiLanguage={uiLanguage}
            />
          ) : activeTool === ToolType.PROMPT_IMAGE_CHECK ? (
            <ImageCheckView 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_IMAGE_CHECK] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE_CHECK, amount)}
              setShowLimitModal={setShowLimitModal}
              setShowActivationModal={setShowActivationModal}
              onSendToMetadataGen={(passedFiles) => {
                if (passedFiles && passedFiles.length > 0) {
                  handleFileChange({ target: { files: passedFiles } });
                }
              }}
              aiOptions={commonAiOptions}
              user={user}
              db={db}
            />
          ) : activeTool === ToolType.PROMPT_VIDEO_CHECK ? (
            <VideoQualityCheck 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.PROMPT_VIDEO_CHECK] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.PROMPT_VIDEO_CHECK, amount)}
              setShowLimitModal={setShowLimitModal}
              setShowActivationModal={setShowActivationModal}
              aiOptions={commonAiOptions}
              user={user}
              db={db}
            />
          ) : activeTool === ToolType.CALENDAR_GEN ? (
            <CalendarGenView 
              t={t}
              onSendToPrompt={(text) => {
                setPrefilledSubject(text);
                handleSetActiveTool(ToolType.PROMPT_GEN);
              }}
              aiOptions={commonAiOptions}
            />
          ) : activeTool === ToolType.MUTE_VIDEO ? (
            <MuteVideoView 
              t={t} 
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.MUTE_VIDEO] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.MUTE_VIDEO, amount)}
              setShowLimitModal={setShowLimitModal}
              setShowActivationModal={setShowActivationModal}
            />
          ) : activeTool === ToolType.MOTION_GEN ? (
            <MotionGenView 
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.MOTION_GEN] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.MOTION_GEN, amount)}
              setShowLimitModal={setShowLimitModal}
              setShowActivationModal={setShowActivationModal}
              aiOptions={commonAiOptions}
            />
          ) : activeTool === ToolType.REMOVAL_GEN ? (
            <RemovalGenView 
              t={t}
              isLicensed={isMzLicensed}
              dailyGenCount={dailyGenCounts[ToolType.REMOVAL_GEN] || 0}
              incrementDailyCount={(amount = 1) => incrementDailyCount(ToolType.REMOVAL_GEN, amount)}
              setShowLimitModal={setShowLimitModal}
              setShowActivationModal={setShowActivationModal}
              aiOptions={commonAiOptions}
            />
          ) : activeTool === ToolType.REVIEWS ? (
            <ReviewsView 
              t={t}
              user={user}
              isLicensed={isMzLicensed}
              appName={mzAppName}
              onOpenDashboard={() => handleSetActiveTool(ToolType.DASHBOARD)}
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
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                      {activeTool === ToolType.IMAGE ? (
                        <>
                          <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/10">
                            <ImageIcon className="text-violet-500 dark:text-violet-400" size={20} strokeWidth={2.5} />
                          </div>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
                            Image AI Workspace
                          </span>
                        </>
                      ) : activeTool === ToolType.VIDEO ? (
                        <>
                          <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10">
                            <Film className="text-purple-500 dark:text-purple-400" size={20} strokeWidth={2.5} />
                          </div>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-fuchsia-600 dark:from-purple-400 dark:to-fuchsia-400">
                            Video AI Workspace
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                            <FileCode className="text-emerald-500 dark:text-emerald-400" size={20} strokeWidth={2.5} />
                          </div>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                            Vector AI Workspace
                          </span>
                        </>
                      )}
                    </h2>
                    <FeatureGuideButton 
                      title={activeTool === ToolType.IMAGE ? t.guide_image_title : activeTool === ToolType.VIDEO ? t.guide_video_title : t.guide_vector_title}
                      description={activeTool === ToolType.IMAGE ? t.guide_image_desc : activeTool === ToolType.VIDEO ? t.guide_video_desc : t.guide_vector_desc}
                      t={t}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-extrabold mt-1.5 uppercase tracking-widest ml-[52px]">
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

              {/* âš ï¸ R2 WARNING BANNER â€” muncul jika R2 belum dikonfigurasi */}
              {[ToolType.VECTOR, ToolType.VIDEO, ToolType.IMAGE, ToolType.MUTE_VIDEO].includes(activeTool) && r2Status === false && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300 animate-in fade-in slide-in-from-top-2 duration-300">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                  </svg>
                  <div className="text-xs leading-relaxed">
                    <span className="font-black uppercase tracking-wide">
                      {metadataLanguage === 'Bahasa' ? 'Cloudflare R2 belum dikonfigurasi.' : 'Cloudflare R2 is not configured.'}
                    </span>
                    {" "}
                    {metadataLanguage === 'Bahasa' 
                      ? 'Vercel membatasi ukuran request maksimum 4.5MB. Agar file besar (Video/EPS/Gambar) tidak gagal upload, silakan tambahkan kredensial R2 di Settings menu.' 
                      : 'Vercel limits payload uploads to 4.5MB. To process large files (Videos/EPS/Images) without issues, please add R2 credentials in the Settings menu.'
                    }{" "}
                    <span className="font-semibold">
                      Tambahkan <code className="bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]">S3_ENDPOINT</code>,{" "}
                      <code className="bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]">S3_ACCESS_KEY_ID</code>,{" "}
                      <code className="bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]">S3_SECRET_ACCESS_KEY</code>,{" "}
                      <code className="bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]">S3_BUCKET_NAME</code>{" "}
                      ke Vercel Environment Variables lalu redeploy.
                    </span>{" "}
                    Lihat <span className="font-mono font-bold underline cursor-pointer" onClick={() => window.open('/api/r2-status', '_blank')}>
                      /api/r2-status
                    </span> untuk cek konfigurasi.
                  </div>
                  <button
                    onClick={() => setR2Status(null)}
                    className="ml-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
                    title="Tutup"
                  >Ã—</button>
                </div>
              )}

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
                  files={currentToolFiles} 
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
                  titleLength={titleLength}
                  setTitleLength={setTitleLength}
                  metadataLanguage={metadataLanguage}
                  setMetadataLanguage={setMetadataLanguage}
                  aiCreativity={aiCreativity}
                  setAiCreativity={setAiCreativity}
                  aiModelPerformance={aiModelPerformance}
                  setAiModelPerformance={setAiModelPerformance}
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
                  hasFiles={currentToolFiles.length > 0} 
                />
              </div>

              {/* Section Row 2: Queue Review & Editor Component */}
              <ReviewQueue 
                files={currentToolFiles} 
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
                keywordCount={keywordCount}
                aiOptions={commonAiOptions}
              />

              {/* Section Row 3: Bulk Export Integration Panels */}
              <div className={mobileTab === 'review' ? 'block animate-in fade-in slide-in-from-bottom-5 duration-300' : 'hidden lg:block'}>
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
                    exportPond5={exportPond5}
                    setExportPond5={setExportPond5}
                    exportDepositPhotos={exportDepositPhotos}
                    setExportDepositPhotos={setExportDepositPhotos}
                    exportMiriCanvas={exportMiriCanvas}
                    setExportMiriCanvas={setExportMiriCanvas}
                    export123RF={export123RF}
                    setExport123RF={setExport123RF}
                    shutterstockDescMode={shutterstockDescMode} 
                    setShutterstockDescMode={setShutterstockDescMode} 
                    autoDownloadCSV={autoDownloadCSV} 
                    setAutoDownloadCSV={setAutoDownloadCSVState} 
                    canDownload={canDownload} 
                    handleExport={handleExport} 
                    handleBackupJSON={handleBackupJSON}
                    handleDownloadEmbedded={handleDownloadEmbedded}
                    embedDownloading={embedDownloading}
                    t={t} 
                  />
                )}
                
                <BackupManagerPanel
                  user={user}
                  db={db}
                  isLicensed={isMzLicensed}
                  handleBackupJSON={handleBackupJSON}
                  handleImportJSON={handleImportJSON}
                  autoBackup={autoBackup}
                  setAutoBackup={setAutoBackup}
                  activeTool={activeTool}
                  handleCloudBackup={() => handleCloudAutoBackup(files)}
                />
              </div>
            </>
          )}
          </motion.div>
        </AnimatePresence>
        </main>

        <footer className="text-center py-6 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#090d16] mt-auto">
          <p>{t.footer_text} | v1.3.0 PRO</p>
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
                <button 
                  onClick={fetchProviderStatus}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full"
                  title="Refresh Provider Status"
                >
                  <RefreshCcw size={12} />
                </button>
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
                  localStorage.setItem('ai_provider', val);
                  if (auth.currentUser) {
                    updateDoc(doc(db, 'users', auth.currentUser.uid), {
                      'settings.ai_provider': val
                    }).catch(() => {});
                  }
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
                  { id: 'nvidia', name: 'NVIDIA', desc: 'NVIDIA NIM' },
                  { id: 'bluesminds', name: 'Bluesminds', desc: 'Fast Proxy' },
                  { id: 'aivene', name: 'Aivene', desc: 'Aivene Endpoints' },
                  { id: 'zai', name: 'Z.AI', desc: 'GLM Series' }
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
              {(['appearance', selectedProvider, 'faq_billing', ...(isAdminAccount ? ['reseller'] : [])] as const).map(tab => (
                <option key={tab} value={tab}>
                  {tab === 'appearance' ? (uiLanguage === 'id' ? 'ï¿½ï¿½ Tampilan & Tema' : 'ï¿½ï¿½ Appearance & Theme') : tab === 'faq_billing' ? (uiLanguage === 'id' ? 'ï¿½ï¿½ FAQ Tagihan & Langganan' : 'ï¿½ï¿½ Billing & Subscription FAQ') : tab === 'reseller' ? 'ï¿½ï¿½ Reseller Portal' : tab === 'bluesminds' ? 'Bluesminds Keys' : tab === 'aivene' ? 'Aivene Keys' : tab === 'zai' ? 'Z.AI Keys' : `${(tab as string).toUpperCase()} Keys`}
                </option>
              ))}
            </select>

            {/* Tab Content */}
            <div className="space-y-4 text-xs font-semibold overflow-y-auto pr-1 flex-1 scrollbar-thin">
              {activeSettingsTab === 'appearance' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    {uiLanguage === 'id' 
                      ? "Sesuaikan tampilan antarmuka MetaZo PRO sesuai kenyamanan visual Anda secara manual atau otomatis." 
                      : "Customize the interface appearance of MetaZo PRO to your visual comfort manually or automatically."}
                  </p>

                  <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">
                          {uiLanguage === 'id' ? "Cocokkan Tema Sistem" : "Match System Theme"}
                        </label>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight block mt-0.5">
                          {uiLanguage === 'id' 
                            ? "Gunakan preferensi tema terang/gelap dari sistem operasi perangkat Anda secara dinamis." 
                            : "Dynamically use the light/dark theme preference from your device's operating system."}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newVal = !matchSystemTheme;
                          setMatchSystemTheme(newVal);
                          if (newVal) {
                            if (typeof window !== 'undefined' && window.matchMedia) {
                              const matchesDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                              applyThemeWithTransition(matchesDark ? 'dark' : 'light', false);
                            }
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          matchSystemTheme ? 'bg-[#7c3aed]' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            matchSystemTheme ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2">
                      {uiLanguage === 'id' ? "Pilih Tema Secara Manual" : "Select Theme Manually"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetTheme('light')}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-[1.25rem] border font-bold text-xs transition-all ${
                          !matchSystemTheme && theme === 'light'
                            ? 'bg-white dark:bg-slate-950 border-[#7c3aed] text-[#7c3aed] shadow-sm'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Sun size={12} className={!matchSystemTheme && theme === 'light' ? 'text-[#7c3aed]' : 'text-slate-400'} />
                        <span>{uiLanguage === 'id' ? "Mode Terang" : "Light Mode"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTheme('dark')}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-[1.25rem] border font-bold text-xs transition-all ${
                          !matchSystemTheme && theme === 'dark'
                            ? 'bg-white dark:bg-slate-950 border-[#7c3aed] text-[#7c3aed] shadow-sm'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Moon size={12} className={!matchSystemTheme && theme === 'dark' ? 'text-[#7c3aed]' : 'text-slate-400'} />
                        <span>{uiLanguage === 'id' ? "Mode Gelap" : "Dark Mode"}</span>
                      </button>
                    </div>
                    {matchSystemTheme && (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide block mt-1 text-center">
                        {uiLanguage === 'id' 
                          ? "âš ï¸ Mengubah tema manual akan mematikan 'Cocokkan Tema Sistem'." 
                          : "âš ï¸ Selecting a manual theme will turn off 'Match System Theme'."}
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                          if (auth.currentUser) {
                            updateDoc(doc(db, 'users', auth.currentUser.uid), {
                              'settings.mz_gemini_model': val
                            }).catch(() => {});
                          }
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                    >
                      <option value="auto">{t.settings_gemini_model_auto}</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.5 Flash-Lite / 3.1 Lite (Primary Default)</option>
                      <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                      <option value="gemini-3-flash">Gemini 3 Flash</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B</option>
                      <option value="gemma-4-31b-it">Gemma 4 31B IT (Free RPD 1.5K)</option>
                    </select>
                  </div>
                  
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {uiLanguage === 'id' ? 'Status Mode API Key' : 'API Key Mode Status'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        geminiKeysList.length === 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                      }`}>
                        {geminiKeysList.length === 0
                          ? (uiLanguage === 'id' ? '🟢 KUNCI SERVER BAWAAN (BEBAS API KEY)' : '🟢 SERVER DEFAULT KEY (NO KEY NEEDED)')
                          : (uiLanguage === 'id' ? `🔑 KUNCI PRIBADI (${geminiKeysList.length} KEY POOL)` : `🔑 CUSTOM POOL (${geminiKeysList.length} KEYS)`)}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                      {geminiKeysList.length === 0
                        ? (uiLanguage === 'id'
                            ? '✨ Anda saat ini menggunakan Master Key bawaan server. Anda bisa langsung generate metadata tanpa perlu memasukkan API Key pribadi apa pun.'
                            : '✨ You are currently using the built-in server master key. You can generate metadata directly without entering any personal API key.')
                        : (uiLanguage === 'id'
                            ? '⚡ Sistem aktif menggunakan koleksi API Key pribadi Anda dengan fitur rotasi otomatis (Auto-Rotation & Multi-Account Failover).'
                            : '⚡ System is actively using your personal API key pool with automatic multi-account rotation and failover.')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key Gemini resmi gratis Anda di " : "Get your official free Gemini API Key at "}{' '}
                      <a
                        href="https://aistudio.google.com/app/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        Google AI Studio
                        <ExternalLink size={10} />
                      </a>
                      <span className="text-[9.5px] text-slate-400 ml-1.5 block sm:inline">
                        ({uiLanguage === 'id' ? '100% Gratis 1.500 gambar/hari per akun' : '100% Free 1,500 images/day per account'})
                      </span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">
                        {t.settings_gemini_key_list} ({geminiKeysList.length})
                      </label>
                      {geminiKeysList.length > 1 && (
                        <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          🔄 Auto-Rotation Active
                        </span>
                      )}
                    </div>
                    
                    {geminiKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">{t.settings_use_default_key}</p>
                        <p className="text-[9.5px] text-slate-400/80 mt-1 italic">
                          {uiLanguage === 'id' ? 'Tambahkan API Key di bawah jika ingin menggunakan kuota pribadi.' : 'Add your API key below if you prefer using personal quota.'}
                        </p>
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
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Gemini (Mendukung Multi-Akun Gratis)</label>
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

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key OpenAI Anda di " : "Get your OpenAI API Key at "}{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        OpenAI Platform
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

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

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key OpenRouter Anda di " : "Get your OpenRouter API Key at "}{' '}
                      <a
                        href="https://openrouter.ai/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        OpenRouter Console
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

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

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Kunjungi situs resmi Blackbox AI di " : "Visit the official Blackbox AI website at "}{' '}
                      <a
                        href="https://www.blackbox.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        Blackbox AI
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

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

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key NVIDIA Anda di " : "Get your NVIDIA API Key at "}{' '}
                      <a
                        href="https://build.nvidia.com/settings/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        NVIDIA NIM Platform
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key NVIDIA ({nvidiaKeysList.length})</label>
                    
                    {nvidiaKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        {serverKeysStatus.nvidia ? (
                          <>
                            <div className="flex items-center justify-center space-x-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Default Server Aktif</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] leading-relaxed">
                              Sistem mendeteksi API Key NVIDIA bawaan di server backend Anda. Anda tidak wajib menginput key di bawah kecuali jika ingin memakai key pribadi.
                            </p>
                          </>
                        ) : (
                          <>
                            <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                            <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key NVIDIA ditambahkan.</p>
                          </>
                        )}
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
                        if (auth.currentUser) {
                          updateDoc(doc(db, 'users', auth.currentUser.uid), {
                            'settings.mz_nvidia_model': val
                          }).catch(() => {});
                        }
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

              {activeSettingsTab === 'bluesminds' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Simpan API Key Bluesminds Anda untuk mengakses layanan ini.
                  </p>

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key Bluesminds Anda di " : "Get your Bluesminds API Key at "}{' '}
                      <a
                        href="https://api.bluesminds.com/console/token"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        Bluesminds Console
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Daftar Key Bluesminds</label>
                    {bluesmindsKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        {serverKeysStatus.bluesminds ? (
                          <>
                            <div className="flex items-center justify-center space-x-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Default Server Aktif</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] leading-relaxed">
                              Sistem mendeteksi API Key bawaan di server backend Anda (Aktif &amp; Siap digunakan). Anda tidak wajib menginput key di bawah kecuali jika ingin menimpa dengan key pribadi.
                            </p>
                          </>
                        ) : (
                          <>
                            <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                            <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key Bluesminds ditambahkan.</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {bluesmindsKeysList.map((key, index) => {
                          const keyId = `bluesminds-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`bluesminds-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'bluesminds';
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
                                  onClick={() => handleTestKeyAtIndex('bluesminds', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('bluesminds', index)}
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
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Bluesminds</label>
                    <div className="flex gap-2">
                       <input
                         type="password"
                         placeholder="API Key Bluesminds"
                         value={newBluesmindsKey}
                         onChange={(e) => setNewBluesmindsKey(e.target.value)}
                         className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                       />
                       <button
                         type="button"
                         onClick={() => handleAddApiKey('bluesminds')}
                         className="px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all"
                       >
                         Tambah
                       </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Model Aktif</label>
                    <select
                      disabled
                      value="gpt-4o"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-500 dark:text-slate-450 cursor-not-allowed"
                    >
                      <option value="gpt-4o">gpt-4o (Active - Default)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'aivene' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Simpan API Key Aivene Anda untuk mengakses layanan ini.
                  </p>

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key Aivene Anda di " : "Get your Aivene API Key at "}{' '}
                      <a
                        href="https://platform.aivene.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        platform.aivene.com
                      </a>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Daftar Key Aivene</label>
                    {aiveneKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        {serverKeysStatus.aivene ? (
                          <>
                            <div className="flex items-center justify-center space-x-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Default Server Aktif</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] leading-relaxed">
                              Sistem mendeteksi API Key bawaan di server backend Anda (Aktif &amp; Siap digunakan). Anda tidak wajib menginput key di bawah kecuali jika ingin menimpa dengan key pribadi.
                            </p>
                          </>
                        ) : (
                          <>
                            <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                            <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key Aivene ditambahkan.</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {aiveneKeysList.map((key, index) => {
                          const keyId = `aivene-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`aivene-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'aivene';
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
                                  onClick={() => handleTestKeyAtIndex('aivene', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('aivene', index)}
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
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Aivene</label>
                    <div className="flex gap-2">
                       <input
                         type="password"
                         placeholder="API Key Aivene"
                         value={newAiveneKey}
                         onChange={(e) => setNewAiveneKey(e.target.value)}
                         className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                       />
                       <button
                         type="button"
                         onClick={() => handleAddApiKey('aivene')}
                         className="px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all"
                       >
                         Tambah
                       </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Model Aktif</label>
                    <select
                      value={selectedAiveneModel}
                      onChange={(e) => {
                        setSelectedAiveneModel(e.target.value);
                        localStorage.setItem('mz_aivene_model', e.target.value);
                        if (auth.currentUser) {
                          updateDoc(doc(db, 'users', auth.currentUser.uid), {
                            'settings.mz_aivene_model': e.target.value
                          }).catch(() => {});
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all cursor-pointer"
                    >
                      <option value="auto">Otomatis (Paling Stabil)</option>
                      <option value="gpt-4o-mini">gpt-4o-mini (Active - Default)</option>
                      <option value="mimo-v2.5">mimo-v2.5 (Aivene Endpoint)</option>
                      <option value="gpt-5.4-nano">gpt-5.4-nano (Aivene Endpoint)</option>
                      <option value="gpt-5.4-mini">gpt-5.4-mini (Aivene Endpoint)</option>
                      <option value="gemini-3.6-flash">gemini-3.6-flash (Aivene Endpoint)</option>
                      <option value="gemini-3.5-flash">gemini-3.5-flash (Aivene Endpoint)</option>
                      <option value="gemini-3-flash">gemini-3-flash (Aivene Endpoint)</option>
                      <option value="deepseek-v4-flash">deepseek-v4-flash (Aivene Endpoint)</option>
                      <option value="gemma-4-31b-it">gemma-4-31b-it (Aivene Endpoint)</option>
                      <option value="gemma-4-26b-a4b-it">gemma-4-26b-a4b-it (Aivene Endpoint)</option>
                      <option value="qwen3.5-flash">qwen3.5-flash (Aivene Endpoint)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'zai' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Simpan API Key Z.AI Anda untuk mengakses GLM Series (OpenAI-compatible).
                  </p>

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key Z.AI Anda di " : "Get your Z.AI API Key at "}{' '}
                      <a
                        href="https://z.ai/manage-apikey/apikey-list"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        Z.AI Console
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block">Daftar API Key Z.AI ({zaiKeysList.length})</label>
                    
                    {zaiKeysList.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <Key className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={20} />
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">Belum ada API Key Z.AI ditambahkan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1 select-none">
                        {zaiKeysList.map((key, index) => {
                          const keyId = `zai-key-${index}-${key.substring(0, 10)}`;
                          const testResult = keyTestResults[`zai-${index}`];
                          const isTesting = keyTestingIndex === index && keyTestProvider === 'zai';
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
                                  onClick={() => handleTestKeyAtIndex('zai', index, key)}
                                  disabled={keyTestingIndex !== null}
                                  className="px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors"
                                >
                                  {isTesting ? <Loader2 size={10} className="animate-spin text-slate-500" /> : 'Uji'}
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApiKey('zai', index)}
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
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Tambah Key Z.AI</label>
                    <div className="flex gap-2">
                       <input
                         type="password"
                         placeholder="API Key Z.AI"
                         value={newZaiKey}
                         onChange={(e) => setNewZaiKey(e.target.value)}
                         className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                       />
                       <button
                         type="button"
                         onClick={() => handleAddApiKey('zai')}
                         className="px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all"
                       >
                         Tambah
                       </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">Model Aktif</label>
                    <select
                      value={selectedZaiModel}
                      onChange={(e) => {
                        setSelectedZaiModel(e.target.value);
                        localStorage.setItem('mz_zai_model', e.target.value);
                        if (auth.currentUser) {
                          updateDoc(doc(db, 'users', auth.currentUser.uid), {
                            'settings.mz_zai_model': e.target.value
                          }).catch(() => {});
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all cursor-pointer"
                    >
                      <option value="glm-5.2">GLM-5.2 (Flagship, 1M context)</option>
                      <option value="glm-5.1">GLM-5.1</option>
                      <option value="glm-5-turbo">GLM-5 Turbo</option>
                      <option value="glm-5">GLM-5</option>
                      <option value="glm-4.7">GLM-4.7</option>
                      <option value="glm-4.7-flash">GLM-4.7 Flash</option>
                      <option value="glm-4.7-flashx">GLM-4.7 FlashX</option>
                      <option value="glm-4.6">GLM-4.6</option>
                      <option value="glm-4.5">GLM-4.5</option>
                      <option value="glm-4.5-air">GLM-4.5 Air</option>
                      <option value="glm-4.5-flash">GLM-4.5 Flash</option>
                      <option value="glm-4-32b-0414-128k">GLM-4 32B (128K)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'groq' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    Masukkan API Key Groq Anda. Gunakan model tercepat untuk pemrosesan metadata.
                  </p>

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key Groq Anda di " : "Get your Groq API Key at "}{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        Groq Console
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2">Pilih Model Groq</label>
                    <select
                      value={selectedGroqModel}
                      onChange={(e) => {
                          const val = e.target.value as any;
                          setSelectedGroqModel(val);
                          localStorage.setItem('mz_groq_model', val);
                          if (auth.currentUser) {
                            updateDoc(doc(db, 'users', auth.currentUser.uid), {
                              'settings.mz_groq_model': val
                            }).catch(() => {});
                          }
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

                  <div className="flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20">
                    <HelpCircle size={14} className="text-[#7c3aed] shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {uiLanguage === 'id' ? "Dapatkan API Key Mistral Anda di " : "Get your Mistral API Key at "}{' '}
                      <a
                        href="https://console.mistral.ai/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black"
                      >
                        Mistral Console
                        <ExternalLink size={10} />
                      </a>
                    </span>
                  </div>

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
                  pricingTier={autoPricingTier}
                  setPricingTier={setMzPriceText}
                  licenseSeed={mzLicenseSeed}
                  setLicenseSeed={setMzLicenseSeed}
                  licenseKey={mzLicenseKey}
                  setLicenseKey={setMzLicenseKey}
                  isLicensed={isMzLicensed}
                  showActivation={showActivationModal}
                  setShowActivation={setShowActivationModal}
                  userEmail={user?.email || ""}
                  userId={user?.uid}
                  isResellerUnlocked={isResellerUnlocked}
                  setIsResellerUnlocked={setIsResellerUnlocked}
                  trialDaysLeft={trialDaysLeft}
                  subDaysLeft={subDaysLeft}
                  t={t}
                />
              )}

              {activeSettingsTab === 'faq_billing' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed">
                    {uiLanguage === 'id' 
                      ? "Pelajari transisi dari masa uji coba gratis (Free Trial) ke status berbayar penuh (PRO) dengan lancar." 
                      : "Understand how your Free Trial account transitions seamlessly to a paid PRO subscription."}
                  </p>
                  <FAQAccordion language={uiLanguage} />
                </div>
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
                type="button"
                onClick={() => {
                  handleSaveKey();
                  setShowSettingsModal(false);
                }}
                className="flex-1 py-1.5 bg-[#7c3aed] hover:bg-violet-600 text-white font-bold rounded-[1.5rem] text-xs uppercase shadow transition-colors"
              >
                Simpan & Pasang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- LOGIN PROMO MODAL OVERLAY ----------------- */}
      {showPromoWindow && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowPromoWindow(false)}>
          <div 
            className="bg-white dark:bg-[#0f172a] rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-white/10 flex flex-col relative animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button 
              onClick={() => setShowPromoWindow(false)} 
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-full transition-colors cursor-pointer z-10"
              aria-label="Close Promo"
            >
              <X size={16} />
            </button>

            {/* Header with Visual Glow */}
            <div className="p-6 sm:p-8 bg-gradient-to-br from-violet-600 via-indigo-700 to-red-600 text-white relative">
              <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none scale-150">
                <Gift size={160} />
              </div>
              
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-[9px] font-black uppercase tracking-widest mb-3 animate-bounce">
                <Sparkles size={11} className="text-amber-300 animate-pulse" />
                <span>{uiLanguage === 'id' ? "PENAWARAN TERBATAS" : "LIMITED OFFER FOR YOU"}</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-none mb-2">
                {uiLanguage === 'id' ? "Akun Anda: Free Trial" : "Your Account: Free Trial"}
              </h2>
              <p className="text-xs text-slate-100 font-medium leading-relaxed">
                {uiLanguage === 'id' 
                  ? "Dapatkan potongan harga khusus & aktifkan fitur premium penuh untuk mendominasi pasar microstock!"
                  : "Grab direct discount coupons below & activate high-speed pipelines today!"}
              </p>
            </div>

            {/* Promo Codes & Features */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto max-h-[400px]">
              {/* Highlight Perks */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {uiLanguage === 'id' ? "Kenapa Harus Upgrade ke PRO?" : "Why Upgrade to PRO?"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start space-x-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {uiLanguage === 'id' ? "Tanpa Batasan" : "Unlimited Pipeline"}
                      </p>
                      <p className="text-[9px] text-slate-500 line-clamp-1">
                        {uiLanguage === 'id' ? "Batch generator tanpa limit harian" : "Process bulk images without limits"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {uiLanguage === 'id' ? "Metadata Presisi" : "Perfect Microstock SEO"}
                      </p>
                      <p className="text-[9px] text-slate-500 line-clamp-1">
                        {uiLanguage === 'id' ? "Keyword teroptimasi standar industri" : "Rank higher on Adobe Stock & Freepik"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {uiLanguage === 'id' ? "Voucher Diskon Siap Pakai" : "Ready-to-Use Coupon Codes"}
                  </span>
                  <span className="text-[9px] bg-red-100 dark:bg-red-950 text-red-655 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded-lg">
                    {uiLanguage === 'id' ? "Diskon s/d 50%" : "Save up to 50%"}
                  </span>
                </div>

                <div className="space-y-2">
                  {promoCodesForModal.length === 0 ? (
                    // Fallback promo code if firebase collection is empty
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-violet-500/10 to-red-500/10 border border-violet-200/50 dark:border-violet-500/20 rounded-2xl transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-[#7c3aed]/10 rounded-xl text-[#7c3aed]">
                          <Tag size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#7c3aed] dark:text-violet-400 tracking-wider uppercase">MZPROMO2026</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            {uiLanguage === 'id' ? "Potongan 50% untuk Langganan Pertama" : "50% Discount on First Purchase"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText("MZPROMO2026");
                            setCopiedCodeInModal("MZPROMO2026");
                            setTimeout(() => setCopiedCodeInModal(null), 2000);
                          } catch (err) {}
                        }}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center space-x-1 ${copiedCodeInModal === "MZPROMO2026" ? "bg-emerald-600 text-white cursor-default" : "bg-[#7c3aed] hover:bg-violet-600 text-white shadow-sm cursor-pointer"}`}
                      >
                        {copiedCodeInModal === "MZPROMO2026" ? (
                          <>
                            <Check size={12} />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    promoCodesForModal.map((p) => (
                      <div 
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-500/30 rounded-2xl transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-violet-100 dark:bg-violet-550/15 rounded-xl text-violet-650 dark:text-violet-405 shrink-0">
                            <Tag size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-black text-[#7c3aed] dark:text-violet-400 tracking-wider uppercase truncate">
                                {p.code}
                              </span>
                              {p.endDate && (
                                <span className="text-[7.5px] bg-red-100 dark:bg-red-950/60 text-red-750 dark:text-red-400 font-extrabold px-1 py-0.2 rounded shrink-0">
                                  Berakhir {p.endDate}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block truncate">
                              {p.description || (p.type === 'free_premium' ? `${p.value} Hari Premium` : `Diskon ${p.value}%`)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(p.code);
                              setCopiedCodeInModal(p.code);
                              setTimeout(() => setCopiedCodeInModal(null), 2000);
                            } catch (err) {}
                          }}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center space-x-1 shrink-0 ${copiedCodeInModal === p.code ? "bg-emerald-600 text-white cursor-default" : "bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white dark:bg-violet-500/20 dark:text-violet-350 cursor-pointer"}`}
                        >
                          {copiedCodeInModal === p.code ? (
                            <>
                              <Check size={12} />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Panel */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setShowPromoWindow(false);
                  setShowActivationModal(true);
                }}
                className="w-full py-4 bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-violet-600 hover:to-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-2"
              >
                <Key size={14} />
                <span>{uiLanguage === 'id' ? "Gunakan Voucher / Lisensi Sekarang" : "Redeem License Key / Voucher"}</span>
              </button>
              
              <button
                onClick={() => setShowPromoWindow(false)}
                className="w-full py-2.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase rounded-xl transition-all text-center cursor-pointer"
              >
                {uiLanguage === 'id' ? "Selesaikan Uji Coba (Lanjut)" : "Continue Free Trial"}
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
        pricingTier={autoPricingTier}
        setPricingTier={setMzPriceText}
        licenseSeed={mzLicenseSeed}
        setLicenseSeed={setMzLicenseSeed}
        licenseKey={mzLicenseKey}
        setLicenseKey={setMzLicenseKey}
        isLicensed={isMzLicensed}
        showActivation={showActivationModal}
        setShowActivation={setShowActivationModal}
        userEmail={user?.email || ""}
        userId={user?.uid}
        onlyModal={true}
        trialDaysLeft={trialDaysLeft}
        subDaysLeft={subDaysLeft}
        t={t}
      />

      {/* Hidden Custom Secure Reseller Passcode Dialog Overlay Removed */}

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
                Limit harian telah habis. Anda telah memproses <span className="text-slate-800 dark:text-white font-black">{getDailyLimit()} aset</span> hari ini. 
                Sila kembali besok atau aktifkan akun PRO untuk memproses tanpa batas.
              </p>
            </div>

            <div className="w-full space-y-2.5">
              <button
                onClick={() => {
                  setShowLimitModal(false);
                  setShowActivationModal(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-violet-600 hover:to-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Zap size={14} className="animate-pulse text-amber-300" />
                <span>Berlangganan PRO (Subscribe)</span>
              </button>

              <button
                onClick={() => window.open('https://teer.id/johan3008', '_blank')}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Heart size={13} className="text-rose-500 fill-rose-500" />
                <span>Dukung Kami (Donate)</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowLimitModal(false)}
              className="mt-3 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
            >
              Mungkin Nanti
            </button>
          </div>
        </div>
      )}
      
      {/* Return to Start Countdown float message */}
      {returnToStartCountdown !== null && (
        <div className="fixed bottom-6 left-6 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-950/98 text-white backdrop-blur border border-white/10 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 max-w-sm" style={{ boxShadow: '0 20px 50px -12px rgba(124, 58, 237, 0.3)' }}>
            <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center font-black text-sm text-white animate-pulse shrink-0">
              {returnToStartCountdown}
            </div>
            <div className="flex-1 text-left">
              <p className="font-extrabold tracking-widest uppercase text-[9px] text-[#7c3aed] dark:text-violet-400">PROSES SELESAI!</p>
              <p className="text-slate-300 text-xs font-bold leading-normal mt-0.5">
                {uiLanguage === 'id' 
                  ? `Kembali ke awal dalam ${returnToStartCountdown} detik...` 
                  : `Returning to start in ${returnToStartCountdown} seconds...`}
              </p>
            </div>
            <button
              onClick={() => setReturnToStartCountdown(null)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/5 font-black text-[9px] uppercase rounded-xl transition-all cursor-pointer select-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <AboutModal 
        isOpen={showAboutModal} 
        onClose={() => setShowAboutModal(false)} 
        theme={theme} 
        t={t} 
      />

      {/* In-App Automatic Play Store Review & Rating Dialog */}
      <AutoReviewPromptModal 
        user={user} 
        isLicensed={isLicensed} 
        successfulFilesCount={successfulFilesCount} 
        appName={appName} 
      />
      
      </div>
    </div>
  );
};

export default App;
