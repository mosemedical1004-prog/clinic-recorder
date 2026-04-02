import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Session, AppSettings } from '@/types';

interface ClinicDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: {
      'by-startTime': number;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

let db: IDBPDatabase<ClinicDB> | null = null;

const DB_NAME = 'clinic-recorder-db';
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase<ClinicDB>> {
  if (db) return db;

  db = await openDB<ClinicDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Sessions store
      if (!database.objectStoreNames.contains('sessions')) {
        const sessionStore = database.createObjectStore('sessions', {
          keyPath: 'id',
        });
        sessionStore.createIndex('by-startTime', 'startTime');
      }

      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'id' } as any);
      }
    },
  });

  return db;
}

export async function saveSession(session: Session): Promise<void> {
  const database = await getDB();
  // Clone session without audioBlob for storage efficiency if needed
  const sessionToSave: Session = {
    ...session,
    lastSaved: Date.now(),
  };
  await database.put('sessions', sessionToSave);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const database = await getDB();
  return database.get('sessions', id);
}

export async function getAllSessions(): Promise<Session[]> {
  const database = await getDB();
  const sessions = await database.getAllFromIndex('sessions', 'by-startTime');
  // Return in reverse chronological order
  return sessions.reverse();
}

export async function deleteSession(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('sessions', id);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const database = await getDB();
  return database.get('settings', 'app-settings' as any);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const database = await getDB();
  await database.put('settings', { ...settings, id: 'app-settings' } as any);
}

export async function clearAllData(): Promise<void> {
  const database = await getDB();
  await database.clear('sessions');
  await database.clear('settings');
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'ko-KR',
  autoDetectPatients: true,
  autoSaveInterval: 30,
  patientKeywords: [
    '다음 환자',
    '다음분',
    '번 환자',
    '새 환자',
    '호출',
    '다음',
    'next patient',
    '入ってください',
  ],
  darkMode: true,
  silenceTimeoutMinutes: 2,
};
