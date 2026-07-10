const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const regex = /systemInstruction:([^]+?)(?:,|})/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  fs.writeFileSync(`prompt_${count}.txt`, match[1].trim());
  count++;
}
const contentApp = fs.readFileSync('src/components/ImageQualityCheck.tsx', 'utf8');
const regexApp = /prompt:([^]+?)(?:,|})/g;
let countApp = 0;
while ((match = regexApp.exec(contentApp)) !== null) {
  fs.writeFileSync(`prompt_app_${countApp}.txt`, match[1].trim());
  countApp++;
}
console.log("Extracted prompts");
