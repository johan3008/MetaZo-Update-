import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  push, 
  onValue 
} from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the requested Realtime Database URL
export const rtdb = getDatabase(app, "https://metazoai-default-rtdb.asia-southeast1.firebasedatabase.app/");
export const db = rtdb;

// --- COMPATIBILITY ADAPTER FROM FIRESTORE TO REALTIME DATABASE ---

export class FirestoreDocRef {
  constructor(public path: string) {}
}

export class FirestoreCollectionRef {
  constructor(public path: string) {}
}

export class FirestoreQuery {
  constructor(public path: string, public constraints: any[]) {}
}

export class DocumentSnapshot {
  public id: string;
  private _data: any;
  private _exists: boolean;

  constructor(id: string, data: any) {
    this.id = id;
    this._data = data;
    this._exists = data !== null && data !== undefined;
  }

  exists() {
    return this._exists;
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

// Replace special sentinel serverTimestamp values with ISO string timestamps
function replaceServerTimestamps(obj: any): any {
  if (obj === '__SERVER_TIMESTAMP__') {
    return new Date().toISOString();
  }
  if (obj && typeof obj === 'object') {
    const copy = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      (copy as any)[key] = replaceServerTimestamps(obj[key]);
    }
    return copy;
  }
  return obj;
}

function applyConstraints(docs: DocumentSnapshot[], constraints: any[]): DocumentSnapshot[] {
  let result = [...docs];

  for (const c of constraints) {
    if (!c) continue;
    if (c.type === 'where') {
      const { field, operator, value } = c;
      result = result.filter(doc => {
        const data = doc.data();
        const fieldValue = data ? data[field] : undefined;
        if (fieldValue === undefined) return false;
        
        const left = fieldValue;
        const right = value;

        switch (operator) {
          case '==': return left === right;
          case '!=': return left !== right;
          case '>': return left > right;
          case '>=': return left >= right;
          case '<': return left < right;
          case '<=': return left <= right;
          case 'array-contains': return Array.isArray(left) && left.includes(right);
          default: return false;
        }
      });
    }
  }

  // Handle orderBy
  const orderByConstraint = constraints.find(c => c && c.type === 'orderBy');
  if (orderByConstraint) {
    const { field, direction } = orderByConstraint;
    result.sort((a, b) => {
      const valA = a.data()?.[field];
      const valB = b.data()?.[field];
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
    const { value } = limitConstraint;
    result = result.slice(0, value);
  }

  return result;
}

export function doc(dbInstance: any, pathOrCollection: any, ...segments: string[]): FirestoreDocRef {
  let finalPath = '';
  if (pathOrCollection instanceof FirestoreCollectionRef) {
    finalPath = pathOrCollection.path;
  } else if (pathOrCollection instanceof FirestoreDocRef) {
    finalPath = pathOrCollection.path;
  } else if (pathOrCollection instanceof FirestoreQuery) {
    finalPath = pathOrCollection.path;
  } else if (typeof pathOrCollection === 'string') {
    finalPath = pathOrCollection;
  }
  
  if (segments.length > 0) {
    finalPath = finalPath ? `${finalPath}/${segments.join('/')}` : segments.join('/');
  }
  finalPath = finalPath.replace(/\/+/g, '/');
  return new FirestoreDocRef(finalPath);
}

export function collection(dbInstance: any, path: string, ...segments: string[]): FirestoreCollectionRef {
  let finalPath = path;
  if (segments.length > 0) {
    finalPath = finalPath ? `${finalPath}/${segments.join('/')}` : segments.join('/');
  }
  return new FirestoreCollectionRef(finalPath.replace(/\/+/g, '/'));
}

export async function getDoc(docRef: FirestoreDocRef): Promise<DocumentSnapshot> {
  const dbRef = ref(rtdb, docRef.path);
  const snapshot = await get(dbRef);
  const id = docRef.path.split('/').pop() || '';
  return new DocumentSnapshot(id, snapshot.val());
}

export async function getDocs(collectionRefOrQuery: any): Promise<QuerySnapshot> {
  const isQuery = collectionRefOrQuery instanceof FirestoreQuery;
  const path = isQuery ? collectionRefOrQuery.path : (collectionRefOrQuery.path || collectionRefOrQuery);
  
  const dbRef = ref(rtdb, path);
  const snapshot = await get(dbRef);
  const val = snapshot.val();
  let docs: DocumentSnapshot[] = [];
  if (val && typeof val === 'object') {
    Object.keys(val).forEach(key => {
      docs.push(new DocumentSnapshot(key, val[key]));
    });
  }
  
  if (isQuery && collectionRefOrQuery.constraints) {
    docs = applyConstraints(docs, collectionRefOrQuery.constraints);
  }
  return new QuerySnapshot(docs);
}

export async function setDoc(docRef: FirestoreDocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  const dbRef = ref(rtdb, docRef.path);
  const processedData = replaceServerTimestamps(data);
  if (options?.merge) {
    await update(dbRef, processedData);
  } else {
    await set(dbRef, processedData);
  }
}

export async function updateDoc(docRef: FirestoreDocRef, data: any): Promise<void> {
  const dbRef = ref(rtdb, docRef.path);
  const processedData = replaceServerTimestamps(data);
  await update(dbRef, processedData);
}

export async function deleteDoc(docRef: FirestoreDocRef): Promise<void> {
  const dbRef = ref(rtdb, docRef.path);
  await remove(dbRef);
}

export async function addDoc(collectionRef: FirestoreCollectionRef, data: any): Promise<FirestoreDocRef> {
  const dbRef = ref(rtdb, collectionRef.path);
  const processedData = replaceServerTimestamps(data);
  const newRef = push(dbRef);
  const id = newRef.key || '';
  await set(newRef, processedData);
  return new FirestoreDocRef(`${collectionRef.path}/${id}`);
}

export function onSnapshot(
  refOrQuery: any,
  onNext: (snapshot: any) => void,
  onError?: (error: Error) => void
): () => void {
  const isQuery = refOrQuery instanceof FirestoreQuery;
  const path = isQuery ? refOrQuery.path : refOrQuery.path;
  const dbRef = ref(rtdb, path);
  const listener = onValue(dbRef, (snapshot) => {
    const pathSegments = path.split('/').filter(Boolean);
    const isDoc = pathSegments.length % 2 === 0;
    
    if (isDoc) {
      const id = pathSegments[pathSegments.length - 1] || '';
      onNext(new DocumentSnapshot(id, snapshot.val()));
    } else {
      const val = snapshot.val();
      let docs: DocumentSnapshot[] = [];
      if (val && typeof val === 'object') {
        Object.keys(val).forEach(key => {
          docs.push(new DocumentSnapshot(key, val[key]));
        });
      }
      if (isQuery && refOrQuery.constraints) {
        docs = applyConstraints(docs, refOrQuery.constraints);
      }
      onNext(new QuerySnapshot(docs));
    }
  }, (error) => {
    if (onError) onError(error);
  });
  return () => {
    listener();
  };
}

export function query(collectionRef: any, ...constraints: any[]): FirestoreQuery {
  const path = collectionRef.path;
  return new FirestoreQuery(path, constraints);
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
  return '__SERVER_TIMESTAMP__';
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

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? (error as any).message : String((error as any)?.message || error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  const isPermissionDenied = errMsg.toLowerCase().includes('permission') || 
                             errMsg.toLowerCase().includes('denied');

  if (isPermissionDenied) {
    // Silently handle sandbox mode without console spam
  } else {
    console.error('Database Error: ', JSON.stringify(errInfo));
  }
  
  if (errInfo.error.includes('Quota exceeded')) {
    localStorage.setItem('last_firestore_quota_error', new Date().toDateString());
  }
  
  return new Error(JSON.stringify(errInfo));
}
