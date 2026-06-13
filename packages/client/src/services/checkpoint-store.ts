const DB_NAME = 'p2p-share-transfer';
const DB_VERSION = 1;
const STORE_NAME = 'checkpoints';

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
