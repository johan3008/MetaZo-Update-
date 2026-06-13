const fs = require('fs');
let content = fs.readFileSync('src/components/PromptGenView.tsx', 'utf8');

// Replace all font-black with font-semibold or font-bold depending on context
content = content.replace(/font-black/g, 'font-semibold');

// Change standard dark borders and bg to be cleaner
content = content.replace(/border-slate-200 dark:border-white\/5/g, 'border-slate-200/60 dark:border-white/5');
content = content.replace(/bg-slate-50 dark:bg-black\/25/g, 'bg-slate-50/50 dark:bg-black/20');
content = content.replace(/bg-slate-50 dark:bg-black\/10/g, 'bg-slate-50/50 dark:bg-black/10');

fs.writeFileSync('src/components/PromptGenView.tsx', content);
