const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
    /let ffmpeg: any;\nif \(\!process\.env\.VERCEL\) \{[\s\S]*?\n\}/,
    `let ffmpeg: any;
if (!process.env.VERCEL) {
    try {
        const req = typeof require !== 'undefined' ? require : null;
        if (req) {
            const m1 = 'fluent-ffmpeg';
            const m2 = '@ffmpeg-installer/ffmpeg';
            const m3 = '@ffprobe-installer/ffprobe';
            ffmpeg = req(m1);
            ffmpeg.setFfmpegPath(req(m2).path);
            ffmpeg.setFfprobePath(req(m3).path);
        }
    } catch (e) {
        console.warn('ffmpeg not available locally', e);
    }
}`
);
fs.writeFileSync('server.ts', code);
