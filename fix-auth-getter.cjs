const fs = require('fs');
let code = fs.readFileSync('src/supabase.ts', 'utf8');

code = code.replace(/return \{\s*uid: user\.id,\s*email: user\.email,\s*emailVerified: !!user\.email_confirmed_at\s*\};/, `return {
              uid: user.id,
              email: user.email,
              emailVerified: !!user.email_confirmed_at,
              displayName: user.user_metadata?.full_name || user.user_metadata?.name || null,
              photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
            };`);

fs.writeFileSync('src/supabase.ts', code);
