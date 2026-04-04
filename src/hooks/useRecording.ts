'use client';

import { useSyncExternalStore } from 'react';
import * as engine from '@/lib/recordingEngine';

export function useRecording() {
  const snap = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getServerSnapshot
  );

  return {
    state: snap.state,
    duration: snap.duration,
    audioBlob: snap.audioBlob,
    analyserNode: snap.analyserNode,
    error: snap.error,
    start: engine.start,
    stop: engine.stop,
  };
}
