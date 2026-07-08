const fs = require('fs');
const text = fs.readFileSync('server.ts', 'utf8');
const lines = text.split('\n');
lines.forEach((line, i) => {
    if (line.includes('Unauthorized') || line.includes('401') || line.includes('unauthorized')) {
        console.log(`Line ${i+1}: ${line}`);
    }
});
