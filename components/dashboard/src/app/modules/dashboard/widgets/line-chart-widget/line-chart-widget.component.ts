import { Component, Input, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MetricsService } from '../../../../shared/services/metrics/metrics.service';

@Component({
    standalone: false,
    selector: 'app-line-chart-widget',
    templateUrl: './line-chart-widget.component.html',
    styleUrls: ['./line-chart-widget.component.scss'],
})
export class LineChartWidgetComponent implements OnInit, OnDestroy, OnChanges {
    @Input() deviceId: string;
    @Input() metricNames: string[] | null = null;
    @Input() timeRange: 'hour' | 'day' | 'week' = 'hour';
    @Input() showLegend: boolean = true;
    @Input() refreshInterval: number = 30000;

    @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

    loading: boolean = true;
    error: string | null = null;

    chartData: ChartData<'line'> = {
        labels: [],
        datasets: [],
    };

    chartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
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
                    display: false,
                },
                ticks: {
                    maxTicksLimit: 6,
                },
            },
            y: {
                display: true,
                beginAtZero: false,
            },
        },
        elements: {
            point: {
                radius: 2,
            },
            line: {
                tension: 0.3,
            },
        },
    };

    private readonly colors = [
        'rgb(75, 192, 192)',
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 205, 86)',
        'rgb(153, 102, 255)',
    ];

    private destroy$ = new Subject<void>();

    constructor(
        private metricsService: MetricsService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        if (!this.showLegend && this.chartOptions?.plugins?.legend) {
            this.chartOptions.plugins.legend.display = false;
        }

        this.loadData();

        if (this.refreshInterval > 0) {
            interval(this.refreshInterval)
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => this.loadData());
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['deviceId'] || changes['metricNames'] || changes['timeRange']) && !changes['deviceId']?.firstChange) {
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

        const filter = this.getFilterFromTimeRange();

        this.metricsService
            .getMetricsSeries(this.deviceId, this.metricNames || null, filter)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (series) => {
                    this.updateChart(series);
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

    private getFilterFromTimeRange(): { startTime?: Date; endTime?: Date; limit?: number } {
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

        return { startTime, endTime: now, limit: 500 };
    }

    private updateChart(series: any[]): void {
        if (!series || series.length === 0) {
            this.chartData = { labels: [], datasets: [] };
            return;
        }

        // Use first series for labels (timestamps)
        const labels = series[0]?.dataPoints?.map((dp: any) =>
            new Date(dp.recordedAt).toLocaleTimeString()
        ) || [];

        const datasets = series.map((s, index) => ({
            label: `${s.metricName}${s.unit ? ` (${s.unit})` : ''}`,
            data: s.dataPoints?.map((dp: any) => dp.metricValue) || [],
            borderColor: this.colors[index % this.colors.length],
            backgroundColor: this.colors[index % this.colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
            fill: true,
        }));

        this.chartData = { labels, datasets };
        this.chart?.update();
    }
}
