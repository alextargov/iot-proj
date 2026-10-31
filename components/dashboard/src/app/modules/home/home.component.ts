import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, fromEvent, merge, timer } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import {
    DashboardOverview,
    DashboardService,
} from '../../shared/services/dashboard/dashboard.service';
import { DeviceService } from '../../shared/services/device/device.service';
import { DeviceInfoFragment } from '../../shared/graphql/generated';
import {
    getDeviceStatusConfig,
    StatusConfig,
} from '../../shared/utils/status-config.utils';

/** How often to re-poll widget/alert counts (device counts update live via
 *  the status subscription). Paused while the tab is hidden. */
const REFRESH_INTERVAL_MS = 30_000;

@Component({
    standalone: false,
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
    public overview: DashboardOverview | null = null;
    /** True only until the first payload arrives — drives the skeletons.
     *  Background refreshes keep the previous numbers on screen. */
    public isInitialLoading = true;
    public error: string | null = null;
    public lastUpdated: Date | null = null;

    private readonly destroy$ = new Subject<void>();
    private pollSub?: Subscription;

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly deviceService: DeviceService,
        private readonly router: Router,
        private readonly cdr: ChangeDetectorRef
    ) {}

    public ngOnInit(): void {
        this.load(true);
        this.startAutoRefresh();
        this.subscribeToDeviceStatus();
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /** Top devices by most-recent update, for the "Recent devices" panel. */
    public get recentDevices(): DeviceInfoFragment[] {
        const devices = this.overview?.devices ?? [];
        return [...devices]
            .sort(
                (a, b) =>
                    this.timeOf(b.updatedAt ?? b.createdAt) -
                    this.timeOf(a.updatedAt ?? a.createdAt)
            )
            .slice(0, 4);
    }

    public get openAlerts(): number {
        return this.overview?.openAlerts ?? 0;
    }

    private timeOf(value: unknown): number {
        if (!value) {
            return 0;
        }
        const t = new Date(value as string | number).getTime();
        return Number.isNaN(t) ? 0 : t;
    }

    private load(initial: boolean): void {
        if (initial) {
            this.isInitialLoading = true;
        }
        this.error = null;

        this.dashboardService
            .getOverview()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (overview) => {
                    this.overview = overview;
                    this.isInitialLoading = false;
                    this.lastUpdated = new Date();
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    console.error('Failed to load dashboard overview:', err);
                    // Only surface a blocking error on the first load; a failed
                    // background refresh leaves the last-known data in place.
                    if (initial) {
                        this.error =
                            'Failed to load dashboard data. Please try again.';
                    }
                    this.isInitialLoading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    /** Re-poll on an interval, but only while the tab is visible. Switching
     *  back to the tab triggers an immediate refresh. */
    private startAutoRefresh(): void {
        const visibility$ = fromEvent(document, 'visibilitychange');

        this.pollSub = merge(timer(REFRESH_INTERVAL_MS, REFRESH_INTERVAL_MS), visibility$)
            .pipe(
                filter(() => document.visibilityState === 'visible'),
                takeUntil(this.destroy$)
            )
            .subscribe(() => this.load(false));
    }

    /** Device status changes arrive live; patch the in-memory list and let the
     *  card counts recompute without a round-trip. */
    private subscribeToDeviceStatus(): void {
        this.deviceService
            .subscribeToDeviceStatus()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (event) => {
                    if (!this.overview) {
                        return;
                    }
                    const devices = this.overview.devices.map((d) =>
                        d.id === event.deviceId
                            ? { ...d, status: event.status }
                            : d
                    );
                    this.overview = {
                        ...this.overview,
                        devices,
                        stats: {
                            ...this.overview.stats,
                            devices: this.dashboardService.deviceStats(devices),
                        },
                    };
                    this.lastUpdated = new Date();
                    this.cdr.markForCheck();
                },
                error: () => {
                    /* non-fatal; polling still refreshes counts */
                },
            });
    }

    public refresh(): void {
        this.load(this.overview === null);
    }

    public navigateTo(path: string, queryParams?: Record<string, string>): void {
        this.router.navigate([path], queryParams ? { queryParams } : undefined);
    }

    public trackByDeviceId(_index: number, device: DeviceInfoFragment): string {
        return device.id;
    }

    public statusConfig(status: string): StatusConfig {
        return getDeviceStatusConfig(status);
    }
}
