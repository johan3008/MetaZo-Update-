const fs = require('fs');
let code = fs.readFileSync('server/gemini.ts', 'utf8');

code = code.replace(
`    if (provider === 'groq' || provider === 'openai' || provider === 'openrouter' || provider === 'nvidia') {
      payload.max_tokens = provider === 'nvidia' ? 2048 : 8192;
    }`,
`    if (provider === 'groq' || provider === 'openai' || provider === 'openrouter' || provider === 'nvidia') {
      payload.max_tokens = 8192; // Ensure sufficient tokens for large generated lists
    }`
);

fs.writeFileSync('server/gemini.ts', code);
