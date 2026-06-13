const fs = require('fs');
let content = fs.readFileSync('src/components/PromptGenView.tsx', 'utf8');

content = content.replace(/className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400"/g, 'className="text-[11px] font-semibold text-slate-600 dark:text-slate-400"');
content = content.replace(/className="text-\[10px\] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block"/g, 'className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block"');
content = content.replace(/className="text-\[11px\] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400/g, 'className="text-[11px] font-semibold text-slate-600 dark:text-slate-400');
content = content.replace(/className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400/g, 'className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400');
content = content.replace(/className="flex justify-between items-center text-xs font-black uppercase tracking-wider"/g, 'className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400"');

// Fix empty state
const oldEmptyState = `<div className="py-20 text-center">
                <Wand2 className="mx-auto text-slate-600 bg-black/30 p-4 w-12 h-12 rounded-2xl animate-pulse" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mt-4 font-mono">Form Isian Visual Prompt Studio</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                  Isi visual tema, tentukan jumlah prompt variasi di atas (10-150), lalu klik tombol "Generate Prompts" untuk menyaksikan AI memproduksi rangkai variasi unik sekaligus.
                </p>
              </div>`;

const newEmptyState = `<div className="py-32 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 shadow-sm border border-slate-100 dark:border-white/5">
                  <Sparkles size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Awaiting Input</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                  Describe your visual theme and configure variations. AI will generate unique prompt sets tailored for your needs.
                </p>
              </div>`;

content = content.replace(oldEmptyState, newEmptyState);

// Replace button classes
content = content.replace(/font-black uppercase text-xs tracking-widest/g, 'font-semibold text-xs tracking-wider');

fs.writeFileSync('src/components/PromptGenView.tsx', content);
