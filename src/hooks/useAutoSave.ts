'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Session } from '@/types';
import { saveSession } from '@/lib/db';

interface UseAutoSaveReturn {
  lastSaved: number | null;
  isSaving: boolean;
  saveNow: (session: Session) => Promise<void>;
}

export function useAutoSave(
  getSession: () => Session | null,
  intervalSeconds: number = 30,
  enabled: boolean = true
): UseAutoSaveReturn {
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const getSessionRef = useRef(getSession);

  // Keep ref up to date
  useEffect(() => {
    getSessionRef.current = getSession;
  }, [getSession]);

  const saveNow = useCallback(async (session: Session): Promise<void> => {
    if (!session) return;
    setIsSaving(true);
    try {
      await saveSession(session);
      setLastSaved(Date.now());
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const autoSave = useCallback(async () => {
    const session = getSessionRef.current();
    if (!session) return;
    await saveNow(session);
  }, [saveNow]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(autoSave, intervalSeconds * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalSeconds, autoSave]);

  return { lastSaved, isSaving, saveNow };
}
