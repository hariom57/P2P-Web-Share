const DB_NAME = 'p2p-share-transfer';
const DB_VERSION = 2;
const STORE_NAME = 'checkpoints';
const CHUNK_STORE = 'chunks';

interface CheckpointData {
  role: 'sender' | 'receiver';
  fileName: string;
  fileSize: number;
  totalChunks: number;
  lastSentChunk: number;
  lastReceivedChunk: number;
  lastAcknowledgedChunk: number;
  totalBytesSent: number;
  timestamp: number;
}

interface StoredCheckpoint extends CheckpointData {
  roomId: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'roomId' });
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE)) {
        const chunkStore = db.createObjectStore(CHUNK_STORE, { keyPath: ['roomId', 'sequence'] });
        chunkStore.createIndex('roomId', 'roomId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCheckpoint(roomId: string, data: CheckpointData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ roomId, ...data, timestamp: Date.now() } as StoredCheckpoint);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getCheckpoint(roomId: string): Promise<CheckpointData & { roomId: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(roomId);
    request.onsuccess = () => {
      db.close();
      resolve((request.result as CheckpointData & { roomId: string }) || null);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function deleteCheckpoint(roomId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(roomId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getAllCheckpoints(): Promise<(CheckpointData & { roomId: string })[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function clearAllCheckpoints(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function saveChunk(roomId: string, sequence: number, data: Uint8Array): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNK_STORE, 'readwrite');
    tx.objectStore(CHUNK_STORE).put({ roomId, sequence, data });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadAllChunks(roomId: string): Promise<Map<number, Uint8Array>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNK_STORE, 'readonly');
    const index = tx.objectStore(CHUNK_STORE).index('roomId');
    const request = index.getAll(IDBKeyRange.only(roomId));
    request.onsuccess = () => {
      db.close();
      const records = (request.result || []) as Array<{ sequence: number; data: Uint8Array }>;
      const map = new Map<number, Uint8Array>();
      for (const r of records) {
        map.set(r.sequence, r.data);
      }
      resolve(map);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function deleteRoomChunks(roomId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNK_STORE, 'readwrite');
    const index = tx.objectStore(CHUNK_STORE).index('roomId');
    const request = index.openCursor(IDBKeyRange.only(roomId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
