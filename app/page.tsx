'use client';

/**
 * ASR Demo - main page.
 *
 * Real-time speech transcription with:
 * - File upload
 * - Microphone capture
 * - Screen audio capture
 *
 * Segments are committed on a fixed interval.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  ControlBar,
  LiveTranscription,
  InferenceDebugger,
  MultiTrackTimeline,
  LanguageSwitcher,
} from '@/components';
import { useASREngine, useAudioSimulator, useMediaCapture, AudioSourceType } from '@/hooks';
import { TimelineSegment } from '@/types';
import { createAudioBufferSource } from '@/lib/audio-source';
import { useTranslations } from '@/i18n/client';

export default function Home() {
  const t = useTranslations('page');
  const tSegment = useTranslations('segmentDetail');
  const tA11y = useTranslations('accessibility');

  // ASR engine
  const {
    state: engineState,
    inferenceRecords,
    segmentRecords,
    initialize: initializeEngine,
    processChunk,
    pause: pauseEngine,
    resume: resumeEngine,
    complete: completeEngine,
    reset: resetEngine,
    config,
    setConfig,
  } = useASREngine();

  // Selected segment details
  const [selectedSegment, setSelectedSegment] = useState<TimelineSegment | null>(null);

  // Active audio source
  const [activeSource, setActiveSource] = useState<AudioSourceType | null>(null);
  const activeSourceRef = useRef<AudioSourceType | null>(null);  // Access latest value in async flows

  // Sync activeSource to ref
  useEffect(() => {
    activeSourceRef.current = activeSource;
  }, [activeSource]);

  // Subtitle window refs
  const subtitleWindowRef = useRef<Window | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const engineStateRef = useRef(engineState);  // Used in BroadcastChannel callbacks

  // Sync engineState to ref
  useEffect(() => {
    engineStateRef.current = engineState;
  }, [engineState]);

  // Initialize BroadcastChannel
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('asr-subtitle');

    // Listen for subtitle window requests
    broadcastChannelRef.current.onmessage = (event) => {
      if (event.data.type === 'request-data') {
        // Use ref for latest state
        const currentState = engineStateRef.current;
        broadcastChannelRef.current?.postMessage({
          type: 'subtitle-update',
          payload: {
            confirmedText: currentState.confirmedText,
            previewText: currentState.previewText,
            isRunning: currentState.isRunning,
          },
        });
      }
    };

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Push transcript updates to the subtitle window
  useEffect(() => {
    broadcastChannelRef.current?.postMessage({
      type: 'subtitle-update',
      payload: {
        confirmedText: engineState.confirmedText,
        previewText: engineState.previewText,
        isRunning: engineState.isRunning,
      },
    });
  }, [engineState.confirmedText, engineState.previewText, engineState.isRunning]);

  // Open subtitle window
  const openSubtitleWindow = useCallback(() => {
    // Focus existing window if it is still open
    if (subtitleWindowRef.current && !subtitleWindowRef.current.closed) {
      subtitleWindowRef.current.focus();
      return;
    }

    // Open a new window
    const width = 600;
    const height = 200;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + window.outerHeight - height - 100;

    subtitleWindowRef.current = window.open(
      '/subtitle',
      'subtitle-window',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );
  }, []);

  // File playback simulator
  const {
    isLoaded: fileIsLoaded,
    isPlaying: fileIsPlaying,
    isPaused: fileIsPaused,
    audioBuffer: fileAudioBuffer,
    loadAudioFile,
    start: startFileSimulator,
    pause: pauseFileSimulator,
    resume: resumeFileSimulator,
    stop: stopFileSimulator,
    setChunkInterval: setFileChunkInterval,
  } = useAudioSimulator({
    chunkInterval: config.chunkInterval,
    onChunk: useCallback((time: number) => {
      processChunk(time);
    }, [processChunk]),
    onComplete: useCallback(() => {
      console.log('Audio file simulation completed');
      completeEngine();
    }, [completeEngine]),
  });

  // Media capture (mic/screen)
  const {
    isCapturing,
    isPaused: mediaIsPaused,
    error: mediaError,
    startMicrophone,
    startScreenCapture,
    startTimer: startMediaTimer,
    pause: pauseMediaCapture,
    resume: resumeMediaCapture,
    stop: stopMediaCapture,
    getAudioSource: getMediaAudioSource,
    setChunkInterval: setMediaChunkInterval,
  } = useMediaCapture({
    chunkInterval: config.chunkInterval,
    onChunk: useCallback((time: number) => {
      processChunk(time);
    }, [processChunk]),
    onError: useCallback((error: string) => {
      console.error('Media capture error:', error);
    }, []),
  });

  // Sync chunk interval config
  useEffect(() => {
    setFileChunkInterval(config.chunkInterval);
    setMediaChunkInterval(config.chunkInterval);
  }, [config.chunkInterval, setFileChunkInterval, setMediaChunkInterval]);

  // Derived playback state
  const isPlaying = fileIsPlaying || isCapturing;
  const isPaused = fileIsPaused || mediaIsPaused;
  const isLoaded = fileIsLoaded || activeSource === 'microphone' || activeSource === 'screen';

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      await loadAudioFile(file);
      setActiveSource('file');
      console.log('Audio file loaded successfully');
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert(t('audioLoadError'));
    }
  }, [loadAudioFile, t]);

  // Activate microphone source
  const handleStartMicrophone = useCallback(async () => {
    if (fileIsPlaying) stopFileSimulator();
    if (isCapturing) stopMediaCapture();
    setActiveSource('microphone');
  }, [fileIsPlaying, isCapturing, stopFileSimulator, stopMediaCapture]);

  // Activate screen capture source
  const handleStartScreenCapture = useCallback(async () => {
    if (fileIsPlaying) stopFileSimulator();
    if (isCapturing) stopMediaCapture();
    setActiveSource('screen');
  }, [fileIsPlaying, isCapturing, stopFileSimulator, stopMediaCapture]);

  // Start transcription
  const handleStart = useCallback(async () => {
    // Capture the current source for async safety
    const sourceAtStart = activeSource;

    if (sourceAtStart === 'file' && fileAudioBuffer) {
      const audioSource = createAudioBufferSource(fileAudioBuffer);
      initializeEngine(audioSource, config, fileAudioBuffer.duration);
      startFileSimulator();
    } else if (sourceAtStart === 'microphone') {
      // 1) Request permission and init capture
      const success = await startMicrophone();
      if (!success) {
        // Permission denied or failed
        return;
      }
      // Ensure the source did not change while awaiting permission
      if (activeSourceRef.current !== sourceAtStart) {
        // User switched sources; stop capture
        stopMediaCapture();
        return;
      }
      // 2) Initialize ASR engine
      const mediaSource = getMediaAudioSource();
      if (!mediaSource) {
        stopMediaCapture();
        resetEngine();
        return;
      }
      initializeEngine(mediaSource, config);
      // 3) Start timer after init
      // If false, user stopped during the async flow; reset the engine
      if (!startMediaTimer()) {
        resetEngine();
      }
    } else if (sourceAtStart === 'screen') {
      // 1) Request permission and init screen capture
      const success = await startScreenCapture();
      if (!success) {
        // Permission denied or failed
        return;
      }
      // Ensure the source did not change while awaiting permission
      if (activeSourceRef.current !== sourceAtStart) {
        // User switched sources; stop capture
        stopMediaCapture();
        return;
      }
      // 2) Initialize ASR engine
      const mediaSource = getMediaAudioSource();
      if (!mediaSource) {
        stopMediaCapture();
        resetEngine();
        return;
      }
      initializeEngine(mediaSource, config);
      // 3) Start timer after init
      // If false, user stopped during the async flow; reset the engine
      if (!startMediaTimer()) {
        resetEngine();
      }
    }
  }, [
    activeSource,
    fileAudioBuffer,
    config,
    initializeEngine,
    startFileSimulator,
    startMicrophone,
    startScreenCapture,
    startMediaTimer,
    resetEngine,
    stopMediaCapture,
    getMediaAudioSource,
  ]);

  // Pause transcription
  const handlePause = useCallback(() => {
    if (activeSource === 'file') {
      pauseFileSimulator();
    } else {
      pauseMediaCapture();
    }
    pauseEngine();
  }, [activeSource, pauseFileSimulator, pauseMediaCapture, pauseEngine]);

  // Resume transcription
  const handleResume = useCallback(() => {
    if (activeSource === 'file') {
      resumeFileSimulator();
    } else {
      resumeMediaCapture();
    }
    resumeEngine();
  }, [activeSource, resumeFileSimulator, resumeMediaCapture, resumeEngine]);

  // Stop transcription
  const handleStop = useCallback(() => {
    if (activeSource === 'file') {
      stopFileSimulator();
    } else {
      stopMediaCapture();
    }
    completeEngine();
    setSelectedSegment(null);
  }, [activeSource, stopFileSimulator, stopMediaCapture, completeEngine]);

  // Handle segment selection
  const handleSegmentClick = useCallback((segment: TimelineSegment) => {
    setSelectedSegment(segment);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 shadow-lg">
        <nav className="flex items-center justify-between" aria-label={tA11y('mainNavigation')}>
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-blue-100 text-xs mt-0.5">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
              <span className="text-blue-100">{t('model')}</span>
              <span className="font-mono">{config.model}</span>
            </div>
            <a
              href="https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E8%AF%AD%E9%9F%B3%E8%BD%AC%E6%96%87%E6%9C%AC"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              title={t('apiDocsTitle')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {t('apiDocs')}
            </a>
            <LanguageSwitcher />
          </div>
        </nav>
      </header>

      {/* Control bar */}
      <ControlBar
        config={config}
        onConfigChange={setConfig}
        onFileSelect={handleFileSelect}
        onStartMicrophone={handleStartMicrophone}
        onStartScreenCapture={handleStartScreenCapture}
        isLoaded={isLoaded}
        isPlaying={isPlaying}
        isPaused={isPaused}
        activeSource={activeSource}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        mediaError={mediaError}
      />

      {/* Main content */}
      <main className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0" aria-label={tA11y('mainContent')}>
        {/* Left: live transcription */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <LiveTranscription state={engineState} onOpenSubtitle={openSubtitleWindow} />
          </div>

          {/* Segment timeline */}
          <div className="flex-shrink-0">
            <MultiTrackTimeline
              state={engineState}
              segmentRecords={segmentRecords}
              inferenceRecords={inferenceRecords}
              onSegmentClick={handleSegmentClick}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-4">
          {/* Segment details (when selected) */}
          {selectedSegment && (
            <SegmentDetailPanel
              segment={selectedSegment}
              onClose={() => setSelectedSegment(null)}
              t={tSegment}
              tA11y={tA11y}
            />
          )}

          {/* Inference debugger */}
          <div className="flex-1 min-h-0">
            <InferenceDebugger
              inferenceRecords={inferenceRecords}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>{t('openSourceOn')}</span>
            <a
              href="https://github.com/PekingSpades/GLM-ASR-Playground"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              GitHub
            </a>
          </div>
          <span className="text-gray-300" aria-hidden="true">|</span>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 95 88" fill="none" aria-hidden="true">
              <path fill="#FFD21E" d="M47.21 76.5a34.75 34.75 0 1 0 0-69.5 34.75 34.75 0 0 0 0 69.5Z"/>
              <path fill="#FF9D0B" d="M81.96 41.75a34.75 34.75 0 1 0-69.5 0 34.75 34.75 0 0 0 69.5 0Zm-73.5 0a38.75 38.75 0 1 1 77.5 0 38.75 38.75 0 0 1-77.5 0Z"/>
              <path fill="#3A3B45" d="M58.5 32.3c1.28.44 1.78 3.06 3.07 2.38a5 5 0 1 0-6.76-2.07c.61 1.15 2.55-.72 3.7-.32ZM34.95 32.3c-1.28.44-1.79 3.06-3.07 2.38a5 5 0 1 1 6.76-2.07c-.61 1.15-2.56-.72-3.7-.32Z"/>
              <path fill="#FF323D" d="M46.96 56.29c9.83 0 13-8.76 13-13.26 0-2.34-1.57-1.6-4.09-.36-2.33 1.15-5.46 2.74-8.9 2.74-7.19 0-13-6.88-13-2.38s3.16 13.26 13 13.26Z"/>
              <path fill="#3A3B45" fillRule="evenodd" d="M39.43 54a8.7 8.7 0 0 1 5.3-4.49c.4-.12.81.57 1.24 1.28.4.68.82 1.37 1.24 1.37.45 0 .9-.68 1.33-1.35.45-.7.89-1.38 1.32-1.25a8.61 8.61 0 0 1 5 4.17c3.73-2.94 5.1-7.74 5.1-10.7 0-2.34-1.57-1.6-4.09-.36l-.14.07c-2.31 1.15-5.39 2.67-8.77 2.67s-6.45-1.52-8.77-2.67c-2.6-1.29-4.23-2.1-4.23.29 0 3.05 1.46 8.06 5.47 10.97Z" clipRule="evenodd"/>
              <path fill="#FF9D0B" d="M70.71 37a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM24.21 37a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM17.52 48c-1.62 0-3.06.66-4.07 1.87a5.97 5.97 0 0 0-1.33 3.76 7.1 7.1 0 0 0-1.94-.3c-1.55 0-2.95.59-3.94 1.66a5.8 5.8 0 0 0-.8 7 5.3 5.3 0 0 0-1.79 2.82c-.24.9-.48 2.8.8 4.74a5.22 5.22 0 0 0-.37 5.02c1.02 2.32 3.57 4.14 8.52 6.1 3.07 1.22 5.89 2 5.91 2.01a44.33 44.33 0 0 0 10.93 1.6c5.86 0 10.05-1.8 12.46-5.34 3.88-5.69 3.33-10.9-1.7-15.92-2.77-2.78-4.62-6.87-5-7.77-.78-2.66-2.84-5.62-6.25-5.62a5.7 5.7 0 0 0-4.6 2.46c-1-1.26-1.98-2.25-2.86-2.82A7.4 7.4 0 0 0 17.52 48Zm0 4c.51 0 1.14.22 1.82.65 2.14 1.36 6.25 8.43 7.76 11.18.5.92 1.37 1.31 2.14 1.31 1.55 0 2.75-1.53.15-3.48-3.92-2.93-2.55-7.72-.68-8.01.08-.02.17-.02.24-.02 1.7 0 2.45 2.93 2.45 2.93s2.2 5.52 5.98 9.3c3.77 3.77 3.97 6.8 1.22 10.83-1.88 2.75-5.47 3.58-9.16 3.58-3.81 0-7.73-.9-9.92-1.46-.11-.03-13.45-3.8-11.76-7 .28-.54.75-.76 1.34-.76 2.38 0 6.7 3.54 8.57 3.54.41 0 .7-.17.83-.6.79-2.85-12.06-4.05-10.98-8.17.2-.73.71-1.02 1.44-1.02 3.14 0 10.2 5.53 11.68 5.53.11 0 .2-.03.24-.1.74-1.2.33-2.04-4.9-5.2-5.21-3.16-8.88-5.06-6.8-7.33.24-.26.58-.38 1-.38 3.17 0 10.66 6.82 10.66 6.82s2.02 2.1 3.25 2.1c.28 0 .52-.1.68-.38.86-1.46-8.06-8.22-8.56-11.01-.34-1.9.24-2.85 1.31-2.85Z"/>
              <path fill="#FFD21E" d="M38.6 76.69c2.75-4.04 2.55-7.07-1.22-10.84-3.78-3.77-5.98-9.3-5.98-9.3s-.82-3.2-2.69-2.9c-1.87.3-3.24 5.08.68 8.01 3.91 2.93-.78 4.92-2.29 2.17-1.5-2.75-5.62-9.82-7.76-11.18-2.13-1.35-3.63-.6-3.13 2.2.5 2.79 9.43 9.55 8.56 11-.87 1.47-3.93-1.71-3.93-1.71s-9.57-8.71-11.66-6.44c-2.08 2.27 1.59 4.17 6.8 7.33 5.23 3.16 5.64 4 4.9 5.2-.75 1.2-12.28-8.53-13.36-4.4-1.08 4.11 11.77 5.3 10.98 8.15-.8 2.85-9.06-5.38-10.74-2.18-1.7 3.21 11.65 6.98 11.76 7.01 4.3 1.12 15.25 3.49 19.08-2.12Z"/>
              <path fill="#FF9D0B" d="M77.4 48c1.62 0 3.07.66 4.07 1.87a5.97 5.97 0 0 1 1.33 3.76 7.1 7.1 0 0 1 1.95-.3c1.55 0 2.95.59 3.94 1.66a5.8 5.8 0 0 1 .8 7 5.3 5.3 0 0 1 1.78 2.82c.24.9.48 2.8-.8 4.74a5.22 5.22 0 0 1 .37 5.02c-1.02 2.32-3.57 4.14-8.51 6.1-3.08 1.22-5.9 2-5.92 2.01a44.33 44.33 0 0 1-10.93 1.6c-5.86 0-10.05-1.8-12.46-5.34-3.88-5.69-3.33-10.9 1.7-15.92 2.78-2.78 4.63-6.87 5.01-7.77.78-2.66 2.83-5.62 6.24-5.62a5.7 5.7 0 0 1 4.6 2.46c1-1.26 1.98-2.25 2.87-2.82A7.4 7.4 0 0 1 77.4 48Zm0 4c-.51 0-1.13.22-1.82.65-2.13 1.36-6.25 8.43-7.76 11.18a2.43 2.43 0 0 1-2.14 1.31c-1.54 0-2.75-1.53-.14-3.48 3.91-2.93 2.54-7.72.67-8.01a1.54 1.54 0 0 0-.24-.02c-1.7 0-2.45 2.93-2.45 2.93s-2.2 5.52-5.97 9.3c-3.78 3.77-3.98 6.8-1.22 10.83 1.87 2.75 5.47 3.58 9.15 3.58 3.82 0 7.73-.9 9.93-1.46.1-.03 13.45-3.8 11.76-7-.29-.54-.75-.76-1.34-.76-2.38 0-6.71 3.54-8.57 3.54-.42 0-.71-.17-.83-.6-.8-2.85 12.05-4.05 10.97-8.17-.19-.73-.7-1.02-1.44-1.02-3.14 0-10.2 5.53-11.68 5.53-.1 0-.19-.03-.23-.1-.74-1.2-.34-2.04 4.88-5.2 5.23-3.16 8.9-5.06 6.8-7.33-.23-.26-.57-.38-.98-.38-3.18 0-10.67 6.82-10.67 6.82s-2.02 2.1-3.24 2.1a.74.74 0 0 1-.68-.38c-.87-1.46 8.05-8.22 8.55-11.01.34-1.9-.24-2.85-1.31-2.85Z"/>
              <path fill="#FFD21E" d="M56.33 76.69c-2.75-4.04-2.56-7.07 1.22-10.84 3.77-3.77 5.97-9.3 5.97-9.3s.82-3.2 2.7-2.9c1.86.3 3.23 5.08-.68 8.01-3.92 2.93.78 4.92 2.28 2.17 1.51-2.75 5.63-9.82 7.76-11.18 2.13-1.35 3.64-.6 3.13 2.2-.5 2.79-9.42 9.55-8.55 11 .86 1.47 3.92-1.71 3.92-1.71s9.58-8.71 11.66-6.44c2.08 2.27-1.58 4.17-6.8 7.33-5.23 3.16-5.63 4-4.9 5.2.75 1.2 12.28-8.53 13.36-4.4 1.08 4.11-11.76 5.3-10.97 8.15.8 2.85 9.05-5.38 10.74-2.18 1.69 3.21-11.65 6.98-11.76 7.01-4.31 1.12-15.26 3.49-19.08-2.12Z"/>
            </svg>
            <span>{t('modelOn')}</span>
            <a
              href="https://huggingface.co/zai-org/GLM-ASR-Nano-2512"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-600 hover:text-amber-800 hover:underline transition-colors"
            >
              Hugging Face
            </a>
          </div>
          <span className="text-gray-300" aria-hidden="true">|</span>
          <a
            href="https://autoglm.zhipuai.cn/autotyper/?pk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-medium text-orange-600 hover:text-orange-800 hover:underline transition-colors"
          >
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/autotyper.svg`} alt="AutoTyper" className="w-5 h-5" />
            {t('nextGenInput')}
          </a>
        </div>
      </footer>
    </div>
  );
}

/**
 * Segment detail panel component.
 */
interface SegmentDetailPanelProps {
  segment: TimelineSegment;
  onClose: () => void;
  t: (key: string) => string;
  tA11y: (key: string) => string;
}

function SegmentDetailPanel({ segment, onClose, t, tA11y }: SegmentDetailPanelProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden" role="dialog" aria-labelledby="segment-detail-title">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <h3 id="segment-detail-title" className="text-sm font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('title')}
        </h3>
        <button
          onClick={onClose}
          aria-label={tA11y('closeButton')}
          className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-gray-50 rounded">
            <span className="text-gray-500">{t('segment')}</span>
            <span className="ml-2 font-mono">{t('segment').replace(':', '')} {segment.trackIndex + 1}</span>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <span className="text-gray-500">{t('status')}</span>
            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
              segment.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {segment.status === 'active' ? t('live') : t('committed')}
            </span>
          </div>
          <div className="p-2 bg-gray-50 rounded col-span-2">
            <span className="text-gray-500">{t('timeRange')}</span>
            <span className="ml-2 font-mono">
              {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s
              ({(segment.endTime - segment.startTime).toFixed(1)}s)
            </span>
          </div>
        </div>

        {/* Transcript */}
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1">{t('transcription')}</div>
          <div className="p-2 bg-blue-50 rounded text-sm text-gray-700 break-all max-h-20 overflow-y-auto">
            {segment.text || <span className="text-gray-400 italic">{t('recognizing')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
