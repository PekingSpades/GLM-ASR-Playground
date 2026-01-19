'use client';

/**
 * Subtitle window page.
 *
 * Separate browser window for live captions.
 * Receives updates via BroadcastChannel from the main window.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '@/i18n/client';

interface SubtitleData {
  confirmedText: string;
  previewText: string;
  isRunning: boolean;
}

export default function SubtitlePage() {
  const t = useTranslations('subtitle');

  const [data, setData] = useState<SubtitleData>({
    confirmedText: '',
    previewText: '',
    isRunning: false,
  });
  const [fontSize, setFontSize] = useState(32);
  const [bgOpacity, setBgOpacity] = useState(0.8);
  const [textColor, setTextColor] = useState('#ffffff');
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textEndRef = useRef<HTMLDivElement>(null);

  // Listen for BroadcastChannel messages
  useEffect(() => {
    const channel = new BroadcastChannel('asr-subtitle');

    channel.onmessage = (event) => {
      if (event.data.type === 'subtitle-update') {
        setData(event.data.payload);
      }
    };

    // Request initial data
    channel.postMessage({ type: 'request-data' });

    return () => {
      channel.close();
    };
  }, []);

  // Auto-scroll to the bottom
  useEffect(() => {
    textEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data.confirmedText, data.previewText]);

  // Show only the most recent text to avoid overflow
  const getDisplayText = () => {
    const fullText = data.confirmedText + data.previewText;
    // Keep the last 500 characters
    if (fullText.length > 500) {
      return '...' + fullText.slice(-500);
    }
    return fullText;
  };

  const displayText = getDisplayText();
  const hasContent = displayText.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: `rgba(0, 0, 0, ${bgOpacity})` }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/50">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm">{t('title')}</span>
          {data.isRunning && (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              {t('live')}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
          title={t('settings')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-black/70 border-b border-white/10 space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-white/60 text-sm w-20">{t('fontSize')}</label>
            <input
              type="range"
              min="16"
              max="64"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-white/80 text-sm w-12">{fontSize}px</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-white/60 text-sm w-20">{t('bgTransparency')}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={(1 - bgOpacity) * 100}
              onChange={(e) => setBgOpacity(1 - Number(e.target.value) / 100)}
              className="flex-1"
            />
            <span className="text-white/80 text-sm w-12">{Math.round((1 - bgOpacity) * 100)}%</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-white/60 text-sm w-20">{t('textColor')}</label>
            <div className="flex gap-2">
              {['#ffffff', '#ffff00', '#00ff00', '#00ffff'].map((color) => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  className={`w-8 h-8 rounded border-2 ${textColor === color ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtitle content */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col justify-end p-6 overflow-y-auto"
      >
        {hasContent ? (
          <div
            className="w-full text-center leading-relaxed"
            style={{
              fontSize: `${fontSize}px`,
              color: textColor,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {/* Confirmed text */}
            <span>{data.confirmedText}</span>
            {/* Preview text (slightly transparent) */}
            {data.previewText && (
              <span style={{ opacity: 0.7 }}>{data.previewText}</span>
            )}
            <div ref={textEndRef} />
          </div>
        ) : (
          <div className="w-full text-center text-white/40" style={{ fontSize: `${fontSize}px` }}>
            {t('waiting')}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 text-center text-white/30 text-xs">
        {t('hint')}
      </div>
    </div>
  );
}
