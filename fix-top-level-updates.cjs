const fs = require('fs');
let code = fs.readFileSync('src/supabase.ts', 'utf8');

code = code.replace(/if \(hasDottedKeys\) \{\s*const resultData = \{ \.\.\.currentLocalData \};/, `if (hasDottedKeys) {
    topLevelUpdates = {};
    const resultData = { ...currentLocalData };`);

fs.writeFileSync('src/supabase.ts', code);
