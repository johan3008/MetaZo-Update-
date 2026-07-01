const fs = require('fs'); let content = fs.readFileSync('server/gemini.ts', 'utf-8'); content = content.replace(/- Length between 60-120 characters.
/g, ''); fs.writeFileSync('server/gemini.ts', content);
