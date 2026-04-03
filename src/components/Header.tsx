'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDuration } from '@/lib/patientDetector';
import { RecordingState } from '@/types';

interface HeaderProps {
  recordingState: RecordingState;
  duration: number;
  patientCount: number;
  lastSaved: number | null;
  isSaving: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({
  recordingState,
  duration,
  patientCount,
  lastSaved,
  isSaving,
  darkMode,
  onToggleDarkMode,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStateIndicator = () => {
    switch (recordingState) {
      case 'recording':
        return (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-slow" />
            <span className="text-red-400 font-medium text-sm">녹음 중</span>
          </span>
        );
      case 'stopped':
        return (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-slate-400 font-medium text-sm">정지됨</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span className="text-slate-500 font-medium text-sm">대기 중</span>
          </span>
        );
    }
  };

  const getLastSavedText = () => {
    if (isSaving) return '저장 중...';
    if (!lastSaved) return null;
    const time = new Date(lastSaved).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `자동 저장됨 ${time}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-dark-bg border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 gap-4">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <span className="text-white font-bold text-lg hidden sm:block">
              진료 녹음기
            </span>
          </Link>

          <nav className="flex items-center gap-1 hidden md:flex">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              녹음
            </Link>
            <Link
              href="/history"
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              기록
            </Link>
            <Link
              href="/settings"
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              설정
            </Link>
          </nav>
        </div>

        {/* Center: Timer + Status */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className={`font-mono text-2xl font-bold tabular-nums ${
              recordingState === 'recording'
                ? 'text-red-400'
                : 'text-slate-300'
            }`}
          >
            {formatDuration(duration)}
          </div>
          <div className="flex items-center gap-2">
            {getStateIndicator()}
          </div>
        </div>

        {/* Right: Stats + Controls */}
        <div className="flex items-center gap-3">
          {/* Patient count */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-white font-bold">{patientCount}</span>
            <span className="text-slate-400 text-sm hidden sm:block">명</span>
          </div>

          {/* Auto-save indicator */}
          {(isSaving || getLastSavedText()) && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400">{getLastSavedText()}</span>
                </>
              )}
            </div>
          )}

          {/* Current time */}
          <div className="text-slate-400 text-sm font-mono hidden lg:block">
            {currentTime}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title={darkMode ? '라이트 모드' : '다크 모드'}
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
