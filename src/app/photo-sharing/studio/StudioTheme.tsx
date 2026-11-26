'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './Studio.module.css';

type Mode = 'day' | 'night';
const ThemeContext = createContext<{ mode: Mode; setMode: (mode: Mode) => void } | null>(null);

export function StudioTheme({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('day');

  return <ThemeContext.Provider value={{ mode, setMode }}>
    <div data-studio-theme={mode}>{children}</div>
  </ThemeContext.Provider>;
}

export function StudioThemeControl() {
  const theme = useContext(ThemeContext);
  if (!theme) return null;

  return <div className={styles.themeControl} role="group" aria-label="Dashboard appearance">
    <button type="button" aria-label="Day mode" aria-pressed={theme.mode === 'day'} onClick={() => theme.setMode('day')}>
      <Sun size={17} aria-hidden="true" /><span>Day</span>
    </button>
    <button type="button" aria-label="Night mode" aria-pressed={theme.mode === 'night'} onClick={() => theme.setMode('night')}>
      <Moon size={17} aria-hidden="true" /><span>Night</span>
    </button>
  </div>;
}
