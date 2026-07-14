const fs = require('fs');

const replaceImports = (p) => {
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/from '\.\.\/\.\.\/constants'/g, "from '@/constants.tsx'");
  c = c.replace(/from '\.\.\/\.\.\/types'/g, "from '@/types.ts'");
  c = c.replace(/from '\.\.\/supabase'/g, "from '@/src/supabase.ts'");
  c = c.replace(/from '\.\/FeatureGuideModal'/g, "from './FeatureGuideModal.tsx'");
  c = c.replace(/from '\.\.\/\.\.\/services\/geminiService'/g, "from '@/services/geminiService.ts'");
  c = c.replace(/from '\.\/Meteors'/g, "from './Meteors.tsx'");
  fs.writeFileSync(p, c);
};

['src/components/DashboardView.tsx', 'src/components/ImageQualityCheck.tsx', 'src/components/LoginScreen.tsx', 'src/components/VideoQualityCheck.tsx'].forEach(replaceImports);

let gemini = fs.readFileSync('server/gemini.ts', 'utf8');
gemini = gemini.replace(/from '\.\.\/types'/g, "from '@/types.ts'");
gemini = gemini.replace(/from '\.\.\/constants'/g, "from '@/constants.tsx'");
fs.writeFileSync('server/gemini.ts', gemini);

console.log('Imports fixed.');
