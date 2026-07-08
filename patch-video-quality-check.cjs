const fs = require('fs');
let code = fs.readFileSync('src/components/VideoQualityCheck.tsx', 'utf8');

// Replace the client-side frame extraction logic with a simple upload
code = code.replace(/const frames: string\[\] = await new Promise\(\(resolve, reject\) => \{[\s\S]*?console\.log\(`\[Video Audit\] Extracted \$\{frames\.length\} frames client-side, sending to API\.\.\.`\);/g, `
      console.log(\`[Video Audit] Sending video file to API for FFmpeg extraction...\`);
`);

code = code.replace(/const response = await fetch\('\/api\/check-video-quality', \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json',\s*'X-API-Key': apiKey \|\| ''\s*\},\s*body: JSON\.stringify\(\{\s*frames: frames,\s*tolerance,\s*language: aiOptions\?\.language \|\| 'Bahasa',\s*model: aiOptions\?\.visionModel \|\| 'gemini-3\.1-pro-preview'\s*\}\)\s*\}\);/g, `
      const formData = new FormData();
      formData.append('video', file);
      formData.append('tolerance', tolerance);
      formData.append('language', aiOptions?.language || 'Bahasa');
      formData.append('model', aiOptions?.visionModel || 'gemini-3.1-pro-preview');

      const response = await fetch('/api/check-video-quality', {
        method: 'POST',
        headers: { 
          'X-API-Key': apiKey || ''
        },
        body: formData
      });
`);

fs.writeFileSync('src/components/VideoQualityCheck.tsx', code);
