import { Session } from '@/types';
import { buildTxtContent } from './export';

// Separate IDB instance just for storing FileSystemDirectoryHandle
// (cannot be stored in the typed idb schema, but native IDB supports it)
const FS_DB_NAME = 'clinic-fs-handles';
const FS_STORE = 'handles';
const DIR_KEY = 'save-directory';

async function getFsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(FS_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getFsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_STORE, 'readwrite');
    tx.objectStore(FS_STORE).put(handle, DIR_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getFsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readonly');
      const req = tx.objectStore(FS_STORE).get(DIR_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearSavedDirectoryHandle(): Promise<void> {
  const db = await getFsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_STORE, 'readwrite');
    tx.objectStore(FS_STORE).delete(DIR_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Opens folder picker, persists handle, returns folder name or null if cancelled */
export async function requestSaveDirectory(): Promise<string | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    await storeHandle(handle);
    return (handle as FileSystemDirectoryHandle).name;
  } catch {
    // User cancelled or permission denied
    return null;
  }
}

/** Returns true if permission is already granted without prompting */
async function hasPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as FileSystemPermissionMode };
  return (await (handle as any).queryPermission(opts)) === 'granted';
}

/** Ensures readwrite permission, prompting if needed. Returns true if granted. */
async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as FileSystemPermissionMode };
  if ((await (handle as any).queryPermission(opts)) === 'granted') return true;
  return (await (handle as any).requestPermission(opts)) === 'granted';
}

function buildFileName(session: Session): string {
  const date = new Date(session.startTime);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const ampm = date.getHours() < 12 ? '오전' : '오후';
  const count = session.patients.length;
  return `${yyyy}-${mm}-${dd}_${ampm}_진료기록_환자${count}명.txt`;
}

export interface AutoSaveResult {
  success: boolean;
  fileName?: string;
  error?: 'no_directory' | 'permission_denied' | 'write_error';
}

/**
 * Saves session as TXT to the previously selected folder.
 * Returns the saved file name on success.
 */
export async function autoSaveSessionToFile(session: Session): Promise<AutoSaveResult> {
  const handle = await getSavedDirectoryHandle();
  if (!handle) return { success: false, error: 'no_directory' };

  const permitted = await ensurePermission(handle);
  if (!permitted) return { success: false, error: 'permission_denied' };

  try {
    const fileName = buildFileName(session);
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const content = '\uFEFF' + buildTxtContent(session); // UTF-8 BOM for Korean
    await writable.write(content);
    await writable.close();
    return { success: true, fileName };
  } catch {
    return { success: false, error: 'write_error' };
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Returns the stored folder name for display, without triggering a permission prompt */
export async function getSavedFolderName(): Promise<string | null> {
  const handle = await getSavedDirectoryHandle();
  return handle ? handle.name : null;
}
