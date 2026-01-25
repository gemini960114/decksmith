
import { openDB, IDBPDatabase } from 'idb';
import { CONFIG, APP_CONFIG } from '../constants';
import { JobSession, PdfPage } from '../types';

let dbPromise: Promise<IDBPDatabase> | null = null;

// Helper to generate SHA-256 hash for Data Isolation
export const hashApiKey = async (apiKey: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(CONFIG.DB_NAME, 4, { 
      upgrade(db) {
        // Handle page_images store (IDB)
        if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
          const store = db.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'id' });
          store.createIndex('by_job', 'jobId');
        }
        // Note: 'sessions' store is deprecated in V4 in favor of LocalStorage, 
        // but we leave it or ignore it.
        if (db.objectStoreNames.contains('sessions')) {
           db.deleteObjectStore('sessions');
        }
      },
    });
  }
  return dbPromise;
};

// --- IDB Operations (Images Only) ---

export const saveImage = async (jobId: string, pageId: number, type: 'orig' | 'clean', data: string) => {
  const db = await getDB();
  const id = `${jobId}_${pageId}_${type}`;
  await db.put(CONFIG.STORE_NAME, { id, jobId, pageId, type, data });
};

export const getImage = async (jobId: string, pageId: number, type: 'orig' | 'clean'): Promise<string | null> => {
  const db = await getDB();
  const id = `${jobId}_${pageId}_${type}`;
  const record = await db.get(CONFIG.STORE_NAME, id);
  return record?.data || null;
};

// --- Hybrid Operations (Metadata in LS, Images in IDB) ---

export const saveSession = async (session: JobSession, apiKeyHash: string) => {
  // 1. Save Images to IDB
  const db = await getDB();
  const tx = db.transaction(CONFIG.STORE_NAME, 'readwrite');
  
  const savePromises = session.pages.flatMap(page => {
    const p: Promise<any>[] = [];
    if (page.originalDataUrl) {
       p.push(tx.store.put({ id: `${session.id}_${page.id}_orig`, jobId: session.id, pageId: page.id, type: 'orig', data: page.originalDataUrl }));
    }
    if (page.cleanedDataUrl) {
       p.push(tx.store.put({ id: `${session.id}_${page.id}_clean`, jobId: session.id, pageId: page.id, type: 'clean', data: page.cleanedDataUrl }));
    }
    return p;
  });
  
  await Promise.all([...savePromises, tx.done]);

  // 2. Strip Images for LocalStorage
  const strippedPages = session.pages.map(p => ({
    ...p,
    originalDataUrl: "", // Stripped
    cleanedDataUrl: null // Stripped
  }));

  const lightweightSession: JobSession = {
    ...session,
    pages: strippedPages,
    // We keep thumbnail in LS for the gallery view (assuming it's reasonable size), 
    // or we could strip it too and load on demand. For UI responsiveness, keeping thumbnail is better.
    thumbnail: session.thumbnail 
  };

  // 3. Save to LocalStorage with Isolated Key
  const storageKey = `${APP_CONFIG.STORAGE_KEY_PREFIX}${apiKeyHash}`;
  const existingStr = localStorage.getItem(storageKey);
  let sessions: JobSession[] = existingStr ? JSON.parse(existingStr) : [];
  
  // Update or Add
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = lightweightSession;
  } else {
    sessions.push(lightweightSession);
  }
  
  localStorage.setItem(storageKey, JSON.stringify(sessions));
};

export const getSessions = async (apiKeyHash: string): Promise<JobSession[]> => {
  const storageKey = `${APP_CONFIG.STORAGE_KEY_PREFIX}${apiKeyHash}`;
  const jsonStr = localStorage.getItem(storageKey);
  if (!jsonStr) return [];
  
  const sessions: JobSession[] = JSON.parse(jsonStr);
  return sessions.sort((a, b) => b.timestamp - a.timestamp);
};

export const hydrateSession = async (session: JobSession): Promise<JobSession> => {
  const pages: PdfPage[] = await Promise.all(session.pages.map(async (p) => {
    const orig = await getImage(session.id, p.id, 'orig');
    const clean = await getImage(session.id, p.id, 'clean');
    return {
      ...p,
      originalDataUrl: orig || "",
      cleanedDataUrl: clean
    };
  }));

  return { ...session, pages };
};

export const deleteSession = async (jobId: string, apiKeyHash: string) => {
  // 1. Delete from IDB (Images)
  const db = await getDB();
  try {
    const tx = db.transaction(CONFIG.STORE_NAME, 'readwrite');
    const index = tx.store.index('by_job');
    let cursor = await index.openCursor(IDBKeyRange.only(jobId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (e) {
    console.warn("Failed to clean up images for job " + jobId, e);
  }

  // 2. Delete from LocalStorage (Metadata)
  const storageKey = `${APP_CONFIG.STORAGE_KEY_PREFIX}${apiKeyHash}`;
  const existingStr = localStorage.getItem(storageKey);
  if (existingStr) {
    let sessions: JobSession[] = JSON.parse(existingStr);
    sessions = sessions.filter(s => s.id !== jobId);
    localStorage.setItem(storageKey, JSON.stringify(sessions));
  }
};
