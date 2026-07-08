const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "app.post('/api/mute-video', upload.single('video'), async (req, res) => {",
  "app.post('/api/mute-video', upload.single('video'), async (req, res) => { require('fs').writeFileSync('/tmp/mute-called.log', 'CALLED');"
);
fs.writeFileSync('server.ts', code);
