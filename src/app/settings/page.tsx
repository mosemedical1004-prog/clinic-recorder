'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppSettings } from '@/types';
import { getSettings, saveSettings, clearAllData, DEFAULT_SETTINGS } from '@/lib/db';
import {
  requestSaveDirectory,
  getSavedFolderName,
  clearSavedDirectoryHandle,
  isFileSystemAccessSupported,
} from '@/lib/fileSystem';

const LANGUAGE_OPTIONS = [
  { value: 'ko-KR', label: '한국어 (ko-KR)' },
  { value: 'en-US', label: 'English (en-US)' },
  { value: 'ja-JP', label: '日本語 (ja-JP)' },
  { value: 'zh-CN', label: '中文 (zh-CN)' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savedFolderName, setSavedFolderName] = useState<string | null>(null);
  const [folderSelecting, setFolderSelecting] = useState(false);
  const fsSupported = isFileSystemAccessSupported();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getSettings();
        // Merge with localStorage override for silenceTimeoutMinutes
        const lsVal = localStorage.getItem('silenceTimeoutMinutes');
        const silenceFromLs = lsVal ? Number(lsVal) : null;
        if (data) {
          setSettings({
            ...data,
            silenceTimeoutMinutes:
              silenceFromLs ?? data.silenceTimeoutMinutes ?? DEFAULT_SETTINGS.silenceTimeoutMinutes,
          });
        } else if (silenceFromLs) {
          setSettings((prev) => ({ ...prev, silenceTimeoutMinutes: silenceFromLs }));
        }
        const folderName = await getSavedFolderName();
        setSavedFolderName(folderName);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSelectFolder = async () => {
    setFolderSelecting(true);
    try {
      const name = await requestSaveDirectory();
      if (name) setSavedFolderName(name);
    } finally {
      setFolderSelecting(false);
    }
  };

  const handleClearFolder = async () => {
    await clearSavedDirectoryHandle();
    setSavedFolderName(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      localStorage.setItem('silenceTimeoutMinutes', String(settings.silenceTimeoutMinutes));
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    const keyword = newKeyword.trim();
    if (!keyword || settings.patientKeywords.includes(keyword)) return;
    setSettings((prev) => ({
      ...prev,
      patientKeywords: [...prev.patientKeywords, keyword],
    }));
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSettings((prev) => ({
      ...prev,
      patientKeywords: prev.patientKeywords.filter((k) => k !== keyword),
    }));
  };

  const handleClearData = async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 5000);
      return;
    }

    setClearing(true);
    try {
      await clearAllData();
      setClearConfirm(false);
      alert('모든 데이터가 삭제되었습니다.');
    } catch (err) {
      console.error('Failed to clear data:', err);
    } finally {
      setClearing(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-dark-bg border-b border-slate-700/50 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
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
            <h1 className="text-white font-bold text-lg">설정</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors"
            >
              초기화
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                saved
                  ? 'bg-green-600 text-white'
                  : saving
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  저장 중...
                </>
              ) : saved ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  저장됨
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Recording Settings */}
        <section className="bg-dark-card border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h2 className="text-white font-semibold">녹음 설정</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Language */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                음성 인식 언어
              </label>
              <select
                value={settings.language}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, language: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-slate-500 text-xs mt-1">
                Chrome/Edge 브라우저에서 Web Speech API를 사용합니다
              </p>
            </div>

            {/* Auto-save interval */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                자동 저장 간격: {settings.autoSaveInterval}초
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={settings.autoSaveInterval}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoSaveInterval: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-slate-500 text-xs mt-1">
                <span>10초</span>
                <span>120초</span>
              </div>
            </div>
          </div>
        </section>

        {/* Auto Save Folder */}
        <section className="bg-dark-card border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h2 className="text-white font-semibold">자동 저장 폴더</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              녹음 종료 시 선택한 폴더에 TXT 파일이 자동으로 저장됩니다
            </p>
          </div>
          <div className="p-5 space-y-4">
            {!fsSupported ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-900/20 border border-amber-700/30 rounded-xl text-amber-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                이 브라우저는 File System Access API를 지원하지 않습니다. Chrome/Edge를 사용하세요.
              </div>
            ) : (
              <>
                {/* Current folder display */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/60 border border-slate-700/40 rounded-xl">
                  <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    {savedFolderName ? (
                      <>
                        <div className="text-white text-sm font-medium truncate">{savedFolderName}</div>
                        <div className="text-slate-500 text-xs">선택된 저장 폴더</div>
                      </>
                    ) : (
                      <div className="text-slate-500 text-sm">폴더가 선택되지 않았습니다</div>
                    )}
                  </div>
                </div>

                {/* File name preview */}
                {savedFolderName && (
                  <div className="px-3 py-2 bg-slate-800/40 rounded-lg">
                    <div className="text-slate-500 text-xs mb-1">저장될 파일명 예시</div>
                    <div className="text-slate-300 text-xs font-mono">
                      {(() => {
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        const dd = String(now.getDate()).padStart(2, '0');
                        const ampm = now.getHours() < 12 ? '오전' : '오후';
                        return `${yyyy}-${mm}-${dd}_${ampm}_진료기록_환자N명.txt`;
                      })()}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectFolder}
                    disabled={folderSelecting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    {folderSelecting ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                    )}
                    {savedFolderName ? '폴더 변경' : '폴더 선택'}
                  </button>
                  {savedFolderName && (
                    <button
                      onClick={handleClearFolder}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      해제
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Patient Detection */}
        <section className="bg-dark-card border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h2 className="text-white font-semibold">환자 자동 감지</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm font-medium">자동 감지 사용</div>
                <div className="text-slate-500 text-xs">
                  키워드 또는 2분 침묵으로 새 환자를 자동으로 감지합니다
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    autoDetectPatients: !prev.autoDetectPatients,
                  }))
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoDetectPatients ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.autoDetectPatients ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                감지 키워드
              </label>
              <p className="text-slate-500 text-xs mb-3">
                아래 키워드가 음성에서 감지되면 새 환자 구간이 시작됩니다
              </p>

              {/* Keyword list */}
              <div className="flex flex-wrap gap-2 mb-3">
                {settings.patientKeywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 border border-slate-600 rounded-full text-sm"
                  >
                    <span className="text-slate-300">{keyword}</span>
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-slate-500 hover:text-red-400 ml-1 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add keyword */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddKeyword();
                  }}
                  placeholder="새 키워드 추가..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddKeyword}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {/* Silence timeout */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 text-sm font-medium">
                  침묵 감지 시간
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.silenceTimeoutMinutes}
                    onChange={(e) => {
                      const v = Math.min(10, Math.max(1, Number(e.target.value)));
                      setSettings((prev) => ({ ...prev, silenceTimeoutMinutes: v }));
                    }}
                    className="w-14 px-2 py-1 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400 text-sm">분</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={settings.silenceTimeoutMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    silenceTimeoutMinutes: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-slate-500 text-xs mt-1">
                <span>1분</span>
                {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <span key={n}>{n}</span>
                ))}
                <span>10분</span>
              </div>
              <p className="text-slate-500 text-xs mt-2">
                마지막 발화 후 이 시간 이상 침묵하면 새 환자로 자동 감지합니다
              </p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-dark-card border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h2 className="text-white font-semibold">화면 설정</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm font-medium">다크 모드</div>
                <div className="text-slate-500 text-xs">어두운 테마 사용</div>
              </div>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    darkMode: !prev.darkMode,
                  }))
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.darkMode ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.darkMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* API Info */}
        <section className="bg-dark-card border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h2 className="text-white font-semibold">AI 설정</h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-slate-300 text-sm font-medium mb-1">
                Anthropic API 키
              </div>
              <div className="text-slate-500 text-xs">
                API 키는 서버 환경 변수에서 관리됩니다.{' '}
                <code className="bg-slate-700 px-1 py-0.5 rounded text-slate-300">
                  ANTHROPIC_API_KEY
                </code>{' '}
                환경 변수를 설정하세요.
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-slate-300 text-sm font-medium mb-1">사용 모델</div>
              <div className="text-slate-400 text-sm font-mono">claude-sonnet-4-6</div>
              <div className="text-slate-500 text-xs mt-1">
                진료 내용 분석 및 요약에 사용됩니다
              </div>
            </div>
          </div>
        </section>

        {/* Browser Support */}
        <section className="bg-dark-card border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h2 className="text-white font-semibold">브라우저 지원</h2>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {[
                {
                  name: '음성 인식 (Web Speech API)',
                  check: () =>
                    typeof window !== 'undefined' &&
                    ('SpeechRecognition' in window ||
                      'webkitSpeechRecognition' in window),
                  note: 'Chrome, Edge 권장',
                },
                {
                  name: '마이크 접근 (MediaRecorder)',
                  check: () =>
                    typeof window !== 'undefined' &&
                    'MediaRecorder' in window,
                  note: '모든 현대 브라우저',
                },
                {
                  name: '화면 유지 (Wake Lock API)',
                  check: () =>
                    typeof navigator !== 'undefined' &&
                    'wakeLock' in navigator,
                  note: 'Chrome, Edge',
                },
                {
                  name: '로컬 저장 (IndexedDB)',
                  check: () =>
                    typeof window !== 'undefined' && 'indexedDB' in window,
                  note: '모든 현대 브라우저',
                },
              ].map((feature) => {
                const isSupported =
                  typeof window !== 'undefined' ? feature.check() : false;
                return (
                  <div key={feature.name} className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-300 text-sm">{feature.name}</div>
                      <div className="text-slate-500 text-xs">{feature.note}</div>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        isSupported ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isSupported ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {isSupported ? '지원됨' : '미지원'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-dark-card border border-red-900/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-red-900/20">
            <h2 className="text-red-400 font-semibold">위험 구역</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm font-medium">모든 데이터 삭제</div>
                <div className="text-slate-500 text-xs">
                  저장된 모든 세션과 설정을 영구적으로 삭제합니다
                </div>
              </div>
              <button
                onClick={handleClearData}
                disabled={clearing}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                  clearConfirm
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                    : 'bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-800/30'
                }`}
              >
                {clearing ? (
                  '삭제 중...'
                ) : clearConfirm ? (
                  '정말 삭제하시겠습니까?'
                ) : (
                  '전체 삭제'
                )}
              </button>
            </div>
          </div>
        </section>

        {/* App info */}
        <div className="text-center text-slate-600 text-xs pb-4">
          <p>진료 녹음기 v0.1.0</p>
          <p className="mt-1">Powered by Claude AI · Built with Next.js 14</p>
        </div>
      </div>
    </div>
  );
}
