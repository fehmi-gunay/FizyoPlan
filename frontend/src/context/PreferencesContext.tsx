import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Erişilebilirlik tercihleri (PDF hedef 5): yazı boyutu ve tema. Tarayıcıda saklanır.
export type Theme = 'system' | 'light' | 'dark' | 'contrast';
export const FONT_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;

interface Prefs {
  theme: Theme;
  fontScale: number; // FONT_SCALES indeksi
}

interface PrefsValue extends Prefs {
  setTheme(t: Theme): void;
  setFontScale(i: number): void;
  increaseFont(): void;
  decreaseFont(): void;
}

const KEY = 'fizyo_prefs';
const DEFAULTS: Prefs = { theme: 'system', fontScale: 1 };

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

const PreferencesContext = createContext<PrefsValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);
    root.style.fontSize = `${FONT_SCALES[prefs.fontScale] * 100}%`;
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* yok say */
    }
  }, [prefs]);

  const value = useMemo<PrefsValue>(() => {
    const clamp = (i: number) => Math.max(0, Math.min(FONT_SCALES.length - 1, i));
    return {
      ...prefs,
      setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
      setFontScale: (i) => setPrefs((p) => ({ ...p, fontScale: clamp(i) })),
      increaseFont: () => setPrefs((p) => ({ ...p, fontScale: clamp(p.fontScale + 1) })),
      decreaseFont: () => setPrefs((p) => ({ ...p, fontScale: clamp(p.fontScale - 1) })),
    };
  }, [prefs]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PrefsValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences, PreferencesProvider içinde kullanılmalı');
  return ctx;
}
