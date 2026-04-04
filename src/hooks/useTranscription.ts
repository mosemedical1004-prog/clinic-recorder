'use client';

import { useSyncExternalStore } from 'react';
import * as speech from '@/lib/speechEngine';

export function useTranscription() {
  const snap = useSyncExternalStore(
    speech.subscribe,
    speech.getSnapshot,
    speech.getServerSnapshot
  );

  return {
    segments: snap.segments,
    interimText: snap.interimText,
    isListening: snap.isListening,
    isSupported: snap.isSupported,
    start: speech.start,
    stop: speech.stop,
    clearTranscript: speech.clearTranscript,
    addManualSegment: speech.addManualSegment,
    setPatientForSegments: speech.setPatientForSegments,
    assignPatientToUnassigned: speech.assignPatientToUnassigned,
  };
}
