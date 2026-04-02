'use client';

import React, { useState } from 'react';
import { PatientCardProps, PatientSummary } from '@/types';
import { formatDuration, formatTimestamp } from '@/lib/patientDetector';

export default function PatientCard({
  patient,
  sessionId,
  onSummaryUpdate,
  onNameChange,
}: PatientCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(patient.name ?? '');
  const [isExpanded, setIsExpanded] = useState(true);

  const patientText = patient.transcriptSegments
    .filter((s) => !s.isInterim)
    .map((s) => s.text)
    .join(' ');

  const handleAnalyze = async () => {
    if (!patientText.trim()) {
      setError('분석할 텍스트가 없습니다.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: patientText,
          patientNumber: patient.number,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? `HTTP ${response.status}`);
      }

      const summary: PatientSummary = await response.json();
      onSummaryUpdate(patient.id, summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 분석 중 오류 발생');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNameSave = () => {
    onNameChange(patient.id, nameInput);
    setIsEditing(false);
  };

  const duration =
    patient.endTime !== undefined
      ? formatDuration(patient.endTime - patient.startTime)
      : null;

  return (
    <div className="bg-dark-card border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <span className="text-blue-400 font-bold">{patient.number}</span>
          </div>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  placeholder="환자 이름"
                  className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm w-32 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  저장
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-slate-500 hover:text-slate-400 text-sm"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 group"
              >
                <span className="text-white font-semibold">
                  {patient.number}번 환자
                  {patient.name && ` - ${patient.name}`}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-500 text-xs">
                {formatTimestamp(patient.startTime)}
              </span>
              {duration && (
                <>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-slate-500 text-xs">{duration}</span>
                </>
              )}
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-slate-500 text-xs">
                {patient.transcriptSegments.filter((s) => !s.isInterim).length}개 발화
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !patientText.trim()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              isAnalyzing
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : !patientText.trim()
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isAnalyzing ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
                분석 중...
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
                AI 분석
              </>
            )}
          </button>

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-700/30">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Card body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* AI Summary */}
          {patient.summary ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-400 text-xs font-medium">AI 분석 완료</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Chief Complaint */}
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="text-slate-400 text-xs font-medium mb-1">주訴 (주요 증상)</div>
                  <div className="text-white text-sm">{patient.summary.chiefComplaint}</div>
                </div>

                {/* Symptoms */}
                {patient.summary.symptoms.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-slate-400 text-xs font-medium mb-2">증상</div>
                    <div className="flex flex-wrap gap-1.5">
                      {patient.summary.symptoms.map((symptom, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-amber-900/30 border border-amber-700/30 text-amber-300 text-xs rounded-full"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assessment */}
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="text-slate-400 text-xs font-medium mb-1">평가/진단</div>
                  <div className="text-white text-sm">{patient.summary.assessment}</div>
                </div>

                {/* Plan */}
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="text-slate-400 text-xs font-medium mb-1">치료 계획</div>
                  <div className="text-white text-sm">{patient.summary.plan}</div>
                </div>

                {/* Medications */}
                {patient.summary.medications && patient.summary.medications.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-slate-400 text-xs font-medium mb-2">처방 약물</div>
                    <div className="flex flex-wrap gap-1.5">
                      {patient.summary.medications.map((med, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-900/30 border border-blue-700/30 text-blue-300 text-xs rounded-full"
                        >
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-600 text-sm">
              {patientText.trim()
                ? 'AI 분석 버튼을 눌러 진료 내용을 요약하세요'
                : '이 환자의 음성 인식 텍스트가 없습니다'}
            </div>
          )}

          {/* Transcript preview */}
          {patientText.trim() && (
            <div>
              <div className="text-slate-500 text-xs font-medium mb-2">녹취록 미리보기</div>
              <div className="bg-slate-900/50 rounded-xl p-3 max-h-32 overflow-y-auto">
                <p className="text-slate-400 text-sm leading-relaxed">
                  {patientText.slice(0, 500)}
                  {patientText.length > 500 && '...'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
