import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '@remotion/player';
import * as Babel from '@babel/standalone';
import * as Remotion from 'remotion';

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
    const [Component, setComponent] = useState<React.FC | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [renderKey, setRenderKey] = useState(0);

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
            if (moduleName === '@remotion/player') return { Player };
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

        try {
            const finalExports = compileAndEval(code);

            if (finalExports.MotionComposition) {
                const NewComponent = finalExports.MotionComposition;
                setComponent(() => NewComponent);
                setError(null);
                if (onError) onError(null);
                setRenderKey(prev => prev + 1);
            } else if (finalExports.default) {
                const NewComponent = finalExports.default;
                setComponent(() => NewComponent);
                setError(null);
                if (onError) onError(null);
                setRenderKey(prev => prev + 1);
            } else {
                const availableExports = Object.keys(finalExports).filter(k => k !== '__esModule');
                console.warn('[LiveRemotionRunner] No MotionComposition found. Available:', availableExports);
                const errMsg = availableExports.length > 0
                        ? `Export ditemukan: "${availableExports.join('", "')}". Harus pakai nama "MotionComposition".`
                        : "Kode harus mengekspor komponen bernama 'MotionComposition' atau default export";
                setError(errMsg);
                if (onError) onError(errMsg);
                setComponent(null);
            }
        } catch (err: any) {
            console.error('[LiveRemotionRunner] Compilation Error:', err);
            const errMsg = err.message || 'Terjadi kesalahan saat kompilasi JSX';
            setError(errMsg);
            if (onError) onError(errMsg);
            setComponent(null);
        }
    }, [code, compileAndEval]);

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

    return (
        <Player
            key={renderKey}
            component={Component}
            inputProps={inputProps || {}}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionWidth={width}
            compositionHeight={height}
            style={{ width: '100%', height: '100%' }}
            controls
            autoPlay
            loop
        />
    );
}
