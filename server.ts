import express from 'express';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import { exec, spawn } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { PakasirClient } from 'pakasir-client';
import { generateStockMetadata, generateAutoSubject, generateBatchStockMetadata, generateOptimizedPrompt, analyzeImageToPrompt, analyzeBatchImageToPrompt, analyzeVideoKeyword, generateHollywoodPrompts, checkImageQuality, checkVideoQuality, apiKeyStorage, uploadVideoToGemini, generateCalendarEvents, generateEventKeywords, suggestKeywords, searchAdobeStockWithBypass, generateMotionCode } from './server/gemini.ts';
import { testFtpConnection, uploadToFtp } from './server/ftpService.ts';
import fluentFfmpeg from 'fluent-ffmpeg';
import { createRequire } from 'module';
const _require = typeof require !== 'undefined' ? require : createRequire(import.meta.url);

// NFT tracing hints for Vercel Serverless Function bundler
try {
    _require.resolve('fluent-ffmpeg/package.json');
    _require.resolve('@ffmpeg-installer/ffmpeg/package.json');
    _require.resolve('@ffmpeg-installer/linux-x64/package.json');
    _require.resolve('@ffprobe-installer/ffprobe/package.json');
    _require.resolve('@ffprobe-installer/linux-x64/package.json');
} catch(e) {}

let ffmpeg: any;
try {
    const ffmpegLib = fluentFfmpeg || _require('fluent-ffmpeg');
    ffmpeg = typeof ffmpegLib === 'function' ? ffmpegLib : (ffmpegLib.default || ffmpegLib);
    try {
        const ffmpegInstaller = _require('@ffmpeg-installer/ffmpeg');
        if (ffmpegInstaller && ffmpegInstaller.path) {
            ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        }
    } catch (err) {
        console.warn('ffmpeg installer path not available:', err);
    }
    try {
        const ffprobeInstaller = _require('@ffprobe-installer/ffprobe');
        if (ffprobeInstaller && ffprobeInstaller.path) {
            ffmpeg.setFfprobePath(ffprobeInstaller.path);
        }
    } catch (err) {
        console.warn('ffprobe installer path not available:', err);
    }
} catch (e) {
    console.warn('ffmpeg not available locally:', e);
}



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

const localGsPath = path.join(process.cwd(), 'bin', 'gs');
if (fs.existsSync(localGsPath)) {
    try {
        fs.chmodSync(localGsPath, '0755');
    } catch (err: any) {
        // EROFS = read-only filesystem (e.g. Vercel/Lambda) — binary is already executable, skip silently
        if (err && err.code !== 'EROFS') {
            console.warn('[PERMISSIONS] Failed to set executable permission on gs binary:', err.message || err);
        }
    }
}
const gsExecutable = fs.existsSync(localGsPath) ? localGsPath : 'gs';

const upload = multer({ 
    dest: uploadDir,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB Limit
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Custom Multi-Provider API Key Context Middleware (Thread safe via AsyncLocalStorage with auto-rotation)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const customGeminiKey = req.headers['x-gemini-key'];
    const customGroqKey = req.headers['x-groq-key'];
    const customMistralKey = req.headers['x-mistral-key'];
    const customOpenAIKey = req.headers['x-openai-key'];
    const customOpenRouterKey = req.headers['x-openrouter-key'];
    const customNvidiaKey = req.headers['x-nvidia-key'];
    const customBlackboxKey = req.headers['x-blackbox-key'];
    const customBluesmindsKey = req.headers['x-bluesminds-key'];
    const customAiveneKey = req.headers['x-aivene-key'];
    const provider = req.headers['x-ai-provider'] || 'gemini';

    const getKeys = (headerVal: any) => {
        return headerVal && typeof headerVal === 'string'
            ? headerVal.split(',').map(k => k.trim()).filter(Boolean)
            : [];
    };

    apiKeyStorage.run({
        provider: String(provider),
        gemini: { keys: getKeys(customGeminiKey), activeIndex: 0 },
        groq: { keys: getKeys(customGroqKey), activeIndex: 0 },
        mistral: { keys: getKeys(customMistralKey), activeIndex: 0 },
        openai: { keys: getKeys(customOpenAIKey), activeIndex: 0 },
        openrouter: { keys: getKeys(customOpenRouterKey), activeIndex: 0 },
        nvidia: { keys: getKeys(customNvidiaKey), activeIndex: 0 },
        blackbox: { keys: getKeys(customBlackboxKey), activeIndex: 0 },
        bluesminds: { keys: getKeys(customBluesmindsKey), activeIndex: 0 },
        aivene: { keys: getKeys(customAiveneKey), activeIndex: 0 }
    }, () => {
        next();
    });
});

// Global Error Handler to ensure JSON responses on errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
        console.error('[GLOBAL ERROR]', err);
        // Handle Multer limits or platform 413 errors
        if (err.status === 413 || err.code === 'LIMIT_FILE_SIZE' || err.message?.includes('too large')) {
            const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
            const limitMsg = isVercel 
                ? 'Vercel has a strict 4.5MB limit for serverless functions. Please optimize your EPS/AI file below 4.5MB or deploy to a platform with higher limits (like Railway or Cloud Run).'
                : 'Payload too large. Vector file exceeds the server capacity (max 500MB). Try optimizing the EPS file.';
            return res.status(413).json({ error: limitMsg });
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
const MAX_CONCURRENT_EPS = 1; // Reduced to 1 to prevent Multer from buffering too many large files on disk and OOMing.

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

app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Authentication Callback</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #f8fafc;">
  <h2>Authenticating...</h2>
  <p>Please wait while we complete your sign-in.</p>
  <script>
    function handleAuth() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        sendErrorToOpener(error, errorDescription || 'Authentication failed');
        return;
      }

      if (code) {
        sendCodeToOpener(code);
        return;
      }

      const hash = window.location.hash;
      if (!hash) {
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        if (accessToken) {
          sendToOpener({ access_token: accessToken, refresh_token: refreshToken });
          return;
        }
        document.body.innerHTML = '<h2>Authentication Failed</h2><p>No authentication parameters found in the response URL.</p>';
        return;
      }

      const params = {};
      hash.substring(1).split('&').forEach(pair => {
        const [key, val] = pair.split('=');
        if (key && val) {
          params[key] = decodeURIComponent(val);
        }
      });

      if (params.access_token) {
        sendToOpener(params);
      } else {
        document.body.innerHTML = '<h2>Authentication Failed</h2><p>Authentication failed or token is missing.</p>';
      }
    }

    function sendCodeToOpener(code) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_CODE',
          code: code
        }, '*');
        
        document.body.innerHTML = '<h2>Success!</h2><p>Completing your sign-in... This window will close automatically.</p>';
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        window.location.href = '/';
      }
    }

    function sendErrorToOpener(error, desc) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_ERROR',
          error: error,
          description: desc
        }, '*');
        
        document.body.innerHTML = '<h2>Authentication Error</h2><p>' + desc + '</p>';
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        window.location.href = '/';
      }
    }

    function sendToOpener(params) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'SUPABASE_OAUTH_SUCCESS',
          access_token: params.access_token,
          refresh_token: params.refresh_token,
          expires_in: params.expires_in,
          provider_token: params.provider_token
        }, '*');
        
        document.body.innerHTML = '<h2>Success!</h2><p>Signing in... This window will close automatically.</p>';
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        window.location.href = '/';
      }
    }

    handleAuth();
  </script>
</body>
</html>
    `);
});

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

    // 4b. Renew key duration
    app.post('/api/keys/renew', (req, res) => {
        const { key, duration } = req.body;
        if (!key) {
            return res.status(400).json({ error: 'Key is required' });
        }
        const currentKeys = readKeys();
        const keyObj = currentKeys.find(k => k.key === key);
        if (keyObj) {
            (keyObj as any).duration = duration || '30days';
            if (duration === '30days') {
                keyObj.activatedAt = new Date().toISOString();
            } else {
                keyObj.activatedAt = '';
            }
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

    // =========== CLOUDFLARE D1 BACKUP, RESTORE, IMPORT INTEGRATION ===========
    let isD1TableInitialized = false;

    function getD1Config() {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 
            (process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT.match(/https:\/\/([a-zA-Z0-9]+)\.r2\.cloudflarestorage\.com/)?.[1] : '');
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;
        const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.D1_DATABASE_ID || "60a4d870-56c9-4dc6-9079-789d9e536cea";
        return { accountId, apiToken, databaseId };
    }

    function isD1Configured() {
        const { accountId, apiToken } = getD1Config();
        return !!(accountId && apiToken);
    }

    async function queryD1(sql: string, params: any[] = []) {
        const { accountId, apiToken, databaseId } = getD1Config();
        if (!accountId) {
            throw new Error('Cloudflare Account ID is missing. Please set CLOUDFLARE_ACCOUNT_ID in environment variables or configure S3_ENDPOINT.');
        }
        if (!apiToken) {
            throw new Error('Cloudflare API Token is missing. Please set CLOUDFLARE_API_TOKEN in environment variables.');
        }

        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql, params })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Cloudflare D1 HTTP API Error ${response.status}: ${errText}`);
        }

        const json: any = await response.json();
        if (!json.success) {
            throw new Error(`Cloudflare D1 Query Failed: ${JSON.stringify(json.errors)}`);
        }

        return json.result;
    }

    async function ensureD1Table() {
        if (isD1TableInitialized) return;
        if (!isD1Configured()) {
            console.warn('[Cloudflare D1] Skipping table verification: Cloudflare credentials are not configured.');
            return;
        }
        try {
            await queryD1(`
                CREATE TABLE IF NOT EXISTS metadata_backups (
                    id TEXT PRIMARY KEY,
                    uid TEXT NOT NULL,
                    batch_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    tool TEXT NOT NULL,
                    items TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `);
            isD1TableInitialized = true;
            console.log('[Cloudflare D1] metadata_backups table verified/created.');
        } catch (e: any) {
            console.warn('[Cloudflare D1] Failed to verify/create metadata_backups table:', e.message || e);
            throw e;
        }
    }

    // Save a backup to Cloudflare D1
    app.post('/api/d1-backup/save', async (req, res) => {
        try {
            const { uid, tool, items } = req.body;
            if (!uid || !items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Missing uid or items array' });
            }

            if (!isD1Configured()) {
                return res.status(200).json({ 
                    success: false, 
                    code: 'CREDENTIALS_MISSING', 
                    error: 'Cloudflare API Token belum dikonfigurasi. Sila masukkan CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.' 
                });
            }

            await ensureD1Table();

            const id = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const batchId = `batch-${Date.now()}`;
            const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const itemsStr = JSON.stringify(items);

            // Insert new backup
            await queryD1(
                `INSERT INTO metadata_backups (id, uid, batch_id, timestamp, tool, items) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, uid, batchId, timestamp, tool || 'Unknown Tool', itemsStr]
            );

            // Get count of backups for this user to prune if greater than 30 (just like original Firestore design)
            try {
                const countResult = await queryD1(
                    `SELECT COUNT(*) as count FROM metadata_backups WHERE uid = ?`,
                    [uid]
                );
                const count = countResult?.[0]?.results?.[0]?.count || 0;
                if (count > 30) {
                    // Fetch backup IDs ordered by created_at ascending
                    const allBackups = await queryD1(
                        `SELECT id FROM metadata_backups WHERE uid = ? ORDER BY created_at ASC`,
                        [uid]
                    );
                    const backupsToDelete = allBackups?.[0]?.results?.slice(0, count - 30) || [];
                    for (const oldBackup of backupsToDelete) {
                        await queryD1(`DELETE FROM metadata_backups WHERE id = ?`, [oldBackup.id]);
                    }
                }
            } catch (pruneErr: any) {
                console.warn('[Cloudflare D1] Failed to prune old backups:', pruneErr.message);
            }

            res.json({ success: true, batchId, timestamp });
        } catch (err: any) {
            const isAuthError = err.message?.includes('401') || err.message?.includes('Authentication error') || err.message?.includes('API Token');
            const isDbError = err.message?.includes('404') || err.message?.includes('7003') || err.message?.includes('Could not route') || err.message?.includes('object identifier is invalid') || err.message?.includes('database');
            
            console.warn('[Cloudflare D1] Backup Save handled gracefully:', err.message || err);
            
            if (isAuthError) {
                return res.status(200).json({ 
                    success: false, 
                    code: 'CREDENTIALS_INVALID', 
                    error: 'Cloudflare API Token tidak valid atau salah. Sila semak CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.' 
                });
            }
            if (isDbError) {
                return res.status(200).json({ 
                    success: false, 
                    code: 'DATABASE_INVALID', 
                    error: 'Cloudflare D1 Database ID tidak valid atau salah. Sila semak CLOUDFLARE_D1_DATABASE_ID di menu Settings di kanan atas.' 
                });
            }
            res.status(200).json({ success: false, error: err.message || 'Failed to save backup to Cloudflare D1' });
        }
    });

    // Fetch backup history from Cloudflare D1
    app.get('/api/d1-backup/history', async (req, res) => {
        try {
            const { uid } = req.query;
            if (!uid) {
                return res.status(400).json({ error: 'Missing uid' });
            }

            if (!isD1Configured()) {
                return res.status(200).json({ 
                    success: false, 
                    code: 'CREDENTIALS_MISSING', 
                    error: 'Cloudflare API Token belum dikonfigurasi. Sila masukkan CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.',
                    data: []
                });
            }

            await ensureD1Table();

            const queryResult = await queryD1(
                `SELECT batch_id, timestamp, tool, items, created_at FROM metadata_backups WHERE uid = ? ORDER BY created_at DESC LIMIT 30`,
                [String(uid)]
            );

            const rows = queryResult?.[0]?.results || [];
            const history = rows.map((row: any) => {
                let items: any[] = [];
                try {
                    items = JSON.parse(row.items);
                } catch (e) {
                    console.warn('[Cloudflare D1] Failed to parse items JSON:', e);
                }
                return {
                    batchId: row.batch_id,
                    timestamp: row.timestamp,
                    tool: row.tool,
                    items,
                    createdAt: row.created_at
                };
            });

            res.json({ success: true, data: history });
        } catch (err: any) {
            const isAuthError = err.message?.includes('401') || err.message?.includes('Authentication error') || err.message?.includes('API Token');
            const isDbError = err.message?.includes('404') || err.message?.includes('7003') || err.message?.includes('Could not route') || err.message?.includes('object identifier is invalid') || err.message?.includes('database');
            
            console.warn('[Cloudflare D1] Backup History handled gracefully:', err.message || err);
            
            if (isAuthError) {
                return res.status(200).json({ 
                    success: false, 
                    code: 'CREDENTIALS_INVALID', 
                    error: 'Cloudflare API Token tidak valid atau salah. Sila semak CLOUDFLARE_API_TOKEN di menu Settings di kanan atas.',
                    data: []
                });
            }
            if (isDbError) {
                return res.status(200).json({ 
                    success: false, 
                    code: 'DATABASE_INVALID', 
                    error: 'Cloudflare D1 Database ID tidak valid atau salah. Sila semak CLOUDFLARE_D1_DATABASE_ID di menu Settings di kanan atas.',
                    data: []
                });
            }
            res.status(200).json({ success: false, error: err.message || 'Failed to retrieve backup history', data: [] });
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
            
            // Try different models to avoid temporary unavailability, deprecation or high demand (503)
            const modelsToTry = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-flash-latest'];
            let lastError: any = null;
            let response: any = null;
            
            for (const testModel of modelsToTry) {
                try {
                    response = await testClient.models.generateContent({
                        model: testModel,
                        contents: 'Respond with exactly the word "VALID"',
                    });
                    if (response && response.text) {
                        break; // Success!
                    }
                } catch (err: any) {
                    lastError = err;
                    const errStr = (
                        (err.message ? String(err.message) : "") + " " +
                        (err.status ? String(err.status) : "") + " " +
                        (err.code ? String(err.code) : "") + " " +
                        (typeof err === 'object' ? JSON.stringify(err) : String(err))
                    ).toLowerCase();
                    const statusCode = err.status || err.code;
                    
                    // If it's a quota exceeded / rate limit error (429), the API key is indeed valid (authenticated), but out of quota.
                    // We can immediately throw this error so that it bypasses other model trials and goes straight to the quota handling catch block.
                    if (statusCode === 429 || errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota') || errStr.includes('exceeded')) {
                        throw err;
                    }
                    
                    // If it's a structural key issue (invalid key or unauthorized) and NOT transient like 503 or 429, fail fast
                    if (statusCode === 400 && (errStr.includes('api_key_invalid') || errStr.includes('invalid') || errStr.includes('not found') || errStr.includes('unregistered') || errStr.includes('api key'))) {
                        throw err;
                    }
                    console.log(`[test-gemini-key] Failed testing model ${testModel}, trying next model if available. Error: ${err.message}`);
                }
            }
            
            if (response && response.text) {
                return res.json({ success: true, message: 'API Key valid!' });
            } else if (lastError) {
                throw lastError;
            } else {
                return res.status(400).json({ error: 'Gagal mendapatkan respon dari AI. Silakan periksa kembali key Anda.' });
            }
        } catch (e: any) {
            const errTextJoined = (
                (e.message ? String(e.message) : "") + " " +
                (e.status ? String(e.status) : "") + " " +
                (e.code ? String(e.code) : "") + " " +
                (typeof e === 'object' ? JSON.stringify(e) : String(e))
            ).toLowerCase();
            if (errTextJoined.includes('429') || errTextJoined.includes('resource_exhausted') || errTextJoined.includes('quota') || errTextJoined.includes('exceeded')) {
                 console.log('Test API Key returned 429 Quota Exceeded (successfully handled as valid key but empty quota).');
                 return res.json({
                    success: true,
                    quotaExceeded: true,
                    message: 'API Key valid & sukses terotentikasi! Namun kuota gratis / kredit akun Google AI Studio Anda habis (Quota Exceeded / RESOURCE_EXHAUSTED). Anda tetap bisa menyimpannya, namun pastikan untuk menambah limit/tagihan di Google AI Studio Anda agar bisa digunakan.'
                });
            } else if (errTextJoined.includes('503') || errTextJoined.includes('unavailable') || errTextJoined.includes('high demand') || errTextJoined.includes('overloaded')) {
                 console.log('Test API Key returned 503 High Demand (successfully handled as valid key).');
                 return res.json({
                    success: true,
                    quotaExceeded: false,
                    message: 'API Key valid & sukses terotentikasi! Server Gemini sedang tinggi permintaan (503 High Demand), namun key Anda dapat digunakan.'
                });
            } else if (errTextJoined.includes('api_key_invalid') || errTextJoined.includes('invalid') || errTextJoined.includes('api key not valid')) {
                return res.status(400).json({ error: 'API Key tidak valid. Silakan periksa kembali API Key Anda.' });
            }
            console.error('Test API Key error:', e);
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
                let errorMsg = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && parsed.error.message) {
                        errorMsg = parsed.error.message;
                    }
                } catch (_) {}

                if (modelsResponse.status === 401 || modelsResponse.status === 403 || errorMsg.toLowerCase().includes('invalid_api_key') || errorMsg.toLowerCase().includes('unauthorized')) {
                    return res.status(400).json({ error: 'API Key Groq tidak valid atau salah. Silakan periksa kembali.' });
                }
                if (modelsResponse.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit')) {
                    return res.json({
                        success: true,
                        quotaExceeded: true,
                        message: 'API Key Groq valid! Namun kuota / limit penggunaan Groq Anda telah habis.'
                    });
                }
                return res.status(400).json({ error: `Gagal verifikasi Groq: ${errorMsg}` });
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
                return res.json({ success: true, message: 'API Key Groq valid!' });
            } else {
                const errText = await testResponse.text();
                let errorMsg = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && parsed.error.message) {
                        errorMsg = parsed.error.message;
                    }
                } catch (_) {}

                if (testResponse.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                    return res.json({
                        success: true,
                        quotaExceeded: true,
                        message: 'API Key Groq valid! Namun kuota / limit penggunaan Groq Anda telah habis.'
                    });
                }
                if (errorMsg.includes('model_not_found') || testResponse.status === 404) {
                    return res.status(400).json({ error: `API Key Groq valid, namun model llama-3.3-70b-versatile tidak tersedia pada akun Anda.` });
                }
                return res.status(400).json({ error: `Gagal verifikasi Groq (completion): ${errorMsg}` });
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
                return res.json({ success: true, message: 'API Key Mistral valid!' });
            }
            const errText = await response.text();
            let errorMsg = errText;
            try {
                const parsed = JSON.parse(errText);
                if (parsed.error && parsed.error.message) {
                    errorMsg = parsed.error.message;
                }
            } catch (_) {}

            if (response.status === 401 || response.status === 403 || errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('unauthorized')) {
                return res.status(400).json({ error: 'API Key Mistral tidak valid atau salah. Silakan periksa kembali.' });
            }
            if (response.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                return res.json({
                    success: true,
                    quotaExceeded: true,
                    message: 'API Key Mistral valid! Namun kuota / limit penggunaan Mistral Anda telah habis.'
                });
            }
            return res.status(400).json({ error: `Gagal verifikasi Mistral: ${errorMsg}` });
        } catch (e: any) {
            console.error('Test Mistral API Key error:', e);
            res.status(500).json({ error: e.message || 'Error testing Mistral API Key' });
        }
    });

    app.post('/api/test-openai-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{role: 'user', content: 'test'}],
                    max_tokens: 16
                })
            });

            if (testResponse.ok) {
                return res.json({ success: true, message: 'API Key OpenAI valid!' });
            } else {
                const errText = await testResponse.text();
                let errorMsg = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && parsed.error.message) {
                        errorMsg = parsed.error.message;
                    }
                } catch (_) {}

                if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes('invalid_api_key') || errorMsg.toLowerCase().includes('unauthorized')) {
                    return res.status(400).json({ error: 'API Key OpenAI tidak valid atau salah. Silakan periksa kembali.' });
                }
                if (testResponse.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded') || errorMsg.toLowerCase().includes('insufficient_quota')) {
                    return res.json({
                        success: true,
                        quotaExceeded: true,
                        message: 'API Key OpenAI valid! Namun kuota / kredit akun OpenAI Anda telah habis.'
                    });
                }
                return res.status(400).json({ error: `Gagal verifikasi OpenAI API: ${errorMsg}` });
            }
        } catch (e: any) {
            console.warn('Test OpenAI API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    });

    app.post('/api/test-openrouter-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{role: 'user', content: 'test'}],
                    max_tokens: 16
                })
            });

            if (testResponse.ok) {
                return res.json({ success: true, message: 'API Key OpenRouter valid!' });
            } else {
                const errText = await testResponse.text();
                let errorMsg = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && parsed.error.message) {
                        errorMsg = parsed.error.message;
                    } else if (parsed.error && typeof parsed.error === 'string') {
                        errorMsg = parsed.error;
                    }
                } catch (_) {}

                if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('unauthorized')) {
                    return res.status(400).json({ error: 'API Key OpenRouter tidak valid atau salah. Silakan periksa kembali.' });
                }
                if (testResponse.status === 402 || testResponse.status === 429 || errorMsg.toLowerCase().includes('credit') || errorMsg.toLowerCase().includes('balance') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                    return res.json({
                        success: true,
                        quotaExceeded: true,
                        message: 'API Key OpenRouter valid! Namun saldo atau kuota akun OpenRouter Anda telah habis.'
                    });
                }
                return res.status(400).json({ error: `Gagal verifikasi OpenRouter API: ${errorMsg}` });
            }
        } catch (e: any) {
            console.warn('Test OpenRouter API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    });

    app.post('/api/test-blackbox-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            const testResponse = await fetch('https://api.blackbox.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'blackboxai',
                    messages: [{role: 'user', content: 'test'}],
                    max_tokens: 16
                })
            });

            if (testResponse.ok) {
                return res.json({ success: true, message: 'API Key Blackbox valid!' });
            } else {
                const errText = await testResponse.text();
                let errorMsg = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && parsed.error.message) {
                        errorMsg = parsed.error.message;
                    }
                } catch (_) {}

                if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('unauthorized')) {
                    return res.status(400).json({ error: 'API Key Blackbox tidak valid atau salah. Silakan periksa kembali.' });
                }
                if (testResponse.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                    return res.json({
                        success: true,
                        quotaExceeded: true,
                        message: 'API Key Blackbox valid! Namun kuota penggunaan Blackbox Anda telah habis.'
                    });
                }
                return res.status(400).json({ error: `Gagal verifikasi Blackbox API: ${errorMsg}` });
            }
        } catch (e: any) {
            console.warn('Test Blackbox API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    });

    app.post('/api/test-nvidia-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            const testResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'stepfun-ai/step-3.5-flash',
                    messages: [{role: 'user', content: 'test'}],
                    max_tokens: 16
                })
            });

            if (testResponse.ok) {
                return res.json({ success: true, message: 'API Key NVIDIA valid!' });
            } else {
                const errText = await testResponse.text();
                let errorMsg = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && parsed.error.message) {
                        errorMsg = parsed.error.message;
                    }
                } catch (_) {}

                if (testResponse.status === 401 || testResponse.status === 403 || errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('unauthorized')) {
                    return res.status(400).json({ error: 'API Key NVIDIA tidak valid atau salah. Silakan periksa kembali.' });
                }
                if (testResponse.status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                    return res.json({
                        success: true,
                        quotaExceeded: true,
                        message: 'API Key NVIDIA valid! Namun kuota / kredit akun NVIDIA Anda telah habis.'
                    });
                }
                return res.status(400).json({ error: `Gagal verifikasi NVIDIA API: ${errorMsg}` });
            }
        } catch (e: any) {
            console.warn('Test NVIDIA API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    });

    app.post('/api/test-bluesminds-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            let testUri = (process.env.BLUESMINDS_API_ENDPOINT || 'https://api.bluesminds.com/v1/chat/completions').trim();
            if (!testUri.endsWith('/chat/completions')) {
                if (testUri.endsWith('/chat/completions/')) {
                    testUri = testUri.slice(0, -1);
                } else if (testUri.endsWith('/v1')) {
                    testUri = `${testUri}/chat/completions`;
                } else if (testUri.endsWith('/v1/')) {
                    testUri = `${testUri}chat/completions`;
                } else if (testUri.endsWith('/')) {
                    testUri = `${testUri}v1/chat/completions`;
                } else {
                    testUri = `${testUri}/v1/chat/completions`;
                }
            }

            let attempts = 0;
            let success = false;
            let lastStatus = 0;
            let lastText = '';

            while (attempts < 4 && !success) {
                attempts++;
                try {
                    const testResponse = await fetch(testUri, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey.trim()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o',
                            messages: [{role: 'user', content: 'test'}],
                            stream: false
                        })
                    });

                    lastStatus = testResponse.status;
                    lastText = await testResponse.text();

                    if (testResponse.ok) {
                        success = true;
                    } else {
                        // If it's a client authentication issue (e.g. 401/403 or specific token error), abort retries
                        const lowerText = lastText.toLowerCase();
                        if ((lastStatus === 401 || lastStatus === 403) || (lastStatus === 400 && lowerText.includes('invalid') && !lowerText.includes('extra data'))) {
                            break;
                        }
                        console.warn(`[test-bluesminds-key] Attempt ${attempts} failed with status ${lastStatus}. Retrying after delay...`);
                        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
                    }
                } catch (fetchErr: any) {
                    console.warn(`[test-bluesminds-key] Attempt ${attempts} fetch exception:`, fetchErr.message);
                    lastStatus = 500;
                    lastText = fetchErr.message;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            if (success) {
                return res.json({ success: true, message: 'API Key Bluesminds valid!' });
            } else {
                let errorMsg = lastText;
                try {
                    const parsed = JSON.parse(lastText);
                    if (parsed.error && parsed.error.message) {
                        errorMsg = parsed.error.message;
                    }
                } catch (_) {}

                if (lastStatus === 401 || lastStatus === 403 || errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('unauthorized')) {
                    return res.status(400).json({ error: 'API Key Bluesminds tidak valid atau salah. Silakan periksa kembali.' });
                }
                if (lastStatus === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                    return res.json({
                        success: true,
                        quotaExceeded: true,
                        message: 'API Key Bluesminds valid! Namun kuota / limit penggunaan Bluesminds Anda telah habis.'
                    });
                }
                return res.status(400).json({ error: `Gagal verifikasi Bluesminds API (Status ${lastStatus}): ${errorMsg}` });
            }
        } catch (e: any) {
            console.warn('Test Bluesminds API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    });

    app.post('/api/test-aivene-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            
            const testUri = 'https://api.aivene.com/v1/chat/completions';
            const testResponse = await fetch(testUri, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'mimo-v2.5',
                    messages: [{role: 'user', content: 'test'}],
                    stream: false
                })
            });

            const status = testResponse.status;
            const text = await testResponse.text();
            let errorMsg = text;
            try {
                const parsed = JSON.parse(text);
                if (parsed.error && parsed.error.message) {
                    errorMsg = parsed.error.message;
                }
            } catch (_) {}

            if (testResponse.ok) {
                return res.json({ success: true, message: 'API Key Aivene valid!' });
            }

            if (status === 401 || status === 403 || (status === 400 && errorMsg.toLowerCase().includes('invalid')) || errorMsg.toLowerCase().includes('unauthorized')) {
                return res.status(400).json({ error: 'API Key Aivene tidak valid atau salah. Silakan periksa kembali.' });
            }
            
            if (status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                return res.json({
                    success: true,
                    quotaExceeded: true,
                    message: 'API Key Aivene valid! Namun kuota / limit penggunaan Aivene Anda telah habis.'
                });
            }
            
            return res.status(status).json({ error: `Terjadi error dari Aivene (Status: ${status}): ${errorMsg}` });
        } catch (e: any) {
            console.warn('Test Aivene API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    });

    app.post('/api/test-zai-key', async (req, res) => {
        try {
            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key tidak boleh kosong' });
            }
            
            const testUri = 'https://api.z.ai/api/paas/v4/chat/completions';
            const testResponse = await fetch(testUri, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                    'Accept-Language': 'en-US,en'
                },
                body: JSON.stringify({
                    model: 'glm-5.2',
                    messages: [{role: 'user', content: 'hi'}],
                    max_tokens: 5,
                    stream: false,
                    do_sample: false
                })
            });

            const status = testResponse.status;
            const text = await testResponse.text();
            let errorMsg = text;
            try {
                const parsed = JSON.parse(text);
                if (parsed.error && parsed.error.message) {
                    errorMsg = parsed.error.message;
                }
            } catch (_) {}

            if (testResponse.ok) {
                return res.json({ success: true, message: 'API Key Z.AI valid!' });
            }

            if (status === 401 || status === 403 || (status === 400 && errorMsg.toLowerCase().includes('invalid')) || errorMsg.toLowerCase().includes('unauthorized')) {
                return res.status(400).json({ error: 'API Key Z.AI tidak valid atau salah. Silakan periksa kembali.' });
            }
            
            if (status === 429 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('exceeded')) {
                return res.json({
                    success: true,
                    quotaExceeded: true,
                    message: 'API Key Z.AI valid! Namun kuota / limit penggunaan Z.AI Anda telah habis.'
                });
            }
            
            return res.status(status).json({ error: `Terjadi error dari Z.AI (Status: ${status}): ${errorMsg}` });
        } catch (e: any) {
            console.warn('Test Z.AI API Key error exception:', e);
            res.status(500).json({ error: e.message || 'Internal Server Error' });
        }
    });

    const getProviderName = (): string => {
        const store = apiKeyStorage.getStore();
        const provider = (store && store.provider) || 'gemini';
        if (provider === 'groq') return 'Groq';
        if (provider === 'mistral') return 'Mistral';
        if (provider === 'openai') return 'OpenAI';
        if (provider === 'openrouter') return 'OpenRouter';
        if (provider === 'blackbox') return 'Blackbox AI';
        if (provider === 'nvidia') return 'NVIDIA';
        if (provider === 'bluesminds') return 'Bluesminds';
        if (provider === 'aivene') return 'Aivene';
        if (provider === 'zai') return 'Z.AI';
        return 'Gemini';
    };

    app.post('/api/adobe-research', async (req, res) => {
        try {
            const { keyword } = req.body;
            if (!keyword || typeof keyword !== 'string') {
                return res.status(400).json({ error: 'Keyword is required and must be a string' });
            }
            const results = await searchAdobeStockWithBypass(keyword);
            res.json(results);
        } catch (e: any) {
            console.warn('Server /api/adobe-research error:', e);
            res.status(500).json({ error: e.message || 'Error executing Adobe Stock search' });
        }
    });

    app.post('/api/extract-exif', upload.single('file'), async (req, res) => {
        let tempFilePath = "";
        let cleanupFn = () => {};
        try {
            let filePath = "";
            if (req.file) {
                filePath = req.file.path;
                tempFilePath = filePath;
                cleanupFn = () => {
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
                };
            } else if (req.body.fileUrl) {
                const { fileUrl, pathKey, fileType } = req.body;
                const ext = fileType?.includes('png') ? '.png' : fileType?.includes('gif') ? '.gif' : '.jpg';
                const downloadResult = await downloadFileFromStorage(fileUrl, pathKey, ext);
                filePath = downloadResult.localPath;
                tempFilePath = filePath;
                cleanupFn = downloadResult.cleanup;
            } else {
                return res.status(400).json({ error: 'No file uploaded or fileUrl provided' });
            }

            console.log(`[ExifTool API] Extracting metadata from: ${filePath}`);
            const exifData: any = {};
            try {
              const { stdout } = await require('util').promisify(require('child_process').exec)(
                `magick identify -verbose "${filePath}" 2>/dev/null`,
                { timeout: 15000, maxBuffer: 1024 * 1024 }
              );
              // Parse ImageMagick verbose output for key EXIF fields
              for (const line of stdout.split('\n')) {
                const trimmed = line.trim();
                const colonIdx = trimmed.indexOf(':');
                if (colonIdx > 0 && colonIdx < 40) {
                  const key = trimmed.substring(0, colonIdx).trim();
                  const value = trimmed.substring(colonIdx + 1).trim();
                  if (key && value && !key.startsWith('  ')) {
                    exifData[key] = value;
                  }
                }
              }
            } catch (magickErr: any) {
              console.warn('[ExifTool API] ImageMagick EXIF extraction fallback failed:', magickErr.message);
            }
            
            // Clean up noisy tags to save tokens
            delete exifData.Directory;
            delete exifData.SourceFile;
            delete exifData.FileName;
            delete exifData.FileAccessDate;
            delete exifData.FileModifyDate;
            delete exifData.FileInodeChangeDate;
            delete exifData.FilePermissions;

            res.json({ success: true, metadata: exifData });
        } catch (e: any) {
            console.warn('[ExifTool API] Error extracting EXIF:', e);
            res.status(500).json({ error: e.message || 'Error extracting EXIF' });
        } finally {
            cleanupFn();
        }
    });

    app.post('/api/generate-metadata', async (req, res) => {
        try {
            const { frames, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance, exifMetadata } = req.body;
            if (!frames || !Array.isArray(frames)) {
                return res.status(400).json({ error: 'Missing or invalid frames' });
            }
            const temperatureVal = temperature !== undefined ? parseFloat(String(temperature)) : undefined;
            const metadata = await generateStockMetadata(frames, keywordCount, customPrompt, toolType, temperatureVal, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance, exifMetadata);
            res.json(metadata);
        } catch (e: any) {
            console.warn('Server generate-metadata error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating metadata' });
            }
        }
    });

    app.post('/api/generate-batch-metadata', async (req, res) => {
        try {
            const { items, keywordCount, customPrompt, toolType, temperature, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance } = req.body;
            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Missing or invalid items' });
            }
            const temperatureVal = temperature !== undefined ? parseFloat(String(temperature)) : undefined;
            const batchMetadata = await generateBatchStockMetadata(items, keywordCount, customPrompt, toolType, temperatureVal, model, keywordMode, titleLength, metadataLanguage, aiModelPerformance);
            res.json(batchMetadata);
        } catch (e: any) {
            console.warn('Server generate-batch-metadata error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating batch metadata' });
            }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // EMBED METADATA ENGINE: Full Adobe Stock / IPTC / XMP-dc / Microstock Standard
    // ═══════════════════════════════════════════════════════════
    async function embedMetadataForAdobe(filePath: string, metadata: { title: string; description?: string; keywords: string[] | string }) {
        const rawKeywords = Array.isArray(metadata.keywords)
            ? metadata.keywords
            : (typeof metadata.keywords === 'string' ? metadata.keywords.split(',') : []);
        
        const cleanKeywords = (rawKeywords || [])
            .flatMap(k => String(k).split(','))
            .map(k => String(k).trim().replace(/^["']|["']$/g, ''))
            .filter(k => k.length > 0);
        const uniqueKeywords = Array.from(new Set(cleanKeywords));
        const keywordString = uniqueKeywords.join(', ');
        const title = String(metadata.title || '').trim();
        const description = String(metadata.description || title).trim();

        const ext = (path.extname(filePath) || '').toLowerCase();
        const isVideo = ['.mp4', '.mov', '.webm', '.m4v', '.avi'].includes(ext);

        // 1. Native SVG XML Dublin Core Injection for SVG files
        if (ext === '.svg') {
            try {
                let svgContent = fs.readFileSync(filePath, 'utf8');
                const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, (c) => {
                    switch (c) {
                        case '<': return '&lt;';
                        case '>': return '&gt;';
                        case '&': return '&amp;';
                        case '\'': return '&apos;';
                        case '"': return '&quot;';
                        default: return c;
                    }
                });

                const titleTag = `<title>${escapeXml(title)}</title>`;
                const descTag = `<desc>${escapeXml(description)}</desc>`;
                const keywordsXml = uniqueKeywords.map(k => `<rdf:li>${escapeXml(k)}</rdf:li>`).join('');
                const metadataTag = `<metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:Description><dc:title>${escapeXml(title)}</dc:title><dc:description>${escapeXml(description)}</dc:description><dc:subject><rdf:Bag>${keywordsXml}</rdf:Bag></dc:subject><dc:format>image/svg+xml</dc:format></rdf:Description></rdf:RDF></metadata>`;

                svgContent = svgContent
                    .replace(/<title[\s\S]*?<\/title>/gi, '')
                    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
                    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '');

                if (/<svg[^>]*>/i.test(svgContent)) {
                    svgContent = svgContent.replace(/(<svg[^>]*>)/i, `$1\n  ${titleTag}\n  ${descTag}\n  ${metadataTag}`);
                    fs.writeFileSync(filePath, svgContent, 'utf8');
                }
            } catch (svgErr) {
                console.warn('[embedMetadataForAdobe] SVG injection note:', svgErr);
            }
        }

        // 2. Native EPS / AI Header injection for PostScript vector files
        if (ext === '.eps' || ext === '.ai') {
            try {
                let epsContent = fs.readFileSync(filePath, 'binary');
                if (epsContent.includes('%!PS-Adobe')) {
                    epsContent = epsContent.replace(/^%%Title:.*$/gm, '').replace(/^%%Keywords:.*$/gm, '');
                    const dscTags = `%%Title: ${title.replace(/[\r\n]/g, ' ')}\n%%Keywords: ${keywordString.replace(/[\r\n]/g, ' ')}`;
                    epsContent = epsContent.replace(/(%!PS-Adobe[^\r\n]*)/, `$1\n${dscTags}`);
                    fs.writeFileSync(filePath, epsContent, 'binary');
                }
            } catch (epsErr) {
                console.warn('[embedMetadataForAdobe] EPS injection note:', epsErr);
            }
        }

        // 3. ExifTool Writing: Full Dublin Core XMP, IPTC Core, Photoshop, EXIF, QuickTime
        const metadataTags: any = {
            // Dublin Core (XMP-dc) - Adobe Stock Primary Recognition
            'XMP-dc:Title': title,
            'XMP-dc:Description': description,
            'XMP-dc:Subject': uniqueKeywords,
            'XMP:Title': title,
            'XMP:Description': description,
            'XMP:Subject': uniqueKeywords,
            'XMP:Headline': title,

            // IPTC Core - Universal Microstock Standard (Shutterstock, 123RF, DepositPhotos, Freepik)
            'IPTC:ObjectName': title,
            'IPTC:Headline': title,
            'IPTC:Caption-Abstract': description,
            'IPTC:Keywords': uniqueKeywords,
            'IPTC:CodedCharacterSet': 'UTF8',

            // Photoshop & Standard Tags (Adobe Stock & Windows/Mac OS)
            'XMP-photoshop:Headline': title,
            'XMP-photoshop:Caption': description,
            Title: title,
            Headline: title,
            ObjectName: title,
            Description: description,
            'Caption-Abstract': description,
            ImageDescription: title,
            Subject: uniqueKeywords,
            Keywords: uniqueKeywords,
            XPTitle: title,
            XPComment: description,
            XPKeywords: uniqueKeywords.join('; '),
            XPSubject: title,
            Software: 'MetaZo AI Assistant'
        };

        if (isVideo) {
            metadataTags['QuickTime:Title'] = title;
            metadataTags['QuickTime:Description'] = description;
            metadataTags['QuickTime:Keywords'] = uniqueKeywords;
            metadataTags['ItemList:Title'] = title;
            metadataTags['ItemList:Description'] = description;
            metadataTags['ItemList:Keyword'] = uniqueKeywords;
            metadataTags['UserData:Description'] = description;
            metadataTags['UserData:Keywords'] = uniqueKeywords;
            metadataTags['Keys:DisplayName'] = title;
            metadataTags['Keys:Title'] = title;
            metadataTags['Keys:Description'] = description;
            metadataTags['Keys:Keywords'] = uniqueKeywords;
        }

        try {
            const { exiftool } = await import('exiftool-vendored');
            await Promise.race([
                exiftool.write(filePath, metadataTags, [
                    '-overwrite_original',
                    '-ignoreMinorErrors',
                    '-charset', 'iptc=utf8',
                    '-charset', 'exif=utf8',
                    '-codedcharacterset=utf8',
                    '-sep', ', ',
                    '-m'
                ]),
                new Promise((_, rej) => setTimeout(() => rej(new Error('ExifTool write timeout')), 25000))
            ]);
            console.log(`[embedMetadataForAdobe] ExifTool successfully embedded metadata into: ${filePath}`);
            return filePath;
        } catch (exifErr: any) {
            console.warn(`[embedMetadataForAdobe] ExifTool vendored error: ${exifErr?.message}. Trying CLI fallback...`);
        }

        // 4. CLI ExifTool Fallback with spawn (avoids Windows command-line quoting issues)
        return new Promise<string>((resolve) => {
            const args = [
                '-overwrite_original',
                '-m',
                '-charset', 'iptc=utf8',
                '-charset', 'exif=utf8',
                '-codedcharacterset=utf8',
                '-sep', ', ',
                `-XMP-dc:Title=${title}`,
                `-XMP-dc:Description=${description}`,
                `-XMP-dc:Subject=${keywordString}`,
                `-XMP:Title=${title}`,
                `-XMP:Description=${description}`,
                `-XMP:Subject=${keywordString}`,
                `-IPTC:ObjectName=${title}`,
                `-IPTC:Headline=${title}`,
                `-IPTC:Caption-Abstract=${description}`,
                `-IPTC:Keywords=${keywordString}`,
                `-Title=${title}`,
                `-Headline=${title}`,
                `-ObjectName=${title}`,
                `-Description=${description}`,
                `-Caption-Abstract=${description}`,
                `-ImageDescription=${title}`,
                `-Subject=${keywordString}`,
                `-Keywords=${keywordString}`,
                `-XPTitle=${title}`,
                `-XPComment=${description}`,
                `-XPKeywords=${keywordString}`,
                filePath
            ];

            const child = spawn('exiftool', args, { stdio: ['ignore', 'pipe', 'pipe'] });
            let hasResolved = false;

            const timer = setTimeout(() => {
                if (!hasResolved) {
                    hasResolved = true;
                    try { child.kill(); } catch (_) {}
                    resolve(filePath);
                }
            }, 20000);

            child.on('close', (code) => {
                if (!hasResolved) {
                    hasResolved = true;
                    clearTimeout(timer);
                    console.log(`[embedMetadataForAdobe] CLI ExifTool finished with code: ${code}`);
                    resolve(filePath);
                }
            });

            child.on('error', (err) => {
                if (!hasResolved) {
                    hasResolved = true;
                    clearTimeout(timer);
                    console.warn(`[embedMetadataForAdobe] CLI ExifTool error: ${err.message}`);
                    resolve(filePath);
                }
            });
        });
    }

    app.post('/api/embed-metadata', upload.single('file'), async (req, res) => {
        let localInputPath = '';
        let localOutputPath = '';
        let cleanupLocal = () => {};

        try {
            let originalName = '';
            let contentType = 'image/jpeg';

            // Step 1: Receive file — from R2 or direct multipart upload
            if (req.body.fileUrl && req.body.pathKey) {
                const ext = path.extname(req.body.pathKey) || '.jpg';
                originalName = path.basename(req.body.pathKey);
                contentType = req.body.contentType || 'image/jpeg';
                console.log(`[Embed Metadata] Downloading from R2: ${req.body.pathKey}`);
                const result = await downloadFileFromStorage(req.body.fileUrl, req.body.pathKey, ext);
                localInputPath = result.localPath;
                cleanupLocal = result.cleanup;
            } else if (req.file) {
                localInputPath = req.file.path;
                originalName = req.file.originalname || 'image.jpg';
                contentType = req.file.mimetype || 'image/jpeg';

                const ext = path.extname(originalName) || '.jpg';
                const fixedPath = `${localInputPath}${ext}`;
                try {
                    fs.renameSync(localInputPath, fixedPath);
                    localInputPath = fixedPath;
                } catch (_) {}

                cleanupLocal = () => {
                    try { if (fs.existsSync(localInputPath)) fs.unlinkSync(localInputPath); } catch(e) {}
                    try { if (fs.existsSync(localOutputPath)) fs.unlinkSync(localOutputPath); } catch(e) {}
                    try { if (fs.existsSync(`${localInputPath}_original`)) fs.unlinkSync(`${localInputPath}_original`); } catch(e) {}
                };
            } else {
                return res.status(400).json({ error: 'File tidak ditemukan. Unggah file langsung atau berikan fileUrl + pathKey (R2).' });
            }

            // Step 2: Extract & Clean Title, Description, Keywords
            const title = String(req.body.title || '').trim();
            const description = String(req.body.description || title).trim();
            let keywords: string[] = [];

            if (req.body.keywords) {
                try {
                    const raw = typeof req.body.keywords === 'string' && req.body.keywords.startsWith('[')
                        ? JSON.parse(req.body.keywords)
                        : req.body.keywords;
                    if (Array.isArray(raw)) {
                        keywords = raw.flatMap((k: any) => String(k).split(','));
                    } else if (typeof raw === 'string') {
                        keywords = raw.split(',');
                    }
                } catch (_) {
                    keywords = String(req.body.keywords).split(',');
                }
            }

            keywords = (keywords || [])
                .map((k: string) => String(k).trim().replace(/^["']|["']$/g, ''))
                .filter((k: string) => k.length > 0);
            const uniqueKeywords = Array.from(new Set(keywords));

            console.log(`[Embed Metadata] Embedding: Title="${title}", Keywords=${uniqueKeywords.length}, File="${originalName}"`);

            // Step 3: Embed metadata into file using complete Adobe Stock / IPTC / XMP engine
            localOutputPath = localInputPath;
            await embedMetadataForAdobe(localOutputPath, {
                title,
                description,
                keywords: uniqueKeywords
            });

            // Step 4: Handle download response (R2 upload if pathKey provided, otherwise direct stream)
            const embeddedName = `embedded_${originalName}`;
            if (isR2Configured() && req.body.pathKey) {
                console.log(`[Embed Metadata] Uploading embedded file to R2: ${embeddedName}`);
                const { fileUrl: r2Url } = await uploadFileToStorage(localOutputPath, embeddedName, contentType);
                cleanupLocal();
                return res.json({
                    success: true,
                    downloadUrl: r2Url,
                    fileName: embeddedName,
                    metadata: { title, description, keywords: uniqueKeywords }
                });
            }

            // Direct download stream
            res.download(localOutputPath, originalName, (err) => {
                cleanupLocal();
                if (err) console.error('[Embed Metadata] Send error:', err);
            });
        } catch (e: any) {
            console.error('[Embed Metadata] Pipeline error:', e);
            cleanupLocal();
            res.status(500).json({ error: e.message || 'Gagal dalam pipeline Embed Metadata.' });
        }
    });

    app.post('/api/generate-prompt', async (req, res) => {
        try {
            const { subject, styleCategory, variation, promptMode, pngBgColor, userNegativePrompt, minWords, maxWords, model, seed, flatIconType, vectorSubType, darkHorrorSubStyle, referenceImages, cameraAngles } = req.body;
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
                maxWords,
                model,
                seed: typeof seed === 'number' ? seed : undefined,
                flatIconType,
                vectorSubType,
                darkHorrorSubStyle,
                referenceImages,
                cameraAngles
            });
            res.json(promptData);
        } catch (e: any) {
            console.warn('Server generate-prompt error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating optimized prompt' });
            }
        }
    });

    app.post('/api/auto-subject', async (req, res) => {
        try {
            const { styleCategory, currentSubject, model, promptMode } = req.body;
            console.log('[API /api/auto-subject] styleCategory:', styleCategory, 'currentSubject:', currentSubject, 'promptMode:', promptMode);
            
            const text = await generateAutoSubject(styleCategory, model, currentSubject, promptMode);
            res.json({ subject: text });
        } catch (e: any) {
            console.warn('Error in auto-subject:', e);
            res.status(500).json({ error: e.message || 'Failed to generate subject idea' });
        }
    });

    app.post('/api/analyze-image-to-prompt', async (req, res) => {
        try {
            const { image, styleCategory, variation, model } = req.body;
            if (!image) {
                return res.status(400).json({ error: 'Missing image data' });
            }
            const data = await analyzeImageToPrompt(image, styleCategory || 'Default', variation || 5, model);
            res.json(data);
        } catch (e: any) {
            console.warn('Server analyze-image-to-prompt error:', e);
            res.status(500).json({ error: e.message || 'Error analyzing image to prompt' });
        }
    });

    app.post('/api/analyze-batch-image-to-prompt', async (req, res) => {
        try {
            const { images, styleCategory, variation, model } = req.body;
            if (!images || !Array.isArray(images) || images.length === 0) {
                return res.status(400).json({ error: 'Missing or invalid images array' });
            }
            const data = await analyzeBatchImageToPrompt(images, styleCategory || 'Default', variation || 5, model);
            res.json(data);
        } catch (e: any) {
            console.warn('Server analyze-batch-image-to-prompt error:', e);
            res.status(500).json({ error: e.message || 'Error analyzing batch images to prompt' });
        }
    });

    app.post('/api/analyze-video-keyword', async (req, res) => {
        try {
            const { keyword, model } = req.body;
            if (!keyword || typeof keyword !== 'string') {
                return res.status(400).json({ error: 'Keyword is required and must be a string' });
            }
            const data = await analyzeVideoKeyword(keyword.trim(), model);
            res.json(data);
        } catch (e: any) {
            console.warn('Server /api/analyze-video-keyword error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error analyzing video keyword' });
            }
        }
    });

    app.post('/api/generate-hollywood-prompts', async (req, res) => {
        try {
            const { keyword, model } = req.body;
            if (!keyword || typeof keyword !== 'string') {
                return res.status(400).json({ error: 'Keyword is required and must be a string' });
            }
            const data = await generateHollywoodPrompts(keyword.trim(), model);
            res.json(data);
        } catch (e: any) {
            console.warn('Server /api/generate-hollywood-prompts error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating Hollywood prompts' });
            }
        }
    });

    app.post('/api/generate-motion-code', async (req, res) => {
        try {
            const { prompt, currentCode, fps, durationSeconds, width, height, history, model } = req.body;
            if (!prompt || typeof prompt !== 'string') {
                return res.status(400).json({ error: 'Prompt is required' });
            }
            const data = await generateMotionCode(prompt.trim(), {
                currentCode,
                fps,
                durationSeconds,
                width,
                height,
                history,
                model
            });
            res.json(data);
        } catch (e: any) {
            console.warn('Server /api/generate-motion-code error:', e);
            if (e.message?.includes('429') || e.status === 429 || e.code === 429) {
                res.status(429).json({ error: `Kuota ${getProviderName()} API terbatas. Silakan coba lagi nanti.` });
            } else {
                res.status(500).json({ error: e.message || 'Error generating motion graphic code' });
            }
        }
    });

    app.post('/api/mute-video', upload.single('video'), async (req, res) => {
        let tempInputPath: string | null = null;
        let tempOutputPath: string | null = null;

        try {
            if (!ffmpeg) {
                return res.status(500).json({ error: 'ffmpeg is not initialized on the server.' });
            }

            if (req.file) {
                tempInputPath = req.file.path;
                const ext = path.extname(req.file.originalname || '.mp4') || '.mp4';
                tempOutputPath = path.join(uploadDir, `muted_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);

                await new Promise<void>((resolve, reject) => {
                    ffmpeg(tempInputPath)
                        .noAudio()
                        .videoCodec('copy')
                        .output(tempOutputPath)
                        .on('end', () => resolve())
                        .on('error', (err: any) => reject(err))
                        .run();
                });

                res.download(tempOutputPath, `muted_${req.file.originalname}`, (err) => {
                    if (tempInputPath && fs.existsSync(tempInputPath)) {
                        try { fs.unlinkSync(tempInputPath); } catch (_) {}
                    }
                    if (tempOutputPath && fs.existsSync(tempOutputPath)) {
                        try { fs.unlinkSync(tempOutputPath); } catch (_) {}
                    }
                });
            } else if (req.body && req.body.fileUrl) {
                const fileUrl = req.body.fileUrl;
                const ext = path.extname(new URL(fileUrl).pathname) || '.mp4';
                tempInputPath = path.join(uploadDir, `input_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
                tempOutputPath = path.join(uploadDir, `muted_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);

                const fileRes = await fetch(fileUrl);
                if (!fileRes.ok) throw new Error(`Failed to fetch source video from ${fileUrl}`);
                const fileBuf = Buffer.from(await fileRes.arrayBuffer());
                fs.writeFileSync(tempInputPath, fileBuf);

                await new Promise<void>((resolve, reject) => {
                    ffmpeg(tempInputPath)
                        .noAudio()
                        .videoCodec('copy')
                        .output(tempOutputPath)
                        .on('end', () => resolve())
                        .on('error', (err: any) => reject(err))
                        .run();
                });

                res.download(tempOutputPath, `muted_video${ext}`, (err) => {
                    if (tempInputPath && fs.existsSync(tempInputPath)) {
                        try { fs.unlinkSync(tempInputPath); } catch (_) {}
                    }
                    if (tempOutputPath && fs.existsSync(tempOutputPath)) {
                        try { fs.unlinkSync(tempOutputPath); } catch (_) {}
                    }
                });
            } else {
                return res.status(400).json({ error: 'No video file or fileUrl provided' });
            }
        } catch (e: any) {
            console.warn('Server /api/mute-video error:', e);
            if (tempInputPath && fs.existsSync(tempInputPath)) {
                try { fs.unlinkSync(tempInputPath); } catch (_) {}
            }
            if (tempOutputPath && fs.existsSync(tempOutputPath)) {
                try { fs.unlinkSync(tempOutputPath); } catch (_) {}
            }
            res.status(500).json({ error: e.message || 'Failed to mute video' });
        }
    });

    const handleCalendarEventsRequest = async (req: any, res: any) => {
        try {
            const month = req.body?.month || req.query?.month || new Date().toLocaleString('en-US', { month: 'long' });
            const model = req.body?.model || req.query?.model;
            const data = await generateCalendarEvents(month, model);
            res.json(data);
        } catch (e: any) {
            console.warn('Server generate-calendar-events error:', e);
            res.status(500).json({ error: e.message || 'Error generating calendar events' });
        }
    };

    app.post('/api/generate-calendar-events', handleCalendarEventsRequest);
    app.get('/api/generate-calendar-events', handleCalendarEventsRequest);
    app.post('/api/calendar-events', handleCalendarEventsRequest);
    app.get('/api/calendar-events', handleCalendarEventsRequest);

    const handleEventKeywordsRequest = async (req: any, res: any) => {
        try {
            const eventName = req.body?.eventName || req.query?.eventName;
            const eventDetails = req.body?.eventDetails || req.query?.eventDetails || '';
            const model = req.body?.model || req.query?.model;
            if (!eventName) {
                return res.status(400).json({ error: 'Missing eventName parameter' });
            }
            const data = await generateEventKeywords(eventName, eventDetails, model);
            res.json(data);
        } catch (e: any) {
            console.warn('Server generate-event-keywords error:', e);
            res.status(500).json({ error: e.message || 'Error generating event keywords' });
        }
    };

    app.post('/api/generate-event-keywords', handleEventKeywordsRequest);
    app.get('/api/generate-event-keywords', handleEventKeywordsRequest);
    app.post('/api/event-keywords', handleEventKeywordsRequest);
    app.get('/api/event-keywords', handleEventKeywordsRequest);

    app.post('/api/check-image-quality', upload.single('image'), async (req, res) => {
        try {
            let imagePayload: any;
            let fileType: string | undefined = req.body.fileType;
            let metadata: any = undefined;

            if (req.file) {
                const buffer = fs.readFileSync(req.file.path);
                const mime = req.file.mimetype || 'image/jpeg';
                imagePayload = `data:${mime};base64,${buffer.toString('base64')}`;
                fileType = fileType || mime;
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            } else if (req.body.image) {
                imagePayload = req.body.image;
            } else if (req.body.fileUrl) {
                imagePayload = req.body.fileUrl;
            }

            if (!imagePayload) {
                return res.status(400).json({ error: 'No image data provided for quality check' });
            }

            if (req.body.metadata) {
                try {
                    metadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
                } catch (_) {}
            }

            const { tolerance, language, model } = req.body;
            const result = await checkImageQuality(imagePayload, tolerance || 'MEDIUM', language || 'Bahasa', model, fileType, metadata);
            res.json(result);
        } catch (e: any) {
            console.warn('Server check-image-quality error:', e);
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            res.status(500).json({ error: e.message || 'Error checking image quality' });
        }
    });

    app.post('/api/check-video-quality', upload.single('video'), async (req, res) => {
        try {
            const { tolerance, language, model, frames } = req.body;
            if (frames && Array.isArray(frames) && frames.length > 0) {
                const data = await checkVideoQuality(frames, tolerance || 'MEDIUM', language || 'Bahasa', model);
                return res.json(data);
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No video uploaded' });
            }
            const videoPath = req.file.path;
            
            if (!ffmpeg) {
                return res.status(500).json({ error: 'ffmpeg is not initialized on the server.' });
            }

            const outDir = path.join(uploadDir, `frames_${Date.now()}_${Math.random().toString(36).substring(7)}`);
            fs.mkdirSync(outDir, { recursive: true });

            const extractedFrames = await new Promise<string[]>((resolve, reject) => {
                ffmpeg(videoPath)
                  .screenshots({
                      count: 3,
                      folder: outDir,
                      size: '1280x720',
                      filename: 'frame-%i.jpg'
                  })
                  .on('end', () => {
                      try {
                          const f1 = fs.readFileSync(path.join(outDir, 'frame-1.jpg'), 'base64');
                          const f2 = fs.readFileSync(path.join(outDir, 'frame-2.jpg'), 'base64');
                          const f3 = fs.readFileSync(path.join(outDir, 'frame-3.jpg'), 'base64');
                          try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (_) {}
                          resolve([
                            `data:image/jpeg;base64,${f1}`,
                            `data:image/jpeg;base64,${f2}`,
                            `data:image/jpeg;base64,${f3}`
                          ]);
                      } catch(e) {
                          reject(e);
                      }
                  })
                  .on('error', (err: any) => {
                      reject(err);
                  });
            });

            const data = await checkVideoQuality(extractedFrames, tolerance || 'MEDIUM', language || 'Bahasa', model);
            
            try { fs.unlinkSync(videoPath); } catch (_) {}

            res.json(data);
        } catch (e: any) {
            console.warn('Server check-video-quality error:', e);
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            res.status(500).json({ error: e.message || 'Error checking video quality' });
        }
    });

    app.post('/api/smart-suggest-keywords', async (req, res) => {
        try {
            const { title, description, existingKeywords, requestCount, model } = req.body;
            if (!title) {
                return res.status(400).json({ error: 'Missing title field or asset context' });
            }
            const data = await suggestKeywords(title, description || '', existingKeywords || [], requestCount, model);
            res.json({ keywords: data });
        } catch (e: any) {
            console.warn('Server smart-suggest-keywords error:', e);
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
                { text: "Graphic Design template for a Summer Sale, featuring a large empty circular copy space in the center, vibrant neon pink and orange abstract geometric waves, floating 3D spheres, sleek borders, and a minimal frame, perfect for social media advertisement.", label: "Promo Template 📣" },
                { text: "Graphic Design template for a celebratory event, featuring a vast clean minimalist blue and white background with a clear visual hierarchy, festive floating ribbons, colorful balloons, gold confetti, and elegant borders, ideal for a banner or poster.", label: "Festive Template 🎉" },
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

    app.post('/api/pakasir/create-payment', async (req, res) => {
        try {
            const { projectSlug, apiKey, orderId, amount, redirectUrl } = req.body;
            if (!projectSlug || !apiKey || !orderId || !amount) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            const pakasir = new PakasirClient({
                project: projectSlug,
                apiKey: apiKey
            });

            const payment = await pakasir.createPaymentWithQRAndURL(orderId, Number(amount), {
                qrOptions: { size: 400 },
                urlOptions: { redirect: redirectUrl || 'https://pakasir.com' }
            });

            res.json({
                success: true,
                paymentUrl: payment.paymentUrl,
                dataUrl: payment.dataUrl,
                paymentNumber: payment.paymentNumber
            });
        } catch (error: any) {
            console.error('Pakasir error:', error);
            res.status(500).json({ error: error.message || 'Failed to create Pakasir payment' });
        }
    });

    app.post('/api/pakasir/check-status', async (req, res) => {
        try {
            const { projectSlug, apiKey, orderId, amount } = req.body;
            if (!projectSlug || !apiKey || !orderId || !amount) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }
            const pakasir = new PakasirClient({
                project: projectSlug,
                apiKey: apiKey
            });
            const status = await pakasir.checkTransactionStatus(orderId, Number(amount));
            res.json({
                success: true,
                status: (status as any).transaction ? (status as any).transaction.status : (status as any).status
            });
        } catch (error: any) {
            console.error('Pakasir status error:', error);
            res.status(500).json({ error: error.message || 'Failed to check Pakasir status' });
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

    // =========== START VECTOR LARGE FILE STORAGE UPLOAD ENDPOINTS ===========

    // Lazy S3/R2 client — only created when credentials are actually present.
    // This prevents a crash on startup when the env vars are not yet set.
    function isR2Configured() {
        return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME);
    }

    let _s3ClientInstance: S3Client | null = null;
    function getS3Client(): S3Client {
        if (!isR2Configured()) throw new Error('Cloudflare R2 is not configured in environment variables.');
        if (!_s3ClientInstance) {
            _s3ClientInstance = new S3Client({
                region: 'auto',
                endpoint: process.env.S3_ENDPOINT!,
                credentials: {
                    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
                },
                forcePathStyle: true,
            });
        }
        return _s3ClientInstance;
    }

    // Convenience alias kept for backwards-compat with existing usages below
    const s3Client = { send: (cmd: any) => getS3Client().send(cmd) };

    async function downloadFileFromStorage(fileUrl: string, pathKey?: string, extension: string = '.mp4'): Promise<{ localPath: string; cleanup: () => void }> {
        const uniqueTmpDir = path.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(uniqueTmpDir, { recursive: true });
        const localPath = path.join(uniqueTmpDir, `downloaded${extension}`);
        
        const fileStream = fs.createWriteStream(localPath);
        const { finished } = await import('stream/promises');

        if (pathKey && isR2Configured() && process.env.S3_BUCKET_NAME) {
            console.log(`[Storage] Downloading from S3 with key ${pathKey}...`);
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: pathKey
            });
            const response = await getS3Client().send(command);
            const stream = response.Body as any;
            stream.pipe(fileStream);
            await finished(fileStream);
        } else {
            console.log(`[Storage] Downloading from public URL ${fileUrl}...`);
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
        }

        const cleanup = () => {
            try {
                if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                if (fs.existsSync(uniqueTmpDir)) fs.rmSync(uniqueTmpDir, { recursive: true, force: true });
            } catch (e) {
                console.warn('[Storage] Cleanup error:', e);
            }
        };

        return { localPath, cleanup };
    }

    const uploadFileToStorage = async (localPath: string, originalName: string, contentType: string): Promise<{ fileUrl: string; pathKey: string }> => {
        if (!isR2Configured()) throw new Error('Cloudflare R2 is not configured.');
        
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueFilename = `video-muted/${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}`;
        const bucketName = process.env.S3_BUCKET_NAME!;

        const fileBuffer = fs.readFileSync(localPath);
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: uniqueFilename,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await getS3Client().send(command);

        let publicUrl = '';
        if (process.env.S3_PUBLIC_URL) {
            publicUrl = `${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/${uniqueFilename}`;
        } else {
            publicUrl = `${process.env.S3_ENDPOINT!.replace(/\/$/, '')}/${bucketName}/${uniqueFilename}`;
        }

        return { fileUrl: publicUrl, pathKey: uniqueFilename };
    };

    // Endpoint for the frontend to check if R2 is configured (no credentials exposed)
    app.get('/api/r2-status', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json({
            configured: isR2Configured(),
            bucketName: isR2Configured() ? process.env.S3_BUCKET_NAME : null,
            publicUrl: process.env.S3_PUBLIC_URL || null,
        });
    });

    app.get('/api/provider-status', (req, res) => {
        res.json({
            gemini: !!process.env.GEMINI_API_KEY,
            groq: !!process.env.GROQ_API_KEY,
            mistral: !!process.env.MISTRAL_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            openrouter: !!process.env.OPENROUTER_API_KEY,
            nvidia: !!process.env.NVIDIA_API_KEY,
            blackbox: !!process.env.BLACKBOX_API_KEY,
            bluesminds: !!process.env.BLUESMINDS_API_KEY
        });
    });

    app.post('/api/upload-vercel-blob', throttleMiddleware, async (req, res) => {
        try {
            const { handleUpload } = await import('@vercel/blob/client');
            const body = req.body;
            const jsonResponse = await handleUpload({
                body,
                request: req,
                token: process.env.BLOB_READ_WRITE_TOKEN,
                onBeforeGenerateToken: async (pathname) => {
                    return {
                        tokenPayload: JSON.stringify({}),
                    };
                },
                onUploadCompleted: async ({ blob }) => {
                    console.log('Blob upload completed', blob.url);
                },
            });
            res.status(200).json(jsonResponse);
        } catch (error: any) {
            console.error('API /upload-vercel-blob error:', error);
            res.status(400).json({ error: error.message });
        }
    });

    app.get('/api/get-upload-url', async (req, res) => {
        try {
            const { filename, contentType } = req.query;
            if (!filename) return res.status(400).json({ error: 'Filename is required' });
            
            if (!isR2Configured()) {
                return res.status(503).json({ error: 'S3/R2 Storage is not configured in environment variables. Add S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET_NAME to your .env / Vercel project settings.' });
            }

            const sanitizedName = filename.toString().replace(/[^a-zA-Z0-9._-]/g, '_');
            const resolvedContentType = contentType ? String(contentType) : 'application/postscript';
            const folder = resolvedContentType.startsWith('video/') ? 'metazostorage/Video' : 'eps-uploads';
            const uniqueFilename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}`;
            const bucketName = process.env.S3_BUCKET_NAME!;

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: uniqueFilename,
                ContentType: resolvedContentType,
            });

            const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
            let publicUrl = '';
            
            if (process.env.S3_PUBLIC_URL) {
                publicUrl = `${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/${uniqueFilename}`;
            } else {
                publicUrl = `${process.env.S3_ENDPOINT!.replace(/\/$/, '')}/${bucketName}/${uniqueFilename}`;
            }

            res.json({ uploadUrl, fileUrl: publicUrl, pathKey: uniqueFilename, contentType: resolvedContentType });
        } catch (error: any) {
            console.error('Error generating upload URL:', error);
            res.status(500).json({ error: 'Failed to generate upload URL', details: error.message });
        }
    });

    app.post('/api/convert-eps', throttleMiddleware, async (req, res) => {
        const { fileUrl, pathKey } = req.body;
        if (!fileUrl) {
            return res.status(400).json({ error: 'fileUrl is required' });
        }

        const uniqueTmpDir = path.join(uploadDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
        const inputPath = path.join(uniqueTmpDir, 'downloaded.eps');
        const outputPath = `${inputPath}.jpg`;

        try {
            fs.mkdirSync(uniqueTmpDir, { recursive: true });
            
            const { finished } = await import('stream/promises');
            const fileStream = fs.createWriteStream(inputPath);

            if (pathKey && process.env.S3_BUCKET_NAME) {
                console.log(`Downloading EPS from S3 with key ${pathKey}...`);
                const command = new GetObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: pathKey
                });
                const s3Response = await s3Client.send(command) as any;
                if (!s3Response.Body) throw new Error("No response body from S3 storage");
                
                // Stream using Node.js stream pipeline
                // @ts-ignore - S3 Body is a Readable stream in Node
                for await (const chunk of s3Response.Body) {
                    if (!fileStream.write(chunk)) {
                        await new Promise(resolve => fileStream.once('drain', () => resolve(null)));
                    }
                }
                fileStream.end();
                await finished(fileStream);
                console.log(`Downloaded EPS to ${inputPath} via S3 stream`);
            } else {
                console.log(`Downloading EPS from ${fileUrl}...`);
                const fetchRes = await fetch(fileUrl);
                if (!fetchRes.ok) {
                    throw new Error(`Failed to fetch file: ${fetchRes.status}`);
                }
                
                // Stream the file directly to disk to avoid Out of Memory errors
                if (fetchRes.body) {
                    // @ts-ignore - fetchRes.body is async iterable in Node 18+
                    for await (const chunk of fetchRes.body) {
                        if (!fileStream.write(chunk)) {
                            await new Promise(resolve => fileStream.once('drain', () => resolve(null)));
                        }
                    }
                    fileStream.end();
                    await finished(fileStream);
                    console.log(`Downloaded EPS to ${inputPath} via async fetch stream`);
                } else {
                    throw new Error("No response body from storage");
                }
            }

            // TRICK: Use internal memory limits for GS to avoid OOM
            const gsArgs = [
                '-dSAFER', '-dBATCH', '-dNOPAUSE', 
                '-dEPSFitPage', '-dPDFFitPage', '-dDEVICEWIDTHPOINTS=768', '-dDEVICEHEIGHTPOINTS=768', 
                '-dTextAlphaBits=2', '-dGraphicsAlphaBits=2',
                '-dJPEGQ=85',
                '-sDEVICE=jpeg', `-sOutputFile=${outputPath}`,
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
                timeout: 30000, 
                env: { ...process.env, TMPDIR: uniqueTmpDir } 
            };

            // Remove fallback logic
            await gsQueue.enqueue(async () => {
                await spawnAsync(gsExecutable, gsArgs, spawnOptions);
            });

            try {
                const stats = await fs.promises.stat(outputPath);
                if (stats.size === 0) {
                    throw new Error('Generated JPEG is 0 bytes');
                }
            } catch (statErr) {
                throw new Error('Generated JPEG not found or empty');
            }

            await new Promise<void>((resolve, reject) => {
                res.sendFile(outputPath, (err) => {
                    if (err) {
                        console.error('Error saat mengirimkan file JPEG:', err);
                        if (!res.headersSent) res.status(500).json({ error: 'Failed to send file' });
                        reject(err);
                    } else resolve();
                    
                    setTimeout(async () => {
                        // Local temp cleanup
                        try {
                            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                            if (fs.existsSync(uniqueTmpDir)) fs.rmSync(uniqueTmpDir, { recursive: true, force: true });
                        } catch (e) {}

                        // 🧹 R2 CLEANUP: Delete EPS from R2 after Ghostscript is done to avoid ongoing storage costs
                        if (pathKey && isR2Configured()) {
                            try {
                                await getS3Client().send(new DeleteObjectCommand({
                                    Bucket: process.env.S3_BUCKET_NAME!,
                                    Key: pathKey,
                                }));
                                console.log(`[R2 CLEANUP] Deleted: ${pathKey}`);
                            } catch (deleteErr) {
                                console.warn(`[R2 CLEANUP] Failed to delete ${pathKey}:`, deleteErr);
                            }
                        }
                    }, 500);
                });
            });

        } catch (error: any) {
            console.error('API /convert-eps-url error:', error);
            if (fs.existsSync(uniqueTmpDir)) {
                try { fs.rmSync(uniqueTmpDir, { recursive: true, force: true }); } catch (e) {}
            }
            if (!res.headersSent) {
                res.status(error.message.includes('timeout') ? 408 : 500).json({ 
                    error: 'Gagal mengkonversi vector URL, file mungkin rusak atau terlalu complex.',
                    details: error.message 
                });
            }
        }
    });
    // =========== END VECTOR LARGE FILE STORAGE UPLOAD ENDPOINTS ===========

    app.post('/api/convert-eps-multipart', throttleMiddleware, upload.single('file'), async (req, res) => {
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
                '-dEPSFitPage', '-dPDFFitPage', '-dDEVICEWIDTHPOINTS=768', '-dDEVICEHEIGHTPOINTS=768', 
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

            // Remove fallback logic since we are already fitting to 768x768 safely
            await gsQueue.enqueue(async () => {
                await spawnAsync(gsExecutable, gsArgs, spawnOptions);
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

    // ==========================================
    // AUTO FTP / SFTP STOCK UPLOADER ENDPOINTS
    // ==========================================

    // Test FTP / FTPS / SFTP Connection
    app.post('/api/ftp/test-connection', async (req, res) => {
        try {
            const { host, port, protocol, username, password, remoteDir } = req.body;
            if (!host || !username || !password) {
                return res.status(400).json({ success: false, error: 'Host, Username, and Password are required.' });
            }

            const result = await testFtpConnection({
                host: String(host).trim(),
                port: port ? Number(port) : undefined,
                protocol: protocol || 'ftp',
                username: String(username).trim(),
                password: String(password),
                remoteDir: remoteDir || '/'
            });

            if (result.success) {
                return res.json({ success: true, message: result.message });
            } else {
                return res.status(400).json({ success: false, error: result.error });
            }
        } catch (err: any) {
            console.error('[FTP TEST ERROR]', err);
            return res.status(500).json({ success: false, error: err.message || 'Internal FTP testing error' });
        }
    });

    // Upload File to Remote FTP / SFTP Server
    app.post('/api/ftp/upload', upload.single('file'), async (req, res) => {
        const uploadedFile = req.file;
        try {
            if (!uploadedFile) {
                return res.status(400).json({ success: false, error: 'No file uploaded.' });
            }

            const accountConfigRaw = req.body.accountConfig;
            if (!accountConfigRaw) {
                if (fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
                return res.status(400).json({ success: false, error: 'Target FTP account configuration is missing.' });
            }

            const accountConfig = typeof accountConfigRaw === 'string' ? JSON.parse(accountConfigRaw) : accountConfigRaw;
            const { host, port, protocol, username, password, remoteDir } = accountConfig;

            if (!host || !username || !password) {
                if (fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
                return res.status(400).json({ success: false, error: 'Target account host, username, or password missing.' });
            }

            const uploadResult = await uploadToFtp({
                host: String(host).trim(),
                port: port ? Number(port) : undefined,
                protocol: protocol || 'ftp',
                username: String(username).trim(),
                password: String(password),
                remoteDir: remoteDir || '/',
                localFilePath: uploadedFile.path,
                filename: uploadedFile.originalname || path.basename(uploadedFile.path)
            });

            // Clean up temporary local upload file
            if (fs.existsSync(uploadedFile.path)) {
                try { fs.unlinkSync(uploadedFile.path); } catch (e) {}
            }

            if (uploadResult.success) {
                return res.json({ success: true, message: uploadResult.message, filename: uploadedFile.originalname });
            } else {
                return res.status(400).json({ success: false, error: uploadResult.error });
            }
        } catch (err: any) {
            console.error('[FTP UPLOAD ERROR]', err);
            if (uploadedFile && fs.existsSync(uploadedFile.path)) {
                try { fs.unlinkSync(uploadedFile.path); } catch (e) {}
            }
            return res.status(500).json({ success: false, error: err.message || 'Internal FTP upload error' });
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
