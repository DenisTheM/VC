import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Synchronously read a saved draft from localStorage.
 * Use as `useState` initializer: `useState(() => readAutosave(key) ?? defaults)`
 */
export function readAutosave<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface UseAutosaveOpts<T> {
  key: string;
  data: T;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Debounced autosave to localStorage.
 * Returns `clear()` to call after successful submit.
 */
export function useAutosave<T>({ key, data, debounceMs = 500, enabled = true }: UseAutosaveOpts<T>) {
  const [restored] = useState<T | null>(() => readAutosave<T>(key));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn("useAutosave: write failed", e);
      }
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [key, data, debounceMs, enabled]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (_e) { /* ignore */ }
  }, [key]);

  const hasSavedData = restored != null;

  return { restored, clear, hasSavedData };
}
