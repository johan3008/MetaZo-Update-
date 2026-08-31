const fs = require('fs');
const path = require('path');

function search(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      search(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('CALENDAR_GEN')) {
        console.log(`Found CALENDAR_GEN in: ${fullPath}`);
      }
      if (content.includes('SEARCH_GEN')) {
        console.log(`Found SEARCH_GEN in: ${fullPath}`);
      }
    }
  }
}

search('.');
