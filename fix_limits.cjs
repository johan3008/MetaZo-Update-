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

  // Inject import
  if (content.includes('import { TRANSLATIONS, AppLanguage }')) {
    content = content.replace('import { TRANSLATIONS, AppLanguage }', 'import { TRANSLATIONS, AppLanguage, getDailyLimit }');
  } else if (content.includes('import { TRANSLATIONS, AppLanguage,')) {
    content = content.replace('import { TRANSLATIONS, AppLanguage,', 'import { TRANSLATIONS, AppLanguage, getDailyLimit,');
  }

  // Do replacements
  content = content.replace(/>= 25/g, '>= getDailyLimit()');
  content = content.replace(/\/ 25/g, '/ getDailyLimit()');
  content = content.replace(/25 - dailyGenCount/g, 'getDailyLimit() - dailyGenCount');
  content = content.replace(/> 25/g, '> getDailyLimit()');
  content = content.replace(/}\/25 {/g, '}/{getDailyLimit()} {');

  fs.writeFileSync(file, content);
});
