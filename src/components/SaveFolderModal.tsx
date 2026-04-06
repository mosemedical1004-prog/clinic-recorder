'use client';

import React, { useState } from 'react';
import { requestSaveDirectory } from '@/lib/fileSystem';

interface SaveFolderModalProps {
  onClose: (folderName?: string) => void;
}

export default function SaveFolderModal({ onClose }: SaveFolderModalProps) {
  const [selecting, setSelecting] = useState(false);

  const handleSelect = async () => {
    setSelecting(true);
    try {
      const name = await requestSaveDirectory();
      onClose(name ?? undefined);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-dark-card border border-slate-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 bg-blue-600/20 rounded-2xl mx-auto mb-4">
          <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </div>

        <h2 className="text-white font-bold text-lg text-center mb-2">저장 폴더를 선택해주세요</h2>
        <p className="text-slate-400 text-sm text-center mb-1">
          TXT, PDF, 녹음 파일이 모두 선택한 폴더에 자동으로 저장됩니다.
        </p>
        <p className="text-slate-500 text-xs text-center mb-6">
          설정에서 언제든지 폴더를 변경할 수 있습니다.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSelect}
            disabled={selecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
          >
            {selecting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                선택 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                지금 선택하기
              </>
            )}
          </button>

          <button
            onClick={() => onClose()}
            className="w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl text-sm transition-colors"
          >
            나중에 선택 (기본 다운로드 폴더 사용)
          </button>
        </div>
      </div>
    </div>
  );
}
