import { Component, OnInit } from '@angular/core';
import { MeGQL, MeQuery } from '../../shared/graphql/generated';
import { AuthService } from '../../shared/services/auth/auth.service';
import { ThemeService, ThemeMode } from '../../shared/services/theme/theme.service';

@Component({
    standalone: false,
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
    me: MeQuery['me'] | null = null;
    loading = true;
    /** True when the fetch failed for a reason other than being signed out. */
    loadError = false;

    constructor(
        private meGQL: MeGQL,
        private authService: AuthService,
        private themeService: ThemeService
    ) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        this.loadError = false;
        this.meGQL.fetch({ fetchPolicy: 'network-only' }).subscribe({
            next: (res) => {
                this.me = res.data?.me ?? null;
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                // A missing/invalid session is "not signed in"; anything else
                // (network, server) is a real error worth a retry affordance.
                const status = err?.networkError?.status ?? err?.status;
                this.loadError = !(status === 401 || status === 403);
            },
        });
    }

    /** Whether the user has an active session (drives the "Not signed in" copy). */
    public get isLoggedIn(): boolean {
        return this.authService.isLoggedIn();
    }

    public get theme(): ThemeMode {
        return this.themeService.current;
    }

    public get darkMode(): boolean {
        return this.theme === 'dark';
    }

    public onDarkModeToggle(enabled: boolean): void {
        this.themeService.set(enabled ? 'dark' : 'light');
    }
}
