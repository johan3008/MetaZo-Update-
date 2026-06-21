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

  if (!content.includes('import { getDailyLimit }')) {
    content = "import { getDailyLimit } from '../../constants';\n" + content;
  }
  
  fs.writeFileSync(file, content);
});
