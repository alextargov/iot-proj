import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { MaterialModule } from '../../../../shared/material.module';
import {
    WidgetConfigDialogComponent,
    WidgetConfigDialogData,
    WidgetConfigDialogResult,
} from './widget-config-dialog.component';
import { DeviceService } from '../../../../shared/services/device/device.service';
import { MetricsService } from '../../../../shared/services/metrics/metrics.service';
import { DashboardWidgetType } from '../../../../shared/graphql/generated';

describe('WidgetConfigDialogComponent', () => {
    let component: WidgetConfigDialogComponent;
    let fixture: ComponentFixture<WidgetConfigDialogComponent>;
    let metricsService: jasmine.SpyObj<MetricsService>;
    let dialogRef: jasmine.SpyObj<MatDialogRef<WidgetConfigDialogComponent>>;

    function configure(data: WidgetConfigDialogData) {
        metricsService = jasmine.createSpyObj<MetricsService>('MetricsService', [
            'getMetricsSeries',
        ]);
        metricsService.getMetricsSeries.and.returnValue(of([]));
        dialogRef = jasmine.createSpyObj<MatDialogRef<WidgetConfigDialogComponent>>('MatDialogRef', [
            'close',
        ]);

        return TestBed.configureTestingModule({
            declarations: [WidgetConfigDialogComponent],
            imports: [NoopAnimationsModule, MaterialModule],
            providers: [
                { provide: DeviceService, useValue: { getAllDevices: () => of([]) } },
                { provide: MetricsService, useValue: metricsService },
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: data },
            ],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false },
        }).compileComponents();
    }

    function create(data: WidgetConfigDialogData) {
        fixture = TestBed.createComponent(WidgetConfigDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('should create', async () => {
        await configure({ mode: 'create' });
        create({ mode: 'create' });
        expect(component).toBeTruthy();
    });

    it('loadMetricNames dedupes + sorts, and clears on empty device', async () => {
        await configure({ mode: 'create' });
        create({ mode: 'create' });

        metricsService.getMetricsSeries.and.returnValue(
            of([
                { metricName: 'temp' },
                { metricName: 'power' },
                { metricName: 'temp' },
            ] as any)
        );
        component.form.get('deviceId')?.setValue('d1');
        expect(component.metricNames).toEqual(['power', 'temp']);

        component.form.get('deviceId')?.setValue('');
        expect(component.metricNames).toEqual([]);
    });

    it('invalidates the form when gauge max <= min', async () => {
        await configure({ mode: 'create' });
        create({ mode: 'create' });

        component.form.patchValue({
            widgetType: DashboardWidgetType.Gauge,
            title: 'G',
            deviceId: 'd1',
            minValue: 10,
            maxValue: 5,
        });
        expect(component.hasMinMaxError).toBeTrue();
        expect(component.form.invalid).toBeTrue();

        component.form.patchValue({ maxValue: 20 });
        expect(component.hasMinMaxError).toBeFalse();
    });

    it('does not apply min<max validation to non-gauge types', async () => {
        await configure({ mode: 'create' });
        create({ mode: 'create' });

        component.form.patchValue({
            widgetType: DashboardWidgetType.Table,
            title: 'T',
            deviceId: 'd1',
            minValue: 10,
            maxValue: 5,
        });
        expect(component.hasMinMaxError).toBeFalse();
    });

    it('onSave includes cleaned thresholds for a gauge', async () => {
        await configure({ mode: 'create' });
        create({ mode: 'create' });

        component.form.patchValue({
            widgetType: DashboardWidgetType.Gauge,
            title: 'G',
            deviceId: 'd1',
            minValue: 0,
            maxValue: 100,
        });
        component.addThreshold();
        component.thresholds.at(0).patchValue({ value: 80, color: '#ff0000' });
        component.addThreshold(); // left incomplete -> should be filtered out

        component.onSave();

        expect(dialogRef.close).toHaveBeenCalled();
        const result: WidgetConfigDialogResult = dialogRef.close.calls.mostRecent().args[0];
        expect(result.config.thresholds).toEqual([{ value: 80, color: '#ff0000' }]);
    });

    it('onSave includes showLegend for a line chart', async () => {
        await configure({ mode: 'create' });
        create({ mode: 'create' });

        component.form.patchValue({
            widgetType: DashboardWidgetType.LineChart,
            title: 'L',
            deviceId: 'd1',
            showLegend: false,
        });

        component.onSave();

        const result: WidgetConfigDialogResult = dialogRef.close.calls.mostRecent().args[0];
        expect(result.config.showLegend).toBeFalse();
    });

    it('seeds thresholds + showLegend from config in edit mode', async () => {
        const data: WidgetConfigDialogData = {
            mode: 'edit',
            widgetType: DashboardWidgetType.Gauge,
            title: 'Edit me',
            config: {
                deviceId: 'd1',
                thresholds: [{ value: 50, color: '#00ff00' }],
                minValue: 0,
                maxValue: 100,
            },
        };
        await configure(data);
        create(data);

        expect(component.thresholds.length).toBe(1);
        expect(component.thresholds.at(0).value).toEqual({ value: 50, color: '#00ff00' });
    });
});
