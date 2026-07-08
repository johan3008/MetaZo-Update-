const fs = require('fs');
let code = fs.readFileSync('src/supabase.ts', 'utf8');

// Remove console.warn in updateDoc
code = code.replace(/console\.warn\(\`\[Supabase\] updateDoc failed or no rows updated, falling back to Local Storage:\`, error\);/g, "// warn removed");

fs.writeFileSync('src/supabase.ts', code);
