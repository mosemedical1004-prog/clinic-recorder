export interface Patient {
  id: string;
  number: number;
  startTime: number; // ms from session start
  endTime?: number;
  name?: string;
  transcriptSegments: TranscriptSegment[];
  summary?: PatientSummary;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  patientId?: string;
  isInterim: boolean;
}

export interface PatientSummary {
  chiefComplaint: string;
  symptoms: string[];
  assessment: string;
  plan: string;
  medications?: string[];
  rawText: string;
}

export interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  patients: Patient[];
  transcript: TranscriptSegment[];
  audioBlob?: Blob;
  lastSaved: number;
  settings: SessionSettings;
}

export interface SessionSettings {
  language: string;
  autoDetectPatients: boolean;
  autoSaveInterval: number; // seconds
  patientKeywords: string[];
  silenceTimeoutMinutes: number;
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface AppSettings {
  language: string;
  autoDetectPatients: boolean;
  autoSaveInterval: number;
  patientKeywords: string[];
  darkMode: boolean;
  silenceTimeoutMinutes: number;
}

export interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  isPaused: boolean;
}

export interface RecordingControlsProps {
  state: RecordingState;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onAddPatientMarker: () => void;
  currentPatientNumber: number;
  duration: number;
}

export interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  patients: Patient[];
  currentPatientId?: string;
  onPatientSelect?: (patientId: string) => void;
}

export interface PatientCardProps {
  patient: Patient;
  sessionId: string;
  onSummaryUpdate: (patientId: string, summary: PatientSummary) => void;
  onNameChange: (patientId: string, name: string) => void;
}

export interface ExportButtonsProps {
  session: Session;
}

export interface SessionSidebarProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
}
