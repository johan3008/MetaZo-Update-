import React, { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import * as Babel from '@babel/standalone';
import * as Remotion from 'remotion';

interface LiveRemotionRunnerProps {
    code: string;
    fps: number;
    durationInFrames: number;
    width: number;
    height: number;
}

export function LiveRemotionRunner({ code, fps, durationInFrames, width, height }: LiveRemotionRunnerProps) {
    const [Component, setComponent] = useState<React.FC | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [renderKey, setRenderKey] = useState(0);

    useEffect(() => {
        // Reset error state before trying new compilation
        setError(null);

        if (!code || code.trim().length === 0) {
            setComponent(null);
            setError("Kode kosong. Silakan generate animasi terlebih dahulu.");
            return;
        }

        try {
            // Compile the JSX code using Babel, ensuring modules are transformed to CommonJS
            const compiledCode = Babel.transform(code, {
                presets: [
                    ['react', { runtime: 'classic' }], 
                    ['env', { modules: 'commonjs' }]
                ]
            }).code;
            
            const requireMock = (moduleName: string) => {
                if (moduleName === 'react') return React;
                if (moduleName === 'remotion') return { ...Remotion, default: Remotion };
                if (moduleName === 'react/jsx-runtime') return React;
                throw new Error(`Module ${moduleName} is not supported in Live Editor`);
            };

            // Remove 'use strict' directive to avoid strict mode issues with new Function
            let safeCode = compiledCode || '';
            safeCode = safeCode.replace(/"use strict";/g, '');
            
            const exportsObj: any = {};
            const evaluator = new Function('React', 'require', 'exports', safeCode);
            
            evaluator(React, requireMock, exportsObj);

            console.log('[LiveRemotionRunner] Evaluated exports:', Object.keys(exportsObj));

            if (exportsObj.MotionComposition) {
                const NewComponent = exportsObj.MotionComposition;
                setComponent(() => NewComponent);
                setError(null);
                // Force Player remount by incrementing key
                setRenderKey(prev => prev + 1);
            } else if (exportsObj.default) {
                const NewComponent = exportsObj.default;
                setComponent(() => NewComponent);
                setError(null);
                setRenderKey(prev => prev + 1);
            } else {
                const availableExports = Object.keys(exportsObj).filter(k => k !== '__esModule');
                console.warn('[LiveRemotionRunner] No MotionComposition found. Available:', availableExports);
                setError(
                    availableExports.length > 0
                        ? `Export ditemukan: "${availableExports.join('", "')}". Harus pakai nama "MotionComposition".`
                        : "Kode harus mengekspor komponen bernama 'MotionComposition' atau default export"
                );
                setComponent(null);
            }
        } catch (err: any) {
            console.error('[LiveRemotionRunner] Compilation Error:', err);
            setError(err.message || 'Terjadi kesalahan saat kompilasi JSX');
            setComponent(null);
        }
    }, [code]);

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
            inputProps={{}}
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
