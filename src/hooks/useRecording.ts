'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingState } from '@/types';
import {
  createAudioContext,
  setupAnalyser,
  getSupportedMimeType,
  requestMicrophonePermission,
} from '@/lib/audio';

interface UseRecordingReturn {
  state: RecordingState;
  duration: number;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  error: string | null;
}

export function useRecording(): UseRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setDuration(Date.now() - startTimeRef.current);
    }, 100);
  }, [clearTimer]);

  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];

      const stream = await requestMicrophonePermission();
      streamRef.current = stream;

      const audioContext = createAudioContext();
      audioContextRef.current = audioContext;

      const { analyserNode: analyser, sourceNode } = setupAnalyser(audioContext, stream);
      sourceNodeRef.current = sourceNode;
      setAnalyserNode(analyser);

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        if (resolveStopRef.current) {
          resolveStopRef.current(blob);
          resolveStopRef.current = null;
        }
      };

      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      setState('recording');
      startTimer();
    } catch (err) {
      const message = err instanceof Error ? err.message : '녹음을 시작할 수 없습니다';
      setError(message);
      setState('idle');
    }
  }, [startTimer]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;
      clearTimer();

      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setAnalyserNode(null);
      setState('stopped');
    });
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [clearTimer]);

  return { state, duration, audioBlob, analyserNode, start, stop, error };
}
