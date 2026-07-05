import { Injectable, signal } from '@angular/core';

export type Locale = 'en' | 'es';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly current = signal<Locale>('en');
  private translations: Record<string, string> = {};

  async init(): Promise<void> {
    const saved = localStorage.getItem('netsentinel_locale');
    const locale = (saved === 'en' || saved === 'es') ? saved : 'en';
    await this.load(locale);
  }

  async load(locale: Locale): Promise<void> {
    this.current.set(locale);
    localStorage.setItem('netsentinel_locale', locale);
    try {
      const data = await fetch(`assets/i18n/${locale}.json`);
      this.translations = await data.json();
    } catch {
      this.translations = {};
    }
  }

  translate(key: string, fallback?: string): string {
    return this.translations[key] ?? fallback ?? key;
  }
}
