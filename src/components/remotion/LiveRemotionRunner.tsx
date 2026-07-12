import React, { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import * as Babel from '@babel/standalone';
import * as Remotion from 'remotion';
import * as ReactJsxRuntime from 'react/jsx-runtime';

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

    useEffect(() => {
        try {
            // Compile the JSX code using Babel, ensuring modules are transformed to CommonJS
            const compiledCode = Babel.transform(code, {
                presets: [
                    ['react', { runtime: 'classic' }], 
                    ['env', { modules: 'commonjs' }]
                ]
            }).code;
            
            const requireMock = (moduleName: string) => {
                if (moduleName === 'react') return { ...React, default: React };
                if (moduleName === 'remotion') return { ...Remotion, default: Remotion };
                if (moduleName === 'react/jsx-runtime') {
                    console.log('ReactJsxRuntime requested:', ReactJsxRuntime);
                    return { ...ReactJsxRuntime, default: ReactJsxRuntime };
                }
                throw new Error(`Module ${moduleName} is not supported in Live Editor`);
            };

            let safeCode = compiledCode || '';
            safeCode = safeCode.replace(/"use strict";/g, '');
            
            const exportsObj: any = {};
            const evaluator = new Function('React', 'require', 'exports', safeCode);
            
            evaluator(React, requireMock, exportsObj);

            console.log('Evaluated exports:', exportsObj);

            if (exportsObj.MotionComposition) {
                setComponent(() => exportsObj.MotionComposition);
                setError(null);
            } else if (exportsObj.default) {
                setComponent(() => exportsObj.default);
                setError(null);
            } else {
                setError("Kode harus mengekspor komponen bernama 'MotionComposition' atau default export");
            }
        } catch (err: any) {
            console.error('Compilation Error:', err);
            setError(err.message || 'Terjadi kesalahan saat kompilasi JSX');
            setComponent(null);
        }
    }, [code]);

    if (error) {
        return (
            <div className="p-6 bg-red-900/50 border border-red-500 rounded-lg max-w-lg w-full text-white font-mono text-sm">
                <h3 className="font-bold text-red-400 mb-2">Compilation Error</h3>
                <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
        );
    }

    if (!Component) {
        return <div className="text-gray-500 animate-pulse font-bold">Mempersiapkan Player...</div>;
    }

    return (
        <Player
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
