import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'erp_theme_mode';

  theme = signal<ThemeMode>('light');

  constructor() {
    // 1. Initialize from localStorage or OS prefers-color-scheme
    const savedTheme = localStorage.getItem(this.THEME_STORAGE_KEY) as ThemeMode | null;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.theme.set(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme.set(prefersDark ? 'dark' : 'light');
    }

    // 2. Sync DOM class with reactive signal
    effect(() => {
      const current = this.theme();
      localStorage.setItem(this.THEME_STORAGE_KEY, current);
      if (current === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  toggleTheme(): void {
    this.theme.update(current => (current === 'dark' ? 'light' : 'dark'));
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }
}
