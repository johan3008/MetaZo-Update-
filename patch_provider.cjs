const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');
content = content.replace(
  "return (localStorage.getItem('ai_provider') || 'gemini') as any;",
  "const val = localStorage.getItem('ai_provider') || 'gemini';\n    const validProviders = ['gemini', 'groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'bluesminds', 'aivene'];\n    return validProviders.includes(val) ? val as any : 'gemini';"
);
fs.writeFileSync('App.tsx', content);
console.log("Patched App.tsx");
