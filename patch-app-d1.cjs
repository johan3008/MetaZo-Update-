const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const replaceD1 = `
    // Fully Cloud Storage using Supabase
    console.log('[Supabase] Saving backup to Supabase...');
    const batchId = \`batch-\${Date.now()}\`;
    const newBackup = {
      uid: user.uid,
      batch_id: batchId,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tool: activeTool,
      items: JSON.stringify(backupData),
      created_at: new Date().toISOString()
    };
    
    addDoc(collection(db, 'metadata_backups'), newBackup)
      .then((docRef) => {
        console.log('[Supabase] Auto-backup saved successfully:', batchId);
      })
      .catch(err => {
        console.warn('[Supabase] Auto-backup failed:', err);
      });
`;

code = code.replace(/\/\/ Fully Cloud Storage using Cloudflare D1[\s\S]*?console\.warn\('\[Cloudflare D1\] Auto-backup request error:', err\);\s*\}\);/m, replaceD1);

fs.writeFileSync('App.tsx', code);
