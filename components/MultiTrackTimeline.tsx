'use client';

/**
 * MultiTrackTimeline component.
 *
 * Segment timeline view with a single lane and request markers.
 *
 * Features:
 * 1. Segment position/width reflects global audio time
 * 2. Auto-scrolls with the playhead
 * 3. Click segments for details
 * 4. Request markers show inference timing
 */

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  TimelineSegment,
  SegmentRecord,
  ASREngineState,
  InferenceRecord,
} from '@/types';
import { formatTime } from '@/lib/audio-processor';
import { useTranslations } from '@/i18n/client';

interface MultiTrackTimelineProps {
  state: ASREngineState;
  segmentRecords: SegmentRecord[];
  inferenceRecords?: InferenceRecord[];
  onSegmentClick?: (segment: TimelineSegment) => void;
}

// Color palette
const TRACK_COLORS = [
  'rgba(59, 130, 246, 0.7)',   // blue
  'rgba(16, 185, 129, 0.7)',   // green
  'rgba(245, 158, 11, 0.7)',   // amber
  'rgba(239, 68, 68, 0.7)',    // red
  'rgba(139, 92, 246, 0.7)',   // purple
  'rgba(236, 72, 153, 0.7)',   // pink
  'rgba(6, 182, 212, 0.7)',    // cyan
  'rgba(132, 204, 22, 0.7)',   // lime
];

const TRACK_HEIGHT = 60;
const HEADER_WIDTH = 80;
const PIXELS_PER_SECOND = 50;
const PLAYHEAD_COLOR = '#ef4444';
const REQUEST_MARKER_COLOR = '#ef4444';

export function MultiTrackTimeline({
  state,
  segmentRecords,
  inferenceRecords = [],
  onSegmentClick,
}: MultiTrackTimelineProps) {
  const t = useTranslations('timeline');
  const tA11y = useTranslations('accessibility');
  const tStatus = useTranslations('status');

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Build timeline segments from records
  const segments = useMemo(() => {
    const segs: TimelineSegment[] = [];

    segmentRecords.forEach((record) => {
      segs.push({
        id: record.id,
        trackIndex: record.index,
        startTime: record.startTime,
        endTime: record.endTime,
        text: record.text,
        status: record.status,
      });
    });

    return segs;
  }, [segmentRecords]);

  // Compute total timeline width
  const timelineWidth = useMemo(() => {
    const duration = Math.max(state.totalDuration, state.currentTime + 10);
    return duration * PIXELS_PER_SECOND + HEADER_WIDTH + 100;
  }, [state.totalDuration, state.currentTime]);

  const trackCount = 1;

  // Compute total height
  const totalHeight = useMemo(() => {
    return trackCount * TRACK_HEIGHT + 30;
  }, [trackCount]);

  // Auto-scroll to the playhead
  useEffect(() => {
    if (containerRef.current && state.isRunning) {
      const playheadX = HEADER_WIDTH + state.currentTime * PIXELS_PER_SECOND;
      const containerWidth = containerRef.current.clientWidth;
      const scrollLeft = Math.max(0, playheadX - containerWidth / 2);

      containerRef.current.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [state.currentTime, state.isRunning]);

  // Time ruler ticks
  const timeRuler = useMemo(() => {
    const duration = Math.max(state.totalDuration, state.currentTime + 10);
    const marks: { time: number; label: string }[] = [];

    for (let t = 0; t <= duration; t += 5) {
      marks.push({
        time: t,
        label: formatTime(t),
      });
    }

    return marks;
  }, [state.totalDuration, state.currentTime]);

  // Handle segment selection
  const handleSegmentClick = useCallback((segment: TimelineSegment) => {
    setSelectedSegmentId(segment.id);
    if (onSegmentClick) {
      onSegmentClick(segment);
    }
  }, [onSegmentClick]);

  // Resolve segment color
  const getTrackColor = (trackIndex: number) => {
    return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
  };

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden" role="region" aria-label={t('title')}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {t('title')}
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{t('trackCount')} {trackCount}</span>
          <span>{t('segmentCount')} {segments.length}</span>
        </div>
      </div>

      {/* Timeline body */}
      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: 300 }}
      >
        <div
          ref={timelineRef}
          className="relative"
          style={{
            width: timelineWidth,
            height: totalHeight,
          }}
        >
          {/* Time ruler */}
          <div
            className="sticky top-0 z-20 bg-gray-800 border-b border-gray-600"
            style={{ height: 30, marginLeft: HEADER_WIDTH }}
          >
            {timeRuler.map(({ time, label }) => (
              <div
                key={time}
                className="absolute flex flex-col items-center"
                style={{
                  left: time * PIXELS_PER_SECOND,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="w-px h-2 bg-gray-500" />
                <span className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Lane area */}
          <div className="relative" style={{ marginTop: 30 }}>
            {/* Lane background and label */}
            {Array.from({ length: trackCount }).map((_, index) => (
              <div
                key={index}
                className="absolute flex"
                style={{
                  top: index * TRACK_HEIGHT,
                  height: TRACK_HEIGHT,
                  width: '100%',
                }}
              >
                {/* Lane label */}
                <div
                  className="sticky left-0 z-10 flex items-center justify-center bg-gray-800 border-r border-gray-600 text-xs text-gray-300"
                  style={{ width: HEADER_WIDTH, minWidth: HEADER_WIDTH }}
                >
                  <span
                    className="px-2 py-1 rounded text-white text-[10px]"
                    style={{ backgroundColor: getTrackColor(index) }}
                  >
                    {t('segment')}
                  </span>
                </div>

                {/* Lane background */}
                <div
                  className="flex-1 border-b border-gray-700"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'rgba(31, 41, 55, 0.5)' : 'rgba(17, 24, 39, 0.5)',
                  }}
                />
              </div>
            ))}

            {/* Segments */}
            {segments.map((segment) => {
              const left = HEADER_WIDTH + segment.startTime * PIXELS_PER_SECOND;
              const width = (segment.endTime - segment.startTime) * PIXELS_PER_SECOND;
              const isSelected = segment.id === selectedSegmentId;
              const isActive = segment.status === 'active';
              const laneIndex = 0;

              return (
                <div
                  key={segment.id}
                  role="button"
                  tabIndex={0}
                  aria-label={tA11y('timelineSegment', {
                    index: segment.trackIndex + 1,
                    start: formatTime(segment.startTime),
                    end: formatTime(segment.endTime),
                    status: tStatus(segment.status)
                  })}
                  aria-pressed={isSelected}
                  className={`absolute cursor-pointer transition-all duration-150 rounded overflow-hidden ${
                    isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''
                  } ${isActive ? 'animate-pulse' : ''}`}
                  style={{
                    left,
                    width: Math.max(width, 20),
                    top: laneIndex * TRACK_HEIGHT + 8,
                    height: TRACK_HEIGHT - 16,
                    backgroundColor: getTrackColor(segment.trackIndex),
                    border: isActive ? '2px solid rgba(255, 255, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                  onClick={() => handleSegmentClick(segment)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSegmentClick(segment);
                    }
                  }}
                >
                  {/* Time labels */}
                  <div className="absolute top-0 left-0 right-0 flex justify-between px-1 text-[9px] text-white/80 bg-black/30">
                    <span>{formatTime(segment.startTime)}</span>
                    <span>{formatTime(segment.endTime)}</span>
                  </div>

                  {/* Transcript text */}
                  <div
                    className="absolute inset-0 pt-3 px-1 text-[10px] text-white leading-tight overflow-hidden"
                    style={{
                      maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                    }}
                  >
                    {segment.text || (isActive ? t('recognizing') : t('empty'))}
                  </div>

                  {/* Status badge */}
                  {isActive && (
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 text-[8px] bg-white/20 rounded text-white">
                      {tStatus('active')}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Request markers */}
            {inferenceRecords.map((record) => (
              <div
                key={record.id}
                className="absolute top-0 z-20 pointer-events-none"
                style={{
                  left: HEADER_WIDTH + record.audioEndTime * PIXELS_PER_SECOND - 4,
                }}
                title={t('requestAt', { sequence: record.requestSequence, time: formatTime(record.audioEndTime) })}
              >
                <div
                  className="w-0 h-0"
                  style={{
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `8px solid ${REQUEST_MARKER_COLOR}`,
                  }}
                />
                <div
                  className="opacity-30"
                  style={{
                    width: 1,
                    height: trackCount * TRACK_HEIGHT,
                    marginLeft: 3.5,
                    backgroundColor: REQUEST_MARKER_COLOR,
                  }}
                />
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 z-30 pointer-events-none"
              style={{
                left: HEADER_WIDTH + state.currentTime * PIXELS_PER_SECOND,
                height: trackCount * TRACK_HEIGHT,
              }}
            >
              <div
                className="w-0.5 h-full"
                style={{ backgroundColor: PLAYHEAD_COLOR }}
              />
              <div
                className="absolute -top-1 -left-1.5 w-3 h-3 rotate-45"
                style={{ backgroundColor: PLAYHEAD_COLOR }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `8px solid ${REQUEST_MARKER_COLOR}`,
            }}
          />
          <span>{t('requestSent')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-white/80 animate-pulse" style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }} />
          <span>{t('currentSegment')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }} />
          <span>{t('completedSegment')}</span>
        </div>
      </div>
    </div>
  );
}
