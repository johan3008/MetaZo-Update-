import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Player } from '@remotion/player';
import { Code, Settings, Download, Copy, Type, Monitor, Cpu, Server, Video, Loader2, CheckCircle2, SlidersHorizontal, Sparkles, Send, Wand2, RotateCcw, ChevronDown, ChevronUp, AlertCircle, MessageSquare, User, Bot, Lock } from 'lucide-react';
import { LiveRemotionRunner } from './remotion/LiveRemotionRunner';
import { RenderMode, RenderProgress, startMotionRender } from '../utils/motionRenderHelper';
import { generateMotionCode, MotionGenHistoryItem, ServiceOptions } from '../../services/geminiService';

const DEFAULT_CODE = `import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const MotionComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 20], [0.8, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <div style={{ opacity, transform: \`scale(\${scale})\`, padding: '20px 40px', backgroundColor: '#e50914', borderRadius: '10px', color: 'white', fontSize: '40px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
        SUBSCRIBE
      </div>
    </div>
  );
};
`;

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
    const [renderMode, setRenderMode] = useState<RenderMode>('media-recorder');
    const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
    const [isRendering, setIsRendering] = useState(false);

    const [code, setCode] = useState(DEFAULT_CODE);
    const [showCodeEditor, setShowCodeEditor] = useState(false);

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

    const durationInFrames = durationSeconds * fps;

    // Hitung dimensi Canvas berdasarkan rasio dan resolusi
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

    const handleGenerate = async () => {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt || isGenerating) return;

        if (isAtLimit) {
            if (setShowLimitModal) setShowLimitModal(true);
            return;
        }

        const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: trimmedPrompt };
        setChatHistory(prev => [...prev, userMsg]);
        setPrompt('');
        setIsGenerating(true);
        setGenError(null);

        try {
            const historyForApi: MotionGenHistoryItem[] = [...chatHistory, userMsg]
                .slice(-8)
                .map(m => ({ role: m.role, content: m.content }));

            const result = await generateMotionCode(
                trimmedPrompt,
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
                content: result.summary || `Selesai! "${result.title}" berhasil dibuat.`,
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

    const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    const handleRender = async () => {
        setIsRendering(true);
        const resultUrl = await startMotionRender(
            'motion-gen-player',
            renderMode,
            fps,
            durationInFrames,
            (progress) => {
                setRenderProgress(progress);
            }
        );

        if (resultUrl && renderProgress?.status !== 'error') {
            // Trigger automatic download
            const a = document.createElement('a');
            a.href = resultUrl;
            a.download = `MotionGen_${resolution}_${fps}fps_${Date.now()}.mp4`;
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
        <div className="flex flex-col lg:flex-row h-full w-full text-slate-900 dark:text-white overflow-hidden pt-20 lg:pt-8">
            {/* Left Panel: Vibe Coding Chat & Config */}
            <div className="w-full lg:w-1/2 flex flex-col p-4 sm:p-6 lg:p-8 gap-6 overflow-y-auto custom-scrollbar border-r border-slate-200/50 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-purple-500" />
                            Motion Gen
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Vibe coding: ketik idemu, AI langsung buatkan video motion graphics-nya</p>
                    </div>
                    {chatHistory.length > 0 && (
                        <button
                            onClick={handleReset}
                            title="Reset percakapan & kode"
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Trial Usage Meter */}
                {!isLicensed && (
                    <div className="bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-gray-300">
                            <span className={`w-2 h-2 rounded-full ${isAtLimit ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                            <span>{dailyGenCount} / {FREE_DAILY_LIMIT} GENERATE HARI INI</span>
                        </div>
                        {isAtLimit && (
                            <button onClick={() => setShowActivationModal && setShowActivationModal(true)} className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 hover:underline">
                                <Lock className="w-3 h-3" /> Upgrade PRO
                            </button>
                        )}
                    </div>
                )}

                {/* Vibe Coding Chat Panel */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-purple-200/60 dark:border-purple-500/20 rounded-[1.5rem] shadow-xl shadow-black/5 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-5 py-3 border-b border-purple-200/60 dark:border-purple-500/20">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                        <h3 className="font-bold text-purple-700 dark:text-purple-300 text-sm">AI Vibe Coding</h3>
                    </div>

                    {/* Chat history */}
                    {chatHistory.length > 0 && (
                        <div className="max-h-72 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-3">
                            {chatHistory.map(msg => (
                                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? '' : ''}`}>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-white/10' : msg.isError ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                                        {msg.role === 'user' ? (
                                            <User className="w-3.5 h-3.5 text-slate-600 dark:text-gray-300" />
                                        ) : msg.isError ? (
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                        ) : (
                                            <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs leading-relaxed ${msg.isError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-gray-300'}`}>
                                            {msg.content}
                                        </p>
                                        {msg.codeSnapshot && msg.codeSnapshot !== code && (
                                            <button
                                                onClick={() => revertToSnapshot(msg.codeSnapshot)}
                                                className="mt-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-2.5 h-2.5" /> Kembalikan ke versi ini
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isGenerating && (
                                <div className="flex gap-2.5">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-purple-100 dark:bg-purple-900/30">
                                        <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menulis kode animasi...
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    )}

                    {chatHistory.length === 0 && (
                        <div className="px-5 pt-4 text-xs text-slate-500 dark:text-gray-400">
                            Contoh: <span className="italic">"Buatkan animasi logo teks 'METAZO' muncul dengan efek bounce dan gradasi ungu-biru"</span> atau <span className="italic">"lower third nama channel yang slide dari kiri"</span>.
                        </div>
                    )}

                    {/* Prompt input */}
                    <div className="p-4 sm:p-5 flex items-end gap-2">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handlePromptKeyDown}
                            placeholder={chatHistory.length > 0 ? "Minta revisi... (mis: 'buat lebih cepat', 'ganti warna jadi hijau')" : "Ketik ide video motion graphics kamu di sini..."}
                            disabled={isGenerating || isAtLimit}
                            rows={2}
                            className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none disabled:opacity-60"
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim() || isAtLimit}
                            className="h-full px-4 py-3 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : chatHistory.length > 0 ? <Wand2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    {isAtLimit && (
                        <div className="px-5 pb-4 -mt-2 text-[11px] text-rose-500 font-bold flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> Limit trial harian tercapai. Upgrade ke PRO untuk generate tanpa batas.
                        </div>
                    )}
                </div>

                {/* Advanced: Code Editor (collapsible) */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-xl shadow-black/5">
                    <button
                        onClick={() => setShowCodeEditor(v => !v)}
                        className="w-full flex items-center justify-between bg-slate-50/80 dark:bg-black/20 px-5 py-3 border-b border-slate-200/80 dark:border-white/5"
                    >
                        <span className="text-xs font-bold text-slate-600 dark:text-gray-400 flex items-center gap-2"><Code className="w-4 h-4" /> Edit Kode Manual (Advanced)</span>
                        {showCodeEditor ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {showCodeEditor && (
                        <textarea
                            className="w-full min-h-[220px] bg-transparent p-5 text-sm font-mono text-slate-800 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            spellCheck={false}
                        />
                    )}
                </div>

                {/* Configurations */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 sm:p-7 rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 shadow-xl shadow-black/5">
                    <label className="text-xs font-bold text-slate-600 dark:text-gray-400 mb-4 block flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4" /> Konfigurasi Video
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Rasio Canvas</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl p-2.5 text-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                value={ratio}
                                onChange={(e) => setRatio(e.target.value)}
                            >
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Potrait)</option>
                                <option value="1:1">1:1 (Square)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Resolusi Video</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl p-2.5 text-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                            >
                                <option value="720p">720p (HD)</option>
                                <option value="1080p">1080p (FHD)</option>
                                <option value="2K">2K (QHD)</option>
                                <option value="4K">4K (UHD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Frame Rate</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl p-2.5 text-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                value={fps}
                                onChange={(e) => setFps(Number(e.target.value))}
                            >
                                <option value={24}>24 FPS (Cinematic)</option>
                                <option value={30}>30 FPS (Standard)</option>
                                <option value={60}>60 FPS (Smooth)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Durasi Video</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl p-2.5 text-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                value={durationSeconds}
                                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => (i + 1) * 5).map(sec => (
                                    <option key={sec} value={sec}>{sec} Detik</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Render Mode */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 sm:p-7 rounded-[1.5rem] border border-slate-200/80 dark:border-white/10 shadow-xl shadow-black/5">
                    <label className="text-xs font-bold text-slate-600 dark:text-gray-400 mb-4 block flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Render Mode (Client-Side)
                    </label>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setRenderMode('worker-gpu')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-[1.25rem] text-sm font-bold border transition-colors ${renderMode === 'worker-gpu' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-black/40'}`}
                        >
                            <Server className="w-4 h-4" />
                            <div className="text-left flex-1">
                                <div>Worker GPU (FFmpeg)</div>
                                <div className={`text-[10px] font-normal ${renderMode === 'worker-gpu' ? 'text-indigo-200' : 'text-slate-500'}`}>Background Render. Kualitas Tertinggi.</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setRenderMode('gpu-ui')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-[1.25rem] text-sm font-bold border transition-colors ${renderMode === 'gpu-ui' ? 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-black/40'}`}
                        >
                            <Cpu className="w-4 h-4" />
                            <div className="text-left flex-1">
                                <div>GPU UI (Main Thread)</div>
                                <div className={`text-[10px] font-normal ${renderMode === 'gpu-ui' ? 'text-fuchsia-200' : 'text-slate-500'}`}>Cepat untuk UI presisi (DOM to Image).</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setRenderMode('media-recorder')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-[1.25rem] text-sm font-bold border transition-colors ${renderMode === 'media-recorder' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-black/40'}`}
                        >
                            <Video className="w-4 h-4" />
                            <div className="text-left flex-1">
                                <div>Media Recorder</div>
                                <div className={`text-[10px] font-normal ${renderMode === 'media-recorder' ? 'text-emerald-200' : 'text-slate-500'}`}>Real-time screen capture. Paling instan.</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Render Button */}
                <button
                    onClick={handleRender}
                    disabled={isRendering}
                    className="mt-2 flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black rounded-[1.5rem] text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isRendering ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Memproses Render...</>
                    ) : (
                        <><Download className="w-5 h-5" /> Render Video</>
                    )}
                </button>
            </div>

            {/* Right Panel: Preview & Progress */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-slate-100/50 dark:bg-black/20 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-6 left-6 flex items-center gap-2 z-10 bg-white/80 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-white/10 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-gray-300 tracking-wider">LIVE PREVIEW</span>
                    <span className="text-[10px] bg-slate-200 dark:bg-[#222] text-slate-600 dark:text-gray-400 px-2 py-0.5 rounded-md ml-1">{width}x{height}</span>
                </div>

                <div id="motion-gen-player" className="w-full h-full max-h-[80vh] flex items-center justify-center relative">
                    {/* Mengatur rasio kontainer */}
                    <div style={{ aspectRatio: `${width}/${height}`, maxHeight: '100%', maxWidth: '100%' }} className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-[#333] shadow-2xl shadow-black/10 overflow-hidden relative">
                        <LiveRemotionRunner code={code} fps={fps} durationInFrames={durationInFrames} width={width} height={height} />
                    </div>
                </div>

                {/* Render Progress Overlay */}
                {isRendering && renderProgress && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center m-4 sm:m-6 lg:m-8 rounded-[2rem]">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#333] p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
                            <h3 className="text-lg font-black mb-1 flex items-center gap-2 text-slate-900 dark:text-white">
                                {renderProgress.status === 'done' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                )}
                                Proses Render ({renderMode})
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mb-6 font-mono">{renderProgress.message}</p>

                            <div className="h-3 w-full bg-slate-100 dark:bg-[#222] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                                    style={{ width: `${renderProgress.progressPercentage}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between mt-2 text-xs font-bold text-slate-500 dark:text-gray-500">
                                <span>{renderProgress.progressPercentage}%</span>
                                <span>Frame {renderProgress.frame} / {renderProgress.totalFrames}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
