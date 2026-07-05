const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');
content = content.replace(
  "return validProviders.includes(val) ? val as any : 'gemini';",
  "if (!validProviders.includes(val)) { localStorage.setItem('ai_provider', 'gemini'); return 'gemini'; }\n    return val as any;"
);
fs.writeFileSync('App.tsx', content);
console.log("Patched init");
