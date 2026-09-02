import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase Client if credentials exist
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (supabase) {
  console.log('[Supabase] Client initialized successfully.');
} else {
  console.log('[Supabase] Credentials missing. Running in robust Sandbox Offline Mode.');
}

// Ensure .env.example contains Supabase variables
// We will add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.example

// --- AUTH TYPE COMPATIBILITY ---
export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
  tenantId?: string | null;
  providerData?: any[];
}

export class GoogleAuthProvider {
  setCustomParameters(params: any) {
    // compatibility shim
  }
}

// --- AUTH EMULATOR FOR SANDBOX MODE ---
const SANDBOX_USER_KEY = 'mz_supabase_sandbox_user';
const SANDBOX_ACCOUNTS_KEY = 'mz_supabase_sandbox_accounts';

function getSandboxUser(): User | null {
  const str = localStorage.getItem(SANDBOX_USER_KEY);
  if (str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveSandboxUser(user: User | null) {
  if (user) {
    localStorage.setItem(SANDBOX_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SANDBOX_USER_KEY);
  }
}

function getSandboxAccounts(): any[] {
  const str = localStorage.getItem(SANDBOX_ACCOUNTS_KEY);
  if (str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveSandboxAccount(email: string, pass: string) {
  const list = getSandboxAccounts();
  if (!list.some(a => a.email.toLowerCase() === email.toLowerCase())) {
    list.push({ email, pass, uid: 'sandbox-' + Math.random().toString(36).substring(2, 9) });
    localStorage.setItem(SANDBOX_ACCOUNTS_KEY, JSON.stringify(list));
  }
}

// --- AUTH API ADAPTERS ---
export const auth = {
  get currentUser(): User | null {
    if (supabase) {
      // Return local cached user session or handle reactively
      const sessionStr = localStorage.getItem('supabase.auth.token');
      if (sessionStr) {
        try {
          const parsed = JSON.parse(sessionStr);
          const user = parsed?.currentSession?.user;
          if (user) {
            return {
              uid: user.id,
              email: user.email,
              emailVerified: !!user.email_confirmed_at,
              displayName: user.user_metadata?.full_name || user.user_metadata?.name || null,
              photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
            };
          }
        } catch (e) {}
      }
    }
    return getSandboxUser();
  }
};

const authListeners = new Set<(user: User | null) => void>();

export function onAuthStateChanged(authInstance: any, callback: (user: User | null) => void) {
  authListeners.add(callback);
  
  // Call immediately with current state
  const currentUser = auth.currentUser;
  callback(currentUser);

  let unsubscribeSupabase: (() => void) | null = null;

  if (supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const mappedUser: User | null = user ? {
        uid: user.id,
        email: user.email || null,
        emailVerified: !!user.email_confirmed_at,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || null,
        photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      } : null;
      

      // Sync listeners
      authListeners.forEach(cb => cb(mappedUser));
    });
    unsubscribeSupabase = () => subscription.unsubscribe();
  }

  return () => {
    authListeners.delete(callback);
    if (unsubscribeSupabase) {
      unsubscribeSupabase();
    }
  };
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string): Promise<{ user: User }> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');
    return {
      user: {
        uid: data.user.id,
        email: data.user.email || null,
        emailVerified: !!data.user.email_confirmed_at,
        displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
        photoURL: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null
      }
    };
  } else {
    const accounts = getSandboxAccounts();
    const found = accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.pass === pass);
    if (!found) {
      const err: any = new Error('Invalid email or password');
      err.code = 'auth/invalid-credential';
      throw err;
    }
    const user = { uid: found.uid, email: found.email };
    saveSandboxUser(user);
    authListeners.forEach(cb => cb(user));
    return { user };
  }
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string): Promise<{ user: User }> {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');
    return {
      user: {
        uid: data.user.id,
        email: data.user.email || null,
        emailVerified: !!data.user.email_confirmed_at,
        displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
        photoURL: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null
      }
    };
  } else {
    const accounts = getSandboxAccounts();
    if (accounts.some(a => a.email.toLowerCase() === email.toLowerCase())) {
      const err: any = new Error('Email already in use');
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    saveSandboxAccount(email, pass);
    const updatedAccounts = getSandboxAccounts();
    const found = updatedAccounts.find(a => a.email.toLowerCase() === email.toLowerCase());
    const user = { uid: found.uid, email: found.email };
    saveSandboxUser(user);
    authListeners.forEach(cb => cb(user));
    return { user };
  }
}

export async function sendPasswordResetEmail(authInstance: any, email: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  } else {
    // sandbox simulation
    console.log(`[Sandbox] Password reset email simulated for: ${email}`);
  }
}

export function runSandboxGoogleSignIn(): { user: User } {
  // Simulate instant Google Sign In
  const email = 'sandbox.google.user@example.com';
  const accounts = getSandboxAccounts();
  let found = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (!found) {
    saveSandboxAccount(email, 'google-oauth-dummy-pass');
    found = getSandboxAccounts().find(a => a.email.toLowerCase() === email.toLowerCase());
  }
  const user = { uid: found!.uid, email: found!.email };
  saveSandboxUser(user);
  authListeners.forEach(cb => cb(user));
  return { user };
}

export async function signInWithTokens(accessToken: string, refreshToken: string): Promise<{ user: User }> {
  if (supabase) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned after setting session.');
    return {
      user: {
        uid: data.user.id,
        email: data.user.email || null,
        emailVerified: !!data.user.email_confirmed_at,
        displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
        photoURL: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null
      }
    };
  } else {
    throw new Error('Supabase client is not initialized.');
  }
}

export async function signInWithPopup(authInstance: any, provider: any): Promise<{ user: User }> {
  if (supabase) {
    try {
      // Use standard redirect instead of popup to avoid popup blockers and cross-origin issues on Vercel
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      
      // Because we use standard redirect, the page will navigate away.
      // We return a never-resolving promise so the UI stays in loading state until navigation happens.
      return new Promise(() => {});
    } catch (e: any) {
      console.warn('[Supabase OAuth] Google authentication failed to initialize. Falling back to Sandbox simulation.', e);
      return runSandboxGoogleSignIn();
    }
  } else {
    return runSandboxGoogleSignIn();
  }
}

export async function signOut(authInstance: any): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  } else {
    saveSandboxUser(null);
    authListeners.forEach(cb => cb(null));
  }
}

// --- DATABASE COMPATIBILITY OBJECTS ---
export class SupabaseDocRef {
  constructor(public table: string, public id: string) {}
}

export class SupabaseCollectionRef {
  constructor(public table: string, public parentId?: string) {}
}

export class SupabaseQuery {
  constructor(public table: string, public constraints: any[], public parentId?: string) {}
}

export class DocumentSnapshot {
  constructor(public id: string, private _data: any) {}
  exists() {
    return this._data !== null && this._data !== undefined;
  }
  data() {
    return this._data || {};
  }
}

export class QuerySnapshot {
  constructor(public docs: DocumentSnapshot[]) {}
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
  forEach(callback: (doc: DocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// --- DB CONSTRUCTORS ---
export const db = {}; // Shimming db instance

export function doc(dbInstance: any, path: string, ...segments: string[]): SupabaseDocRef {
  const parts = [path, ...segments].filter(Boolean);
  const table = parts[0];
  const id = parts[1] || 'main';
  return new SupabaseDocRef(table, id);
}

export function collection(dbInstance: any, path: string, ...segments: string[]): SupabaseCollectionRef {
  const parts = [path, ...segments].filter(Boolean);
  const table = parts[0];
  let parentId: string | undefined;
  
  // If we have subcollections like users/uid/backups
  if (parts.length >= 3) {
    // table = parts[2] (e.g. backups), parentId = parts[1] (e.g. uid)
    return new SupabaseCollectionRef(parts[2], parts[1]);
  }
  return new SupabaseCollectionRef(table);
}

export function query(collectionRef: SupabaseCollectionRef, ...constraints: any[]): SupabaseQuery {
  return new SupabaseQuery(collectionRef.table, constraints, collectionRef.parentId);
}

export function where(field: string, operator: string, value: any) {
  return { type: 'where', field, operator, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

// --- LOCAL EMULATION STORAGE KEYS ---
const EMULATED_DB_PREFIX = 'mz_supabase_emulated_';

function getEmulatedTable(table: string): any[] {
  const str = localStorage.getItem(EMULATED_DB_PREFIX + table);
  if (str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveEmulatedTable(table: string, list: any[]) {
  localStorage.setItem(EMULATED_DB_PREFIX + table, JSON.stringify(list));
}

// --- DATABASE FUNCTIONS ---
export async function getDoc(docRef: SupabaseDocRef): Promise<DocumentSnapshot> {
  if (!supabase) {
    const list = getEmulatedTable(docRef.table);
    const found = list.find(item => (docRef.table === 'keys' ? item.key : item.id) === docRef.id);
    return new DocumentSnapshot(docRef.id, found || null);
  }
  const { data, error } = await supabase
    .from(docRef.table)
    .select('*')
    .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[Supabase] getDoc error:', error);
    throw error;
  }
  return new DocumentSnapshot(docRef.id, data || null);
}

// --- LIGHTWEIGHT PUBSUB SUBSCRIPTION FOR REALTIME SYNC ---
const dbListeners = new Set<{
  table: string;
  id?: string;
  callback: (snap?: any) => void;
}>();

export function notifyTableMutation(table: string) {
  setTimeout(() => {
    dbListeners.forEach(listener => {
      if (listener.table === table) {
        try {
          listener.callback();
        } catch (e) {}
      }
    });
  }, 10);
}

export async function setDoc(docRef: SupabaseDocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const processedData = { ...(data || {}) };
  if (docRef.table === 'keys') {
    processedData.key = docRef.id;
  } else {
    processedData.id = docRef.id;
  }

  if (!supabase) {
    const list = getEmulatedTable(docRef.table);
    const keyField = docRef.table === 'keys' ? 'key' : 'id';
    const idx = list.findIndex(item => item[keyField] === docRef.id);
    if (idx >= 0) {
      list[idx] = options?.merge ? { ...list[idx], ...processedData } : processedData;
    } else {
      list.push(processedData);
    }
    saveEmulatedTable(docRef.table, list);
    notifyTableMutation(docRef.table);
    return;
  }
  
  try {
    const { error } = await supabase.from(docRef.table).upsert(processedData);
    if (error) {
      console.warn(`[Supabase] setDoc to ${docRef.table} failed, falling back to local:`, error.message);
      const list = getEmulatedTable(docRef.table);
      const keyField = docRef.table === 'keys' ? 'key' : 'id';
      const idx = list.findIndex(item => item[keyField] === docRef.id);
      if (idx >= 0) {
        list[idx] = options?.merge ? { ...list[idx], ...processedData } : processedData;
      } else {
        list.push(processedData);
      }
      saveEmulatedTable(docRef.table, list);
    }
  } catch (err: any) {
    console.warn(`[Supabase] setDoc exception on ${docRef.table}, falling back to local:`, err);
    const list = getEmulatedTable(docRef.table);
    const keyField = docRef.table === 'keys' ? 'key' : 'id';
    const idx = list.findIndex(item => item[keyField] === docRef.id);
    if (idx >= 0) {
      list[idx] = options?.merge ? { ...list[idx], ...processedData } : processedData;
    } else {
      list.push(processedData);
    }
    saveEmulatedTable(docRef.table, list);
  }
  notifyTableMutation(docRef.table);
}

export async function updateDoc(docRef: SupabaseDocRef, data: any): Promise<void> {
  let topLevelUpdates: any = {};
  
  // Flatten dotted keys
  const hasDottedKeys = Object.keys(data).some(k => k.includes('.'));
  if (hasDottedKeys) {
    const currentData = !supabase 
      ? (getEmulatedTable(docRef.table).find(item => (docRef.table === 'keys' ? item.key : item.id) === docRef.id) || null)
      : (await supabase.from(docRef.table).select('*').eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id).single()).data;
      
    if (currentData) {
      let mergedData = { ...currentData };
      for (const [key, value] of Object.entries(data)) {
        if (key.includes('.')) {
          const parts = key.split('.');
          let topKey = parts[0];
          let current = mergedData;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') current[parts[i]] = {};
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = value;
          topLevelUpdates[topKey] = mergedData[topKey];
        } else {
          topLevelUpdates[key] = value;
        }
      }
    } else {
      topLevelUpdates = { ...data };
    }
  } else {
    topLevelUpdates = { ...data };
  }

  // Remove deleteField
  for (const [key, value] of Object.entries(topLevelUpdates)) {
    if (value && typeof value === 'object' && (value as any).__deleteField) {
      topLevelUpdates[key] = null;
    }
  }

  if (!supabase) {
    const list = getEmulatedTable(docRef.table);
    const keyField = docRef.table === 'keys' ? 'key' : 'id';
    const idx = list.findIndex(item => item[keyField] === docRef.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...topLevelUpdates };
      saveEmulatedTable(docRef.table, list);
    }
    notifyTableMutation(docRef.table);
    return;
  }

  const { error } = await supabase
    .from(docRef.table)
    .update(topLevelUpdates)
    .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
    
  notifyTableMutation(docRef.table);
  if (error) throw error;
}

export async function deleteDoc(docRef: SupabaseDocRef): Promise<void> {
  if (!supabase) {
    const list = getEmulatedTable(docRef.table);
    const keyField = docRef.table === 'keys' ? 'key' : 'id';
    const filtered = list.filter(item => item[keyField] !== docRef.id);
    saveEmulatedTable(docRef.table, filtered);
    notifyTableMutation(docRef.table);
    return;
  }
  const { error } = await supabase
    .from(docRef.table)
    .delete()
    .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
  notifyTableMutation(docRef.table);
  if (error) throw error;
}

export async function addDoc(collectionRef: SupabaseCollectionRef, data: any): Promise<SupabaseDocRef> {
  const generatedId = 'gen-' + Math.random().toString(36).substring(2, 9);
  const processedData = { ...data, id: generatedId };
  if (collectionRef.parentId) {
    processedData.uid = collectionRef.parentId;
  }

  if (!supabase) {
    const list = getEmulatedTable(collectionRef.table);
    list.push(processedData);
    saveEmulatedTable(collectionRef.table, list);
    notifyTableMutation(collectionRef.table);
    return new SupabaseDocRef(collectionRef.table, generatedId);
  }

  const { error } = await supabase.from(collectionRef.table).insert(processedData);
  notifyTableMutation(collectionRef.table);
  if (error) throw error;
  return new SupabaseDocRef(collectionRef.table, generatedId);
}

export async function getDocs(refOrQuery: any): Promise<QuerySnapshot> {
  const table = refOrQuery.table;
  const parentId = refOrQuery.parentId;
  const constraints = refOrQuery instanceof SupabaseQuery ? refOrQuery.constraints : [];
  
  if (!supabase) {
    let list = getEmulatedTable(table);
    if (parentId) {
      list = list.filter(item => item.uid === parentId);
    }
    const docs = list.map((row: any) => new DocumentSnapshot(row.key || row.id || '', row));
    return new QuerySnapshot(docs);
  }

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
  try {
    const { data, error } = await q;
    if (error) {
      console.warn(`[Supabase] getDocs on ${table} failed, falling back to local:`, error.message);
      let list = getEmulatedTable(table);
      if (parentId) {
        list = list.filter(item => item.uid === parentId);
      }
      const docs = list.map((row: any) => new DocumentSnapshot(row.key || row.id || '', row));
      return new QuerySnapshot(docs);
    }
    
    const docs = (data || []).map((row: any) => new DocumentSnapshot(row.key || row.id || '', row));
    return new QuerySnapshot(docs);
  } catch (err: any) {
    console.warn(`[Supabase] getDocs exception on ${table}, falling back to local:`, err);
    let list = getEmulatedTable(table);
    if (parentId) {
      list = list.filter(item => item.uid === parentId);
    }
    const docs = list.map((row: any) => new DocumentSnapshot(row.key || row.id || '', row));
    return new QuerySnapshot(docs);
  }
}

export function onSnapshot(
  refOrQuery: any,
  onNext: (snapshot: any) => void,
  onError?: (error: Error) => void
): () => void {
  const table = refOrQuery.table;
  const isDoc = refOrQuery instanceof SupabaseDocRef;
  const docId = isDoc ? (refOrQuery as SupabaseDocRef).id : undefined;

  const listenerObj = {
    table,
    id: docId,
    callback: async () => {
      try {
        if (isDoc) {
          const snap = await getDoc(refOrQuery);
          onNext(snap);
        } else {
          const snap = await getDocs(refOrQuery);
          onNext(snap);
        }
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  };

  dbListeners.add(listenerObj);

  // Initial trigger
  listenerObj.callback();

  // Supabase Realtime fallback - we poll every 10 seconds or trigger on mutations
  const intervalId = setInterval(() => {
    listenerObj.callback();
  }, 10000);

  return () => {
    dbListeners.delete(listenerObj);
    clearInterval(intervalId);
  };
}

// --- STANDARD ERROR HANDLING SYSTEM ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.warn(`[Supabase/Sandbox] Database error [${operationType}] on [${path}]:`, errMsg);
  return new Error(errMsg);
}

export function deleteField() {
  return { __deleteField: true };
}
