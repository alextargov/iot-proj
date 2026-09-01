import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { delay, filter, map } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService, Role } from './shared/services/auth/auth.service';
import { EventBusService } from './shared/services/eventbus/eventbus.service';
import { DashboardLayoutService } from './shared/services/dashboard-layout/dashboard-layout.service';
import { DashboardLayoutInfoFragment } from './shared/graphql/generated';
import { ThemeService, ThemeMode } from './shared/services/theme/theme.service';

@UntilDestroy()
@Component({
    standalone: false,
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'dashboard';
    public isLoggedIn: boolean = false;
    public currentUsername: string | null = null;
    public currentUserRole: Role | null = null;
    public dashboardLayouts: DashboardLayoutInfoFragment[] = [];
    public isDashboardsExpanded: boolean = false;
    public currentDashboardId: string | null = null;

    /** True on small viewports — sidebar becomes a slide-in overlay. */
    public isHandset = false;
    /** Whether the overlay sidebar is currently open (handset only). */
    public sidebarOpen = false;

    constructor(
        private authService: AuthService,
        private eventBusService: EventBusService,
        private dashboardLayoutService: DashboardLayoutService,
        private observer: BreakpointObserver,
        private router: Router,
        private dialog: MatDialog,
        private themeService: ThemeService
    ) {}

    public get theme(): ThemeMode {
        return this.themeService.current;
    }

    public toggleTheme(): void {
        this.themeService.toggle();
    }

    public toggleSidebar(): void {
        this.sidebarOpen = !this.sidebarOpen;
    }

    public closeSidebarOnHandset(): void {
        if (this.isHandset) {
            this.sidebarOpen = false;
        }
    }

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();
        this.refreshUser();

        if (this.isLoggedIn) {
            this.loadDashboardLayouts();
        }

        this.eventBusService.on('onLoginChange').subscribe({
            next: () => {
                this.isLoggedIn = this.authService.isLoggedIn();
                this.refreshUser();
                if (this.isLoggedIn) {
                    this.loadDashboardLayouts();
                } else {
                    this.dashboardLayouts = [];
                }
            },
        });

        // Listen for dashboard changes
        this.eventBusService.on('onDashboardChange').subscribe({
            next: () => {
                this.loadDashboardLayouts();
            },
        });
    }

    private refreshUser(): void {
        this.currentUsername = this.authService.getCurrentUsername();
        this.currentUserRole = this.authService.getCurrentUserRole();
    }

    /** Whether the current user may perform write operations (OPERATOR+). */
    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    /** Whether the current user is an ADMIN (gates the Admin nav entry). */
    public get isAdmin(): boolean {
        return this.authService.hasRole('ADMIN');
    }

    private loadDashboardLayouts(): void {
        this.dashboardLayoutService.getLayouts().subscribe({
            next: (layouts) => {
                this.dashboardLayouts = layouts;
            },
            error: (err) => console.error('Failed to load dashboard layouts:', err),
        });
    }

    public navigateToDashboard(layoutId: string): void {
        this.currentDashboardId = layoutId;
        this.router.navigate(['/dashboard'], { queryParams: { id: layoutId } });
    }

    public onDashboardsExpanded(): void {
        this.isDashboardsExpanded = true;
        // Navigate to default dashboard when expanding
        const defaultLayout = this.dashboardLayouts.find((l) => l.isDefault);
        if (defaultLayout) {
            this.navigateToDashboard(defaultLayout.id);
        } else if (this.dashboardLayouts.length > 0) {
            this.navigateToDashboard(this.dashboardLayouts[0].id);
        }
    }

    public createNewDashboard(): void {
        this.dashboardLayoutService
            .createLayout({ name: 'New Dashboard', isDefault: this.dashboardLayouts.length === 0 })
            .subscribe({
                next: (layout) => {
                    this.dashboardLayouts = [...this.dashboardLayouts, layout];
                    this.navigateToDashboard(layout.id);
                },
                error: (err) => console.error('Failed to create dashboard:', err),
            });
    }

    public setAsDefault(layout: DashboardLayoutInfoFragment, event: Event): void {
        event.stopPropagation();
        this.dashboardLayoutService.updateLayout(layout.id, { isDefault: true }).subscribe({
            next: () => {
                this.dashboardLayouts = this.dashboardLayouts.map((l) => ({
                    ...l,
                    isDefault: l.id === layout.id,
                }));
            },
            error: (err) => console.error('Failed to set default:', err),
        });
    }

    public deleteDashboard(layout: DashboardLayoutInfoFragment, event: Event): void {
        event.stopPropagation();
        if (this.dashboardLayouts.length <= 1) {
            return;
        }

        this.dashboardLayoutService.deleteLayout(layout.id).subscribe({
            next: () => {
                this.dashboardLayouts = this.dashboardLayouts.filter((l) => l.id !== layout.id);
                if (this.currentDashboardId === layout.id) {
                    const nextLayout = this.dashboardLayouts[0];
                    if (nextLayout) {
                        this.navigateToDashboard(nextLayout.id);
                    }
                }
            },
            error: (err) => console.error('Failed to delete dashboard:', err),
        });
    }

    ngAfterViewInit(): void {
        this.observer
            .observe([Breakpoints.Handset, '(max-width: 800px)'])
            .pipe(
                delay(1),
                map((result) => result.matches),
                untilDestroyed(this)
            )
            .subscribe((isHandset) => {
                this.isHandset = isHandset;
                // On desktop the sidebar is always visible; reset overlay state.
                if (!isHandset) {
                    this.sidebarOpen = false;
                }
            });

        this.router.events
            .pipe(
                untilDestroyed(this),
                filter((e) => e instanceof NavigationEnd)
            )
            .subscribe(() => {
                // Auto-dismiss the overlay sidebar after navigating on mobile.
                this.closeSidebarOnHandset();
            });
    }

    public async onLoginClick(): Promise<void> {
        await this.router.navigate(['login']);
    }

    public onLogoutClick(): void {
        this.authService.logout();
        this.eventBusService.emit('onLoginChange', {});
    }
}
