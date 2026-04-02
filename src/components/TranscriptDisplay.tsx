'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TranscriptDisplayProps, Patient, TranscriptSegment } from '@/types';
import { formatTimestamp } from '@/lib/patientDetector';

const PATIENT_COLORS = [
  'border-blue-500 bg-blue-500/5',
  'border-green-500 bg-green-500/5',
  'border-purple-500 bg-purple-500/5',
  'border-orange-500 bg-orange-500/5',
  'border-pink-500 bg-pink-500/5',
  'border-cyan-500 bg-cyan-500/5',
  'border-yellow-500 bg-yellow-500/5',
  'border-red-500 bg-red-500/5',
];

const PATIENT_HEADER_COLORS = [
  'bg-blue-600/20 text-blue-300 border-blue-500/30',
  'bg-green-600/20 text-green-300 border-green-500/30',
  'bg-purple-600/20 text-purple-300 border-purple-500/30',
  'bg-orange-600/20 text-orange-300 border-orange-500/30',
  'bg-pink-600/20 text-pink-300 border-pink-500/30',
  'bg-cyan-600/20 text-cyan-300 border-cyan-500/30',
  'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
  'bg-red-600/20 text-red-300 border-red-500/30',
];

interface SegmentGroup {
  patientId?: string;
  patient?: Patient;
  patientIndex: number;
  segments: TranscriptSegment[];
}

export default function TranscriptDisplay({
  segments,
  patients,
  currentPatientId,
  onPatientSelect,
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  // Group segments by patient
  const groupedSegments: SegmentGroup[] = [];
  let currentGroup: SegmentGroup | null = null;

  segments
    .filter((s) => !s.isInterim)
    .forEach((segment) => {
      const patient = patients.find((p) => p.id === segment.patientId);
      const patientIndex = patient
        ? patients.findIndex((p) => p.id === patient.id)
        : -1;

      if (!currentGroup || currentGroup.patientId !== segment.patientId) {
        currentGroup = {
          patientId: segment.patientId,
          patient,
          patientIndex,
          segments: [],
        };
        groupedSegments.push(currentGroup);
      }
      currentGroup.segments.push(segment);
    });

  const noPatientSegments = segments.filter(
    (s) => !s.isInterim && !s.patientId
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <h2 className="text-slate-300 font-semibold text-sm flex items-center gap-2">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          음성 인식 텍스트
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">
            {segments.filter((s) => !s.isInterim).length}개 구간
          </span>
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-600/10 rounded-lg"
            >
              최신으로
            </button>
          )}
        </div>
      </div>

      {/* Transcript content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
      >
        {segments.filter((s) => !s.isInterim).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
            <svg
              className="w-10 h-10 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <p className="text-sm">녹음을 시작하면 음성 인식 텍스트가 여기 표시됩니다</p>
          </div>
        ) : (
          groupedSegments.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Patient header divider */}
              {group.patient && (
                <button
                  onClick={() =>
                    group.patient && onPatientSelect?.(group.patient.id)
                  }
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium mb-2 transition-all ${
                    PATIENT_HEADER_COLORS[
                      group.patientIndex % PATIENT_HEADER_COLORS.length
                    ]
                  } ${
                    currentPatientId === group.patientId
                      ? 'ring-1 ring-offset-1 ring-offset-slate-900'
                      : 'hover:opacity-80'
                  }`}
                >
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {group.patient.number}번 환자
                  {group.patient.name && ` - ${group.patient.name}`}
                  <span className="ml-auto text-xs opacity-70">
                    {formatTimestamp(group.segments[0]?.timestamp ?? 0)}
                  </span>
                </button>
              )}

              {/* Segments */}
              <div
                className={`pl-3 border-l-2 space-y-1.5 ${
                  group.patient
                    ? PATIENT_COLORS[
                        group.patientIndex % PATIENT_COLORS.length
                      ].split(' ')[0]
                    : 'border-slate-700'
                }`}
              >
                {group.segments.map((segment) => (
                  <div key={segment.id} className="flex gap-2 group">
                    <span className="text-slate-600 text-xs mt-0.5 shrink-0 font-mono">
                      {new Date(segment.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <p className="text-slate-200 text-base leading-relaxed">
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Interim text */}
        {segments
          .filter((s) => s.isInterim)
          .map((segment) => (
            <div key={segment.id} className="flex gap-2">
              <span className="text-slate-700 text-xs mt-0.5 shrink-0 font-mono">
                {new Date(segment.timestamp).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <p className="text-slate-500 text-base leading-relaxed italic">
                {segment.text}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
