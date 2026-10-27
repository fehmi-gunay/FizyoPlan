import { createContext, useContext } from 'react';

// Erişilebilirlik tercihleri (PDF hedef 5): yazı boyutu ve tema. Tarayıcıda saklanır.
export type Theme = 'system' | 'light' | 'dark' | 'contrast';
export const FONT_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;

export interface Prefs {
  theme: Theme;
  fontScale: number; // FONT_SCALES indeksi
}

export interface PrefsValue extends Prefs {
  setTheme(t: Theme): void;
  setFontScale(i: number): void;
  increaseFont(): void;
  decreaseFont(): void;
}

export const PreferencesContext = createContext<PrefsValue | null>(null);

export function usePreferences(): PrefsValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences, PreferencesProvider içinde kullanılmalı');
  return ctx;
}
