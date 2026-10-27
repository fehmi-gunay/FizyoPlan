import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FONT_SCALES, PreferencesContext, type Prefs, type PrefsValue } from './usePreferences';

const KEY = 'fizyo_prefs';
const DEFAULTS: Prefs = { theme: 'system', fontScale: 1 };

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

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
