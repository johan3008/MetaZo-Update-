const fs = require('fs');
let file = fs.readFileSync('src/supabase.ts', 'utf8');

file = file.replace(/console\.warn\('\[Supabase\] (.*?)', (error|e)\);/g, `
if ($2 && typeof $2 === 'object' && ('code' in $2)) {
  if ($2.code !== 'PGRST205' && $2.code !== '42501' && $2.code !== 'PGRST116') {
    console.warn('[Supabase] $1', $2);
  }
} else {
  console.warn('[Supabase] $1', $2);
}
`.trim());

fs.writeFileSync('src/supabase.ts', file);
