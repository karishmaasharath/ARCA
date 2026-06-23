import { Memory, MemoryType } from './types';

export class MemoryStore {
  private dbName = 'arca-memory-db';
  private storeName = 'memories';
  private db: IDBDatabase | null = null;
  private isIndexedDBAvailable = false;
  private localStorageFallbackKey = 'arca-memories-fallback';

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      this.isIndexedDBAvailable = false;
      return;
    }

    try {
      this.db = await this.openDB();
      this.isIndexedDBAvailable = true;
    } catch (e) {
      console.warn('IndexedDB failed to open, falling back to LocalStorage:', e);
      this.isIndexedDBAvailable = false;
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db && typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      try {
        this.db = await this.openDB();
        this.isIndexedDBAvailable = true;
      } catch (e) {
        this.isIndexedDBAvailable = false;
      }
    }
  }

  public async getAll(): Promise<Memory[]> {
    await this.ensureInitialized();
    if (!this.isIndexedDBAvailable) {
      return this.getLocalFallback();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      try {
        const transaction = this.db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) {
        console.warn('Read operation failed on IndexedDB, falling back to LocalStorage', e);
        resolve(this.getLocalFallback());
      }
    });
  }

  public async save(memory: Memory): Promise<void> {
    await this.ensureInitialized();
    if (!this.isIndexedDBAvailable) {
      const memories = this.getLocalFallback();
      const existingIdx = memories.findIndex(m => m.id === memory.id);
      if (existingIdx >= 0) {
        memories[existingIdx] = memory;
      } else {
        memories.push(memory);
      }
      this.setLocalFallback(memories);
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      try {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(memory);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async saveAll(memories: Memory[]): Promise<void> {
    await this.ensureInitialized();
    if (!this.isIndexedDBAvailable) {
      this.setLocalFallback(memories);
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      try {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        store.clear();
        for (const memory of memories) {
          store.put(memory);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  public async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.isIndexedDBAvailable) {
      const memories = this.getLocalFallback().filter(m => m.id !== id);
      this.setLocalFallback(memories);
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      try {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async clear(): Promise<void> {
    await this.ensureInitialized();
    if (!this.isIndexedDBAvailable) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.localStorageFallbackKey);
      }
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      try {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  private getLocalFallback(): Memory[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.localStorageFallbackKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  private setLocalFallback(memories: Memory[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.localStorageFallbackKey, JSON.stringify(memories));
    } catch (e) {
      console.error('Failed to write to LocalStorage fallback:', e);
    }
  }
}
