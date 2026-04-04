import { BreakpointObserver } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { delay, filter } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './shared/services/auth/auth.service';
import { EventBusService } from './shared/services/eventbus/eventbus.service';
import { DashboardLayoutService } from './shared/services/dashboard-layout/dashboard-layout.service';
import { DashboardLayoutInfoFragment } from './shared/graphql/generated';

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
    public dashboardLayouts: DashboardLayoutInfoFragment[] = [];
    public isDashboardsExpanded: boolean = false;
    public currentDashboardId: string | null = null;

    constructor(
        private authService: AuthService,
        private eventBusService: EventBusService,
        private dashboardLayoutService: DashboardLayoutService,
        private observer: BreakpointObserver,
        private router: Router,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();

        if (this.isLoggedIn) {
            this.loadDashboardLayouts();
        }

        this.eventBusService.on('onLoginChange').subscribe({
            next: () => {
                this.isLoggedIn = this.authService.isLoggedIn();
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
            .observe(['(max-width: 800px)'])
            .pipe(delay(1), untilDestroyed(this))
            .subscribe(() => {});

        this.router.events
            .pipe(
                untilDestroyed(this),
                filter((e) => e instanceof NavigationEnd)
            )
            .subscribe(() => {});
    }

    public async onLoginClick(): Promise<void> {
        await this.router.navigate(['login']);
    }

    public onLogoutClick(): void {
        this.authService.logout();
        this.eventBusService.emit('onLoginChange', {});
    }
}
