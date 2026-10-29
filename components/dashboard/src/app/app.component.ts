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
import { ConfirmDialogService } from './shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from './shared/services/toastr/toastr.service';
import { PromptDialogComponent } from './shared/components/prompt-dialog/prompt-dialog.component';
import { TemplatePickerDialogComponent } from './shared/components/template-picker-dialog/template-picker-dialog.component';
import { DashboardTemplate } from './shared/templates/dashboard-templates';
import { concat } from 'rxjs';
import { toArray } from 'rxjs/operators';

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
    /** When the dashboard is in kiosk mode, hide the global chrome. */
    public isKiosk = false;

    constructor(
        private authService: AuthService,
        private eventBusService: EventBusService,
        private dashboardLayoutService: DashboardLayoutService,
        private observer: BreakpointObserver,
        private router: Router,
        private dialog: MatDialog,
        private themeService: ThemeService,
        private confirm: ConfirmDialogService,
        private toast: ToastrService
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

        // Hide the global chrome while the dashboard is in kiosk mode.
        this.eventBusService.on('kiosk:changed').subscribe({
            next: ({ active }) => {
                this.isKiosk = active;
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
        const dialogRef = this.dialog.open(TemplatePickerDialogComponent, {
            width: '560px',
        });

        dialogRef.afterClosed().subscribe((template: DashboardTemplate | undefined) => {
            if (!template) {
                return;
            }
            this.createDashboardFromTemplate(template);
        });
    }

    private createDashboardFromTemplate(template: DashboardTemplate): void {
        this.dashboardLayoutService
            .createLayout({
                name: template.id === 'blank' ? 'New Dashboard' : template.name,
                isDefault: this.dashboardLayouts.length === 0,
            })
            .subscribe({
                next: (layout) => {
                    this.dashboardLayouts = [...this.dashboardLayouts, layout];

                    if (template.widgets.length === 0) {
                        this.navigateToDashboard(layout.id);
                        this.toast.showSuccess('Dashboard created');
                        return;
                    }

                    // Add each template widget sequentially so ordering/positions
                    // are deterministic, then navigate once all are persisted.
                    const adds = template.widgets.map((w) =>
                        this.dashboardLayoutService.addWidget(layout.id, {
                            widgetType: w.widgetType,
                            title: w.title,
                            gridX: w.gridX ?? 0,
                            gridY: w.gridY ?? 0,
                            gridCols: w.gridCols,
                            gridRows: w.gridRows,
                            config: JSON.stringify(w.config),
                        })
                    );

                    concat(...adds)
                        .pipe(toArray())
                        .subscribe({
                            next: () => {
                                this.navigateToDashboard(layout.id);
                                this.toast.showSuccess('Dashboard created from template');
                            },
                            error: (err) => {
                                console.error('Failed to populate template:', err);
                                // The layout exists; navigate anyway so the user
                                // can finish manually.
                                this.navigateToDashboard(layout.id);
                                this.toast.showError(
                                    'Dashboard created, but some template widgets failed to add'
                                );
                            },
                        });
                },
                error: (err) => {
                    console.error('Failed to create dashboard:', err);
                    this.toast.showError('Failed to create dashboard');
                },
            });
    }

    public renameDashboard(layout: DashboardLayoutInfoFragment, event: Event): void {
        event.stopPropagation();

        const dialogRef = this.dialog.open(PromptDialogComponent, {
            width: '420px',
            data: {
                title: 'Rename dashboard',
                label: 'Dashboard name',
                value: layout.name,
                confirmText: 'Rename',
                maxLength: 256,
            },
        });

        dialogRef.afterClosed().subscribe((name: string | undefined) => {
            if (!name || name === layout.name) {
                return;
            }
            this.dashboardLayoutService.updateLayout(layout.id, { name }).subscribe({
                next: (updated) => {
                    this.dashboardLayouts = this.dashboardLayouts.map((l) =>
                        l.id === layout.id ? { ...l, name: updated.name } : l
                    );
                    this.toast.showSuccess('Dashboard renamed');
                },
                error: (err) => {
                    console.error('Failed to rename dashboard:', err);
                    this.toast.showError('Failed to rename dashboard');
                },
            });
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
                this.toast.showSuccess(`"${layout.name}" is now the default dashboard`);
            },
            error: (err) => {
                console.error('Failed to set default:', err);
                this.toast.showError('Failed to set default dashboard');
            },
        });
    }

    public deleteDashboard(layout: DashboardLayoutInfoFragment, event: Event): void {
        event.stopPropagation();
        if (this.dashboardLayouts.length <= 1) {
            return;
        }

        this.confirm
            .confirmDelete(layout.name, {
                title: 'Delete dashboard?',
                message: `This permanently deletes "${layout.name}" and its widget layout. This action cannot be undone.`,
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
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
                        this.toast.showSuccess('Dashboard deleted');
                    },
                    error: (err) => {
                        console.error('Failed to delete dashboard:', err);
                        this.toast.showError('Failed to delete dashboard');
                    },
                });
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
