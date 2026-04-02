'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptSegment } from '@/types';
import { generateId } from '@/lib/patientDetector';

interface UseTranscriptionReturn {
  segments: TranscriptSegment[];
  interimText: string;
  isListening: boolean;
  isSupported: boolean;
  start: (language?: string) => void;
  stop: () => void;
  clearTranscript: () => void;
  addManualSegment: (text: string, patientId?: string) => TranscriptSegment;
  setPatientForSegments: (patientId: string, fromIndex: number) => void;
}

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T }
  ? T
  : typeof window extends { webkitSpeechRecognition: infer T }
  ? T
  : never;

export function useTranscription(): UseTranscriptionReturn {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const languageRef = useRef('ko-KR');
  const currentPatientIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setIsSupported(supported);
  }, []);

  const createRecognition = useCallback((language: string) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      const newSegments: TranscriptSegment[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          const segment: TranscriptSegment = {
            id: generateId(),
            text: transcript.trim(),
            timestamp: Date.now(),
            patientId: currentPatientIdRef.current,
            isInterim: false,
          };
          if (segment.text) {
            newSegments.push(segment);
          }
        } else {
          interim += transcript;
        }
      }

      if (newSegments.length > 0) {
        setSegments((prev) => [...prev, ...newSegments]);
      }
      setInterimText(interim);
    };

    recognition.onend = () => {
      setInterimText('');
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore restart errors
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // These are non-fatal, recognition will auto-restart
        return;
      }
      if (event.error === 'not-allowed') {
        shouldRestartRef.current = false;
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  const start = useCallback(
    (language: string = 'ko-KR') => {
      if (!isSupported) return;

      languageRef.current = language;
      shouldRestartRef.current = true;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      const recognition = createRecognition(language);
      if (!recognition) return;

      recognitionRef.current = recognition;

      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    },
    [isSupported, createRecognition]
  );

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const clearTranscript = useCallback(() => {
    setSegments([]);
    setInterimText('');
  }, []);

  const addManualSegment = useCallback(
    (text: string, patientId?: string): TranscriptSegment => {
      const segment: TranscriptSegment = {
        id: generateId(),
        text,
        timestamp: Date.now(),
        patientId: patientId ?? currentPatientIdRef.current,
        isInterim: false,
      };
      setSegments((prev) => [...prev, segment]);
      return segment;
    },
    []
  );

  const setPatientForSegments = useCallback(
    (patientId: string, fromIndex: number) => {
      currentPatientIdRef.current = patientId;
      setSegments((prev) =>
        prev.map((seg, idx) =>
          idx >= fromIndex && !seg.patientId ? { ...seg, patientId } : seg
        )
      );
    },
    []
  );

  // Update current patient ID when called externally
  const setCurrentPatientId = useCallback((patientId: string | undefined) => {
    currentPatientIdRef.current = patientId;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return {
    segments,
    interimText,
    isListening,
    isSupported,
    start,
    stop,
    clearTranscript,
    addManualSegment,
    setPatientForSegments,
  };
}
