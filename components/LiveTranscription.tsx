'use client';

/**
 * LiveTranscription component.
 *
 * Left panel for live transcription output:
 * - Confirmed text in dark color
 * - Preview text in gray
 */

import React, { useEffect, useRef } from 'react';
import { ASREngineState } from '@/types';
import { formatTime } from '@/lib/audio-processor';
import { useTranslations } from '@/i18n/client';

interface LiveTranscriptionProps {
  state: ASREngineState;
  onOpenSubtitle?: () => void;
}

export function LiveTranscription({ state, onOpenSubtitle }: LiveTranscriptionProps) {
  const t = useTranslations('liveTranscription');
  const tCommon = useTranslations('common');
  const tA11y = useTranslations('accessibility');

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [state.confirmedText, state.previewText]);

  const hasContent = state.confirmedText || state.previewText;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm" role="region" aria-label={t('title')}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-800">{t('title')}</h2>
        <div className="flex items-center gap-3 text-sm" role="legend" aria-label={tA11y('transcriptionLegend')}>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-800" aria-hidden="true"></span>
            <span className="text-gray-600">{t('committed')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" aria-hidden="true"></span>
            <span className="text-gray-600">{t('preview')}</span>
          </span>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-gray-50/50 text-sm" role="status" aria-live="polite">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">{t('time')}</span>
          <span className="font-mono text-gray-700">
            {formatTime(state.currentTime)} / {formatTime(state.totalDuration)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">{t('segmentCount')}</span>
          <span className="font-mono text-gray-700">{state.segmentCount}</span>
        </div>
        {state.isRunning && (
          <span className="ml-auto flex items-center gap-1.5 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true"></span>
            {t('running')}
          </span>
        )}
      </div>

      {/* Transcript */}
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto"
        style={{ minHeight: '300px' }}
        aria-live="polite"
        aria-atomic="false"
        aria-label={tA11y('transcriptionLiveRegion')}
        role="log"
      >
        {hasContent ? (
          <div className="text-lg leading-relaxed">
            {/* Confirmed text */}
            {state.confirmedText && (
              <span className="text-gray-900">{state.confirmedText}</span>
            )}
            {/* Preview text */}
            {state.previewText && (
              <span className="text-gray-400 bg-yellow-50 rounded px-0.5">
                {state.previewText}
              </span>
            )}
            {/* Blinking caret */}
            {state.isRunning && (
              <span className="inline-block w-0.5 h-5 ml-0.5 bg-blue-500 animate-pulse" aria-hidden="true"></span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-lg">{t('emptyHint')}</p>
            <p className="text-sm mt-1">{t('formatHint')}</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {hasContent && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>
                {t('committedCount')} <span className="font-mono text-gray-700">{state.confirmedText.length}</span> {tCommon('chars')}
              </span>
              <span>
                {t('previewCount')} <span className="font-mono text-gray-700">{state.previewText.length}</span> {tCommon('chars')}
              </span>
              <span>
                {t('total')} <span className="font-mono text-gray-700">{state.confirmedText.length + state.previewText.length}</span> {tCommon('chars')}
              </span>
            </div>
            {onOpenSubtitle && (
              <button
                onClick={onOpenSubtitle}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs cursor-pointer"
                title={t('openSubtitleWindow')}
                aria-label={tA11y('openSubtitleWindow')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                {t('liveSubtitle')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
