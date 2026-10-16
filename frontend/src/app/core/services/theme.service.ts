import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'erp_theme_mode';

  theme = signal<ThemeMode>('light');

  constructor() {
    // 1. Force light mode default as per user explicit instruction
    const isExplicitlySet = localStorage.getItem('erp_theme_v2_set');
    const savedTheme = localStorage.getItem(this.THEME_STORAGE_KEY) as ThemeMode | null;
    
    if (isExplicitlySet && (savedTheme === 'dark' || savedTheme === 'light')) {
      this.theme.set(savedTheme);
    } else {
      // Default to crisp light mode
      this.theme.set('light');
      localStorage.setItem(this.THEME_STORAGE_KEY, 'light');
      localStorage.setItem('erp_theme_v2_set', 'true');
    }

    // 2. Sync DOM class with reactive signal
    effect(() => {
      const current = this.theme();
      localStorage.setItem(this.THEME_STORAGE_KEY, current);
      localStorage.setItem('erp_theme_v2_set', 'true');
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
