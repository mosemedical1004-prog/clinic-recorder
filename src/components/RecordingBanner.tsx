'use client';

import React from 'react';
import { useRecordingContext } from '@/contexts/RecordingContext';
import { formatDuration } from '@/lib/patientDetector';

export default function RecordingBanner() {
  const { recording, patients } = useRecordingContext();

  if (recording.state !== 'recording') return null;

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between gap-4 px-4 py-1.5 bg-red-950/90 border-b border-red-800/60 backdrop-blur-sm">
      {/* Left: status */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-red-300 text-sm font-semibold tracking-wide">녹음 중</span>
      </div>

      {/* Center: timer */}
      <span className="font-mono text-white font-bold text-sm tabular-nums">
        {formatDuration(recording.duration)}
      </span>

      {/* Right: patient count */}
      <span className="text-red-300 text-xs">
        환자 {patients.length}명
      </span>
    </div>
  );
}
