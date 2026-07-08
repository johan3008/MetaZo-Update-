const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "if (!process.env.VERCEL) {",
  "if (true) { // always try to load ffmpeg"
);
fs.writeFileSync('server.ts', code);
