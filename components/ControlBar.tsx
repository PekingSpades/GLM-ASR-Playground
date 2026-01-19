'use client';

/**
 * ControlBar component.
 *
 * Top control bar with:
 * - Audio source selection (file, mic, screen)
 * - Playback controls
 * - API key input (local storage)
 * - Segment/timing settings
 */

import React, { useState, useEffect, useRef } from 'react';
import { ASRConfig } from '@/types';
import { AudioSourceType, type MediaCaptureError } from '@/hooks';
import { useTranslations } from '@/i18n/client';

interface ControlBarProps {
  config: ASRConfig;
  onConfigChange: (config: Partial<ASRConfig>) => void;
  onFileSelect: (file: File) => void;
  onStartMicrophone: () => void;
  onStartScreenCapture: () => void;
  isLoaded: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  activeSource: AudioSourceType | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  mediaError?: MediaCaptureError | null;
}

export function ControlBar({
  config,
  onConfigChange,
  onFileSelect,
  onStartMicrophone,
  onStartScreenCapture,
  isLoaded,
  isPlaying,
  isPaused,
  activeSource,
  onStart,
  onPause,
  onResume,
  onStop,
  mediaError,
}: ControlBarProps) {
  const t = useTranslations('controlBar');
  const tCommon = useTranslations('common');
  const tA11y = useTranslations('accessibility');

  const [showApiKey, setShowApiKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from local storage (once on mount)
  useEffect(() => {
    const savedApiKey = localStorage.getItem('asr-lab-api-key');
    if (savedApiKey) {
      onConfigChange({ apiKey: savedApiKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Deliberately omit onConfigChange; run once on mount

  // Persist API key to local storage
  const handleApiKeyChange = (value: string) => {
    onConfigChange({ apiKey: value });
    localStorage.setItem('asr-lab-api-key', value);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  // Resolve audio source label
  const getSourceInfo = () => {
    switch (activeSource) {
      case 'file':
        return { icon: '📁', text: t('file') };
      case 'microphone':
        return { icon: '🎤', text: t('microphone') };
      case 'screen':
        return { icon: '🖥️', text: t('screenAudio') };
      default:
        return null;
    }
  };

  const sourceInfo = getSourceInfo();
  const mediaErrorMessage = (() => {
    switch (mediaError) {
      case 'microphone-access-denied':
        return t('mediaErrorMicrophone');
      case 'screen-audio-not-selected':
        return t('mediaErrorScreenAudio');
      case 'screen-capture-failed':
        return t('mediaErrorScreenCapture');
      default:
        return null;
    }
  })();

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Audio source selection */}
        <div className="flex items-center gap-2" role="group" aria-label={tA11y('audioSourceGroup')}>
          <span className="text-sm font-medium text-gray-700">{t('audioSource')}</span>

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label={tA11y('uploadFileButton')}
            id="audio-file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isPlaying}
            aria-label={tA11y('uploadFileButton')}
            aria-pressed={activeSource === 'file'}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-gray-100 text-gray-400 !cursor-not-allowed'
                : activeSource === 'file'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={t('uploadAudio')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {tCommon('upload')}
          </button>

          {/* Microphone button */}
          <button
            onClick={onStartMicrophone}
            disabled={isPlaying}
            aria-label={tA11y('microphoneButton')}
            aria-pressed={activeSource === 'microphone'}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-gray-100 text-gray-400 !cursor-not-allowed'
                : activeSource === 'microphone'
                ? 'bg-red-100 text-red-700 border-2 border-red-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={t('recordFromMic')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {t('microphone')}
          </button>

          {/* Screen capture button */}
          <button
            onClick={onStartScreenCapture}
            disabled={isPlaying}
            aria-label={tA11y('screenCaptureButton')}
            aria-pressed={activeSource === 'screen'}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-gray-100 text-gray-400 !cursor-not-allowed'
                : activeSource === 'screen'
                ? 'bg-purple-100 text-purple-700 border-2 border-purple-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={t('captureScreen')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('screenAudio')}
          </button>
        </div>

        {/* Source status & playback controls */}
        {(isLoaded || activeSource === 'microphone' || activeSource === 'screen') && (
          <>
            <div className="h-8 w-px bg-gray-300" />

            {/* Current audio source indicator */}
            {sourceInfo && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                <span>{sourceInfo.icon}</span>
                <span>{sourceInfo.text}</span>
                {isPlaying && !isPaused && (
                  <span className="flex items-center gap-1 ml-1 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {t('recording')}
                  </span>
                )}
              </div>
            )}

            {/* Playback controls */}
            <div className="flex items-center gap-2" role="group" aria-label={tA11y('playbackControls')}>
              {!isPlaying ? (
                <button
                  onClick={onStart}
                  aria-label={tA11y('startButton')}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {tCommon('start')}
                </button>
              ) : isPaused ? (
                <button
                  onClick={onResume}
                  aria-label={tA11y('resumeButton')}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {tCommon('resume')}
                </button>
              ) : (
                <button
                  onClick={onPause}
                  aria-label={tA11y('pauseButton')}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  {tCommon('pause')}
                </button>
              )}
              {isPlaying && (
                <button
                  onClick={onStop}
                  aria-label={tA11y('stopButton')}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6h12v12H6z" />
                  </svg>
                  {tCommon('stop')}
                </button>
              )}
            </div>
          </>
        )}

        {/* Error message */}
        {mediaErrorMessage && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-600 rounded text-sm" role="alert" aria-live="polite">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {mediaErrorMessage}
          </div>
        )}

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300" />

        {/* API key input */}
        <div className="flex items-center gap-2">
          <label htmlFor="api-key-input" className="text-sm font-medium text-gray-700">{t('apiKey')}</label>
          <div className="relative">
            <input
              id="api-key-input"
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={t('apiKeyPlaceholder')}
              aria-label={tA11y('apiKeyInput')}
              className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              aria-label={tA11y('toggleApiKeyVisibility')}
              aria-pressed={showApiKey}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              {showApiKey ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {!config.apiKey && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              {t('mockMode')}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300" />

        {/* Segment duration */}
        <div className="flex items-center gap-2">
          <label htmlFor="segment-duration-input" className="text-sm font-medium text-gray-700">{t('segment')}</label>
          <input
            id="segment-duration-input"
            type="number"
            value={config.segmentDuration}
            onChange={(e) => onConfigChange({ segmentDuration: Number(e.target.value) })}
            min={5}
            max={30}
            aria-label={tA11y('segmentDurationInput')}
            className="w-14 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">{tCommon('seconds')}</span>
        </div>

        {/* Sampling interval */}
        <div className="flex items-center gap-2">
          <label htmlFor="chunk-interval-input" className="text-sm font-medium text-gray-700">{t('sampling')}</label>
          <input
            id="chunk-interval-input"
            type="number"
            value={config.chunkInterval}
            onChange={(e) => onConfigChange({ chunkInterval: Number(e.target.value) })}
            min={100}
            max={1000}
            step={50}
            aria-label={tA11y('chunkIntervalInput')}
            className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">{tCommon('ms')}</span>
        </div>
      </div>
    </div>
  );
}
