import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService, DashboardStats } from '../../shared/services/dashboard/dashboard.service';

@Component({
    standalone: false,
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
    public stats: DashboardStats | null = null;
    public isLoading = true;
    public error: string | null = null;

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly router: Router,
        private readonly cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadStats();
    }

    private loadStats(): void {
        this.isLoading = true;
        this.error = null;

        this.dashboardService.getStats().subscribe({
            next: (stats) => {
                this.stats = stats;
                this.isLoading = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Failed to load dashboard stats:', err);
                this.error = 'Failed to load dashboard data. Please try again.';
                this.isLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    public refreshStats(): void {
        this.loadStats();
    }

    public navigateTo(path: string): void {
        this.router.navigate([path]);
    }
}
