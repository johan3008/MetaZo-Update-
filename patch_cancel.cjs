const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');
content = content.replace(
  "const pSaved = (localStorage.getItem('ai_provider') || 'gemini') as 'gemini' | 'groq' | 'mistral' | 'openai' | 'openrouter' | 'blackbox' | 'nvidia' | 'bluesminds' | 'aivene';",
  "const validProviders = ['gemini', 'groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'bluesminds', 'aivene'];\n      const rawP = localStorage.getItem('ai_provider') || 'gemini';\n      const pSaved = (validProviders.includes(rawP) ? rawP : 'gemini') as any;"
);
fs.writeFileSync('App.tsx', content);
console.log("Patched cancel settings");
