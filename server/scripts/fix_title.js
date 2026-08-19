const fs=require('fs');
let c=fs.readFileSync('server/gemini.ts','utf8');
c = c.replace('if (!title || title.trim() === "") {', 'if (!title || title.trim() === "" || title.includes("Write a descriptive title here")) {');
fs.writeFileSync('server/gemini.ts',c);
