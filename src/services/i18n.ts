import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ko from '@/i18n/ko.json';
import en from '@/i18n/en.json';

export async function initI18n(): Promise<void> {
  await i18next.use(LanguageDetector).init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator', 'htmlTag'],
    },
  });
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options);
}
