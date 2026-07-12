import React, { useState, useMemo } from 'react';
import { Player } from '@remotion/player';
import { Code, Settings, Download, Copy, Type, Monitor, Cpu, Server, Video, Loader2, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { LiveRemotionRunner } from './remotion/LiveRemotionRunner';
import { RenderMode, RenderProgress, startMotionRender } from '../utils/motionRenderHelper';

export function MotionGenView() {
    const [renderMode, setRenderMode] = useState<RenderMode>('media-recorder');
    const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    
    const [code, setCode] = useState(`
// ChatGPT Prompt: "Buatkan animasi 2D untuk tombol subscribe"
// Paste the JSX code here. Example:

import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const MotionComposition = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
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
`);
    
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

    const copyPrompt = () => {
        const prompt = "Buatkan saya kode React (JSX) untuk komponen Remotion bernama 'MotionComposition'. Saya butuh animasi 2D yang keren. Gunakan hook 'useCurrentFrame', 'interpolate' dari 'remotion' untuk membuat elemen bergerak. Output HANYA KODE React tanpa penjelasan tambahan. Jangan gunakan library eksternal selain remotion dan react.";
        navigator.clipboard.writeText(prompt);
        alert("Prompt berhasil disalin! Silakan paste ke ChatGPT/Claude.");
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
            {/* Left Panel: Code & Config */}
            <div className="w-full lg:w-1/2 flex flex-col p-4 sm:p-6 lg:p-8 gap-6 overflow-y-auto custom-scrollbar border-r border-slate-200/50 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-purple-500" />
                            Motion Gen
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">AI-powered 2D Animation & Coding Vibe Renderer</p>
                    </div>
                </div>

                {/* AI Prompt Help */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-500/30 p-5 rounded-[1.5rem]">
                    <h3 className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2 mb-2">
                        <Type className="w-4 h-4" /> Generate from AI
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-gray-400 mb-4">Gunakan ChatGPT atau Claude untuk membuat kode animasi. Cukup salin prompt ini lalu paste hasilnya di bawah.</p>
                    <button 
                        onClick={copyPrompt}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-colors w-full justify-center"
                    >
                        <Copy className="w-4 h-4" /> Salin Prompt Ajaib
                    </button>
                </div>

                {/* Code Editor */}
                <div className="flex-1 flex flex-col min-h-[250px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-xl shadow-black/5">
                    <div className="flex items-center justify-between bg-slate-50/80 dark:bg-black/20 px-5 py-3 border-b border-slate-200/80 dark:border-white/5">
                        <span className="text-xs font-bold text-slate-600 dark:text-gray-400 flex items-center gap-2"><Code className="w-4 h-4" /> JSX Code Editor</span>
                    </div>
                    <textarea 
                        className="flex-1 bg-transparent p-5 text-sm font-mono text-slate-800 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        spellCheck={false}
                    />
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
                    <div style={{ aspectRatio: `${width}/${height}`, maxHeight: '100%', maxWidth: '100%' }} className="remotion-capture-target bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-[#333] shadow-2xl shadow-black/10 overflow-hidden relative">
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
