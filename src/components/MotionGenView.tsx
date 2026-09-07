import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    Code, Settings, Download, Copy, Type, Monitor, Cpu, Server, Video, Loader2, 
    CheckCircle2, SlidersHorizontal, Sparkles, Send, Wand2, RotateCcw, ChevronDown, 
    ChevronUp, AlertCircle, MessageSquare, User, Bot, Lock, Play, Check, Flame, Zap,
    Maximize2, Palette, Film, Smartphone, Square, Layers, RefreshCw, Eye
} from 'lucide-react';
import { LiveRemotionRunner } from './remotion/LiveRemotionRunner';
import { RenderMode, RenderProgress, startMotionRender } from '../utils/motionRenderHelper';
import { generateMotionCode, MotionGenHistoryItem, ServiceOptions } from '../../services/geminiService';

const DEFAULT_CODE = JSON.stringify({
  "title": "MetaZo Motion Graphics",
  "description": "Next-Gen Remotion Animation Engine",
  "fps": 30,
  "durationInFrames": 150,
  "background": {
    "type": "mesh",
    "colors": ["#4f46e5", "#9333ea", "#ec4899"],
    "animated": true
  },
  "scenes": [
    {
      "id": "scene-1",
      "from": 0,
      "durationInFrames": 150,
      "transition": "fade",
      "elements": [
        {
          "id": "badge-1",
          "type": "badge",
          "content": "NEXT-GEN VIDEO ENGINE",
          "iconName": "sparkles",
          "layout": { "align": "center" },
          "style": {
            "color": "#a5b4fc",
            "backgroundColor": "rgba(99, 102, 241, 0.2)",
            "borderRadius": 999,
            "fontSize": 16,
            "fontWeight": 700
          },
          "animation": { "type": "spring-in", "delay": 0, "damping": 12 }
        },
        {
          "id": "heading-1",
          "type": "heading",
          "content": "METAZO MOTION",
          "layout": { "align": "center" },
          "style": {
            "fontSize": 68,
            "fontWeight": 900,
            "gradient": ["#ffffff", "#e2e8f0", "#a855f7"]
          },
          "animation": { "type": "slide-up", "delay": 6, "damping": 12 }
        },
        {
          "id": "subtitle-1",
          "type": "subtitle",
          "content": "Hardware-Accelerated WebCodecs & Zero-Drift Video Export",
          "layout": { "align": "center", "maxWidth": "750px" },
          "style": {
            "fontSize": 24,
            "color": "#cbd5e1"
          },
          "animation": { "type": "fade-in", "delay": 14 }
        },
        {
          "id": "cta-1",
          "type": "button",
          "content": "Render Cinema Video",
          "iconName": "play",
          "layout": { "align": "center" },
          "style": {
            "fontSize": 20,
            "fontWeight": 700,
            "gradient": ["#6366f1", "#a855f7", "#ec4899"],
            "borderRadius": 16,
            "boxShadow": "0 10px 30px rgba(168, 85, 247, 0.5)"
          },
          "animation": { "type": "bounce-in", "delay": 20 }
        }
      ]
    }
  ]
}, null, 2);

const PRESETS = [
    {
        category: "Branding & Logos",
        items: [
            {
                title: "Logo Reveal Glow",
                icon: "✨",
                description: "Partikel glow neon, spring bounce halus & typography gradasi.",
                prompt: "Buatkan animasi Logo Reveal modern dengan partikel glow, efek spring bounce halus, dan teks 'METAZO PRO' berwarna gradasi neon cyan ke purple."
            },
            {
                title: "3D Glossy Cube Stinger",
                icon: "🧊",
                description: "Rotasi kubus 3D isometrik dengan specular lighting dan nama brand.",
                prompt: "Buatkan animasi 3D isometrik logo stinger modern dengan efek rotasi kubus melayang, specular glassmorphism glow, dan teks brand 'METAZO STUDIO'."
            }
        ]
    },
    {
        category: "Social & YouTube",
        items: [
            {
                title: "YouTube Subscribe Pop",
                icon: "🔔",
                description: "Tombol subscribe interaktif, lonceng notifikasi & kursor klik.",
                prompt: "Buatkan animasi Subscribe Button YouTube dengan ikon bell yang berdering, tombol like jempol, dan efek kursor klik halus."
            },
            {
                title: "Cinematic Lower Third",
                icon: "🏷️",
                description: "Glassmorphism lower third nama narasumber & profesi.",
                prompt: "Buatkan animasi Lower Third sinematik untuk nama pembicara: 'Alex Johnson - Creative Director' dengan background gradasi glassmorphism dan garis aksen menyala."
            },
            {
                title: "Social Follow Reels Overlay",
                icon: "📱",
                description: "Handle media sosial Instagram/TikTok mengambang untuk video vertikal.",
                prompt: "Buatkan animasi badge media sosial minimalis elegan '@metazo.ai' dengan ikon Instagram dan TikTok yang muncul slide-up bergantian."
            }
        ]
    },
    {
        category: "Tech & Promo",
        items: [
            {
                title: "Cyberpunk HUD Counter",
                icon: "⚡",
                description: "Scanline neon, grid digital, dan penghitung angka 0% ke 100%.",
                prompt: "Buatkan animasi angka counter statistik futuristik bergaya Cyberpunk HUD dengan scanline neon hijau, grid digital, dan hitungan naik 0% ke 100%."
            },
            {
                title: "Mega Sale 50% Off Promo",
                icon: "🛍️",
                description: "Badge diskon 3D berputar, teks bold dinamis & latar api gradasi.",
                prompt: "Buatkan animasi banner promosi 'MEGA SALE 50% OFF' dengan badge diskon 3D berputar, teks bold dinamis, dan latar belakang gradasi merah-oranye menyala."
            }
        ]
    }
];

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    codeSnapshot?: string;
    isError?: boolean;
}

interface MotionGenViewProps {
    t?: any;
    isLicensed?: boolean;
    dailyGenCount?: number;
    incrementDailyCount?: (amount?: number) => void;
    setShowLimitModal?: (show: boolean) => void;
    setShowActivationModal?: (show: boolean) => void;
    aiOptions?: ServiceOptions;
}

const FREE_DAILY_LIMIT = 25;

export function MotionGenView({
    isLicensed = false,
    dailyGenCount = 0,
    incrementDailyCount,
    setShowLimitModal,
    setShowActivationModal,
    aiOptions
}: MotionGenViewProps) {
    const [activeTab, setActiveTab] = useState<'prompt' | 'templates' | 'code' | 'settings'>('prompt');
    const [renderMode, setRenderMode] = useState<RenderMode>('deterministic-worker');
    const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
    const [isRendering, setIsRendering] = useState(false);

    const [code, setCode] = useState(DEFAULT_CODE);
    const [copied, setCopied] = useState(false);
    const [dynamicProps, setDynamicProps] = useState<any>({});

    // Vibe coding AI state
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isGenerating]);

    // Configurations
    const [fps, setFps] = useState(30);
    const [durationSeconds, setDurationSeconds] = useState(5);
    const [ratio, setRatio] = useState('16:9');
    const [resolution, setResolution] = useState('1080p');
    const [scale, setScale] = useState(1.0);
    const [videoFormat, setVideoFormat] = useState<'mp4' | 'mov'>('mp4');
    const [bitrateOption, setBitrateOption] = useState<number>(25_000_000);
    const [minSizePadMb, setMinSizePadMb] = useState<number>(0);

    const durationInFrames = durationSeconds * fps;

    // Canvas dimensions based on ratio & resolution
    const { width, height } = useMemo(() => {
        let longEdge = 1920;
        let shortEdge = 1080;

        switch (resolution) {
            case '720p': longEdge = 1280; shortEdge = 720; break;
            case '1080p': longEdge = 1920; shortEdge = 1080; break;
            case '2K': longEdge = 2560; shortEdge = 1440; break;
            case '4K': longEdge = 3840; shortEdge = 2160; break;
        }

        if (ratio === '16:9') return { width: longEdge, height: shortEdge };
        if (ratio === '9:16') return { width: shortEdge, height: longEdge };
        return { width: shortEdge, height: shortEdge }; // 1:1
    }, [ratio, resolution]);

    const isAtLimit = !isLicensed && dailyGenCount >= FREE_DAILY_LIMIT;

    const handleLiveRunnerError = (errorMsg: string | null) => {
        setGenError(errorMsg);
    };

    const handleGenerate = async (customPromptText?: string) => {
        const targetPrompt = (customPromptText || prompt).trim();
        if (!targetPrompt || isGenerating) return;

        if (isAtLimit) {
            if (setShowLimitModal) setShowLimitModal(true);
            return;
        }

        const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: targetPrompt };
        setChatHistory(prev => [...prev, userMsg]);
        setPrompt('');
        setIsGenerating(true);
        setGenError(null);
        setActiveTab('prompt'); // Switch to prompt view

        try {
            const historyForApi: MotionGenHistoryItem[] = [...chatHistory, userMsg]
                .slice(-8)
                .map(m => ({ role: m.role, content: m.content }));

            const result = await generateMotionCode(
                targetPrompt,
                {
                    currentCode: chatHistory.length > 0 ? code : undefined,
                    fps,
                    durationSeconds,
                    width,
                    height,
                    history: historyForApi
                },
                aiOptions
            );

            setCode(result.code);
            setChatHistory(prev => [...prev, {
                id: `a_${Date.now()}`,
                role: 'assistant',
                content: result.summary || `Animasi "${result.title}" berhasil dibuat dengan komposisi ${width}x${height}.`,
                codeSnapshot: result.code
            }]);

            if (incrementDailyCount) incrementDailyCount(1);
        } catch (err: any) {
            const errorMessage = err?.message || 'Gagal generate animasi. Coba lagi.';
            setGenError(errorMessage);
            setChatHistory(prev => [...prev, {
                id: `e_${Date.now()}`,
                role: 'assistant',
                content: errorMessage,
                isError: true
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoFix = async (errText: string) => {
        if (isGenerating || isAtLimit) return;
        setIsGenerating(true);
        setGenError(null);

        const fixPrompt = `Perbaiki error sintaks/runtime berikut pada kode animasi Remotion ini:\n"${errText}"\n\nKode saat ini:\n\`\`\`jsx\n${code}\n\`\`\`\n\nPastikan export bernama MotionComposition, gunakan hanya hook dari 'remotion' (interpolate, useCurrentFrame, useVideoConfig, spring, AbsoluteFill) dan styling inline CSS murni.`;

        try {
            const historyForApi: MotionGenHistoryItem[] = [...chatHistory, { role: 'user', content: fixPrompt }]
                .slice(-8)
                .map(m => ({ role: m.role, content: m.content }));

            const result = await generateMotionCode(
                fixPrompt,
                {
                    currentCode: code,
                    fps,
                    durationSeconds,
                    width,
                    height,
                    history: historyForApi
                },
                aiOptions
            );

            setCode(result.code);
            setChatHistory(prev => [...prev, {
                id: `a_${Date.now()}`,
                role: 'assistant',
                content: `Error berhasil diperbaiki otomatis! ${result.summary || ''}`,
                codeSnapshot: result.code
            }]);

            if (incrementDailyCount) incrementDailyCount(1);
        } catch (err: any) {
            const errorMessage = err?.message || 'Gagal memperbaiki animasi secara otomatis.';
            setGenError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    const handleReset = () => {
        setCode(DEFAULT_CODE);
        setChatHistory([]);
        setGenError(null);
    };

    const revertToSnapshot = (snapshot?: string) => {
        if (snapshot) setCode(snapshot);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRender = async () => {
        setIsRendering(true);
        const resultUrl = await startMotionRender(
            'motion-gen-player',
            renderMode,
            fps,
            durationInFrames,
            width,
            height,
            (progress) => {
                setRenderProgress(progress);
            },
            {
                scale,
                format: videoFormat,
                bitrate: bitrateOption,
                minSizePadMb
            }
        );

        if (resultUrl && renderProgress?.status !== 'error') {
            const cleanRatio = ratio.replace(':', 'x');
            const renderWidth = Math.round(width * scale);
            const renderHeight = Math.round(height * scale);
            const bitrateMb = Math.round(bitrateOption / 1_000_000);
            const a = document.createElement('a');
            a.href = resultUrl;
            a.download = `MotionGen_${resolution}_${cleanRatio}_${renderWidth}x${renderHeight}_${fps}fps_${bitrateMb}M_${durationSeconds}s_${Date.now()}.${videoFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                setIsRendering(false);
                setRenderProgress(null);
            }, 1000);
        } else {
            setIsRendering(false);
            setRenderProgress(null);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full w-full bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden pt-16 lg:pt-4 font-sans">
            
            {/* Left Control Studio Panel */}
            <div className="w-full lg:w-[500px] xl:w-[560px] flex flex-col h-full border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shrink-0">
                
                {/* Studio Header */}
                <div className="p-5 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
                            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                                <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">MotionGen Studio</h1>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50">PRO</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Next-gen AI React Motion Graphics</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {chatHistory.length > 0 && (
                            <button
                                onClick={handleReset}
                                title="Reset project"
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all text-xs font-semibold flex items-center gap-1"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Free Trial / Plan Status Bar */}
                {!isLicensed && (
                    <div className="px-5 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-b border-purple-200/40 dark:border-purple-900/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                            <span className={`w-2 h-2 rounded-full ${isAtLimit ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                            <span className="text-[11px] font-mono tracking-tight">{dailyGenCount} / {FREE_DAILY_LIMIT} GENERATE HARI INI</span>
                        </div>
                        {isAtLimit && (
                            <button 
                                onClick={() => setShowActivationModal && setShowActivationModal(true)} 
                                className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
                            >
                                <Lock className="w-3 h-3" /> Buka Akses PRO
                            </button>
                        )}
                    </div>
                )}

                {/* Studio Tab Navigation */}
                <div className="px-5 pt-3 pb-2 flex gap-1.5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
                    <button
                        onClick={() => setActiveTab('prompt')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'prompt' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'}`}
                    >
                        <Sparkles className="w-3.5 h-3.5" /> AI Prompter
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'templates' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'}`}
                    >
                        <Layers className="w-3.5 h-3.5" /> Template ({PRESETS.reduce((acc, c) => acc + c.items.length, 0)})
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'}`}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Konfigurasi
                    </button>
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'code' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'}`}
                    >
                        <Code className="w-3.5 h-3.5" /> Schema / JSON
                    </button>
                </div>

                {/* Tab Content Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-5 gap-5">
                    
                    {/* TAB 1: AI VIBE CODING PROMPTER */}
                    {activeTab === 'prompt' && (
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Chat Conversation Stream */}
                            <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto custom-scrollbar bg-slate-100/60 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 flex flex-col gap-3">
                                {chatHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                                            <Wand2 className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Mulai Vibe Coding Animasi</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                                            Ketik deskripsi animasi yang kamu inginkan, atau pilih salah satu template di tab Template.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {chatHistory.map((msg) => (
                                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {msg.role === 'assistant' && (
                                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.isError ? 'bg-rose-100 dark:bg-rose-950 text-rose-600' : 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'}`}>
                                                        {msg.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                                    </div>
                                                )}
                                                <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                                                    msg.role === 'user' 
                                                        ? 'bg-purple-600 text-white font-medium rounded-tr-sm shadow-md shadow-purple-600/10' 
                                                        : msg.isError 
                                                            ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 rounded-tl-sm' 
                                                            : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm'
                                                }`}>
                                                    <p>{msg.content}</p>
                                                    {msg.codeSnapshot && msg.codeSnapshot !== code && (
                                                        <button
                                                            onClick={() => revertToSnapshot(msg.codeSnapshot)}
                                                            className="mt-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded-lg"
                                                        >
                                                            <RotateCcw className="w-3 h-3" /> Kembalikan ke versi ini
                                                        </button>
                                                    )}
                                                </div>
                                                {msg.role === 'user' && (
                                                    <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {isGenerating && (
                                            <div className="flex gap-3">
                                                <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/50 rounded-2xl rounded-tl-sm p-3.5 text-xs text-purple-700 dark:text-purple-300 font-medium flex items-center gap-2 shadow-sm">
                                                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Sedang merancang & mengompilasi kode animasi Remotion...
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Quick Inspiration Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-purple-500" /> Coba:
                                </span>
                                {["Logo Glow Stinger", "Lower Third 4K", "Subscribe Button", "Cyberpunk Counter"].map((chip, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPrompt(`Buatkan animasi ${chip.toLowerCase()} modern dan elegan dengan efek partikel dan spring physics.`)}
                                        disabled={isGenerating || isAtLimit}
                                        className="text-[11px] font-semibold bg-slate-100 hover:bg-purple-50 hover:text-purple-600 dark:bg-slate-800/60 dark:hover:bg-purple-950/40 dark:hover:text-purple-300 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg transition-all shrink-0 border border-slate-200/60 dark:border-slate-800/60"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            {/* Prompt Input Box */}
                            <div className="relative bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900/50 focus-within:border-purple-600 dark:focus-within:border-purple-500 rounded-2xl p-3 shadow-lg shadow-purple-500/5 transition-all">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={handlePromptKeyDown}
                                    placeholder={chatHistory.length > 0 ? "Ketik permintaan revisi (misal: 'buat lebih cepat', 'ganti warna jadi neon cyan')..." : "Deskripsikan video motion graphics yang kamu inginkan secara bebas..."}
                                    disabled={isGenerating || isAtLimit}
                                    rows={3}
                                    className="w-full bg-transparent text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
                                />
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        Shift + Enter untuk baris baru
                                    </span>
                                    <button
                                        onClick={() => handleGenerate()}
                                        disabled={isGenerating || !prompt.trim() || isAtLimit}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                                    >
                                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        <span>{chatHistory.length > 0 ? 'Kirim Revisi' : 'Generate Animasi'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PRESET TEMPLATE GALLERY */}
                    {activeTab === 'templates' && (
                        <div className="flex flex-col gap-5">
                            {PRESETS.map((cat, cIdx) => (
                                <div key={cIdx} className="flex flex-col gap-2.5">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5 text-purple-500" /> {cat.category}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {cat.items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl p-4 transition-all shadow-sm group cursor-pointer flex items-start justify-between gap-3"
                                                onClick={() => handleGenerate(item.prompt)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        {item.icon}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                            {item.title}
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    disabled={isGenerating || isAtLimit}
                                                    className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 rounded-xl text-[11px] font-bold shrink-0 border border-purple-200/60 dark:border-purple-800/50 group-hover:bg-purple-600 group-hover:text-white transition-all flex items-center gap-1"
                                                >
                                                    <Play className="w-3 h-3" /> Pakai
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 3: VIDEO CONFIGURATION CONTROLS */}
                    {activeTab === 'settings' && (
                        <div className="flex flex-col gap-5">
                            {/* Aspect Ratio Cards */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Monitor className="w-3.5 h-3.5 text-purple-500" /> Rasio Aspek Layar
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { val: '16:9', label: '16:9 Landscape', desc: 'YouTube / TV', icon: Monitor },
                                        { val: '9:16', label: '9:16 Portrait', desc: 'Reels / TikTok', icon: Smartphone },
                                        { val: '1:1', label: '1:1 Square', desc: 'Feed / Post', icon: Square }
                                    ].map((opt) => {
                                        const Icon = opt.icon;
                                        const isSelected = ratio === opt.val;
                                        return (
                                            <button
                                                key={opt.val}
                                                onClick={() => setRatio(opt.val)}
                                                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${isSelected ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-600" />}
                                                </div>
                                                <div className="text-xs font-bold">{opt.label}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">{opt.desc}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Resolution Selector */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-purple-500" /> Kualitas Resolusi</span>
                                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-extrabold">{width} × {height} px</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['720p', '1080p', '2K', '4K'].map((res) => (
                                        <button
                                            key={res}
                                            onClick={() => setResolution(res)}
                                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${resolution === res ? 'border-purple-600 bg-purple-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-purple-400'}`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* FPS Framerate Selector */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Film className="w-3.5 h-3.5 text-purple-500" /> Frame Rate (FPS)
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { fpsVal: 24, label: '24 FPS', sub: 'Cinematic' },
                                        { fpsVal: 30, label: '30 FPS', sub: 'Standard' },
                                        { fpsVal: 60, label: '60 FPS', sub: 'Ultra Smooth' }
                                    ].map((item) => (
                                        <button
                                            key={item.fpsVal}
                                            onClick={() => setFps(item.fpsVal)}
                                            className={`p-2.5 rounded-xl border text-center transition-all ${fps === item.fpsVal ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'}`}
                                        >
                                            <div className="text-xs font-bold">{item.label}</div>
                                            <div className="text-[10px] text-slate-400">{item.sub}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration Selector */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>Durasi Video</span>
                                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-extrabold">{durationSeconds} Detik ({durationInFrames} frames)</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[3, 5, 8, 10, 15, 20, 30].map((sec) => (
                                        <button
                                            key={sec}
                                            onClick={() => setDurationSeconds(sec)}
                                            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all border ${durationSeconds === sec ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-purple-400'}`}
                                        >
                                            {sec}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Skala Canvas Dropdown & Format Video */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Maximize2 className="w-3.5 h-3.5 text-purple-500" /> Skala Canvas
                                    </label>
                                    <select
                                        value={scale}
                                        onChange={(e) => setScale(Number(e.target.value))}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm"
                                    >
                                        <option value={1.0}>1.0x (100% Native Asli)</option>
                                        <option value={1.25}>1.25x (125% Crisp HD+)</option>
                                        <option value={1.5}>1.5x (150% Super Sample)</option>
                                        <option value={2.0}>2.0x (200% Ultra High-DPI 2X)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Film className="w-3.5 h-3.5 text-purple-500" /> Format Video
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setVideoFormat('mp4')}
                                            className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${videoFormat === 'mp4' ? 'border-purple-600 bg-purple-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                                        >
                                            MP4
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVideoFormat('mov')}
                                            className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${videoFormat === 'mov' ? 'border-purple-600 bg-purple-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                                        >
                                            MOV
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Bitrate Selector (8M, 25M, 45M, 80M) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5 text-purple-500" /> Pengaturan Bitrate</span>
                                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-extrabold">{Math.round(bitrateOption / 1_000_000)} Mbps</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { val: 8_000_000, label: '8M', sub: 'HD 720p' },
                                        { val: 25_000_000, label: '25M', sub: 'FHD 1080p' },
                                        { val: 45_000_000, label: '45M', sub: '2K QHD' },
                                        { val: 80_000_000, label: '80M', sub: '4K Cinema' }
                                    ].map((bItem) => (
                                        <button
                                            key={bItem.val}
                                            onClick={() => setBitrateOption(bItem.val)}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center ${bitrateOption === bItem.val ? 'border-purple-600 bg-purple-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-purple-400'}`}
                                        >
                                            <div className="text-xs font-bold">{bItem.label}</div>
                                            <div className={`text-[9px] ${bitrateOption === bItem.val ? 'text-purple-100' : 'text-slate-400'}`}>{bItem.sub}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target Minimal Size (PRE-PAD) for Microstock Upload */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-purple-500" /> Target Minimal Size (PRE-PAD)</span>
                                    <span className="text-[10px] text-slate-400">Microstock / Stock Contributor</span>
                                </label>
                                <select
                                    value={minSizePadMb}
                                    onChange={(e) => setMinSizePadMb(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm"
                                >
                                    <option value={0}>Nonaktif (Ukuran Alami File)</option>
                                    <option value={25}>Target Min: 25 MB (Standard Stock Minimum)</option>
                                    <option value={50}>Target Min: 50 MB (Adobe Stock / Shutterstock 1080p)</option>
                                    <option value={100}>Target Min: 100 MB (Adobe Stock 4K UHD Requirement)</option>
                                    <option value={200}>Target Min: 200 MB (Pro Cinema Upload)</option>
                                    <option value={500}>Target Min: 500 MB (ProRes Studio Master Archive)</option>
                                </select>
                            </div>

                            {/* 3 Selectable Render Engine Methods */}
                            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Cpu className="w-3.5 h-3.5 text-purple-500" /> Metode Render Engine
                                </label>
                                <div className="flex flex-col gap-2">
                                    {[
                                        {
                                            id: 'deterministic-worker' as RenderMode,
                                            title: 'Deterministik WebCodecs GPU Web Worker',
                                            badge: 'Kualitas Master (Terbaik)',
                                            desc: 'Kualitas jernih, tajam & frame-perfect. Render frame-by-frame murni tanpa stutter.',
                                            icon: Zap
                                        },
                                        {
                                            id: 'realtime-stream' as RenderMode,
                                            title: 'Canvas captureStream Langsung',
                                            badge: 'Real-Time Sync',
                                            desc: 'Render real-time sinkron waktu playback. Sangat cepat, efisien & otomatis mengikuti kecepatan asli.',
                                            icon: Play
                                        },
                                        {
                                            id: 'universal-mp4' as RenderMode,
                                            title: 'Universal MediaRecorder MP4/WebM',
                                            badge: 'Kompatibel Universal',
                                            desc: 'Ringan, stabil, dan kompatibel dengan semua jenis browser dan kartu grafis hemat daya.',
                                            icon: Video
                                        }
                                    ].map((modeItem) => {
                                        const Icon = modeItem.icon;
                                        const isSelected = renderMode === modeItem.id;
                                        return (
                                            <div
                                                key={modeItem.id}
                                                onClick={() => setRenderMode(modeItem.id)}
                                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${isSelected ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className={`text-xs font-bold ${isSelected ? 'text-purple-900 dark:text-purple-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {modeItem.title}
                                                        </h4>
                                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isSelected ? 'bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                            {modeItem.badge}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                        {modeItem.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: LIVE CODE STUDIO */}
                    {activeTab === 'code' && (
                        <div className="flex-1 flex flex-col gap-3 min-h-[380px]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Structured Motion JSON Schema</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            try {
                                                const parsed = JSON.parse(code);
                                                setCode(JSON.stringify(parsed, null, 2));
                                            } catch (_) {}
                                        }}
                                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5"
                                        title="Rapikan format JSON"
                                    >
                                        <Code className="w-3.5 h-3.5" />
                                        <span>Format JSON</span>
                                    </button>
                                    <button
                                        onClick={handleCopyCode}
                                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                                <textarea
                                    className="w-full h-full min-h-[350px] bg-transparent p-4 text-xs font-mono text-emerald-400 focus:outline-none resize-none leading-relaxed custom-scrollbar selection:bg-purple-900 selection:text-white"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    spellCheck={false}
                                    placeholder="Tempel atau edit Motion JSON schema di sini..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Quick Render Bar */}
                <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
                    <button
                        onClick={handleRender}
                        disabled={isRendering}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-purple-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
                    >
                        {isRendering ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sedang Merender ({renderProgress?.progressPercentage || 0}%)...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Export Video {videoFormat.toUpperCase()} ({resolution} • {Math.round(bitrateOption / 1_000_000)}M • {scale}x • {fps} FPS)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Right Cinema Preview Deck - Theme Matched with App (Fixed Stable Top Alignment) */}
            <div className="flex-1 flex flex-col h-full bg-slate-100/60 dark:bg-[#070b14] p-4 sm:p-6 lg:p-8 relative overflow-hidden items-center justify-start transition-colors duration-300">
                
                {/* Subtle Ambient Studio Background Glow */}
                <div className="absolute w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none -top-24 -right-24" />
                <div className="absolute w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -bottom-24 -left-24" />

                {/* Cinema Viewport Header Badge - Fixed Static Top Position */}
                <div className="w-full max-w-4xl flex items-center justify-between mb-4 text-xs z-10 px-1 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="font-extrabold tracking-wider text-slate-700 dark:text-slate-200 text-[11px] uppercase">Live Cinema Viewport</span>
                    </div>
                </div>

                {/* Main Player Screen Canvas Frame */}
                <div className="w-full flex-1 flex items-center justify-center relative min-h-[380px] max-h-[75vh] z-10 p-2">
                    <div 
                        id="motion-gen-player" 
                        className={`relative bg-slate-950 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-purple-500/10 dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center transition-all duration-300 ${
                            ratio === '9:16' ? 'max-w-[360px] aspect-[9/16] h-full max-h-[75vh]' : 
                            ratio === '1:1' ? 'max-w-[480px] aspect-square w-full max-h-[75vh]' : 
                            'w-full max-w-4xl aspect-[16/9] max-h-[75vh]'
                        }`}
                    >
                        <LiveRemotionRunner 
                            code={code} 
                            fps={fps} 
                            durationInFrames={durationInFrames} 
                            width={width} 
                            height={height} 
                            onError={handleLiveRunnerError} 
                            inputProps={dynamicProps} 
                        />
                        
                        {/* Live Compilation Error Diagnostic HUD */}
                        {genError && (
                            <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-500/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between z-30 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-rose-800 dark:text-rose-200">Kompilasi Remotion Gagal</p>
                                        <p className="text-[11px] text-rose-600 dark:text-rose-300 font-mono line-clamp-1 max-w-md">{genError}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAutoFix(genError)}
                                    disabled={isGenerating || isAtLimit}
                                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50 shrink-0"
                                >
                                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                    <span>AI Auto-Fix</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* High-End Glassmorphic Render Progress Overlay */}
                {isRendering && renderProgress && (
                    <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    {renderProgress.status === 'done' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        {renderProgress.status === 'done' ? 'Render Video Berhasil!' : 'Mengekspor Video MP4...'}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                        {width} × {height} px • {fps} FPS • {durationSeconds}s
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="flex flex-col gap-2">
                                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${renderProgress.progressPercentage}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs font-bold font-mono text-slate-600 dark:text-slate-400">
                                    <span className="text-purple-600 dark:text-purple-400">{renderProgress.progressPercentage}%</span>
                                    <span>Frame {renderProgress.frame} / {renderProgress.totalFrames}</span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 text-center font-medium bg-slate-50 dark:bg-slate-950/60 py-2.5 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                {renderProgress.message}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


