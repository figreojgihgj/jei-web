const DB_NAME = 'jei-web';
const DB_VERSION = 1;
const STORE_ASSETS = 'editor_assets';
const STORE_PACKS = 'editor_packs';

let dbPromise: Promise<IDBDatabase> | null = null;

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message)
      : String(err);
  return new Error(message);
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) db.createObjectStore(STORE_ASSETS);
      if (!db.objectStoreNames.contains(STORE_PACKS)) db.createObjectStore(STORE_PACKS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toError(req.error));
  });
  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(toError(tx.error));
    tx.onabort = () => reject(toError(tx.error));
  });
}

function reqDone<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toError(req.error));
  });
}

async function getFromStore<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const val = await reqDone(store.get(key) as IDBRequest<T | undefined>);
  await txDone(tx);
  return val;
}

async function setInStore<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.put(value, key);
  await txDone(tx);
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.delete(key);
  await txDone(tx);
}

export async function idbGetBlob(key: string): Promise<Blob | undefined> {
  return getFromStore<Blob>(STORE_ASSETS, key);
}

export async function idbSetBlob(key: string, blob: Blob): Promise<void> {
  await setInStore(STORE_ASSETS, key, blob);
}

export async function idbDeleteBlob(key: string): Promise<void> {
  await deleteFromStore(STORE_ASSETS, key);
}

export async function idbGetPackZip(key: string): Promise<Blob | undefined> {
  return getFromStore<Blob>(STORE_PACKS, key);
}

export async function idbSetPackZip(key: string, blob: Blob): Promise<void> {
  await setInStore(STORE_PACKS, key, blob);
}

export async function idbDeletePackZip(key: string): Promise<void> {
  await deleteFromStore(STORE_PACKS, key);
}

