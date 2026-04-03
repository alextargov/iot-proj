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

    public readOnly = false;
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
                console.log(this.isLoggedIn);
                if (this.isLoggedIn) {
                    this.loadDashboardLayouts();
                } else {
                    this.dashboardLayouts = [];
                }
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
        this.router.navigate(['/dashboard'], { queryParams: { id: layoutId } });
    }

    ngAfterViewInit(): void {
        this.observer
            .observe(['(max-width: 800px)'])
            .pipe(delay(1), untilDestroyed(this))
            .subscribe((res) => {});

        this.router.events
            .pipe(
                untilDestroyed(this),
                filter((e) => e instanceof NavigationEnd)
            )
            .subscribe(() => {});
    }

    onCode(code: string) {
        console.log(code);
    }

    public async onLoginClick(): Promise<void> {
        await this.router.navigate(['login']);
        // const dialogRef = this.dialog.open(LoginDialogComponent, {
        //     width: '400px',
        //     disableClose: true
        // });
        //
        // dialogRef.afterClosed().subscribe(result => {
        //     if (result) {
        //         console.log('Dialog closed with result:', result);
        //         // Handle login logic here
        //     }
        // });
    }

    public onLogoutClick(): void {
        this.authService.logout();
        this.eventBusService.emit('onLoginChange', {});
    }
}
