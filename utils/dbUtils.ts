import { openDB, DBSchema } from 'idb';
import { STORAGE_CONFIG } from '../constants';

interface DeckSmithDB extends DBSchema {
  page_images: {
    key: string; // Composite key: `${jobId}_${pageId}_${type}`
    value: {
      id: string;
      jobId: string;
      pageId: number;
      type: 'original' | 'cleaned';
      dataUrl: string;
    };
    indexes: { 'by_job': string };
  };
}

const DB_NAME = STORAGE_CONFIG.DB_NAME;
const STORE_NAME = STORAGE_CONFIG.STORE_NAME as 'page_images';

export const initDB = async () => {
  return openDB<DeckSmithDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_job', 'jobId');
      }
    },
  });
};

export const savePageImages = async (jobId: string, pageId: number, original: string, cleaned: string | null) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  
  // Save Original
  await tx.store.put({
    id: `${jobId}_${pageId}_original`,
    jobId,
    pageId,
    type: 'original',
    dataUrl: original
  });

  // Save Cleaned (if exists)
  if (cleaned) {
    await tx.store.put({
        id: `${jobId}_${pageId}_cleaned`,
        jobId,
        pageId,
        type: 'cleaned',
        dataUrl: cleaned
    });
  }

  await tx.done;
};

export const getPageImages = async (jobId: string, pageId: number) => {
    const db = await initDB();
    const originalRec = await db.get(STORE_NAME, `${jobId}_${pageId}_original`);
    const cleanedRec = await db.get(STORE_NAME, `${jobId}_${pageId}_cleaned`);
    
    return {
        originalDataUrl: originalRec?.dataUrl || '',
        cleanedDataUrl: cleanedRec?.dataUrl || null
    };
};

export const deleteJobImages = async (jobId: string) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('by_job');
    
    let cursor = await index.openCursor(IDBKeyRange.only(jobId));
    
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }
    
    await tx.done;
};