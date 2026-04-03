import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MetricsService } from '../../../../shared/services/metrics/metrics.service';
import { DeviceMetricInfoFragment } from '../../../../shared/graphql/generated';

@Component({
    standalone: false,
    selector: 'app-table-widget',
    templateUrl: './table-widget.component.html',
    styleUrls: ['./table-widget.component.scss'],
})
export class TableWidgetComponent implements OnInit, OnDestroy, OnChanges {
    @Input() deviceId: string;
    @Input() metricName: string = '';
    @Input() timeRange: 'hour' | 'day' | 'week' = 'hour';
    @Input() limit: number = 10;
    @Input() refreshInterval: number = 30000;

    displayedColumns: string[] = ['metricName', 'metricValue', 'recordedAt'];
    dataSource: DeviceMetricInfoFragment[] = [];
    loading: boolean = true;
    error: string | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private metricsService: MetricsService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadData();

        if (this.refreshInterval > 0) {
            interval(this.refreshInterval)
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => this.loadData());
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['deviceId'] || changes['metricName'] || changes['timeRange'] || changes['limit'])
            && !changes['deviceId']?.firstChange) {
            this.loadData();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadData(): void {
        if (!this.deviceId) {
            this.error = 'Device not configured';
            this.loading = false;
            return;
        }

        const filter = this.getFilter();

        this.metricsService
            .getMetrics(this.deviceId, filter)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (metrics) => {
                    this.dataSource = metrics;
                    this.loading = false;
                    this.error = null;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.error = 'Failed to load data';
                    this.loading = false;
                    this.cdr.detectChanges();
                },
            });
    }

    private getFilter(): { metricName?: string; startTime?: Date; endTime?: Date; limit?: number } {
        const now = new Date();
        let startTime: Date;

        switch (this.timeRange) {
            case 'hour':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case 'day':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
        }

        return {
            metricName: this.metricName || undefined,
            startTime,
            endTime: now,
            limit: this.limit || 10,
        };
    }

    formatTimestamp(timestamp: any): string {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    formatValue(value: number, unit?: string): string {
        const formatted = value.toFixed(2);
        return unit ? `${formatted} ${unit}` : formatted;
    }
}
