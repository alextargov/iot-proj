import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MetricsService } from '../../../../shared/services/metrics/metrics.service';
import { AggregationType } from '../../../../shared/graphql/generated';

@Component({
    standalone: false,
    selector: 'app-stat-card-widget',
    templateUrl: './stat-card-widget.component.html',
    styleUrls: ['./stat-card-widget.component.scss'],
})
export class StatCardWidgetComponent implements OnInit, OnDestroy, OnChanges {
    @Input() deviceId: string;
    @Input() metricName: string;
    @Input() aggregation: 'average' | 'sum' | 'min' | 'max' | 'count' = 'average';
    @Input() timeRange: 'hour' | 'day' | 'week' = 'hour';
    @Input() unit: string = '';
    @Input() decimals: number = 1;
    @Input() refreshInterval: number = 30000;

    currentValue: number = 0;
    displayValue: string = '0';
    metricLabel: string = '';
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
        if ((changes['deviceId'] || changes['metricName'] || changes['aggregation'] || changes['timeRange'])
            && !changes['deviceId']?.firstChange) {
            this.loadData();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadData(): void {
        if (!this.deviceId || !this.metricName) {
            this.error = 'Device or metric not configured';
            this.loading = false;
            return;
        }

        const aggregationType = this.getAggregationType();

        this.metricsService
            .getAggregatedMetrics(this.deviceId, aggregationType, {
                metricName: this.metricName,
            })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (result) => {
                    if (result) {
                        this.currentValue = this.getValueByAggregation(result);
                        this.displayValue = this.formatValue(this.currentValue, this.decimals);
                        this.metricLabel = this.metricName;
                    }
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

    private getAggregationType(): AggregationType {
        switch (this.timeRange) {
            case 'hour':
                return AggregationType.LastHour;
            case 'day':
                return AggregationType.LastDay;
            case 'week':
                return AggregationType.LastWeek;
            default:
                return AggregationType.LastHour;
        }
    }

    private getValueByAggregation(result: any): number {
        switch (this.aggregation) {
            case 'average':
                return result.value;
            case 'sum':
                return result.value * result.count;
            case 'min':
                return result.min;
            case 'max':
                return result.max;
            case 'count':
                return result.count;
            default:
                return result.value;
        }
    }

    private formatValue(value: number, decimals: number): string {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toFixed(decimals);
    }

    get aggregationLabel(): string {
        switch (this.aggregation) {
            case 'average':
                return 'Average';
            case 'sum':
                return 'Total';
            case 'min':
                return 'Minimum';
            case 'max':
                return 'Maximum';
            case 'count':
                return 'Count';
            default:
                return '';
        }
    }

    get timeRangeLabel(): string {
        switch (this.timeRange) {
            case 'hour':
                return 'Last hour';
            case 'day':
                return 'Last 24h';
            case 'week':
                return 'Last 7 days';
            default:
                return '';
        }
    }
}
