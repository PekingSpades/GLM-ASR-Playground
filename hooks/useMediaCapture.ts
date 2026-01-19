/**
 * Media capture hook.
 *
 * Responsibilities:
 * 1. Capture microphone audio
 * 2. Capture screen audio (system sound)
 * 3. Maintain a chunked audio buffer with optional trimming
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChunkedAudioSource, type AudioSliceSource } from '@/lib/audio-source';

export type AudioSourceType = 'file' | 'microphone' | 'screen';
export type MediaCaptureError =
  | 'microphone-access-denied'
  | 'screen-audio-not-selected'
  | 'screen-capture-failed';
type CleanupAudioNode = AudioNode & { _cleanup?: () => void };

interface UseMediaCaptureReturn {
  // State
  isCapturing: boolean;
  isPaused: boolean;
  currentTime: number;
  sourceType: AudioSourceType | null;
  error: MediaCaptureError | null;

  // Actions
  startMicrophone: () => Promise<boolean>;
  startScreenCapture: () => Promise<boolean>;
  startTimer: () => boolean;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  getAudioSource: () => AudioSliceSource | null;

  // Config
  chunkInterval: number;
  setChunkInterval: (interval: number) => void;
}

interface UseMediaCaptureOptions {
  chunkInterval?: number;
  onChunk?: (currentTime: number) => void;
  onError?: (error: MediaCaptureError) => void;
}

export function useMediaCapture(
  options: UseMediaCaptureOptions = {}
): UseMediaCaptureReturn {
  const { onChunk, onError } = options;

  // State
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [sourceType, setSourceType] = useState<AudioSourceType | null>(null);
  const [error, setError] = useState<MediaCaptureError | null>(null);
  const [chunkInterval, setChunkInterval] = useState(options.chunkInterval || 200);

  // Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<CleanupAudioNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioSourceRef = useRef<ChunkedAudioSource | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onChunkRef = useRef(onChunk);
  const onErrorRef = useRef(onError);
  const isCapturingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const getAudioSource = useCallback(() => audioSourceRef.current, []);

  // Refresh callback refs
  useEffect(() => {
    onChunkRef.current = onChunk;
    onErrorRef.current = onError;
  }, [onChunk, onError]);

  /**
   * Initialize audio processing (ScriptProcessor fallback).
   */
  const initAudioProcessing = useCallback(async (stream: MediaStream) => {
    // Create AudioContext
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    audioSourceRef.current = new ChunkedAudioSource(audioContext);

    // Create media stream source
    const sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNodeRef.current = sourceNode;

    // Use ScriptProcessorNode for broad compatibility
    const bufferSize = 4096;
    const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    scriptProcessor.onaudioprocess = (event) => {
      if (!isCapturingRef.current || isPausedRef.current) return;

      const inputData = event.inputBuffer.getChannelData(0);
      // Copy the buffer to avoid reference issues
      const chunk = new Float32Array(inputData.length);
      chunk.set(inputData);
      audioSourceRef.current?.appendChunk(chunk);
    };

    // Connect nodes
    sourceNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    // Keep a cleanup hook for teardown
    const processorNode: CleanupAudioNode = scriptProcessor;
    processorNode._cleanup = () => {
      scriptProcessor.disconnect();
      sourceNode.disconnect();
    };
    workletNodeRef.current = processorNode;
  }, []);

  /**
   * Start the interval timer that emits chunk ticks.
   */
  const startChunkTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      if (onChunkRef.current) {
        onChunkRef.current(elapsed);
      }
    }, chunkInterval);
  }, [chunkInterval]);

  useEffect(() => {
    if (isCapturingRef.current && !isPausedRef.current) {
      startChunkTimer();
    }
  }, [chunkInterval, startChunkTimer]);

  /**
   * Stop capture (idempotent).
   */
  const stop = useCallback(() => {
    // Idempotency guard
    if (!isCapturingRef.current && !intervalRef.current && !mediaStreamRef.current) {
      return;
    }

    // Stop timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup audio processing nodes
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current._cleanup?.();
      } catch {
        // Ignore cleanup errors
      }
      workletNodeRef.current = null;
    }

    // Close AudioContext (ignore errors)
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore errors from a closed AudioContext
      }
      audioContextRef.current = null;
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch {
        // Ignore errors from stopped tracks
      }
      mediaStreamRef.current = null;
    }

    // Reset state
    isCapturingRef.current = false;
    isPausedRef.current = false;
    setIsCapturing(false);
    setIsPaused(false);
    setCurrentTime(0);
    setSourceType(null);
    audioSourceRef.current?.reset();
    audioSourceRef.current = null;
  }, []);

  /**
   * Start microphone capture.
   * Returns true on success, false on failure.
   * Note: does not auto-start the timer; call startTimer() after init.
   */
  const startMicrophone = useCallback(async (): Promise<boolean> => {
    let stream: MediaStream | null = null;

    try {
      setError(null);

      // Request microphone access
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
        video: false,
      });

      mediaStreamRef.current = stream;
      setSourceType('microphone');

      // Init audio processing
      await initAudioProcessing(stream);

      // Reset state
      audioSourceRef.current?.reset();
      startTimeRef.current = Date.now();
      pausedAtRef.current = 0;

      isCapturingRef.current = true;
      isPausedRef.current = false;
      setIsCapturing(true);
      setIsPaused(false);
      setCurrentTime(0);

      // Timer is started by the caller after engine init
      return true;
    } catch (err) {
      // Cleanup any created resources
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      mediaStreamRef.current = null;
      setSourceType(null);

      console.error('Microphone capture error:', err);
      const errorCode: MediaCaptureError = 'microphone-access-denied';
      setError(errorCode);
      if (onErrorRef.current) {
        onErrorRef.current(errorCode);
      }
      return false;
    }
  }, [initAudioProcessing]);

  /**
   * Start screen capture (system audio).
   * Returns true on success, false on failure.
   * Note: does not auto-start the timer; call startTimer() after init.
   */
  const startScreenCapture = useCallback(async (): Promise<boolean> => {
    let stream: MediaStream | null = null;

    try {
      setError(null);

      // Request screen share (with audio)
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 16000,
      };

      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required by many browsers
        audio: audioConstraints,
      });

      // Ensure an audio track is present
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        setSourceType(null);
        const errorCode: MediaCaptureError = 'screen-audio-not-selected';
        setError(errorCode);
        if (onErrorRef.current) {
          onErrorRef.current(errorCode);
        }
        return false;
      }

      // Keep the video track to avoid browser audio shutdown

      mediaStreamRef.current = stream;
      setSourceType('screen');

      // Init audio processing
      await initAudioProcessing(stream);

      // Reset state
      audioSourceRef.current?.reset();
      startTimeRef.current = Date.now();
      pausedAtRef.current = 0;

      isCapturingRef.current = true;
      isPausedRef.current = false;
      setIsCapturing(true);
      setIsPaused(false);
      setCurrentTime(0);

      // Timer is started by the caller after engine init

      // Stop capture when screen sharing ends
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stop();
      });

      return true;
    } catch (err) {
      // Cleanup any created resources
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      mediaStreamRef.current = null;
      setSourceType(null);

      console.error('Screen capture error:', err);
      const errorCode: MediaCaptureError = 'screen-capture-failed';
      setError(errorCode);
      if (onErrorRef.current) {
        onErrorRef.current(errorCode);
      }
      return false;
    }
  }, [initAudioProcessing, stop]);

  /**
   * Pause capture.
   */
  const pause = useCallback(() => {
    if (!isCapturingRef.current || isPausedRef.current) return;

    isPausedRef.current = true;
    setIsPaused(true);
    pausedAtRef.current = (Date.now() - startTimeRef.current) / 1000;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Resume capture.
   */
  const resume = useCallback(() => {
    if (!isCapturingRef.current || !isPausedRef.current) return;

    isPausedRef.current = false;
    setIsPaused(false);
    startTimeRef.current = Date.now() - pausedAtRef.current * 1000;

    // Clear any existing timer first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Restart the timer
    startChunkTimer();
  }, [startChunkTimer]);

  /**
   * Start the timer manually after capture init.
   * Returns true if started, false if paused/stopped.
   */
  const startTimer = useCallback((): boolean => {
    if (isCapturingRef.current && !isPausedRef.current) {
      startChunkTimer();
      return true;
    }
    return false;
  }, [startChunkTimer]);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isCapturing,
    isPaused,
    currentTime,
    sourceType,
    error,
    startMicrophone,
    startScreenCapture,
    startTimer,
    pause,
    resume,
    stop,
    getAudioSource,
    chunkInterval,
    setChunkInterval,
  };
}
