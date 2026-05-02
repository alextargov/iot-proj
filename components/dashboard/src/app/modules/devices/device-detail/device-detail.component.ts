import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {finalize, Subject, takeUntil} from 'rxjs';
import { DeviceService } from '../../../shared/services/device/device.service';
import {
    DeviceInfoFragment,
    DeviceStatus,
} from '../../../shared/graphql/generated';

interface StatusConfig {
    icon: string;
    label: string;
    cssClass: string;
}

@Component({
    standalone: false,
    selector: 'app-device-detail',
    templateUrl: './device-detail.component.html',
    styleUrls: ['./device-detail.component.scss'],
})
export class DeviceDetailComponent implements OnInit, OnDestroy {
    public device: DeviceInfoFragment | null = null;
    public isLoading = true;
    public deviceId: string = '';

    private readonly destroy$ = new Subject<void>();

    private readonly statusConfigs: Record<string, StatusConfig> = {
        [DeviceStatus.Active]: {
            icon: 'check_circle',
            label: 'Active',
            cssClass: 'status--active',
        },
        [DeviceStatus.Error]: {
            icon: 'error',
            label: 'Error',
            cssClass: 'status--error',
        },
        [DeviceStatus.Unreachable]: {
            icon: 'signal_disconnected',
            label: 'Unreachable',
            cssClass: 'status--unreachable',
        },
        [DeviceStatus.Initial]: {
            icon: 'hourglass_empty',
            label: 'Initial',
            cssClass: 'status--initial',
        },
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private deviceService: DeviceService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.deviceId = this.route.snapshot.paramMap.get('id') || '';
        if (this.deviceId) {
            this.loadDevice();
        } else {
            this.router.navigate(['/devices']);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadDevice(): void {
        this.isLoading = true;
        this.deviceService.getDevice(this.deviceId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.cdr.detectChanges()
                })
            )
            .subscribe({
            next: (device) => {
                this.device = device;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load device:', err);
                this.isLoading = false;
                this.router.navigate(['/devices']);
            }
        });
    }

    public getStatusConfig(status: string): StatusConfig {
        return (
            this.statusConfigs[status] || {
                icon: 'help',
                label: 'Unknown',
                cssClass: 'status--unknown',
            }
        );
    }

    public goBack(): void {
        this.router.navigate(['/devices']);
    }
}
