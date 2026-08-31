import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, PlayerRef, Thumbnail } from '@remotion/player';
import * as Babel from '@babel/standalone';
import * as Remotion from 'remotion';
import { DynamicMotionRenderer } from './DynamicMotionRenderer';
import { MotionProject } from '../../types/motionSchema';

interface LiveRemotionRunnerProps {
    code: string;
    fps: number;
    durationInFrames: number;
    width: number;
    height: number;
    onError?: (error: string | null) => void;
    inputProps?: any;
}

// Register custom presets once at module level (Babel 8 compatible)
let presetsRegistered = false;
function ensurePresetsRegistered() {
    if (presetsRegistered) return;
    try {
        // In Babel 8 standalone, options must be passed via registered custom presets
        const reactPreset = (Babel as any).availablePresets?.['react'] || 'react';
        const envPreset = (Babel as any).availablePresets?.['env'] || 'env';
        
        if (typeof (Babel as any).registerPreset === 'function') {
            (Babel as any).registerPreset('motion-react', {
                presets: [[reactPreset, { runtime: 'classic' }]],
            });
            (Babel as any).registerPreset('motion-env', {
                presets: [[envPreset, { modules: 'commonjs' }]],
            });
        }
        presetsRegistered = true;
    } catch (e) {
        console.warn('[LiveRemotionRunner] Failed to register presets, will use fallback:', e);
    }
}

export function LiveRemotionRunner({ code, fps, durationInFrames, width, height, onError, inputProps }: LiveRemotionRunnerProps) {
    const [Component, setComponent] = useState<React.FC<any> | null>(null);
    const [activeProps, setActiveProps] = useState<any>({});
    const [error, setError] = useState<string | null>(null);
    const [renderKey, setRenderKey] = useState(0);
    const [renderFrame, setRenderFrame] = useState<number | null>(null);
    const playerRef = useRef<PlayerRef>(null);

    useEffect(() => {
        if (playerRef.current) {
            (window as any).__remotionPlayerRef = playerRef.current;
        }
        (window as any).__setRemotionRenderFrame = (frame: number | null) => {
            setRenderFrame(frame);
        };
        return () => {
            delete (window as any).__setRemotionRenderFrame;
        };
    }, [Component, renderKey]);

    const compileAndEval = useCallback((sourceCode: string) => {
        ensurePresetsRegistered();
        
        // Try Babel 8 API first (registered presets), fall back to Babel 7 style
        let compiledCode: string;
        try {
            // Babel 8: use registered preset names
            compiledCode = Babel.transform(sourceCode, {
                presets: ['motion-react', 'motion-env'],
            }).code;
        } catch (e1) {
            console.warn('[LiveRemotionRunner] Registered presets failed, trying inline options:', e1);
            try {
                // Fallback: Babel 7 style inline options
                compiledCode = Babel.transform(sourceCode, {
                    presets: [
                        ['react', { runtime: 'classic' }],
                        ['env', { modules: 'commonjs' }]
                    ]
                }).code;
            } catch (e2: any) {
                throw new Error(`Babel compilation failed: ${e2.message || e2}`);
            }
        }

        if (!compiledCode || compiledCode.trim().length === 0) {
            throw new Error('Babel menghasilkan kode kosong.');
        }
        
        const requireMock = (moduleName: string) => {
            if (moduleName === 'react') return React;
            if (moduleName === 'remotion') return { ...Remotion };
            if (moduleName === 'react/jsx-runtime') return React;
            // Handle common interop modules
            if (moduleName === 'react-dom') return {};
            if (moduleName === '@remotion/player') return { Player, Thumbnail };
            console.warn(`[LiveRemotionRunner] Unsupported module requested: ${moduleName}`);
            return {};
        };

        // Remove 'use strict' directives
        let safeCode = compiledCode.replace(/"use strict";?/g, '').replace(/'use strict';?/g, '');
        
        // Handle _interopRequireDefault and _interopRequireWildcard helpers
        const helpersCode = `
            function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
            function _interopRequireWildcard(obj) { if (obj && obj.__esModule) return obj; var r = {}; if (obj != null) for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) r[k] = obj[k]; r.default = obj; return r; }
            function _typeof(o) { return typeof o; }
        `;
        
        const exportsObj: any = {};
        const moduleObj = { exports: exportsObj };
        
        const evaluator = new Function('React', 'require', 'exports', 'module', helpersCode + '\n' + safeCode);
        evaluator(React, requireMock, exportsObj, moduleObj);

        console.log('[LiveRemotionRunner] Evaluated exports:', Object.keys(exportsObj));
        
        // Check both exports and module.exports
        const finalExports = moduleObj.exports || exportsObj;
        return finalExports;
    }, []);

    useEffect(() => {
        setError(null);

        if (!code || code.trim().length === 0) {
            setComponent(null);
            setError("Kode kosong. Silakan generate animasi terlebih dahulu.");
            return;
        }

        const trimmed = code.trim();

        // 1. Check if input is a Structured Motion JSON Schema
        if (trimmed.startsWith('{') && (trimmed.includes('"scenes"') || trimmed.includes('"title"') || trimmed.includes('"background"'))) {
            try {
                const parsedProject = JSON.parse(trimmed) as MotionProject;
                if (parsedProject && Array.isArray(parsedProject.scenes)) {
                    // Dynamically sync project duration and fps with user configured parameters
                    const syncedProject: MotionProject = {
                        ...parsedProject,
                        fps: fps || parsedProject.fps || 30,
                        durationInFrames: durationInFrames || parsedProject.durationInFrames || 150,
                        scenes: parsedProject.scenes.map(sc => ({
                            ...sc,
                            durationInFrames: (parsedProject.scenes.length === 1) 
                                ? (durationInFrames || sc.durationInFrames || 150) 
                                : sc.durationInFrames
                        }))
                    };

                    // Directly mount native Remotion Dynamic Renderer (zero Babel evaluation!)
                    setComponent(() => DynamicMotionRenderer);
                    setActiveProps({ project: syncedProject });
                    setError(null);
                    if (onError) onError(null);
                    setRenderKey(prev => prev + 1);
                    return;
                }
            } catch (jsonErr: any) {
                console.warn('[LiveRemotionRunner] JSON parse attempt failed, falling back to JSX:', jsonErr.message);
            }
        }

        // 2. Fallback: Parse and evaluate raw JSX via Babel
        try {
            let processedCode = code;
            // Auto-append export if MotionComposition is defined but not exported
            if (!/export\s+(default|const|let|var|function)/.test(processedCode)) {
                if (processedCode.includes('MotionComposition')) {
                    processedCode += '\nexport default MotionComposition;';
                }
            }

            const finalExports = compileAndEval(processedCode);

            let FoundComponent: any = null;
            if (finalExports.MotionComposition && typeof finalExports.MotionComposition === 'function') {
                FoundComponent = finalExports.MotionComposition;
            } else if (finalExports.default && typeof finalExports.default === 'function') {
                FoundComponent = finalExports.default;
            } else {
                // Fallback: search for first function component export
                for (const key of Object.keys(finalExports)) {
                    if (key !== '__esModule' && typeof finalExports[key] === 'function') {
                        FoundComponent = finalExports[key];
                        break;
                    }
                }
            }

            if (FoundComponent) {
                setComponent(() => FoundComponent);
                setActiveProps(inputProps || {});
                setError(null);
                if (onError) onError(null);
                setRenderKey(prev => prev + 1);
            } else {
                const availableExports = Object.keys(finalExports).filter(k => k !== '__esModule').join(', ') || 'none';
                console.warn('[LiveRemotionRunner] No valid component found in exports. Available:', availableExports);
                const errMsg = `Komponen React tidak ditemukan dalam kode. Pastikan mengekspor komponen utama. (Export yang tersedia: ${availableExports})`;
                setError(errMsg);
                if (onError) onError(errMsg);
                setComponent(null);
            }
        } catch (err: any) {
            console.error('[LiveRemotionRunner] Compilation Error:', err);
            const errMsg = err.message || 'Gagal mengompilasi kode Remotion.';
            setError(errMsg);
            if (onError) onError(errMsg);
            setComponent(null);
        }
    }, [code, fps, durationInFrames, compileAndEval, inputProps, onError]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl">
                <h3 className="font-bold text-red-600 dark:text-red-400 mb-2 text-sm">Compilation Error</h3>
                <pre className="whitespace-pre-wrap text-xs text-red-700 dark:text-red-300 max-w-full overflow-auto">{error}</pre>
            </div>
        );
    }

    if (!Component) {
        return (
            <div className="flex items-center justify-center w-full h-full min-h-[200px]">
                <div className="text-gray-400 dark:text-gray-500 font-medium text-sm animate-pulse">
                    Menyiapkan Live Preview...
                </div>
            </div>
        );
    }

    const effectiveFps = fps || activeProps?.project?.fps || 30;
    const effectiveDuration = durationInFrames || activeProps?.project?.durationInFrames || 150;

    return (
        <div className="w-full h-full relative">
            {/* Live Interactive Player (Real-time Preview) */}
            <Player
                ref={playerRef}
                key={renderKey}
                component={Component}
                inputProps={activeProps}
                durationInFrames={effectiveDuration}
                fps={effectiveFps}
                compositionWidth={width}
                compositionHeight={height}
                style={{ width: '100%', height: '100%' }}
                controls
                clickToPlay
                spaceKeyToPlayOrPause={false}
                doubleClickToFullscreen={false}
                allowFullscreen
                showVolumeControls={false}
                autoPlay
                loop
            />

            {/* Dedicated Pure Video Render Stage (Always available for zero-drift frame rendering) */}
            <div
                id="remotion-pure-render-stage"
                style={{
                    position: 'fixed',
                    left: '0px',
                    top: '0px',
                    width: `${width}px`,
                    height: `${height}px`,
                    overflow: 'hidden',
                    backgroundColor: '#000000',
                    zIndex: -9999,
                    pointerEvents: 'none',
                    visibility: 'visible',
                    opacity: 0.999
                }}
            >
                <Thumbnail
                    component={Component}
                    compositionWidth={width}
                    compositionHeight={height}
                    frame={renderFrame ?? 0}
                    fps={effectiveFps}
                    durationInFrames={effectiveDuration}
                    inputProps={activeProps}
                    style={{ width: `${width}px`, height: `${height}px` }}
                />
            </div>
        </div>
    );
}
