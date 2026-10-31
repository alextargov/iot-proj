import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { DeviceService } from '../../../../shared/services/device/device.service';
import { MetricsService } from '../../../../shared/services/metrics/metrics.service';
import { DeviceInfoFragment, DashboardWidgetType } from '../../../../shared/graphql/generated';
import {finalize} from "rxjs";

export interface WidgetConfigDialogData {
    mode: 'create' | 'edit';
    widgetType?: DashboardWidgetType;
    config?: any;
    title?: string;
}

export interface WidgetConfigDialogResult {
    widgetType: DashboardWidgetType;
    title: string;
    config: any;
}

@Component({
    standalone: false,
    selector: 'app-widget-config-dialog',
    templateUrl: './widget-config-dialog.component.html',
    styleUrls: ['./widget-config-dialog.component.scss'],
})
export class WidgetConfigDialogComponent implements OnInit {
    form: FormGroup;
    devices: DeviceInfoFragment[] = [];
    loading: boolean = true;
    devicesError = false;
    /** Metric-name suggestions for the selected device (recorded metrics). */
    metricNames: string[] = [];
    /** Exposed for the preview @switch in the template. */
    readonly DashboardWidgetType = DashboardWidgetType;
    /** Default color for a newly-added gauge threshold row. */
    private readonly DEFAULT_THRESHOLD_COLOR = '#f44336';

    widgetTypes = [
        { value: DashboardWidgetType.Gauge, label: 'Gauge', icon: 'speed' },
        { value: DashboardWidgetType.LineChart, label: 'Line Chart', icon: 'show_chart' },
        { value: DashboardWidgetType.StatusIndicator, label: 'Status Indicator', icon: 'radio_button_checked' },
        { value: DashboardWidgetType.StatCard, label: 'Stat Card', icon: 'analytics' },
        { value: DashboardWidgetType.Table, label: 'Table', icon: 'table_chart' },
    ];

    timeRanges = [
        { value: 'hour', label: 'Last Hour' },
        { value: 'day', label: 'Last 24 Hours' },
        { value: 'week', label: 'Last 7 Days' },
    ];

    aggregations = [
        { value: 'average', label: 'Average' },
        { value: 'sum', label: 'Sum' },
        { value: 'min', label: 'Minimum' },
        { value: 'max', label: 'Maximum' },
        { value: 'count', label: 'Count' },
    ];

    sizes = [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
    ];

    constructor(
        private dialogRef: MatDialogRef<WidgetConfigDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: WidgetConfigDialogData,
        private fb: FormBuilder,
        private deviceService: DeviceService,
        private metricsService: MetricsService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.initForm();
        this.loadDevices();

        // Populate metric suggestions whenever the selected device changes,
        // mirroring rule-form/alert-form. Prime for edit mode if a device is
        // already set.
        const deviceId = this.form.get('deviceId')?.value;
        if (deviceId) {
            this.loadMetricNames(deviceId);
        }
        this.form.get('deviceId')?.valueChanges.subscribe((id: string) => {
            this.loadMetricNames(id);
        });
    }

    private initForm(): void {
        this.form = this.fb.group(
            {
                widgetType: [this.data.widgetType || DashboardWidgetType.Gauge, Validators.required],
                title: [this.data.title || '', Validators.required],
                deviceId: [this.data.config?.deviceId || '', Validators.required],
                metricName: [this.data.config?.metricName || ''],
                // Gauge specific
                minValue: [this.data.config?.minValue ?? 0],
                maxValue: [this.data.config?.maxValue ?? 100],
                unit: [this.data.config?.unit || ''],
                decimals: [this.data.config?.decimals ?? 1, [Validators.min(0), Validators.max(6)]],
                thresholds: this.fb.array(
                    (this.data.config?.thresholds ?? []).map((t: { value: number; color: string }) =>
                        this.makeThresholdGroup(t.value, t.color)
                    )
                ),
                // Chart specific
                timeRange: [this.data.config?.timeRange || 'hour'],
                showLegend: [this.data.config?.showLegend !== false],
                // Stat card specific
                aggregation: [this.data.config?.aggregation || 'average'],
                // Status indicator specific
                size: [this.data.config?.size || 'medium'],
                showLabel: [this.data.config?.showLabel !== false],
                // Table specific
                limit: [this.data.config?.limit ?? 10, [Validators.min(1), Validators.max(100)]],
            },
            { validators: this.minMaxValidator() }
        );
    }

    /** Cross-field validator: for gauges, maxValue must exceed minValue. */
    private minMaxValidator(): ValidatorFn {
        return (group: AbstractControl): ValidationErrors | null => {
            if (group.get('widgetType')?.value !== DashboardWidgetType.Gauge) {
                return null;
            }
            const min = Number(group.get('minValue')?.value);
            const max = Number(group.get('maxValue')?.value);
            return max > min ? null : { minMax: true };
        };
    }

    private makeThresholdGroup(value: number | null, color: string): FormGroup {
        // No required validators here: incomplete rows are filtered out on save
        // (cleanThresholds) rather than blocking the whole form.
        return this.fb.group({
            value: [value ?? null],
            color: [color || this.DEFAULT_THRESHOLD_COLOR],
        });
    }

    get thresholds(): FormArray {
        return this.form.get('thresholds') as FormArray;
    }

    public addThreshold(): void {
        this.thresholds.push(this.makeThresholdGroup(null, this.DEFAULT_THRESHOLD_COLOR));
    }

    public removeThreshold(index: number): void {
        this.thresholds.removeAt(index);
    }

    /** True when the gauge min/max cross-field validation currently fails. */
    get hasMinMaxError(): boolean {
        return this.form.hasError('minMax');
    }

    private loadMetricNames(deviceId: string): void {
        if (!deviceId) {
            this.metricNames = [];
            return;
        }
        this.metricsService.getMetricsSeries(deviceId).subscribe({
            next: (series) => {
                this.metricNames = Array.from(
                    new Set(series.map((s) => s.metricName))
                ).sort();
                this.cdr.detectChanges();
            },
            error: () => {
                this.metricNames = [];
            },
        });
    }

    private loadDevices(): void {
        this.loading = true;
        this.devicesError = false;
        this.deviceService.getAllDevices()
            .pipe(finalize(() => {
                this.loading = false;
                this.cdr.detectChanges()
            }))
            .subscribe({
                next: (devices) => {
                    this.devices = devices;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Failed to load devices:', err);
                    this.devicesError = true;
                    this.loading = false;
                },
            });
    }

    /** Retry device loading after a failure. */
    public retryLoadDevices(): void {
        this.loadDevices();
    }

    get selectedWidgetType(): DashboardWidgetType {
        return this.form.get('widgetType')?.value;
    }

    get isGauge(): boolean {
        return this.selectedWidgetType === DashboardWidgetType.Gauge;
    }

    get isLineChart(): boolean {
        return this.selectedWidgetType === DashboardWidgetType.LineChart;
    }

    get isStatusIndicator(): boolean {
        return this.selectedWidgetType === DashboardWidgetType.StatusIndicator;
    }

    get isStatCard(): boolean {
        return this.selectedWidgetType === DashboardWidgetType.StatCard;
    }

    get isTable(): boolean {
        return this.selectedWidgetType === DashboardWidgetType.Table;
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.form.invalid) return;

        const formValue = this.form.value;
        const config: any = {
            deviceId: formValue.deviceId,
        };

        // Add type-specific config
        switch (formValue.widgetType) {
            case DashboardWidgetType.Gauge:
                config.metricName = formValue.metricName;
                config.minValue = formValue.minValue;
                config.maxValue = formValue.maxValue;
                config.unit = formValue.unit;
                config.decimals = formValue.decimals;
                config.thresholds = this.cleanThresholds(formValue.thresholds);
                break;
            case DashboardWidgetType.LineChart:
                config.metricNames = formValue.metricName ? [formValue.metricName] : undefined;
                config.timeRange = formValue.timeRange;
                config.showLegend = formValue.showLegend;
                break;
            case DashboardWidgetType.StatusIndicator:
                config.size = formValue.size;
                config.showLabel = formValue.showLabel;
                break;
            case DashboardWidgetType.StatCard:
                config.metricName = formValue.metricName;
                config.aggregation = formValue.aggregation;
                config.timeRange = formValue.timeRange;
                config.unit = formValue.unit;
                config.decimals = formValue.decimals;
                break;
            case DashboardWidgetType.Table:
                config.metricName = formValue.metricName || undefined;
                config.timeRange = formValue.timeRange;
                config.limit = formValue.limit;
                break;
        }

        const result: WidgetConfigDialogResult = {
            widgetType: formValue.widgetType,
            title: formValue.title,
            config,
        };

        this.dialogRef.close(result);
    }

    /** Drop incomplete threshold rows so the widget's color logic stays valid. */
    private cleanThresholds(
        rows: Array<{ value: number | null; color: string }>
    ): Array<{ value: number; color: string }> {
        return (rows ?? [])
            .filter((r) => r.value !== null && r.value !== undefined && !!r.color)
            .map((r) => ({ value: Number(r.value), color: r.color }));
    }

    /** True when the current form has enough to render a live preview. */
    get canPreview(): boolean {
        return !!this.form.get('deviceId')?.value && !this.form.hasError('minMax');
    }

    /**
     * Live config object bound to the preview widget, derived from the current
     * form values (not persisted). Mirrors the shape the dashboard tiles read.
     */
    get previewConfig(): any {
        const v = this.form.value;
        return {
            deviceId: v.deviceId,
            metricName: v.metricName,
            metricNames: v.metricName ? [v.metricName] : undefined,
            minValue: v.minValue,
            maxValue: v.maxValue,
            unit: v.unit,
            decimals: v.decimals,
            thresholds: this.cleanThresholds(v.thresholds),
            timeRange: v.timeRange,
            showLegend: v.showLegend,
            aggregation: v.aggregation,
            size: v.size,
            showLabel: v.showLabel,
            limit: v.limit,
        };
    }
}
