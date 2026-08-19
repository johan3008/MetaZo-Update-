const fs = require('fs');
let code = fs.readFileSync('server/gemini.ts', 'utf8');

const regex = /CRITICAL: Keywords MUST be short words or short phrases\. NEVER FULL SENTENCES\. Keywords DO NOT use sentences, MUST be short words\/phrases \(kata\/frasa pendek, bukan kalimat\)\.`/g;

const replacement = `CRITICAL: Keywords MUST be short words or short phrases. NEVER FULL SENTENCES. Keywords DO NOT use sentences, MUST be short words/phrases (kata/frasa pendek, bukan kalimat).
10. CRITICAL RULE FOR STOCK APPROVAL: Do NOT add unrelated keywords just to reach the target count. EVERY single keyword MUST literally be visible in the image or directly related to the clear visual concept. Any hallucinated, loosely related, or spammy keywords will cause the asset to be REJECTED.\`;`;

code = code.replace(regex, replacement);

fs.writeFileSync('server/gemini.ts', code);
