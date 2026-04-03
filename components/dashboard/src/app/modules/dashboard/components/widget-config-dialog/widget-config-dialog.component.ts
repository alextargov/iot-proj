import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DeviceService } from '../../../../shared/services/device/device.service';
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
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.initForm();
        this.loadDevices();
    }

    private initForm(): void {
        this.form = this.fb.group({
            widgetType: [this.data.widgetType || DashboardWidgetType.Gauge, Validators.required],
            title: [this.data.title || '', Validators.required],
            deviceId: [this.data.config?.deviceId || '', Validators.required],
            metricName: [this.data.config?.metricName || ''],
            // Gauge specific
            minValue: [this.data.config?.minValue ?? 0],
            maxValue: [this.data.config?.maxValue ?? 100],
            unit: [this.data.config?.unit || ''],
            decimals: [this.data.config?.decimals ?? 1],
            // Chart/Table specific
            timeRange: [this.data.config?.timeRange || 'hour'],
            // Stat card specific
            aggregation: [this.data.config?.aggregation || 'average'],
            // Status indicator specific
            size: [this.data.config?.size || 'medium'],
            showLabel: [this.data.config?.showLabel !== false],
            // Table specific
            limit: [this.data.config?.limit ?? 10],
        });
    }

    private loadDevices(): void {
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
                error: () => {
                    this.loading = false;
                },
            });
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
                break;
            case DashboardWidgetType.LineChart:
                config.metricNames = formValue.metricName ? [formValue.metricName] : undefined;
                config.timeRange = formValue.timeRange;
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
}
