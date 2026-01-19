/**
 * Audio processing utilities.
 *
 * Responsibilities:
 * 1. Decode uploaded audio into AudioBuffer
 * 2. Slice AudioBuffer by time range
 * 3. Encode AudioBuffer into a WAV Blob
 */

/**
 * Create a shared AudioContext instance.
 * Synchronous creation avoids theoretical race conditions.
 */
let audioContextInstance: AudioContext | null = null;
let audioContextCreating = false;  // Guard against concurrent creation

export function getAudioContext(): AudioContext {
  if (audioContextInstance) {
    return audioContextInstance;
  }

  // Guard against re-entrancy
  if (audioContextCreating) {
    throw new Error('AudioContext is being created');
  }

  audioContextCreating = true;
  try {
    audioContextInstance = new AudioContext();
    return audioContextInstance;
  } finally {
    audioContextCreating = false;
  }
}

/**
 * Decode an audio file into an AudioBuffer.
 */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = getAudioContext();

  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

/**
 * Slice an AudioBuffer by time range.
 */
export function sliceAudioBuffer(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  // Compute sample offsets
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.min(Math.floor(endTime * sampleRate), audioBuffer.length);
  const length = endSample - startSample;

  if (length <= 0) {
    throw new Error(`Invalid slice range: ${startTime}s - ${endTime}s`);
  }

  // Create the sliced buffer
  const audioContext = getAudioContext();
  const slicedBuffer = audioContext.createBuffer(
    numberOfChannels,
    length,
    sampleRate
  );

  // Copy samples into the new buffer
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel);
    const targetData = slicedBuffer.getChannelData(channel);

    for (let i = 0; i < length; i++) {
      targetData[i] = sourceData[startSample + i];
    }
  }

  return slicedBuffer;
}

/**
 * Encode an AudioBuffer as a WAV Blob.
 */
export function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  // Mix channels down to mono (ASR typically uses mono)
  const monoData = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i];
    }
    monoData[i] = sum / numberOfChannels;
  }

  // Convert to 16-bit PCM
  const pcmData = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    // Clamp to [-1, 1]
    const sample = Math.max(-1, Math.min(1, monoData[i]));
    // Convert to 16-bit integer
    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }

  // Build WAV buffer
  const wavBuffer = createWAVBuffer(pcmData, sampleRate);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Create a WAV ArrayBuffer.
 */
function createWAVBuffer(pcmData: Int16Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length * (bitsPerSample / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  // File size (minus RIFF header)
  view.setUint32(4, totalSize - 8, true);
  // WAVE header
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true);  // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true); // Channel count
  view.setUint32(24, sampleRate, true);  // Sample rate
  view.setUint32(28, byteRate, true);    // Byte rate
  view.setUint16(32, blockAlign, true);  // Block align
  view.setUint16(34, bitsPerSample, true); // Bit depth

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Data size

  // Write PCM data
  const pcmOffset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(pcmOffset + i * 2, pcmData[i], true);
  }

  return buffer;
}

/**
 * Write a string into a DataView.
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Get audio duration in seconds.
 */
export function getAudioDuration(audioBuffer: AudioBuffer): number {
  return audioBuffer.duration;
}

/**
 * Format a time value for display.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
