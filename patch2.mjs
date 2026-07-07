import fs from 'fs';

let content = fs.readFileSync('src/supabase.ts', 'utf8');

content = content.replace(
  /export async function updateDoc.*?saveEmulatedTable\(docRef\.table, list\);\n\}/s,
  `export async function updateDoc(docRef: SupabaseDocRef, data: any): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from(docRef.table)
      .update(data)
      .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
    if (error) throw error;
    return;
  }
  const list = getEmulatedTable(docRef.table);
  const index = list.findIndex(row => (row.key === docRef.id || row.id === docRef.id));
  if (index >= 0) {
    list[index] = { ...list[index], ...data };
    saveEmulatedTable(docRef.table, list);
  }
}`
);

fs.writeFileSync('src/supabase.ts', content, 'utf8');
