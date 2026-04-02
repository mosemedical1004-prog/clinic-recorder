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
  pause: () => void;
  resume: () => void;
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
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
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
      const elapsed =
        Date.now() - startTimeRef.current - pausedDurationRef.current;
      setDuration(elapsed);
    }, 100);
  }, [clearTimer]);

  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      pausedDurationRef.current = 0;

      const stream = await requestMicrophonePermission();
      streamRef.current = stream;

      // Set up audio context and analyser
      const audioContext = createAudioContext();
      audioContextRef.current = audioContext;

      const { analyserNode: analyser, sourceNode } = setupAnalyser(
        audioContext,
        stream
      );
      sourceNodeRef.current = sourceNode;
      setAnalyserNode(analyser);

      // Set up media recorder
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

      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      setState('recording');
      startTimer();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      setState('idle');
    }
  }, [startTimer]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      pauseStartRef.current = Date.now();
      setState('paused');
      clearTimer();
    }
  }, [state, clearTimer]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      const pauseDuration = Date.now() - pauseStartRef.current;
      pausedDurationRef.current += pauseDuration;
      mediaRecorderRef.current.resume();
      setState('recording');
      startTimer();
    }
  }, [state, startTimer]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;

      clearTimer();

      if (
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }

      // Clean up stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Disconnect audio nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setAnalyserNode(null);
      setState('stopped');
    });
  }, [clearTimer]);

  // Cleanup on unmount
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

  return {
    state,
    duration,
    audioBlob,
    analyserNode,
    start,
    pause,
    resume,
    stop,
    error,
  };
}
