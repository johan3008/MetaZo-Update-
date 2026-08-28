const fs = require('fs');

const path = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\d6a55810-5e34-491a-ad93-31c708ffa154\\.system_generated\\steps\\9\\content.md';
const content = fs.readFileSync(path, 'utf8');

// Find all headings or main sections
const lines = content.split('\n');
const results = [];
let capture = false;
let currentHeader = '';

for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l.startsWith('#') || l.startsWith('##') || l.startsWith('###') || l.startsWith('####')) {
    results.push(l);
  }
}

fs.writeFileSync('restrictions_headers.txt', results.join('\n'));
console.log('Headers written:', results.length);
