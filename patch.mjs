import fs from 'fs';

let content = fs.readFileSync('src/supabase.ts', 'utf8');

// Replace getDoc
content = content.replace(
  /export async function getDoc.*?return new DocumentSnapshot\(docRef\.id\, found \|\| null\);\n\}/s,
  `export async function getDoc(docRef: SupabaseDocRef): Promise<DocumentSnapshot> {
  if (supabase) {
    const { data, error } = await supabase
      .from(docRef.table)
      .select('*')
      .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return new DocumentSnapshot(docRef.id, data || null);
  }
  const list = getEmulatedTable(docRef.table);
  const found = list.find(row => (row.key === docRef.id || row.id === docRef.id));
  return new DocumentSnapshot(docRef.id, found || null);
}`
);

// Replace setDoc
content = content.replace(
  /export async function setDoc.*?saveEmulatedTable\(docRef\.table\, list\);\n\}/s,
  `export async function setDoc(docRef: SupabaseDocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const processedData = { ...(data || {}) };
  if (docRef.table === 'keys') {
    processedData.key = docRef.id;
  } else {
    processedData.id = docRef.id;
  }
  if (supabase) {
    const { error } = await supabase.from(docRef.table).upsert(processedData);
    if (error) throw error;
    return;
  }
  const list = getEmulatedTable(docRef.table);
  const index = list.findIndex(row => (row.key === docRef.id || row.id === docRef.id));
  if (index >= 0) {
    list[index] = options?.merge ? { ...list[index], ...processedData } : processedData;
  } else {
    list.push(processedData);
  }
  saveEmulatedTable(docRef.table, list);
}`
);

// Replace updateDoc
content = content.replace(
  /export async function updateDoc.*?saveEmulatedTable\(docRef\.table\, list\);\n\}/s,
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

// Replace deleteDoc
content = content.replace(
  /export async function deleteDoc.*?saveEmulatedTable\(docRef\.table\, filtered\);\n\}/s,
  `export async function deleteDoc(docRef: SupabaseDocRef): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from(docRef.table)
      .delete()
      .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
    if (error) throw error;
    return;
  }
  const list = getEmulatedTable(docRef.table);
  const filtered = list.filter(row => (row.key !== docRef.id && row.id !== docRef.id));
  saveEmulatedTable(docRef.table, filtered);
}`
);

// Replace addDoc
content = content.replace(
  /export async function addDoc.*?return new SupabaseDocRef\(collectionRef\.table\, generatedId\);\n\}/s,
  `export async function addDoc(collectionRef: SupabaseCollectionRef, data: any): Promise<SupabaseDocRef> {
  const generatedId = 'gen-' + Math.random().toString(36).substring(2, 9);
  const processedData = { ...data, id: generatedId };
  if (collectionRef.parentId) {
    processedData.uid = collectionRef.parentId;
  }
  if (supabase) {
    const { error } = await supabase.from(collectionRef.table).insert(processedData);
    if (error) throw error;
    return new SupabaseDocRef(collectionRef.table, generatedId);
  }
  const list = getEmulatedTable(collectionRef.table);
  list.push(processedData);
  saveEmulatedTable(collectionRef.table, list);
  return new SupabaseDocRef(collectionRef.table, generatedId);
}`
);

// Replace getDocs
content = content.replace(
  /export async function getDocs.*?return new QuerySnapshot\(docs\);\n\}/s,
  `export async function getDocs(refOrQuery: any): Promise<QuerySnapshot> {
  const table = refOrQuery.table;
  const parentId = refOrQuery.parentId;
  const constraints = refOrQuery instanceof SupabaseQuery ? refOrQuery.constraints : [];
  if (supabase) {
    let q: any = supabase.from(table).select('*');
    if (parentId) q = q.eq('uid', parentId);
    for (const c of constraints) {
      if (!c) continue;
      if (c.type === 'where') {
        const { field, operator, value } = c;
        if (operator === '==') q = q.eq(field, value);
        else if (operator === '!=') q = q.neq(field, value);
        else if (operator === '>') q = q.gt(field, value);
        else if (operator === '>=') q = q.gte(field, value);
        else if (operator === '<') q = q.lt(field, value);
        else if (operator === '<=') q = q.lte(field, value);
      } else if (c.type === 'orderBy') {
        const { field, direction } = c;
        q = q.order(field, { ascending: direction === 'asc' });
      } else if (c.type === 'limit') {
        q = q.limit(c.value);
      }
    }
    const { data, error } = await q;
    if (error) throw error;
    const docs = (data || []).map((row: any) => new DocumentSnapshot(row.key || row.id || '', row));
    return new QuerySnapshot(docs);
  }
  
  let list = getEmulatedTable(table);
  if (parentId) list = list.filter(row => row.uid === parentId);
  for (const c of constraints) {
    if (!c) continue;
    if (c.type === 'where') {
      const { field, operator, value } = c;
      list = list.filter(row => {
        const v = row[field];
        if (operator === '==') return v === value;
        if (operator === '!=') return v !== value;
        if (operator === '>') return v > value;
        if (operator === '>=') return v >= value;
        if (operator === '<') return v < value;
        if (operator === '<=') return v <= value;
        return true;
      });
    }
  }
  const orderByConstraint = constraints.find(c => c && c.type === 'orderBy');
  if (orderByConstraint) {
    const { field, direction } = orderByConstraint;
    list.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      if (valA === undefined) return 1;
      if (valB === undefined) return -1;
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  const limitConstraint = constraints.find(c => c && c.type === 'limit');
  if (limitConstraint) list = list.slice(0, limitConstraint.value);
  const docs = list.map(row => new DocumentSnapshot(row.key || row.id || '', row));
  return new QuerySnapshot(docs);
}`
);

fs.writeFileSync('src/supabase.ts', content, 'utf8');
