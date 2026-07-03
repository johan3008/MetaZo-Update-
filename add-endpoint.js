import fs from 'fs';

let serverTs = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `
    app.post('/api/check-video-quality', upload.single('video'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No video uploaded' });
            }
            const videoPath = req.file.path;
            
            if (!ffmpeg) {
                return res.status(500).json({ error: 'ffmpeg is not initialized on the server.' });
            }

            console.log('Server check-video-quality: Extracting frames...');
            const outDir = path.join(uploadDir, \`frames_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`);
            fs.mkdirSync(outDir, { recursive: true });

            const frames = await new Promise((resolve, reject) => {
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
                          fs.rmSync(outDir, { recursive: true, force: true });
                          resolve([
                            \`data:image/jpeg;base64,\${f1}\`,
                            \`data:image/jpeg;base64,\${f2}\`,
                            \`data:image/jpeg;base64,\${f3}\`
                          ]);
                      } catch(e) {
                          reject(e);
                      }
                  })
                  .on('error', (err) => {
                      reject(err);
                  });
            });

            const { tolerance, language, model } = req.body;
            console.log('Server check-video-quality: Analyzing frames with Gemini...');
            const data = await checkVideoQuality(frames, tolerance || 'MEDIUM', language || 'Bahasa', model);
            console.log('Server check-video-quality: Analysis successful');
            
            // Clean up uploaded video
            fs.unlinkSync(videoPath);

            res.json(data);
        } catch (e) {
            console.warn('Server check-video-quality error:', e);
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ error: e.message || 'Error checking video quality' });
        }
    });
`;

serverTs = serverTs.replace("    app.post('/api/check-image-quality', async (req, res) => {", newEndpoint + "\n    app.post('/api/check-image-quality', async (req, res) => {");

fs.writeFileSync('server.ts', serverTs);
