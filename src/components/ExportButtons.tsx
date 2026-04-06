'use client';

import React, { useState } from 'react';
import { ExportButtonsProps } from '@/types';
import { exportTXT, exportPDF } from '@/lib/export';

export default function ExportButtons({ session }: ExportButtonsProps) {
  const [exportingPDF, setExportingPDF] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownloadAudio = () => {
    if (!session.audioBlob) return;
    const now = new Date(session.startTime);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const ampm = now.getHours() < 12 ? '오전' : '오후';
    const ext = session.audioBlob.type.includes('ogg') ? 'ogg' : session.audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
    const filename = `${yyyy}-${mm}-${dd}_${ampm}_진료녹음.${ext}`;
    const url = URL.createObjectURL(session.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showMessage('success', '녹음 파일이 다운로드되었습니다');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportTXT = () => {
    try {
      exportTXT(session);
      showMessage('success', 'TXT 파일이 다운로드되었습니다');
    } catch (err) {
      showMessage('error', 'TXT 내보내기 실패');
      console.error(err);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await exportPDF(session);
      showMessage('success', 'PDF 파일이 다운로드되었습니다');
    } catch (err) {
      showMessage('error', 'PDF 내보내기 실패');
      console.error(err);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {message && (
        <div
          className={`px-3 py-2 rounded-xl text-sm text-center ${
            message.type === 'success'
              ? 'bg-green-900/30 text-green-400 border border-green-700/30'
              : 'bg-red-900/30 text-red-400 border border-red-700/30'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleExportTXT}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white rounded-xl font-medium transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          TXT 내보내기
        </button>

        <button
          onClick={handleExportPDF}
          disabled={exportingPDF}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-700 hover:bg-red-600 active:bg-red-800 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors text-sm"
        >
          {exportingPDF ? (
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
              생성 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              PDF 내보내기
            </>
          )}
        </button>
      </div>

      <button
        onClick={handleDownloadAudio}
        disabled={!session.audioBlob}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 18.364V12m0 0V5.636m0 6.364l-2.828 2.828M12 12l2.828 2.828M19.07 4.929a9 9 0 010 12.728M4.929 4.929a9 9 0 000 12.728" />
        </svg>
        {session.audioBlob
          ? `녹음 파일 다운로드 (${(session.audioBlob.size / 1024 / 1024).toFixed(1)} MB)`
          : '녹음 파일 없음'}
      </button>

      <div className="text-slate-600 text-xs text-center">
        {session.patients.length}명 환자 ·{' '}
        {session.transcript.filter((s) => !s.isInterim).length}개 구간 ·{' '}
        {session.patients.filter((p) => p.summary).length}개 AI 요약
      </div>
    </div>
  );
}
