export interface AudioContextState {
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  sourceNode: MediaStreamAudioSourceNode | null;
}

export function createAudioContext(): AudioContext {
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;
  return new AudioContextClass();
}

export function setupAnalyser(
  audioContext: AudioContext,
  stream: MediaStream
): { analyserNode: AnalyserNode; sourceNode: MediaStreamAudioSourceNode } {
  const analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.8;

  const sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyserNode);

  return { analyserNode, sourceNode };
}

export function getFrequencyData(analyserNode: AnalyserNode): Uint8Array {
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyserNode.getByteFrequencyData(dataArray);
  return dataArray;
}

export function getWaveformData(analyserNode: AnalyserNode): Uint8Array {
  const bufferLength = analyserNode.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyserNode.getByteTimeDomainData(dataArray);
  return dataArray;
}

export function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: BlobPart[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

export async function requestMicrophonePermission(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100,
    },
  });
}

export function calculateAudioLevel(dataArray: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  return sum / dataArray.length / 255;
}
