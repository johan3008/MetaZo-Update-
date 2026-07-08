const fs = require('fs');
let code = fs.readFileSync('src/components/ImageQualityCheck.tsx', 'utf8');

// Replace the video client side extraction logic
const replaceLogic = `
          if (isVideo) {
            const formData = new FormData();
            formData.append('video', file);
            formData.append('tolerance', tolerance);
            formData.append('language', t.language || 'English');
            formData.append('model', aiOptions?.model || 'gemini-3.1-pro-preview');

            response = await fetch('/api/check-video-quality', {
              method: 'POST',
              headers: { 
                'X-API-Key': aiOptions?.apiKey || ''
              },
              body: formData
            });
          } else {`;

code = code.replace(/if \(isVideo\) \{\s*\/\/ Client-side extraction for Video to avoid Vercel Serverless FFmpeg errors[\s\S]*?response = await fetch\('\/api\/check-video-quality', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json', \.\.\.getHeaders\(aiOptions\) \},\s*body: JSON\.stringify\(\{\s*frames: frames,\s*tolerance,\s*language: t\.language \|\| 'English',\s*model: aiOptions\?\.model \|\| 'gemini-3\.1-pro-preview'\s*\}\)\s*\}\);\s*\} else \{/g, replaceLogic);

fs.writeFileSync('src/components/ImageQualityCheck.tsx', code);
