import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'app.theme';

/**
 * Applies and persists the light/dark theme by toggling `data-theme` on the
 * document root, which the token layer (src/styles/_tokens.scss) keys off.
 * Initial value: stored preference, else the OS `prefers-color-scheme`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly mode$ = new BehaviorSubject<ThemeMode>(
        this.resolveInitialMode()
    );

    public readonly theme: Observable<ThemeMode> = this.mode$.asObservable();

    constructor() {
        this.apply(this.mode$.value);
    }

    public get current(): ThemeMode {
        return this.mode$.value;
    }

    public toggle(): void {
        this.set(this.mode$.value === 'dark' ? 'light' : 'dark');
    }

    public set(mode: ThemeMode): void {
        this.mode$.next(mode);
        this.apply(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            // Storage may be unavailable (private mode) — non-fatal.
        }
    }

    private apply(mode: ThemeMode): void {
        const root = document.documentElement;
        if (mode === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    }

    private resolveInitialMode(): ThemeMode {
        let stored: string | null = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch {
            stored = null;
        }
        if (stored === 'dark' || stored === 'light') {
            return stored;
        }
        const prefersDark =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }
}
