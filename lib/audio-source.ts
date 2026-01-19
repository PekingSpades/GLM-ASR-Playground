import { sliceAudioBuffer } from './audio-processor';

export interface AudioSliceSource {
  getSlice: (startTime: number, endTime: number) => AudioBuffer | null;
  trimBefore?: (timeSec: number) => void;
}

export function createAudioBufferSource(
  audioBuffer: AudioBuffer
): AudioSliceSource {
  return {
    getSlice: (startTime, endTime) => {
      if (endTime <= startTime) return null;
      try {
        return sliceAudioBuffer(audioBuffer, startTime, endTime);
      } catch {
        return null;
      }
    },
  };
}

export class ChunkedAudioSource implements AudioSliceSource {
  private readonly audioContext: AudioContext;
  private readonly sampleRate: number;
  private chunks: Float32Array[] = [];
  private baseSampleIndex = 0;
  private totalSamples = 0;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate;
  }

  appendChunk(chunk: Float32Array): void {
    if (chunk.length === 0) return;
    this.chunks.push(chunk);
    this.totalSamples += chunk.length;
  }

  reset(): void {
    this.chunks = [];
    this.baseSampleIndex = 0;
    this.totalSamples = 0;
  }

  trimBefore(timeSec: number): void {
    const targetSampleIndex = Math.floor(timeSec * this.sampleRate);
    let samplesToDrop = targetSampleIndex - this.baseSampleIndex;

    if (samplesToDrop <= 0) return;

    while (this.chunks.length > 0 && samplesToDrop > 0) {
      const head = this.chunks[0];
      if (samplesToDrop >= head.length) {
        samplesToDrop -= head.length;
        this.baseSampleIndex += head.length;
        this.totalSamples -= head.length;
        this.chunks.shift();
      } else {
        this.chunks[0] = head.subarray(samplesToDrop);
        this.baseSampleIndex += samplesToDrop;
        this.totalSamples -= samplesToDrop;
        samplesToDrop = 0;
      }
    }
  }

  getSlice(startTime: number, endTime: number): AudioBuffer | null {
    if (endTime <= startTime) return null;

    const absoluteStart = Math.floor(startTime * this.sampleRate);
    const absoluteEnd = Math.floor(endTime * this.sampleRate);
    const localStart = absoluteStart - this.baseSampleIndex;
    const localEnd = absoluteEnd - this.baseSampleIndex;

    const clampedStart = Math.max(0, localStart);
    const clampedEnd = Math.min(this.totalSamples, localEnd);
    const length = clampedEnd - clampedStart;

    if (length <= 0) return null;

    try {
      const buffer = this.audioContext.createBuffer(
        1,
        length,
        this.sampleRate
      );
      const channel = buffer.getChannelData(0);

      let offset = 0;
      let writeIndex = 0;

      for (const chunk of this.chunks) {
        const chunkStart = offset;
        const chunkEnd = offset + chunk.length;

        if (chunkEnd <= clampedStart) {
          offset = chunkEnd;
          continue;
        }

        if (chunkStart >= clampedEnd) {
          break;
        }

        const copyStart = Math.max(0, clampedStart - chunkStart);
        const copyEnd = Math.min(chunk.length, clampedEnd - chunkStart);
        const slice = chunk.subarray(copyStart, copyEnd);

        channel.set(slice, writeIndex);
        writeIndex += slice.length;
        offset = chunkEnd;
      }

      return buffer;
    } catch {
      return null;
    }
  }
}
