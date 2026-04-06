'use client';

import React from 'react';
import { RecordingControlsProps } from '@/types';
import { formatDuration } from '@/lib/patientDetector';

export default function RecordingControls({
  state,
  onStart,
  onStop,
  onPause,
  onResume,
  onAddPatientMarker,
  currentPatientNumber,
  duration,
}: RecordingControlsProps) {
  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isStopped = state === 'stopped';

  return (
    <div className="flex flex-col gap-4">
      {/* Current patient display */}
      {isRecording && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-blue-400 text-sm font-medium mb-1">현재 진료 중</div>
          <div className="text-white text-4xl font-bold">{currentPatientNumber}번</div>
          <div className="text-slate-400 text-sm mt-1">환자</div>
        </div>
      )}

      {/* 녹음 시작 */}
      {(isIdle || isStopped) && (
        <button
          onClick={onStart}
          className="w-full min-h-[72px] bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-red-600/20"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white" />
          </div>
          {isStopped ? '새 녹음 시작' : '녹음 시작'}
        </button>
      )}

      {/* 녹음 중 / 일시정지: 환자 추가 + 일시정지/재개 + 진료 종료 */}
      {(isRecording || isPaused) && (
        <>
          {/* 환자 추가 버튼 */}
          <button
            onClick={onAddPatientMarker}
            disabled={isPaused}
            className="w-full min-h-[72px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-blue-600/20"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            다음 환자
          </button>

          {/* 일시정지 / 재개 버튼 */}
          {isPaused ? (
            <button
              onClick={onResume}
              className="w-full min-h-[56px] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              재개
            </button>
          ) : (
            <button
              onClick={onPause}
              className="w-full min-h-[56px] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              일시정지
            </button>
          )}

          {/* 진료 종료 버튼 */}
          <button
            onClick={onStop}
            className="w-full min-h-[64px] bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
          >
            <div className="w-5 h-5 bg-white rounded-sm" />
            진료 종료
          </button>
        </>
      )}

      {/* 녹음 시간 / 환자 수 */}
      {(isRecording || isPaused) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-slate-400 text-xs mb-1">녹음 시간</div>
            <div className="text-white font-mono font-bold text-lg">
              {formatDuration(duration)}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-slate-400 text-xs mb-1">환자 수</div>
            <div className="text-blue-400 font-bold text-lg">{currentPatientNumber}명</div>
          </div>
        </div>
      )}
    </div>
  );
}
