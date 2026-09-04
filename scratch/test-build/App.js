import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun,
  Moon,
  HelpCircle,
  X,
  Zap,
  Clock,
  Info,
  FileCode,
  Film,
  ImageIcon,
  Sparkles,
  Copy,
  Check,
  RefreshCcw,
  Trash2,
  CheckCircle2,
  Heart,
  Settings,
  Loader2,
  Plus,
  Key,
  Gift,
  Tag,
  ExternalLink,
  Video,
  UploadCloud
} from "lucide-react";
import { ToolType, GenerationMode, toolToPath } from "./types";
import { Sidebar } from "./src/components/Sidebar";
import { Topbar } from "./src/components/Topbar";
import { MetricsRow } from "./src/components/MetricsRow";
import { UploadPanel } from "./src/components/UploadPanel";
import { AiConfigPanel } from "./src/components/AiConfigPanel";
import { ExportPanel } from "./src/components/ExportPanel";
import { BackupManagerPanel } from "./src/components/BackupManagerPanel";
import { FeatureGuideButton } from "./src/components/FeatureGuideModal";
import { ReviewQueue } from "./src/components/ReviewQueue";
import { DashboardView } from "./src/components/DashboardView";
import { PromptGenView } from "./src/components/PromptGenView";
import { PromptImageView } from "./src/components/PromptImageView";
import { PromptVideoView } from "./src/components/PromptVideoView";
import { ImageCheckView } from "./src/components/ImageCheckView";
import { VideoQualityCheck } from "./src/components/VideoQualityCheck";
import { CalendarGenView } from "./src/components/CalendarGenView";
import { MuteVideoView } from "./src/components/MuteVideoView";
import { BgRemoverView } from "./src/components/BgRemoverView";
import { MotionGenView } from "./src/components/MotionGenView";
import { AntiSpamView } from "./src/components/AntiSpamView";
import { ReviewsView } from "./src/components/ReviewsView";
import { FtpUploaderView } from "./src/components/FtpUploaderView";
import { AutoReviewPromptModal } from "./src/components/AutoReviewPromptModal";
import { SaaSPortal } from "./src/components/SaaSPortal";
import { FAQAccordion } from "./src/components/FAQAccordion";
import { TRANSLATIONS, getDailyLimit } from "./constants";
import { generateStockMetadata, generateBatchStockMetadata } from "./services/geminiService";
import { copyToClipboard } from "./src/utils";
import piexif from "piexifjs";
import { toBlobURL } from "@ffmpeg/util";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  db,
  auth,
  handleFirestoreError,
  OperationType,
  onAuthStateChanged,
  signOut,
  deleteField
} from "./src/supabase";
import { LoginScreen } from "./src/components/LoginScreen";
import { Meteors } from "./src/components/Meteors";
import { AboutModal } from "./src/components/AboutModal";
const DB_NAME = "EPS_Batch_DB";
const STORE_NAME = "app_state_store";
const inMemoryFallback = {};
const initDB = () => {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined" || !indexedDB) {
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
const saveStateToDB = async (state) => {
  try {
    const db2 = await initDB();
    if (!db2) {
      inMemoryFallback["current_batch"] = state;
      try {
        localStorage.setItem("current_batch_backup", JSON.stringify(state));
      } catch (e) {
      }
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db2.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(state, "current_batch");
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          inMemoryFallback["current_batch"] = state;
          resolve();
        };
      } catch (e) {
        inMemoryFallback["current_batch"] = state;
        resolve();
      }
    });
  } catch (err) {
    inMemoryFallback["current_batch"] = state;
  }
};
const loadStateFromDB = async () => {
  try {
    const db2 = await initDB();
    if (!db2) {
      if (inMemoryFallback["current_batch"]) return inMemoryFallback["current_batch"];
      try {
        const backup = localStorage.getItem("current_batch_backup");
        if (backup) return JSON.parse(backup);
      } catch (e) {
      }
      return null;
    }
    return new Promise((resolve) => {
      try {
        const tx = db2.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get("current_batch");
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            if (inMemoryFallback["current_batch"]) {
              resolve(inMemoryFallback["current_batch"]);
            } else {
              try {
                const backup = localStorage.getItem("current_batch_backup");
                resolve(backup ? JSON.parse(backup) : null);
              } catch (e) {
                resolve(null);
              }
            }
          }
        };
        request.onerror = () => {
          try {
            const backup = localStorage.getItem("current_batch_backup");
            resolve(backup ? JSON.parse(backup) : inMemoryFallback["current_batch"] || null);
          } catch (e) {
            resolve(inMemoryFallback["current_batch"] || null);
          }
        };
      } catch (e) {
        try {
          const backup = localStorage.getItem("current_batch_backup");
          resolve(backup ? JSON.parse(backup) : inMemoryFallback["current_batch"] || null);
        } catch (err) {
          resolve(inMemoryFallback["current_batch"] || null);
        }
      }
    });
  } catch (err) {
    return inMemoryFallback["current_batch"] || null;
  }
};
const clearStateFromDB = async () => {
  try {
    delete inMemoryFallback["current_batch"];
    try {
      localStorage.removeItem("current_batch_backup");
    } catch (e) {
    }
    const db2 = await initDB();
    if (!db2) return;
    return new Promise((resolve) => {
      try {
        const tx = db2.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete("current_batch");
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  } catch (err) {
  }
};
const backgroundSafeTimeout = (ms) => {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([`setTimeout(() => postMessage('tick'), ${ms});`], { type: "application/javascript" });
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
const SILENT_WAV_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAwADAA==";
let keepAliveAudioEl = null;
let keepAliveAudioCtx = null;
let keepAliveOscillator = null;
let keepAliveVideoEl = null;
let keepAliveCanvas = null;
const startTabKeepAlive = () => {
  try {
    if (!keepAliveCanvas) {
      keepAliveCanvas = document.createElement("canvas");
      keepAliveCanvas.width = 1;
      keepAliveCanvas.height = 1;
      const ctx = keepAliveCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 1, 1);
      }
    }
    const canvasStream = keepAliveCanvas.captureStream(1);
    if (!keepAliveAudioCtx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          keepAliveAudioCtx = new AudioCtx();
        } catch (e) {
          console.warn("AudioContext init failed", e);
        }
      }
    }
    if (keepAliveAudioCtx.state === "suspended") {
      keepAliveAudioCtx.resume();
    }
    if (!keepAliveOscillator) {
      keepAliveOscillator = keepAliveAudioCtx.createOscillator();
      const gainNode = keepAliveAudioCtx.createGain();
      gainNode.gain.value = 0;
      const dest = keepAliveAudioCtx.createMediaStreamDestination();
      keepAliveOscillator.connect(gainNode);
      gainNode.connect(dest);
      gainNode.connect(keepAliveAudioCtx.destination);
      keepAliveOscillator.start();
      if (dest.stream.getAudioTracks().length > 0 && canvasStream.getVideoTracks().length > 0) {
        canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
      }
    }
    if (!keepAliveVideoEl) {
      keepAliveVideoEl = document.createElement("video");
      keepAliveVideoEl.setAttribute("playsinline", "");
      keepAliveVideoEl.setAttribute("muted", "");
      keepAliveVideoEl.setAttribute("loop", "");
      keepAliveVideoEl.style.display = "none";
      document.body.appendChild(keepAliveVideoEl);
    }
    keepAliveVideoEl.srcObject = canvasStream;
    keepAliveVideoEl.play().then(() => {
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
        keepAliveVideoEl?.requestPictureInPicture().catch(() => {
        });
      }
    }).catch(() => {
    });
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").catch(() => {
      });
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
        document.exitPictureInPicture().catch(() => {
        });
      }
    }
    if (keepAliveOscillator) {
      keepAliveOscillator.stop();
      keepAliveOscillator.disconnect();
      keepAliveOscillator = null;
    }
    if (keepAliveAudioCtx && keepAliveAudioCtx.state === "running") {
      keepAliveAudioCtx.suspend();
    }
  } catch (e) {
    console.error("Stop keep-alive failed", e);
  }
};
const extractEPSClientSide = async (file) => {
  try {
    return new Promise((resolve) => {
      const worker = new Worker(new URL("./src/workers/epsWorker.ts", import.meta.url), { type: "module" });
      const timeoutId = setTimeout(() => {
        worker.terminate();
        console.warn("EPS Worker timed out");
        resolve(null);
      }, document.hidden ? 12e4 : 15e3);
      worker.onmessage = (e) => {
        clearTimeout(timeoutId);
        if (e.data.success) {
          const objectUrl = URL.createObjectURL(e.data.blob);
          resolve(objectUrl);
        } else {
          console.warn("Worker failed to extract EPS preview:", e.data.error);
          resolve(null);
        }
        worker.terminate();
      };
      worker.onerror = (err) => {
        clearTimeout(timeoutId);
        console.warn("EPS Worker error:", err);
        worker.terminate();
        resolve(null);
      };
      worker.postMessage({ file });
    });
  } catch (e) {
    console.error("Client-side EPS extraction failed", e);
    return null;
  }
};
const CardBase = ({ children, className = "", themeColor }) => {
  let topIndicatorClass = "from-transparent via-blue-500/20 to-transparent";
  if (themeColor === "purple") topIndicatorClass = "from-transparent via-purple-500/20 to-transparent";
  if (themeColor === "emerald") topIndicatorClass = "from-transparent via-emerald-500/20 to-transparent";
  return /* @__PURE__ */ jsxs("div", { className: `bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl rounded-[2.25rem] border border-slate-200/80 dark:border-white/5 p-8 shadow-xl flex flex-col transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 relative overflow-hidden group ${className}`, children: [
    /* @__PURE__ */ jsx("div", { className: `absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${topIndicatorClass} opacity-0 group-hover:opacity-100 transition-opacity duration-700` }),
    children
  ] });
};
const CopyBox = ({ label, value, onChange, isTextArea = false, themeColor = "blue", showLengthRating = false }) => {
  const [copied, setCopied] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");
  useEffect(() => {
    setLocalValue(value || "");
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
      setTimeout(() => setCopied(false), 2e3);
    }
  };
  const focusRingClass = themeColor === "purple" ? "focus:ring-purple-500/10 focus:border-purple-500/80 dark:focus:border-purple-400/80" : themeColor === "emerald" ? "focus:ring-emerald-500/10 focus:border-emerald-500/80 dark:focus:border-emerald-400/80" : "focus:ring-violet-500/10 focus:border-violet-500/80 dark:focus:border-blue-400/80";
  const count = localValue ? localValue.length : 0;
  let ratingColor = "bg-slate-300 dark:bg-slate-700";
  let ratingText = "";
  let ratingTextColor = "text-slate-400 dark:text-slate-500";
  let percentage = Math.min(100, count / 200 * 100);
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
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 group/box relative", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center px-1", children: [
      /* @__PURE__ */ jsx("label", { className: "text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em]", children: label }),
      /* @__PURE__ */ jsx("button", { onClick: handleCopy, className: "p-2 sm:p-1.5 rounded-[1.5rem] bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-500/12 hover:text-violet-500 dark:hover:text-violet-400 transition-all text-slate-400 dark:text-slate-300 hover:scale-105 active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center", children: copied ? /* @__PURE__ */ jsx(Check, { size: 12, className: "text-emerald-500" }) : /* @__PURE__ */ jsx(Copy, { size: 12 }) })
    ] }),
    isTextArea ? /* @__PURE__ */ jsx(
      "textarea",
      {
        className: `w-full p-4 bg-white/50 dark:bg-slate-900/40 border border-slate-300/50 dark:border-white/10 rounded-2xl text-[12px] leading-relaxed outline-none focus:ring-4 ${focusRingClass} focus:border-blue-400 dark:focus:border-blue-700/50 transition-all min-h-[90px] resize-none font-medium text-slate-700 dark:text-slate-200 shadow-inner`,
        value: localValue,
        onChange: (e) => setLocalValue(e.target.value),
        onBlur: handleBlur
      }
    ) : /* @__PURE__ */ jsx(
      "input",
      {
        type: "text",
        className: `w-full p-4 bg-white/50 dark:bg-slate-900/40 border border-slate-300/50 dark:border-white/10 rounded-2xl text-[12px] outline-none focus:ring-4 ${focusRingClass} focus:border-blue-400 dark:focus:border-blue-700/50 transition-all font-semibold text-slate-700 dark:text-slate-200 shadow-inner`,
        value: localValue,
        onChange: (e) => setLocalValue(e.target.value),
        onBlur: handleBlur
      }
    ),
    showLengthRating && localValue && /* @__PURE__ */ jsxs("div", { className: "mt-1 px-1 space-y-1 animate-in fade-in duration-300", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[9px] font-bold uppercase tracking-wider", children: [
        /* @__PURE__ */ jsx("span", { className: ratingTextColor, children: ratingText }),
        /* @__PURE__ */ jsxs("span", { className: "font-mono text-slate-500 dark:text-slate-400", children: [
          count,
          " / 200 chars"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: `h-full ${ratingColor} transition-all duration-300`, style: { width: `${percentage}%` } }) })
    ] })
  ] });
};
const KeywordList = ({ keywords, onChange, label, themeColor = "blue" }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const seen = /* @__PURE__ */ new Set();
    const uniqueKeywords = keywords.filter((k) => {
      const normalized = k.toLowerCase().trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
    if (uniqueKeywords.length !== keywords.length) {
      onChange(uniqueKeywords);
    }
  }, [keywords, onChange]);
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };
  const handleDragOver = (e, index) => {
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
    const success = await copyToClipboard(keywords.join(", "));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    }
  };
  const handleRemove = (index) => {
    const newKeywords = [...keywords];
    newKeywords.splice(index, 1);
    onChange(newKeywords);
  };
  const handleAdd = (e) => {
    if (e.key === "Enter" && e.currentTarget.value.trim()) {
      const newKeywords = [...keywords, ...e.currentTarget.value.split(",").map((k) => k.trim()).filter((k) => k)];
      onChange(newKeywords);
      e.currentTarget.value = "";
    }
  };
  const focusRingClass = themeColor === "purple" ? "focus-within:ring-purple-500/10 focus-within:border-purple-500/80 dark:focus-within:border-purple-400/80" : themeColor === "emerald" ? "focus-within:ring-emerald-500/10 focus-within:border-emerald-500/80 dark:focus-within:border-emerald-400/80" : "focus-within:ring-violet-500/10 focus-within:border-violet-500/80 dark:focus-within:border-blue-400/80";
  let borderActiveAccent = themeColor === "purple" ? "hover:border-purple-500/60" : themeColor === "emerald" ? "hover:border-emerald-500/60" : "hover:border-violet-500/60";
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
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 group/box relative", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center px-1", children: [
      /* @__PURE__ */ jsxs("label", { className: "text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em]", children: [
        label,
        " (",
        keywords.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: handleCopy, className: "p-2 sm:p-1.5 rounded-[1.5rem] bg-slate-100/80 dark:bg-slate-800/80 hover:bg-violet-500/12 hover:text-violet-500 dark:hover:text-violet-400 transition-all text-slate-400 dark:text-slate-300 hover:scale-105 active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center", children: copied ? /* @__PURE__ */ jsx(Check, { size: 12, className: "text-emerald-500" }) : /* @__PURE__ */ jsx(Copy, { size: 12 }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: `w-full p-4 bg-slate-50/60 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 rounded-2xl min-h-[90px] flex flex-wrap gap-2 items-start focus-within:ring-4 ${focusRingClass} transition-all`, children: [
      keywords.map((keyword, index) => /* @__PURE__ */ jsxs(
        "div",
        {
          draggable: true,
          onDragStart: (e) => handleDragStart(e, index),
          onDragOver: (e) => handleDragOver(e, index),
          onDragEnd: handleDragEnd,
          className: `flex items-center space-x-1 px-3 py-1 bg-white/95 dark:bg-slate-800/90 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-grab active:cursor-grabbing transition-all ${draggedIndex === index ? "opacity-50 scale-95 shadow-lg" : `hover:shadow-md hover:bg-violet-50/10 dark:hover:bg-slate-800 ${borderActiveAccent}`}`,
          children: [
            /* @__PURE__ */ jsx("span", { children: keyword }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => handleRemove(index),
                className: "text-slate-400/80 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1 focus:outline-none",
                children: /* @__PURE__ */ jsx(X, { size: 12 })
              }
            )
          ]
        },
        `${keyword}-${index}`
      )),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          placeholder: "Add keyword (press Enter)...",
          onKeyDown: handleAdd,
          className: "flex-grow min-w-[140px] bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400/80 py-1 font-medium"
        }
      )
    ] }),
    count > 0 && /* @__PURE__ */ jsxs("div", { className: `mt-1.5 px-3 py-1.5 rounded-[1.5rem] border text-[9px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${ratingBg}`, children: [
      /* @__PURE__ */ jsx("span", { className: ratingTextColor, children: ratingText }),
      /* @__PURE__ */ jsxs("span", { className: `font-mono px-1.5 py-0.5 rounded-xl ${count > 49 ? "bg-red-500 text-white" : count >= 25 && count <= 45 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100/50 dark:bg-white/5 text-slate-500 dark:text-slate-400"}`, children: [
        count,
        " / 49 tags"
      ] })
    ] })
  ] });
};
const FileNameInputRefined = ({ initialName, onNameChange }) => {
  const [localName, setLocalName] = React.useState(initialName);
  React.useEffect(() => {
    setLocalName(initialName);
  }, [initialName]);
  const handleBlur = () => {
    if (localName !== initialName) {
      onNameChange(localName);
    }
  };
  return /* @__PURE__ */ jsx(
    "input",
    {
      type: "text",
      value: localName,
      onChange: (e) => setLocalName(e.target.value),
      onBlur: handleBlur,
      className: "bg-transparent border-b border-transparent hover:border-slate-500 focus:border-white outline-none w-full truncate cursor-text transition-colors pb-0 text-center",
      title: "Edit Filename"
    }
  );
};
const FilePreview = ({ fileItem, onClose, setFiles, setPreviewFile }) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(fileItem.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [fileItem]);
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { className: "relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: onClose,
        className: "absolute -top-12 right-0 p-2 text-white hover:text-violet-400 transition-colors bg-black/50 rounded-full",
        children: /* @__PURE__ */ jsx(X, { size: 24 })
      }
    ),
    fileItem.file.type.startsWith("video/") ? /* @__PURE__ */ jsx(
      "video",
      {
        src: url || void 0,
        controls: true,
        autoPlay: true,
        className: "max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
      }
    ) : fileItem.file.type.startsWith("image/") ? /* @__PURE__ */ jsx(
      "img",
      {
        src: url || void 0,
        alt: "Preview",
        className: "max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
      }
    ) : /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md h-64 bg-slate-800 rounded-2xl flex flex-col items-center justify-center text-white shadow-2xl", children: [
      /* @__PURE__ */ jsx(FileCode, { size: 64, className: "mb-4 text-slate-400" }),
      /* @__PURE__ */ jsx("p", { className: "font-bold text-center px-4 truncate w-full", children: fileItem.customFileName || fileItem.file.name }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-400 mt-2", children: "Preview not available" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-4 text-white font-bold tracking-wide text-sm bg-black/80 px-4 py-2 rounded-full flex items-center max-w-[90%]", children: /* @__PURE__ */ jsx(
      FileNameInputRefined,
      {
        initialName: fileItem.customFileName ?? fileItem.file.name,
        onNameChange: (newName) => {
          setFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, customFileName: newName } : f));
          setPreviewFile((prev) => prev ? { ...prev, customFileName: newName } : null);
        }
      }
    ) })
  ] }) });
};
let sharedVideoWorker = null;
let videoWorkerJobId = 0;
let workerQueue = [];
let isWorkerBusy = false;
const acquireWorker = () => {
  return new Promise((resolve) => {
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
let cachedFfmpegCoreUrl = "";
let cachedFfmpegWasmUrl = "";
const getFfmpegUrls = async () => {
  if (cachedFfmpegCoreUrl && cachedFfmpegWasmUrl) {
    return { coreURL: cachedFfmpegCoreUrl, wasmURL: cachedFfmpegWasmUrl };
  }
  try {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    cachedFfmpegCoreUrl = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
    cachedFfmpegWasmUrl = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");
    return { coreURL: cachedFfmpegCoreUrl, wasmURL: cachedFfmpegWasmUrl };
  } catch (e) {
    console.warn("Failed to pre-fetch FFmpeg URLs", e);
    return null;
  }
};
const extractVideoWithWorker = async (file) => {
  await acquireWorker();
  return new Promise(async (resolve, reject) => {
    if (!sharedVideoWorker) {
      sharedVideoWorker = new Worker(new URL("./src/workers/videoWorker.ts", import.meta.url), { type: "module" });
      const urls = await getFfmpegUrls();
      sharedVideoWorker.postMessage({ type: "init", urls });
      workerUseCount = 0;
    }
    const currentId = ++videoWorkerJobId;
    let timeoutId = setTimeout(() => {
      if (sharedVideoWorker) {
        sharedVideoWorker.terminate();
        sharedVideoWorker = null;
      }
      releaseWorker();
      reject(new Error("Video Worker timed out (Initial)"));
    }, 3e5);
    const messageHandler = (e) => {
      if (e.data.id !== currentId) return;
      if (e.data.type === "progress") {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (sharedVideoWorker) {
            sharedVideoWorker.terminate();
            sharedVideoWorker = null;
          }
          releaseWorker();
          reject(new Error("Video Worker timed out (No progress)"));
        }, 3e5);
        return;
      }
      sharedVideoWorker?.removeEventListener("message", messageHandler);
      sharedVideoWorker?.removeEventListener("error", errorHandler);
      clearTimeout(timeoutId);
      if (e.data.success) {
        const frameUrls = e.data.framesBlobs.map((blob) => URL.createObjectURL(blob));
        workerUseCount++;
        if (workerUseCount >= MAX_WORKER_USES) {
          sharedVideoWorker?.terminate();
          sharedVideoWorker = null;
          workerUseCount = 0;
        }
        releaseWorker();
        resolve(frameUrls);
      } else {
        if (sharedVideoWorker) {
          sharedVideoWorker.terminate();
          sharedVideoWorker = null;
          workerUseCount = 0;
        }
        releaseWorker();
        reject(new Error(e.data.error || "Worker failed to extract video frames"));
      }
    };
    const errorHandler = (err) => {
      clearTimeout(timeoutId);
      sharedVideoWorker?.removeEventListener("message", messageHandler);
      sharedVideoWorker?.removeEventListener("error", errorHandler);
      sharedVideoWorker?.terminate();
      sharedVideoWorker = null;
      workerUseCount = 0;
      releaseWorker();
      reject(new Error(`Worker crashed: ${err.message || "Unknown error"}`));
    };
    sharedVideoWorker.addEventListener("message", messageHandler);
    sharedVideoWorker.addEventListener("error", errorHandler);
    sharedVideoWorker.postMessage({ file, id: currentId });
  });
};
const extractVideoNative = async (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = "auto";
    video.style.position = "fixed";
    video.style.top = "-9999px";
    video.style.opacity = "0";
    document.body.appendChild(video);
    let audioCtx = null;
    let audioSource = null;
    let gainNode = null;
    let oscillator = null;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioSource = audioCtx.createMediaElementSource(video);
      oscillator = audioCtx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 440;
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      audioSource.connect(gainNode);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {
        });
      }
    } catch (e) {
      console.warn("AudioContext trick failed", e);
    }
    let isResolved = false;
    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      if (oscillator) {
        try {
          oscillator.stop();
        } catch (e) {
        }
        oscillator.disconnect();
      }
      if (audioSource) audioSource.disconnect();
      if (gainNode) gainNode.disconnect();
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {
        });
      }
    };
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        reject(new Error("Native video extraction timed out"));
      }
    }, document.hidden ? 12e4 : 15e3);
    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!duration || duration === Infinity) throw new Error("Invalid duration");
        const frameWidth = 320;
        const frameHeight = Math.floor(frameWidth * (video.videoHeight / video.videoWidth));
        const seekTimes = [
          duration * 0.1,
          // Start (10%)
          duration * 0.5,
          // Middle (50%)
          duration * 0.9
          // End (90%)
        ];
        const extractedFrames = [];
        for (let i = 0; i < seekTimes.length; i++) {
          const time = seekTimes[i];
          video.currentTime = time;
          await new Promise((res, rej) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              res();
            };
            video.addEventListener("seeked", onSeeked);
            setTimeout(() => {
              video.removeEventListener("seeked", onSeeked);
              rej(new Error("Seek timeout"));
            }, document.hidden ? 6e4 : 1e4);
          });
          const canvas = document.createElement("canvas");
          canvas.width = frameWidth;
          canvas.height = frameHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, frameWidth, frameHeight);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
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
const extractVideoHybrid = async (file) => {
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
const getToolFromPath = (path) => {
  const normalized = path.toLowerCase().replace(/^\/+/g, "").trim();
  switch (normalized) {
    case "dashboard":
      return ToolType.DASHBOARD;
    case "genmetadatagambar":
      return ToolType.IMAGE;
    case "genmetadatavideo":
      return ToolType.VIDEO;
    case "genmetadatavektor":
      return ToolType.VECTOR;
    case "seotextprompt":
      return ToolType.PROMPT_GEN;
    case "imagetoprompt":
      return ToolType.PROMPT_IMAGE;
    case "videokeywordanalyzer":
      return ToolType.PROMPT_VIDEO;
    case "aiqualitycheck":
      return ToolType.PROMPT_IMAGE_CHECK;
    case "aivideoqualitycheck":
      return ToolType.PROMPT_VIDEO_CHECK;
    case "epsconverter":
      return ToolType.VECTOR_EPS;
    case "nichecalendar":
      return ToolType.CALENDAR_GEN;
    case "mutevideogen":
      return ToolType.MUTE_VIDEO;
    case "motiongen":
      return ToolType.MOTION_GEN;
    case "removalgen":
      return ToolType.REMOVAL_GEN;
    case "communityreviews":
      return ToolType.REVIEWS;
    case "reviews":
      return ToolType.REVIEWS;
    default:
      return null;
  }
};
const toSentenceCase = (text) => {
  if (!text) return text;
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};
const getFilesForTool = (allFiles, tool) => {
  const allowedImageExts = ["jpg", "jpeg", "png", "webp"];
  const allowedVideoExts = ["mp4", "mov", "webm"];
  const allowedVectorExts = ["svg", "eps", "ai"];
  return allFiles.filter((f) => {
    if (!f.file || !f.file.name) return false;
    const ext = f.file.name.split(".").pop()?.toLowerCase() || "";
    if (tool === ToolType.IMAGE) return allowedImageExts.includes(ext);
    if (tool === ToolType.VIDEO) return allowedVideoExts.includes(ext);
    if (tool === ToolType.VECTOR) return allowedVectorExts.includes(ext);
    return true;
  });
};
const App = () => {
  const [matchSystemTheme, setMatchSystemTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("match_system_theme");
      return saved === "true";
    } catch (e) {
    }
    return false;
  });
  const [theme, setTheme] = useState(() => {
    try {
      const savedMatch = localStorage.getItem("match_system_theme");
      if (savedMatch === "true") {
        if (typeof window !== "undefined" && window.matchMedia) {
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
      }
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch (e) {
    }
    return "light";
  });
  const applyThemeWithTransition = (newTheme, updateMatchSystemTheme = true) => {
    if (updateMatchSystemTheme) {
      setMatchSystemTheme(false);
    }
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme);
        });
      });
    } else {
      setTheme(newTheme);
    }
  };
  const handleSetTheme = (newTheme) => {
    applyThemeWithTransition(newTheme, true);
  };
  const [activeTool, setActiveTool] = useState(() => {
    const currentPath = window.location.pathname;
    const matchingTool = getToolFromPath(currentPath);
    return matchingTool || ToolType.DASHBOARD;
  });
  const [prefilledSubject, setPrefilledSubject] = useState("");
  const [files, setFiles] = useState([]);
  const filesRef = useRef([]);
  const updateFiles = useCallback((updater) => {
    filesRef.current = updater(filesRef.current);
    setFiles(filesRef.current);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [keywordCount, setKeywordCount] = useState("");
  const [keywordMode, setKeywordMode] = useState(() => {
    const saved = localStorage.getItem("mz_keyword_mode");
    if (saved === "mixed" || saved === "single" || saved === "multi") {
      return saved;
    }
    return "mixed";
  });
  const [titleLength, setTitleLength] = useState(() => localStorage.getItem("mz_title_length") || "medium");
  const [metadataLanguage, setMetadataLanguage] = useState(() => localStorage.getItem("mz_metadata_language") || "en");
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeAccountsCount, setActiveAccountsCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  useEffect(() => {
    const activeUser = user || auth.currentUser;
    if (!activeUser?.uid) return;
    const userRef = doc(db, "users", activeUser.uid);
    const markOnline = async () => {
      try {
        const u = user || auth.currentUser;
        if (!u?.uid) return;
        const name = u.displayName || (u.email ? u.email.split("@")[0] : "User");
        await setDoc(userRef, {
          lastSeen: Date.now(),
          email: u.email || "",
          displayName: name,
          isOnline: true
        }, { merge: true });
      } catch (e) {
        console.info("Error marking online:", e);
      }
    };
    markOnline();
    const interval = setInterval(markOnline, 25e3);
    const handleBeforeUnload = () => {
      try {
        setDoc(userRef, { lastSeen: 0, isOnline: false }, { merge: true }).catch(() => {
        });
      } catch (e) {
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);
  useEffect(() => {
    const usersRef = collection(db, "users");
    const evaluateSnapshot = (snapshot) => {
      const uniqueUsers = /* @__PURE__ */ new Set();
      const timeoutThreshold = Date.now() - 3 * 60 * 1e3;
      if (snapshot && typeof snapshot.forEach === "function") {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let isUserOnline = false;
          if (data && data.lastSeen !== void 0 && data.lastSeen !== null) {
            let lastSeenTime = 0;
            if (typeof data.lastSeen === "number") {
              lastSeenTime = data.lastSeen;
            } else if (data.lastSeen.toMillis) {
              lastSeenTime = data.lastSeen.toMillis();
            } else if (typeof data.lastSeen === "string") {
              lastSeenTime = new Date(data.lastSeen).getTime();
            } else if (data.lastSeen.seconds) {
              lastSeenTime = data.lastSeen.seconds * 1e3;
            }
            if (lastSeenTime > timeoutThreshold) {
              isUserOnline = true;
            }
          }
          if (isUserOnline) {
            let nameToShow = data.displayName || (data.email ? data.email.split("@")[0] : "");
            if (!nameToShow && data.email) nameToShow = data.email;
            if (nameToShow && nameToShow !== "Unknown") {
              uniqueUsers.add(nameToShow);
            }
          }
        });
      }
      const currentActiveUser = user || auth.currentUser;
      if (currentActiveUser) {
        const myName = currentActiveUser.displayName || (currentActiveUser.email ? currentActiveUser.email.split("@")[0] : "User");
        if (myName && myName !== "Unknown") {
          uniqueUsers.add(myName);
        }
      }
      const usersList = Array.from(uniqueUsers);
      const finalCount = Math.max(usersList.length, currentActiveUser ? 1 : 0);
      setActiveUsers((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(usersList)) return prev;
        return usersList;
      });
      setActiveAccountsCount(finalCount);
    };
    let lastSnapshot = null;
    let unsubSnapshot = null;
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
    }, 15e3);
    return () => {
      unsubSnapshot?.();
      clearInterval(forceUpdateInterval);
    };
  }, [user]);
  const [uiLanguage, setUiLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("mz_ui_language");
      if (saved === "id" || saved === "en") return saved;
    } catch (e) {
    }
    return "en";
  });
  useEffect(() => {
    localStorage.setItem("mz_ui_language", uiLanguage);
  }, [uiLanguage]);
  useEffect(() => {
    localStorage.setItem("mz_keyword_mode", keywordMode);
  }, [keywordMode]);
  useEffect(() => {
    localStorage.setItem("mz_title_length", titleLength);
  }, [titleLength]);
  useEffect(() => {
    localStorage.setItem("mz_metadata_language", metadataLanguage);
  }, [metadataLanguage]);
  useEffect(() => {
    if (r2Status === null) {
      fetch(`/api/r2-status?t=${Date.now()}`).then((r) => r.json()).then((data) => setR2Status(!!data.configured)).catch(() => setR2Status(false));
    }
  }, []);
  const [aiCreativity, setAiCreativity] = useState(0.7);
  const [aiModelPerformance, setAiModelPerformance] = useState("detail");
  const [generationMode, setGenerationMode] = useState(GenerationMode.STANDARD);
  const [progressInfo, setProgressInfo] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [exportAdobe, setExportAdobe] = useState(true);
  const [exportShutterstock, setExportShutterstock] = useState(false);
  const [exportVecteezy, setExportVecteezy] = useState(false);
  const [exportCanva, setExportCanva] = useState(false);
  const [exportFreepik, setExportFreepik] = useState(false);
  const [exportPond5, setExportPond5] = useState(false);
  const [exportDepositPhotos, setExportDepositPhotos] = useState(false);
  const [exportMiriCanvas, setExportMiriCanvas] = useState(false);
  const [export123RF, setExport123RF] = useState(false);
  const [shutterstockDescMode, setShutterstockDescMode] = useState("desc");
  const [triggerAutoDownload, setTriggerAutoDownload] = useState(0);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
    return !sessionStorage.getItem("vixer_welcomed");
  });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [infoLanguage, setInfoLanguage] = useState("id");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(() => {
    const val = localStorage.getItem("ai_provider") || "gemini";
    const validProviders = ["gemini", "groq", "mistral", "openai", "openrouter", "blackbox", "nvidia", "bluesminds", "aivene", "zai"];
    if (!validProviders.includes(val)) {
      localStorage.setItem("ai_provider", "gemini");
      return "gemini";
    }
    return val;
  });
  const [activeSettingsTab, setActiveSettingsTab] = useState(selectedProvider);
  useEffect(() => {
    if (showSettingsModal) {
      setActiveSettingsTab(selectedProvider);
    }
  }, [showSettingsModal, selectedProvider]);
  const [mzAppName, setMzAppName] = useState(() => localStorage.getItem("mz_reseller_app_name") || "MetaZo PRO");
  const [mzAppSubtitle, setMzAppSubtitle] = useState(() => localStorage.getItem("mz_reseller_app_subtitle") || "AI-Powered Metadata Assistant");
  const [mzWhatsApp, setMzWhatsApp] = useState(() => localStorage.getItem("mz_reseller_whatsapp") || "https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr");
  const [mzPriceText, setMzPriceText] = useState(() => localStorage.getItem("mz_reseller_price") || "");
  const [mzLicenseSeed, setMzLicenseSeed] = useState(() => localStorage.getItem("mz_reseller_seed") || "MZPRO-COMMERCIAL-2026");
  const [mzLicenseKey, setMzLicenseKey] = useState(() => {
    if (localStorage.getItem("mz_cancelled_subscription") === "true") return "";
    return localStorage.getItem("mz_license_key") || "";
  });
  const [isMzLicensedState, setIsMzLicensed] = useState(() => {
    if (localStorage.getItem("mz_cancelled_subscription") === "true") return false;
    const k = (localStorage.getItem("mz_license_key") || "").trim().toUpperCase();
    return !!k;
  });
  const [isCheckingLicense, setIsCheckingLicense] = useState(() => {
    if (localStorage.getItem("mz_cancelled_subscription") === "true") return false;
    return !!(localStorage.getItem("mz_license_key") || "").trim();
  });
  const isMzLicensed = isMzLicensedState;
  const [subDaysLeft, setSubDaysLeft] = useState(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState(null);
  const [showPromoWindow, setShowPromoWindow] = useState(false);
  const [hasSyncedProfile, setHasSyncedProfile] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [lastUid, setLastUid] = useState(null);
  const [promoCodesForModal, setPromoCodesForModal] = useState([]);
  const [copiedCodeInModal, setCopiedCodeInModal] = useState(null);
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
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setHasInitiallyLoaded(true);
      setIsCheckingAuth(false);
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
    }, 1200);
    return () => clearTimeout(safetyTimer);
  }, [user?.uid]);
  const isAdminAccount = !!user && (import.meta.env.VITE_ADMIN_UID && user.uid === import.meta.env.VITE_ADMIN_UID || user.email && ["johanchrismant4@gmail.com"].includes(user.email));
  const isResellerUnlocked = isAdminAccount;
  const setIsResellerUnlocked = () => {
  };
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [preselectedChatPeer, setPreselectedChatPeer] = useState(null);
  const [chatToasts, setChatToasts] = useState([]);
  const sessionStartTime = useRef(Date.now());
  const notifiedMessageIds = useRef(/* @__PURE__ */ new Set());
  const [lastReadGlobal, setLastReadGlobal] = useState(() => {
    const val = localStorage.getItem("mz_last_read_global");
    return val ? parseInt(val) || 0 : Date.now();
  });
  const [lastReadRooms, setLastReadRooms] = useState(() => {
    const val = localStorage.getItem("mz_last_read_rooms");
    try {
      return val ? JSON.parse(val) || {} : {};
    } catch {
      return {};
    }
  });
  const handleMarkRead = useCallback((type, peerId) => {
    const now = Date.now();
    if (type === "global") {
      localStorage.setItem("mz_last_read_global", now.toString());
      setLastReadGlobal(now);
    } else if (type === "direct" && peerId) {
      setLastReadRooms((prev) => {
        const updated = { ...prev, [peerId]: now };
        localStorage.setItem("mz_last_read_rooms", JSON.stringify(updated));
        return updated;
      });
    }
  }, []);
  const playNotificationChime = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const playTone = (frequency, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(1e-4, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playTone(587.33, now, 0.12);
      playTone(698.46, now + 0.06, 0.18);
    } catch (e) {
      console.warn("Audio Context blocked or not supported", e);
    }
  }, []);
  const pushNotificationToast = useCallback((msg) => {
    setChatToasts((prev) => {
      if (prev.some((t2) => t2.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setTimeout(() => {
      setChatToasts((prev) => prev.filter((t2) => t2.id !== msg.id));
    }, 6e3);
  }, []);
  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      return;
    }
    sessionStartTime.current = Date.now();
    const unreadCounts = {};
    const updateCombinedCount = () => {
      const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
      setUnreadChatCount(total);
    };
    const globalMessagesRef = collection(db, "global_messages");
    const globalQuery = query(globalMessagesRef, orderBy("timestamp", "desc"), limit(30));
    const unsubscribeGlobal = onSnapshot(globalQuery, (snapshot) => {
      let globalUnread = 0;
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const msgId = docSnap.id;
        const timestamp = d.timestamp?.toDate ? d.timestamp.toDate().getTime() : d.timestamp || Date.now();
        if (d.senderUid !== user.uid) {
          if (timestamp > lastReadGlobal) {
            globalUnread++;
            if (timestamp > sessionStartTime.current && !notifiedMessageIds.current.has(msgId)) {
              notifiedMessageIds.current.add(msgId);
              playNotificationChime();
              pushNotificationToast({
                id: msgId,
                senderName: d.senderName || d.senderEmail?.split("@")[0] || "User",
                text: d.text || "",
                isGlobal: true
              });
            }
          }
        }
      });
      unreadCounts["global"] = globalUnread;
      updateCombinedCount();
    }, (err) => console.warn("Global messages snapshot error:", err));
    const roomsQuery1 = query(collection(db, "chats"), where("user1", "==", user.uid));
    const roomsQuery2 = query(collection(db, "chats"), where("user2", "==", user.uid));
    const activeSubscribers = {};
    const monitorRoomMessages = (roomId, partnerId, partnerEmail, partnerName) => {
      if (activeSubscribers[roomId]) return;
      const q = query(collection(db, "chats", roomId, "messages"), orderBy("timestamp", "desc"), limit(20));
      activeSubscribers[roomId] = onSnapshot(q, (snapshot) => {
        let roomUnread = 0;
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const msgId = docSnap.id;
          const timestamp = d.timestamp?.toDate ? d.timestamp.toDate().getTime() : d.timestamp || Date.now();
          if (d.senderUid !== user.uid) {
            const lastReadTime = lastReadRooms[partnerId] || 0;
            if (timestamp > lastReadTime) {
              roomUnread++;
              if (timestamp > sessionStartTime.current && !notifiedMessageIds.current.has(msgId)) {
                notifiedMessageIds.current.add(msgId);
                playNotificationChime();
                pushNotificationToast({
                  id: msgId,
                  senderName: d.senderName || d.senderEmail?.split("@")[0] || partnerName || "User",
                  text: d.text || "",
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
      }, (err) => console.warn("Room messages snapshot error:", err));
    };
    const processRoomDocs = (snapshot) => {
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const roomId = docSnap.id;
        const isUser1 = d.user1 === user.uid;
        const partnerId = isUser1 ? d.user2 : d.user1;
        const partnerEmail = isUser1 ? d.user2Email : d.user1Email;
        const partnerName = isUser1 ? d.user2Name : d.user1Name;
        monitorRoomMessages(roomId, partnerId, partnerEmail, partnerName);
      });
    };
    const unsubscribeRooms1 = onSnapshot(roomsQuery1, processRoomDocs, (err) => console.warn("Rooms1 snapshot error", err));
    const unsubscribeRooms2 = onSnapshot(roomsQuery2, processRoomDocs, (err) => console.warn("Rooms2 snapshot error", err));
    return () => {
      unsubscribeGlobal();
      unsubscribeRooms1();
      unsubscribeRooms2();
      Object.values(activeSubscribers).forEach((unsub) => unsub());
    };
  }, [user, lastReadGlobal, lastReadRooms, playNotificationChime, pushNotificationToast]);
  const getTodayDateString = () => {
    const d = /* @__PURE__ */ new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [cloudDailyCounts, setCloudDailyCounts] = useState({});
  const getDailyCount = useCallback((type) => {
    const dateStr = getTodayDateString();
    const suffix = isMzLicensed ? "_PRO" : "_TRIAL";
    const key = `${type}${suffix}`;
    const cloudVal = cloudDailyCounts[key];
    const val = localStorage.getItem(`mz_daily_gen_${key}_${dateStr}`);
    const localVal = val ? parseInt(val) || 0 : 0;
    return typeof cloudVal === "number" ? Math.max(cloudVal, localVal) : localVal;
  }, [cloudDailyCounts, isMzLicensed]);
  const getTotalDailyCount = useCallback(() => {
    const tools = [
      ToolType.IMAGE,
      ToolType.VIDEO,
      ToolType.VECTOR,
      ToolType.PROMPT_GEN,
      ToolType.PROMPT_IMAGE,
      ToolType.PROMPT_VIDEO,
      ToolType.PROMPT_IMAGE_CHECK,
      ToolType.PROMPT_VIDEO_CHECK,
      ToolType.CALENDAR_GEN,
      ToolType.MUTE_VIDEO,
      ToolType.MOTION_GEN
    ];
    return tools.reduce((sum, tool) => sum + getDailyCount(tool), 0);
  }, [getDailyCount]);
  const [dailyGenCounts, setDailyGenCounts] = useState({});
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
  const incrementDailyCount = useCallback((type, amount = 1) => {
    const dateStr = getTodayDateString();
    const current = getDailyCount(type);
    const newVal = current + amount;
    const suffix = isMzLicensed ? "_PRO" : "_TRIAL";
    const key = `${type}${suffix}`;
    localStorage.setItem(`mz_daily_gen_${key}_${dateStr}`, String(newVal));
    if (user) {
      const userRef = doc(db, "users", user.uid);
      updateDoc(userRef, {
        [`dailyUsage.${dateStr}.${key}`]: newVal,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).catch((err) => {
        setDoc(userRef, {
          dailyUsage: {
            [dateStr]: {
              [key]: newVal
            }
          },
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true }).catch(() => {
        });
      });
    }
    refreshDailyCounts();
  }, [getDailyCount, refreshDailyCounts, user, isMzLicensed]);
  useEffect(() => {
    localStorage.removeItem("mz_offline_user");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) {
      setHasSyncedProfile(true);
      setCloudDailyCounts({});
      return;
    }
    const dateStr = getTodayDateString();
    const lastQuotaError = localStorage.getItem("last_firestore_quota_error");
    if (lastQuotaError && lastQuotaError === (/* @__PURE__ */ new Date()).toDateString()) {
      console.warn("Skipping Firestore user read due to previous quota error");
      setHasSyncedProfile(true);
      return;
    }
    const findActiveKeyForEmail = async (email) => {
      if (!email) return "";
      const keysRef = collection(db, "keys");
      try {
        const q1 = query(keysRef, where("activatedBy", "==", email), where("activated", "==", true));
        const qSnap1 = await getDocs(q1);
        for (const docSnap of qSnap1.docs) {
          const kData = docSnap.data();
          if (kData.duration === "30days" && kData.activatedAt) {
            const actTime = new Date(kData.activatedAt).getTime();
            const elapsedDays = (Date.now() - actTime) / (1e3 * 60 * 60 * 24);
            if (elapsedDays >= 30) {
              updateDoc(doc(db, "keys", docSnap.id), { activated: false, activatedBy: "", activatedAt: "" }).catch(() => {
              });
              continue;
            }
          }
          return docSnap.id;
        }
        if (email.toLowerCase() !== email) {
          const q2 = query(keysRef, where("activatedBy", "==", email.toLowerCase()), where("activated", "==", true));
          const qSnap2 = await getDocs(q2);
          for (const docSnap of qSnap2.docs) {
            const kData = docSnap.data();
            if (kData.duration === "30days" && kData.activatedAt) {
              const actTime = new Date(kData.activatedAt).getTime();
              const elapsedDays = (Date.now() - actTime) / (1e3 * 60 * 60 * 24);
              if (elapsedDays >= 30) {
                updateDoc(doc(db, "keys", docSnap.id), { activated: false, activatedBy: "", activatedAt: "" }).catch(() => {
                });
                continue;
              }
            }
            return docSnap.id;
          }
        }
      } catch (err) {
        console.warn("Error querying keys collection:", err);
      }
      return "";
    };
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const localCancelled = localStorage.getItem("mz_cancelled_subscription") === "true";
        const isCancelled = data.cancelledSubscription === true || localCancelled;
        if (isCancelled) {
          setMzLicenseKey("");
          setIsMzLicensed(false);
          setIsCheckingLicense(false);
          setSubDaysLeft(null);
          localStorage.removeItem("mz_license_key");
          localStorage.setItem("mz_cancelled_subscription", "true");
          setHasSyncedProfile(true);
        } else {
          const localKey = localStorage.getItem("mz_license_key") || "";
          const cloudKey = data.licenseKey || "";
          const activeKey = cloudKey || localKey || "";
          if (activeKey) {
            setMzLicenseKey(activeKey);
            setIsCheckingLicense(true);
            localStorage.setItem("mz_license_key", activeKey);
            localStorage.removeItem("mz_cancelled_subscription");
            if (cloudKey !== activeKey && !localCancelled) {
              setDoc(userDocRef, {
                licenseKey: activeKey,
                cancelledSubscription: false,
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              }, { merge: true }).catch((e) => {
                console.info("db_op", e);
              });
            }
          } else {
            findActiveKeyForEmail(user.email || "").then((foundKey) => {
              if (foundKey) {
                setMzLicenseKey(foundKey);
                setIsCheckingLicense(true);
                localStorage.setItem("mz_license_key", foundKey);
                localStorage.removeItem("mz_cancelled_subscription");
                setDoc(userDocRef, {
                  licenseKey: foundKey,
                  cancelledSubscription: false,
                  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
                }, { merge: true }).catch((e) => {
                  console.info("db_op", e);
                });
              } else {
                setMzLicenseKey("");
                setIsMzLicensed(false);
                setIsCheckingLicense(false);
                setSubDaysLeft(null);
                setHasSyncedProfile(true);
              }
            });
          }
        }
        if (data.trialStart) {
          localStorage.setItem("mz_trial_start", data.trialStart);
          setTrialDaysLeft(99999);
        }
        if (data.dailyUsage && data.dailyUsage[dateStr]) {
          const usageToday = data.dailyUsage[dateStr];
          setCloudDailyCounts((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(usageToday)) return prev;
            return usageToday;
          });
          Object.keys(usageToday).forEach((typeKey) => {
            localStorage.setItem(`mz_daily_gen_${typeKey}_${dateStr}`, String(usageToday[typeKey]));
          });
        } else {
          setCloudDailyCounts((prev) => Object.keys(prev).length === 0 ? prev : {});
        }
        setHasCustomKeySaved(
          (localStorage.getItem("gemini_api_key") || "").length > 0 || (localStorage.getItem("groq_api_key") || "").length > 0 || (localStorage.getItem("mistral_api_key") || "").length > 0 || (localStorage.getItem("openai_api_key") || "").length > 0 || (localStorage.getItem("openrouter_api_key") || "").length > 0 || (localStorage.getItem("blackbox_api_key") || "").length > 0 || (localStorage.getItem("nvidia_api_key") || "").length > 0 || (localStorage.getItem("bluesminds_api_key") || "").length > 0 || (localStorage.getItem("aivene_api_key") || "").length > 0 || (localStorage.getItem("zai_api_key") || "").length > 0
        );
      } else {
        const localKey = localStorage.getItem("mz_license_key") || "";
        const proceedWithInit = (finalKey) => {
          const localTrialStart = localStorage.getItem("mz_trial_start") || (/* @__PURE__ */ new Date()).toISOString();
          localStorage.setItem("mz_trial_start", localTrialStart);
          setTrialDaysLeft(99999);
          const initialUsage = {};
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
          tools.forEach((t2) => {
            const val = localStorage.getItem(`mz_daily_gen_${t2}_${dateStr}`);
            if (val) {
              initialUsage[t2] = parseInt(val) || 0;
            }
          });
          const initialSettings = {
            gemini_api_key: localStorage.getItem("gemini_api_key") || "",
            groq_api_key: localStorage.getItem("groq_api_key") || "",
            mistral_api_key: localStorage.getItem("mistral_api_key") || "",
            openai_api_key: localStorage.getItem("openai_api_key") || "",
            openrouter_api_key: localStorage.getItem("openrouter_api_key") || "",
            blackbox_api_key: localStorage.getItem("blackbox_api_key") || "",
            nvidia_api_key: localStorage.getItem("nvidia_api_key") || "",
            bluesminds_api_key: localStorage.getItem("bluesminds_api_key") || "",
            aivene_api_key: localStorage.getItem("aivene_api_key") || "",
            zai_api_key: localStorage.getItem("zai_api_key") || "",
            ai_provider: localStorage.getItem("ai_provider") || "gemini",
            mz_gemini_model: localStorage.getItem("mz_gemini_model") || "",
            mz_groq_model: localStorage.getItem("mz_groq_model") || "",
            mz_nvidia_model: localStorage.getItem("mz_nvidia_model") || "",
            mz_aivene_model: localStorage.getItem("mz_aivene_model") || "",
            uiLanguage: localStorage.getItem("mz_ui_language") || "en",
            keywordMode: (() => {
              const saved = localStorage.getItem("mz_keyword_mode");
              if (saved === "mixed" || saved === "single" || saved === "multi") {
                return saved;
              }
              return "mixed";
            })(),
            titleLength: localStorage.getItem("mz_title_length") || "medium",
            metadataLanguage: localStorage.getItem("mz_metadata_language") || "en"
          };
          const resolvedKey = finalKey || "";
          if (resolvedKey) {
            localStorage.removeItem("mz_cancelled_subscription");
          }
          const isCancelled = resolvedKey ? false : localStorage.getItem("mz_cancelled_subscription") === "true";
          if (resolvedKey) {
            setMzLicenseKey((prev) => {
              return resolvedKey;
            });
            setIsCheckingLicense(true);
            localStorage.setItem("mz_license_key", resolvedKey);
          }
          setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName || "",
            licenseKey: resolvedKey,
            cancelledSubscription: isCancelled,
            trialStart: localTrialStart,
            dailyUsage: {
              [dateStr]: initialUsage
            },
            settings: initialSettings,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }, { merge: true }).then(() => {
            if (!resolvedKey) {
              setHasSyncedProfile(true);
            }
          }).catch((err) => {
            console.info("db_op", err);
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
            if (!resolvedKey) {
              setHasSyncedProfile(true);
            }
          });
        };
        if (localKey) {
          proceedWithInit(localKey);
        } else {
          findActiveKeyForEmail(user.email || "").then((foundKey) => {
            if (foundKey) {
              setMzLicenseKey((prev) => {
                return foundKey;
              });
              setIsCheckingLicense(true);
              localStorage.setItem("mz_license_key", foundKey);
              proceedWithInit(foundKey);
            } else {
              proceedWithInit("");
            }
          });
        }
      }
    }, (error) => {
      console.warn("Firestore user load error:", error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setHasSyncedProfile(true);
      setIsCheckingLicense(false);
    });
    return () => unsubscribeUser();
  }, [user]);
  useEffect(() => {
    refreshDailyCounts();
  }, [cloudDailyCounts, refreshDailyCounts]);
  useEffect(() => {
    const docRef = doc(db, "branding", "main");
    getDoc(docRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.appName) {
          setMzAppName(data.appName);
          localStorage.setItem("mz_reseller_app_name", data.appName);
        }
        if (data.appSubtitle) {
          setMzAppSubtitle(data.appSubtitle);
          localStorage.setItem("mz_reseller_app_subtitle", data.appSubtitle);
        }
        if (data.whatsAppLink) {
          setMzWhatsApp(data.whatsAppLink);
          localStorage.setItem("mz_reseller_whatsapp", data.whatsAppLink);
        }
        if (data.pricingTier) {
          setMzPriceText(data.pricingTier);
          localStorage.setItem("mz_reseller_price", data.pricingTier);
        }
        if (data.licenseSeed) {
          setMzLicenseSeed(data.licenseSeed);
          localStorage.setItem("mz_reseller_seed", data.licenseSeed);
        }
        if (data.payInfo) {
          let payInfoToSave = data.payInfo;
          if (payInfoToSave.includes("BCA 817")) {
            payInfoToSave = "Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom";
            setDoc(docRef, { payInfo: payInfoToSave }, { merge: true }).catch(() => {
            });
          }
          localStorage.setItem("mz_reseller_pay_info", payInfoToSave);
          window.dispatchEvent(new CustomEvent("mz_pay_info_updated", { detail: payInfoToSave }));
        }
      } else {
        setDoc(docRef, {
          appName: "MetaZo PRO",
          appSubtitle: "AI-Powered Metadata Assistant",
          whatsAppLink: "https://chat.whatsapp.com/EJgcCSymQYE3724FqpFzxr",
          pricingTier: "Rp 149.000 / Bulan",
          licenseSeed: "MZPRO-COMMERCIAL-2026",
          payInfo: "Bank Neo Commerce 5859459216848654 a/n Johan Chrismant Bernandus Gultom\nE-Wallet Dana 082275408171 a/n Johan Chrismant Bernandus Gultom",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true }).catch((err) => {
          console.info("db_op", err);
          handleFirestoreError(err, OperationType.WRITE, "branding/main");
        });
      }
    }).catch((error) => {
      console.warn("Firestore branding load error, keeping local cached entries:", error);
    });
  }, []);
  const [trialDaysLeft, setTrialDaysLeft] = useState(() => {
    return 99999;
  });
  useEffect(() => {
    if (!isMzLicensed && trialDaysLeft <= 0) {
      const todayStr = getTodayDateString();
      const lastModalDate = localStorage.getItem("mz_last_expired_modal_date");
      if (lastModalDate !== todayStr) {
        localStorage.setItem("mz_last_expired_modal_date", todayStr);
        setShowActivationModal(true);
      }
    }
  }, [isMzLicensed, trialDaysLeft]);
  useEffect(() => {
    if (!user) return;
    const unsubPromos = onSnapshot(query(collection(db, "promos"), limit(15)), (qSnap) => {
      const list = [];
      const now = /* @__PURE__ */ new Date();
      qSnap.forEach((doc2) => {
        const data = doc2.data();
        const usedCount = Number(data.usedCount) || 0;
        const maxUses = Number(data.maxUses) || 99999;
        if (usedCount >= maxUses) return;
        if (data.endDate) {
          const endStr = data.endDate;
          const end = endStr.includes("T") ? new Date(endStr) : /* @__PURE__ */ new Date(endStr + "T23:59:59");
          if (now > end) return;
        }
        list.push({ id: doc2.id, ...data });
      });
      setPromoCodesForModal(list);
      localStorage.setItem("mz_promos_cache", JSON.stringify(list));
    }, (err) => {
      const errMsg = err?.message || (err && typeof err === "object" && "message" in err ? String(err.message) : "") || String(err);
      const errCode = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      const isPermissionErr = errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("denied") || errCode.toLowerCase().includes("permission") || errCode.toLowerCase().includes("denied");
      if (!isPermissionErr) {
        console.warn("Failed to subscribe to promos for modal, loading cached:", err);
      }
      if (isPermissionErr) {
        setPromoCodesForModal([]);
        return;
      }
      let cached = localStorage.getItem("mz_promos_cache");
      if (!cached) {
        const seedPromos = [
          { id: "MZPROMO2026", code: "MZPROMO2026", type: "discount", value: 50, maxUses: 500, usedCount: 124, description: "Promo Spesial Tahun 2026 (Diskon 50%)", createdAt: (/* @__PURE__ */ new Date()).toISOString(), startDate: "2026-01-01", endDate: "2027-12-31" },
          { id: "FREEPREMIUM7D", code: "FREEPREMIUM7D", type: "free_premium", value: 7, maxUses: 1e3, usedCount: 312, description: "Akses Premium Gratis 7 Hari", createdAt: (/* @__PURE__ */ new Date()).toISOString(), startDate: "2026-01-01", endDate: "2027-12-31" },
          { id: "METAZOPRO20", code: "METAZOPRO20", type: "discount", value: 20, maxUses: 100, usedCount: 15, description: "Kupon Diskon 20% MetaZo PRO", createdAt: (/* @__PURE__ */ new Date()).toISOString(), startDate: "2026-01-01", endDate: "2027-12-31" }
        ];
        localStorage.setItem("mz_promos_cache", JSON.stringify(seedPromos));
        cached = JSON.stringify(seedPromos);
      }
      try {
        setPromoCodesForModal(JSON.parse(cached));
      } catch (e) {
      }
    });
    return () => unsubPromos();
  }, [user]);
  const handleSetActiveTool = (tool) => {
    if (tool === ToolType.MOTION_GEN) {
      setComingSoonFeature("motion_gen");
      return;
    }
    setActiveTool(tool);
    const path = toolToPath[tool] || "/Dashboard";
    const isIframe = typeof window !== "undefined" && window.self !== window.top;
    if (!isIframe && window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    const mainScrollAreas = document.querySelectorAll(".overflow-y-auto");
    mainScrollAreas.forEach((area) => {
      area.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });
  };
  useEffect(() => {
    if (isCheckingAuth) return;
    const currentPath = window.location.pathname;
    const isIframe = typeof window !== "undefined" && window.self !== window.top;
    if (!user) {
      if (currentPath !== "/Login") {
        const tool = getToolFromPath(currentPath);
        if (tool && tool !== ToolType.DASHBOARD) {
          localStorage.setItem("mz_redirect_after_login", currentPath);
        }
        if (!isIframe) {
          window.history.replaceState(null, "", "/Login");
        }
      }
    } else {
      if (currentPath === "/Login" || currentPath === "/" || currentPath === "") {
        const savedRedirect = localStorage.getItem("mz_redirect_after_login");
        localStorage.removeItem("mz_redirect_after_login");
        const redirectTool = savedRedirect ? getToolFromPath(savedRedirect) : null;
        if (redirectTool) {
          setActiveTool(redirectTool);
          if (!isIframe) {
            window.history.replaceState(null, "", toolToPath[redirectTool]);
          }
        } else {
          setActiveTool(ToolType.DASHBOARD);
          if (!isIframe) {
            window.history.replaceState(null, "", "/Dashboard");
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
        if (!isIframe && window.location.pathname !== "/Login") {
          window.history.replaceState(null, "", "/Login");
        }
        return;
      }
      const tool = getToolFromPath(window.location.pathname);
      if (tool) {
        setActiveTool(tool);
      } else {
        setActiveTool(ToolType.DASHBOARD);
        if (!isIframe && window.location.pathname !== "/Dashboard") {
          window.history.replaceState(null, "", "/Dashboard");
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
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
    const currentSeed = localStorage.getItem("mz_reseller_seed")?.trim().toUpperCase() || "MZPRO-COMMERCIAL-2026";
    if (k === currentSeed || k === "MZPRO-COMMERCIAL-2026") {
      setIsMzLicensed(true);
      setSubDaysLeft(null);
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
      return;
    }
    let devId = localStorage.getItem("mz_device_id");
    if (!devId) {
      devId = "dev-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
      localStorage.setItem("mz_device_id", devId);
    }
    const clearLicenseKey = (msg, expiredKey) => {
      setIsMzLicensed(false);
      setSubDaysLeft(null);
      localStorage.removeItem("mz_license_key");
      localStorage.setItem("mz_cancelled_subscription", "true");
      setMzLicenseKey((prev) => {
        return "";
      });
      const dateStr = getTodayDateString();
      Object.values(ToolType).forEach((type) => {
        localStorage.removeItem(`mz_daily_gen_${type}_TRIAL_${dateStr}`);
      });
      if (expiredKey) {
        updateDoc(doc(db, "keys", expiredKey), { activated: false, activatedBy: "", activatedAt: "" }).catch(() => {
        });
      }
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const updates = {
          licenseKey: "",
          cancelledSubscription: true,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        Object.values(ToolType).forEach((type) => {
          updates[`dailyUsage.${dateStr}.${type}_TRIAL`] = deleteField();
        });
        updateDoc(userRef, updates).catch(() => {
        });
      }
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
      if (msg) {
        const todayStr = getTodayDateString();
        const lastAlertDate = localStorage.getItem("mz_last_expiry_notice_date");
        if (lastAlertDate !== todayStr) {
          localStorage.setItem("mz_last_expiry_notice_date", todayStr);
          setShowActivationModal(true);
          alert(msg);
        }
      }
      refreshDailyCounts();
    };
    getDoc(doc(db, "keys", k)).then((dSnap) => {
      console.log("License check: key", k, "exists:", dSnap.exists());
      if (dSnap.exists()) {
        const data = dSnap.data();
        console.log("License check: data:", data);
        if (data.activated) {
          const currentEmail = user?.email || "";
          const keyActivatedBy = data.activatedBy || "";
          const firstActivatedBy = data.firstActivatedBy || "";
          const ownerId = firstActivatedBy || keyActivatedBy;
          const isEmail = (str) => str.includes("@");
          let isRejected = false;
          if (user) {
            if (!ownerId || ownerId.toLowerCase() === currentEmail.toLowerCase() || ownerId === user.uid) {
              if (ownerId === user.uid && currentEmail) {
                updateDoc(doc(db, "keys", k), { activatedBy: currentEmail, firstActivatedBy: currentEmail }).catch((e) => console.info("db_op", e));
              } else if (!ownerId && currentEmail) {
                updateDoc(doc(db, "keys", k), { activatedBy: currentEmail, firstActivatedBy: currentEmail }).catch((e) => console.info("db_op", e));
              }
            } else if (ownerId === devId) {
              if (currentEmail) {
                updateDoc(doc(db, "keys", k), { activatedBy: currentEmail, firstActivatedBy: currentEmail }).catch((e) => console.info("db_op", e));
              }
            } else {
              isRejected = true;
            }
          } else {
            if (ownerId && isEmail(ownerId)) {
              setIsMzLicensed(false);
              setIsCheckingLicense(false);
              setHasSyncedProfile(true);
              return;
            } else if (ownerId && ownerId !== devId) {
              isRejected = true;
            }
          }
          if (isRejected) {
            clearLicenseKey();
            return;
          }
          if (user && user.email && (!ownerId || !isEmail(ownerId))) {
            updateDoc(doc(db, "keys", k), { activatedBy: user.email, firstActivatedBy: user.email }).catch((e) => console.info("db_op", e));
          }
          if (data.duration === "30days" && data.activatedAt) {
            const activatedTime = new Date(data.activatedAt).getTime();
            const nowTime = (/* @__PURE__ */ new Date()).getTime();
            const elapsedMs = nowTime - activatedTime;
            const elapsedDays = elapsedMs / (1e3 * 60 * 60 * 24);
            const remainingDays = 30 - elapsedDays;
            if (remainingDays <= 0) {
              clearLicenseKey("Masa berlangganan 30 Hari Anda telah habis! Sistem secara otomatis mematikan lisensi terdaftar dan mengembalikan Anda ke masa trial.", k);
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
    }).catch((err) => {
      console.warn("License validator connection error, retaining local state:", err);
      setIsMzLicensed((prev) => prev && !!localStorage.getItem("mz_license_key"));
    }).finally(() => {
      setIsCheckingLicense(false);
      setHasSyncedProfile(true);
    });
  }, [mzLicenseKey, user, isCheckingAuth]);
  const [geminiKeysList, setGeminiKeysList] = useState(() => {
    return (localStorage.getItem("gemini_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [groqKeysList, setGroqKeysList] = useState(() => {
    return (localStorage.getItem("groq_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [mistralKeysList, setMistralKeysList] = useState(() => {
    return (localStorage.getItem("mistral_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [openaiKeysList, setOpenaiKeysList] = useState(() => {
    return (localStorage.getItem("openai_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [openrouterKeysList, setOpenrouterKeysList] = useState(() => {
    return (localStorage.getItem("openrouter_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [blackboxKeysList, setBlackboxKeysList] = useState(() => {
    return (localStorage.getItem("blackbox_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [nvidiaKeysList, setNvidiaKeysList] = useState(() => {
    return (localStorage.getItem("nvidia_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [bluesmindsKeysList, setBluesmindsKeysList] = useState(() => {
    return (localStorage.getItem("bluesminds_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [aiveneKeysList, setAiveneKeysList] = useState(() => {
    return (localStorage.getItem("aivene_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [zaiKeysList, setZaiKeysList] = useState(() => {
    return (localStorage.getItem("zai_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
  });
  const [selectedNvidiaModel, setSelectedNvidiaModel] = useState(localStorage.getItem("mz_nvidia_model") || "stepfun-ai/step-3.5-flash");
  const [selectedAiveneModel, setSelectedAiveneModel] = useState(localStorage.getItem("mz_aivene_model") || "auto");
  const [selectedZaiModel, setSelectedZaiModel] = useState(localStorage.getItem("mz_zai_model") || "glm-5.2");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState(() => localStorage.getItem("mz_gemini_model") || "auto");
  const [selectedGroqModel, setSelectedGroqModel] = useState(() => localStorage.getItem("mz_groq_model") || "llama-3.3-70b-versatile");
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [newGroqKey, setNewGroqKey] = useState("");
  const [newMistralKey, setNewMistralKey] = useState("");
  const [newOpenaiKey, setNewOpenaiKey] = useState("");
  const [newOpenrouterKey, setNewOpenrouterKey] = useState("");
  const [newBlackboxKey, setNewBlackboxKey] = useState("");
  const [newNvidiaKey, setNewNvidiaKey] = useState("");
  const [newBluesmindsKey, setNewBluesmindsKey] = useState("");
  const [newAiveneKey, setNewAiveneKey] = useState("");
  const [newZaiKey, setNewZaiKey] = useState("");
  const [serverKeysStatus, setServerKeysStatus] = useState({});
  const [keyTestingIndex, setKeyTestingIndex] = useState(null);
  const [keyTestProvider, setKeyTestProvider] = useState(null);
  const [keyTestResults, setKeyTestResults] = useState({});
  const [hasCustomKeySaved, setHasCustomKeySaved] = useState(() => {
    const geminiSaved = (localStorage.getItem("gemini_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const groqSaved = (localStorage.getItem("groq_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const mistralSaved = (localStorage.getItem("mistral_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const openaiSaved = (localStorage.getItem("openai_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const openrouterSaved = (localStorage.getItem("openrouter_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const blackboxSaved = (localStorage.getItem("blackbox_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const nvidiaSaved = (localStorage.getItem("nvidia_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const bluesmindsSaved = (localStorage.getItem("bluesminds_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const aiveneSaved = (localStorage.getItem("aivene_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    const zaiSaved = (localStorage.getItem("zai_api_key") || "").split(",").map((k) => k.trim()).filter(Boolean);
    return geminiSaved.length > 0 || groqSaved.length > 0 || mistralSaved.length > 0 || openaiSaved.length > 0 || openrouterSaved.length > 0 || blackboxSaved.length > 0 || nvidiaSaved.length > 0 || bluesmindsSaved.length > 0 || aiveneSaved.length > 0 || zaiSaved.length > 0;
  });
  const fetchProviderStatus = async () => {
    try {
      const response = await fetch("/api/provider-status");
      const data = await response.json();
      setServerKeysStatus(data);
    } catch (err) {
      console.warn("Gagal memuat status provider bawaan server:", err);
    }
  };
  useEffect(() => {
    if (showSettingsModal) {
      if (Object.keys(serverKeysStatus).length === 0) {
        fetchProviderStatus();
      }
      const gSaved = localStorage.getItem("gemini_api_key") || "";
      const grSaved = localStorage.getItem("groq_api_key") || "";
      const mSaved = localStorage.getItem("mistral_api_key") || "";
      const oSaved = localStorage.getItem("openai_api_key") || "";
      const orSaved = localStorage.getItem("openrouter_api_key") || "";
      const bSaved = localStorage.getItem("blackbox_api_key") || "";
      const nSaved = localStorage.getItem("nvidia_api_key") || "";
      const blSaved = localStorage.getItem("bluesminds_api_key") || "";
      const aSaved = localStorage.getItem("aivene_api_key") || "";
      const zSaved = localStorage.getItem("zai_api_key") || "";
      const validProviders = ["gemini", "groq", "mistral", "openai", "openrouter", "blackbox", "nvidia", "bluesminds", "aivene", "zai"];
      const rawP = localStorage.getItem("ai_provider") || "gemini";
      const pSaved = validProviders.includes(rawP) ? rawP : "gemini";
      const gParsed = gSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const grParsed = grSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const mParsed = mSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const oParsed = oSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const orParsed = orSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const bParsed = bSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const nParsed = nSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const blParsed = blSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const aParsed = aSaved.split(",").map((k) => k.trim()).filter(Boolean);
      const zParsed = zSaved.split(",").map((k) => k.trim()).filter(Boolean);
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
      setNewGeminiKey("");
      setNewGroqKey("");
      setNewMistralKey("");
      setNewOpenaiKey("");
      setNewOpenrouterKey("");
      setNewBlackboxKey("");
      setNewNvidiaKey("");
      setNewBluesmindsKey("");
      setNewAiveneKey("");
      setNewZaiKey("");
      setSelectedProvider(pSaved);
      setHasCustomKeySaved(
        gParsed.length > 0 || grParsed.length > 0 || mParsed.length > 0 || oParsed.length > 0 || orParsed.length > 0 || bParsed.length > 0 || nParsed.length > 0 || blParsed.length > 0 || aParsed.length > 0 || zParsed.length > 0
      );
      setKeyTestingIndex(null);
      setKeyTestProvider(null);
      setKeyTestResults({});
    }
  }, [showSettingsModal]);
  const handleTestKeyAtIndex = async (provider, index, keyValue) => {
    if (!keyValue.trim()) return;
    setKeyTestingIndex(index);
    setKeyTestProvider(provider);
    const compoundKey = `${provider}-${index}`;
    setKeyTestResults((prev) => {
      const copy = { ...prev };
      delete copy[compoundKey];
      return copy;
    });
    let endpoint = "/api/test-gemini-key";
    if (provider === "groq") endpoint = "/api/test-groq-key";
    if (provider === "mistral") endpoint = "/api/test-mistral-key";
    if (provider === "openai") endpoint = "/api/test-openai-key";
    if (provider === "openrouter") endpoint = "/api/test-openrouter-key";
    if (provider === "blackbox") endpoint = "/api/test-blackbox-key";
    if (provider === "nvidia") endpoint = "/api/test-nvidia-key";
    if (provider === "bluesminds") endpoint = "/api/test-bluesminds-key";
    if (provider === "aivene") endpoint = "/api/test-aivene-key";
    if (provider === "zai") endpoint = "/api/test-zai-key";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyValue.trim() })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.quotaExceeded) {
          setKeyTestResults((prev) => ({
            ...prev,
            [compoundKey]: { type: "quota", message: "Quota habis (RESOURCE_EXHAUSTED)" }
          }));
        } else {
          setKeyTestResults((prev) => ({
            ...prev,
            [compoundKey]: { type: "success", message: "Key valid & terkoneksi!" }
          }));
        }
      } else {
        setKeyTestResults((prev) => ({
          ...prev,
          [compoundKey]: { type: "error", message: data.error || "Key salah atau tidak valid." }
        }));
      }
    } catch (e) {
      setKeyTestResults((prev) => ({
        ...prev,
        [compoundKey]: { type: "error", message: e.message || "Koneksi error." }
      }));
    } finally {
      setKeyTestingIndex(null);
      setKeyTestProvider(null);
    }
  };
  const handleAddApiKey = (provider) => {
    let key = "";
    let currentList = [];
    if (provider === "gemini") {
      key = newGeminiKey.trim();
      currentList = geminiKeysList;
    } else if (provider === "groq") {
      key = newGroqKey.trim();
      currentList = groqKeysList;
    } else if (provider === "mistral") {
      key = newMistralKey.trim();
      currentList = mistralKeysList;
    } else if (provider === "openai") {
      key = newOpenaiKey.trim();
      currentList = openaiKeysList;
    } else if (provider === "openrouter") {
      key = newOpenrouterKey.trim();
      currentList = openrouterKeysList;
    } else if (provider === "blackbox") {
      key = newBlackboxKey.trim();
      currentList = blackboxKeysList;
    } else if (provider === "nvidia") {
      key = newNvidiaKey.trim();
      currentList = nvidiaKeysList;
    } else if (provider === "bluesminds") {
      key = newBluesmindsKey.trim();
      currentList = bluesmindsKeysList;
    } else if (provider === "aivene") {
      key = newAiveneKey.trim();
      currentList = aiveneKeysList;
    } else if (provider === "zai") {
      key = newZaiKey.trim();
      currentList = zaiKeysList;
    }
    if (!key) return;
    if (currentList.some((k) => k === key)) {
      alert("API Key ini sudah ada dalam daftar!");
      return;
    }
    const updatedList = [...currentList, key];
    if (provider === "gemini") {
      setGeminiKeysList(updatedList);
      setNewGeminiKey("");
    } else if (provider === "groq") {
      setGroqKeysList(updatedList);
      setNewGroqKey("");
    } else if (provider === "mistral") {
      setMistralKeysList(updatedList);
      setNewMistralKey("");
    } else if (provider === "openai") {
      setOpenaiKeysList(updatedList);
      setNewOpenaiKey("");
    } else if (provider === "openrouter") {
      setOpenrouterKeysList(updatedList);
      setNewOpenrouterKey("");
    } else if (provider === "blackbox") {
      setBlackboxKeysList(updatedList);
      setNewBlackboxKey("");
    } else if (provider === "nvidia") {
      setNvidiaKeysList(updatedList);
      setNewNvidiaKey("");
    } else if (provider === "bluesminds") {
      setBluesmindsKeysList(updatedList);
      setNewBluesmindsKey("");
    } else if (provider === "aivene") {
      setAiveneKeysList(updatedList);
      setNewAiveneKey("");
    } else if (provider === "zai") {
      setZaiKeysList(updatedList);
      setNewZaiKey("");
    }
    localStorage.setItem(`${provider}_api_key`, updatedList.join(","));
    setHasCustomKeySaved(true);
    if (auth.currentUser) {
      updateDoc(doc(db, "users", auth.currentUser.uid), {
        [`settings.${provider}_api_key`]: updatedList.join(",")
      }).catch((err) => console.info("db_op", err));
    }
  };
  const handleDeleteApiKey = (provider, index) => {
    let listSetter;
    let list = [];
    if (provider === "gemini") {
      listSetter = setGeminiKeysList;
      list = geminiKeysList;
    } else if (provider === "groq") {
      listSetter = setGroqKeysList;
      list = groqKeysList;
    } else if (provider === "mistral") {
      listSetter = setMistralKeysList;
      list = mistralKeysList;
    } else if (provider === "openai") {
      listSetter = setOpenaiKeysList;
      list = openaiKeysList;
    } else if (provider === "openrouter") {
      listSetter = setOpenrouterKeysList;
      list = openrouterKeysList;
    } else if (provider === "blackbox") {
      listSetter = setBlackboxKeysList;
      list = blackboxKeysList;
    } else if (provider === "nvidia") {
      listSetter = setNvidiaKeysList;
      list = nvidiaKeysList;
    } else if (provider === "bluesminds") {
      listSetter = setBluesmindsKeysList;
      list = bluesmindsKeysList;
    } else if (provider === "aivene") {
      listSetter = setAiveneKeysList;
      list = aiveneKeysList;
    } else if (provider === "zai") {
      listSetter = setZaiKeysList;
      list = zaiKeysList;
    }
    const filtered = list.filter((_, i) => i !== index);
    listSetter(filtered);
    if (filtered.length > 0) {
      localStorage.setItem(`${provider}_api_key`, filtered.join(","));
    } else {
      localStorage.removeItem(`${provider}_api_key`);
    }
    if (auth.currentUser) {
      updateDoc(doc(db, "users", auth.currentUser.uid), {
        [`settings.${provider}_api_key`]: filtered.join(",")
      }).catch((err) => console.info("db_op", err));
    }
    setKeyTestResults((prev) => {
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
    const cleanGemini = geminiKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanGroq = groqKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanMistral = mistralKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanOpenai = openaiKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanOpenrouter = openrouterKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanBlackbox = blackboxKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanNvidia = nvidiaKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanBluesminds = bluesmindsKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanAivene = aiveneKeysList.map((k) => k.trim()).filter(Boolean);
    const cleanZai = zaiKeysList.map((k) => k.trim()).filter(Boolean);
    if (cleanGemini.length > 0) {
      localStorage.setItem("gemini_api_key", cleanGemini.join(","));
    } else {
      localStorage.removeItem("gemini_api_key");
    }
    if (cleanGroq.length > 0) {
      localStorage.setItem("groq_api_key", cleanGroq.join(","));
    } else {
      localStorage.removeItem("groq_api_key");
    }
    if (cleanMistral.length > 0) {
      localStorage.setItem("mistral_api_key", cleanMistral.join(","));
    } else {
      localStorage.removeItem("mistral_api_key");
    }
    if (cleanOpenai.length > 0) {
      localStorage.setItem("openai_api_key", cleanOpenai.join(","));
    } else {
      localStorage.removeItem("openai_api_key");
    }
    if (cleanOpenrouter.length > 0) {
      localStorage.setItem("openrouter_api_key", cleanOpenrouter.join(","));
    } else {
      localStorage.removeItem("openrouter_api_key");
    }
    if (cleanBlackbox.length > 0) {
      localStorage.setItem("blackbox_api_key", cleanBlackbox.join(","));
    } else {
      localStorage.removeItem("blackbox_api_key");
    }
    if (cleanNvidia.length > 0) {
      localStorage.setItem("nvidia_api_key", cleanNvidia.join(","));
    } else {
      localStorage.removeItem("nvidia_api_key");
    }
    if (cleanBluesminds.length > 0) {
      localStorage.setItem("bluesminds_api_key", cleanBluesminds.join(","));
    } else {
      localStorage.removeItem("bluesminds_api_key");
    }
    if (cleanAivene.length > 0) {
      localStorage.setItem("aivene_api_key", cleanAivene.join(","));
    } else {
      localStorage.removeItem("aivene_api_key");
    }
    if (cleanZai.length > 0) {
      localStorage.setItem("zai_api_key", cleanZai.join(","));
    } else {
      localStorage.removeItem("zai_api_key");
    }
    localStorage.setItem("ai_provider", selectedProvider);
    setHasCustomKeySaved(
      cleanGemini.length > 0 || cleanGroq.length > 0 || cleanMistral.length > 0 || cleanOpenai.length > 0 || cleanOpenrouter.length > 0 || cleanBlackbox.length > 0 || cleanNvidia.length > 0 || cleanBluesminds.length > 0 || cleanAivene.length > 0 || cleanZai.length > 0
    );
    if (auth.currentUser) {
      updateDoc(doc(db, "users", auth.currentUser.uid), {
        "settings.gemini_api_key": cleanGemini.join(","),
        "settings.groq_api_key": cleanGroq.join(","),
        "settings.mistral_api_key": cleanMistral.join(","),
        "settings.openai_api_key": cleanOpenai.join(","),
        "settings.openrouter_api_key": cleanOpenrouter.join(","),
        "settings.blackbox_api_key": cleanBlackbox.join(","),
        "settings.nvidia_api_key": cleanNvidia.join(","),
        "settings.bluesminds_api_key": cleanBluesminds.join(","),
        "settings.aivene_api_key": cleanAivene.join(","),
        "settings.zai_api_key": cleanZai.join(","),
        "settings.ai_provider": selectedProvider
      }).catch((err) => console.info("db_op", err));
    }
    setShowSettingsModal(false);
  };
  const handleResetKey = () => {
    localStorage.removeItem("gemini_api_key");
    localStorage.removeItem("groq_api_key");
    localStorage.removeItem("mistral_api_key");
    localStorage.removeItem("openai_api_key");
    localStorage.removeItem("openrouter_api_key");
    localStorage.removeItem("blackbox_api_key");
    localStorage.removeItem("nvidia_api_key");
    localStorage.removeItem("bluesminds_api_key");
    localStorage.removeItem("aivene_api_key");
    localStorage.removeItem("zai_api_key");
    localStorage.removeItem("ai_provider");
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
    setSelectedProvider("gemini");
    setHasCustomKeySaved(false);
    setKeyTestResults({});
    if (auth.currentUser) {
      updateDoc(doc(db, "users", auth.currentUser.uid), {
        "settings.gemini_api_key": "",
        "settings.groq_api_key": "",
        "settings.mistral_api_key": "",
        "settings.openai_api_key": "",
        "settings.openrouter_api_key": "",
        "settings.blackbox_api_key": "",
        "settings.nvidia_api_key": "",
        "settings.bluesminds_api_key": "",
        "settings.aivene_api_key": "",
        "settings.zai_api_key": "",
        "settings.ai_provider": "gemini"
      }).catch((err) => console.info("db_op", err));
    }
  };
  const handleCloseWelcome = () => {
    sessionStorage.setItem("vixer_welcomed", "true");
    setShowWelcomeScreen(false);
  };
  const [autoDownloadCSV, setAutoDownloadCSVState] = useState(false);
  const [autoBackup, setAutoBackupState] = useState(() => {
    try {
      return localStorage.getItem("mz_auto_backup") === "true";
    } catch (e) {
      return false;
    }
  });
  const autoBackupRef = useRef(autoBackup);
  const setAutoBackup = (val) => {
    setAutoBackupState(val);
    autoBackupRef.current = val;
    try {
      localStorage.setItem("mz_auto_backup", val ? "true" : "false");
    } catch (e) {
    }
  };
  const [mobileTab, setMobileTab] = useState("upload");
  const [returnToStartCountdown, setReturnToStartCountdown] = useState(null);
  useEffect(() => {
    if (returnToStartCountdown === null) return;
    if (returnToStartCountdown <= 0) {
      setReturnToStartCountdown(null);
      setMobileTab("upload");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const timer = setTimeout(() => {
      setReturnToStartCountdown((prev) => prev !== null ? prev - 1 : null);
    }, 1e3);
    return () => clearTimeout(timer);
  }, [returnToStartCountdown]);
  const [r2Status, setR2Status] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [embedDownloading, setEmbedDownloading] = useState(false);
  const autoDownloadCSVRef = useRef(false);
  const setAutoDownloadCSV = (val) => {
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
  const fileInputRef = useRef(null);
  const stopGenerationRef = useRef(false);
  const isProcessingLoopRef = useRef(false);
  useEffect(() => {
    if (!sharedVideoWorker) {
      sharedVideoWorker = new Worker(new URL("./src/workers/videoWorker.ts", import.meta.url), { type: "module" });
      sharedVideoWorker.postMessage({ type: "init" });
    }
    const checkResume = async () => {
      try {
        const state = await loadStateFromDB();
        if (state && state.files && state.files.length > 0) {
          console.log("Resuming batch from IndexedDB...");
          const cleanedFiles = state.files.map((f) => {
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
          await clearStateFromDB();
          setTimeout(() => {
            handleGenerateAll(false);
          }, 1e3);
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
      localStorage.setItem("match_system_theme", String(matchSystemTheme));
    } catch (e) {
    }
  }, [matchSystemTheme]);
  useEffect(() => {
    if (!matchSystemTheme) return;
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e) => {
      applyThemeWithTransition(e.matches ? "dark" : "light", false);
    };
    handleSystemThemeChange(mediaQuery);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, [matchSystemTheme]);
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch (e) {
      }
    } else {
      root.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch (e) {
      }
    }
  }, [theme]);
  const extractFramesForFile = async (file, ext) => {
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
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
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
              canvas.width = 0;
              canvas.height = 0;
              resolve([dataUrl]);
            } else {
              resolve([e.target?.result]);
            }
          };
          img.onerror = () => resolve([e.target?.result]);
          img.src = e.target?.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } else if (["mp4", "mov", "webm"].includes(ext)) {
      const frames = await extractVideoHybrid(file);
      if (frames && frames.length >= 3) {
        return [frames[0], frames[1], frames[2]];
      } else if (frames && frames.length > 0) {
        return [frames[0]];
      } else {
        throw new Error("Failed to extract video frames. Format might be unsupported or corrupted.");
      }
    } else if (ext === "svg") {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          let svgData = e.target?.result;
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const originalWidth = img.width || 1024;
            const originalHeight = img.height || 1024;
            const scale = Math.min(768 / originalWidth, 768 / originalHeight);
            canvas.width = originalWidth * scale;
            canvas.height = originalHeight * scale;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
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
    } else if (ext === "eps" || ext === "ai") {
      const clientSidePreview = await extractEPSClientSide(file);
      let uploadedUrl = null;
      let getUrlData = null;
      try {
        const fileExt = file.name.split(".").pop();
        const getUrlRes = await fetch(`/api/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || "application/postscript")}`);
        getUrlData = await getUrlRes.json().catch(() => ({}));
        if (getUrlRes.ok && getUrlData.uploadUrl && getUrlData.fileUrl) {
          console.log("Using presigned URL to upload EPS/AI file to R2:", file.name);
          const putRes = await fetch(getUrlData.uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/postscript" }
          });
          if (!putRes.ok) throw new Error(`Failed to upload to storage: ${putRes.status}`);
          uploadedUrl = getUrlData.fileUrl;
        } else {
          try {
            const { upload } = await import("@vercel/blob/client");
            const blob = await upload(file.name, file, {
              access: "public",
              handleUploadUrl: "/api/upload-vercel-blob"
            });
            uploadedUrl = blob.url;
          } catch (blobErr) {
            console.warn("Vercel Blob failed:", blobErr);
          }
        }
      } catch (uploadErr) {
        console.warn("Failed to save EPS to R2/Storage:", uploadErr);
        if (uploadErr.message === "Failed to fetch") {
          throw new Error(`Gagal upload ke Cloudflare R2 (CORS Error). Pastikan Anda telah menambahkan setting CORS di dashboard Cloudflare R2 bucket Anda.`);
        }
      }
      if (clientSidePreview) {
        return [clientSidePreview];
      }
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        if (stopGenerationRef.current) throw new Error("Cancelled by user");
        try {
          let response;
          try {
            if (uploadedUrl) {
              response = await fetch(`/api/convert-eps?t=${Date.now()}_${Math.random()}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileUrl: uploadedUrl, pathKey: getUrlData?.pathKey })
              });
            } else {
              const isVercel = window.location.hostname.includes("vercel.app") || window.location.hostname.includes("meta-zo-update.vercel.app");
              if (isVercel && file.size > 4.5 * 1024 * 1024) {
                throw new Error(
                  `Upload ke Cloudflare R2 gagal, dan file ini (${(file.size / 1024 / 1024).toFixed(1)}MB) terlalu besar untuk Vercel Fallback (Max 4.5MB).

Cek CONSOLE BROWSER (F12) untuk melihat error 'PUT'. Jika Anda melihat error CORS, pastikan Anda telah mengatur CORS di setting Bucket Cloudflare R2 Anda.`
                );
              }
              const formData = new FormData();
              formData.append("file", file);
              response = await fetch(`/api/convert-eps-multipart?t=${Date.now()}_${Math.random()}`, {
                method: "POST",
                body: formData
              });
            }
          } catch (fetchErr) {
            if (fetchErr.message === "Failed to fetch") {
              throw new Error(`Koneksi terputus (Failed to fetch). Jika menggunakan Cloudflare R2, pastikan CORS dikonfigurasi dengan benar. Jika tanpa R2, ukuran file mungkin terlalu besar untuk diproses server.`);
            }
            throw fetchErr;
          }
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            throw new Error("CONTAINER_RESTARTING: Server returned HTML instead of image");
          }
          if (!response.ok) {
            if (response.status === 413) {
              const isVercel = window.location.hostname.includes("vercel.app") || window.location.hostname.includes("meta-zo-update.vercel.app");
              if (isVercel) {
                throw new Error(
                  `File terlalu besar \xE2\u20AC\u201D Vercel menolak body > 4.5MB.

\xE2\u0153\u2026 SOLUSI: Tambahkan Cloudflare R2 ke Vercel Environment Variables:
  S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  S3_ACCESS_KEY_ID=...
  S3_SECRET_ACCESS_KEY=...
  S3_BUCKET_NAME=...
  S3_PUBLIC_URL=...

Setelah redeploy, file EPS/AI akan diupload langsung ke R2 (tanpa melalui Vercel). Lihat CLOUDFLARE_R2_SETUP.md atau cek /api/r2-status.`
                );
              }
              throw new Error(`File is too large (>500MB Server limit). Please optimize your EPS/AI file.`);
            }
            if (response.status === 500) {
              const data = await response.json().catch(() => ({}));
              throw new Error(`Ghostscript Error: ${data.error || "Failed to convert"}`);
            }
            throw new Error(`Server error (${response.status})`);
          }
          if (contentType && contentType.indexOf("image/jpeg") !== -1) {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            return [objectUrl];
          } else if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (data.error) throw new Error(data.error);
          }
          const text = await response.text().catch(() => "no text");
          throw new Error(`CONTAINER_RESTARTING_DEBUG: status=${response.status}, type=${contentType}, body=${text.substring(0, 100)}`);
        } catch (err) {
          const isNetworkOrRestart = err.message.includes("CONTAINER_RESTARTING") || err.message.includes("Server error (502)") || err.message.includes("Server error (503)") || err.message.includes("Server error (504)") || err.message.includes("Failed to fetch") || err.message.includes("network");
          const isCapacityLimit = err.message.includes("429") || err.message.includes("capacity") || err.message.includes("maximum");
          if (isNetworkOrRestart || isCapacityLimit) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.warn(`EPS conversion failed (${err.message}), retrying ${retryCount}/${maxRetries}...`);
              const delay = isCapacityLimit ? 5e3 : 2e4;
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            } else {
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
  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    const initialFiles = [];
    const allowedImageExts = ["jpg", "jpeg", "png", "webp"];
    const allowedVideoExts = ["mp4", "mov", "webm"];
    const allowedVectorExts = ["svg", "eps", "ai"];
    let targetTool = activeTool;
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (allowedImageExts.includes(ext)) {
        targetTool = ToolType.IMAGE;
        break;
      }
      if (allowedVideoExts.includes(ext)) {
        targetTool = ToolType.VIDEO;
        break;
      }
      if (allowedVectorExts.includes(ext)) {
        targetTool = ToolType.VECTOR;
        break;
      }
    }
    if (targetTool !== activeTool) {
      handleSetActiveTool(targetTool);
    }
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      let errorMsg = null;
      let isValid = false;
      if (targetTool === ToolType.IMAGE && allowedImageExts.includes(ext)) isValid = true;
      else if (targetTool === ToolType.VIDEO && allowedVideoExts.includes(ext)) isValid = true;
      else if (targetTool === ToolType.VECTOR && allowedVectorExts.includes(ext)) isValid = true;
      if (!isValid) continue;
      const isVector = allowedVectorExts.includes(ext);
      const maxVectorSize = 500 * 1024 * 1024;
      if (isVector && file.size > maxVectorSize) {
        errorMsg = `File too large. Maximum 500MB for Vector (EPS/AI). Please optimize your file below 500MB.`;
      }
      let thumbnail = null;
      if (!errorMsg) {
        if (["jpg", "jpeg", "png", "webp", "svg", "mp4", "mov", "webm"].includes(ext)) {
          thumbnail = URL.createObjectURL(file);
        }
      }
      initialFiles.push({
        id,
        file,
        title: "",
        description: "",
        keywords: [],
        adobeCategoryId: "",
        shutterstockCategory1: "",
        shutterstockCategory2: "",
        dreamstimeCategory: "",
        miriCanvasCategory: "",
        isGenerating: false,
        isExtracting: false,
        error: errorMsg,
        thumbnail,
        analysisFrames: []
      });
    }
    updateFiles((prev) => [...prev, ...initialFiles]);
    if (initialFiles.length > 0) {
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {
        }
      }
      setMobileTab("ai");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const processOneFile = async (fileItem) => {
    if (stopGenerationRef.current) return false;
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
      updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, isGenerating: true } : f));
      setTimeout(() => {
        const el = document.getElementById(`file-card-${fileItem.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 120);
      let analysisFrames = fileItem.analysisFrames;
      if (!analysisFrames || analysisFrames.length === 0) {
        updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, isExtracting: true } : f));
        const ext = fileItem.file.name.split(".").pop()?.toLowerCase() || "";
        analysisFrames = await extractFramesForFile(fileItem.file, ext);
        updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, isExtracting: false, analysisFrames } : f));
      }
      if (!analysisFrames || analysisFrames.length === 0) {
        throw new Error("Tidak ada data visual untuk dianalisis.");
      }
      let exifMetadata = fileItem.exifMetadata;
      if (!exifMetadata && fileItem.file && fileItem.file.size > 0) {
        try {
          const formData = new FormData();
          formData.append("file", fileItem.file);
          const exifRes = await fetch("/api/extract-exif", {
            method: "POST",
            body: formData
          });
          if (exifRes.ok) {
            const exifJson = await exifRes.json();
            if (exifJson.success && exifJson.metadata) {
              exifMetadata = exifJson.metadata;
              updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, exifMetadata } : f));
            }
          }
        } catch (exifErr) {
          console.warn("Failed to extract EXIF on server:", exifErr);
        }
      }
      let retryCount = 0;
      const maxRetries = 10;
      while (retryCount < maxRetries) {
        if (stopGenerationRef.current) return false;
        try {
          const kCount = keywordCount || 25;
          let modelParam = void 0;
          if (selectedProvider === "gemini") {
            modelParam = selectedGeminiModel === "auto" ? void 0 : selectedGeminiModel;
          } else if (selectedProvider === "groq") {
            modelParam = selectedGroqModel;
          } else if (selectedProvider === "nvidia") {
            modelParam = selectedNvidiaModel;
          } else if (selectedProvider === "aivene") {
            if (selectedAiveneModel === "auto") {
              const stableModels = ["gpt-4o-mini", "gemini-3.6-flash", "gemini-3.5-flash", "deepseek-v4-flash", "qwen3.5-flash"];
              modelParam = stableModels[Math.floor(Math.random() * stableModels.length)];
            } else {
              modelParam = selectedAiveneModel;
            }
          } else if (selectedProvider === "zai") {
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
          updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? {
            ...f,
            title: toSentenceCase(metadata.title),
            description: metadata.description,
            keywords: metadata.keywords,
            adobeCategoryId: metadata.category_id,
            shutterstockCategory1: metadata.shutterstock_category_1,
            shutterstockCategory2: metadata.shutterstock_category_2,
            dreamstimeCategory: "",
            miriCanvasCategory: "",
            categoryReason: metadata.category_reason,
            yolo_detected_objects: metadata.yolo_detected_objects,
            isGenerating: false,
            error: null
          } : f));
          if (!isMzLicensed) {
            incrementDailyCount(activeTool, 1);
          }
          return true;
        } catch (err) {
          const errorMessage = err.message || "Failed to contact AI";
          if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
            setIsPaused(true);
            updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? {
              ...f,
              error: "API Limit reached. Waiting to try again..."
            } : f));
            await backgroundSafeTimeout(3e4);
            setIsPaused(false);
            retryCount++;
            continue;
          }
          throw new Error(errorMessage);
        }
      }
      throw new Error("Processing failed after multiple attempts due to API limit.");
    } catch (err) {
      const errMsg = err?.message || (typeof err === "string" ? err : "Failed to process file.");
      updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? {
        ...f,
        isGenerating: false,
        isExtracting: false,
        error: errMsg
      } : f));
      return true;
    }
  };
  const processBatchFiles = async (chunk) => {
    if (stopGenerationRef.current) return false;
    try {
      if (!isMzLicensed) {
        const totalToday = getTotalDailyCount();
        if (totalToday >= getDailyLimit()) {
          setShowLimitModal(true);
          throw new Error("Limit harian telah habis.");
        }
      }
      updateFiles((prev) => prev.map((f) => chunk.find((c) => c.id === f.id) ? { ...f, isGenerating: true } : f));
      setTimeout(() => {
        if (chunk && chunk.length > 0) {
          const el = document.getElementById(`file-card-${chunk[0].id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 120);
      const itemsToProcess = [];
      for (const fileItem of chunk) {
        let frames = fileItem.analysisFrames;
        if (!frames || frames.length === 0) {
          updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, isExtracting: true } : f));
          const ext = fileItem.file.name.split(".").pop()?.toLowerCase() || "";
          try {
            frames = await extractFramesForFile(fileItem.file, ext);
            updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, isExtracting: false, analysisFrames: frames } : f));
          } catch (err) {
            const errMsg = err?.message || (typeof err === "string" ? err : "Failed to extract file.");
            updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, isExtracting: false, isGenerating: false, error: errMsg } : f));
            continue;
          }
        }
        let exifMetadata = fileItem.exifMetadata;
        if (!exifMetadata && fileItem.file && fileItem.file.size > 0) {
          try {
            const formData = new FormData();
            formData.append("file", fileItem.file);
            const exifRes = await fetch("/api/extract-exif", {
              method: "POST",
              body: formData
            });
            if (exifRes.ok) {
              const exifJson = await exifRes.json();
              if (exifJson.success && exifJson.metadata) {
                exifMetadata = exifJson.metadata;
                updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, exifMetadata } : f));
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
          updateFiles((prev) => prev.map((f) => {
            if (excluded.some((ex) => ex.id === f.id)) {
              return { ...f, isGenerating: false, isExtracting: false, error: "Limit harian telah habis (25/hari)." };
            }
            return f;
          }));
          if (remaining === 0) setShowLimitModal(true);
          finalItemsToProcess = allowed;
        }
      }
      if (finalItemsToProcess.length === 0) return true;
      let retryCount = 0;
      const maxRetries = 10;
      while (retryCount < maxRetries) {
        if (stopGenerationRef.current) return false;
        try {
          const kCount = keywordCount || 25;
          let modelParam = void 0;
          if (selectedProvider === "gemini") {
            modelParam = selectedGeminiModel === "auto" ? void 0 : selectedGeminiModel;
          } else if (selectedProvider === "groq") {
            modelParam = selectedGroqModel;
          } else if (selectedProvider === "nvidia") {
            modelParam = selectedNvidiaModel;
          } else if (selectedProvider === "aivene") {
            if (selectedAiveneModel === "auto") {
              const stableModels = ["gpt-4o-mini", "gemini-3.6-flash", "gemini-3.5-flash", "deepseek-v4-flash", "qwen3.5-flash"];
              modelParam = stableModels[Math.floor(Math.random() * stableModels.length)];
            } else {
              modelParam = selectedAiveneModel;
            }
          } else if (selectedProvider === "zai") {
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
          updateFiles((prev) => prev.map((f) => {
            const result = batchResults.find((r) => r.id === f.id);
            if (result) {
              return {
                ...f,
                title: toSentenceCase(result.metadata.title),
                description: result.metadata.description,
                keywords: result.metadata.keywords,
                adobeCategoryId: result.metadata.category_id,
                shutterstockCategory1: result.metadata.shutterstock_category_1,
                shutterstockCategory2: result.metadata.shutterstock_category_2,
                dreamstimeCategory: "",
                miriCanvasCategory: "",
                categoryReason: result.metadata.category_reason,
                yolo_detected_objects: result.metadata.yolo_detected_objects,
                isGenerating: false,
                error: null
              };
            } else if (finalItemsToProcess.some((fi) => fi.id === f.id)) {
              return { ...f, isGenerating: false, error: "Model did not return result for this asset in batch" };
            }
            return f;
          }));
          if (!isMzLicensed) {
            incrementDailyCount(activeTool, batchResults.length);
          }
          return true;
        } catch (err) {
          const errorMessage = err.message || "Failed to contact AI";
          if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
            setIsPaused(true);
            updateFiles((prev) => prev.map((f) => chunk.find((c) => c.id === f.id) ? { ...f, error: "API Limit reached. Waiting..." } : f));
            await backgroundSafeTimeout(3e4);
            setIsPaused(false);
            retryCount++;
            continue;
          }
          throw new Error(errorMessage);
        }
      }
      throw new Error("Processing failed after multiple attempts.");
    } catch (err) {
      const errMsg = err?.message || (typeof err === "string" ? err : "Failed to process file.");
      updateFiles((prev) => prev.map((f) => chunk.find((c) => c.id === f.id) ? { ...f, isGenerating: false, isExtracting: false, error: errMsg } : f));
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
      const hasAnyManualKey = geminiKeysList.length > 0 || groqKeysList.length > 0 || mistralKeysList.length > 0 || openaiKeysList.length > 0 || openrouterKeysList.length > 0 || blackboxKeysList.length > 0 || nvidiaKeysList.length > 0 || bluesmindsKeysList.length > 0 || aiveneKeysList.length > 0 || zaiKeysList.length > 0;
      if (!hasAnyManualKey) {
        alert(uiLanguage === "id" ? "Pengguna Akun Free (Kuota 25 Gambar/Hari) wajib memasukkan API Key Gemini gratis Anda sendiri di Pengaturan (\u2699\uFE0F). Dapatkan API Key gratis di Google AI Studio (1.500 gambar/hari).\n\nIngin generate otomatis tanpa repot memasukkan API Key & Unlimited? Silakan upgrade ke Akun Pro/Lisensi!" : "Free Tier users (25 Daily Limit) must provide your own free Gemini API Key in Settings (\u2699\uFE0F). Get a free API key at Google AI Studio (1,500 images/day).\n\nWant to generate without entering any API keys & with Unlimited access? Please upgrade to Pro/Licensed account!");
        setShowSettingsModal(true);
        return;
      }
    }
    const currentFilesForCheck = getFilesForTool(filesRef.current, activeTool);
    const initialPending = isRetry ? currentFilesForCheck.filter((f) => f.error) : currentFilesForCheck.filter((f) => !f.title && !f.error);
    if (!initialPending.length) return;
    setIsLoading(true);
    setMobileTab("review");
    setReturnToStartCountdown(null);
    startTabKeepAlive();
    setTimeout(() => {
      const queueEl = document.getElementById("review-queue-section");
      if (queueEl) {
        queueEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    stopGenerationRef.current = false;
    const startTime = Date.now();
    const processingLoop = async () => {
      if (isProcessingLoopRef.current) return;
      isProcessingLoopRef.current = true;
      let processedInThisRun = 0;
      try {
        while (!stopGenerationRef.current) {
          const currentFiles = getFilesForTool(filesRef.current, activeTool);
          const pending = isRetry ? currentFiles.filter((f) => f.error && !f.isExtracting) : currentFiles.filter((f) => !f.title && !f.error);
          if (pending.length === 0) {
            break;
          }
          const ready = pending.filter((f) => !f.isExtracting && !f.isGenerating);
          if (ready.length === 0) {
            await backgroundSafeTimeout(500);
            continue;
          }
          let maxBatch = 5;
          if (activeTool === ToolType.VIDEO) maxBatch = 2;
          else if (activeTool === ToolType.VECTOR) maxBatch = 3;
          const chunkSize = generationMode === GenerationMode.BATCH ? maxBatch : 1;
          const chunk = ready.slice(0, chunkSize);
          try {
            if (generationMode === GenerationMode.BATCH) {
              await processBatchFiles(chunk);
              processedInThisRun += chunk.length;
              await backgroundSafeTimeout(2e3);
            } else {
              for (const file of chunk) {
                if (stopGenerationRef.current) break;
                await processOneFile(file);
                processedInThisRun++;
                await backgroundSafeTimeout(1500);
              }
            }
          } catch (err) {
            console.error("Batch processing error:", err);
          }
          const latestFiles = getFilesForTool(filesRef.current, activeTool);
          const totalToProcess = isRetry ? latestFiles.filter((f) => f.error).length + processedInThisRun : latestFiles.filter((f) => !f.title && !f.error).length + processedInThisRun;
          setProgressInfo({
            current: processedInThisRun,
            total: totalToProcess,
            duration: Math.floor((Date.now() - startTime) / 1e3)
          });
        }
        if (!stopGenerationRef.current && processedInThisRun > 0) {
          setTriggerAutoDownload(Date.now());
        }
        setIsLoading(false);
        setIsPaused(false);
        stopTabKeepAlive();
        if (!stopGenerationRef.current && processedInThisRun > 0) {
          setReturnToStartCountdown(5);
        }
        stopGenerationRef.current = false;
        setTimeout(() => setProgressInfo(null), 5e3);
      } catch (err) {
        console.error("Processing loop error:", err);
        setIsLoading(false);
        setIsPaused(false);
        stopTabKeepAlive();
        stopGenerationRef.current = false;
      } finally {
        if (processedInThisRun > 0 && autoBackupRef.current) {
          setTimeout(() => handleCloudAutoBackup(filesRef.current), 1e3);
        }
        isProcessingLoopRef.current = false;
      }
    };
    if ("locks" in navigator) {
      navigator.locks.request("vixer-hard-processing", async () => {
        await processingLoop();
      }).catch((err) => {
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
    updateFiles((prev) => prev.map((f) => f.isGenerating ? { ...f, isGenerating: false, error: "Cancelled by user" } : f));
  };
  const handleBackupJSON = () => {
    const validFiles = files.filter((f) => f.title);
    if (!validFiles.length) return;
    const backupData = validFiles.map((f) => ({
      id: f.id,
      fileName: f.customFileName || f.file?.name || "unnamed_file",
      title: f.title,
      description: f.description,
      keywords: f.keywords,
      adobeCategoryId: f.adobeCategoryId,
      shutterstockCategory1: f.shutterstockCategory1,
      shutterstockCategory2: f.shutterstockCategory2,
      dreamstimeCategory: "",
      miriCanvasCategory: "",
      categoryReason: f.categoryReason,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `metazo_metadata_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error("Backup JSON failed", e);
    }
  };
  const handleImportJSON = (backupData) => {
    updateFiles((prev) => {
      const newFiles = [...prev];
      const uniqueBackupItems = [];
      const seenNames = /* @__PURE__ */ new Set();
      const seenIds = /* @__PURE__ */ new Set();
      backupData.forEach((item) => {
        const name = item.fileName || "unnamed_file";
        const id = item.id;
        if (!seenNames.has(name) && (!id || !seenIds.has(id))) {
          seenNames.add(name);
          if (id) seenIds.add(id);
          uniqueBackupItems.push(item);
        }
      });
      uniqueBackupItems.forEach((backupItem) => {
        const itemFileName = backupItem.fileName || "unnamed_file";
        const existingIdx = newFiles.findIndex(
          (f) => (f.customFileName || f.file?.name || "unnamed_file") === itemFileName || f.id === backupItem.id
        );
        if (existingIdx >= 0) {
          newFiles[existingIdx] = {
            ...newFiles[existingIdx],
            title: backupItem.title || newFiles[existingIdx].title,
            description: backupItem.description || newFiles[existingIdx].description,
            keywords: backupItem.keywords || newFiles[existingIdx].keywords,
            adobeCategoryId: backupItem.adobeCategoryId || newFiles[existingIdx].adobeCategoryId,
            shutterstockCategory1: backupItem.shutterstockCategory1 || newFiles[existingIdx].shutterstockCategory1,
            shutterstockCategory2: backupItem.shutterstockCategory2 || newFiles[existingIdx].shutterstockCategory2,
            dreamstimeCategory: "",
            miriCanvasCategory: "",
            categoryReason: backupItem.categoryReason || newFiles[existingIdx].categoryReason,
            isGenerating: false,
            error: null
          };
        } else {
          const ext = itemFileName.split(".").pop()?.toLowerCase();
          const isVideo = ["mp4", "mov", "avi", "mkv", "webm"].includes(ext || "");
          const dummyFile = new File([], itemFileName, { type: isVideo ? "video/mp4" : "image/jpeg" });
          newFiles.push({
            id: backupItem.id || Math.random().toString(36).substring(2, 9),
            file: dummyFile,
            customFileName: itemFileName,
            thumbnail: null,
            analysisFrames: [],
            title: backupItem.title || "",
            description: backupItem.description || "",
            keywords: backupItem.keywords || [],
            adobeCategoryId: backupItem.adobeCategoryId || "",
            shutterstockCategory1: backupItem.shutterstockCategory1 || "",
            shutterstockCategory2: backupItem.shutterstockCategory2 || "",
            dreamstimeCategory: "",
            miriCanvasCategory: "",
            categoryReason: backupItem.categoryReason || "",
            isGenerating: false,
            error: null
          });
        }
      });
      return newFiles;
    });
    alert(`Successfully imported metadata. ${backupData.length} items loaded.`);
  };
  const handleCloudAutoBackup = (filesToBackup) => {
    if (!user) return;
    const validFiles = filesToBackup.filter((f) => f.title);
    if (!validFiles.length) return;
    const backupData = validFiles.map((f) => ({
      id: f.id,
      fileName: f.customFileName || f.file?.name || "unnamed_file",
      title: f.title,
      description: f.description,
      keywords: f.keywords,
      adobeCategoryId: f.adobeCategoryId,
      shutterstockCategory1: f.shutterstockCategory1,
      shutterstockCategory2: f.shutterstockCategory2,
      dreamstimeCategory: "",
      miriCanvasCategory: "",
      categoryReason: f.categoryReason,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    const sanitizeForComparison = (items) => items.map((i) => {
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
      const isDuplicate = existingBackups.length > 0 && existingBackups[0].tool === activeTool && JSON.stringify(sanitizeForComparison(existingBackups[0].items)) === JSON.stringify(sanitizeForComparison(backupData));
      if (isDuplicate) {
        console.log("[Auto-backup] Skipped (duplicate data).");
        return;
      }
      const newLocalBackup = {
        batchId: `local-batch-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        tool: activeTool,
        items: backupData,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      existingBackups.unshift(newLocalBackup);
      if (existingBackups.length > 30) {
        existingBackups = existingBackups.slice(0, 30);
      }
      localStorage.setItem(localBackupsKey, JSON.stringify(existingBackups));
      console.log("[Local Storage] Auto-backup saved successfully.");
    } catch (localErr) {
      console.warn("[Local Storage] Auto-backup failed to save locally:", localErr);
    }
    console.log("[Supabase] Saving backup to Supabase...");
    const batchId = `batch-${Date.now()}`;
    const newBackup = {
      uid: user.uid,
      batch_id: batchId,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      tool: activeTool,
      items: JSON.stringify(backupData),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    addDoc(collection(db, "metadata_backups"), newBackup).then((docRef) => {
      console.log("[Supabase] Auto-backup saved successfully:", batchId);
    }).catch((err) => {
      console.warn("[Supabase] Auto-backup failed:", err);
    });
  };
  useEffect(() => {
    if (!autoBackup) return;
    if (!user) return;
    if (files.length === 0) return;
    const hasMetadata = files.some((f) => f.title);
    if (!hasMetadata) return;
    const timer = setTimeout(() => {
      console.log("[Cloudflare D1] Triggering debounced auto-backup for files changes...");
      handleCloudAutoBackup(files);
    }, 5e3);
    return () => clearTimeout(timer);
  }, [files, autoBackup, user?.uid]);
  const handleExport = () => {
    const toolFiles = getFilesForTool(files, activeTool);
    if (!toolFiles.length) return;
    const escapeCsv = (str) => {
      if (str === null || str === void 0) return "";
      const s = String(str).replace(/[\r\n]+/g, " ").trim();
      if (s.includes(",") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const escapeSemicolonCsv = (str) => {
      if (str === null || str === void 0) return "";
      const s = String(str).replace(/[\r\n]+/g, " ").trim();
      if (s.includes(";") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const getExportFilename = (originalName, originalFile) => {
      if (!originalFile || !originalFile.name) return originalName;
      const origExt = originalFile.name.split(".").pop()?.toLowerCase() || "";
      if (!origExt) return originalName;
      const suffix = `.${origExt}`;
      if (originalName.toLowerCase().endsWith(suffix)) {
        return originalName;
      }
      if (origExt === "jpg" && originalName.toLowerCase().endsWith(".jpeg")) {
        return originalName;
      }
      if (origExt === "jpeg" && originalName.toLowerCase().endsWith(".jpg")) {
        return originalName;
      }
      return `${originalName}.${origExt}`;
    };
    if (exportAdobe) {
      const headers = ["Filename", "Title", "Keywords", "Category"];
      const rows = toolFiles.map((f) => [
        escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
        escapeCsv(f.title || ""),
        escapeCsv((f.keywords || []).join(", ")),
        escapeCsv(String(f.adobeCategoryId || ""))
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetazoAI_Export_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (exportShutterstock) {
      const headers = ["Filename", "Description", "Keywords", "Categories", "Editorial", "Mature content", "illustration"];
      const rows = toolFiles.map((f) => {
        let combinedDescription = f.description || f.title || "";
        if (shutterstockDescMode === "title_desc" && f.description && f.title && f.title !== f.description) {
          const cleanTitle = f.title.trim().replace(/\.$/, "");
          combinedDescription = `${cleanTitle}. ${f.description.trim()}`;
        }
        return [
          escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
          escapeCsv(combinedDescription),
          escapeCsv((f.keywords || []).join(",")),
          escapeCsv([f.shutterstockCategory1, f.shutterstockCategory2].filter(Boolean).filter((c) => c.toLowerCase() !== "arts").map((c) => c.toLowerCase()).join(", ")),
          "no",
          "no",
          activeTool === ToolType.VECTOR ? "yes" : "no"
        ];
      });
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Shutterstock_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (exportVecteezy) {
      const headers = ["Filename", "Title", "Description", "Keywords", "License", "Id"];
      const rows = toolFiles.map((f) => {
        const removeSpecialChars = (str) => {
          let cleaned = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,-]/g, "");
          return cleaned.replace(/\s+/g, " ").trim();
        };
        const cleanTitle = removeSpecialChars(f.title || "");
        const titleField = escapeCsv(cleanTitle);
        const forbiddenKeywords = ["photo", "vector", "video"];
        const filteredKeywords = (f.keywords || []).map((k) => removeSpecialChars(k)).filter((k) => k.length > 0 && !forbiddenKeywords.includes(k.toLowerCase().trim()));
        const keywordsField = escapeCsv(filteredKeywords.join(", "));
        const originalFilename = getExportFilename(f.customFileName || f.file.name, f.file);
        const vecteezyFilename = originalFilename.split(" ").join("_").split("(").join("_").split(")").join("_");
        return [
          escapeCsv(vecteezyFilename),
          titleField,
          titleField,
          // Description matches Title
          keywordsField,
          "Free",
          // License automatically set to Free
          ""
          // Id left empty
        ];
      });
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Vecteezy_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (exportCanva) {
      const headers = ["filename", "title", "keywords", "description"];
      const rows = toolFiles.map((f) => {
        return [
          escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
          escapeCsv(f.title || ""),
          escapeCsv((f.keywords || []).slice(0, 20).join(",")),
          // Canva uses comma without space, max 20 keywords
          escapeCsv(f.description || f.title || "")
        ];
      });
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Canva_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (exportFreepik) {
      const headers = ["File name", "Title", "Keywords", "Prompt", "Model"];
      const rows = toolFiles.map((f) => {
        return [
          escapeSemicolonCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
          escapeSemicolonCsv(f.title || ""),
          escapeSemicolonCsv((f.keywords || []).join(",")),
          // Freepik keywords comma separated
          "",
          // Prompt
          ""
          // Model
        ];
      });
      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Freepik_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (exportPond5) {
      const headers = ["OriginalFilename", "Title", "Description", "Keywords", "Price", "Editorial"];
      const rows = toolFiles.map((f) => [
        escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
        escapeCsv(f.title || ""),
        escapeCsv(f.description || f.title || ""),
        escapeCsv((f.keywords || []).join(",")),
        "",
        "no"
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_Pond5_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (exportDepositPhotos) {
      const headers = ["Filename", "Title", "Description", "Keywords"];
      const rows = toolFiles.map((f) => [
        escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
        escapeCsv(f.title || ""),
        escapeCsv(f.description || f.title || ""),
        escapeCsv((f.keywords || []).join(","))
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_DepositPhotos_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (exportMiriCanvas) {
      const headers = ["Filename", "Name", "Keywords"];
      const rows = toolFiles.map((f) => [
        escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
        escapeCsv(f.title || ""),
        escapeCsv((f.keywords || []).join(","))
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_MiriCanvas_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
    if (export123RF) {
      const headers = ["filename", "description", "keywords"];
      const rows = toolFiles.map((f) => [
        escapeCsv(getExportFilename(f.customFileName || f.file.name, f.file)),
        escapeCsv(f.title || f.description || ""),
        escapeCsv((f.keywords || []).join(","))
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `MetaZo_123RF_${activeTool.toUpperCase()}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      link.click();
    }
  };
  const handleDownloadEmbedded = async () => {
    const toolFiles = getFilesForTool(files, activeTool);
    const completedFiles = toolFiles.filter((f) => (f.title || f.description) && f.file);
    if (completedFiles.length === 0) {
      alert(uiLanguage === "id" ? "Belum ada file dengan metadata selesai untuk diunduh." : "No completed files with metadata to embed.");
      return;
    }
    setEmbedDownloading(true);
    try {
      for (let i = 0; i < completedFiles.length; i++) {
        const item = completedFiles[i];
        const title = item.title?.trim() || item.description?.trim() || "";
        const description = item.description?.trim() || title;
        const keywords = item.keywords || [];
        const origExt = (item.file.name.split(".").pop() || "jpg").toLowerCase();
        const baseNameRaw = title || item.customFileName?.trim() || item.file.name.replace(/\.[^/.]+$/, "");
        const cleanName = baseNameRaw.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() || "asset";
        const exportName = `${cleanName}.${origExt}`;
        let downloaded = false;
        try {
          const formData = new FormData();
          formData.append("file", item.file, exportName);
          formData.append("title", title);
          formData.append("description", description);
          formData.append("keywords", JSON.stringify(keywords));
          if (commonAiOptions?.model) formData.append("model", commonAiOptions.model);
          const reqHeaders = { ...getHeaders(commonAiOptions) };
          delete reqHeaders["Content-Type"];
          const resp = await fetch("/api/embed-metadata", {
            method: "POST",
            headers: reqHeaders,
            body: formData
          });
          if (resp.ok) {
            const contentType = resp.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const data = await resp.json();
              if (data.downloadUrl) {
                window.open(data.downloadUrl, "_blank");
                downloaded = true;
              }
            } else {
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = exportName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 2e3);
              downloaded = true;
            }
          } else {
            const errData = await resp.json().catch(() => ({}));
            console.error("[Download Embedded] Server error:", errData);
            throw new Error(errData.error || `Server status ${resp.status}`);
          }
        } catch (serverErr) {
          console.warn("[Download Embedded] Server embed failed, trying client fallback:", serverErr);
        }
        if (!downloaded && (item.file.type === "image/jpeg" || item.file.name.toLowerCase().endsWith(".jpg") || item.file.name.toLowerCase().endsWith(".jpeg"))) {
          try {
            const dataUri = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(item.file);
            });
            let zeroth = {};
            let exif = {};
            let gps = {};
            try {
              const existing = piexif.load(dataUri);
              zeroth = existing["0th"] || {};
              exif = existing["Exif"] || {};
              gps = existing["GPS"] || {};
            } catch (_) {
            }
            const toUcs2Bytes = (str) => {
              const bytes = [];
              for (let i2 = 0; i2 < str.length; i2++) {
                const code = str.charCodeAt(i2);
                bytes.push(code & 255, code >> 8 & 255);
              }
              bytes.push(0, 0);
              return bytes;
            };
            zeroth[piexif.ImageIFD.ImageDescription] = description;
            zeroth[piexif.ImageIFD.XPTitle] = toUcs2Bytes(title);
            zeroth[piexif.ImageIFD.XPComment] = toUcs2Bytes(description);
            zeroth[piexif.ImageIFD.XPKeywords] = toUcs2Bytes(keywords.join("; "));
            zeroth[piexif.ImageIFD.Software] = "MetaZo AI Assistant";
            const exifBytes = piexif.dump({ "0th": zeroth, "Exif": exif, "GPS": gps });
            const newImageDataUri = piexif.insert(exifBytes, dataUri);
            const byteString = atob(newImageDataUri.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let b = 0; b < byteString.length; b++) {
              ia[b] = byteString.charCodeAt(b);
            }
            const blob = new Blob([ab], { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = exportName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2e3);
            downloaded = true;
          } catch (clientErr) {
            console.error("[Download Embedded] Client fallback error:", clientErr);
          }
        }
        if (!downloaded && (item.file.type === "image/svg+xml" || item.file.name.toLowerCase().endsWith(".svg"))) {
          try {
            let svgText = await item.file.text();
            const escapeXml = (unsafe) => unsafe.replace(/[<>&'"]/g, (c) => {
              switch (c) {
                case "<":
                  return "&lt;";
                case ">":
                  return "&gt;";
                case "&":
                  return "&amp;";
                case "'":
                  return "&apos;";
                case '"':
                  return "&quot;";
                default:
                  return c;
              }
            });
            const titleTag = `<title>${escapeXml(title)}</title>`;
            const descTag = `<desc>${escapeXml(description)}</desc>`;
            const keywordsXml = keywords.map((k) => `<rdf:li>${escapeXml(k)}</rdf:li>`).join("");
            const metadataTag = `<metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:Description><dc:title>${escapeXml(title)}</dc:title><dc:description>${escapeXml(description)}</dc:description><dc:subject><rdf:Bag>${keywordsXml}</rdf:Bag></dc:subject><dc:format>image/svg+xml</dc:format></rdf:Description></rdf:RDF></metadata>`;
            svgText = svgText.replace(/<title[\s\S]*?<\/title>/gi, "").replace(/<desc[\s\S]*?<\/desc>/gi, "").replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
            if (/<svg[^>]*>/i.test(svgText)) {
              svgText = svgText.replace(/(<svg[^>]*>)/i, `$1
  ${titleTag}
  ${descTag}
  ${metadataTag}`);
              const blob = new Blob([svgText], { type: "image/svg+xml" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = exportName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 2e3);
              downloaded = true;
            }
          } catch (svgErr) {
            console.error("[Download Embedded] SVG client fallback error:", svgErr);
          }
        }
        if (completedFiles.length > 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } catch (e) {
      console.error("[Download Embedded] Error:", e);
    } finally {
      setEmbedDownloading(false);
    }
  };
  const handleDeleteFile = (id) => {
    const fileItem = files.find((f) => f.id === id);
    if (fileItem && fileItem.analysisFrames) {
      fileItem.analysisFrames.forEach((frame) => {
        if (frame.startsWith("blob:")) {
          URL.revokeObjectURL(frame);
        }
      });
    }
    updateFiles((prev) => prev.filter((f) => f.id !== id));
  };
  const handleRegenerateFile = async (fileItem) => {
    updateFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, error: null, title: "", isGenerating: false, isExtracting: false } : f));
    setTimeout(() => {
      handleGenerateAll();
    }, 100);
  };
  const t = TRANSLATIONS[uiLanguage];
  if (isCheckingAuth) {
    return /* @__PURE__ */ jsx("div", { className: `min-h-screen flex items-center justify-center bg-[#f8f9fc] dark:bg-[#090d16] text-[#5a5c69] dark:text-slate-100 ${theme === "dark" ? "dark" : ""}`, children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center space-y-4 animate-pulse", children: [
      /* @__PURE__ */ jsx(Loader2, { size: 40, className: "animate-spin text-[#7c3aed]" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500", children: "Memuat MetaZo PRO..." })
    ] }) });
  }
  if (!user) {
    return /* @__PURE__ */ jsx(
      LoginScreen,
      {
        onLoginSuccess: (loggedInUser) => {
          setUser(loggedInUser);
        },
        theme,
        setTheme: handleSetTheme,
        language: uiLanguage,
        setLanguage: setUiLanguage,
        t
      }
    );
  }
  const currentToolFiles = getFilesForTool(files, activeTool);
  const hasFiles = currentToolFiles.length > 0;
  const filesToGenerateCount = currentToolFiles.filter((f) => !f.title && !f.error && !f.isExtracting).length;
  const filesWithErrorCount = currentToolFiles.filter((f) => f.error).length;
  const isAnythingGenerating = currentToolFiles.some((f) => f.isGenerating || f.isExtracting);
  const canDownload = hasFiles && currentToolFiles.some((f) => f.title);
  const successfulFilesCount = currentToolFiles.filter((f) => f.title).length;
  const isAllFinished = hasFiles && !isAnythingGenerating && currentToolFiles.every((f) => f.title || f.error);
  const getDiscountedPriceAuto = (priceStr, discountPercent) => {
    if (!priceStr || typeof priceStr !== "string") return priceStr;
    const cleanNumStr = priceStr.replace(/[^0-9]/g, "");
    if (!cleanNumStr) return priceStr;
    const originalVal = parseInt(cleanNumStr, 10);
    if (isNaN(originalVal)) return priceStr;
    const discountedVal = Math.round(originalVal * (1 - discountPercent / 100));
    if (priceStr.startsWith("Rp")) {
      const formatted = new Intl.NumberFormat("id-ID").format(discountedVal);
      return `Rp. ${formatted}`;
    } else if (priceStr.includes("$")) {
      return `$${discountedVal}`;
    }
    return priceStr;
  };
  const isPromoActive = /* @__PURE__ */ new Date() < /* @__PURE__ */ new Date("2026-07-01T00:00:00+07:00");
  const price30DaysRaw = localStorage.getItem("mz_price_30_days") || "Rp 50.000";
  const priceUnlimitedRaw = localStorage.getItem("mz_price_unlimited") || "Rp 250.000";
  const price30DaysUSDRaw = localStorage.getItem("mz_price_30_days_usd") || "$2";
  const priceUnlimitedUSDRaw = localStorage.getItem("mz_price_unlimited_usd") || "$14";
  const autoPricingTierId = isPromoActive ? `30 Hari ${getDiscountedPriceAuto(price30DaysRaw, 30)} - Unlimited ${getDiscountedPriceAuto(priceUnlimitedRaw, 30)}` : `30 Hari ${price30DaysRaw} - Unlimited ${priceUnlimitedRaw}`;
  const autoPricingTierEn = isPromoActive ? `30 Days ${getDiscountedPriceAuto(price30DaysUSDRaw, 30)} - Unlimited ${getDiscountedPriceAuto(priceUnlimitedUSDRaw, 30)}` : `30 Days ${price30DaysUSDRaw} - Unlimited ${priceUnlimitedUSDRaw}`;
  const autoPricingTier = uiLanguage === "id" ? autoPricingTierId : autoPricingTierEn;
  const globalModelParam = selectedProvider === "gemini" ? selectedGeminiModel === "auto" ? void 0 : selectedGeminiModel : selectedProvider === "groq" ? selectedGroqModel : selectedProvider === "nvidia" ? selectedNvidiaModel : selectedProvider === "aivene" ? selectedAiveneModel === "auto" ? "gpt-4o-mini" : selectedAiveneModel : selectedProvider === "zai" ? selectedZaiModel : void 0;
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
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `min-h-[100dvh] flex bg-[#f8f9fc] dark:bg-[#090d16] text-[#5a5c69] dark:text-slate-100 ${theme === "dark" ? "dark" : ""} relative overflow-hidden transition-colors duration-500`,
      onDragOver: (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      },
      onDragLeave: (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsDragging(false);
        }
      },
      onDrop: (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const isMainTool = [ToolType.DASHBOARD, ToolType.PROMPT_GEN, ToolType.IMAGE, ToolType.VIDEO, ToolType.VECTOR].includes(activeTool);
          if (isMainTool) {
            handleFileChange({ target: { files: e.dataTransfer.files } });
          } else {
            const dropEvent = new CustomEvent("globalFileDrop", { detail: { files: e.dataTransfer.files } });
            window.dispatchEvent(dropEvent);
          }
        }
      },
      children: [
        isDragging && /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 z-[9999] bg-white/40 dark:bg-[#090d16]/70 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none transition-all duration-300", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-6 border-4 border-dashed border-indigo-500/50 dark:border-indigo-400/40 rounded-[2.5rem] animate-pulse pointer-events-none" }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-900/90 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-bounce shadow-indigo-500/20 dark:shadow-indigo-500/10 border border-slate-200 dark:border-white/10 backdrop-blur-xl", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative w-28 h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30 overflow-hidden", children: [
              /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-white/20 dark:bg-black/10 animate-pulse" }),
              /* @__PURE__ */ jsx("svg", { className: "w-12 h-12 text-white relative z-10", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.5, d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" }) })
            ] }),
            /* @__PURE__ */ jsx("h2", { className: "text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 dark:from-indigo-400 dark:via-purple-400 dark:to-rose-400 uppercase tracking-[0.1em]", children: "Drop Files Here" }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-bold mt-3 text-sm uppercase tracking-wider", children: "Anywhere in the application area" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 overflow-hidden pointer-events-none select-none z-0", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute top-[8%] left-[4%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-purple-900/15 blur-[120px] animate-blob-1" }),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-[12%] right-[6%] w-[600px] h-[600px] rounded-full bg-emerald-400/8 dark:bg-pink-950/10 blur-[140px] animate-blob-2" }),
          /* @__PURE__ */ jsx("div", { className: "absolute top-[40%] left-[30%] w-[450px] h-[450px] rounded-full bg-rose-400/8 dark:bg-blue-950/15 blur-[130px] animate-blob-3" }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 grid-bg opacity-70" }),
          /* @__PURE__ */ jsx(Meteors, { number: 16 })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-1 w-full bg-transparent overflow-hidden relative z-10", children: [
          /* @__PURE__ */ jsx(
            Sidebar,
            {
              activeTool,
              setActiveTool: handleSetActiveTool,
              sidebarCollapsed,
              setSidebarCollapsed,
              sidebarOpen,
              setSidebarOpen,
              generationMode,
              setGenerationMode,
              t,
              filesLength: files.length,
              isLicensed: isMzLicensed,
              isCheckingLicense,
              setShowActivation: setShowActivationModal,
              onUnlockReseller: () => {
                if (isAdminAccount) {
                  setShowSettingsModal(true);
                  setActiveSettingsTab("reseller");
                }
              },
              appName: mzAppName,
              unreadChatCount,
              onShowAbout: () => setShowAboutModal(true),
              onComingSoon: (feature) => setComingSoonFeature(feature)
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto", children: [
            /* @__PURE__ */ jsx(
              Topbar,
              {
                searchQuery,
                setSearchQuery,
                theme,
                setTheme: handleSetTheme,
                sidebarOpen,
                setSidebarOpen,
                setShowInfoModal,
                setShowSettingsModal,
                t,
                setShowActivation: setShowActivationModal,
                isLicensed: !!isMzLicensed,
                isCheckingLicense,
                uiLanguage,
                setUiLanguage,
                user,
                activeAccountsCount,
                activeUsers,
                onSignOut: async () => {
                  try {
                    if (auth.currentUser) {
                      const userRef = doc(db, "users", auth.currentUser.uid);
                      await updateDoc(userRef, { lastSeen: 0 }).catch(() => console.info("onSignOut update error"));
                    }
                    await signOut(auth);
                    localStorage.removeItem("mz_offline_user");
                    localStorage.removeItem("mz_license_key");
                    localStorage.removeItem("mz_trial_start");
                    setUser(null);
                    setMzLicenseKey("");
                    setIsMzLicensed(false);
                    setHasSyncedProfile(false);
                    setIsCheckingLicense(true);
                    setHasInitiallyLoaded(false);
                  } catch (err) {
                    console.error("Sign out error", err);
                  }
                }
              }
            ),
            /* @__PURE__ */ jsx("main", { className: "flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full relative", children: /* @__PURE__ */ jsx(AnimatePresence, { mode: "wait", children: /* @__PURE__ */ jsx(
              motion.div,
              {
                initial: { opacity: 0, y: 10, filter: "blur(4px)" },
                animate: { opacity: 1, y: 0, filter: "blur(0px)" },
                exit: { opacity: 0, y: -10, filter: "blur(4px)" },
                transition: { duration: 0.3, ease: "easeOut" },
                className: "w-full h-full",
                children: activeTool === ToolType.DASHBOARD ? /* @__PURE__ */ jsx(
                  DashboardView,
                  {
                    userName: user?.displayName || user?.email?.split("@")[0] || "",
                    files,
                    setActiveTool: handleSetActiveTool,
                    setShowInfoModal,
                    successfulFilesCount,
                    filesToGenerateCount,
                    filesWithErrorCount,
                    unprocessedFilesCount: filesToGenerateCount,
                    generationMode,
                    isLicensed: isMzLicensed,
                    appName: mzAppName,
                    pricingTier: autoPricingTier,
                    whatsAppLink: mzWhatsApp,
                    setShowActivation: setShowActivationModal,
                    imageDailyCount: dailyGenCounts[ToolType.IMAGE] || 0,
                    videoDailyCount: dailyGenCounts[ToolType.VIDEO] || 0,
                    vectorDailyCount: dailyGenCounts[ToolType.VECTOR] || 0,
                    t,
                    trialDaysLeft,
                    promoCodes: promoCodesForModal
                  }
                ) : activeTool === ToolType.PROMPT_GEN ? /* @__PURE__ */ jsx(
                  PromptGenView,
                  {
                    t,
                    uiLanguage,
                    prefilledSubject,
                    onPrefillConsumed: () => setPrefilledSubject(""),
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.PROMPT_GEN] || 0,
                    incrementDailyCount: () => incrementDailyCount(ToolType.PROMPT_GEN),
                    aiOptions: commonAiOptions,
                    user,
                    db
                  }
                ) : activeTool === ToolType.PROMPT_IMAGE ? /* @__PURE__ */ jsx(
                  PromptImageView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.PROMPT_IMAGE] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE, amount),
                    setShowLimitModal,
                    aiOptions: commonAiOptions,
                    uiLanguage
                  }
                ) : activeTool === ToolType.PROMPT_VIDEO ? /* @__PURE__ */ jsx(
                  PromptVideoView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.PROMPT_VIDEO] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.PROMPT_VIDEO, amount),
                    setShowLimitModal,
                    aiOptions: commonAiOptions,
                    user,
                    db,
                    uiLanguage
                  }
                ) : activeTool === ToolType.PROMPT_IMAGE_CHECK ? /* @__PURE__ */ jsx(
                  ImageCheckView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.PROMPT_IMAGE_CHECK] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.PROMPT_IMAGE_CHECK, amount),
                    setShowLimitModal,
                    setShowActivationModal,
                    onSendToMetadataGen: (passedFiles) => {
                      if (passedFiles && passedFiles.length > 0) {
                        handleFileChange({ target: { files: passedFiles } });
                      }
                    },
                    aiOptions: commonAiOptions,
                    user,
                    db
                  }
                ) : activeTool === ToolType.PROMPT_VIDEO_CHECK ? /* @__PURE__ */ jsx(
                  VideoQualityCheck,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.PROMPT_VIDEO_CHECK] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.PROMPT_VIDEO_CHECK, amount),
                    setShowLimitModal,
                    setShowActivationModal,
                    aiOptions: commonAiOptions,
                    user,
                    db
                  }
                ) : activeTool === ToolType.CALENDAR_GEN ? /* @__PURE__ */ jsx(
                  CalendarGenView,
                  {
                    t,
                    onSendToPrompt: (text) => {
                      setPrefilledSubject(text);
                      handleSetActiveTool(ToolType.PROMPT_GEN);
                    },
                    aiOptions: commonAiOptions
                  }
                ) : activeTool === ToolType.MUTE_VIDEO ? /* @__PURE__ */ jsx(
                  MuteVideoView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.MUTE_VIDEO] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.MUTE_VIDEO, amount),
                    setShowLimitModal,
                    setShowActivationModal
                  }
                ) : activeTool === ToolType.BG_REMOVER ? /* @__PURE__ */ jsx(
                  BgRemoverView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.BG_REMOVER] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.BG_REMOVER, amount),
                    setShowLimitModal,
                    setShowActivationModal,
                    onSendToMetadataGen: (passedFiles) => {
                      if (passedFiles && passedFiles.length > 0) {
                        handleFileChange({ target: { files: passedFiles } });
                        handleSetActiveTool(ToolType.IMAGE);
                      }
                    },
                    uiLanguage
                  }
                ) : activeTool === ToolType.MOTION_GEN ? /* @__PURE__ */ jsx(
                  MotionGenView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.MOTION_GEN] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.MOTION_GEN, amount),
                    setShowLimitModal,
                    setShowActivationModal,
                    aiOptions: commonAiOptions
                  }
                ) : activeTool === ToolType.ANTI_SPAM ? /* @__PURE__ */ jsx(
                  AntiSpamView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    dailyGenCount: dailyGenCounts[ToolType.ANTI_SPAM] || 0,
                    incrementDailyCount: (amount = 1) => incrementDailyCount(ToolType.ANTI_SPAM, amount),
                    setShowLimitModal,
                    setShowActivationModal
                  }
                ) : activeTool === ToolType.REVIEWS ? /* @__PURE__ */ jsx(
                  ReviewsView,
                  {
                    t,
                    user,
                    isLicensed: isMzLicensed,
                    appName: mzAppName,
                    onOpenDashboard: () => handleSetActiveTool(ToolType.DASHBOARD)
                  }
                ) : activeTool === ToolType.FTP_UPLOADER ? /* @__PURE__ */ jsx(
                  FtpUploaderView,
                  {
                    t,
                    isLicensed: isMzLicensed,
                    onNavigateToMetadata: () => handleSetActiveTool(ToolType.IMAGE),
                    uiLanguage,
                    setShowActivationModal
                  }
                ) : /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-1 relative overflow-hidden border-b border-slate-200 dark:border-white/5 pb-4", children: [
                    isLoading && progressInfo && /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: "absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-300 ease-out z-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                        style: { width: `${progressInfo.current / progressInfo.total * 100}%` }
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
                        /* @__PURE__ */ jsx("h2", { className: "text-2xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3", children: activeTool === ToolType.IMAGE ? /* @__PURE__ */ jsxs(Fragment, { children: [
                          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/10", children: /* @__PURE__ */ jsx(ImageIcon, { className: "text-violet-500 dark:text-violet-400", size: 20, strokeWidth: 2.5 }) }),
                          /* @__PURE__ */ jsx("span", { className: "bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400", children: "Image AI Workspace" })
                        ] }) : activeTool === ToolType.VIDEO ? /* @__PURE__ */ jsxs(Fragment, { children: [
                          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10", children: /* @__PURE__ */ jsx(Film, { className: "text-purple-500 dark:text-purple-400", size: 20, strokeWidth: 2.5 }) }),
                          /* @__PURE__ */ jsx("span", { className: "bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-fuchsia-600 dark:from-purple-400 dark:to-fuchsia-400", children: "Video AI Workspace" })
                        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-[1.25rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10", children: /* @__PURE__ */ jsx(FileCode, { className: "text-emerald-500 dark:text-emerald-400", size: 20, strokeWidth: 2.5 }) }),
                          /* @__PURE__ */ jsx("span", { className: "bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400", children: "Vector AI Workspace" })
                        ] }) }),
                        /* @__PURE__ */ jsx(
                          FeatureGuideButton,
                          {
                            title: activeTool === ToolType.IMAGE ? t.guide_image_title : activeTool === ToolType.VIDEO ? t.guide_video_title : t.guide_vector_title,
                            description: activeTool === ToolType.IMAGE ? t.guide_image_desc : activeTool === ToolType.VIDEO ? t.guide_video_desc : t.guide_vector_desc,
                            t
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400 dark:text-slate-500 font-extrabold mt-1.5 uppercase tracking-widest ml-[52px]", children: [
                        activeTool === ToolType.IMAGE && "JPG, PNG & WEBP metadata optimizer",
                        activeTool === ToolType.VIDEO && "Frame sequential MP4/MOV metadata assistant",
                        activeTool === ToolType.VECTOR && "EPS, SVG & AI graphic indexing assistant"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "px-3.5 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 rounded-xl font-bold text-xs flex items-center space-x-2 text-slate-600 dark:text-slate-300 shadow-sm", children: [
                      /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full animate-pulse ${activeTool === ToolType.IMAGE ? "bg-violet-500" : activeTool === ToolType.VIDEO ? "bg-purple-500" : "bg-emerald-500"}` }),
                      /* @__PURE__ */ jsxs("span", { className: "text-[11px] uppercase tracking-wide", children: [
                        activeTool === ToolType.IMAGE && "Supports: JPEG, PNG, WEBP",
                        activeTool === ToolType.VIDEO && "Supports: MP4, MOV, WEBM",
                        activeTool === ToolType.VECTOR && "Supports: SVG, EPS, AI"
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    MetricsRow,
                    {
                      filesLength: files.length,
                      successfulFilesCount,
                      filesToGenerateCount,
                      filesWithErrorCount
                    }
                  ),
                  [ToolType.VECTOR, ToolType.VIDEO, ToolType.IMAGE, ToolType.MUTE_VIDEO].includes(activeTool) && r2Status === false && /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 px-4 py-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300 animate-in fade-in slide-in-from-top-2 duration-300", children: [
                    /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 mt-0.5 shrink-0", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }),
                    /* @__PURE__ */ jsxs("div", { className: "text-xs leading-relaxed", children: [
                      /* @__PURE__ */ jsx("span", { className: "font-black uppercase tracking-wide", children: metadataLanguage === "Bahasa" ? "Cloudflare R2 belum dikonfigurasi." : "Cloudflare R2 is not configured." }),
                      " ",
                      metadataLanguage === "Bahasa" ? "Vercel membatasi ukuran request maksimum 4.5MB. Agar file besar (Video/EPS/Gambar) tidak gagal upload, silakan tambahkan kredensial R2 di Settings menu." : "Vercel limits payload uploads to 4.5MB. To process large files (Videos/EPS/Images) without issues, please add R2 credentials in the Settings menu.",
                      " ",
                      /* @__PURE__ */ jsxs("span", { className: "font-semibold", children: [
                        "Tambahkan ",
                        /* @__PURE__ */ jsx("code", { className: "bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]", children: "S3_ENDPOINT" }),
                        ",",
                        " ",
                        /* @__PURE__ */ jsx("code", { className: "bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]", children: "S3_ACCESS_KEY_ID" }),
                        ",",
                        " ",
                        /* @__PURE__ */ jsx("code", { className: "bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]", children: "S3_SECRET_ACCESS_KEY" }),
                        ",",
                        " ",
                        /* @__PURE__ */ jsx("code", { className: "bg-amber-400/20 px-1 py-0.5 rounded font-mono text-[10px]", children: "S3_BUCKET_NAME" }),
                        " ",
                        "ke Vercel Environment Variables lalu redeploy."
                      ] }),
                      " ",
                      "Lihat ",
                      /* @__PURE__ */ jsx("span", { className: "font-mono font-bold underline cursor-pointer", onClick: () => window.open("/api/r2-status", "_blank"), children: "/api/r2-status" }),
                      " untuk cek konfigurasi."
                    ] }),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => setR2Status(null),
                        className: "ml-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none cursor-pointer",
                        title: "Tutup",
                        children: "\xC3\u2014"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "flex lg:hidden w-full bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/80 dark:border-white/5", children: [
                    { tab: "upload", label: "1. Upload" },
                    { tab: "ai", label: "2. AI Config" },
                    { tab: "review", label: "3. Queue" }
                  ].map(({ tab, label }) => /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => setMobileTab(tab),
                      className: `flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${mobileTab === tab ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`,
                      children: label
                    },
                    tab
                  )) }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start", children: [
                    /* @__PURE__ */ jsx(
                      UploadPanel,
                      {
                        activeTool,
                        isDragging,
                        setIsDragging,
                        handleFileChange,
                        fileInputRef,
                        files: currentToolFiles,
                        setPreviewFile,
                        updateFiles,
                        mobileTab,
                        setMobileTab,
                        t
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      AiConfigPanel,
                      {
                        activeTool,
                        customPrompt,
                        setCustomPrompt,
                        keywordCount,
                        setKeywordCount,
                        keywordMode,
                        setKeywordMode,
                        titleLength,
                        setTitleLength,
                        metadataLanguage,
                        setMetadataLanguage,
                        aiCreativity,
                        setAiCreativity,
                        aiModelPerformance,
                        setAiModelPerformance,
                        isLoading,
                        progressInfo,
                        isPaused,
                        filesToGenerateCount,
                        filesWithErrorCount,
                        handleGenerateAll,
                        handleStopGeneration,
                        mobileTab,
                        setMobileTab,
                        t,
                        hasFiles: currentToolFiles.length > 0
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx(
                    ReviewQueue,
                    {
                      files: currentToolFiles,
                      activeTool,
                      searchQuery,
                      setSearchQuery,
                      setPreviewFile,
                      updateFiles,
                      handleDeleteFile,
                      handleRegenerateFile,
                      mobileTab,
                      setMobileTab,
                      t,
                      isAllFinished,
                      successfulFilesCount,
                      canDownload,
                      isLoading,
                      progressInfo,
                      keywordCount,
                      aiOptions: commonAiOptions
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: mobileTab === "review" ? "block animate-in fade-in slide-in-from-bottom-5 duration-300" : "hidden lg:block", children: [
                    hasFiles && /* @__PURE__ */ jsx(
                      ExportPanel,
                      {
                        exportAdobe,
                        setExportAdobe,
                        exportShutterstock,
                        setExportShutterstock,
                        exportVecteezy,
                        setExportVecteezy,
                        exportCanva,
                        setExportCanva,
                        exportFreepik,
                        setExportFreepik,
                        exportPond5,
                        setExportPond5,
                        exportDepositPhotos,
                        setExportDepositPhotos,
                        exportMiriCanvas,
                        setExportMiriCanvas,
                        export123RF,
                        setExport123RF,
                        shutterstockDescMode,
                        setShutterstockDescMode,
                        autoDownloadCSV,
                        setAutoDownloadCSV: setAutoDownloadCSVState,
                        canDownload,
                        handleExport,
                        handleBackupJSON,
                        handleDownloadEmbedded,
                        embedDownloading,
                        t
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      BackupManagerPanel,
                      {
                        user,
                        db,
                        isLicensed: isMzLicensed,
                        handleBackupJSON,
                        handleImportJSON,
                        autoBackup,
                        setAutoBackup,
                        activeTool,
                        handleCloudBackup: () => handleCloudAutoBackup(files)
                      }
                    )
                  ] })
                ] })
              },
              activeTool
            ) }) }),
            /* @__PURE__ */ jsx("footer", { className: "text-center py-6 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#090d16] mt-auto", children: /* @__PURE__ */ jsxs("p", { children: [
              t.footer_text,
              " | v1.3.0 PRO"
            ] }) })
          ] }),
          previewFile && /* @__PURE__ */ jsx(
            FilePreview,
            {
              fileItem: previewFile,
              onClose: () => setPreviewFile(null),
              setFiles,
              setPreviewFile
            }
          ),
          showWelcomeScreen && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/5 text-center flex flex-col items-center", children: [
            /* @__PURE__ */ jsx("div", { className: "w-12 h-12 mb-4 bg-[#7c3aed] rounded-[1.5rem] flex items-center justify-center shadow animate-pulse", children: /* @__PURE__ */ jsx(Zap, { className: "text-white fill-white", size: 24 }) }),
            /* @__PURE__ */ jsx("h2", { className: "text-sm font-black text-[#7c3aed] mb-2 uppercase", children: t.welcome_title }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mb-6 font-semibold bg-emerald-500/5 px-2 py-1 rounded", children: t.welcome_subtitle }),
            /* @__PURE__ */ jsxs("div", { className: "text-left w-full mb-6", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2", children: t.welcome_features_label }),
              /* @__PURE__ */ jsxs("ul", { className: "text-[10px] text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4", children: [
                /* @__PURE__ */ jsx("li", { children: t.welcome_feature1 }),
                /* @__PURE__ */ jsx("li", { children: t.welcome_feature2 }),
                /* @__PURE__ */ jsx("li", { children: t.welcome_feature3 }),
                /* @__PURE__ */ jsx("li", { children: t.welcome_feature4 })
              ] })
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: handleCloseWelcome, className: "w-full py-2.5 bg-[#7c3aed] hover:bg-violet-600 text-white font-bold rounded-2xl text-xs uppercase", children: t.welcome_get_started })
          ] }) }),
          showInfoModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150", onClick: () => setShowInfoModal(false), children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative", onClick: (e) => e.stopPropagation(), children: [
            /* @__PURE__ */ jsx("button", { onClick: () => setShowInfoModal(false), className: "absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full", children: /* @__PURE__ */ jsx(X, { size: 14 }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-200 dark:border-white/5", children: [
              /* @__PURE__ */ jsx("span", { className: "p-1.5 bg-violet-500/10 rounded-2xl", children: /* @__PURE__ */ jsx(Info, { size: 16, className: "text-[#7c3aed]" }) }),
              /* @__PURE__ */ jsx("h2", { className: "text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider", children: t.info_modal_title })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "font-extrabold text-[#7c3aed] dark:text-violet-400 uppercase tracking-wider mb-2 text-[11px]", children: t.info_modal_operational_guide }),
                /* @__PURE__ */ jsxs("ol", { className: "space-y-2.5 list-decimal pl-4", children: [
                  /* @__PURE__ */ jsxs("li", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_step1_title }),
                    /* @__PURE__ */ jsxs("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5", children: [
                      t.info_modal_step1_desc_p1,
                      " ",
                      /* @__PURE__ */ jsx("strong", { className: "text-[#7c3aed]", children: "Image" }),
                      ", ",
                      /* @__PURE__ */ jsx("strong", { className: "text-purple-500", children: "Video" }),
                      ", ",
                      t.common_or,
                      " ",
                      /* @__PURE__ */ jsx("strong", { className: "text-emerald-500", children: "Vector" }),
                      " ",
                      t.info_modal_step1_desc_p2
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("li", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_step2_title }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5", children: t.info_modal_step2_desc })
                  ] }),
                  /* @__PURE__ */ jsxs("li", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_step3_title }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-bold italic text-violet-500 bg-violet-500/5 p-1 rounded", children: t.info_modal_step3_desc_highlight }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-1", children: t.info_modal_step3_desc_main })
                  ] }),
                  /* @__PURE__ */ jsxs("li", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_step4_title }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5", children: t.info_modal_step4_desc })
                  ] }),
                  /* @__PURE__ */ jsxs("li", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_step5_title }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5", children: t.info_modal_step5_desc })
                  ] }),
                  /* @__PURE__ */ jsxs("li", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_step6_title }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5", children: t.info_modal_step6_desc })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "pt-2 border-t border-slate-100 dark:border-white/5", children: [
                /* @__PURE__ */ jsx("h3", { className: "font-extrabold text-emerald-500 uppercase tracking-wider mb-2 text-[11px]", children: t.info_modal_tips_title }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-2.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "p-2.5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-black text-slate-800 dark:text-white text-[10px] uppercase", children: t.info_modal_std_mode_title }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5", children: t.info_modal_std_mode_desc })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "p-2.5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-black text-slate-800 dark:text-white text-[10px] uppercase", children: t.info_modal_batch_mode_title }),
                    /* @__PURE__ */ jsx("p", { className: "font-medium text-slate-500 dark:text-slate-400 mt-0.5", children: t.info_modal_batch_mode_desc })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "pt-2 border-t border-slate-100 dark:border-white/5", children: [
                /* @__PURE__ */ jsx("h3", { className: "font-extrabold text-[#7c3aed] dark:text-violet-400 uppercase tracking-wider mb-2 text-[11px]", children: t.info_modal_trial_premium_title }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed", children: [
                  /* @__PURE__ */ jsxs("p", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_trial_mode_label }),
                    " ",
                    t.info_modal_trial_mode_desc
                  ] }),
                  /* @__PURE__ */ jsxs("p", { children: [
                    /* @__PURE__ */ jsx("strong", { className: "text-slate-800 dark:text-white", children: t.info_modal_premium_mode_label }),
                    " ",
                    t.info_modal_premium_mode_desc
                  ] }),
                  /* @__PURE__ */ jsx("p", { children: t.info_modal_license_cta })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "pt-2 border-t border-slate-100 dark:border-white/5", children: [
                /* @__PURE__ */ jsx("h3", { className: "font-extrabold text-violet-500 uppercase tracking-wider mb-2 text-[11px]", children: t.info_modal_supported_formats }),
                /* @__PURE__ */ jsxs("ul", { className: "grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase", children: [
                  /* @__PURE__ */ jsx("li", { className: "p-1.5 rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20", children: "JPEG, PNG, WEBP" }),
                  /* @__PURE__ */ jsx("li", { className: "p-1.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20", children: "MP4, MOV, WEBM" }),
                  /* @__PURE__ */ jsx("li", { className: "p-1.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20", children: "SVG, EPS, AI" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: () => setShowInfoModal(false), className: "mt-6 w-full py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-bold rounded-2xl text-xs uppercase shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all", children: t.info_modal_close_button })
          ] }) }),
          showSettingsModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150", onClick: () => setShowSettingsModal(false), children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative max-h-[90vh]", onClick: (e) => e.stopPropagation(), children: [
            /* @__PURE__ */ jsx("button", { onClick: () => setShowSettingsModal(false), className: "absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full", children: /* @__PURE__ */ jsx(X, { size: 14 }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-200 dark:border-white/5 shrink-0 select-none", children: [
              /* @__PURE__ */ jsx("span", { className: "p-1.5 bg-violet-500/10 rounded-2xl", children: /* @__PURE__ */ jsx(Settings, { size: 16, className: "text-[#7c3aed] animate-spin-slow" }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 flex items-center justify-between", children: [
                /* @__PURE__ */ jsx("h2", { className: "text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider", children: t.settings_modal_title }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: fetchProviderStatus,
                    className: "p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full",
                    title: "Refresh Provider Status",
                    children: /* @__PURE__ */ jsx(RefreshCcw, { size: 12 })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mb-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shrink-0 shadow-inner", children: [
              /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2", children: t.settings_main_provider_label }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  value: selectedProvider,
                  onChange: (e) => {
                    const val = e.target.value;
                    setSelectedProvider(val);
                    setActiveSettingsTab(val);
                    localStorage.setItem("ai_provider", val);
                    if (auth.currentUser) {
                      updateDoc(doc(db, "users", auth.currentUser.uid), {
                        "settings.ai_provider": val
                      }).catch(() => {
                      });
                    }
                  },
                  className: "w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all",
                  children: [
                    { id: "gemini", name: "Gemini", desc: "Google AI" },
                    { id: "groq", name: "Groq", desc: "Llama 4 Scout / Vision" },
                    { id: "mistral", name: "Mistral", desc: "Mistral Large" },
                    { id: "openai", name: "OpenAI", desc: "GPT-4o / DALL-E" },
                    { id: "openrouter", name: "Open Router", desc: "Multi-LLM access" },
                    { id: "blackbox", name: "Blackbox AI", desc: "Code specialized" },
                    { id: "nvidia", name: "NVIDIA", desc: "NVIDIA NIM" },
                    { id: "bluesminds", name: "Bluesminds", desc: "Fast Proxy" },
                    { id: "aivene", name: "Aivene", desc: "Aivene Endpoints" },
                    { id: "zai", name: "Z.AI", desc: "GLM Series" }
                  ].map((prov) => /* @__PURE__ */ jsxs("option", { value: prov.id, children: [
                    prov.name,
                    " - ",
                    prov.desc
                  ] }, prov.id))
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              "select",
              {
                value: activeSettingsTab,
                onChange: (e) => setActiveSettingsTab(e.target.value),
                className: "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all mb-4 shadow-md shadow-black/5",
                children: ["appearance", selectedProvider, "faq_billing", ...isAdminAccount ? ["reseller"] : []].map((tab) => /* @__PURE__ */ jsx("option", { value: tab, children: tab === "appearance" ? uiLanguage === "id" ? "\xEF\xBF\xBD\xEF\xBF\xBD Tampilan & Tema" : "\xEF\xBF\xBD\xEF\xBF\xBD Appearance & Theme" : tab === "faq_billing" ? uiLanguage === "id" ? "\xEF\xBF\xBD\xEF\xBF\xBD FAQ Tagihan & Langganan" : "\xEF\xBF\xBD\xEF\xBF\xBD Billing & Subscription FAQ" : tab === "reseller" ? "\xEF\xBF\xBD\xEF\xBF\xBD Reseller Portal" : tab === "bluesminds" ? "Bluesminds Keys" : tab === "aivene" ? "Aivene Keys" : tab === "zai" ? "Z.AI Keys" : `${tab.toUpperCase()} Keys` }, tab))
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "space-y-4 text-xs font-semibold overflow-y-auto pr-1 flex-1 scrollbar-thin", children: [
              activeSettingsTab === "appearance" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: uiLanguage === "id" ? "Sesuaikan tampilan antarmuka MetaZo PRO sesuai kenyamanan visual Anda secara manual atau otomatis." : "Customize the interface appearance of MetaZo PRO to your visual comfort manually or automatically." }),
                /* @__PURE__ */ jsx("div", { className: "space-y-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: uiLanguage === "id" ? "Cocokkan Tema Sistem" : "Match System Theme" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight block mt-0.5", children: uiLanguage === "id" ? "Gunakan preferensi tema terang/gelap dari sistem operasi perangkat Anda secara dinamis." : "Dynamically use the light/dark theme preference from your device's operating system." })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        const newVal = !matchSystemTheme;
                        setMatchSystemTheme(newVal);
                        if (newVal) {
                          if (typeof window !== "undefined" && window.matchMedia) {
                            const matchesDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                            applyThemeWithTransition(matchesDark ? "dark" : "light", false);
                          }
                        }
                      },
                      className: `relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${matchSystemTheme ? "bg-[#7c3aed]" : "bg-slate-300 dark:bg-slate-700"}`,
                      children: /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: `pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${matchSystemTheme ? "translate-x-4" : "translate-x-0"}`
                        }
                      )
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2", children: uiLanguage === "id" ? "Pilih Tema Secara Manual" : "Select Theme Manually" }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleSetTheme("light"),
                        className: `flex items-center justify-center space-x-1.5 py-2 px-3 rounded-[1.25rem] border font-bold text-xs transition-all ${!matchSystemTheme && theme === "light" ? "bg-white dark:bg-slate-950 border-[#7c3aed] text-[#7c3aed] shadow-sm" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"}`,
                        children: [
                          /* @__PURE__ */ jsx(Sun, { size: 12, className: !matchSystemTheme && theme === "light" ? "text-[#7c3aed]" : "text-slate-400" }),
                          /* @__PURE__ */ jsx("span", { children: uiLanguage === "id" ? "Mode Terang" : "Light Mode" })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleSetTheme("dark"),
                        className: `flex items-center justify-center space-x-1.5 py-2 px-3 rounded-[1.25rem] border font-bold text-xs transition-all ${!matchSystemTheme && theme === "dark" ? "bg-white dark:bg-slate-950 border-[#7c3aed] text-[#7c3aed] shadow-sm" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"}`,
                        children: [
                          /* @__PURE__ */ jsx(Moon, { size: 12, className: !matchSystemTheme && theme === "dark" ? "text-[#7c3aed]" : "text-slate-400" }),
                          /* @__PURE__ */ jsx("span", { children: uiLanguage === "id" ? "Mode Gelap" : "Dark Mode" })
                        ]
                      }
                    )
                  ] }),
                  matchSystemTheme && /* @__PURE__ */ jsx("span", { className: "text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide block mt-1 text-center", children: uiLanguage === "id" ? "\xE2\u0161 \xEF\xB8\x8F Mengubah tema manual akan mematikan 'Cocokkan Tema Sistem'." : "\xE2\u0161 \xEF\xB8\x8F Selecting a manual theme will turn off 'Match System Theme'." })
                ] })
              ] }),
              activeSettingsTab === "gemini" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsxs("div", { className: "space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2", children: t.settings_gemini_model_label }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: selectedGeminiModel,
                      onChange: (e) => {
                        const val = e.target.value;
                        setSelectedGeminiModel(val);
                        localStorage.setItem("mz_gemini_model", val);
                        if (auth.currentUser) {
                          updateDoc(doc(db, "users", auth.currentUser.uid), {
                            "settings.mz_gemini_model": val
                          }).catch(() => {
                          });
                        }
                      },
                      className: "w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "auto", children: t.settings_gemini_model_auto }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3.8-flash", children: "Gemini 3.8 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3.7-flash", children: "Gemini 3.7 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3.1-flash-lite", children: "Gemini 3.5 Flash-Lite / 3.1 Lite (Primary Default)" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3.6-flash", children: "Gemini 3.6 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3.5-flash", children: "Gemini 3.5 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3-flash", children: "Gemini 3 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-2.0-flash", children: "Gemini 2.0 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-1.5-flash", children: "Gemini 1.5 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-1.5-flash-8b", children: "Gemini 1.5 Flash 8B" }),
                        /* @__PURE__ */ jsx("option", { value: "gemma-4-31b-it", children: "Gemma 4 31B IT (Free RPD 1.5K)" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300", children: uiLanguage === "id" ? "Status Mode API Key" : "API Key Mode Status" }),
                    /* @__PURE__ */ jsx("span", { className: `px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${geminiKeysList.length === 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"}`, children: geminiKeysList.length === 0 ? uiLanguage === "id" ? "\u{1F7E2} KUNCI SERVER BAWAAN (BEBAS API KEY)" : "\u{1F7E2} SERVER DEFAULT KEY (NO KEY NEEDED)" : uiLanguage === "id" ? `\u{1F511} KUNCI PRIBADI (${geminiKeysList.length} KEY POOL)` : `\u{1F511} CUSTOM POOL (${geminiKeysList.length} KEYS)` })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed", children: geminiKeysList.length === 0 ? uiLanguage === "id" ? "\u2728 Anda saat ini menggunakan Master Key bawaan server. Anda bisa langsung generate metadata tanpa perlu memasukkan API Key pribadi apa pun." : "\u2728 You are currently using the built-in server master key. You can generate metadata directly without entering any personal API key." : uiLanguage === "id" ? "\u26A1 Sistem aktif menggunakan koleksi API Key pribadi Anda dengan fitur rotasi otomatis (Auto-Rotation & Multi-Account Failover)." : "\u26A1 System is actively using your personal API key pool with automatic multi-account rotation and failover." })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key Gemini resmi gratis Anda di " : "Get your official free Gemini API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://aistudio.google.com/app/api-keys",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "Google AI Studio",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs("span", { className: "text-[9.5px] text-slate-400 ml-1.5 block sm:inline", children: [
                      "(",
                      uiLanguage === "id" ? "100% Gratis 1.500 gambar/hari per akun" : "100% Free 1,500 images/day per account",
                      ")"
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                      t.settings_gemini_key_list,
                      " (",
                      geminiKeysList.length,
                      ")"
                    ] }),
                    geminiKeysList.length > 1 && /* @__PURE__ */ jsx("span", { className: "text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider", children: "\u{1F504} Auto-Rotation Active" })
                  ] }),
                  geminiKeysList.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800", children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: t.settings_use_default_key }),
                    /* @__PURE__ */ jsx("p", { className: "text-[9.5px] text-slate-400/80 mt-1 italic", children: uiLanguage === "id" ? "Tambahkan API Key di bawah jika ingin menggunakan kuota pribadi." : "Add your API key below if you prefer using personal quota." })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: geminiKeysList.map((key, index) => {
                    const keyId = `gemini-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`gemini-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "gemini";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : testResult.type === "quota" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-305" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : testResult.type === "quota" ? "QUOTA LIMIT" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("gemini", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("gemini", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Gemini (Mendukung Multi-Akun Gratis)" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Gemini (AIzaSy...)",
                        value: newGeminiKey,
                        onChange: (e) => setNewGeminiKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("gemini"),
                        disabled: !newGeminiKey.trim(),
                        className: "py-2 px-3 bg-[#7c3aed] hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 shrink-0",
                        children: [
                          /* @__PURE__ */ jsx(Plus, { size: 12 }),
                          /* @__PURE__ */ jsx("span", { children: "Tambah" })
                        ]
                      }
                    )
                  ] })
                ] })
              ] }),
              activeSettingsTab === "openai" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Simpan API Key OpenAI pribadi Anda untuk mengakses kemampuan GPT-4o dan DALL-E." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key OpenAI Anda di " : "Get your OpenAI API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://platform.openai.com/api-keys",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "OpenAI Platform",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                    "Daftar API Key OpenAI (",
                    openaiKeysList.length,
                    ")"
                  ] }),
                  openaiKeysList.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-dashed border-slate-200 dark:border-slate-800", children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key OpenAI ditambahkan." })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: openaiKeysList.map((key, index) => {
                    const keyId = `openai-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`openai-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "openai";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("openai", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("openai", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key OpenAI" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key OpenAI (sk-proj...)",
                        value: newOpenaiKey,
                        onChange: (e) => setNewOpenaiKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("openai"),
                        className: "px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all",
                        children: "Tambah"
                      }
                    )
                  ] })
                ] })
              ] }),
              activeSettingsTab === "openrouter" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Simpan API Key Open Router Anda untuk mengakses berbagai model LLM." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key OpenRouter Anda di " : "Get your OpenRouter API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://openrouter.ai/settings/keys",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "OpenRouter Console",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                    "Daftar API Key Open Router (",
                    openrouterKeysList.length,
                    ")"
                  ] }),
                  openrouterKeysList.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-dashed border-slate-200 dark:border-slate-800", children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key Open Router ditambahkan." })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: openrouterKeysList.map((key, index) => {
                    const keyId = `openrouter-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`openrouter-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "openrouter";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("openrouter", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("openrouter", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Open Router" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Open Router (sk-or...)",
                        value: newOpenrouterKey,
                        onChange: (e) => setNewOpenrouterKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("openrouter"),
                        className: "px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all",
                        children: "Tambah"
                      }
                    )
                  ] })
                ] })
              ] }),
              activeSettingsTab === "blackbox" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Simpan API Key Blackbox AI Anda untuk kemampuan coding yang terspesialisasi." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Kunjungi situs resmi Blackbox AI di " : "Visit the official Blackbox AI website at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://www.blackbox.ai",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "Blackbox AI",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                    "Daftar API Key Blackbox AI (",
                    blackboxKeysList.length,
                    ")"
                  ] }),
                  blackboxKeysList.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-dashed border-slate-200 dark:border-slate-800", children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key Blackbox AI ditambahkan." })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: blackboxKeysList.map((key, index) => {
                    const keyId = `blackbox-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`blackbox-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "blackbox";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("blackbox", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("blackbox", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Blackbox AI" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Blackbox AI",
                        value: newBlackboxKey,
                        onChange: (e) => setNewBlackboxKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("blackbox"),
                        className: "px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all",
                        children: "Tambah"
                      }
                    )
                  ] })
                ] })
              ] }),
              activeSettingsTab === "nvidia" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Simpan API Key NVIDIA Anda untuk mengakses NVIDIA NIM." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key NVIDIA Anda di " : "Get your NVIDIA API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://build.nvidia.com/settings/api-keys",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "NVIDIA NIM Platform",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                    "Daftar API Key NVIDIA (",
                    nvidiaKeysList.length,
                    ")"
                  ] }),
                  nvidiaKeysList.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800", children: serverKeysStatus.nvidia ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center space-x-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5", children: [
                      /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" }),
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-wider", children: "Default Server Aktif" })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-semibold text-[11px] leading-relaxed", children: "Sistem mendeteksi API Key NVIDIA bawaan di server backend Anda. Anda tidak wajib menginput key di bawah kecuali jika ingin memakai key pribadi." })
                  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key NVIDIA ditambahkan." })
                  ] }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: nvidiaKeysList.map((key, index) => {
                    const keyId = `nvidia-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`nvidia-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "nvidia";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("nvidia", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("nvidia", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key NVIDIA" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key NVIDIA",
                        value: newNvidiaKey,
                        onChange: (e) => setNewNvidiaKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("nvidia"),
                        className: "px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all",
                        children: "Tambah"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Pilih Model" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: selectedNvidiaModel,
                      onChange: (e) => {
                        const val = e.target.value;
                        setSelectedNvidiaModel(val);
                        localStorage.setItem("mz_nvidia_model", val);
                        if (auth.currentUser) {
                          updateDoc(doc(db, "users", auth.currentUser.uid), {
                            "settings.mz_nvidia_model": val
                          }).catch(() => {
                          });
                        }
                      },
                      className: "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "stepfun-ai/step-3.5-flash", children: "Stepfun 3.5 Flash (New! - Recommended)" }),
                        /* @__PURE__ */ jsx("option", { value: "nvidia/llama-3.1-nemotron-70b-instruct", children: "Nemotron 70B (Recommended for SEO)" }),
                        /* @__PURE__ */ jsx("option", { value: "meta/llama-3.2-90b-vision-instruct", children: "Llama 3.2 90B Vision (Highest Quality)" }),
                        /* @__PURE__ */ jsx("option", { value: "meta/llama-3.2-11b-vision-instruct", children: "Llama 3.2 11B Vision (Fast)" }),
                        /* @__PURE__ */ jsx("option", { value: "meta/llama-3.1-405b-instruct", children: "Llama 3.1 405B (Ultra Powerful)" }),
                        /* @__PURE__ */ jsx("option", { value: "google/paligemma-3b-224-base", children: "Palingemma 3B (Experimental)" }),
                        /* @__PURE__ */ jsx("option", { value: "stepfun/step-1.5v-vision", children: "Stepfun 1.5V Vision" })
                      ]
                    }
                  )
                ] })
              ] }),
              activeSettingsTab === "bluesminds" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Simpan API Key Bluesminds Anda untuk mengakses layanan ini." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key Bluesminds Anda di " : "Get your Bluesminds API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://api.bluesminds.com/console/token",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "Bluesminds Console",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Daftar Key Bluesminds" }),
                  bluesmindsKeysList.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800", children: serverKeysStatus.bluesminds ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center space-x-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5", children: [
                      /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" }),
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-wider", children: "Default Server Aktif" })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-semibold text-[11px] leading-relaxed", children: "Sistem mendeteksi API Key bawaan di server backend Anda (Aktif & Siap digunakan). Anda tidak wajib menginput key di bawah kecuali jika ingin menimpa dengan key pribadi." })
                  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key Bluesminds ditambahkan." })
                  ] }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: bluesmindsKeysList.map((key, index) => {
                    const keyId = `bluesminds-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`bluesminds-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "bluesminds";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("bluesminds", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("bluesminds", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Bluesminds" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Bluesminds",
                        value: newBluesmindsKey,
                        onChange: (e) => setNewBluesmindsKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("bluesminds"),
                        className: "px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all",
                        children: "Tambah"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Model Aktif" }),
                  /* @__PURE__ */ jsx(
                    "select",
                    {
                      disabled: true,
                      value: "gpt-4o",
                      className: "w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-500 dark:text-slate-450 cursor-not-allowed",
                      children: /* @__PURE__ */ jsx("option", { value: "gpt-4o", children: "gpt-4o (Active - Default)" })
                    }
                  )
                ] })
              ] }),
              activeSettingsTab === "aivene" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Simpan API Key Aivene Anda untuk mengakses layanan ini." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key Aivene Anda di " : "Get your Aivene API Key at ",
                    " ",
                    /* @__PURE__ */ jsx(
                      "a",
                      {
                        href: "https://platform.aivene.com/api-keys",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: "platform.aivene.com"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Daftar Key Aivene" }),
                  aiveneKeysList.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800", children: serverKeysStatus.aivene ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center space-x-1.5 text-emerald-600 dark:text-emerald-400 mb-1.5", children: [
                      /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" }),
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-wider", children: "Default Server Aktif" })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-semibold text-[11px] leading-relaxed", children: "Sistem mendeteksi API Key bawaan di server backend Anda (Aktif & Siap digunakan). Anda tidak wajib menginput key di bawah kecuali jika ingin menimpa dengan key pribadi." })
                  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key Aivene ditambahkan." })
                  ] }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: aiveneKeysList.map((key, index) => {
                    const keyId = `aivene-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`aivene-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "aivene";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("aivene", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("aivene", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Aivene" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Aivene",
                        value: newAiveneKey,
                        onChange: (e) => setNewAiveneKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("aivene"),
                        className: "px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all",
                        children: "Tambah"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Model Aktif" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: selectedAiveneModel,
                      onChange: (e) => {
                        setSelectedAiveneModel(e.target.value);
                        localStorage.setItem("mz_aivene_model", e.target.value);
                        if (auth.currentUser) {
                          updateDoc(doc(db, "users", auth.currentUser.uid), {
                            "settings.mz_aivene_model": e.target.value
                          }).catch(() => {
                          });
                        }
                      },
                      className: "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all cursor-pointer",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "auto", children: "Otomatis (Paling Stabil)" }),
                        /* @__PURE__ */ jsx("option", { value: "gpt-4o-mini", children: "gpt-4o-mini (Active - Default)" }),
                        /* @__PURE__ */ jsx("option", { value: "mimo-v2.5", children: "mimo-v2.5 (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "gpt-5.4-nano", children: "gpt-5.4-nano (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "gpt-5.4-mini", children: "gpt-5.4-mini (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3.6-flash", children: "gemini-3.6-flash (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3.5-flash", children: "gemini-3.5-flash (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "gemini-3-flash", children: "gemini-3-flash (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "deepseek-v4-flash", children: "deepseek-v4-flash (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "gemma-4-31b-it", children: "gemma-4-31b-it (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "gemma-4-26b-a4b-it", children: "gemma-4-26b-a4b-it (Aivene Endpoint)" }),
                        /* @__PURE__ */ jsx("option", { value: "qwen3.5-flash", children: "qwen3.5-flash (Aivene Endpoint)" })
                      ]
                    }
                  )
                ] })
              ] }),
              activeSettingsTab === "zai" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Simpan API Key Z.AI Anda untuk mengakses GLM Series (OpenAI-compatible)." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key Z.AI Anda di " : "Get your Z.AI API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://z.ai/manage-apikey/apikey-list",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "Z.AI Console",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                    "Daftar API Key Z.AI (",
                    zaiKeysList.length,
                    ")"
                  ] }),
                  zaiKeysList.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800", children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key Z.AI ditambahkan." })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: zaiKeysList.map((key, index) => {
                    const keyId = `zai-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`zai-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "zai";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("zai", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("zai", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Z.AI" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Z.AI",
                        value: newZaiKey,
                        onChange: (e) => setNewZaiKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("zai"),
                        className: "px-4 py-2 bg-[#7c3aed] hover:bg-[#3d5abf] text-white rounded-[1.5rem] font-bold uppercase text-[10px] transition-all",
                        children: "Tambah"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Model Aktif" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: selectedZaiModel,
                      onChange: (e) => {
                        setSelectedZaiModel(e.target.value);
                        localStorage.setItem("mz_zai_model", e.target.value);
                        if (auth.currentUser) {
                          updateDoc(doc(db, "users", auth.currentUser.uid), {
                            "settings.mz_zai_model": e.target.value
                          }).catch(() => {
                          });
                        }
                      },
                      className: "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all cursor-pointer",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "glm-5.2", children: "GLM-5.2 (Flagship, 1M context)" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-5.1", children: "GLM-5.1" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-5-turbo", children: "GLM-5 Turbo" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-5", children: "GLM-5" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4.7", children: "GLM-4.7" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4.7-flash", children: "GLM-4.7 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4.7-flashx", children: "GLM-4.7 FlashX" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4.6", children: "GLM-4.6" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4.5", children: "GLM-4.5" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4.5-air", children: "GLM-4.5 Air" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4.5-flash", children: "GLM-4.5 Flash" }),
                        /* @__PURE__ */ jsx("option", { value: "glm-4-32b-0414-128k", children: "GLM-4 32B (128K)" })
                      ]
                    }
                  )
                ] })
              ] }),
              activeSettingsTab === "groq" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: "Masukkan API Key Groq Anda. Gunakan model tercepat untuk pemrosesan metadata." }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key Groq Anda di " : "Get your Groq API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://console.groq.com/keys",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "Groq Console",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-2", children: "Pilih Model Groq" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: selectedGroqModel,
                      onChange: (e) => {
                        const val = e.target.value;
                        setSelectedGroqModel(val);
                        localStorage.setItem("mz_groq_model", val);
                        if (auth.currentUser) {
                          updateDoc(doc(db, "users", auth.currentUser.uid), {
                            "settings.mz_groq_model": val
                          }).catch(() => {
                          });
                        }
                      },
                      className: "w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none text-xs text-slate-800 dark:text-slate-100 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "llama-3.3-70b-versatile", children: "Llama 3.3 70B Versatile" }),
                        /* @__PURE__ */ jsx("option", { value: "llama-4-scout-17b-16e-instruct", children: "Llama 4 Scout 17B Instruct" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                    "Daftar API Key Groq (",
                    groqKeysList.length,
                    ")"
                  ] }),
                  groqKeysList.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800", children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key Groq ditambahkan." })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: groqKeysList.map((key, index) => {
                    const keyId = `groq-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`groq-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "groq";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("groq", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("groq", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Groq" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Groq (gsk_...)",
                        value: newGroqKey,
                        onChange: (e) => setNewGroqKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("groq"),
                        disabled: !newGroqKey.trim(),
                        className: "py-2 px-3 bg-[#7c3aed] hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 shrink-0",
                        children: [
                          /* @__PURE__ */ jsx(Plus, { size: 12 }),
                          /* @__PURE__ */ jsx("span", { children: "Tambah" })
                        ]
                      }
                    )
                  ] })
                ] })
              ] }),
              activeSettingsTab === "mistral" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsxs("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: [
                  "Masukkan API Key Mistral Anda. Model-model Mistral (",
                  /* @__PURE__ */ jsx("code", { className: "font-mono text-[10px]", children: "mistral-large-latest" }),
                  " dan ",
                  /* @__PURE__ */ jsx("code", { className: "font-mono text-[10px]", children: "pixtral-12b" }),
                  ") memiliki akurasi kosa kata yang luar biasa, puitis, dan didesain khusus untuk optimasi metadata kelas atas."
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 p-2.5 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 rounded-xl border border-[#7c3aed]/20", children: [
                  /* @__PURE__ */ jsx(HelpCircle, { size: 14, className: "text-[#7c3aed] shrink-0" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold text-slate-600 dark:text-slate-300", children: [
                    uiLanguage === "id" ? "Dapatkan API Key Mistral Anda di " : "Get your Mistral API Key at ",
                    " ",
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: "https://console.mistral.ai/api-keys",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "text-[#7c3aed] hover:underline hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 inline-flex items-center gap-1 font-black",
                        children: [
                          "Mistral Console",
                          /* @__PURE__ */ jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsxs("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] block", children: [
                    "Daftar API Key Mistral (",
                    mistralKeysList.length,
                    ")"
                  ] }),
                  mistralKeysList.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800", children: [
                    /* @__PURE__ */ jsx(Key, { className: "mx-auto text-slate-300 dark:text-slate-700 mb-2", size: 20 }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-400 dark:text-slate-500 font-medium text-[11px]", children: "Belum ada API Key Mistral ditambahkan." })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto pr-1 select-none", children: mistralKeysList.map((key, index) => {
                    const keyId = `mistral-key-${index}-${key.substring(0, 10)}`;
                    const testResult = keyTestResults[`mistral-${index}`];
                    const isTesting = keyTestingIndex === index && keyTestProvider === "mistral";
                    const maskedKey = `${key.slice(0, 8)}...${key.slice(-4)}`;
                    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsx(Key, { size: 12, className: "text-slate-400 shrink-0" }),
                        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs text-slate-700 dark:text-slate-300", children: maskedKey }),
                        testResult && /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: testResult.message,
                            className: `px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 cursor-help ${testResult.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-350"}`,
                            children: testResult.type === "success" ? "AKTIF/OK" : "ERROR"
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleTestKeyAtIndex("mistral", index, key),
                            disabled: keyTestingIndex !== null,
                            className: "px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-45 transition-colors",
                            children: isTesting ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin text-slate-500" }) : "Uji"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => handleDeleteApiKey("mistral", index),
                            className: "p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors",
                            title: "Hapus Key",
                            children: /* @__PURE__ */ jsx(Trash2, { size: 12 })
                          }
                        )
                      ] })
                    ] }, keyId);
                  }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]", children: "Tambah Key Mistral" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "password",
                        placeholder: "API Key Mistral (mX...)",
                        value: newMistralKey,
                        onChange: (e) => setNewMistralKey(e.target.value),
                        className: "flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] px-3 py-2 outline-none font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleAddApiKey("mistral"),
                        disabled: !newMistralKey.trim(),
                        className: "py-2 px-3 bg-[#7c3aed] hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-[1.5rem] text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 shrink-0",
                        children: [
                          /* @__PURE__ */ jsx(Plus, { size: 12 }),
                          /* @__PURE__ */ jsx("span", { children: "Tambah" })
                        ]
                      }
                    )
                  ] })
                ] })
              ] }),
              activeSettingsTab === "reseller" && /* @__PURE__ */ jsx(
                SaaSPortal,
                {
                  appName: mzAppName,
                  setAppName: setMzAppName,
                  appSubtitle: mzAppSubtitle,
                  setAppSubtitle: setMzAppSubtitle,
                  whatsAppLink: mzWhatsApp,
                  setWhatsAppLink: setMzWhatsApp,
                  pricingTier: autoPricingTier,
                  setPricingTier: setMzPriceText,
                  licenseSeed: mzLicenseSeed,
                  setLicenseSeed: setMzLicenseSeed,
                  licenseKey: mzLicenseKey,
                  setLicenseKey: setMzLicenseKey,
                  isLicensed: isMzLicensed,
                  showActivation: showActivationModal,
                  setShowActivation: setShowActivationModal,
                  userEmail: user?.email || "",
                  userId: user?.uid,
                  isResellerUnlocked,
                  setIsResellerUnlocked,
                  trialDaysLeft,
                  subDaysLeft,
                  t
                }
              ),
              activeSettingsTab === "faq_billing" && /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400 font-medium text-[11px] leading-relaxed", children: uiLanguage === "id" ? "Pelajari transisi dari masa uji coba gratis (Free Trial) ke status berbayar penuh (PRO) dengan lancar." : "Understand how your Free Trial account transitions seamlessly to a paid PRO subscription." }),
                /* @__PURE__ */ jsx(FAQAccordion, { language: uiLanguage })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-[1.5rem] border border-slate-250 dark:border-slate-800", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-500 dark:text-slate-400 font-medium", children: "Status Provider Aktif" }),
                /* @__PURE__ */ jsxs("span", { className: "px-2 py-0.5 rounded bg-blue-100 dark:bg-violet-500/20 text-blue-700 dark:text-blue-300 font-black text-[9px] uppercase tracking-wider", children: [
                  selectedProvider.toUpperCase(),
                  " PROVIDER"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2.5 mt-6 shrink-0 pt-3 border-t border-slate-200 dark:border-white/5", children: [
              (geminiKeysList.length > 0 || groqKeysList.length > 0 || mistralKeysList.length > 0) && /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: handleResetKey,
                  className: "px-4 py-2 bg-red-50 dark:bg-red-500/5 hover:bg-red-100 text-red-600 dark:text-red-450 font-semibold rounded-[1.5rem] text-xs transition-colors border border-red-200/50 dark:border-red-500/10",
                  children: "Hapus Semua"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    handleSaveKey();
                    setShowSettingsModal(false);
                  },
                  className: "flex-1 py-1.5 bg-[#7c3aed] hover:bg-violet-600 text-white font-bold rounded-[1.5rem] text-xs uppercase shadow transition-colors",
                  children: "Simpan & Pasang"
                }
              )
            ] })
          ] }) }),
          showPromoWindow && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[260] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200", onClick: () => setShowPromoWindow(false), children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: "bg-white dark:bg-[#0f172a] rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-white/10 flex flex-col relative animate-in zoom-in-95 duration-200",
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setShowPromoWindow(false),
                    className: "absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-full transition-colors cursor-pointer z-10",
                    "aria-label": "Close Promo",
                    children: /* @__PURE__ */ jsx(X, { size: 16 })
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "p-6 sm:p-8 bg-gradient-to-br from-violet-600 via-indigo-700 to-red-600 text-white relative", children: [
                  /* @__PURE__ */ jsx("div", { className: "absolute right-4 bottom-0 opacity-10 pointer-events-none scale-150", children: /* @__PURE__ */ jsx(Gift, { size: 160 }) }),
                  /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-[9px] font-black uppercase tracking-widest mb-3 animate-bounce", children: [
                    /* @__PURE__ */ jsx(Sparkles, { size: 11, className: "text-amber-300 animate-pulse" }),
                    /* @__PURE__ */ jsx("span", { children: uiLanguage === "id" ? "PENAWARAN TERBATAS" : "LIMITED OFFER FOR YOU" })
                  ] }),
                  /* @__PURE__ */ jsx("h2", { className: "text-xl sm:text-2xl font-black uppercase tracking-tight leading-none mb-2", children: uiLanguage === "id" ? "Akun Anda: Free Trial" : "Your Account: Free Trial" }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-100 font-medium leading-relaxed", children: uiLanguage === "id" ? "Dapatkan potongan harga khusus & aktifkan fitur premium penuh untuk mendominasi pasar microstock!" : "Grab direct discount coupons below & activate high-speed pipelines today!" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "p-6 sm:p-8 space-y-5 overflow-y-auto max-h-[400px]", children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-2.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block", children: uiLanguage === "id" ? "Kenapa Harus Upgrade ke PRO?" : "Why Upgrade to PRO?" }),
                    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-start space-x-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl", children: [
                        /* @__PURE__ */ jsx(Zap, { size: 14, className: "text-amber-500 shrink-0 mt-0.5" }),
                        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                          /* @__PURE__ */ jsx("p", { className: "text-[11px] font-bold text-slate-800 dark:text-slate-200", children: uiLanguage === "id" ? "Tanpa Batasan" : "Unlimited Pipeline" }),
                          /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 line-clamp-1", children: uiLanguage === "id" ? "Batch generator tanpa limit harian" : "Process bulk images without limits" })
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-start space-x-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl", children: [
                        /* @__PURE__ */ jsx(CheckCircle2, { size: 14, className: "text-emerald-500 shrink-0 mt-0.5" }),
                        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                          /* @__PURE__ */ jsx("p", { className: "text-[11px] font-bold text-slate-800 dark:text-slate-200", children: uiLanguage === "id" ? "Metadata Presisi" : "Perfect Microstock SEO" }),
                          /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 line-clamp-1", children: uiLanguage === "id" ? "Keyword teroptimasi standar industri" : "Rank higher on Adobe Stock & Freepik" })
                        ] })
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500", children: uiLanguage === "id" ? "Voucher Diskon Siap Pakai" : "Ready-to-Use Coupon Codes" }),
                      /* @__PURE__ */ jsx("span", { className: "text-[9px] bg-red-100 dark:bg-red-950 text-red-655 dark:text-red-400 font-extrabold px-1.5 py-0.5 rounded-lg", children: uiLanguage === "id" ? "Diskon s/d 50%" : "Save up to 50%" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "space-y-2", children: promoCodesForModal.length === 0 ? (
                      // Fallback promo code if firebase collection is empty
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 bg-gradient-to-r from-violet-500/10 to-red-500/10 border border-violet-200/50 dark:border-violet-500/20 rounded-2xl transition-all", children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
                          /* @__PURE__ */ jsx("div", { className: "p-2 bg-[#7c3aed]/10 rounded-xl text-[#7c3aed]", children: /* @__PURE__ */ jsx(Tag, { size: 16 }) }),
                          /* @__PURE__ */ jsxs("div", { children: [
                            /* @__PURE__ */ jsx("p", { className: "text-xs font-black text-[#7c3aed] dark:text-violet-400 tracking-wider uppercase", children: "MZPROMO2026" }),
                            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 dark:text-slate-400 font-bold", children: uiLanguage === "id" ? "Potongan 50% untuk Langganan Pertama" : "50% Discount on First Purchase" })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            onClick: () => {
                              try {
                                navigator.clipboard.writeText("MZPROMO2026");
                                setCopiedCodeInModal("MZPROMO2026");
                                setTimeout(() => setCopiedCodeInModal(null), 2e3);
                              } catch (err) {
                              }
                            },
                            className: `px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center space-x-1 ${copiedCodeInModal === "MZPROMO2026" ? "bg-emerald-600 text-white cursor-default" : "bg-[#7c3aed] hover:bg-violet-600 text-white shadow-sm cursor-pointer"}`,
                            children: copiedCodeInModal === "MZPROMO2026" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                              /* @__PURE__ */ jsx(Check, { size: 12 }),
                              /* @__PURE__ */ jsx("span", { children: "Tersalin" })
                            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                              /* @__PURE__ */ jsx(Copy, { size: 12 }),
                              /* @__PURE__ */ jsx("span", { children: "Salin" })
                            ] })
                          }
                        )
                      ] })
                    ) : promoCodesForModal.map((p) => /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: "flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-500/30 rounded-2xl transition-all",
                        children: [
                          /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
                            /* @__PURE__ */ jsx("div", { className: "p-2 bg-violet-100 dark:bg-violet-550/15 rounded-xl text-violet-650 dark:text-violet-405 shrink-0", children: /* @__PURE__ */ jsx(Tag, { size: 16 }) }),
                            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1.5", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-xs font-black text-[#7c3aed] dark:text-violet-400 tracking-wider uppercase truncate", children: p.code }),
                                p.endDate && /* @__PURE__ */ jsxs("span", { className: "text-[7.5px] bg-red-100 dark:bg-red-950/60 text-red-750 dark:text-red-400 font-extrabold px-1 py-0.2 rounded shrink-0", children: [
                                  "Berakhir ",
                                  p.endDate
                                ] })
                              ] }),
                              /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-500 dark:text-slate-400 font-bold block truncate", children: p.description || (p.type === "free_premium" ? `${p.value} Hari Premium` : `Diskon ${p.value}%`) })
                            ] })
                          ] }),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              onClick: () => {
                                try {
                                  navigator.clipboard.writeText(p.code);
                                  setCopiedCodeInModal(p.code);
                                  setTimeout(() => setCopiedCodeInModal(null), 2e3);
                                } catch (err) {
                                }
                              },
                              className: `px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center space-x-1 shrink-0 ${copiedCodeInModal === p.code ? "bg-emerald-600 text-white cursor-default" : "bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white dark:bg-violet-500/20 dark:text-violet-350 cursor-pointer"}`,
                              children: copiedCodeInModal === p.code ? /* @__PURE__ */ jsxs(Fragment, { children: [
                                /* @__PURE__ */ jsx(Check, { size: 12 }),
                                /* @__PURE__ */ jsx("span", { children: "Tersalin" })
                              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                                /* @__PURE__ */ jsx(Copy, { size: 12 }),
                                /* @__PURE__ */ jsx("span", { children: "Salin" })
                              ] })
                            }
                          )
                        ]
                      },
                      p.id
                    )) })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2.5", children: [
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => {
                        setShowPromoWindow(false);
                        setShowActivationModal(true);
                      },
                      className: "w-full py-4 bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-violet-600 hover:to-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-2",
                      children: [
                        /* @__PURE__ */ jsx(Key, { size: 14 }),
                        /* @__PURE__ */ jsx("span", { children: uiLanguage === "id" ? "Gunakan Voucher / Lisensi Sekarang" : "Redeem License Key / Voucher" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => setShowPromoWindow(false),
                      className: "w-full py-2.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase rounded-xl transition-all text-center cursor-pointer",
                      children: uiLanguage === "id" ? "Selesaikan Uji Coba (Lanjut)" : "Continue Free Trial"
                    }
                  )
                ] })
              ]
            }
          ) }),
          /* @__PURE__ */ jsx(
            SaaSPortal,
            {
              appName: mzAppName,
              setAppName: setMzAppName,
              appSubtitle: mzAppSubtitle,
              setAppSubtitle: setMzAppSubtitle,
              whatsAppLink: mzWhatsApp,
              setWhatsAppLink: setMzWhatsApp,
              pricingTier: autoPricingTier,
              setPricingTier: setMzPriceText,
              licenseSeed: mzLicenseSeed,
              setLicenseSeed: setMzLicenseSeed,
              licenseKey: mzLicenseKey,
              setLicenseKey: setMzLicenseKey,
              isLicensed: isMzLicensed,
              showActivation: showActivationModal,
              setShowActivation: setShowActivationModal,
              userEmail: user?.email || "",
              userId: user?.uid,
              onlyModal: true,
              trialDaysLeft,
              subDaysLeft,
              t
            }
          ),
          showLimitModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200", onClick: () => setShowLimitModal(false), children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200", onClick: (e) => e.stopPropagation(), children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setShowLimitModal(false),
                className: "absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors",
                children: /* @__PURE__ */ jsx(X, { size: 16 })
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "w-20 h-20 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-6", children: /* @__PURE__ */ jsx(Clock, { size: 40, className: "text-amber-500" }) }),
            /* @__PURE__ */ jsx("h2", { className: "text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight", children: "Limit Tercapai" }),
            /* @__PURE__ */ jsx("p", { className: "text-base font-bold text-[#7c3aed] mb-4", children: "Coba Besok lagi ya" }),
            /* @__PURE__ */ jsx("div", { className: "bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl w-full mb-6 border border-slate-100 dark:border-white/5", children: /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed", children: [
              "Limit harian telah habis. Anda telah memproses ",
              /* @__PURE__ */ jsxs("span", { className: "text-slate-800 dark:text-white font-black", children: [
                getDailyLimit(),
                " aset"
              ] }),
              " hari ini. Sila kembali besok atau aktifkan akun PRO untuk memproses tanpa batas."
            ] }) }),
            /* @__PURE__ */ jsxs("div", { className: "w-full space-y-2.5", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => {
                    setShowLimitModal(false);
                    setShowActivationModal(true);
                  },
                  className: "w-full py-3 bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-violet-600 hover:to-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsx(Zap, { size: 14, className: "animate-pulse text-amber-300" }),
                    /* @__PURE__ */ jsx("span", { children: "Berlangganan PRO (Subscribe)" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => window.open("https://teer.id/johan3008", "_blank"),
                  className: "w-full py-2.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsx(Heart, { size: 13, className: "text-rose-500 fill-rose-500" }),
                    /* @__PURE__ */ jsx("span", { children: "Dukung Kami (Donate)" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setShowLimitModal(false),
                className: "mt-3 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest",
                children: "Mungkin Nanti"
              }
            )
          ] }) }),
          comingSoonFeature && /* @__PURE__ */ jsx(
            "div",
            {
              className: "fixed inset-0 z-[350] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200",
              onClick: () => setComingSoonFeature(null),
              children: /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "bg-white dark:bg-[#111827] rounded-[2.5rem] p-7 md:p-9 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200",
                  onClick: (e) => e.stopPropagation(),
                  children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => setComingSoonFeature(null),
                        className: "absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer",
                        children: /* @__PURE__ */ jsx(X, { size: 16 })
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "relative mb-6", children: [
                      /* @__PURE__ */ jsx("div", { className: `w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${comingSoonFeature === "motion_gen" ? "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-indigo-500/30" : "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-violet-500/30"}`, children: comingSoonFeature === "motion_gen" ? /* @__PURE__ */ jsx(Video, { size: 38, className: "animate-pulse" }) : /* @__PURE__ */ jsx(UploadCloud, { size: 38, className: "animate-pulse" }) }),
                      /* @__PURE__ */ jsxs("div", { className: "absolute -bottom-2.5 -right-2.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md flex items-center gap-1", children: [
                        /* @__PURE__ */ jsx(Sparkles, { size: 10, className: "text-slate-950" }),
                        /* @__PURE__ */ jsx("span", { children: "Coming Soon" })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("h3", { className: "text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase", children: comingSoonFeature === "motion_gen" ? uiLanguage === "id" ? "Fitur MotionGen" : "MotionGen Feature" : uiLanguage === "id" ? "Fitur Auto Upload" : "Auto Upload Feature" }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs font-extrabold text-[#7c3aed] dark:text-violet-400 mt-1 uppercase tracking-widest", children: comingSoonFeature === "motion_gen" ? uiLanguage === "id" ? "\u26A1 AI Motion & Video Generator" : "\u26A1 AI Motion & Video Generator" : uiLanguage === "id" ? "\u{1F680} FTP / SFTP Multi-Stock Auto Uploader" : "\u{1F680} FTP / SFTP Multi-Stock Auto Uploader" }),
                    /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 dark:bg-slate-900/60 p-4.5 rounded-2xl w-full my-5 border border-slate-200/80 dark:border-white/5 text-left", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wide", children: [
                        /* @__PURE__ */ jsx(Clock, { size: 14, className: "text-indigo-500" }),
                        /* @__PURE__ */ jsx("span", { children: uiLanguage === "id" ? "Status Pengembangan" : "Development Status" })
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium", children: comingSoonFeature === "motion_gen" ? uiLanguage === "id" ? "Fitur MotionGen saat ini sedang dalam tahap pengembangan dan optimasi server rendering. Fitur ini dirancang untuk mengubah aset vektor & gambar Anda menjadi animasi video motion berkualitas tinggi secara otomatis. Nantikan peluncurannya pada pembaruan versi berikutnya!" : "The MotionGen feature is currently under active development and rendering pipeline optimization. It is built to convert your vector and image assets into high quality video animations automatically. Stay tuned for the upcoming version release!" : uiLanguage === "id" ? "Fitur Auto Upload (FTP / SFTP) sedang dalam tahap peningkatan enkripsi keamanan dan optimasi queue server agar upload ribuan file metadata ke berbagai microstock (Adobe Stock, Freepik, Shutterstock, Vecteezy, dll) berlangsung super cepat, stabil, dan otomatis. Fitur ini akan hadir pada update berikutnya!" : "The Auto Upload (FTP / SFTP) feature is undergoing security protocol enhancements and multi-thread queue server optimization to ensure reliable, lightning-fast batch uploads to all major stock agencies. It will be enabled in the next update!" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "w-full space-y-2", children: /* @__PURE__ */ jsxs(
                      "button",
                      {
                        onClick: () => setComingSoonFeature(null),
                        className: "w-full py-3.5 bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-violet-600 hover:to-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer",
                        children: [
                          /* @__PURE__ */ jsx(Check, { size: 14 }),
                          /* @__PURE__ */ jsx("span", { children: uiLanguage === "id" ? "Mengerti & Tutup" : "Got It / Close" })
                        ]
                      }
                    ) })
                  ]
                }
              )
            }
          ),
          returnToStartCountdown !== null && /* @__PURE__ */ jsx("div", { className: "fixed bottom-6 left-6 z-[9999] animate-in slide-in-from-bottom-5 duration-300", children: /* @__PURE__ */ jsxs("div", { className: "bg-slate-900/95 dark:bg-slate-950/98 text-white backdrop-blur border border-white/10 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 max-w-sm", style: { boxShadow: "0 20px 50px -12px rgba(124, 58, 237, 0.3)" }, children: [
            /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center font-black text-sm text-white animate-pulse shrink-0", children: returnToStartCountdown }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 text-left", children: [
              /* @__PURE__ */ jsx("p", { className: "font-extrabold tracking-widest uppercase text-[9px] text-[#7c3aed] dark:text-violet-400", children: "PROSES SELESAI!" }),
              /* @__PURE__ */ jsx("p", { className: "text-slate-300 text-xs font-bold leading-normal mt-0.5", children: uiLanguage === "id" ? `Kembali ke awal dalam ${returnToStartCountdown} detik...` : `Returning to start in ${returnToStartCountdown} seconds...` })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setReturnToStartCountdown(null),
                className: "px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/5 font-black text-[9px] uppercase rounded-xl transition-all cursor-pointer select-none",
                children: "Cancel"
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx(
            AboutModal,
            {
              isOpen: showAboutModal,
              onClose: () => setShowAboutModal(false),
              theme,
              t
            }
          ),
          /* @__PURE__ */ jsx(
            AutoReviewPromptModal,
            {
              user,
              isLicensed: isMzLicensed,
              successfulFilesCount,
              appName: mzAppName
            }
          )
        ] })
      ]
    }
  );
};
export default App;
