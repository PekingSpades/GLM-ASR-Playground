/**
 * Audio stream simulator hook.
 *
 * Responsibilities:
 * 1. Simulate real-time capture by ticking at a fixed interval
 * 2. Manage playback state (play, pause, stop)
 * 3. Emit callbacks for each time slice
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { decodeAudioFile } from '@/lib/audio-processor';

interface UseAudioSimulatorReturn {
  // State
  isLoaded: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  totalDuration: number;
  audioBuffer: AudioBuffer | null;

  // Actions
  loadAudioFile: (file: File) => Promise<void>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekTo: (time: number) => void;

  // Config
  chunkInterval: number;
  setChunkInterval: (interval: number) => void;
}

interface UseAudioSimulatorOptions {
  chunkInterval?: number; // Chunk interval, default 200ms
  onChunk?: (currentTime: number) => void;
  onComplete?: () => void;
}

export function useAudioSimulator(
  options: UseAudioSimulatorOptions = {}
): UseAudioSimulatorReturn {
  const { onChunk, onComplete } = options;

  // State
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [chunkInterval, setChunkInterval] = useState(options.chunkInterval || 200);

  // Refs
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const onChunkRef = useRef(onChunk);
  const onCompleteRef = useRef(onComplete);
  const isPlayingRef = useRef<boolean>(false);  // Avoid stale closures
  const isPausedRef = useRef<boolean>(false);   // Avoid stale closures

  const emitTick = useCallback(() => {
    const buffer = audioBufferRef.current;
    if (!buffer) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    if (elapsed >= buffer.duration) {
      setCurrentTime(buffer.duration);
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (onChunkRef.current) {
        onChunkRef.current(buffer.duration);
      }

      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
      return;
    }

    setCurrentTime(elapsed);

    if (onChunkRef.current) {
      onChunkRef.current(elapsed);
    }
  }, []);

  const startTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      emitTick();
    }, chunkInterval);
  }, [chunkInterval, emitTick]);

  // Refresh callback refs
  useEffect(() => {
    onChunkRef.current = onChunk;
    onCompleteRef.current = onComplete;
  }, [onChunk, onComplete]);

  /**
   * Load an audio file.
   */
  const loadAudioFile = useCallback(async (file: File) => {
    try {
      const buffer = await decodeAudioFile(file);
      audioBufferRef.current = buffer;
      setAudioBuffer(buffer);
      setTotalDuration(buffer.duration);
      setCurrentTime(0);
      setIsLoaded(true);
      setIsPlaying(false);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw error;
    }
  }, []);

  /**
   * Start playback simulation.
   */
  const start = useCallback(() => {
    if (!audioBufferRef.current) return;

    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentTime(0);
    startTimeRef.current = Date.now();
    pausedAtRef.current = 0;

    startTicker();
  }, [startTicker]);

  /**
   * Pause playback simulation.
   */
  const pause = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current) return;

    isPausedRef.current = true;
    setIsPaused(true);
    pausedAtRef.current = (Date.now() - startTimeRef.current) / 1000;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Resume playback simulation.
   */
  const resume = useCallback(() => {
    if (!isPlayingRef.current || !isPausedRef.current) return;

    isPausedRef.current = false;
    setIsPaused(false);

    // Recompute the start time offset
    startTimeRef.current = Date.now() - pausedAtRef.current * 1000;

    startTicker();
  }, [startTicker]);

  /**
   * Stop playback simulation.
   */
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    startTimeRef.current = 0;
    pausedAtRef.current = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Seek to a specific time.
   */
  const seekTo = useCallback((time: number) => {
    const buffer = audioBufferRef.current;
    if (!buffer) return;

    const clampedTime = Math.max(0, Math.min(time, buffer.duration));
    setCurrentTime(clampedTime);

    if (isPlayingRef.current && !isPausedRef.current) {
      // When playing, shift the start time
      startTimeRef.current = Date.now() - clampedTime * 1000;
    } else {
      pausedAtRef.current = clampedTime;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlayingRef.current && !isPausedRef.current) {
      startTicker();
    }
  }, [chunkInterval, startTicker]);

  return {
    isLoaded,
    isPlaying,
    isPaused,
    currentTime,
    totalDuration,
    audioBuffer,
    loadAudioFile,
    start,
    pause,
    resume,
    stop,
    seekTo,
    chunkInterval,
    setChunkInterval,
  };
}
