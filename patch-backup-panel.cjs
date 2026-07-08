const fs = require('fs');
let code = fs.readFileSync('src/components/BackupManagerPanel.tsx', 'utf8');

const replaceFetch1 = `
      import { where } from '../supabase';
      // Added where to imports above or just assume it's there
      
      setIsD1Configured(true);
      setD1ErrorType(null);
`;

const replaceFetch2 = `
      const fetchSupabaseHistory = async () => {
        try {
          const { where } = require('../supabase');
          const backupsRef = collection(db, 'metadata_backups');
          const q = query(backupsRef, where('uid', '==', user.uid), orderBy('created_at', 'desc'), limit(50));
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => {
            const d = doc.data();
            let parsedItems = [];
            try {
              parsedItems = typeof d.items === 'string' ? JSON.parse(d.items) : d.items;
            } catch(e) {}
            return {
              id: d.id,
              batchId: d.batch_id,
              timestamp: d.timestamp,
              tool: d.tool,
              items: parsedItems,
              createdAt: d.created_at
            };
          });
          
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const filteredCloud = data.filter((batch: any) => {
            const createdTime = batch.createdAt ? new Date(batch.createdAt).getTime() : Date.now();
            return createdTime >= sevenDaysAgo;
          });
          setCloudHistory(filteredCloud);
          setIsD1Configured(true);
          setD1ErrorType(null);
        } catch (err) {
          console.error('[Supabase] Error loading backup history:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchSupabaseHistory();
`;

code = code.replace(/useEffect\(\(\) => \{\s*if \(user\) \{\s*fetch\(\`\/api\/d1-backup\/history\?uid=\$\{user\.uid\}\`\)(.|\n)*?catch\(\(\) => \{\s*setIsD1Configured\(false\);\s*setD1ErrorType\('CREDENTIALS_MISSING'\);\s*\}\);\s*\}\s*\}\, \[user\]\);/gm, `
  useEffect(() => {
    if (user) {
      setIsD1Configured(true);
      setD1ErrorType(null);
    }
  }, [user]);
`);

code = code.replace(/fetch\(\`\/api\/d1-backup\/history\?uid=\$\{user\.uid\}\`\)(.|\n)*?setLoading\(false\);\s*\}\);/gm, replaceFetch2);

// Replace texts
code = code.replace(/Cloudflare D1/g, 'Supabase');
code = code.replace(/CLOUDFLARE_API_TOKEN/g, 'SUPABASE_ANON_KEY');
code = code.replace(/CLOUDFLARE_ACCOUNT_ID/g, 'SUPABASE_URL');

fs.writeFileSync('src/components/BackupManagerPanel.tsx', code);
