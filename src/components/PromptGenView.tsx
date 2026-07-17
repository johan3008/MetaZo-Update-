import { getDailyLimit } from '../../constants';
import React, { useState, useEffect } from 'react';
import { copyToClipboard as robustCopy } from '../utils';
import { getHeaders } from '../../services/geminiService';
import { 
  Wand2, Type, Copy, Check, Info, Trash2, Sliders, Play, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Download, AlignLeft, Search, Sparkles, X, Loader2
} from 'lucide-react';

import { FeatureGuideButton } from './FeatureGuideModal';

interface PromptGenViewProps {
  t: any;
  prefilledSubject?: string;
  onPrefillConsumed?: () => void;
  isLicensed?: boolean;
  dailyGenCount?: number;
  incrementDailyCount?: () => void;
  aiOptions?: any;
  user?: any;
  db?: any;
  uiLanguage?: 'id' | 'en';
}

interface PromptHistoryItem {
  id: string;
  timestamp: string;
  subject: string;
  styleCategory: string;
  variation: number;
  prompts: string[];
  negativePrompt: string;
  styleExplanation: string[];
  promptMode?: 'background' | 'png';
  pngBgColor?: 'white' | 'black' | 'transparent';
}

const BACKGROUND_STYLE_OPTIONS = [
  { id: '3D CGI', label: '3D CGI Style (Gaya 3D CGI)', icon: '🧊' },
  { id: 'Cinematic', label: 'Cinematic (Sinematik)', icon: '🎬' },
  { id: 'Vector Art', label: 'Vector Art (Seni Vektor)', icon: '🎨' },
  { id: 'Photorealistic', label: 'Photorealistic (Foto Realistis)', icon: '📷' },
  { id: 'Fantasy Art', label: 'Fantasy Art (Seni Fantasi)', icon: '🧙' },
  { id: 'Scifi Concept Art', label: 'Scifi Concept Art (Konsep Sains Fiksi)', icon: '🛸' },
  { id: 'Anime/Manga', label: 'Anime/Manga Illustration', icon: '🌸' },
  { id: 'Watercolor Painting', label: 'Watercolor Painting (Cat Air)', icon: '💧' },
  { id: 'Oil Painting', label: 'Oil Painting (Cat Minyak)', icon: '🖌️' },
  { id: 'Paper Cut', label: 'Paper Cut (Seni Potong Kertas)', icon: '✂️' },
  { id: 'Abstract', label: 'Abstract (Abstrak)', icon: '⛰️' },
  { id: 'Vintage Photography', label: 'Vintage Photography (Klasik)', icon: '🎞️' },
  { id: 'Cyberpunk', label: 'Cyberpunk (Futuristik Retro)', icon: '⚡' },
  { id: 'SteamPunk', label: 'SteamPunk (Retro Industri)', icon: '⚙️' },
  { id: 'Embroidery', label: 'Embroidery (Seni Bordir)', icon: '🧵' },
  { id: 'Disney Cartoon', label: 'Disney Cartoon (Kartun Disney)', icon: '🏰' },
  { id: 'Dark Horror Aesthetic', label: 'Dark Horror Aesthetic (Estetika Horor Gelap)', icon: '🦇' },
  { id: 'Lego Style', label: 'Lego Style (Gaya Mainan Balok)', icon: '🧱' },
  { id: 'Voxel Art', label: 'Voxel Art (Gaya Kubus Voxel)', icon: '🟩' }
];

const PNG_STYLE_OPTIONS = [
  { id: '3D Render', label: '3D Render (Animasi 3D)', icon: '🎮' },
  { id: 'Isometric', label: 'Isometric (Isometrik 3D)', icon: '📦' },
  { id: 'Lowpoly', label: 'Lowpoly (Poli Rendah)', icon: '💎' },
  { id: 'Vector Art', label: 'Vector Art (Seni Vektor)', icon: '🎨' },
  { id: 'Flat Icon', label: 'Flat Icon (Desain Flat)', icon: '📱' },
  { id: 'Sticker Illustration', label: 'Sticker Illustration (Stiker Aset)', icon: '🏷️' },
  { id: 'Pixel Art', label: 'Pixel Art (Seni Piksel Retro)', icon: '👾' },
  { id: 'Claymation Style', label: 'Claymation Style (Model Lempung)', icon: '🧸' },
  { id: 'HandDrawn Sketch', label: 'HandDrawn Sketch (Sketsa Tangan)', icon: '✏️' },
  { id: 'Origami Style', label: 'Origami Style (Seni Origami)', icon: '📄' },
  { id: 'Glassmorphism', label: 'Glassmorphism (Efek Kaca)', icon: '🔮' },
  { id: 'Metal Emboss', label: 'Metal Emboss (Embos Logam)', icon: '⚙️' },
  { id: 'Line Art', label: 'Line Art (Seni Garis)', icon: '✏️' },
  { id: 'Lego Style', label: 'Lego Style (Gaya Mainan Balok)', icon: '🧱' },
  { id: 'Voxel Art', label: 'Voxel Art (Gaya Kubus Voxel)', icon: '🟩' }
];

export const PromptGenView: React.FC<PromptGenViewProps> = ({ 
  t, 
  prefilledSubject, 
  onPrefillConsumed,
  isLicensed = false,
  dailyGenCount = 0,
  incrementDailyCount,
  aiOptions,
  user,
  db,
  uiLanguage = 'en'
}) => {
  const [subject, setSubject] = useState('');

  useEffect(() => {
    if (prefilledSubject) {
      setSubject(prefilledSubject);
      if (onPrefillConsumed) onPrefillConsumed();
    }
  }, [prefilledSubject, onPrefillConsumed]);

  const [styleCategory, setStyleCategory] = useState('Cinematic');
  const [variation, setVariation] = useState<number>(30); // Default to a realistic 30 variations
  const [minWords, setMinWords] = useState<number>(15);
  const [maxWords, setMaxWords] = useState<number>(60);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [promptMode, setPromptMode] = useState<'background' | 'png'>('background');
  const [pngBgColor, setPngBgColor] = useState<'white' | 'black' | 'transparent'>('white');
  const [bgNegativePrompt, setBgNegativePrompt] = useState('blurry, low quality, worst quality, text, watermark, signature, bad proportions, bad anatomy');
  const [pngNegativePrompt, setPngNegativePrompt] = useState('scenery, context backdrop, ground shadow, drop shadow, ambient background, blurry, watermark, text');
  
  const currentStyleOptions = promptMode === 'background' ? BACKGROUND_STYLE_OPTIONS : PNG_STYLE_OPTIONS;
  
  const [result, setResult] = useState<{
    prompts: string[];
    negativePrompt: string;
    styleExplanation: string[];
  } | null>(null);

  const [inspirations, setInspirations] = useState<any[]>([]);

  const fetchInspirations = async () => {
    try {
      const response = await fetch('/api/inspirations');
      const data = await response.json();
      setInspirations(data);
    } catch (e) {
      console.error("Failed to fetch inspirations:", e);
    }
  };

  useEffect(() => {
    fetchInspirations();
    const interval = setInterval(fetchInspirations, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Copy state variables
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedNegative, setCopiedNegative] = useState(false);
  const [copiedIndices, setCopiedIndices] = useState<Record<number, boolean>>({});

  // Pagination for output list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  // Load history with backward compatibility and cloud sync
  useEffect(() => {
    // Load deleted prompt history item IDs to prevent resurrection
    let deletedIds: string[] = [];
    try {
      const deletedStored = localStorage.getItem('metazo_deleted_prompt_ids');
      if (deletedStored) {
        deletedIds = JSON.parse(deletedStored);
      }
    } catch (e) {}

    // 1. First load from local storage
    let localHistory: PromptHistoryItem[] = [];
    try {
      const stored = localStorage.getItem('metazo_prompt_history_simple');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localHistory = parsed.map((item: any) => ({
            ...item,
            prompts: item.prompts || (item.optimizedPrompt ? [item.optimizedPrompt] : [item.subject])
          })).filter((item: any) => !deletedIds.includes(item.id));
          setHistory(localHistory);
        }
      }
    } catch (e) {
      console.warn("Could not load prompt history:", e);
    }

    // 2. Fetch/sync from Firestore if user is logged in
    if (user && db) {
      import('../supabase').then(({ doc, getDoc, updateDoc }) => {
        getDoc(doc(db, 'users', user.uid)).then((docSnap) => {
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            if (Array.isArray(cloudData.promptGenHistory)) {
              // Merge local and cloud history by id
              const combinedMap = new Map<string, PromptHistoryItem>();
              // Add cloud items first (so they are preferred if matching ids)
              cloudData.promptGenHistory.forEach((item: any) => {
                if (!deletedIds.includes(item.id)) {
                  combinedMap.set(item.id, item);
                }
              });
              // Add local items (overwrite or fill missing)
              localHistory.forEach((item: any) => {
                if (!combinedMap.has(item.id) && !deletedIds.includes(item.id)) {
                  combinedMap.set(item.id, item);
                }
              });
              // Convert back to sorted list
              const sorted = Array.from(combinedMap.values()).sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              }).slice(0, 30); // Keep up to 30 items
              
              setHistory(sorted);
              localStorage.setItem('metazo_prompt_history_simple', JSON.stringify(sorted));
              
              if (sorted.length !== cloudData.promptGenHistory.length) {
                updateDoc(doc(db, 'users', user.uid), {
                  promptGenHistory: sorted
                }).catch(err => console.warn('db_op', err));
              }
            } else {
              if (localHistory.length > 0) {
                updateDoc(doc(db, 'users', user.uid), {
                  promptGenHistory: localHistory
                }).catch(err => console.warn('db_op', err));
              }
            }
          }
        }).catch(err => console.warn("Failed to load prompt history from cloud:", err));
      });
    }
  }, [user, db]);

  const saveToHistory = (newItem: PromptHistoryItem) => {
    // If the saved item ID was previously in deletedIds, remove it
    try {
      const deletedStored = localStorage.getItem('metazo_deleted_prompt_ids');
      if (deletedStored) {
        let deletedIds: string[] = JSON.parse(deletedStored);
        if (deletedIds.includes(newItem.id)) {
          deletedIds = deletedIds.filter(id => id !== newItem.id);
          localStorage.setItem('metazo_deleted_prompt_ids', JSON.stringify(deletedIds));
        }
      }
    } catch (e) {}

    const updated = [newItem, ...history.slice(0, 29)]; // limit to last 30 items
    setHistory(updated);
    try {
      localStorage.setItem('metazo_prompt_history_simple', JSON.stringify(updated));
    } catch(e) {}

    if (user && db) {
      import('../supabase').then(({ doc, updateDoc }) => {
        updateDoc(doc(db, 'users', user.uid), {
          promptGenHistory: updated
        }).catch(err => console.warn('db_op', err));
      });
    }
  };

  const handleClearHistory = () => {
    // Add all current IDs to deletedIds list to prevent resurrection
    try {
      const deletedStored = localStorage.getItem('metazo_deleted_prompt_ids');
      let deletedIds: string[] = deletedStored ? JSON.parse(deletedStored) : [];
      history.forEach(item => {
        if (!deletedIds.includes(item.id)) {
          deletedIds.push(item.id);
        }
      });
      localStorage.setItem('metazo_deleted_prompt_ids', JSON.stringify(deletedIds));
    } catch (e) {}

    setHistory([]);
    try {
      localStorage.removeItem('metazo_prompt_history_simple');
    } catch(e) {}

    if (user && db) {
      import('../supabase').then(({ doc, updateDoc }) => {
        updateDoc(doc(db, 'users', user.uid), {
          promptGenHistory: []
        }).catch(err => console.warn('db_op', err));
      });
    }
  };

  const exportHistoryToJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `metazo_prompt_history_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Add to deletedIds list to prevent resurrection
    try {
      const deletedStored = localStorage.getItem('metazo_deleted_prompt_ids');
      let deletedIds: string[] = deletedStored ? JSON.parse(deletedStored) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('metazo_deleted_prompt_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem('metazo_prompt_history_simple', JSON.stringify(updated));
    } catch(e) {}

    if (user && db) {
      import('../supabase').then(({ doc, updateDoc }) => {
        updateDoc(doc(db, 'users', user.uid), {
          promptGenHistory: updated
        }).catch(err => console.warn('db_op', err));
      });
    }
  };

  const handleGenerate = async () => {
    if (!isLicensed && dailyGenCount >= getDailyLimit()) {
      setError(t.prompt_error_trial);
      return;
    }

    if (!subject.trim()) {
      setError(t.prompt_error_empty);
      return;
    }

    setError(null);
    setLoading(true);
    setProgress(0);
    setResult(null);
    setCurrentPage(1);
    setSearchQuery('');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 10;
      });
    }, 400);

    // Scroll smoothly to output container
    setTimeout(() => {
      document.getElementById('prompt-output-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: getHeaders(aiOptions),
        body: JSON.stringify({
          subject: subject.trim(),
          styleCategory,
          variation,
          promptMode,
          pngBgColor,
          minWords,
          maxWords,
          userNegativePrompt: promptMode === 'background' ? bgNegativePrompt.trim() : pngNegativePrompt.trim(),
          model: aiOptions?.model,
          seed
        })
      });

      if (!response.ok) {
        let errorMsg = "Gagal berkomunikasi dengan server AI.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      setProgress(100);
      
      if (!isLicensed && incrementDailyCount) {
        incrementDailyCount();
      }
      
      // Save to local storage history list
      const historyItem: PromptHistoryItem = {
        id: `prompt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        subject: subject.trim(),
        styleCategory,
        variation,
        prompts: data.prompts || [],
        negativePrompt: data.negativePrompt || '',
        styleExplanation: data.styleExplanation || [],
        promptMode,
        pngBgColor
      };
      saveToHistory(historyItem);
      
    } catch (err: any) {
      console.error("Failed generating prompt variations:", err);
      setError(err.message || "Sistem sedang padat, silakan coba beberapa saat lagi.");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => setLoading(false), 300);
    }
  };

  const copySinglePrompt = async (text: string, index: number) => {
    const success = await robustCopy(text);
    if (success) {
      setCopiedIndices(prev => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setCopiedIndices(prev => ({ ...prev, [index]: false }));
      }, 2000);
    }
  };

  const copyAllPromptsText = async () => {
    if (!result || !result.prompts || result.prompts.length === 0) return;
    const allText = result.prompts.join('\n\n');
    const success = await robustCopy(allText);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const copyNegativeText = async () => {
    if (!result || !result.negativePrompt) return;
    const success = await robustCopy(result.negativePrompt);
    if (success) {
      setCopiedNegative(true);
      setTimeout(() => setCopiedNegative(false), 2500);
    }
  };

  const downloadAsTxt = () => {
    if (!result || !result.prompts || result.prompts.length === 0) return;
    const header = `=== PROMPT SPECIFICATION SHEET ===\nTema Visual: ${subject}\nGaya Kategori: ${styleCategory}\nJumlah Variasi: ${result.prompts.length}\nNegative Prompt: ${result.negativePrompt}\n\n==================================\n`;
    const listBody = result.prompts.map((p, i) => `PROMPT #${i + 1}\n--------------------------\n${p}\n`).join('\n');
    
    const blob = new Blob([header + listBody], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prompts_${subject.substring(0, 20).replace(/\s+/g, '_')}_${styleCategory}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter prompts based on search query
  const filteredPrompts = result?.prompts 
    ? result.prompts.map((p, originalIdx) => ({ text: p, globalIdx: originalIdx }))
        .filter(item => item.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Pagination bounds calculation
  const totalPrompts = filteredPrompts.length;
  const totalPages = Math.max(1, Math.ceil(totalPrompts / itemsPerPage));
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPrompts.slice(indexOfFirstItem, indexOfLastItem);

  // Derive variation description
  let presetLevelInfo = "⚡ Lite Draft";
  let presetLevelColor = "text-sky-500 bg-sky-500/10 border-sky-500/20";
  let presetLevelSummary = t.prompt_preset_lite;
  if (variation > 40 && variation <= 80) {
    presetLevelInfo = "🎨 Artistic Mix";
    presetLevelColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    presetLevelSummary = t.prompt_preset_artistic;
  } else if (variation > 80) {
    presetLevelInfo = "🔥 Ultra Collection";
    presetLevelColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    presetLevelSummary = t.prompt_preset_ultra;
  }

  return (
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-1 border-b border-slate-200/60 dark:border-white/5 pb-4 relative overflow-hidden">
        {/* Progress Bar */}
        {loading && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-300 ease-out z-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        )}
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <Wand2 className="text-emerald-500 fill-emerald-500/10" size={24} />
            {t.prompt_studio_title}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">
            {t.prompt_studio_subtitle}
          </p>
        </div>
        
        <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
          <FeatureGuideButton 
            title={t.guide_prompt_text_title} 
            description={t.guide_prompt_text_desc} 
            t={t} 
          />
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <Sliders size={12} className="text-emerald-500 animate-pulse" />
            <span>{t.prompt_studio_version}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Interactive Configuration Panel - ALWAYS FULL WIDTH ON TOP */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-[1.5rem] p-5 sm:p-7 space-y-7 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 opacity-80" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full" />
          <div className="border-b border-slate-100 dark:border-white/5 pb-3 flex justify-between items-center">
            <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-500" />
              {t.prompt_formula_title}
            </h3>
            <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 rounded-xl">
              {t.prompt_engine_active}
            </span>
          </div>

          {/* Mode Toggles: Background and PNG Asset */}
          <div className="grid grid-cols-2 bg-slate-50 dark:bg-black/20 p-1 rounded-2xl border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => {
                setPromptMode('background');
                setStyleCategory('Cinematic');
              }}
              className={`py-3.5 px-4 rounded-[1.5rem] text-xs font-semibold uppercase tracking-widest flex items-center justify-center space-x-2.5 transition-all duration-300 cursor-pointer ${
                promptMode === 'background'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="text-sm">🖼️</span>
              <span>{t.prompt_tab_background}</span>
            </button>
            <button
              onClick={() => {
                setPromptMode('png');
                setStyleCategory('3D Render');
              }}
              className={`py-3.5 px-4 rounded-[1.5rem] text-xs font-semibold uppercase tracking-widest flex items-center justify-center space-x-2.5 transition-all duration-300 cursor-pointer ${
                promptMode === 'png'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="text-sm">✨</span>
              <span>{t.prompt_tab_png}</span>
            </button>
          </div>

          {!isLicensed && (
            <div className="bg-emerald-500/5 dark:bg-black/20 p-4 rounded-2xl border border-emerald-500/15 dark:border-white/5 shadow-inner">
              <div className="flex justify-between text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-550 animate-pulse" />
                  {t.prompt_trial_label}
                </span>
                <span className={dailyGenCount >= getDailyLimit() ? "text-red-500 font-semibold" : "text-emerald-500 font-semibold"}>
                  {dailyGenCount}/{getDailyLimit()} {t.prompt_generate_count}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    dailyGenCount >= getDailyLimit() ? 'bg-red-500' : 'bg-emerald-500'
                  }`} 
                  style={{ width: `${Math.min(100, (dailyGenCount / getDailyLimit()) * 100)}%` }} 
                />
              </div>
              {dailyGenCount >= getDailyLimit() ? (
                <span className="text-[10px] text-red-500 font-extrabold block mt-2 leading-tight">
                  {t.prompt_trial_expired}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mt-1.5 leading-tight">
                  {t.prompt_trial_remaining} <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{Math.max(0, getDailyLimit() - dailyGenCount)} {t.prompt_trial_times}</strong>.
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left side within the input panel */}
            <div className="space-y-4">
              {/* 1. Subject Area */}
              <div className="space-y-2 group">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <AlignLeft size={14} className="text-emerald-500" />
                    {t.prompt_subject_label}
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">Bilingual Support</span>
                </div>
                
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-[1.5rem] blur opacity-0 group-hover:opacity-100 transition duration-500 ease-in-out"></div>
                  <textarea
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t.prompt_subject_placeholder}
                    className="relative w-full min-h-[140px] rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm p-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all font-medium leading-relaxed resize-y shadow-inner z-10"
                  />
                </div>
              </div>

              {/* Inspiration Presets */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-500" />
                  {t.prompt_inspiration_label}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {inspirations.map((insp) => (
                    <button
                      key={`${insp.label}-${insp.text.slice(0, 20)}`}
                      type="button"
                      onClick={() => {
                        setSubject(insp.text);
                        setError(null);
                      }}
                      className="flex flex-col items-start gap-1 p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl text-left hover:border-emerald-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 cursor-pointer group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition-colors relative z-10 flex items-center justify-between w-full">
                        {insp.label}
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-500" />
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight relative z-10">
                        {insp.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ----------------- NEGATIVE PROMPT INPUT COLUMN ----------------- */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    {t.prompt_negative_label}
                  </label>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t.prompt_negative_subtitle}</span>
                </div>

                {promptMode === 'background' ? (
                  <textarea
                    value={bgNegativePrompt}
                    onChange={(e) => setBgNegativePrompt(e.target.value)}
                    placeholder="Contoh: blurry, bad anatomy, text, watermark, ugly..."
                    className="w-full min-h-[90px] rounded-[1.5rem] border border-rose-500/10 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-500/5 p-3 px-3.5 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:bg-white dark:focus:bg-slate-900/40 transition-all leading-relaxed resize-y"
                  />
                ) : (
                  <textarea
                    value={pngNegativePrompt}
                    onChange={(e) => setPngNegativePrompt(e.target.value)}
                    placeholder="Contoh: scenery, shadow, realistic background, text..."
                    className="w-full min-h-[90px] rounded-[1.5rem] border border-rose-500/10 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-500/5 p-3 px-3.5 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:bg-white dark:focus:bg-slate-900/40 transition-all leading-relaxed resize-y"
                  />
                )}
                <p className="text-[9px] text-slate-400 dark:text-slate-400 font-medium leading-relaxed italic">
                  {t.prompt_negative_desc}
                </p>
              </div>
            </div>

            {/* Right side within the input panel */}
            <div className="space-y-6">
              {/* 2. Style Category Dropdown & Pills */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                  {t.prompt_style_master_label}
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[1.5rem] blur opacity-0 group-hover:opacity-100 transition duration-500 ease-in-out"></div>
                  <select
                    value={styleCategory}
                    onChange={(e) => setStyleCategory(e.target.value)}
                    className="relative w-full rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm p-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer appearance-none shadow-sm transition-all z-10"
                  >
                    {currentStyleOptions.map((opt) => (
                      <option key={opt.id} value={opt.id} className="dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-200">
                        {opt.icon} &nbsp; {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-emerald-500 z-20">
                    <ChevronRight className="rotate-90" size={16} />
                  </div>
                </div>

                {/* Quick Selection Option Chips */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {t.prompt_style_quick_label}
                  </span>
                  <div className="grid grid-cols-2 xs:flex xs:flex-wrap gap-1.5">
                    {currentStyleOptions.map((opt) => {
                      const isSelected = styleCategory === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setStyleCategory(opt.id)}
                          className={`px-3 py-2 rounded-[1.5rem] text-[10px] font-extrabold uppercase transition-all duration-200 flex items-center gap-1.5 border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-md shadow-black/5 font-semibold scale-[1.02]'
                              : 'bg-slate-50 dark:bg-black/15 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PNG Background Dropdown Option - Only visible when promptMode === 'png' */}
              {promptMode === 'png' && (
                <div className="space-y-3 p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-[1.5rem] animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                    <span>{t.prompt_png_bg_label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 rounded font-semibold font-mono">PNG Style</span>
                  </label>
                  
                  <div className="relative">
                    <select
                      value={pngBgColor}
                      onChange={(e) => setPngBgColor(e.target.value as any)}
                      className="w-full rounded-[1.5rem] border border-emerald-550/20 dark:border-emerald-500/30 bg-white dark:bg-slate-950 p-3.5 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer appearance-none"
                    >
                      <option value="white">{t.prompt_png_bg_white}</option>
                      <option value="black">{t.prompt_png_bg_black}</option>
                      <option value="transparent">{t.prompt_png_bg_transparent}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    {t.prompt_png_bg_desc}
                  </p>
                </div>
              )}

              {/* 3. Variation Slider (Determines count of generated prompts: 10 to 150) */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-4 rounded-[1.5rem]">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <span>{t.prompt_variation_label}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-[1.5rem] p-4 font-mono shadow-sm">
                    {variation} {t.prompt_variation_unit}
                  </span>
                </div>
                
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="5"
                  value={variation}
                  onChange={(e) => setVariation(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                />
                
                <div className="flex justify-between text-[10px] text-slate-450 dark:text-slate-500 font-bold border-t border-slate-200/60 dark:border-white/10 pt-3 mt-2 items-center">
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${presetLevelColor}`}>
                      {presetLevelInfo}
                    </span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-right text-[9px] truncate">
                    {presetLevelSummary}
                  </span>
                </div>
              </div>

              {/* 4. Word Count Range Sliders */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-4 rounded-[1.5rem]">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <span>{t.prompt_word_count_label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-[1.5rem] font-bold shadow-sm">{minWords}-{maxWords} Words</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Minimum</span>
                      <span>{minWords}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max={maxWords - 5}
                      step="5"
                      value={minWords}
                      onChange={(e) => setMinWords(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-zinc-850 rounded-2xl appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      <span>Maximum</span>
                      <span>{maxWords}</span>
                    </div>
                    <input
                      type="range"
                      min={minWords + 5}
                      max="150"
                      step="5"
                      value={maxWords}
                      onChange={(e) => setMaxWords(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-zinc-850 rounded-2xl appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed italic border-t border-slate-100 dark:border-white/5 pt-2">
                  {t.prompt_word_count_desc}
                </p>
              </div>

              {/* 5. Seed Variation Config */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-4 rounded-[1.5rem]">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <span>{uiLanguage === 'id' ? '🎲 Variasi Seed (Entropy)' : '🎲 Variation Seed (Entropy)'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-[1.5rem] p-4 font-mono shadow-sm">
                    {seed}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="E.g. 12345"
                    className="flex-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                    className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer w-10 shrink-0"
                    title={uiLanguage === 'id' ? 'Acak Seed' : 'Randomize Seed'}
                  >
                    <RefreshCw size={14} className="animate-spin-slow text-white" />
                  </button>
                </div>

                <p className="text-[9px] text-slate-400 dark:text-slate-550 font-medium leading-relaxed italic">
                  {uiLanguage === 'id' 
                    ? "Masukkan nilai seed manual untuk replikasi layout, atau acak seed untuk memaksimalkan variasi dan menghindari pola prompt monoton." 
                    : "Enter a manual seed to replicate specific composition layouts, or randomize to maximize prompt variation and avoid repetitiveness."}
                </p>
              </div>
            </div>
          </div>

          {/* Display potential error messages */}
          {error && (
            <div className="flex items-center space-x-2.5 p-3.5 bg-red-550/10 border border-red-500/20 rounded-[1.5rem] text-xs font-bold text-red-550 dark:text-red-400 animate-bounce">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions line */}
          <div className="border-t border-slate-200/60 dark:border-white/10 pt-5 relative z-10">
            <button
              onClick={handleGenerate}
              disabled={loading || !subject.trim()}
              className={`w-full py-4 sm:py-5 rounded-[1.5rem] font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center space-x-2.5 transition-all duration-300 relative overflow-hidden ${
                loading 
                  ? 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed' 
                  : !subject.trim()
                    ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed border border-dashed border-slate-300 dark:border-slate-700'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer cursor-pulse border border-emerald-400/20'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin relative z-10" size={16} />
                  <span className="relative z-10">{t.prompt_btn_synthesizing.replace('{count}', variation.toString())}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="fill-white animate-pulse relative z-10" />
                  <span className="relative z-10 drop-shadow-sm">{t.prompt_btn_synthesize.replace('{count}', variation.toString())}</span>
                  {!subject.trim() || loading ? null : <div className="absolute inset-0 bg-white/20 blur-md rounded-full animate-beam opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Results Page - ALWAYS ON THE BOTTOM */}
        <div id="prompt-output-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main prompt output panel */}
          <div className="lg:col-span-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-7 text-slate-800 dark:text-slate-100 shadow-xl shadow-black/5 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-3xl rounded-full" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 dark:border-slate-800 pb-5 gap-3 relative z-10">
              <div>
                <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  {t.prompt_output_title} {result && `(${totalPrompts !== (result?.prompts?.length || 0) ? `${totalPrompts} of ${result?.prompts?.length || 0}` : `${totalPrompts}`})`}
                </h3>
                {result && (
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <p className="text-[10px] text-slate-400 font-medium font-mono">
                      {t.prompt_output_subtitle}
                    </p>
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold rounded uppercase tracking-wider font-mono">
                      {promptMode === 'png' ? t.prompt_output_badge_png.replace('{color}', pngBgColor.toUpperCase()) : t.prompt_output_badge_scene}
                    </span>
                  </div>
                )}
              </div>

              {result && result.prompts && result.prompts.length > 0 && (
                <div className="flex items-center space-x-3.5 self-end sm:self-center">
                  <button
                    onClick={copyAllPromptsText}
                    className={`text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedAll 
                        ? 'text-emerald-400 font-bold' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {copiedAll ? <Check size={14} className="text-emerald-400 animate-pulse" /> : <Copy size={14} />}
                    <span>{copiedAll ? t.prompt_output_btn_copied : t.prompt_output_btn_copy_all}</span>
                  </button>

                  <button
                    onClick={downloadAsTxt}
                    className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download size={14} />
                    <span>{t.prompt_output_btn_download}</span>
                  </button>

                  {/* Clean clear-workspace action */}
                  <button
                    onClick={() => {
                      setResult(null);
                      setSearchQuery('');
                    }}
                    className="text-slate-500 hover:text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors ml-1 cursor-pointer"
                    title="Bersihkan workspace saat ini"
                  >
                    <X size={14} />
                    <span>{t.prompt_output_btn_clear}</span>
                  </button>
                </div>
              )}
            </div>

            {/* LIVE SEARCH FILTER WITHIN OUTPUTS */}
            {result && result.prompts && result.prompts.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t.prompt_output_search_placeholder}
                  className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-[1.5rem] py-2 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                  <Loader2 size={48} className="text-emerald-500 animate-spin relative" />
                </div>
                <div className="text-center space-y-2 max-w-sm mx-auto px-4">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-emerald-400 uppercase tracking-tighter">
                    {progress < 30 ? t.prompt_loading_step1 : 
                     progress < 60 ? t.prompt_loading_step2 : 
                     progress < 90 ? t.prompt_loading_step3 : t.prompt_loading_step4}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed font-mono uppercase tracking-widest">
                    Gemini Pro is expanding {variation} variations for "{subject}"
                  </p>
                </div>
                
                <div className="w-full max-w-md bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 w-full gap-3 mt-6">
                  {[1, 2, 3].map(i => (
                    <div key={`prompt-skel-${i}`} className="h-16 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] animate-pulse" />
                  ))}
                </div>
              </div>
            ) : result && result.prompts && result.prompts.length > 0 ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Adobe Stock Similarity Protection Alert Banner */}
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] p-4 flex gap-3 items-start shadow-sm">
                  <span className="text-lg">🛡️</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      {uiLanguage === 'id' ? 'Proteksi Anti-Kesamaan Adobe Stock Aktif' : 'Adobe Stock Similarity Protection Active'}
                    </h4>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                      {uiLanguage === 'id' 
                        ? "Prompt di bawah ini telah dioptimalkan secara otomatis untuk menghasilkan perbedaan mencolok dalam komposisi, warna, ekspresi, atau skenario guna menghindari penolakan konten duplikat/repetitif dari moderator Adobe Stock." 
                        : "The prompts below are dynamically randomized and structured with Noticeable Differences in composition, color, expression, and scenarios to safely clear Adobe Stock's strict anti-repetitive moderation."}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                        {uiLanguage === 'id' ? 'Komposisi Variatif' : 'Noticeable Variations'}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                        {uiLanguage === 'id' ? 'Bebas Klona' : 'Anti-Clone Engine'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* No filter matching message */}
                {totalPrompts === 0 && (
                  <div className="py-12 text-center text-slate-500 space-y-1 border border-dashed border-white/5 rounded-[1.5rem]">
                    <Search className="mx-auto text-slate-600 mb-2" size={20} />
                    <p className="text-xs font-bold uppercase tracking-wider">{t.prompt_output_no_match_title}</p>
                    <p className="text-[10px]">{t.prompt_output_no_match_desc.replace('{query}', searchQuery).replace('{count}', result.prompts.length.toString())}</p>
                  </div>
                )}

                {/* Visual Listing with smart pagination */}
                <div className="space-y-3.5">
                  {currentItems.map((item, idx) => {
                    const globalIdx = item.globalIdx;
                    const promptText = item.text;
                    const isCopied = !!copiedIndices[globalIdx];
                    return (
                      <div 
                        key={globalIdx}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] p-4 sm:p-5 hover:border-emerald-500/30 transition-all duration-200 group flex items-start justify-between gap-4"
                      >
                        <p className="text-xs sm:text-xs md:text-sm font-mono font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-words select-all whitespace-pre-wrap group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors flex-1">
                          <span className="text-slate-400 dark:text-slate-500 font-bold mr-2">{globalIdx + 1}.</span>
                          {promptText}
                        </p>

                        <button
                          onClick={() => copySinglePrompt(promptText, globalIdx)}
                          className={`p-1.5 rounded-2xl transition-all flex items-center justify-center gap-1 text-[10px] font-semibold uppercase cursor-pointer shrink-0 ${
                            isCopied 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-white/10'
                          }`}
                          title="Salin prompt tunggal ini"
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Toolbar */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-zinc-50 dark:bg-black/20 p-3 rounded-[1.5rem] border border-slate-200/60 dark:border-white/5 gap-3.5">
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase font-mono">
                      <span>Tampilkan</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(parseInt(e.target.value, 10));
                          setCurrentPage(1);
                        }}
                        className="bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-slate-800 dark:text-slate-200 cursor-pointer font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                      </select>
                      <span>per halaman</span>
                    </div>

                    <div className="flex items-center space-x-3.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                          currentPage === 1 ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''
                        }`}
                      >
                        <ChevronLeft size={14} />
                      </button>

                      <span className="text-[10px] font-semibold uppercase text-slate-350 tracking-wider font-mono">
                        Halaman {currentPage} / {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                          currentPage === totalPages ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''
                        }`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Consolidated Negative Prompt Panel */}
                {result.negativePrompt && (
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <AlertCircle size={10} className="text-red-400 font-mono" />
                        Negative Prompt Global (Gunakan ini untuk hasil bersih)
                      </span>
                      <button
                        onClick={copyNegativeText}
                        className={`px-2 py-1 rounded text-[9px] font-semibold uppercase flex items-center space-x-1 transition-all cursor-pointer ${
                          copiedNegative 
                            ? 'bg-emerald-500 text-white animate-pulse' 
                            : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-350'
                        }`}
                      >
                        {copiedNegative ? <Check size={10} /> : <Copy size={10} />}
                        <span>{copiedNegative ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-[1.5rem] text-[11px] font-mono leading-relaxed select-all text-slate-600 dark:text-slate-400 max-h-[80px] overflow-y-auto">
                      {result.negativePrompt}
                    </div>
                  </div>
                )}

                {/* Style insights details */}
                {result.styleExplanation && result.styleExplanation.length > 0 && (
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1 font-mono">
                      <Info size={11} className="text-slate-400" />
                      Detail Rangkuman Gaya & Keragaman Artistik
                    </span>
                    <ul className="space-y-1.5 font-medium">
                      {result.styleExplanation.slice(0, 3).map((exp, idx) => (
                        <li key={idx} className="text-[11px] text-slate-400 flex items-start space-x-1.5 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-ping" />
                          <span>{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-32 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 shadow-md shadow-black/5 border border-slate-100 dark:border-white/5">
                  <Sparkles size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Awaiting Input</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                  Describe your visual theme and configure variations. AI will generate unique prompt sets tailored for your needs.
                </p>
              </div>
            )}
          </div>

          {/* Simple Memory/Local Storage Logs */}
          <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl shadow-black/5 space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <RefreshCw size={14} className="text-emerald-500" />
                Riwayat Gubahan ({history.length})
              </span>
              {history.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportHistoryToJSON}
                    className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download size={10} />
                    Backup
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={10} />
                    Hapus
                  </button>
                </div>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-12 flex flex-col justify-center items-center text-center space-y-3 opacity-50">
                <RefreshCw size={24} className="text-slate-400" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Belum ada riwayat
                </span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSubject(item.subject);
                      setStyleCategory(item.styleCategory);
                      setVariation(item.variation);
                      setPromptMode(item.promptMode || 'background');
                      setPngBgColor(item.pngBgColor || 'white');
                      setResult({
                        prompts: item.prompts || [],
                        negativePrompt: item.negativePrompt,
                        styleExplanation: item.styleExplanation || []
                      });
                      setCurrentPage(1);
                      document.getElementById('prompt-output-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl cursor-pointer text-left transition-all duration-200 flex justify-between items-start gap-4 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="space-y-2 min-w-0 flex-1 relative z-10">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full leading-none">
                          {item.styleCategory}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold font-mono">
                          {item.timestamp} • {item.prompts?.length || item.variation} Vars
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {item.subject}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 relative z-10"
                      title="Hapus riwayat ini"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
