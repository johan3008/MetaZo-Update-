const fs = require('fs');
let code = fs.readFileSync('src/supabase.ts', 'utf8');

code = code.replace(/const \{ data: resData, error \} = await supabase\s*\.from\(docRef\.table\)\s*\.update\(finalUpdates\)\s*\.eq\(docRef\.table === 'keys' \? 'key' : 'id', docRef\.id\)\s*\.select\(\);/, `console.log('[Supabase] About to update:', docRef.table, docRef.id, finalUpdates);
      const { data: resData, error } = await supabase
        .from(docRef.table)
        .update(finalUpdates)
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id)
        .select();
      console.log('[Supabase] Update result:', resData, error);`);

fs.writeFileSync('src/supabase.ts', code);
