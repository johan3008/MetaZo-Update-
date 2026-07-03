import fs from 'fs';

// Patch App.tsx
let appCode = fs.readFileSync('App.tsx', 'utf8');
appCode = appCode.replace("video.crossOrigin = 'anonymous';", "// video.crossOrigin removed for blob");
fs.writeFileSync('App.tsx', appCode);

// Patch ImageQualityCheck.tsx
let iqCode = fs.readFileSync('src/components/ImageQualityCheck.tsx', 'utf8');
iqCode = iqCode.replace("video.crossOrigin = 'anonymous';", "// video.crossOrigin removed for blob");
fs.writeFileSync('src/components/ImageQualityCheck.tsx', iqCode);

console.log("Removed crossOrigin from video elements");
