import {
    Component,
    OnInit,
    AfterViewInit,
    Input,
    ViewChild,
    ChangeDetectorRef,
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';
import {
    AlertService,
    AlertRule,
    AlertSeverity,
} from '../../../shared/services/alert/alert.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';

@Component({
    selector: 'app-alerts-list',
    templateUrl: './alerts-list.component.html',
    styleUrls: ['./alerts-list.component.scss'],
    standalone: false,
})
export class AlertsListComponent implements OnInit, AfterViewInit {
    @Input() deviceId?: string;

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    public dataSource = new MatTableDataSource<AlertRule>([]);
    public alertsLoading = true;
    public loadError = false;
    public displayedColumns: string[] = [
        'name',
        'device',
        'severity',
        'enabled',
        'lastTriggered',
        'actions',
    ];

    constructor(
        private alertService: AlertService,
        private router: Router,
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
        private confirm: ConfirmDialogService,
        private toast: ToastrService
    ) {}

    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    ngOnInit(): void {
        this.loadAlerts();
    }

    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.dataSource.filterPredicate = (alert, filter) =>
            (alert.name ?? '').toLowerCase().includes(filter) ||
            (alert.device?.name ?? '').toLowerCase().includes(filter) ||
            (alert.severity ?? '').toLowerCase().includes(filter);
    }

    loadAlerts(): void {
        this.alertsLoading = true;
        this.loadError = false;
        this.alertService.getAlertRules(this.deviceId).subscribe({
            next: (page) => {
                this.dataSource.data = page.data;
                this.alertsLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load alerts:', err);
                this.alertsLoading = false;
                this.loadError = true;
                this.cdr.detectChanges();
            },
        });
    }

    applyFilter(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.dataSource.filter = value.trim().toLowerCase();
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    createAlert(): void {
        if (this.deviceId) {
            this.router.navigate(['/alerts/create'], {
                queryParams: { deviceId: this.deviceId },
            });
        } else {
            this.router.navigate(['/alerts/create']);
        }
    }

    editAlert(alert: AlertRule): void {
        this.router.navigate(['/alerts', alert.id, 'edit']);
    }

    viewEvents(alert: AlertRule): void {
        this.router.navigate(['/alerts', alert.id, alert.device.id, 'events']);
    }

    toggleEnabled(alert: AlertRule): void {
        this.alertService
            .updateAlertRule(alert.id, { enabled: !alert.enabled })
            .subscribe({
                next: () => {
                    alert.enabled = !alert.enabled;
                    this.toast.showSuccess(
                        `Alert ${alert.enabled ? 'enabled' : 'disabled'}`
                    );
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Failed to toggle alert:', err);
                    this.toast.showError('Failed to update alert');
                },
            });
    }

    deleteAlert(alert: AlertRule): void {
        this.confirm
            .confirmDelete(alert.name, {
                title: 'Delete alert rule?',
                message: `"${alert.name}" and its conditions will be permanently removed. You will stop receiving notifications from it.`,
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.alertService.deleteAlertRule(alert.id).subscribe({
                    next: () => {
                        this.dataSource.data = this.dataSource.data.filter(
                            (a) => a.id !== alert.id
                        );
                        this.toast.showSuccess('Alert rule deleted');
                        this.cdr.detectChanges();
                    },
                    error: (err) => {
                        console.error('Failed to delete alert:', err);
                        this.toast.showError('Failed to delete alert');
                    },
                });
            });
    }

    getSeverityColor(severity: AlertSeverity): string {
        return this.alertService.getSeverityColor(severity);
    }

    formatConditions(alert: AlertRule): string {
        if (!alert.conditions || alert.conditions.length === 0) {
            return 'No conditions';
        }

        return alert.conditions
            .map((group) => {
                const condStr = group.conditions
                    .map(
                        (c) =>
                            `${c.metricName} ${this.alertService.getOperatorDisplay(c.operator)} ${c.threshold}`
                    )
                    .join(' AND ');
                return `(${condStr})`;
            })
            .join(' OR ');
    }
}
