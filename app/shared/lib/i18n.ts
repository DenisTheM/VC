// Lightweight i18n system — no external library
// Supports de, fr, it, en with namespace-based keys

import { de } from "@shared/i18n/de";
import { fr } from "@shared/i18n/fr";
import { en } from "@shared/i18n/en";
import { it } from "@shared/i18n/it";

export type Locale = "de" | "fr" | "it" | "en";

const translations: Record<Locale, Record<string, string>> = { de, fr, it, en };

const STORAGE_KEY = "vc_locale";
const DEFAULT_LOCALE: Locale = "de";

let currentLocale: Locale = DEFAULT_LOCALE;

// Initialize from localStorage
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (stored === "de" || stored === "fr" || stored === "it" || stored === "en")) {
    currentLocale = stored as Locale;
  }
} catch {
  // SSR or localStorage unavailable
}

/**
 * Translate a key with optional parameter substitution.
 * Falls back to German, then returns the key itself.
 */
export function t(key: string, params?: Record<string, string>): string {
  const str = translations[currentLocale]?.[key] ?? translations["de"]?.[key] ?? key;
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? "");
}

/**
 * Get the current locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set the locale and persist to localStorage.
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Get all available locales with labels.
 */
export function getAvailableLocales(): { code: Locale; label: string; flag: string }[] {
  return [
    { code: "de", label: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
    { code: "fr", label: "Fran\u00e7ais", flag: "\u{1F1EB}\u{1F1F7}" },
    { code: "it", label: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
    { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  ];
}
