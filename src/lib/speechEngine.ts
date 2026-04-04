/**
 * speechEngine.ts
 * Module-level singleton for SpeechRecognition.
 * Lives outside React — immune to component mounting/unmounting.
 * Components subscribe via useSyncExternalStore.
 * Handles visibilitychange for browser tab switching.
 */

import type { TranscriptSegment } from '@/types';

interface SpeechSnapshot {
  readonly segments: TranscriptSegment[];
  readonly interimText: string;
  readonly isListening: boolean;
  readonly isSupported: boolean;
}

// ─── Module-level state ──────────────────────────────────────────────────────
let _recognition: any = null;
let _shouldRestart = false;
let _language = 'ko-KR';
let _currentPatientId: string | undefined;

let _snap: SpeechSnapshot = {
  segments: [],
  interimText: '',
  isListening: false,
  isSupported: false,
};

const _subs = new Set<() => void>();

function _notify(patch: Partial<SpeechSnapshot>) {
  _snap = { ..._snap, ...patch };
  _subs.forEach((fn) => fn());
}

// Set isSupported once in browser
if (typeof window !== 'undefined') {
  _snap = {
    ..._snap,
    isSupported: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
  };
}

// ─── useSyncExternalStore interface ──────────────────────────────────────────
export const subscribe = (fn: () => void) => {
  _subs.add(fn);
  return () => _subs.delete(fn);
};

export const getSnapshot = (): SpeechSnapshot => _snap;

export const getServerSnapshot = (): SpeechSnapshot => ({
  segments: [],
  interimText: '',
  isListening: false,
  isSupported: false,
});

// ─── Internal: create and start recognition ───────────────────────────────
function _createAndStart() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return;

  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = _language;
  r.maxAlternatives = 1;
  _recognition = r;

  r.onresult = (event: any) => {
    let interim = '';
    const newSegs: TranscriptSegment[] = [];

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = res[0].transcript;
      if (res.isFinal) {
        if (text.trim()) {
          newSegs.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            text: text.trim(),
            timestamp: Date.now(),
            patientId: _currentPatientId,
            isInterim: false,
          });
        }
      } else {
        interim += text;
      }
    }

    _notify({
      segments: newSegs.length ? [..._snap.segments, ...newSegs] : _snap.segments,
      interimText: interim,
    });
  };

  r.onend = () => {
    _notify({ interimText: '' });
    if (_shouldRestart) {
      // Don't restart if browser tab is hidden — visibilitychange will do it
      if (typeof document !== 'undefined' && !document.hidden) {
        try { r.start(); } catch { _notify({ isListening: false }); }
      }
    } else {
      _notify({ isListening: false });
    }
  };

  r.onerror = (e: any) => {
    if (e.error === 'not-allowed') {
      _shouldRestart = false;
      _notify({ isListening: false });
    }
    // 'no-speech' / 'audio-capture' are non-fatal; onend will restart
  };

  try {
    r.start();
    _notify({ isListening: true });
  } catch {
    _notify({ isListening: false });
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────
export function start(language = 'ko-KR') {
  if (typeof window === 'undefined') return;
  _language = language;
  _shouldRestart = true;

  if (_recognition) { try { _recognition.stop(); } catch {} }
  _createAndStart();
}

export function stop() {
  _shouldRestart = false;
  if (_recognition) { try { _recognition.stop(); } catch {} }
  _notify({ isListening: false, interimText: '' });
}

export function setCurrentPatientId(id: string | undefined) {
  _currentPatientId = id;
}

export function clearTranscript() {
  _notify({ segments: [], interimText: '' });
}

export function addManualSegment(text: string, patientId?: string): TranscriptSegment {
  const seg: TranscriptSegment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    text,
    timestamp: Date.now(),
    patientId: patientId ?? _currentPatientId,
    isInterim: false,
  };
  _notify({ segments: [..._snap.segments, seg] });
  return seg;
}

export function assignPatientToUnassigned(patientId: string) {
  const updated = _snap.segments.map((s) =>
    !s.isInterim && !s.patientId ? { ...s, patientId } : s
  );
  _currentPatientId = patientId;
  _notify({ segments: updated });
}

export function setPatientForSegments(patientId: string, fromIndex: number) {
  _currentPatientId = patientId;
  _notify({
    segments: _snap.segments.map((s, i) =>
      i >= fromIndex && !s.patientId ? { ...s, patientId } : s
    ),
  });
}

// ─── Browser tab visibility — restart when tab becomes visible ───────────────
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _shouldRestart) {
      setTimeout(() => {
        if (!_shouldRestart) return;
        if (_recognition) { try { _recognition.stop(); } catch {} }
        _createAndStart();
      }, 300);
    }
  });
}
