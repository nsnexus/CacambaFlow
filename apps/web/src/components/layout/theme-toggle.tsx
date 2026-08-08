'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cacambaflow-theme';

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
  }, []);

  function toggleTheme() {
    const next = isLight ? 'dark' : 'light';
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(STORAGE_KEY, next);
    setIsLight(next === 'light');
  }

  return (
    <button
      id="header-theme-toggle"
      className="btn btn--secondary btn--sm"
      onClick={toggleTheme}
      aria-label={isLight ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
      title={isLight ? 'Tema escuro' : 'Tema claro'}
    >
      {isLight ? '🌙' : '☀️'}
    </button>
  );
}
