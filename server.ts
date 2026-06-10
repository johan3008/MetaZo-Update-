import express from 'express';
import multer from 'multer';
import { exec, spawn } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { generateStockMetadata, generateBatchStockMetadata, generateOptimizedPrompt, analyzeImageToPrompt, analyzeBatchImageToPrompt, analyzeVideoKeyword, generateHollywoodPrompts, checkImageQuality, apiKeyStorage, generateCalendarEvents, generateEventKeywords, suggestKeywords } from './server/gemini.ts';
import { GoogleGenAI } from '@google/genai';

// TRICK: Strict Queue to prevent Server OOM.
// Ghostscript is extremely memory hungry. If 5 requests come at once, 5 GS processes will spawn,
// instantly killing the container. This queue ensures only 1 GS process runs at a time.
class AsyncQueue {
    private queue: (() => Promise<void>)[] = [];
    private isProcessing = false;

    async enqueue<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });
            this.processNext();
        });
    }

    private async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;
        const task = this.queue.shift();
        if (task) {
            await task();
        }
        
        this.isProcessing = false;
        this.processNext();
    }
}

const gsQueue = new AsyncQueue();

// ESM to CJS compatibility for paths
const __filename_safe = typeof __filename !== 'undefined' 
    ? __filename 
    : (typeof import.meta !== 'undefined' && import.meta.url 
        ? fileURLToPath(import.meta.url) 
        : '');

const __dirname_safe = typeof __dirname !== 'undefined' 
    ? __dirname 
    : (__filename_safe ? path.dirname(__filename_safe) : process.cwd());

// TRICK: Implement "Mandor" to forcefully kill Ghostscript worker and free memory if it gets stuck.
const spawnAsync = (command: string, args: string[], options: any): Promise<void> => {
    return new Promise((resolve, reject) => {
        let isDone = false;
        
        // Disable stdio to save memory, as we don't care about the logs. We only care about the output image.
        const child = spawn(command, args, { ...options, stdio: 'ignore' }); 
        
        // MANDOR TIMEOUT
        let timeoutId: NodeJS.Timeout;
        if (options.timeout) {
            timeoutId = setTimeout(() => {
                if (isDone) return;
                isDone = true;
                
                console.error(`[MANDOR] WORKER STUCK! Forcibly terminating PID: ${child.pid} after ${options.timeout}ms...`);
                try {
                    // SIGKILL cannot be ignored by the process. It will be killed instantly by the OS.
                    child.kill('SIGKILL');
                } catch(e) {
                    console.error("[MANDOR] Failed to kill child:", e);
                }
                
                reject(new Error(`[MANDOR] Worker stuck and forcibly terminated after ${options.timeout}ms. Memory cleared.`));
            }, options.timeout);
        }

        child.on('close', (code) => {
            if (isDone) return;
            isDone = true;
            if (timeoutId) clearTimeout(timeoutId);
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Worker exited with code ${code}`));
            }
        });
        
        child.on('error', (err) => {
            if (isDone) return;
            isDone = true;
            if (timeoutId) clearTimeout(timeoutId);
            reject(err);
        });
    });
};

const uploadDir = process.env.VERCEL 
    ? '/tmp' 
    : path.join(process.cwd(), 'uploads');

try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.warn('[WARNING] Cannot create uploadDir on Vercel, using default fallback /tmp:', err);
}

const localGsPath = path.join(__dirname_safe, 'bin', 'gs');
const gsExecutable = fs.existsSync(localGsPath) ? localGsPath : 'gs';

const upload = multer({ dest: uploadDir });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Custom Multi-Provider API Key Context Middleware (Thread safe via AsyncLocalStorage with auto-rotation)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const customGeminiKey = req.headers['x-gemini-key'];
    const customGroqKey = req.headers['x-groq-key'];
    const customMistralKey = req.headers['x-mistral-key'];
    const provider = req.headers['x-ai-provider'] || 'gemini';

    const geminiKeys = customGeminiKey && typeof customGeminiKey === 'string'
        ? customGeminiKey.split(',').map(k => k.trim()).filter(Boolean)
        : [];
        
    const groqKeys = customGroqKey && typeof customGroqKey === 'string'
        ? customGroqKey.split(',').map(k => k.trim()).filter(Boolean)
        : [];
        
    const mistralKeys = customMistralKey && typeof customMistralKey === 'string'
        ? customMistralKey.split(',').map(k => k.trim()).filter(Boolean)
        : [];

    apiKeyStorage.run({
        provider: String(provider),
        gemini: { keys: geminiKeys, activeIndex: 0 },
        groq: { keys: groqKeys, activeIndex: 0 },
        mistral: { keys: mistralKeys, activeIndex: 0 }
    }, () => {
        next();
    });
});

// Global Error Handler to ensure JSON responses on errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
        console.error('[GLOBAL ERROR]', err);
        if (err.status === 413) {
            return res.status(413).json({ error: 'Paylod too large. Gambar terlalu besar untuk diproses.' });
        }
        if (!res.headersSent) {
            return res.status(500).json({ error: err.message || 'Internal Server Error' });
        }
    }
    next();
});

// TRICK: Throttle Quota / Concurrency Limit Middleware
// We place this BEFORE multer upload.single() so that we reject the request
// instantly and gracefully before Node.js even starts buffering the massive file to disk/RAM.
let activeEpsConversions = 0;
const MAX_CONCURRENT_EPS = 5; // Reduced to 5 to prevent Multer from buffering too many large files on disk.

const throttleMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (activeEpsConversions >= MAX_CONCURRENT_EPS) {
        return res.status(429).json({ error: 'Server is currently at maximum capacity. Please wait to prevent memory crash.' });
    }
    
    activeEpsConversions++;
    let isCleanedUp = false;
    
    // TRICK: Attach the uploaded file info to req when it becomes available
    // so we can delete it if the connection aborts abruptly!
    
    const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        activeEpsConversions--;
        console.log(`[THROTTLE CLEANUP] 1 request finished. Active EPS conversions now: ${activeEpsConversions}`);
        
        // Failsafe: if req.file exists but res finished abnormally, clean it up
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
                console.log(`[MULTER FAILSAFE] Deleted stray upload: ${req.file.path}`);
            } catch(e) {}
        }

        res.removeListener('finish', cleanup);
        res.removeListener('close', cleanup);
        req.removeListener('aborted', cleanup);
        req.removeListener('close', cleanup);
    };
    
    console.log(`[THROTTLE INCOMING] Active EPS conversions: ${activeEpsConversions}`);
    res.on('finish', cleanup);
    res.on('close', cleanup);
    req.on('aborted', cleanup);
    req.on('close', cleanup);
    
    next();
};

async function startServer() {
    // Clear uploads directory on startup to prevent disk space exhaustion
    try {
        if (fs.existsSync(uploadDir)) {
            const files = await fs.promises.readdir(uploadDir);
            for (const file of files) {
                await fs.promises.unlink(path.join(uploadDir, file)).catch(() => {});
            }
            console.log(`Cleared ${files.length} files from uploads directory.`);
        }
    } catch (err) {
        console.error('Failed to clear uploads directory:', err);
    }
}

app.get('/api/debug-uploads', (req, res) => {
        try {
            const files = fs.readdirSync(uploadDir);
            let totalSize = 0;
            const fileStats = files.map(file => {
                const stat = fs.statSync(path.join(uploadDir, file));
                totalSize += stat.size;
                return { name: file, size: stat.size };
            });
            res.json({ count: files.length, totalSizeMB: totalSize / (1024 * 1024), files: fileStats, activeConversions: activeEpsConversions });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // --- MULTI-KEY LICENSE ENGINE BACKEND CONTROLLER ---
    interface LicenseKey {
        key: string;
        activated: boolean;
        activatedBy: string;
        activatedAt: string;
    }

    const KEYS_FILE = path.join(process.cwd(), 'keys.json');

    const readKeys = (): LicenseKey[] => {
        try {
            if (fs.existsSync(KEYS_FILE)) {
                const data = fs.readFileSync(KEYS_FILE, 'utf-8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to read keys.json:', e);
        }
        return [];
    };

    const writeKeys = (keys: LicenseKey[]) => {
        try {
            fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to write keys.json:', e);
        }
    };

    const generateRandomKey = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const genPart = (len: number) => {
            let result = '';
            for (let i = 0; i < len; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        return `MZPRO-${genPart(4)}-${genPart(4)}-${genPart(4)}`;
    };

    // 1. Get all keys
    app.get('/api/keys', (req, res) => {
        res.json(readKeys());
    });

    // 2. Generate new keys
    app.post('/api/keys/generate', (req, res) => {
        const count = parseInt(req.body.count as string) || 5;
        const currentKeys = readKeys();
        const newKeys: LicenseKey[] = [];
        
        for (let i = 0; i < count; i++) {
            let newKey = generateRandomKey();
            while (currentKeys.some(k => k.key === newKey) || newKeys.some(k => k.key === newKey)) {
                newKey = generateRandomKey();
            }
            newKeys.push({
                key: newKey,
                activated: false,
                activatedBy: '',
                activatedAt: ''
            });
        }
        
        const updatedKeys = [...currentKeys, ...newKeys];
        writeKeys(updatedKeys);
        res.json({ success: true, keys: newKeys, allKeys: updatedKeys });
    });

    // 3. Delete a key
    app.post('/api/keys/delete', (req, res) => {
        const { key } = req.body;
        if (!key) {
            return res.status(400).json({ error: 'Key is required' });
        }
        const currentKeys = readKeys();
        const updatedKeys = currentKeys.filter(k => k.key !== key);
        writeKeys(updatedKeys);
        res.json({ success: true, allKeys: updatedKeys });
    });

    // 4. Reset/Clear key assignment
    app.post('/api/keys/reset', (req, res) => {
        const { key } = req.body;
        if (!key) {
            return res.status(400).json({ error: 'Key is required' });
        }
        const currentKeys = readKeys();
        const keyObj = currentKeys.find(k => k.key === key);
        if (keyObj) {
            keyObj.activated = false;
            keyObj.activatedBy = '';
            keyObj.activatedAt = '';
            writeKeys(currentKeys);
            res.json({ success: true, allKeys: currentKeys });
        } else {
            res.status(404).json({ error: 'Key not found' });
        }
    });

    // 5. User activation endpoint
    app.post('/api/activate', (req, res) => {
        const { key, email, deviceId } = req.body;
        if (!key) {
            return res.status(400).json({ error: 'Mohon masukkan Serial Key Anda.' });
        }
        
        const normalizedKey = key.trim().toUpperCase();
        const userIdentifier = email || deviceId || 'anonymous';
        
        const currentKeys = readKeys();
        const keyObj = currentKeys.find(k => k.key === normalizedKey);
        
        if (keyObj) {
            if (keyObj.activated) {
                if (keyObj.activatedBy === userIdentifier) {
                    return res.json({ success: true, message: 'Selamat! Serial Key ini telah aktif sebelumnya di perangkat Anda.' });
                } else {
                    return res.status(400).json({ error: 'Serial Key ini sudah digunakan oleh pengguna lain! Mohon gunakan Serial Key yang berbeda.' });
                }
            } else {
                keyObj.activated = true;
                keyObj.activatedBy = userIdentifier;
                keyObj.activatedAt = new Date().toISOString();
                writeKeys(currentKeys);
                return res.json({ success: true, message: 'Aktivasi Berhasil! Serial Key Anda terdaftar secara resmi.' });
            }
        } else {
            // Fallback backward-compatible algorithms
            if (normalizedKey === 'MZPRO-VIP-2026' || normalizedKey === 'MZPRO-UNLIMITED-LIFE' || normalizedKey === 'MZPRO-COMMERCIAL-2026') {
                return res.json({ success: true, message: 'Aktivasi Berhasil menggunakan Master Key!' });
            }
            if (normalizedKey.startsWith('MZPRO-') && normalizedKey.endsWith('-OK')) {
                return res.json({ success: true, message: 'Aktivasi Berhasil menggunakan Algoritma Offline!' });
            }
            if (normalizedKey.length >= 10 && normalizedKey.includes('MZ') && normalizedKey.includes('2026')) {
                return res.json({ success: true, message: 'Aktivasi Berhasil menggunakan Format Offline!' });
            }
            
            return res.status(400).json({ error: 'Serial Key tidak terdaftar atau salah. Sila hubungi Admin untuk membeli Key Resmi.' });
        }
    });

    app.post('/api/test-gemini-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            const testClient = new GoogleGenAI({
                apiKey: apiKey.trim(),
                httpOptions: {
                    headers: {
                        'User-Agent': 'aistudio-build-test',
                    }
                }
            });
            const response = await testClient.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: 'Respond with exactly the word "VALID"',
            });
            if (response && response.text) {
                return res.json({ success: true, message: 'API Key valid!' });
            } else {
                return res.status(400).json({ error: 'Gagal mendapatkan respon dari AI. Silakan periksa kembali key Anda.' });
            }
        } catch (e: any) {
            console.error('Test API Key error:', e);
            const errStr = String(e.message || e);
            if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota') || errStr.includes('Quota exceeded')) {
                return res.json({
                    success: true,
                    quotaExceeded: true,
                    message: 'API Key valid & sukses terotentikasi! Namun kuota gratis / kredit akun Google AI Studio Anda habis (Quota Exceeded / RESOURCE_EXHAUSTED). Anda tetap bisa menyimpannya, namun pastikan untuk menambah limit/tagihan di Google AI Studio Anda agar bisa digunakan.'
                });
            }
            res.status(500).json({ error: e.message || 'Error testing API Key' });
        }
    });
    
    app.post('/api/test-groq-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            // Test if the API key is valid using models endpoint first
            const modelsResponse = await fetch('https://api.groq.com/openai/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`
                }
            });

            if (!modelsResponse.ok) {
                const errText = await modelsResponse.text();
                return res.status(400).json({ error: `Gagal verifikasi Groq: ${errText}` });
            }

            // Test completion with the specified model
            const testResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{role: 'user', content: 'test'}]
                })
            });

            if (testResponse.ok) {
                return res.json({ success: true, message: 'Groq API Key valid! (llama-3.3-70b-versatile model available and working)' });
            } else {
                const errText = await testResponse.text();
                if (errText.includes('model_not_found')) {
                   return res.status(400).json({ error: `Groq verified but model llama-4-scout-17b is unavailable: ${errText}` });
                }
                return res.status(400).json({ error: `Gagal verifikasi Groq (completion): ${errText}` });
            }
        } catch (e: any) {
            console.error('Test Groq API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Error testing Groq API Key' });
        }
    });

    app.post('/api/test-mistral-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            const response = await fetch('https://api.mistral.ai/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`
                }
            });

            if (response.ok) {
                return res.json({ success: true, message: 'Mistral API Key valid!' });
            }
            const errText = await response.text();
            return res.status(400).json({ error: `Gagal verifikasi Mistral: ${errText}` });
        } catch (e: any) {
            console.error('Test Mistral API Key error:', e);
            res.status(500).json({ error: e.message || 'Error testing Mistral API Key' });
        }
    });
    app.post('/api/test-openai-key', async (req, res) => {
        res.json({ success: true, message: 'Provider OpenAI belum memiliki implementasi pengujian API.' });
    });
    app.post('/api/test-openrouter-key', async (req, res) => {
        res.json({ success: true, message: 'Provider Open Router belum memiliki implementasi pengujian API.' });
    });
    app.post('/api/test-blackbox-key', async (req, res) => {
        res.json({ success: true, message: 'Provider Blackbox AI belum memiliki implementasi pengujian API.' });
    });
    app.post('/api/test-nvidia-key', async (req, res) => {
        res.json({ success: true, message: 'Provider NVIDIA belum memiliki implementasi pengujian API.' });
    });
    const getProviderName = (): string => {
        const store = apiKeyStorage.getStore();
        const provider = (store && store.provider) || 'gemini';
        if (provider === 'groq') return 'Groq';
        if (provider === 'mistral') return 'Mistral';
        return 'Gemini';
    };

    app.post('/api/generate-metadata', async (req, res) => {
        try {
            const { frames, keywordCount, customPrompt, toolType } = req.body;
            if (!frames || !Array.isArray(frames)) {
                return res.status(400).json({ error: 'Missing or invalid frames' });
            }
            const metadata = await generateStockMetadata(frames, keywordCount, customPrompt, toolType);
            res.json(metadata);
        } catch (e: any) {
            console.error('Server generate-metadata error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating metadata' });
            }
        }
    });

    app.post('/api/generate-batch-metadata', async (req, res) => {
        try {
            const { items, keywordCount, customPrompt, toolType } = req.body;
            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Missing or invalid items' });
            }
            const batchMetadata = await generateBatchStockMetadata(items, keywordCount, customPrompt, toolType);
            res.json(batchMetadata);
        } catch (e: any) {
            console.error('Server generate-batch-metadata error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating batch metadata' });
            }
        }
    });

    app.post('/api/generate-prompt', async (req, res) => {
        try {
            const { subject, styleCategory, variation, promptMode, pngBgColor, userNegativePrompt, minWords, maxWords } = req.body;
            if (!subject) {
                return res.status(400).json({ error: 'Missing subject field' });
            }
            const promptData = await generateOptimizedPrompt({
                subject,
                styleCategory: styleCategory || 'Photographic',
                variation: typeof variation === 'number' ? variation : 50,
                promptMode,
                pngBgColor,
                userNegativePrompt,
                minWords,
                maxWords
            });
            res.json(promptData);
        } catch (e: any) {
            console.error('Server generate-prompt error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating optimized prompt' });
            }
        }
    });

    app.post('/api/analyze-image-to-prompt', async (req, res) => {
        try {
            const { image, styleCategory } = req.body;
            if (!image) {
                return res.status(400).json({ error: 'Missing image data' });
            }
            const data = await analyzeImageToPrompt(image, styleCategory);
            res.json(data);
        } catch (e: any) {
            console.error('Server analyze-image-to-prompt error:', e);
            res.status(500).json({ error: e.message || 'Error analyzing image' });
        }
    });

    app.post('/api/analyze-batch-image-to-prompt', async (req, res) => {
        try {
            const { images, styleCategory } = req.body;
            if (!images || !Array.isArray(images)) {
                return res.status(400).json({ error: 'Missing images data' });
            }
            const data = await analyzeBatchImageToPrompt(images, styleCategory);
            res.json(data);
        } catch (e: any) {
            console.error('Server analyze-batch-image-to-prompt error:', e);
            res.status(500).json({ error: e.message || 'Error analyzing images' });
        }
    });

    app.post('/api/analyze-video-keyword', async (req, res) => {
        try {
            const { keyword } = req.body;
            if (!keyword) {
                return res.status(400).json({ error: 'Missing keyword' });
            }
            const data = await analyzeVideoKeyword(keyword);
            res.json(data);
        } catch (e: any) {
            console.error('Server analyze-video-keyword error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error analyzing video keyword' });
            }
        }
    });

    app.post('/api/check-image-quality', async (req, res) => {
        try {
            const { image, tolerance } = req.body;
            if (!image) {
                console.error('Server check-image-quality error: Missing image data');
                return res.status(400).json({ error: 'Missing image data' });
            }
            console.log('Server check-image-quality: Analyzing image...');
            const data = await checkImageQuality(image, tolerance);
            console.log('Server check-image-quality: Analysis successful');
            res.json(data);
        } catch (e: any) {
            console.error('Server check-image-quality error:', e);
            res.status(500).json({ error: e.message || 'Error checking image quality' });
        }
    });

    app.post('/api/generate-hollywood-prompts', async (req, res) => {
        try {
            const { keyword } = req.body;
            if (!keyword) {
                return res.status(400).json({ error: 'Missing keyword' });
            }
            const prompts = await generateHollywoodPrompts(keyword);
            res.json(prompts);
        } catch (e: any) {
            console.error('Server generate-hollywood-prompts error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating Hollywood prompts' });
            }
        }
    });

    app.post('/api/generate-calendar-events', async (req, res) => {
        try {
            const { month } = req.body;
            if (!month) {
                return res.status(400).json({ error: 'Missing month field' });
            }
            const events = await generateCalendarEvents(month);
            res.json(events);
        } catch (e: any) {
            console.error('Server generate-calendar-events error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating calendar events' });
            }
        }
    });

    app.post('/api/generate-event-keywords', async (req, res) => {
        try {
            const { eventName, eventDetails } = req.body;
            if (!eventName) {
                return res.status(400).json({ error: 'Missing eventName field' });
            }
            const data = await generateEventKeywords(eventName, eventDetails || '');
            res.json(data);
        } catch (e: any) {
            console.error('Server generate-event-keywords error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating keywords' });
            }
        }
    });

    app.post('/api/smart-suggest-keywords', async (req, res) => {
        try {
            const { title, description, existingKeywords } = req.body;
            if (!title) {
                return res.status(400).json({ error: 'Missing title field or asset context' });
            }
            const data = await suggestKeywords(title, description || '', existingKeywords || []);
            res.json({ keywords: data });
        } catch (e: any) {
            console.error('Server smart-suggest-keywords error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error suggesting keywords' });
            }
        }
    });

    app.get('/api/inspirations', async (req, res) => {
        try {
            const inspirations = [
                { text: "Low angle shot of a diverse business team brainstorming around a glass table in a modern sunlit office, skyscrapers visible in the background, candid interaction.", label: "Team Strategy 📈" },
                { text: "Wide shot of an elderly traveler looking out the window of a scenic train traversing the Swiss Alps, capturing the awe and reflection, soft interior lighting.", label: "Alpine Journey 🏔️" },
                { text: "Close-up macro shot of a barista meticulously pouring latte art into a ceramic cup, focus on the espresso stream and delicate patterns, warm cafe environment.", label: "Coffee Craft ☕" },
                { text: "High angle shot of a person practicing yoga on a wooden pier overlooking a calm, misty lake at sunrise, serene mood.", label: "Sunrise Yoga 🧘" },
                { text: "Side profile shot of a young student focused intently on a vintage microscope in a well-equipped science laboratory, shallow depth of field.", label: "Science Discovery 🔬" },
                { text: "Medium shot of a traditional Japanese potter carefully molding clay on a rotating wheel, workshop setting with natural light.", label: "Pottery Art 🏺" },
                { text: "Candid shot of a father teaching his daughter to ride a bicycle in a local park, sunset lighting creating long, warm shadows.", label: "Family Time 🚲" },
                { text: "Vibrant medium shot of dancers in colorful elaborate traditional attire participating in a cultural parade on a crowded city street.", label: "Cultural Parade 🎭" },
                { text: "Over-the-shoulder shot of a graphic designer working on a complex digital illustration on a large creative tablet.", label: "Digital Art 🎨" }
            ];
            // Shuffle and return
            const shuffled = inspirations.sort(() => 0.5 - Math.random());
            res.json(shuffled.slice(0, 5));
        } catch (e: any) {
            res.status(500).json({ error: 'Error fetching inspirations' });
        }
    });

    app.post('/api/send-key', async (req, res) => {
        const { email, licenseKey, appName, caption } = req.body;

        if (!email || !licenseKey) {
            return res.status(400).json({ message: 'Email and license key are required.' });
        }

        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
            console.error('Email credentials not configured.');
            return res.status(500).json({ message: 'Layanan email belum dikonfigurasi. Sila masukkan EMAIL_USER dan EMAIL_PASS di menu Settings aplikasi.' });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPass,
                },
            });

            const mailOptions = {
                from: `"${appName} Pro" <${emailUser}>`,
                to: email,
                subject: `License Key ${appName} PRO Anda`,
                text: `Halo!\n\n${caption || 'Terima kasih telah menggunakan layanan kami.'}\n\nBerikut adalah License Key ${appName} PRO Anda:\n\nSERIAL KEY: ${licenseKey}\n\nSila masukkan key ini pada menu aktivasi di dalam aplikasi.\n\nSalam,\nTim ${appName}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
                        <h2 style="color: #4e73df; text-transform: uppercase; font-size: 18px; margin-bottom: 20px;">License Key ${appName} PRO</h2>
                        <p style="font-size: 14px; line-height: 1.5;">Halo!</p>
                        <p style="font-size: 14px; line-height: 1.5;">${caption || 'Terima kasih telah mempercayai <b>' + appName + '</b>.'} Berikut adalah Serial Key lisensi Anda:</p>
                        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px dashed #4e73df; text-align: center; margin: 24px 0;">
                            <code style="font-family: monospace; font-size: 20px; font-weight: 800; color: #1e1b4b; letter-spacing: 2px;">${licenseKey}</code>
                        </div>
                        <p style="font-size: 14px; line-height: 1.5;"><b>Cara Aktivasi:</b></p>
                        <ul style="font-size: 13px; line-height: 1.5; color: #475569;">
                            <li>Buka aplikasi <b>${appName}</b></li>
                            <li>Masuk ke menu Saas Portal / Pengaturan</li>
                            <li>Salin dan tempel Serial Key di atas</li>
                        </ul>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Pesan ini dikirim secara otomatis oleh sistem lisensi ${appName}. Jangan membalas email ini.</p>
                    </div>
                `,
            };

            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: 'Email sent successfully' });
        } catch (error: any) {
            console.error('Nodemailer error:', error);
            let userMessage = 'Gagal mengirim email backend.';
            
            if (error.code === 'EAUTH' || (error.response && (error.response.includes('535') || error.response.includes('534')))) {
                if (error.response && error.response.includes('534')) {
                    userMessage = 'Gmail memerlukan "App Password". Akun Anda memiliki 2-Step Verification aktif atau memblokir login biasa. Anda WAJIB membuat 16-karakter App Password di Akun Google Anda untuk variabel EMAIL_PASS.';
                } else {
                    userMessage = 'Login email gagal (Invalid Credentials). Pastikan EMAIL_USER dan EMAIL_PASS benar. Jika menggunakan Gmail, Anda HARUS menggunakan "App Password", bukan password akun biasa.';
                }
            }

            res.status(500).json({ 
                message: userMessage, 
                error: error.message,
                tip: 'Cek Settings menu untuk konfigurasi EMAIL_USER dan EMAIL_PASS.'
            });
        }
    });

    app.post('/api/convert-eps', throttleMiddleware, upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const inputPath = req.file.path;
        const outputPath = `${inputPath}.jpg`;
        const uniqueTmpDir = path.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);

        try {
            fs.mkdirSync(uniqueTmpDir, { recursive: true });
            console.log(`Starting conversion for ${req.file.originalname} (${req.file.size} bytes)`);
            
            // Run Ghostscript to convert EPS to JPEG (Async)
            // TRICK: Use -dEPSFitPage with fixed dimensions to force Ghostscript to scale the EPS down 
            // to fit within 768x768 points. This prevents OOM crashes caused by EPS files with massive BoundingBoxes,
            // while preserving the aspect ratio and preventing cropping.
            // We also add aggressive internal memory limits and FORCE BANDING (-dMaxBitmap, -dBandHeight, etc.)
            // Banding forces Ghostscript to render in chunks, drastically reducing peak memory usage for complex vectors.
            const gsMemoryLimits = `-dMaxBitmap=5000000 -dBufferSpace=2000000 -dBandHeight=50 -dBandBufferSpace=2000000 -dNumRenderingThreads=1 -dVMReclaim=1 -c "<< /MaxPatternBitmap 500000 >> setuserparams" -f`;
            
            // TRICK: Use anti-aliasing at level 2 instead of 1 to avoid jagged edges that look like pixelart, 
            // but lower than 4 to save RAM. Use -dEPSCrop and -r72 for better quality-to-RAM efficiency.
            // MUST INJECT memory limits here to enforce banding and prevent OOM.
            const gsArgs = [
                '-dSAFER', '-dBATCH', '-dNOPAUSE', 
                '-dEPSCrop', '-r72', 
                '-dTextAlphaBits=2', '-dGraphicsAlphaBits=2',
                '-dJPEGQ=85', // Optimize file size without losing much quality
                '-sDEVICE=jpeg', `-sOutputFile=${outputPath}`,
                // Memory & Banding Limits
                '-dMaxBitmap=5000000', 
                '-dBufferSpace=2000000', 
                '-dBandHeight=50', 
                '-dBandBufferSpace=2000000', 
                '-dNumRenderingThreads=1', 
                '-dVMReclaim=1',
                '-c', '<< /MaxPatternBitmap 500000 >> setuserparams', '-f',
                inputPath
            ];
            
            const spawnOptions = { 
                timeout: 30000, // Reduced to 30s to fail fast if it's too complex
                env: { ...process.env, TMPDIR: uniqueTmpDir } // Force Ghostscript to use disk instead of RAM for temp files
            };

            await gsQueue.enqueue(async () => {
                try {
                    await spawnAsync(gsExecutable, gsArgs, spawnOptions);
                } catch (gsError) {
                    console.warn('Ghostscript failed at 72 DPI, trying 36 DPI...');
                    // Fallback to lower resolution
                    const gsArgs36 = gsArgs.map(arg => arg === '-r72' ? '-r36' : arg);
                    try {
                        await spawnAsync(gsExecutable, gsArgs36, { ...spawnOptions, timeout: 15000 });
                    } catch (gsError2) {
                        console.warn('Ghostscript failed with -dEPSCrop, trying -dEPSFitPage as last resort...');
                        // Last resort: try -dEPSFitPage with very low resolution
                        const gsArgsFit = gsArgs36.map(arg => arg === '-dEPSCrop' ? '-dEPSFitPage' : arg);
                        await spawnAsync(gsExecutable, gsArgsFit, { ...spawnOptions, timeout: 15000 });
                    }
                }
            });

            console.log(`Conversion successful for ${req.file.originalname}`);
            
            // Verify the file exists and is not empty
            try {
                const stats = await fs.promises.stat(outputPath);
                if (stats.size === 0) {
                    throw new Error('Generated JPEG is 0 bytes (Ghostscript failed silently)');
                }
            } catch (statErr) {
                throw new Error('Generated JPEG not found or empty');
            }

            // Mengirim file ke browser lalu menghancurkan buktinya sesaat kemudian...
            await new Promise<void>((resolve, reject) => {
                res.sendFile(outputPath, (err) => {
                    if (err) {
                        console.error('Error saat mengirimkan file JPEG ke frontend:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Failed to send file' });
                        }
                        reject(err);
                    } else {
                        resolve();
                    }
                    
                    // TRICK JITU 1: HANCURKAN SUMBER BEBAN MEMORI DISK KETIKA BERES
                    setTimeout(() => {
                        try {
                            // Hapus file awal EPS yang di-upload
                            if (fs.existsSync(inputPath)) {
                                fs.unlinkSync(inputPath);
                            }
                            // Hapus file JPEG sesudah dibaca oleh client interface
                            if (fs.existsSync(outputPath)) {
                                fs.unlinkSync(outputPath);
                            }
                            console.log(`[CLEANUP MANDOR] Sisa sampah file ${req.file?.originalname} dimusnahkan. Kapasitas diturunkan!`);
                        } catch (cleanupErr) {
                            console.error('[CLEANUP MANDOR] Gagal menghapus file sisa:', cleanupErr);
                        }
                    }, 100);
                });
            });

        } catch (error: any) {
            console.error('Ghostscript convert error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to convert EPS file', details: error.message });
            }
        } finally {
            // Hapus direktori temp ghostscript
            if (fs.existsSync(uniqueTmpDir)) {
                fs.rmSync(uniqueTmpDir, { recursive: true, force: true });
            }
            
            // TRICK JITU 2: PENJAGAAN PENGHAPUSAN FAILSAFE
            if (fs.existsSync(inputPath)) {
                 fs.rmSync(inputPath, { force: true });
            }
            if (fs.existsSync(outputPath)) {
                 fs.rmSync(outputPath, { force: true });
            }
            
            // Paksa pembuangan Garbage Collection Node.js
            setTimeout(() => {
                if (global.gc) {
                    global.gc();
                    console.log("[MANDOR GC] Memori dibersihkan untuk worker selanjutnya.");
                }
            }, 100);
        }
    });

async function startHosting() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        // In production, serve static files from dist
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*all', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

if (!process.env.VERCEL) {
    startServer().then(() => startHosting());
}

export { app };
