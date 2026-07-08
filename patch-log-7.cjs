const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "app.post('/api/mute-video', upload.single('video'), async (req, res) => {  console.log('MUTE VIDEO CALLED', req.body, req.file);",
  "app.post('/api/mute-video', upload.single('video'), async (req, res) => {  fs.writeFileSync('/tmp/mute-called.log', 'CALLED');"
);
fs.writeFileSync('server.ts', code);
