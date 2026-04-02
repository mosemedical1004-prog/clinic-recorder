'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import RecordingControls from '@/components/RecordingControls';
import AudioVisualizer from '@/components/AudioVisualizer';
import TranscriptDisplay from '@/components/TranscriptDisplay';
import SessionSidebar from '@/components/SessionSidebar';
import ExportButtons from '@/components/ExportButtons';
import { useRecording } from '@/hooks/useRecording';
import { useTranscription } from '@/hooks/useTranscription';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useWakeLock } from '@/hooks/useWakeLock';
import { Session, Patient, SessionSettings } from '@/types';
import { generateId } from '@/lib/patientDetector';
import { detectNewPatient } from '@/lib/patientDetector';
import { getSettings, saveSession, DEFAULT_SETTINGS } from '@/lib/db';
import { autoSaveSessionToFile } from '@/lib/fileSystem';

const SILENCE_TIMEOUT_LS_KEY = 'silenceTimeoutMinutes';

const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  language: 'ko-KR',
  autoDetectPatients: true,
  autoSaveInterval: 30,
  patientKeywords: DEFAULT_SETTINGS.patientKeywords,
  silenceTimeoutMinutes: DEFAULT_SETTINGS.silenceTimeoutMinutes,
};

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSaveNotice, setAutoSaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [appSettings, setAppSettings] = useState(DEFAULT_SESSION_SETTINGS);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();
  const sessionRef = useRef<Session | null>(null);
  const patientsRef = useRef<Patient[]>([]);
  const currentPatientIdRef = useRef<string | undefined>();

  const recording = useRecording();
  const transcription = useTranscription();
  const wakeLock = useWakeLock();

  // Keep refs in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);
  useEffect(() => {
    currentPatientIdRef.current = currentPatientId;
  }, [currentPatientId]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        const lsVal = localStorage.getItem(SILENCE_TIMEOUT_LS_KEY);
        const silenceFromLs = lsVal ? Number(lsVal) : null;
        if (settings) {
          setAppSettings({
            language: settings.language,
            autoDetectPatients: settings.autoDetectPatients,
            autoSaveInterval: settings.autoSaveInterval,
            patientKeywords: settings.patientKeywords,
            silenceTimeoutMinutes:
              silenceFromLs ?? settings.silenceTimeoutMinutes ?? DEFAULT_SETTINGS.silenceTimeoutMinutes,
          });
          setDarkMode(settings.darkMode);
          if (!settings.darkMode) {
            document.documentElement.classList.remove('dark');
          }
        } else if (silenceFromLs) {
          setAppSettings((prev) => ({ ...prev, silenceTimeoutMinutes: silenceFromLs }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  const getSessionForSave = useCallback((): Session | null => {
    return sessionRef.current
      ? {
          ...sessionRef.current,
          patients: patientsRef.current,
          transcript: transcription.segments,
          duration: recording.duration,
          lastSaved: Date.now(),
        }
      : null;
  }, [transcription.segments, recording.duration]);

  const autoSave = useAutoSave(
    getSessionForSave,
    appSettings.autoSaveInterval,
    recording.state === 'recording' || recording.state === 'paused'
  );

  // Add new patient
  const addNewPatient = useCallback((): Patient => {
    const currentPatients = patientsRef.current;
    const newPatient: Patient = {
      id: generateId(),
      number: currentPatients.length + 1,
      startTime: recording.duration,
      transcriptSegments: [],
    };

    // End current patient
    if (currentPatients.length > 0 && currentPatientIdRef.current) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === currentPatientIdRef.current
            ? { ...p, endTime: recording.duration }
            : p
        )
      );
    }

    setPatients((prev) => [...prev, newPatient]);
    setCurrentPatientId(newPatient.id);
    return newPatient;
  }, [recording.duration]);

  // Handle new transcript segments with patient detection
  useEffect(() => {
    if (!appSettings.autoDetectPatients || !session) return;

    const finalSegments = transcription.segments.filter((s) => !s.isInterim);
    if (finalSegments.length === 0) return;

    const latestSegment = finalSegments[finalSegments.length - 1];

    // Don't process already-patientified segments
    if (latestSegment.patientId) return;

    const previousSegments = finalSegments.slice(0, -1);
    const result = detectNewPatient(
      latestSegment,
      previousSegments,
      appSettings.patientKeywords,
      appSettings.silenceTimeoutMinutes
    );

    if (result.shouldCreateNewPatient && patientsRef.current.length > 0) {
      addNewPatient();
    }
  }, [transcription.segments, appSettings.autoDetectPatients, appSettings.patientKeywords, session, addNewPatient]);

  // Assign current patient ID to new segments
  useEffect(() => {
    if (!currentPatientId) return;

    const unassignedSegments = transcription.segments.filter(
      (s) => !s.isInterim && !s.patientId
    );

    if (unassignedSegments.length > 0) {
      // Update segments with patient ID
      unassignedSegments.forEach((seg) => {
        seg.patientId = currentPatientId;
      });

      // Update patient's segments
      setPatients((prev) =>
        prev.map((p) =>
          p.id === currentPatientId
            ? {
                ...p,
                transcriptSegments: transcription.segments.filter(
                  (s) => s.patientId === p.id
                ),
              }
            : p
        )
      );
    }
  }, [transcription.segments, currentPatientId]);

  const handleStart = async () => {
    const sessionId = generateId();
    const firstPatient: Patient = {
      id: generateId(),
      number: 1,
      startTime: 0,
      transcriptSegments: [],
    };

    const newSession: Session = {
      id: sessionId,
      startTime: Date.now(),
      duration: 0,
      patients: [firstPatient],
      transcript: [],
      lastSaved: Date.now(),
      settings: appSettings,
    };

    setSession(newSession);
    setPatients([firstPatient]);
    setCurrentPatientId(firstPatient.id);

    await recording.start();
    transcription.start(appSettings.language);
    wakeLock.request();
  };

  const handlePause = () => {
    recording.pause();
    transcription.stop();
  };

  const handleResume = () => {
    recording.resume();
    transcription.start(appSettings.language);
  };

  const handleStop = async () => {
    transcription.stop();
    const audioBlob = await recording.stop();

    // End last patient
    if (currentPatientId) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === currentPatientId
            ? { ...p, endTime: recording.duration }
            : p
        )
      );
    }

    wakeLock.release();

    // Final save
    if (sessionRef.current) {
      const finalSession: Session = {
        ...sessionRef.current,
        endTime: Date.now(),
        duration: recording.duration,
        patients: patientsRef.current,
        transcript: transcription.segments,
        audioBlob: audioBlob ?? undefined,
        lastSaved: Date.now(),
      };
      await saveSession(finalSession);
      setSession(finalSession);
      autoSave.saveNow(finalSession);

      // Auto-save to selected folder
      const result = await autoSaveSessionToFile(finalSession);
      if (result.success && result.fileName) {
        setAutoSaveNotice({ type: 'success', message: `저장됨: ${result.fileName}` });
        setTimeout(() => setAutoSaveNotice(null), 5000);
      } else if (result.error === 'permission_denied') {
        setAutoSaveNotice({ type: 'error', message: '폴더 접근 권한이 없습니다. 설정에서 폴더를 다시 선택해 주세요.' });
        setTimeout(() => setAutoSaveNotice(null), 6000);
      }
      // 'no_directory'는 폴더 미설정이므로 알림 없음
    }
  };

  const handleAddPatientMarker = () => {
    if (recording.state !== 'recording' && recording.state !== 'paused') return;
    const newPatient = addNewPatient();
    transcription.addManualSegment(
      `=== ${newPatient.number}번 환자 시작 ===`,
      newPatient.id
    );
  };

  const handleToggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isActive =
    recording.state === 'recording' || recording.state === 'paused';
  const isStopped = recording.state === 'stopped';

  const currentSession: Session | null = session
    ? {
        ...session,
        patients,
        transcript: transcription.segments,
        duration: recording.duration,
      }
    : null;

  return (
    <div className="flex flex-col h-screen bg-dark-bg overflow-hidden">
      {/* Header */}
      <Header
        recordingState={recording.state}
        duration={recording.duration}
        patientCount={patients.length}
        lastSaved={autoSave.lastSaved}
        isSaving={autoSave.isSaving}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Error banner */}
      {recording.error && (
        <div className="bg-red-900/50 border-b border-red-700/50 px-4 py-2 text-red-300 text-sm text-center">
          {recording.error}
        </div>
      )}

      {/* Auto-save file notice */}
      {autoSaveNotice && (
        <div
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b ${
            autoSaveNotice.type === 'success'
              ? 'bg-green-900/40 border-green-700/40 text-green-300'
              : 'bg-amber-900/40 border-amber-700/40 text-amber-300'
          }`}
        >
          {autoSaveNotice.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
          <span>{autoSaveNotice.message}</span>
          <button onClick={() => setAutoSaveNotice(null)} className="ml-auto opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Visualizer + Transcript */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-slate-700/30">
          {/* Audio Visualizer */}
          <div className="h-36 shrink-0 p-3 pb-2">
            <AudioVisualizer
              analyserNode={recording.analyserNode}
              isRecording={recording.state === 'recording'}
              isPaused={recording.state === 'paused'}
            />
          </div>

          {/* Speech recognition indicator */}
          {isActive && (
            <div className="px-4 py-1.5 flex items-center gap-2 border-t border-slate-800/50">
              {transcription.isListening ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-xs">음성 인식 중</span>
                  {transcription.interimText && (
                    <span className="text-slate-500 text-xs truncate flex-1">
                      {transcription.interimText}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-slate-600" />
                  <span className="text-slate-500 text-xs">음성 인식 대기 중</span>
                </>
              )}
              {!transcription.isSupported && (
                <span className="text-amber-400 text-xs">
                  이 브라우저는 음성 인식을 지원하지 않습니다
                </span>
              )}
            </div>
          )}

          {/* Transcript */}
          <div className="flex-1 overflow-hidden">
            <TranscriptDisplay
              segments={transcription.segments}
              patients={patients}
              currentPatientId={selectedPatientId ?? currentPatientId}
              onPatientSelect={setSelectedPatientId}
            />
          </div>
        </div>

        {/* Right panel - Controls */}
        <div className="w-80 shrink-0 flex flex-col overflow-y-auto bg-dark-card">
          <div className="p-4 space-y-4">
            {/* Recording controls */}
            <RecordingControls
              state={recording.state}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onAddPatientMarker={handleAddPatientMarker}
              currentPatientNumber={patients.length}
              duration={recording.duration}
            />

            {/* Patient list */}
            {patients.length > 0 && (
              <div>
                <div className="text-slate-400 text-xs font-medium mb-2 px-1">환자 목록</div>
                <div className="space-y-1.5">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        (selectedPatientId ?? currentPatientId) === patient.id
                          ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
                          : 'bg-slate-800/50 border border-slate-700/30 text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{patient.number}번</span>
                        {patient.name && (
                          <span className="text-slate-400">{patient.name}</span>
                        )}
                        {patient.id === currentPatientId && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            현재
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {patient.transcriptSegments.filter((s) => !s.isInterim).length}개
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Export buttons - show when stopped */}
            {isStopped && currentSession && (
              <div>
                <div className="text-slate-400 text-xs font-medium mb-2 px-1">내보내기</div>
                <ExportButtons session={currentSession} />

                {/* View analysis button */}
                <button
                  onClick={() => {
                    if (session) {
                      router.push(`/analysis?id=${session.id}`);
                    }
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  AI 분석 보기
                </button>
              </div>
            )}

            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              이전 세션
            </button>
          </div>
        </div>
      </div>

      {/* Session sidebar */}
      <SessionSidebar
        currentSessionId={session?.id}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}
