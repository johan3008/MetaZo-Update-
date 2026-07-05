const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');
content = content.replace(
  "            if (data.settings.ai_provider !== localProvider) {\n              localStorage.setItem('ai_provider', data.settings.ai_provider);\n              setSelectedProvider(data.settings.ai_provider as any);\n              settingsChanged = true;\n            }",
  "            const validProviders = ['gemini', 'groq', 'mistral', 'openai', 'openrouter', 'blackbox', 'nvidia', 'bluesminds', 'aivene'];\n            const cloudProvider = validProviders.includes(data.settings.ai_provider) ? data.settings.ai_provider : 'gemini';\n            if (cloudProvider !== localProvider) {\n              localStorage.setItem('ai_provider', cloudProvider);\n              setSelectedProvider(cloudProvider as any);\n              settingsChanged = true;\n            }"
);
fs.writeFileSync('App.tsx', content);
console.log("Patched db cloud provider load");
