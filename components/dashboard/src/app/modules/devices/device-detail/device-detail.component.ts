import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
export class DeviceDetailComponent implements OnInit {
    public device: DeviceInfoFragment | null = null;
    public isLoading = true;
    public deviceId: string = '';

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
        private deviceService: DeviceService
    ) {}

    ngOnInit(): void {
        this.deviceId = this.route.snapshot.paramMap.get('id') || '';
        if (this.deviceId) {
            this.loadDevice();
        } else {
            this.router.navigate(['/devices']);
        }
    }

    private loadDevice(): void {
        this.isLoading = true;
        this.deviceService.getDevice(this.deviceId).subscribe({
            next: (device) => {
                this.device = device;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load device:', err);
                this.isLoading = false;
                this.router.navigate(['/devices']);
            },
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
