const fs = require('fs');
let code = fs.readFileSync('src/supabase.ts', 'utf8');

code = code.replace(/console\.log\('\\[Supabase\\] About to update:', docRef\.table, docRef\.id, finalUpdates\);/, '');
code = code.replace(/console\.log\('\\[Supabase\\] Update result:', resData, error\);/, '');

fs.writeFileSync('src/supabase.ts', code);
