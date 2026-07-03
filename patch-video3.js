import fs from 'fs';

let server = fs.readFileSync('server.ts', 'utf8');

const oldCode = `            const frames = await new Promise((resolve, reject) => {
                let isDone = false;
                const timeout = setTimeout(() => {
                    if (!isDone) {
                        isDone = true;
                        reject(new Error("Video extraction timed out. Please try a shorter or lighter video."));
                    }
                }, 45000); // 45 seconds timeout

                ffmpeg(videoPath)
                  .on('end', () => {
                      if (isDone) return;
                      isDone = true;
                      clearTimeout(timeout);
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
                      if (isDone) return;
                      isDone = true;
                      clearTimeout(timeout);
                      reject(err);
                  })
                  .screenshots({
                      timemarks: ['10%', '50%', '90%'],
                      fastSeek: true,
                      folder: outDir,
                      size: '1280x720',
                      filename: 'frame-%i.jpg'
                  });
            });`;

const newCode = `            const frames = await new Promise((resolve, reject) => {
                let isDone = false;
                const timeout = setTimeout(() => {
                    if (!isDone) {
                        isDone = true;
                        reject(new Error("Video extraction timed out. Please try a shorter or lighter video."));
                    }
                }, 45000); // 45 seconds timeout

                // Fast Native Extraction using ffmpeg path directly
                const extractFast = async () => {
                    try {
                        const m2 = '@ffmpeg-installer/ffmpeg';
                        const m3 = '@ffprobe-installer/ffprobe';
                        const req = typeof require !== 'undefined' ? require : null;
                        if (!req) throw new Error("require is not defined");
                        
                        const ffmpegPath = req(m2).path;
                        const ffprobePath = req(m3).path;
                        const execPromise = util.promisify(exec);

                        // 1. Get duration
                        const { stdout: probeOut } = await execPromise(\`"\${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "\${videoPath}"\`);
                        const duration = parseFloat(probeOut.trim());
                        if (isNaN(duration) || duration <= 0) {
                            throw new Error("Could not determine video duration");
                        }

                        // 2. Calculate timestamps (10%, 50%, 90%)
                        const t1 = duration * 0.1;
                        const t2 = duration * 0.5;
                        const t3 = duration * 0.9;

                        // 3. Extract frames with fast seek (-ss BEFORE -i)
                        const f1Path = path.join(outDir, 'frame-1.jpg');
                        const f2Path = path.join(outDir, 'frame-2.jpg');
                        const f3Path = path.join(outDir, 'frame-3.jpg');

                        await execPromise(\`"\${ffmpegPath}" -ss \${t1} -i "\${videoPath}" -vframes 1 -q:v 2 -s 1280x720 "\${f1Path}" -y\`);
                        await execPromise(\`"\${ffmpegPath}" -ss \${t2} -i "\${videoPath}" -vframes 1 -q:v 2 -s 1280x720 "\${f2Path}" -y\`);
                        await execPromise(\`"\${ffmpegPath}" -ss \${t3} -i "\${videoPath}" -vframes 1 -q:v 2 -s 1280x720 "\${f3Path}" -y\`);

                        const f1 = fs.readFileSync(f1Path, 'base64');
                        const f2 = fs.readFileSync(f2Path, 'base64');
                        const f3 = fs.readFileSync(f3Path, 'base64');
                        fs.rmSync(outDir, { recursive: true, force: true });

                        if (!isDone) {
                            isDone = true;
                            clearTimeout(timeout);
                            resolve([
                              \`data:image/jpeg;base64,\${f1}\`,
                              \`data:image/jpeg;base64,\${f2}\`,
                              \`data:image/jpeg;base64,\${f3}\`
                            ]);
                        }
                    } catch (e) {
                        if (!isDone) {
                            isDone = true;
                            clearTimeout(timeout);
                            reject(e);
                        }
                    }
                };
                
                extractFast();
            });`;

if (server.includes('Video extraction timed out. Please try a shorter or lighter video.')) {
    server = server.replace(oldCode, newCode);
    fs.writeFileSync('server.ts', server);
    console.log("Patched fast extraction");
} else {
    console.log("Could not find block to patch");
}
