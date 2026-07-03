import fs from 'fs';

let server = fs.readFileSync('server.ts', 'utf8');

const oldCode = `            const frames = await new Promise((resolve, reject) => {
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
            });`;

const newCode = `            const frames = await new Promise((resolve, reject) => {
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
                      folder: outDir,
                      size: '1280x720',
                      filename: 'frame-%i.jpg'
                  });
            });`;

if (server.includes('count: 3,')) {
    server = server.replace(oldCode, newCode);
    fs.writeFileSync('server.ts', server);
    console.log("Patched video extraction");
} else {
    console.log("Could not find block to patch");
}
