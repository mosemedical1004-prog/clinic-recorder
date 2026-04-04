/**
 * recordingEngine.ts
 * Module-level singleton for MediaRecorder.
 * Lives outside React — immune to component mounting/unmounting.
 * Components subscribe via useSyncExternalStore.
 */

import type { RecordingState } from '@/types';

interface RecordingSnapshot {
  readonly state: RecordingState;
  readonly duration: number;
  readonly audioBlob: Blob | null;
  readonly analyserNode: AnalyserNode | null;
  readonly error: string | null;
}

// ─── Module-level state (never reset by React) ──────────────────────────────
let _mr: MediaRecorder | null = null;
let _stream: MediaStream | null = null;
let _audioCtx: AudioContext | null = null;
let _analyserNode: AnalyserNode | null = null;
let _chunks: Blob[] = [];
let _startTime = 0;
let _timer: ReturnType<typeof setInterval> | null = null;
let _resolveStop: ((b: Blob | null) => void) | null = null;
let _mimeType = '';

let _snap: RecordingSnapshot = {
  state: 'idle',
  duration: 0,
  audioBlob: null,
  analyserNode: null,
  error: null,
};

const _subs = new Set<() => void>();

function _notify(patch: Partial<RecordingSnapshot>) {
  _snap = { ..._snap, ...patch };
  _subs.forEach((fn) => fn());
}

// ─── useSyncExternalStore interface ─────────────────────────────────────────
export const subscribe = (fn: () => void) => {
  _subs.add(fn);
  return () => _subs.delete(fn);
};

export const getSnapshot = (): RecordingSnapshot => _snap;

export const getServerSnapshot = (): RecordingSnapshot => ({
  state: 'idle',
  duration: 0,
  audioBlob: null,
  analyserNode: null,
  error: null,
});

// ─── Actions ────────────────────────────────────────────────────────────────
export async function start(): Promise<void> {
  try {
    _chunks = [];
    _notify({ error: null, audioBlob: null });

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
    });
    _stream = stream;

    const AudioCtxCls = (window as any).AudioContext || (window as any).webkitAudioContext;
    _audioCtx = new AudioCtxCls() as AudioContext;

    const analyser = _audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    _audioCtx.createMediaStreamSource(stream).connect(analyser);
    _analyserNode = analyser;

    _mimeType = detectMime();
    const mr = new MediaRecorder(stream, { mimeType: _mimeType || undefined });
    _mr = mr;

    mr.ondataavailable = (e) => { if (e.data?.size > 0) _chunks.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(_chunks, { type: _mimeType || 'audio/webm' });
      if (_resolveStop) { _resolveStop(blob); _resolveStop = null; }
      _notify({ audioBlob: blob });
    };

    mr.start(1000);
    _startTime = Date.now();

    if (_timer) clearInterval(_timer);
    _timer = setInterval(() => _notify({ duration: Date.now() - _startTime }), 100);

    _notify({ state: 'recording', analyserNode: _analyserNode, duration: 0 });
  } catch (err) {
    _notify({ error: err instanceof Error ? err.message : '녹음 시작 실패', state: 'idle' });
  }
}

export function stop(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!_mr) { resolve(null); return; }

    _resolveStop = resolve;

    if (_timer) { clearInterval(_timer); _timer = null; }
    if (_mr.state !== 'inactive') { _mr.stop(); } else { resolve(null); }

    _stream?.getTracks().forEach((t) => t.stop());
    _stream = null;
    _audioCtx?.close().catch(() => {});
    _audioCtx = null;
    _analyserNode = null;

    _notify({ state: 'stopped', analyserNode: null });
  });
}

function detectMime(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}
