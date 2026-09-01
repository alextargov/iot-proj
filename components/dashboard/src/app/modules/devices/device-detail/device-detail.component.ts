import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {finalize, Subject, takeUntil} from 'rxjs';
import { DeviceService, DeviceCertificate } from '../../../shared/services/device/device.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import {
    DeviceInfoFragment,
    OperationType,
} from '../../../shared/graphql/generated';
import {
    getDeviceStatusConfig,
    StatusConfig,
} from '../../../shared/utils/status-config.utils';

@Component({
    standalone: false,
    selector: 'app-device-detail',
    templateUrl: './device-detail.component.html',
    styleUrls: ['./device-detail.component.scss'],
})
export class DeviceDetailComponent implements OnInit, OnDestroy {
    public device: DeviceInfoFragment | null = null;
    public isLoading = true;
    public loadError = false;
    public deviceId: string = '';

    /** In-flight device operation (TURN_ON/TURN_OFF), null when idle. */
    public pendingOperation: OperationType | null = null;

    // Certificate management state. issuedCertificate is only populated right
    // after generation, since the private key is returned only once.
    public issuedCertificate: DeviceCertificate | null = null;
    public isCertBusy = false;

    public readonly operationType = OperationType;

    private readonly destroy$ = new Subject<void>();

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
            this.subscribeToStatus();
        } else {
            this.router.navigate(['/devices']);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public loadDevice(): void {
        this.isLoading = true;
        this.loadError = false;
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
                this.loadError = true;
            }
        });
    }

    /** Keep the displayed status in sync with real-time server events. */
    private subscribeToStatus(): void {
        this.deviceService
            .subscribeToDeviceStatus(this.deviceId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (evt) => {
                    if (this.device && evt.deviceId === this.deviceId) {
                        this.device = { ...this.device, status: evt.status };
                        this.cdr.detectChanges();
                    }
                },
                error: (err) =>
                    console.error('Device status subscription error:', err),
            });
    }

    public getStatusConfig(status: string): StatusConfig {
        return getDeviceStatusConfig(status);
    }

    public goBack(): void {
        this.router.navigate(['/devices']);
    }

    /** Whether the current user may manage device certificates (OPERATOR+). */
    public get canManageCerts(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    /** True when the device can accept operations and the user may send them. */
    public get canSendOperations(): boolean {
        return (
            this.canManageCerts &&
            !!(this.device?.host?.turnOnEndpoint || this.device?.host?.turnOffEndpoint)
        );
    }

    /** Send a TURN_ON / TURN_OFF operation to the device. */
    public sendOperation(op: OperationType): void {
        if (!this.deviceId || this.pendingOperation) {
            return;
        }
        this.pendingOperation = op;
        const label = op === OperationType.TurnOn ? 'Turn on' : 'Turn off';
        this.deviceService
            .setDeviceOperation(this.deviceId, op)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.pendingOperation = null;
                    this.cdr.detectChanges();
                })
            )
            .subscribe({
                next: (device) => {
                    if (device) {
                        this.device = device;
                    }
                    this.toast.showSuccess(`${label} command sent`);
                },
                error: (err) => {
                    console.error(`Failed to ${label.toLowerCase()} device:`, err);
                    this.toast.showError(`Failed to send ${label.toLowerCase()} command`);
                },
            });
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
