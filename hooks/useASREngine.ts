/**
 * ASR engine hook - cumulative inference with segment commits.
 *
 * Core responsibilities:
 * 1. Manage the audio slice source
 * 2. Send cumulative segment slices (segment start -> now)
 * 3. Commit segments on a fixed interval
 * 4. Handle out-of-order responses
 *
 * API notes:
 * - prompt: long-form context from prior transcript, suggested <8000 chars
 */

import { useState, useCallback, useRef } from 'react';
import {
  ASRConfig,
  ASREngineState,
  InferenceRecord,
  SegmentRecord,
  DEFAULT_CONFIG,
} from '@/types';
import { encodeWAV } from '@/lib/audio-processor';
import { transcribeAudio } from '@/lib/asr-client';
import { type AudioSliceSource } from '@/lib/audio-source';
import { useLocale } from '@/i18n/client';

interface UseASREngineReturn {
  // State
  state: ASREngineState;
  inferenceRecords: InferenceRecord[];
  segmentRecords: SegmentRecord[];

  // Actions
  initialize: (
    audioSource: AudioSliceSource,
    config: ASRConfig,
    totalDuration?: number
  ) => void;
  processChunk: (currentTime: number) => Promise<void>;
  pause: () => void;
  resume: () => void;
  complete: () => void;
  reset: () => void;

  // Config
  config: ASRConfig;
  setConfig: (config: Partial<ASRConfig>) => void;
}

export function useASREngine(): UseASREngineReturn {
  // Config state
  const [config, setConfigState] = useState<ASRConfig>(DEFAULT_CONFIG);
  const { locale } = useLocale();

  // Engine state
  const [state, setState] = useState<ASREngineState>({
    isRunning: false,
    isPaused: false,
    currentTime: 0,
    totalDuration: 0,
    segmentStartTime: 0,
    confirmedText: '',
    previewText: '',
    segmentCount: 0,
  });

  // Inference records
  const [inferenceRecords, setInferenceRecords] = useState<InferenceRecord[]>([]);

  // Segment records
  const [segmentRecords, setSegmentRecords] = useState<SegmentRecord[]>([]);

  // Refs (avoid stale closures)
  const audioSourceRef = useRef<AudioSliceSource | null>(null);
  const sessionIdRef = useRef<number>(0);
  const requestControllersRef = useRef<Map<number, AbortController>>(new Map());
  const requestSequenceRef = useRef<number>(0);
  const latestCompletedSequenceRef = useRef<number>(0);
  const confirmedTextRef = useRef<string>('');
  const segmentStartTimeRef = useRef<number>(0);
  const segmentIndexRef = useRef<number>(0);
  const currentPreviewTextRef = useRef<string>('');
  const pendingRequestsRef = useRef<number>(0);
  const isCompletingRef = useRef<boolean>(false);
  const isSegmentSwitchingRef = useRef<boolean>(false);  // Avoid duplicate segment switches
  const isCompleteExecutedRef = useRef<boolean>(false);  // Avoid duplicate completion

  /**
   * Update config.
   */
  const setConfig = useCallback((newConfig: Partial<ASRConfig>) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const abortPendingRequests = useCallback(() => {
    requestControllersRef.current.forEach((controller) => controller.abort());
    requestControllersRef.current.clear();
  }, []);

  /**
   * Initialize the engine.
   */
  const initialize = useCallback(
    (
      audioSource: AudioSliceSource,
      newConfig: ASRConfig,
      totalDuration: number = 0
    ) => {
      abortPendingRequests();
      sessionIdRef.current += 1;
      audioSourceRef.current = audioSource;
      requestSequenceRef.current = 0;
      latestCompletedSequenceRef.current = 0;
      confirmedTextRef.current = '';
      segmentStartTimeRef.current = 0;
      segmentIndexRef.current = 0;
      currentPreviewTextRef.current = '';
      pendingRequestsRef.current = 0;
      isCompletingRef.current = false;
      isSegmentSwitchingRef.current = false;
      isCompleteExecutedRef.current = false;

      setConfigState(newConfig);
      setState({
        isRunning: true,
        isPaused: false,
        currentTime: 0,
        totalDuration,
        segmentStartTime: 0,
        confirmedText: '',
        previewText: '',
        segmentCount: 0,
      });
      setInferenceRecords([]);
      setSegmentRecords([]);
    },
    [abortPendingRequests]
  );

  /**
   * Reset the engine (clear all records).
   */
  const reset = useCallback(() => {
    abortPendingRequests();
    sessionIdRef.current += 1;
    audioSourceRef.current = null;
    requestSequenceRef.current = 0;
    latestCompletedSequenceRef.current = 0;
    confirmedTextRef.current = '';
    segmentStartTimeRef.current = 0;
    segmentIndexRef.current = 0;
    currentPreviewTextRef.current = '';
    pendingRequestsRef.current = 0;
    isCompletingRef.current = false;
    isSegmentSwitchingRef.current = false;
    isCompleteExecutedRef.current = false;

    setState({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      totalDuration: 0,
      segmentStartTime: 0,
      confirmedText: '',
      previewText: '',
      segmentCount: 0,
    });
    setInferenceRecords([]);
    setSegmentRecords([]);
  }, [abortPendingRequests]);

  /**
   * Pause the engine.
   */
  const pause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  /**
   * Resume the engine.
   */
  const resume = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: false,
    }));
  }, []);

  /**
   * Execute final completion logic.
   */
  const doComplete = useCallback(() => {
    // Guard against double-complete
    if (isCompleteExecutedRef.current) return;
    isCompleteExecutedRef.current = true;

    setState((prev) => {
      // Merge remaining preview text into confirmed text
      const finalConfirmedText = prev.confirmedText + prev.previewText;
      confirmedTextRef.current = finalConfirmedText;

      return {
        ...prev,
        isRunning: false,
        confirmedText: finalConfirmedText,
        previewText: '',
      };
    });

    // Mark the active segment as committed
    setSegmentRecords((prev) => {
      const updated = [...prev];
      const activeIndex = updated.findIndex((s) => s.status === 'active');
      if (activeIndex >= 0) {
        updated[activeIndex] = {
          ...updated[activeIndex],
          status: 'committed',
          text: currentPreviewTextRef.current,
        };
      }
      return updated;
    });

    isCompletingRef.current = false;
  }, []);

  /**
   * Mark transcription as complete.
   */
  const complete = useCallback(() => {
    isCompletingRef.current = true;

    if (pendingRequestsRef.current === 0) {
      doComplete();
    }
  }, [doComplete]);

  /**
   * Extract the tail of the context string.
   */
  const extractContextTail = (text: string, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(-maxLength);
  };

  const isAbortError = (error: unknown): boolean => {
    if (error instanceof DOMException) {
      return error.name === 'AbortError';
    }
    if (error instanceof Error) {
      return error.name === 'AbortError';
    }
    return false;
  };

  /**
   * Switch segments.
   * Returns true if the switch occurs, false if already switching.
   */
  const handleSegmentSwitch = useCallback(
    (currentTime: number, currentPreviewText: string): boolean => {
      // Prevent concurrent switches
      if (isSegmentSwitchingRef.current) return false;
      isSegmentSwitchingRef.current = true;

      try {
        const segmentId = `segment-${segmentIndexRef.current}-${Date.now()}`;

        // Create a committed segment record
        const completedSegment: SegmentRecord = {
          id: segmentId,
          index: segmentIndexRef.current,
          startTime: segmentStartTimeRef.current,
          endTime: currentTime,
          text: currentPreviewText,
          status: 'committed',
        };

        setSegmentRecords((prev) => {
          // Replace any active segment with the committed one
          const updated = prev.filter((s) => s.status !== 'active');
          return [...updated, completedSegment];
        });

        // Append to confirmed text
        confirmedTextRef.current += currentPreviewText;

        // Move to the next segment
        segmentIndexRef.current++;
        segmentStartTimeRef.current = currentTime;
        currentPreviewTextRef.current = '';
        audioSourceRef.current?.trimBefore?.(segmentStartTimeRef.current);

        // Update state
        setState((prev) => ({
          ...prev,
          segmentStartTime: currentTime,
          confirmedText: confirmedTextRef.current,
          previewText: '',
          segmentCount: prev.segmentCount + 1,
        }));

        return true;
      } finally {
        isSegmentSwitchingRef.current = false;
      }
    },
    []
  );

  /**
   * Process one time tick - core pipeline.
   *
   * Flow:
   * 1. Compute segment duration
   * 2. Slice audio and encode WAV
   * 3. Call ASR API with prompt context
   * 4. Apply response to preview text
   * 5. Switch segments when needed
   */
  const processChunk = useCallback(
    async (currentTime: number) => {
      const audioSource = audioSourceRef.current;
      if (!audioSource) return;

      const sessionId = sessionIdRef.current;

      // Capture current segment state at request time
      const segmentStartTime = segmentStartTimeRef.current;
      const segmentIndex = segmentIndexRef.current;
      const segmentDuration = currentTime - segmentStartTime;

      // Update time counters
      setState((prev) => ({
        ...prev,
        currentTime,
        totalDuration: Math.max(prev.totalDuration, currentTime),
      }));

      // Skip if the segment slice is too short
      if (segmentDuration < 0.5) return;

      const audioSlice = audioSource.getSlice(segmentStartTime, currentTime);
      if (!audioSlice) return;

      const audioBlob = encodeWAV(audioSlice);

      // Increment sequence number
      const currentSequence = ++requestSequenceRef.current;
      const recordId = `req-${currentSequence}-${Date.now()}`;
      const controller = new AbortController();

      requestControllersRef.current.set(currentSequence, controller);
      pendingRequestsRef.current++;

      // Extract prompt context tail
      const promptText = extractContextTail(confirmedTextRef.current, 100);

      // Create an inference record
      // Use the closed-over segmentIndex to tag the request
      const newRecord: InferenceRecord = {
        id: recordId,
        timestamp: Date.now(),
        audioStartTime: segmentStartTime,
        audioEndTime: currentTime,
        audioDuration: segmentDuration,
        prompt: promptText,
        rawResponse: '',
        previewText: '',
        status: 'pending',
        requestSequence: currentSequence,
        segmentIndex: segmentIndex, // Closed-over index, not ref
      };

      setInferenceRecords((prev) => [...prev, newRecord]);

      try {
        // Mark as streaming
        setInferenceRecords((prev) =>
          prev.map((r) =>
            r.id === recordId ? { ...r, status: 'streaming' as const } : r
          )
        );

        const { text: responseText, rawResponse } = await transcribeAudio({
          audioBlob,
          prompt: promptText,
          config,
          timeRange: {
            startTime: segmentStartTime,
            endTime: currentTime,
          },
          signal: controller.signal,
          locale,
          segmentIndex,
        });

        if (sessionId !== sessionIdRef.current) {
          return;
        }

        // Discard older results if a newer one already finished
        if (currentSequence < latestCompletedSequenceRef.current) {
          setInferenceRecords((prev) =>
            prev.map((r) =>
              r.id === recordId
                ? {
                    ...r,
                    status: 'completed' as const,
                    previewText: responseText,
                    rawResponse,
                  }
                : r
            )
          );
          return;
        }

        latestCompletedSequenceRef.current = currentSequence;
        currentPreviewTextRef.current = responseText;

        // Update the inference record
        setInferenceRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  status: 'completed' as const,
                  previewText: responseText,
                  rawResponse,
                }
              : r
          )
        );

        // Update preview text
        setState((prev) => ({
          ...prev,
          previewText: responseText,
        }));

        // Update or create the active segment record
        // Use segmentStartTimeRef to avoid races with segment switching
        setSegmentRecords((prev) => {
          const activeIndex = prev.findIndex((s) => s.status === 'active');
          if (activeIndex >= 0) {
            const updated = [...prev];
            updated[activeIndex] = {
              ...updated[activeIndex],
              endTime: currentTime,
              text: responseText,
            };
            return updated;
          }

          // Create a new active segment using ref values to avoid races
          return [
            ...prev,
            {
              id: `segment-${segmentIndexRef.current}-active`,
              index: segmentIndexRef.current,
              startTime: segmentStartTimeRef.current, // Use ref instead of closed-over value
              endTime: currentTime,
              text: responseText,
              status: 'active' as const,
            },
          ];
        });

        // Switch segments if the current one exceeded the duration
        const currentSegmentDuration = currentTime - segmentStartTimeRef.current;
        if (currentSegmentDuration >= config.segmentDuration) {
          handleSegmentSwitch(currentTime, responseText);
        }
      } catch (error) {
        if (sessionId !== sessionIdRef.current) {
          return;
        }

        const isAbort = isAbortError(error);
        const errorMessage = isAbort ? 'Request cancelled' : String(error);

        if (!isAbort) {
          console.error('Inference error:', error);
        }

        setInferenceRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? { ...r, status: 'error' as const, error: errorMessage }
              : r
          )
        );
      } finally {
        requestControllersRef.current.delete(currentSequence);

        if (sessionId !== sessionIdRef.current) {
          return;
        }

        pendingRequestsRef.current--;

        if (isCompletingRef.current && pendingRequestsRef.current === 0) {
          doComplete();
        }
      }
    },
    [config, doComplete, handleSegmentSwitch, locale]
  );

  return {
    state,
    inferenceRecords,
    segmentRecords,
    initialize,
    processChunk,
    pause,
    resume,
    complete,
    reset,
    config,
    setConfig,
  };
}
