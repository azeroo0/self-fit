'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | null;

const THEME_KEY = 'selffit:theme';

function readStoredTheme(): Theme {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch (e) {
    console.warn('[theme] localStorage 읽기 실패', e);
    return null;
  }
}

function writeStoredTheme(theme: Theme) {
  try {
    if (theme === null) window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('[theme] localStorage 저장 실패', e);
  }
}

const NEXT_THEME: Record<'light' | 'dark' | 'system', Theme> = {
  light: 'dark',
  dark: null,
  system: 'light',
};

const ThemeContext = createContext<{ theme: Theme; cycleTheme: () => void }>({
  theme: null,
  cycleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(null);

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = NEXT_THEME[prev ?? 'system'];
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return (
    <div className="selffit-app" data-theme={theme ?? undefined}>
      <ThemeContext.Provider value={{ theme, cycleTheme }}>{children}</ThemeContext.Provider>
    </div>
  );
}
