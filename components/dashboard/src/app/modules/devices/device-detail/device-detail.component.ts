import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {finalize, Subject, takeUntil} from 'rxjs';
import { DeviceService, DeviceCertificate } from '../../../shared/services/device/device.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
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

    // Certificate management state. issuedCertificate is only populated right
    // after generation, since the private key is returned only once.
    public issuedCertificate: DeviceCertificate | null = null;
    public isCertBusy = false;

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
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
        private confirm: ConfirmDialogService,
        private toast: ToastrService
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

    /** Whether the current user may manage device certificates (OPERATOR+). */
    public get canManageCerts(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    public generateCertificate(): void {
        if (!this.deviceId || this.isCertBusy) {
            return;
        }
        this.isCertBusy = true;
        this.deviceService
            .generateDeviceCertificate(this.deviceId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.isCertBusy = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe({
                next: (cert) => {
                    this.issuedCertificate = cert;
                    this.loadDevice();
                },
                error: (err) => console.error('Failed to generate certificate:', err),
            });
    }

    public revokeCertificate(): void {
        if (!this.deviceId || this.isCertBusy) {
            return;
        }
        this.confirm
            .open({
                title: 'Revoke device certificate?',
                message:
                    'The device will immediately lose the ability to authenticate with this certificate. This cannot be undone — you will need to issue a new certificate to restore access.',
                confirmText: 'Revoke',
                confirmColor: 'warn',
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.isCertBusy = true;
                this.deviceService
                    .revokeDeviceCertificate(this.deviceId)
                    .pipe(
                        takeUntil(this.destroy$),
                        finalize(() => {
                            this.isCertBusy = false;
                            this.cdr.detectChanges();
                        })
                    )
                    .subscribe({
                        next: () => {
                            this.issuedCertificate = null;
                            this.toast.showSuccess('Certificate revoked');
                            this.loadDevice();
                        },
                        error: (err) => {
                            console.error('Failed to revoke certificate:', err);
                            this.toast.showError('Failed to revoke certificate');
                        },
                    });
            });
    }

    /** Triggers a browser download of the issued certificate + key bundle. */
    public downloadCertificate(): void {
        if (!this.issuedCertificate) {
            return;
        }
        const parts = [
            this.issuedCertificate.certificate,
            this.issuedCertificate.privateKey ?? '',
            this.issuedCertificate.caCertificate,
        ];
        const blob = new Blob([parts.join('\n')], { type: 'application/x-pem-file' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `device-${this.deviceId}-cert.pem`;
        link.click();
        URL.revokeObjectURL(url);
    }
}
