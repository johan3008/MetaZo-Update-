const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "console.warn('Server check-video-quality error:', e);",
  "console.warn('MUTE VIDEO CAUGHT ERROR:', e, e.stack);"
);
fs.writeFileSync('server.ts', code);
