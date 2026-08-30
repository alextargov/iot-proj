import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MetricsService } from '../../../../shared/services/metrics/metrics.service';
import { AggregationType } from '../../../../shared/graphql/generated';

@Component({
    standalone: false,
    selector: 'app-gauge-widget',
    templateUrl: './gauge-widget.component.html',
    styleUrls: ['./gauge-widget.component.scss'],
})
export class GaugeWidgetComponent implements OnInit, OnDestroy, OnChanges {
    @Input() deviceId: string;
    @Input() metricName: string;
    @Input() minValue: number = 0;
    @Input() maxValue: number = 100;
    @Input() unit: string = '';
    @Input() decimals: number = 1;
    @Input() thresholds: Array<{ value: number; color: string }> = [];
    @Input() refreshInterval: number = 30000;

    currentValue: number = 0;
    displayValue: string = '0';
    gaugeColor: string = '#4caf50';
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

        // Live updates: re-fetch the aggregate when a matching metric arrives.
        if (this.deviceId) {
            this.metricsService
                .subscribeToMetrics(this.deviceId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (metric) => {
                        if (!this.metricName || metric.metricName === this.metricName) {
                            this.loadData();
                        }
                    },
                    error: () => {
                        /* non-fatal; polling still runs */
                    },
                });
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['deviceId'] || changes['metricName']) && !changes['deviceId']?.firstChange) {
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

        this.metricsService
            .getAggregatedMetrics(this.deviceId, AggregationType.LastHour, {
                metricName: this.metricName,
            })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (result) => {
                    if (result) {
                        this.currentValue = result.value;
                        this.displayValue = this.currentValue.toFixed(this.decimals);
                        this.updateGaugeColor();
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

    private updateGaugeColor(): void {
        if (!this.thresholds || this.thresholds.length === 0) {
            this.gaugeColor = '#4caf50'; // Default green
            return;
        }

        const sortedThresholds = [...this.thresholds].sort((a, b) => b.value - a.value);
        for (const threshold of sortedThresholds) {
            if (this.currentValue >= threshold.value) {
                this.gaugeColor = threshold.color;
                return;
            }
        }
        this.gaugeColor = '#4caf50';
    }

    get percentage(): number {
        const range = this.maxValue - this.minValue;
        if (range === 0) return 0;
        return Math.min(100, Math.max(0, ((this.currentValue - this.minValue) / range) * 100));
    }

    get strokeDashoffset(): number {
        const circumference = 2 * Math.PI * 45; // radius = 45
        return circumference - (this.percentage / 100) * circumference;
    }

    get circumference(): number {
        return 2 * Math.PI * 45;
    }
}
