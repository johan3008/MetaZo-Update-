const fs = require('fs');
let code = fs.readFileSync('src/components/BackupManagerPanel.tsx', 'utf8');

code = code.replace(/import \{ collection, query, getDocs, orderBy, limit \} from '\.\.\/supabase';/g, "import { collection, query, getDocs, orderBy, limit, where } from '../supabase';");
code = code.replace(/const \{ where \} = require\('\.\.\/supabase'\);/g, "");

fs.writeFileSync('src/components/BackupManagerPanel.tsx', code);
