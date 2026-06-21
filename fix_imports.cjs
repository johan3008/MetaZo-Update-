const fs = require('fs');

const files = [
  'src/components/DashboardView.tsx',
  'src/components/ImageQualityCheck.tsx',
  'src/components/PromptVideoView.tsx',
  'src/components/PromptGenView.tsx',
  'src/components/PromptImageView.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Regex replacement for the import to add getDailyLimit 
  // Handle different variations
  content = content.replace(/import\s*\{\s*TRANSLATIONS/, "import { TRANSLATIONS, getDailyLimit");
  
  fs.writeFileSync(file, content);
});
