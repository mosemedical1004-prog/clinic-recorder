import { TranscriptSegment } from '@/types';

const DEFAULT_KEYWORDS = [
  '다음 환자',
  '다음분',
  '번 환자',
  '새 환자',
  '호출',
  '다음',
  'next patient',
  '入ってください',
  '다음 분',
  '들어오세요',
  '들어오십시오',
  '환자 교체',
];

export const DEFAULT_SILENCE_TIMEOUT_MINUTES = 2;

export interface PatientDetectionResult {
  shouldCreateNewPatient: boolean;
  reason: 'keyword' | 'time-gap' | 'manual' | null;
  matchedKeyword?: string;
}

export function detectNewPatient(
  newSegment: TranscriptSegment,
  previousSegments: TranscriptSegment[],
  keywords: string[] = DEFAULT_KEYWORDS,
  silenceTimeoutMinutes: number = DEFAULT_SILENCE_TIMEOUT_MINUTES
): PatientDetectionResult {
  // Check for keyword match
  const lowerText = newSegment.text.toLowerCase();
  const matchedKeyword = keywords.find((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );

  if (matchedKeyword) {
    return {
      shouldCreateNewPatient: true,
      reason: 'keyword',
      matchedKeyword,
    };
  }

  // Check for time gap
  if (previousSegments.length > 0) {
    const lastSegment = previousSegments[previousSegments.length - 1];
    const timeDiff = newSegment.timestamp - lastSegment.timestamp;
    const thresholdMs = silenceTimeoutMinutes * 60 * 1000;

    if (timeDiff > thresholdMs) {
      return {
        shouldCreateNewPatient: true,
        reason: 'time-gap',
      };
    }
  }

  return {
    shouldCreateNewPatient: false,
    reason: null,
  };
}

export function extractPatientNameFromText(text: string): string | null {
  // Try to extract a name from patterns like "홍길동 환자", "환자 홍길동"
  const patterns = [
    /([가-힣]{2,4})\s*(?:씨|님|환자)/,
    /(?:환자|patient)\s*[:：]?\s*([가-힣]{2,4}|[a-zA-Z]+\s+[a-zA-Z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function buildPatientTranscript(
  segments: TranscriptSegment[],
  patientId: string
): string {
  return segments
    .filter((s) => s.patientId === patientId && !s.isInterim)
    .map((s) => s.text)
    .join(' ');
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
