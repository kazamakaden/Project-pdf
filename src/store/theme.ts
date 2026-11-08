import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'lmc-theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  // ค่าเริ่มต้นคือโหมดสว่างเสมอ ไม่อ้างอิงการตั้งค่าธีมของระบบปฏิบัติการ
  return 'light';
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.localStorage.setItem(STORAGE_KEY, theme);
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = readInitialTheme();
  applyTheme(initial);
  return {
    theme: initial,
    toggle: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      set({ theme: next });
    },
    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },
  };
});