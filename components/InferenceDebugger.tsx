'use client';

/**
 * InferenceDebugger component.
 *
 * Right panel showing inference records:
 * - Audio range, prompt, and transcript result
 */

import React, { useEffect, useRef } from 'react';
import { InferenceRecord } from '@/types';
import { formatTime } from '@/lib/audio-processor';
import { useTranslations } from '@/i18n/client';

interface InferenceDebuggerProps {
  inferenceRecords: InferenceRecord[];
}

export function InferenceDebugger({
  inferenceRecords,
}: InferenceDebuggerProps) {
  const t = useTranslations('debugger');
  const tA11y = useTranslations('accessibility');
  const tStatus = useTranslations('status');

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [inferenceRecords]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm" role="region" aria-label={t('title')}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold text-gray-800">{t('title')}</h2>
        <span className="text-sm text-gray-500" aria-live="polite">({inferenceRecords.length})</span>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4" role="log" aria-live="polite" aria-atomic="false">
        {inferenceRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{t('noRecords')}</p>
            <p className="text-xs mt-1">{t('noRecordsHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inferenceRecords.slice(-50).map((record) => (
              <article
                key={record.id}
                className={`p-3 rounded border text-xs ${
                  record.status === 'completed'
                    ? 'bg-gray-50 border-gray-200'
                    : record.status === 'streaming'
                    ? 'bg-blue-50 border-blue-200'
                    : record.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
                aria-label={tA11y('inferenceRecord', {
                  sequence: record.requestSequence,
                  segment: record.segmentIndex + 1,
                  status: tStatus(record.status)
                })}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-gray-600">
                    #{record.requestSequence} @ {formatTime(record.audioEndTime)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-600">
                      {t('segment')} {record.segmentIndex + 1}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        record.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : record.status === 'streaming'
                          ? 'bg-blue-100 text-blue-700'
                          : record.status === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {tStatus(record.status)}
                    </span>
                  </div>
                </div>
                <div className="text-gray-500 mb-2">
                  {t('audioRange')} {formatTime(record.audioStartTime)} - {formatTime(record.audioEndTime)} ({record.audioDuration.toFixed(1)}s)
                </div>
                {record.prompt && (
                  <div className="mb-2">
                    <div className="text-gray-500 font-medium mb-1">{t('prompt')}</div>
                    <div className="p-2 bg-amber-50 rounded text-gray-700 break-all whitespace-pre-wrap">
                      {record.prompt}
                    </div>
                  </div>
                )}
                {record.previewText && (
                  <div className="mb-2">
                    <div className="text-gray-500 font-medium mb-1">{t('result')}</div>
                    <div className="p-2 bg-blue-50 rounded text-gray-700 break-all whitespace-pre-wrap">
                      {record.previewText}
                    </div>
                  </div>
                )}
                {record.error && (
                  <div className="mt-1 text-red-600 break-all" role="alert">
                    {t('error')} {record.error}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
