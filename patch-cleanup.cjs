const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "app.post('/api/mute-video', upload.single('video'), async (req, res) => {  fs.writeFileSync('/tmp/mute-called.log', 'CALLED');",
  "app.post('/api/mute-video', upload.single('video'), async (req, res) => {"
);
code = code.replace(
  "console.warn('MUTE VIDEO CAUGHT ERROR:', e, e.message); require('fs').writeFileSync('/tmp/exact-error.log', e.message);",
  "console.warn('Server check-video-quality error:', e);"
);
code = code.replace(
  "console.warn('MUTE VIDEO CAUGHT ERROR:', e);",
  "console.warn('Server check-video-quality error:', e);"
);
fs.writeFileSync('server.ts', code);
