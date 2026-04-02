'use client';

import React from 'react';
import { RecordingControlsProps } from '@/types';
import { formatDuration } from '@/lib/patientDetector';

export default function RecordingControls({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  onAddPatientMarker,
  currentPatientNumber,
  duration,
}: RecordingControlsProps) {
  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isStopped = state === 'stopped';
  const isActive = isRecording || isPaused;

  return (
    <div className="flex flex-col gap-4">
      {/* Current patient display */}
      {isActive && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-blue-400 text-sm font-medium mb-1">현재 진료 중</div>
          <div className="text-white text-4xl font-bold">
            {currentPatientNumber}번
          </div>
          <div className="text-slate-400 text-sm mt-1">환자</div>
        </div>
      )}

      {/* Main recording button */}
      <div className="flex flex-col items-center gap-4">
        {isIdle && (
          <button
            onClick={onStart}
            className="w-full min-h-[72px] bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-red-600/20 hover:shadow-red-500/30"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
            녹음 시작
          </button>
        )}

        {isRecording && (
          <div className="w-full flex gap-3">
            <button
              onClick={onPause}
              className="flex-1 min-h-[72px] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              일시정지
            </button>
            <button
              onClick={onStop}
              className="flex-1 min-h-[72px] bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <div className="w-5 h-5 bg-white rounded-sm" />
              정지
            </button>
          </div>
        )}

        {isPaused && (
          <div className="w-full flex gap-3">
            <button
              onClick={onResume}
              className="flex-1 min-h-[72px] bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              계속하기
            </button>
            <button
              onClick={onStop}
              className="flex-1 min-h-[72px] bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <div className="w-5 h-5 bg-white rounded-sm" />
              정지
            </button>
          </div>
        )}

        {isStopped && (
          <button
            onClick={onStart}
            className="w-full min-h-[72px] bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-red-600/20"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
            새 녹음 시작
          </button>
        )}
      </div>

      {/* Add patient marker button */}
      {isActive && (
        <button
          onClick={onAddPatientMarker}
          className="w-full min-h-[64px] bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/40 border border-blue-500/50 hover:border-blue-400/70 text-blue-300 hover:text-blue-200 text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          환자 마커 추가
        </button>
      )}

      {/* Recording stats */}
      {isActive && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-slate-400 text-xs mb-1">녹음 시간</div>
            <div className="text-white font-mono font-bold text-lg">
              {formatDuration(duration)}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <div className="text-slate-400 text-xs mb-1">환자 수</div>
            <div className="text-blue-400 font-bold text-lg">
              {currentPatientNumber}명
            </div>
          </div>
        </div>
      )}

      {/* Status indicator for paused */}
      {isPaused && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 text-center">
          <div className="text-amber-400 text-sm">
            일시정지 중 - 녹음과 음성 인식이 중단됩니다
          </div>
        </div>
      )}
    </div>
  );
}
