'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Session } from '@/types';
import { getAllSessions, deleteSession } from '@/lib/db';
import { formatDuration } from '@/lib/patientDetector';

interface HistoryTabProps {
  onSwitchToRecording: () => void;
}

export default function HistoryTab({ onSwitchToRecording }: HistoryTabProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('이 세션을 영구적으로 삭제하시겠습니까?')) return;

    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSessions = sessions
    .filter((session) => {
      if (!searchQuery) return true;
      const dateStr = new Date(session.startTime).toLocaleDateString('ko-KR');
      const patientNames = session.patients.map((p) => p.name ?? '').join(' ');
      return (
        dateStr.includes(searchQuery) ||
        patientNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.id.includes(searchQuery)
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return b.startTime - a.startTime;
      return a.startTime - b.startTime;
    });

  const totalPatients = sessions.reduce((sum, s) => sum + s.patients.length, 0);
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
  const analyzedSessions = sessions.filter((s) => s.patients.some((p) => p.summary)).length;

  return (
    <div className="flex-1 overflow-y-auto bg-dark-bg">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-lg">세션 기록</h2>
            <p className="text-slate-500 text-xs">{sessions.length}개 세션</p>
          </div>
          <button
            onClick={onSwitchToRecording}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 녹음
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-dark-card border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{sessions.length}</div>
            <div className="text-slate-400 text-xs mt-1">총 세션</div>
          </div>
          <div className="bg-dark-card border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{totalPatients}</div>
            <div className="text-slate-400 text-xs mt-1">총 환자</div>
          </div>
          <div className="bg-dark-card border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{formatDuration(totalDuration)}</div>
            <div className="text-slate-400 text-xs mt-1">총 녹음 시간</div>
          </div>
          <div className="bg-dark-card border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{analyzedSessions}</div>
            <div className="text-slate-400 text-xs mt-1">AI 분석 완료</div>
          </div>
        </div>

        {/* Search and sort */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="날짜 또는 환자 이름으로 검색..."
              className="w-full pl-9 pr-4 py-2.5 bg-dark-card border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="px-3 py-2.5 bg-dark-card border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </div>

        {/* Session list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-14 h-14 mx-auto mb-3 text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-slate-500 text-lg">
              {searchQuery ? '검색 결과가 없습니다' : '저장된 세션이 없습니다'}
            </p>
            {!searchQuery && (
              <button
                onClick={onSwitchToRecording}
                className="inline-block mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
              >
                첫 녹음 시작하기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="bg-dark-card border border-slate-700/50 hover:border-slate-600/70 rounded-2xl overflow-hidden transition-colors group"
              >
                <Link href={`/analysis?id=${session.id}`} className="block p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-white font-semibold">
                          {new Date(session.startTime).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </div>
                        <div className="text-slate-500 text-sm">
                          {new Date(session.startTime).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {session.endTime && (
                            <>
                              {' '}-{' '}
                              {new Date(session.endTime).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 text-sm">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-slate-300">{formatDuration(session.duration)}</span>
                        </span>

                        <span className="flex items-center gap-1.5 text-sm">
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-blue-400">{session.patients.length}명 환자</span>
                        </span>

                        <span className="flex items-center gap-1.5 text-sm">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-slate-400">
                            {session.transcript.filter((s) => !s.isInterim).length}개 발화
                          </span>
                        </span>

                        {session.patients.some((p) => p.summary) && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-900/30 border border-green-700/30 text-green-400 rounded-full">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            AI 분석 {session.patients.filter((p) => p.summary).length}건
                          </span>
                        )}
                      </div>

                      {session.patients.some((p) => p.name) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {session.patients
                            .filter((p) => p.name)
                            .map((p) => (
                              <span key={p.id} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                                {p.number}번 {p.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden group-hover:flex items-center gap-1 text-xs text-blue-400">
                        분석 보기
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(session.id);
                        }}
                        disabled={deletingId === session.id}
                        className="p-2 text-slate-600 hover:text-red-400 rounded-lg transition-colors"
                      >
                        {deletingId === session.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
