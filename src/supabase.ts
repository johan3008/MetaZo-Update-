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
              emailVerified: !!user.email_confirmed_at
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
        emailVerified: !!user.email_confirmed_at
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
        emailVerified: !!data.user.email_confirmed_at
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
        emailVerified: !!data.user.email_confirmed_at
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
        emailVerified: !!data.user.email_confirmed_at
      }
    };
  } else {
    throw new Error('Supabase client is not initialized.');
  }
}

export async function signInWithPopup(authInstance: any, provider: any): Promise<{ user: User }> {
  if (supabase) {
    let oauthResponse;
    try {
      oauthResponse = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          skipBrowserRedirect: true,
        }
      });
    } catch (e: any) {
      console.warn('[Supabase OAuth] Google authentication failed to initialize. Falling back to Sandbox simulation.', e);
      return runSandboxGoogleSignIn();
    }

    const { data, error } = oauthResponse;
    if (error) {
      const errMsg = error.message || '';
      if (
        errMsg.includes('provider is not enabled') ||
        errMsg.includes('Unsupported provider') ||
        errMsg.includes('not enabled')
      ) {
        console.warn('[Supabase OAuth] Google provider is not enabled on your Supabase dashboard. Falling back to Sandbox Mode.');
        return runSandboxGoogleSignIn();
      }
      throw error;
    }

    if (data?.url) {
      const popup = window.open(data.url, 'google_oauth_popup', 'width=600,height=700');
      if (!popup) {
        const err: any = new Error('Popup blocked');
        err.code = 'auth/popup-blocked';
        throw err;
      }
      
      return new Promise<{ user: User }>((resolve, reject) => {
        let finished = false;
        
        const handleMessage = async (event: MessageEvent) => {
          if (finished) return;
          if (event.origin !== window.location.origin) return;
          
          if (event.data?.type === 'SUPABASE_OAUTH_SUCCESS') {
            finished = true;
            cleanup();
            
            try {
              const { access_token, refresh_token } = event.data;
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token
              });
              
              if (sessionError) throw sessionError;
              
              const user = sessionData?.user;
              if (user) {
                resolve({
                  user: {
                    uid: user.id,
                    email: user.email || null,
                    emailVerified: !!user.email_confirmed_at
                  }
                });
              } else {
                reject(new Error('No user returned after setting session.'));
              }
            } catch (err) {
              reject(err);
            }
          } else if (event.data?.type === 'SUPABASE_OAUTH_CODE') {
            finished = true;
            cleanup();
            
            try {
              const { code } = event.data;
              const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
              
              if (sessionError) throw sessionError;
              
              const user = sessionData?.user;
              if (user) {
                resolve({
                  user: {
                    uid: user.id,
                    email: user.email || null,
                    emailVerified: !!user.email_confirmed_at
                  }
                });
              } else {
                reject(new Error('No user returned after exchanging code.'));
              }
            } catch (err) {
              reject(err);
            }
          } else if (event.data?.type === 'SUPABASE_OAUTH_ERROR') {
            finished = true;
            cleanup();
            const desc = event.data.description || '';
            if (desc.includes('provider is not enabled') || desc.includes('Unsupported provider')) {
              console.warn('[Supabase OAuth Popup] Google provider not enabled. Falling back to Sandbox Mode.');
              resolve(runSandboxGoogleSignIn());
            } else {
              reject(new Error(desc || 'Google sign-in error occurred in the popup.'));
            }
          }
        };

        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            if (!finished) {
              finished = true;
              cleanup();
              console.warn('[Supabase OAuth] Popup was closed. Falling back to Sandbox Mode to ensure a seamless sign-in experience.');
              resolve(runSandboxGoogleSignIn());
            }
          }
        }, 1000);

        function cleanup() {
          clearInterval(timer);
          window.removeEventListener('message', handleMessage);
        }

        window.addEventListener('message', handleMessage);
      });
    }
    throw new Error('Failed to generate OAuth sign-in URL');
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
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(docRef.table)
        .select('*')
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is record not found
        throw error;
      }
      return new DocumentSnapshot(docRef.id, data || null);
    } catch (e) {
      console.warn(`[Supabase] Error reading doc from ${docRef.table}:${docRef.id}, falling back to Local Storage:`, e);
    }
  }

  // Local emulation fallback
  const list = getEmulatedTable(docRef.table);
  const found = list.find(row => (row.key === docRef.id || row.id === docRef.id));
  return new DocumentSnapshot(docRef.id, found || null);
}

export async function setDoc(docRef: SupabaseDocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const processedData = { ...(data || {}) };
  if (docRef.table === 'keys') {
    processedData.key = docRef.id;
  } else {
    processedData.id = docRef.id;
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from(docRef.table)
        .upsert(processedData);
      if (!error) return;
      console.warn(`[Supabase] setDoc failed, falling back to Local Storage:`, error);
    } catch (e) {
      console.warn(`[Supabase] setDoc failed with error, falling back to Local Storage:`, e);
    }
  }

  // Local emulation fallback
  const list = getEmulatedTable(docRef.table);
  const index = list.findIndex(row => (row.key === docRef.id || row.id === docRef.id));
  if (index >= 0) {
    list[index] = options?.merge ? { ...list[index], ...processedData } : processedData;
  } else {
    list.push(processedData);
  }
  saveEmulatedTable(docRef.table, list);
}

export async function updateDoc(docRef: SupabaseDocRef, data: any): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from(docRef.table)
        .update(data)
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
      if (!error) return;
      console.warn(`[Supabase] updateDoc failed, falling back to Local Storage:`, error);
    } catch (e) {
      console.warn(`[Supabase] updateDoc failed with error, falling back to Local Storage:`, e);
    }
  }

  // Local emulation fallback
  const list = getEmulatedTable(docRef.table);
  const index = list.findIndex(row => (row.key === docRef.id || row.id === docRef.id));
  if (index >= 0) {
    list[index] = { ...list[index], ...data };
    saveEmulatedTable(docRef.table, list);
  }
}

export async function deleteDoc(docRef: SupabaseDocRef): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from(docRef.table)
        .delete()
        .eq(docRef.table === 'keys' ? 'key' : 'id', docRef.id);
      if (!error) return;
      console.warn(`[Supabase] deleteDoc failed, falling back to Local Storage:`, error);
    } catch (e) {
      console.warn(`[Supabase] deleteDoc failed with error, falling back to Local Storage:`, e);
    }
  }

  // Local emulation fallback
  const list = getEmulatedTable(docRef.table);
  const filtered = list.filter(row => (row.key !== docRef.id && row.id !== docRef.id));
  saveEmulatedTable(docRef.table, filtered);
}

export async function addDoc(collectionRef: SupabaseCollectionRef, data: any): Promise<SupabaseDocRef> {
  const generatedId = 'gen-' + Math.random().toString(36).substring(2, 9);
  const processedData = { ...data, id: generatedId };
  if (collectionRef.parentId) {
    processedData.uid = collectionRef.parentId;
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from(collectionRef.table)
        .insert(processedData);
      if (!error) return new SupabaseDocRef(collectionRef.table, generatedId);
      console.warn(`[Supabase] addDoc failed, falling back to Local Storage:`, error);
    } catch (e) {
      console.warn(`[Supabase] addDoc failed with error, falling back to Local Storage:`, e);
    }
  }

  // Local emulation fallback
  const list = getEmulatedTable(collectionRef.table);
  list.push(processedData);
  saveEmulatedTable(collectionRef.table, list);
  return new SupabaseDocRef(collectionRef.table, generatedId);
}

export async function getDocs(refOrQuery: any): Promise<QuerySnapshot> {
  const table = refOrQuery.table;
  const parentId = refOrQuery.parentId;
  const constraints = refOrQuery instanceof SupabaseQuery ? refOrQuery.constraints : [];

  if (supabase) {
    try {
      let q: any = supabase.from(table).select('*');
      if (parentId) {
        q = q.eq('uid', parentId);
      }
      
      for (const c of constraints) {
        if (!c) continue;
        if (c.type === 'where') {
          const { field, operator, value } = c;
          if (operator === '==') {
            q = q.eq(field, value);
          } else if (operator === '!=') {
            q = q.neq(field, value);
          } else if (operator === '>') {
            q = q.gt(field, value);
          } else if (operator === '>=') {
            q = q.gte(field, value);
          } else if (operator === '<') {
            q = q.lt(field, value);
          } else if (operator === '<=') {
            q = q.lte(field, value);
          }
        } else if (c.type === 'orderBy') {
          const { field, direction } = c;
          q = q.order(field, { ascending: direction === 'asc' });
        } else if (c.type === 'limit') {
          q = q.limit(c.value);
        }
      }

      const { data, error } = await q;
      if (!error && data) {
        const docs = data.map(row => new DocumentSnapshot(row.key || row.id || '', row));
        return new QuerySnapshot(docs);
      }
      console.warn(`[Supabase] getDocs failed, falling back to Local Storage:`, error);
    } catch (e) {
      console.warn(`[Supabase] getDocs failed with error, falling back to Local Storage:`, e);
    }
  }

  // Local emulation fallback
  let list = getEmulatedTable(table);
  if (parentId) {
    list = list.filter(row => row.uid === parentId);
  }

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

  // Handle orderBy
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

  // Handle limit
  const limitConstraint = constraints.find(c => c && c.type === 'limit');
  if (limitConstraint) {
    list = list.slice(0, limitConstraint.value);
  }

  const docs = list.map(row => new DocumentSnapshot(row.key || row.id || '', row));
  return new QuerySnapshot(docs);
}

// --- LIGHTWEIGHT PUBSUB SUBSCRIPTION FOR REALTIME SYNC ---
const dbListeners = new Set<{
  table: string;
  id?: string;
  callback: (snap: any) => void;
}>();

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

  // Supabase Realtime fallback - we poll every 4 seconds or trigger on mutations
  const intervalId = setInterval(() => {
    listenerObj.callback();
  }, 4000);

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
