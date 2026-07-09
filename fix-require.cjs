const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const m1 = 'fluent-ffmpeg';\s*const m2 = '@ffmpeg-installer\/ffmpeg';\s*const m3 = '@ffprobe-installer\/ffprobe';\s*const ffmpegLib = req\(m1\);\s*ffmpeg = typeof ffmpegLib === 'function' \? ffmpegLib : \(ffmpegLib\.default \|\| ffmpegLib\);\s*ffmpeg\.setFfmpegPath\(req\(m2\)\.path\);\s*ffmpeg\.setFfprobePath\(req\(m3\)\.path\);/g, `const ffmpegLib = req('fluent-ffmpeg');
        ffmpeg = typeof ffmpegLib === 'function' ? ffmpegLib : (ffmpegLib.default || ffmpegLib);
        ffmpeg.setFfmpegPath(req('@ffmpeg-installer/ffmpeg').path);
        ffmpeg.setFfprobePath(req('@ffprobe-installer/ffprobe').path);`);

code = code.replace(/const m2 = '@ffmpeg-installer\/ffmpeg';\s*const m3 = '@ffprobe-installer\/ffprobe';\s*const reqReq = typeof require !== 'undefined' \? require : createRequire\(import\.meta\.url\);\s*const ffmpegPath = reqReq\(m2\)\.path;\s*const ffprobePath = reqReq\(m3\)\.path;/g, `const reqReq = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
                                const ffmpegPath = reqReq('@ffmpeg-installer/ffmpeg').path;
                                const ffprobePath = reqReq('@ffprobe-installer/ffprobe').path;`);

code = code.replace(/ffmpegPath = reqRequire\('@ffmpeg-installer\/ffmpeg'\)\.path;\s*ffprobePath = reqRequire\('@ffprobe-installer\/ffprobe'\)\.path;/g, `ffmpegPath = reqRequire('@ffmpeg-installer/ffmpeg').path;
            ffprobePath = reqRequire('@ffprobe-installer/ffprobe').path;`);

fs.writeFileSync('server.ts', code);
