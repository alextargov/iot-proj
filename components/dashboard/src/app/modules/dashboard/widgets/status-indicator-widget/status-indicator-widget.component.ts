import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DeviceService } from '../../../../shared/services/device/device.service';
import { DeviceStatus } from '../../../../shared/graphql/generated';

@Component({
    standalone: false,
    selector: 'app-status-indicator-widget',
    templateUrl: './status-indicator-widget.component.html',
    styleUrls: ['./status-indicator-widget.component.scss'],
})
export class StatusIndicatorWidgetComponent implements OnInit, OnDestroy, OnChanges {
    @Input() deviceId: string;
    @Input() showLabel: boolean = true;
    @Input() size: 'small' | 'medium' | 'large' = 'medium';
    @Input() refreshInterval: number = 30000;

    deviceName: string = '';
    status: DeviceStatus | null = null;
    loading: boolean = true;
    error: string | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private deviceService: DeviceService,
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
        if (changes['deviceId'] && !changes['deviceId'].firstChange) {
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

        this.deviceService
            .getDevice(this.deviceId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (device) => {
                    if (device) {
                        this.deviceName = device.name;
                        this.status = device.status;
                    }
                    this.loading = false;
                    this.error = null;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.error = 'Failed to load device';
                    this.loading = false;
                    this.cdr.detectChanges();
                },
            });
    }

    get statusColor(): string {
        switch (this.status) {
            case DeviceStatus.Active:
                return '#4caf50';
            case DeviceStatus.Error:
                return '#f44336';
            case DeviceStatus.Unreachable:
                return '#ff9800';
            case DeviceStatus.Initial:
            default:
                return '#9e9e9e';
        }
    }

    get statusIcon(): string {
        switch (this.status) {
            case DeviceStatus.Active:
                return 'check_circle';
            case DeviceStatus.Error:
                return 'error';
            case DeviceStatus.Unreachable:
                return 'warning';
            case DeviceStatus.Initial:
            default:
                return 'radio_button_unchecked';
        }
    }

    get statusLabel(): string {
        return this.status?.replace('_', ' ') || 'Unknown';
    }

    get sizeClass(): string {
        return this.size;
    }
}
