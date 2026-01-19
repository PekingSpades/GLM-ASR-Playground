'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, defaultLocale, locales } from './config';

// Message dictionary type
type Messages = Record<string, Record<string, string>>;

// Context type
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  messages: Messages;
}

const I18nContext = createContext<I18nContextType | null>(null);

// Load messages for a locale
async function loadMessages(locale: Locale): Promise<Messages> {
  try {
    const messages = await import(`../messages/${locale}.json`);
    return messages.default;
  } catch {
    console.warn(`Failed to load messages for locale: ${locale}`);
    return {};
  }
}

// localStorage key
const LOCALE_KEY = 'asr-lab-locale';

// Detect browser language
function detectBrowserLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null;

  // Read browser language list
  const browserLocales = navigator.languages || [navigator.language];

  for (const browserLocale of browserLocales) {
    // Extract language code (drop region, e.g. zh-CN -> zh)
    const langCode = browserLocale.split('-')[0].toLowerCase() as Locale;
    if (locales.includes(langCode)) {
      return langCode;
    }
  }

  return null;
}

// Provider component
interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize: prefer localStorage, fall back to browser locale
  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale);
    } else {
      // Auto-detect browser locale
      const browserLocale = detectBrowserLocale();
      if (browserLocale) {
        setLocaleState(browserLocale);
      }
    }
  }, []);

  // Load locale messages
  useEffect(() => {
    loadMessages(locale).then((msgs) => {
      setMessages(msgs);
      setIsLoaded(true);
    });
  }, [locale]);

  // Switch locale
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
    // Update html lang attribute
    document.documentElement.lang = newLocale;
  }, []);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const parts = key.split('.');
    if (parts.length !== 2) return key;

    const [namespace, messageKey] = parts;
    const message = messages[namespace]?.[messageKey];

    if (!message) return key;

    // Apply params
    if (params) {
      return Object.entries(params).reduce(
        (result, [paramKey, value]) => result.replace(`{${paramKey}}`, String(value)),
        message
      );
    }

    return message;
  }, [messages]);

  // Wait for messages to load
  if (!isLoaded) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook: i18n access
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Hook: scoped translations
export function useTranslations(namespace: string) {
  const { t, locale, messages } = useI18n();

  const scopedT = useCallback((key: string, params?: Record<string, string | number>) => {
    return t(`${namespace}.${key}`, params);
  }, [t, namespace]);

  return scopedT;
}

// Hook: locale access
export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
