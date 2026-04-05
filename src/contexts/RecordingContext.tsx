'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Session, Patient, SessionSettings } from '@/types';
import { useRecording } from '@/hooks/useRecording';
import { useTranscription } from '@/hooks/useTranscription';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useWakeLock } from '@/hooks/useWakeLock';
import { generateId, detectNewPatient } from '@/lib/patientDetector';
import { getSettings, saveSession, DEFAULT_SETTINGS } from '@/lib/db';
import { autoSaveSessionToFile } from '@/lib/fileSystem';
import * as speech from '@/lib/speechEngine';

const SILENCE_TIMEOUT_LS_KEY = 'silenceTimeoutMinutes';

const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  language: 'ko-KR',
  autoDetectPatients: true,
  autoSaveInterval: 30,
  patientKeywords: DEFAULT_SETTINGS.patientKeywords,
  silenceTimeoutMinutes: DEFAULT_SETTINGS.silenceTimeoutMinutes,
};

interface AutoSaveNotice { type: 'success' | 'error'; message: string; }

interface RecordingContextValue {
  session: Session | null;
  patients: Patient[];
  currentPatientId: string | undefined;
  appSettings: SessionSettings;
  autoSaveNotice: AutoSaveNotice | null;
  setAutoSaveNotice: (n: AutoSaveNotice | null) => void;
  recording: ReturnType<typeof useRecording>;
  transcription: ReturnType<typeof useTranscription>;
  autoSave: ReturnType<typeof useAutoSave>;
  handleStart: () => Promise<void>;
  handleStop: () => Promise<void>;
  handleAddPatientMarker: () => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecordingContext() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecordingContext must be inside RecordingProvider');
  return ctx;
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | undefined>();
  const [appSettings, setAppSettings] = useState<SessionSettings>(DEFAULT_SESSION_SETTINGS);
  const [autoSaveNotice, setAutoSaveNotice] = useState<AutoSaveNotice | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const patientsRef = useRef<Patient[]>([]);
  const currentPatientIdRef = useRef<string | undefined>();
  const durationRef = useRef(0);
  const appSettingsRef = useRef(appSettings);

  const recording = useRecording();
  const transcription = useTranscription();
  const wakeLock = useWakeLock();

  // Keep refs in sync
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => {
    currentPatientIdRef.current = currentPatientId;
    // Sync current patient ID to speech engine so new segments get correct patient
    speech.setCurrentPatientId(currentPatientId);
  }, [currentPatientId]);
  useEffect(() => { durationRef.current = recording.duration; }, [recording.duration]);
  useEffect(() => { appSettingsRef.current = appSettings; }, [appSettings]);

  // Load settings
  useEffect(() => {
    const load = async () => {
      try {
        const s = await getSettings();
        const lsVal = localStorage.getItem(SILENCE_TIMEOUT_LS_KEY);
        const silenceFromLs = lsVal ? Number(lsVal) : null;
        if (s) {
          setAppSettings({
            language: s.language,
            autoDetectPatients: s.autoDetectPatients,
            autoSaveInterval: s.autoSaveInterval,
            patientKeywords: s.patientKeywords,
            silenceTimeoutMinutes:
              silenceFromLs ?? s.silenceTimeoutMinutes ?? DEFAULT_SETTINGS.silenceTimeoutMinutes,
          });
          if (!s.darkMode) document.documentElement.classList.remove('dark');
        } else if (silenceFromLs) {
          setAppSettings((p) => ({ ...p, silenceTimeoutMinutes: silenceFromLs }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    load();
  }, []);

  const getSessionForSave = useCallback((): Session | null => {
    if (!sessionRef.current) return null;
    return {
      ...sessionRef.current,
      patients: patientsRef.current,
      transcript: transcription.segments,
      duration: durationRef.current,
      lastSaved: Date.now(),
    };
  }, [transcription.segments]);

  const autoSave = useAutoSave(
    getSessionForSave,
    60 * 60,
    recording.state === 'recording'
  );

  const addNewPatient = useCallback((): Patient => {
    const newPatient: Patient = {
      id: generateId(),
      number: patientsRef.current.length + 1,
      startTime: durationRef.current,
      transcriptSegments: [],
    };
    if (patientsRef.current.length > 0 && currentPatientIdRef.current) {
      setPatients((prev) =>
        prev.map((p) => p.id === currentPatientIdRef.current ? { ...p, endTime: durationRef.current } : p)
      );
    }
    setPatients((prev) => [...prev, newPatient]);
    setCurrentPatientId(newPatient.id);
    return newPatient;
  }, []);

  // Auto-detect patients from transcript
  useEffect(() => {
    const settings = appSettingsRef.current;
    if (!settings.autoDetectPatients || !sessionRef.current) return;
    const finals = transcription.segments.filter((s) => !s.isInterim);
    if (finals.length === 0) return;
    const latest = finals[finals.length - 1];
    if (latest.patientId) return;
    const result = detectNewPatient(
      latest,
      finals.slice(0, -1),
      settings.patientKeywords,
      settings.silenceTimeoutMinutes
    );
    if (result.shouldCreateNewPatient && patientsRef.current.length > 0) {
      addNewPatient();
    }
  }, [transcription.segments, addNewPatient]);

  // Assign current patient to new unassigned segments via engine (no direct mutation)
  useEffect(() => {
    if (!currentPatientId) return;
    const hasUnassigned = transcription.segments.some((s) => !s.isInterim && !s.patientId);
    if (hasUnassigned) {
      speech.assignPatientToUnassigned(currentPatientId);
      // Update patient's segment list
      setPatients((prev) =>
        prev.map((p) =>
          p.id === currentPatientId
            ? { ...p, transcriptSegments: transcription.segments.filter((s) => s.patientId === p.id) }
            : p
        )
      );
    }
  }, [transcription.segments, currentPatientId]);

  const handleStart = useCallback(async () => {
    const settings = appSettingsRef.current;
    speech.clearTranscript();
    const sessionId = generateId();
    const firstPatient: Patient = { id: generateId(), number: 1, startTime: 0, transcriptSegments: [] };
    const newSession: Session = {
      id: sessionId,
      startTime: Date.now(),
      duration: 0,
      patients: [firstPatient],
      transcript: [],
      lastSaved: Date.now(),
      settings,
    };
    setSession(newSession);
    setPatients([firstPatient]);
    setCurrentPatientId(firstPatient.id);
    await recording.start();
    speech.start(settings.language);
    wakeLock.request();
  }, [recording, wakeLock]);

  const handleStop = useCallback(async () => {
    speech.stop();
    const audioBlob = await recording.stop();

    if (currentPatientIdRef.current) {
      setPatients((prev) =>
        prev.map((p) => p.id === currentPatientIdRef.current ? { ...p, endTime: durationRef.current } : p)
      );
    }
    wakeLock.release();

    // Auto-download audio file
    if (audioBlob) {
      const now = new Date(sessionRef.current?.startTime ?? Date.now());
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const ampm = now.getHours() < 12 ? '오전' : '오후';
      const ext = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const filename = `${yyyy}-${mm}-${dd}_${ampm}_진료녹음.${ext}`;
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    if (sessionRef.current) {
      const finalSession: Session = {
        ...sessionRef.current,
        endTime: Date.now(),
        duration: durationRef.current,
        patients: patientsRef.current,
        transcript: transcription.segments,
        audioBlob: audioBlob ?? undefined,
        lastSaved: Date.now(),
      };
      await saveSession(finalSession);
      setSession(finalSession);
      autoSave.saveNow(finalSession);

      const result = await autoSaveSessionToFile(finalSession);
      if (result.success && result.fileName) {
        setAutoSaveNotice({ type: 'success', message: `저장됨: ${result.fileName}` });
        setTimeout(() => setAutoSaveNotice(null), 5000);
      } else if (result.error === 'permission_denied') {
        setAutoSaveNotice({ type: 'error', message: '폴더 접근 권한이 없습니다. 설정에서 폴더를 다시 선택해 주세요.' });
        setTimeout(() => setAutoSaveNotice(null), 6000);
      }
    }
  }, [recording, wakeLock, autoSave, transcription.segments]);

  const handleAddPatientMarker = useCallback(() => {
    if (recording.state !== 'recording') return;
    const p = addNewPatient();
    speech.addManualSegment(`=== ${p.number}번 환자 시작 ===`, p.id);
  }, [recording.state, addNewPatient]);

  return (
    <RecordingContext.Provider
      value={{
        session, patients, currentPatientId, appSettings,
        autoSaveNotice, setAutoSaveNotice,
        recording, transcription, autoSave,
        handleStart, handleStop, handleAddPatientMarker,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}
