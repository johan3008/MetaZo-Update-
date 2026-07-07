import fs from 'fs';

let content = fs.readFileSync('src/supabase.ts', 'utf8');

// We want to replace the `throw error` lines with a warning and a fallback.

content = content.replace(
  /export async function getDoc.*?return new DocumentSnapshot\(docRef\.id, found \|\| null\);\n\}/s,
  `export async function getDoc(docRef: SupabaseDocRef): Promise<DocumentSnapshot> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(docRef.table)
        .select('*')
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id)
        .single();
      if (!error || error.code === 'PGRST116') {
        return new DocumentSnapshot(docRef.id, data || null);
      }
      console.warn('[Supabase] getDoc error, falling back:', error);
    } catch (e) {
      console.warn('[Supabase] getDoc exception, falling back:', e);
    }
  }
  const list = getEmulatedTable(docRef.table);
  const found = list.find(row => (row.key === docRef.id || row.id === docRef.id));
  return new DocumentSnapshot(docRef.id, found || null);
}`
);

content = content.replace(
  /export async function setDoc.*?saveEmulatedTable\(docRef\.table, list\);\n\}/s,
  `export async function setDoc(docRef: SupabaseDocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const processedData = { ...(data || {}) };
  if (docRef.table === 'keys') {
    processedData.key = docRef.id;
  } else {
    processedData.id = docRef.id;
  }
  if (supabase) {
    try {
      const { error } = await supabase.from(docRef.table).upsert(processedData);
      if (!error) return;
      console.warn('[Supabase] setDoc error, falling back:', error);
    } catch (e) {
      console.warn('[Supabase] setDoc exception, falling back:', e);
    }
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

content = content.replace(
  /export async function updateDoc.*?saveEmulatedTable\(docRef\.table, list\);\n\}/s,
  `export async function updateDoc(docRef: SupabaseDocRef, data: any): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from(docRef.table)
        .update(data)
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
      if (!error) return;
      console.warn('[Supabase] updateDoc error, falling back:', error);
    } catch (e) {
      console.warn('[Supabase] updateDoc exception, falling back:', e);
    }
  }
  const list = getEmulatedTable(docRef.table);
  const index = list.findIndex(row => (row.key === docRef.id || row.id === docRef.id));
  if (index >= 0) {
    list[index] = { ...list[index], ...data };
    saveEmulatedTable(docRef.table, list);
  }
}`
);

content = content.replace(
  /export async function deleteDoc.*?saveEmulatedTable\(docRef\.table, filtered\);\n\}/s,
  `export async function deleteDoc(docRef: SupabaseDocRef): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from(docRef.table)
        .delete()
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
      if (!error) return;
      console.warn('[Supabase] deleteDoc error, falling back:', error);
    } catch (e) {
      console.warn('[Supabase] deleteDoc exception, falling back:', e);
    }
  }
  const list = getEmulatedTable(docRef.table);
  const filtered = list.filter(row => (row.key !== docRef.id && row.id !== docRef.id));
  saveEmulatedTable(docRef.table, filtered);
}`
);

content = content.replace(
  /export async function addDoc.*?return new SupabaseDocRef\(collectionRef\.table, generatedId\);\n\}/s,
  `export async function addDoc(collectionRef: SupabaseCollectionRef, data: any): Promise<SupabaseDocRef> {
  const generatedId = 'gen-' + Math.random().toString(36).substring(2, 9);
  const processedData = { ...data, id: generatedId };
  if (collectionRef.parentId) {
    processedData.uid = collectionRef.parentId;
  }
  if (supabase) {
    try {
      const { error } = await supabase.from(collectionRef.table).insert(processedData);
      if (!error) return new SupabaseDocRef(collectionRef.table, generatedId);
      console.warn('[Supabase] addDoc error, falling back:', error);
    } catch (e) {
      console.warn('[Supabase] addDoc exception, falling back:', e);
    }
  }
  const list = getEmulatedTable(collectionRef.table);
  list.push(processedData);
  saveEmulatedTable(collectionRef.table, list);
  return new SupabaseDocRef(collectionRef.table, generatedId);
}`
);

content = content.replace(
  /export async function getDocs.*?return new QuerySnapshot\(docs\);\n\}/s,
  `export async function getDocs(refOrQuery: any): Promise<QuerySnapshot> {
  const table = refOrQuery.table;
  const parentId = refOrQuery.parentId;
  const constraints = refOrQuery instanceof SupabaseQuery ? refOrQuery.constraints : [];
  if (supabase) {
    try {
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
      if (!error) {
        const docs = (data || []).map((row: any) => new DocumentSnapshot(row.key || row.id || '', row));
        return new QuerySnapshot(docs);
      }
      console.warn('[Supabase] getDocs error, falling back:', error);
    } catch (e) {
      console.warn('[Supabase] getDocs exception, falling back:', e);
    }
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
