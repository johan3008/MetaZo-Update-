const fs = require('fs');
let code = fs.readFileSync('src/supabase.ts', 'utf8');

code = code.replace(/if \(mappedUser\) \{\s*auth\.currentUser = mappedUser;\s*\} else \{\s*auth\.currentUser = null;\s*\}/, '');

fs.writeFileSync('src/supabase.ts', code);
