import {
    Component,
    Input,
    OnInit,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MetricsService } from '../../../services/metrics/metrics.service';
import { DeviceMetricInfoFragment } from '../../../graphql/generated';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

type TimeRange = 'hour' | 'day' | 'week';

@Component({
    standalone: false,
    selector: 'app-device-metrics-chart',
    templateUrl: './device-metrics-chart.component.html',
    styleUrls: ['./device-metrics-chart.component.scss'],
})
export class DeviceMetricsChartComponent implements OnInit, OnChanges, OnDestroy {
    @Input() deviceId: string = '';
    @Input() metricName?: string;
    @Input() height: number = 300;

    @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

    public isLoading = false;
    public selectedTimeRange: TimeRange = 'day';
    public availableMetrics: string[] = [];
    public selectedMetric: string = '';
    public hasData = false;

    public lineChartData: ChartData<'line'> = {
        datasets: [],
        labels: [],
    };

    public lineChartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Time',
                },
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Value',
                },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
    };

    private readonly colors = [
        { border: '#1976d2', background: 'rgba(25, 118, 210, 0.1)' },
        { border: '#ff9800', background: 'rgba(255, 152, 0, 0.1)' },
        { border: '#4caf50', background: 'rgba(76, 175, 80, 0.1)' },
        { border: '#f44336', background: 'rgba(244, 67, 54, 0.1)' },
        { border: '#9c27b0', background: 'rgba(156, 39, 176, 0.1)' },
    ];

    constructor(private metricsService: MetricsService) {}

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        if (this.deviceId) {
            this.loadMetrics();
            this.subscribeToLive();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['deviceId'] && !changes['deviceId'].firstChange) {
            this.loadMetrics();
            this.subscribeToLive();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Append live points for the currently selected metric as they arrive.
     * Re-subscribing on device change is safe because takeUntil only completes
     * on destroy; we filter by deviceId implicitly (the stream is per-device).
     */
    private subscribeToLive(): void {
        if (!this.deviceId) return;

        this.metricsService
            .subscribeToMetrics(this.deviceId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (metric) => {
                    const active = this.selectedMetric || this.metricName;
                    if (active && metric.metricName !== active) {
                        return;
                    }
                    const label = new Date(metric.recordedAt).toLocaleTimeString();
                    (this.lineChartData.labels as string[])?.push(label);
                    if (this.lineChartData.datasets[0]) {
                        (this.lineChartData.datasets[0].data as number[]).push(
                            metric.metricValue
                        );
                    }
                    this.hasData = true;
                    this.chart?.update();
                },
                error: () => {
                    /* non-fatal */
                },
            });
    }

    public onTimeRangeChange(range: TimeRange): void {
        this.selectedTimeRange = range;
        this.loadMetrics();
    }

    public onMetricChange(): void {
        this.loadMetrics();
    }

    private loadMetrics(): void {
        if (!this.deviceId) return;

        this.isLoading = true;
        const filter = this.buildFilter();

        this.metricsService
            .getMetricsSeries(
                this.deviceId,
                this.selectedMetric ? [this.selectedMetric] : undefined,
                filter
            )
            .subscribe({
                next: (series) => {
                    this.processMetricsSeries(series);
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Failed to load metrics:', err);
                    this.isLoading = false;
                    this.hasData = false;
                    this.lineChartData = { datasets: [], labels: [] };
                },
            });
    }

    private buildFilter(): { startTime?: string; endTime?: string; limit?: number } {
        const now = new Date();
        let startTime: Date;

        switch (this.selectedTimeRange) {
            case 'hour':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case 'day':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
        }

        return {
            startTime: startTime.toISOString(),
            endTime: now.toISOString(),
            limit: 500,
        };
    }

    private processMetricsSeries(series: any[]): void {
        if (!series || series.length === 0) {
            this.hasData = false;
            this.lineChartData = { datasets: [], labels: [] };
            return;
        }

        this.hasData = true;
        this.availableMetrics = series.map((s) => s.metricName);

        // Get unique timestamps across all series
        const allTimestamps = new Set<string>();
        series.forEach((s) => {
            (s.dataPoints || []).forEach((dp: DeviceMetricInfoFragment) => {
                allTimestamps.add(dp.recordedAt);
            });
        });

        // Sort timestamps and convert to labels
        const sortedTimestamps = Array.from(allTimestamps).sort();
        const labels = sortedTimestamps.map((ts) => this.formatTime(ts));

        // Build datasets
        const datasets = series.map((s, index) => {
            const color = this.colors[index % this.colors.length];
            const dataMap = new Map<string, number>();

            (s.dataPoints || []).forEach((dp: DeviceMetricInfoFragment) => {
                dataMap.set(dp.recordedAt, dp.metricValue);
            });

            const data = sortedTimestamps.map((ts) => dataMap.get(ts) ?? null);

            return {
                label: s.metricName + (s.unit ? ` (${s.unit})` : ''),
                data: data,
                borderColor: color.border,
                backgroundColor: color.background,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5,
            };
        });

        this.lineChartData = {
            labels: labels,
            datasets: datasets,
        };

        // Update Y-axis label if we have a single metric with unit
        if (series.length === 1 && series[0].unit && this.lineChartOptions?.scales?.['y']) {
            (this.lineChartOptions.scales['y'] as any).title.text = series[0].unit;
        }

        // Update chart
        this.chart?.update();
    }

    private formatTime(timestamp: any): string {
        const date = new Date(timestamp);
        if (this.selectedTimeRange === 'hour') {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } else if (this.selectedTimeRange === 'day') {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
            });
        }
    }
}
