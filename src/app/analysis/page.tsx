'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Session, Patient, PatientSummary } from '@/types';
import { getSession, saveSession } from '@/lib/db';
import PatientCard from '@/components/PatientCard';
import ExportButtons from '@/components/ExportButtons';
import { formatDuration } from '@/lib/patientDetector';

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('id');

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError('세션 ID가 없습니다.');
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        const data = await getSession(sessionId);
        if (!data) {
          setError('세션을 찾을 수 없습니다.');
        } else {
          setSession(data);
        }
      } catch (err) {
        setError('세션 로드 실패');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const handleSummaryUpdate = useCallback(
    async (patientId: string, summary: PatientSummary) => {
      if (!session) return;

      const updatedSession: Session = {
        ...session,
        patients: session.patients.map((p) =>
          p.id === patientId ? { ...p, summary } : p
        ),
        lastSaved: Date.now(),
      };

      setSession(updatedSession);
      await saveSession(updatedSession);
    },
    [session]
  );

  const handleNameChange = useCallback(
    async (patientId: string, name: string) => {
      if (!session) return;

      const updatedSession: Session = {
        ...session,
        patients: session.patients.map((p) =>
          p.id === patientId ? { ...p, name } : p
        ),
        lastSaved: Date.now(),
      };

      setSession(updatedSession);
      await saveSession(updatedSession);
    },
    [session]
  );

  const handleAnalyzeAll = async () => {
    if (!session) return;

    const patientsToAnalyze = session.patients.filter((p) => {
      const text = p.transcriptSegments
        .filter((s) => !s.isInterim)
        .map((s) => s.text)
        .join(' ');
      return text.trim() && !p.summary;
    });

    if (patientsToAnalyze.length === 0) return;

    setAnalyzingAll(true);
    setAnalyzeProgress(0);

    for (let i = 0; i < patientsToAnalyze.length; i++) {
      const patient = patientsToAnalyze[i];
      const transcript = patient.transcriptSegments
        .filter((s) => !s.isInterim)
        .map((s) => s.text)
        .join(' ');

      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            patientNumber: patient.number,
          }),
        });

        if (response.ok) {
          const summary: PatientSummary = await response.json();
          await handleSummaryUpdate(patient.id, summary);
        }
      } catch (err) {
        console.error(`Failed to analyze patient ${patient.number}:`, err);
      }

      setAnalyzeProgress(((i + 1) / patientsToAnalyze.length) * 100);
    }

    setAnalyzingAll(false);
    setAnalyzeProgress(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">세션 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg gap-4">
        <div className="text-red-400 text-lg">{error ?? '알 수 없는 오류'}</div>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500"
        >
          홈으로
        </Link>
      </div>
    );
  }

  const analyzedCount = session.patients.filter((p) => p.summary).length;
  const analyzableCount = session.patients.filter((p) => {
    const text = p.transcriptSegments
      .filter((s) => !s.isInterim)
      .map((s) => s.text)
      .join(' ');
    return text.trim() && !p.summary;
  }).length;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark-bg border-b border-slate-700/50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-white font-bold">진료 분석</h1>
              <p className="text-slate-500 text-xs">
                {new Date(session.startTime).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-white font-bold">{session.patients.length}</div>
                <div className="text-slate-500 text-xs">환자</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">
                  {formatDuration(session.duration)}
                </div>
                <div className="text-slate-500 text-xs">시간</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">{analyzedCount}</div>
                <div className="text-slate-500 text-xs">분석됨</div>
              </div>
            </div>

            {/* Analyze all button */}
            {analyzableCount > 0 && (
              <button
                onClick={handleAnalyzeAll}
                disabled={analyzingAll}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {analyzingAll ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    분석 중... ({Math.round(analyzeProgress)}%)
                  </>
                ) : (
                  <>
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    전체 분석 ({analyzableCount}명)
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {analyzingAll && (
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${analyzeProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient cards */}
          <div className="lg:col-span-2 space-y-4">
            {session.patients.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p>환자 데이터가 없습니다</p>
              </div>
            ) : (
              session.patients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  sessionId={session.id}
                  onSummaryUpdate={handleSummaryUpdate}
                  onNameChange={handleNameChange}
                />
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Session info */}
            <div className="bg-dark-card border border-slate-700/50 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-3">세션 정보</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">시작</span>
                  <span className="text-white">
                    {new Date(session.startTime).toLocaleTimeString('ko-KR')}
                  </span>
                </div>
                {session.endTime && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">종료</span>
                    <span className="text-white">
                      {new Date(session.endTime).toLocaleTimeString('ko-KR')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">총 시간</span>
                  <span className="text-white">{formatDuration(session.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">환자 수</span>
                  <span className="text-blue-400 font-medium">
                    {session.patients.length}명
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">분석 완료</span>
                  <span className="text-green-400 font-medium">
                    {analyzedCount}/{session.patients.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">발화 수</span>
                  <span className="text-white">
                    {session.transcript.filter((s) => !s.isInterim).length}개
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">언어</span>
                  <span className="text-white">{session.settings.language}</span>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="bg-dark-card border border-slate-700/50 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-3">내보내기</h3>
              <ExportButtons session={session} />
            </div>

            {/* Audio download */}
            <div className="bg-dark-card border border-slate-700/50 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-3">녹음 파일</h3>
              {session.audioBlob ? (
                <div className="space-y-3">
                  <audio
                    controls
                    src={URL.createObjectURL(session.audioBlob)}
                    className="w-full h-10 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(session.audioBlob!);
                      const ext = session.audioBlob!.type.includes('ogg')
                        ? 'ogg'
                        : session.audioBlob!.type.includes('mp4')
                        ? 'mp4'
                        : 'webm';
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `진료녹음_${new Date(session.startTime).toISOString().slice(0, 10)}_${session.id.slice(0, 8)}.${ext}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    오디오 다운로드
                  </button>
                  <p className="text-slate-500 text-xs text-center">
                    {(session.audioBlob.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div className="text-slate-500 text-sm text-center py-3">
                  저장된 녹음 파일이 없습니다
                </div>
              )}
            </div>

            {/* Quick transcript */}
            <div className="bg-dark-card border border-slate-700/50 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-3">전체 녹취록</h3>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {session.transcript
                  .filter((s) => !s.isInterim)
                  .slice(0, 30)
                  .map((seg) => (
                    <p key={seg.id} className="text-slate-400 text-xs leading-relaxed">
                      {seg.text}
                    </p>
                  ))}
                {session.transcript.filter((s) => !s.isInterim).length > 30 && (
                  <p className="text-slate-600 text-xs text-center pt-1">
                    +{session.transcript.filter((s) => !s.isInterim).length - 30}개 더...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-dark-bg">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
