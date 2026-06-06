import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let currentJobId: number | null = null;
let initPromise: Promise<void> | null = null;
let cachedCoreURL = '';
let cachedWasmURL = '';

const initFFmpeg = async () => {
    // Jika sudah ada dan sudah di-load, langsung return
    if (ffmpeg && ffmpeg.loaded) return;
    // Jika sedang dalam proses loading, tunggu proses tersebut selesai
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            ffmpeg = new FFmpeg();
            
            ffmpeg.on('progress', ({ progress, time }) => {
                if (currentJobId !== null) {
                    self.postMessage({ type: 'progress', progress, time, id: currentJobId });
                }
            });
            
            if (cachedCoreURL && cachedWasmURL) {
                await ffmpeg.load({
                    coreURL: cachedCoreURL,
                    wasmURL: cachedWasmURL,
                });
            } else {
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            }
        } catch (err) {
            console.error("Failed to init FFmpeg:", err);
            ffmpeg = null;
            throw err;
        }
    })();
    
    return initPromise;
};

self.onmessage = async (e: MessageEvent) => {
    const { type, file, id, urls } = e.data;
    
    if (type === 'init') {
        if (urls) {
            cachedCoreURL = urls.coreURL;
            cachedWasmURL = urls.wasmURL;
        }
        initFFmpeg().catch(console.error);
        return;
    }
    
    currentJobId = id;
    let inputName = '';
    
    try {
        self.postMessage({ type: 'progress', message: 'Loading FFmpeg...', id });
        // Pastikan FFmpeg benar-benar selesai di-load sebelum lanjut
        await initFFmpeg();
        
        if (!ffmpeg || !ffmpeg.loaded) throw new Error("FFmpeg failed to initialize");
        
        self.postMessage({ type: 'progress', message: 'Writing file to memory...', id });
        inputName = `input_${id}_${Date.now()}.${file.name.split('.').pop()}`;
        await ffmpeg.writeFile(inputName, await fetchFile(file));
        
        self.postMessage({ type: 'progress', message: 'Extracting frames...', id });
        // Get duration
        let duration = 0;
        const logHandler = ({ message }: { message: string }) => {
            const match = message.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
            if (match) {
                duration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
            }
        };
        ffmpeg.on('log', logHandler);
        await ffmpeg.exec(['-i', inputName]);
        ffmpeg.off('log', logHandler);
        
        if (duration === 0) {
            duration = 5; // Fallback duration if parsing fails
        }
        
        const seekTimes = [
            duration * 0.1,
            duration * 0.5,
            duration * 0.9
        ];
        const frameWidth = 320;
        const framesBlobs: Blob[] = [];
        
        for (let i = 0; i < seekTimes.length; i++) {
            const time = seekTimes[i];
            const outName = `out_${id}_${i}.jpg`;
            await ffmpeg.exec([
                '-ss', time.toString(),
                '-i', inputName,
                '-vframes', '1',
                '-q:v', '2',
                '-vf', `scale=${frameWidth}:-1`,
                outName
            ]);
            
            try {
                const data = await ffmpeg.readFile(outName);
                const blob = new Blob([(data as Uint8Array).buffer], { type: 'image/jpeg' });
                framesBlobs.push(blob);
                await ffmpeg.deleteFile(outName); // Cleanup frame file
            } catch (err) {
                console.warn(`Failed to read frame ${i}`, err);
            }
        }
        
        if (framesBlobs.length === 0) {
            throw new Error("Failed to extract video frames with FFmpeg");
        }
        
        self.postMessage({ 
            success: true, 
            framesBlobs,
            id
        });
        
    } catch (err: any) {
        self.postMessage({ success: false, error: err?.message || String(err), id });
    } finally {
        if (inputName && ffmpeg) {
            try { await ffmpeg.deleteFile(inputName); } catch(e) {}
        }
        currentJobId = null;
    }
};
