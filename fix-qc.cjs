const fs = require('fs');
let content = fs.readFileSync('src/components/ImageQualityCheck.tsx', 'utf8');

content = content.replace(
  '<div className="flex flex-col items-end">',
  '<div className="flex flex-col items-end shrink-0 ml-3">'
);

content = content.replace(
  '<p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">{t.qc_score_label}</p>',
  '<p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1 whitespace-nowrap">{t.qc_score_label}</p>'
);

content = content.replace(
  /\"{r\.detailed_feedback}\"/g,
  '{r.detailed_feedback}'
);

fs.writeFileSync('src/components/ImageQualityCheck.tsx', content);
