const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "ffmpeg = req(m1);",
  "const ffmpegLib = req(m1);\n        ffmpeg = typeof ffmpegLib === 'function' ? ffmpegLib : (ffmpegLib.default || ffmpegLib);"
);
fs.writeFileSync('server.ts', code);
