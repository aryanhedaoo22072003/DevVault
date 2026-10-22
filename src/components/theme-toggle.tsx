'use client';

import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

function preferredTheme(): Theme {
  const stored = window.localStorage.getItem('devvault-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  function changeTheme() {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : preferredTheme();
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem('devvault-theme', next);
  }
  return <button type="button" onClick={changeTheme} className="theme-toggle" aria-label="Toggle light or dark theme" title="Toggle light or dark theme">
    <Sun className="theme-icon-light h-4 w-4" /><Moon className="theme-icon-dark h-4 w-4" />{compact ? null : <span className="hidden sm:inline">Theme</span>}
  </button>;
}
