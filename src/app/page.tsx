'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import RecordingControls from '@/components/RecordingControls';
import AudioVisualizer from '@/components/AudioVisualizer';
import TranscriptDisplay from '@/components/TranscriptDisplay';
import SessionSidebar from '@/components/SessionSidebar';
import ExportButtons from '@/components/ExportButtons';
import HistoryTab from '@/components/tabs/HistoryTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import SaveFolderModal from '@/components/SaveFolderModal';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { Session } from '@/types';
import { isFileSystemAccessSupported, getSavedFolderNameSync } from '@/lib/fileSystem';

type TabName = 'recording' | 'history' | 'settings';

export default function HomePage() {
  const router = useRouter();
  const {
    session, patients, currentPatientId, autoSaveNotice, setAutoSaveNotice,
    recording, transcription, autoSave,
    handleStart, handleStop, handlePause, handleResume, handleAddPatientMarker,
  } = useRecordingContext();

  const [activeTab, setActiveTab] = useState<TabName>('recording');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();
  const [showFolderModal, setShowFolderModal] = useState(false);

  useEffect(() => {
    if (isFileSystemAccessSupported() && !getSavedFolderNameSync()) {
      setShowFolderModal(true);
    }
  }, []);

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

  const isActive = recording.state === 'recording';
  const isPaused = recording.state === 'paused';
  const isStopped = recording.state === 'stopped';

  const currentSession: Session | null = session
    ? { ...session, patients, transcript: transcription.segments, duration: recording.duration }
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
        activeTab={activeTab}
        onTabChange={setActiveTab}
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

      {/* Tab content */}
      {activeTab === 'history' && (
        <HistoryTab onSwitchToRecording={() => setActiveTab('recording')} />
      )}
      {activeTab === 'settings' && <SettingsTab />}

      {/* Recording tab — always mounted, only hidden when another tab is active */}
      <div className={`flex flex-1 overflow-hidden ${activeTab !== 'recording' ? 'hidden' : ''}`}>
          {/* Left panel */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-slate-700/30">
            <div className="h-36 shrink-0 p-3 pb-2">
              <AudioVisualizer
                analyserNode={recording.analyserNode}
                isRecording={isActive || isPaused}
                isPaused={isPaused}
              />
            </div>

            {isActive && (
              <div className="px-4 py-1.5 flex items-center gap-2 border-t border-slate-800/50">
                {transcription.isListening ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 text-xs">음성 인식 중</span>
                    {transcription.interimText && (
                      <span className="text-slate-500 text-xs truncate flex-1">{transcription.interimText}</span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                    <span className="text-slate-500 text-xs">음성 인식 대기 중</span>
                  </>
                )}
                {!transcription.isSupported && (
                  <span className="text-amber-400 text-xs">이 브라우저는 음성 인식을 지원하지 않습니다</span>
                )}
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              <TranscriptDisplay
                segments={transcription.segments}
                patients={patients}
                currentPatientId={selectedPatientId ?? currentPatientId}
                onPatientSelect={setSelectedPatientId}
              />
            </div>
          </div>

          {/* Right panel */}
          <div className="w-80 shrink-0 flex flex-col overflow-y-auto bg-dark-card">
            <div className="p-4 space-y-4">
              <RecordingControls
                state={recording.state}
                onStart={handleStart}
                onStop={handleStop}
                onPause={handlePause}
                onResume={handleResume}
                onAddPatientMarker={handleAddPatientMarker}
                currentPatientNumber={patients.length}
                duration={recording.duration}
              />

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
                          {patient.name && <span className="text-slate-400">{patient.name}</span>}
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

              {isStopped && currentSession && (
                <div>
                  <div className="text-slate-400 text-xs font-medium mb-2 px-1">내보내기</div>
                  <ExportButtons session={currentSession} />
                  <button
                    onClick={() => { if (session) router.push(`/analysis?id=${session.id}`); }}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    AI 분석 보기
                  </button>
                </div>
              )}

              <button
                onClick={() => setSidebarOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                이전 세션
              </button>
            </div>
          </div>
      </div>

      <SessionSidebar
        currentSessionId={session?.id}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {showFolderModal && (
        <SaveFolderModal onClose={() => setShowFolderModal(false)} />
      )}
    </div>
  );
}
