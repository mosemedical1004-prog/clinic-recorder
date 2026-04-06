import { Session } from '@/types';
import { buildTxtContent } from './export';

const FS_DB_NAME = 'clinic-fs-handles';
const FS_STORE = 'handles';
const DIR_KEY = 'save-directory';
const LS_FOLDER_NAME_KEY = 'savedFolderName';

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
    tx.oncomplete = () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LS_FOLDER_NAME_KEY);
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Opens folder picker, persists handle to IDB + name to localStorage */
export async function requestSaveDirectory(): Promise<string | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    await storeHandle(handle);
    const name = (handle as FileSystemDirectoryHandle).name;
    localStorage.setItem(LS_FOLDER_NAME_KEY, name);
    return name;
  } catch {
    return null;
  }
}

/** Synchronous — reads from localStorage, no async required */
export function getSavedFolderNameSync(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LS_FOLDER_NAME_KEY);
}

/** Async version for settings display */
export async function getSavedFolderName(): Promise<string | null> {
  const handle = await getSavedDirectoryHandle();
  return handle ? handle.name : null;
}

async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as 'readwrite' };
  if ((await (handle as any).queryPermission(opts)) === 'granted') return true;
  return (await (handle as any).requestPermission(opts)) === 'granted';
}

export interface SaveResult {
  success: boolean;
  fileName?: string;
  savedToFolder?: boolean;
  error?: 'no_directory' | 'permission_denied' | 'write_error';
}

/** Save any Blob to the selected folder */
export async function saveBlobToDirectory(blob: Blob, filename: string): Promise<SaveResult> {
  const handle = await getSavedDirectoryHandle();
  if (!handle) return { success: false, error: 'no_directory' };

  const permitted = await ensurePermission(handle);
  if (!permitted) return { success: false, error: 'permission_denied' };

  try {
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { success: true, fileName: filename, savedToFolder: true };
  } catch {
    return { success: false, error: 'write_error' };
  }
}

/** Build standardized base filename from session (no extension) */
export function buildSessionFileName(session: Session, suffix: string): string {
  const date = new Date(session.startTime);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const ampm = date.getHours() < 12 ? '오전' : '오후';
  const count = session.patients.length;
  return `${yyyy}-${mm}-${dd}_${ampm}_${suffix}_환자${count}명`;
}

export interface AutoSaveResult {
  success: boolean;
  fileName?: string;
  error?: 'no_directory' | 'permission_denied' | 'write_error';
}

/** Auto-saves session as TXT to the selected folder on recording stop */
export async function autoSaveSessionToFile(session: Session): Promise<AutoSaveResult> {
  const handle = await getSavedDirectoryHandle();
  if (!handle) return { success: false, error: 'no_directory' };

  const permitted = await ensurePermission(handle);
  if (!permitted) return { success: false, error: 'permission_denied' };

  try {
    const fileName = buildSessionFileName(session, '진료기록') + '.txt';
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const content = '\uFEFF' + buildTxtContent(session);
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
