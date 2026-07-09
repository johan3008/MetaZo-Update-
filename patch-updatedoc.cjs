const fs = require('fs');
let code = fs.readFileSync('src/supabase.ts', 'utf8');

const replaceCode = `export async function updateDoc(docRef: SupabaseDocRef, data: any): Promise<void> {
  let topLevelUpdates: any = { ...data };
  
  const hasDottedKeys = Object.keys(data).some(k => k.includes('.'));
  if (hasDottedKeys) {
    let currentDocData: any = {};
    if (supabase) {
      const { data: snapData } = await supabase
        .from(docRef.table)
        .select('*')
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id)
        .single();
      if (snapData) currentDocData = snapData;
    }
    
    topLevelUpdates = {};
    const resultData = { ...currentDocData };
    
    for (const [key, value] of Object.entries(data)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = resultData;
        let topKey = parts[0];
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]] || typeof current[parts[i]] !== 'object') current[parts[i]] = {};
          else current[parts[i]] = { ...current[parts[i]] };
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        topLevelUpdates[topKey] = resultData[topKey];
      } else {
        resultData[key] = value;
        topLevelUpdates[key] = value;
      }
    }
  }

  // Always update local emulation as a cache
  const list = getEmulatedTable(docRef.table);
  const index = list.findIndex(row => (row.key === docRef.id || row.id === docRef.id));
  if (index >= 0) {
    list[index] = { ...list[index], ...topLevelUpdates };
    saveEmulatedTable(docRef.table, list);
  }

  if (supabase) {
    try {
      const { data: resData, error } = await supabase
        .from(docRef.table)
        .update(topLevelUpdates)
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id)
        .select();
      
      if (!error && resData && resData.length > 0) return;
    } catch (e) {
      console.warn(\`[Supabase] updateDoc failed with error:\`, e);
    }
  }
}`;

code = code.replace(/export async function updateDoc\(docRef: SupabaseDocRef, data: any\): Promise<void> \{[\s\S]*?catch \(e\) \{\s*console\.warn\(\`\[Supabase\] updateDoc failed with error, falling back to Local Storage:\`, e\);\s*\}\s*\}\s*\}/, replaceCode);

fs.writeFileSync('src/supabase.ts', code);
