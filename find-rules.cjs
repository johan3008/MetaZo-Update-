const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
const result = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('prompt') || lines[i].includes('/api/check-image-quality')) {
        result.push(i + ': ' + lines[i].substring(0, 150));
    }
}
fs.writeFileSync('result.txt', result.join('\n'));
console.log("Done");
