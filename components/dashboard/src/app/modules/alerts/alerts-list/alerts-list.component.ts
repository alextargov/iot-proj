import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import {
    AlertService,
    AlertRule,
    AlertSeverity,
} from '../../../shared/services/alert/alert.service';

@Component({
    selector: 'app-alerts-list',
    templateUrl: './alerts-list.component.html',
    styleUrls: ['./alerts-list.component.scss'],
    standalone: false,
})
export class AlertsListComponent implements OnInit {
    @Input() deviceId?: string;

    public alerts: AlertRule[] = [];
    public alertsLoading = true;
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
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadAlerts();
    }

    loadAlerts(): void {
        this.alertsLoading = true;
        this.alertService.getAlertRules(this.deviceId).subscribe({
            next: (page) => {
                this.alerts = page.data;
                this.alertsLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load alerts:', err);
                this.alertsLoading = false;
                this.cdr.detectChanges();
            },
        });
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
        this.router.navigate(['/alerts', alert.id, 'events']);
    }

    toggleEnabled(alert: AlertRule): void {
        this.alertService
            .updateAlertRule(alert.id, { enabled: !alert.enabled })
            .subscribe({
                next: () => {
                    alert.enabled = !alert.enabled;
                },
                error: (err) => {
                    console.error('Failed to toggle alert:', err);
                },
            });
    }

    deleteAlert(alert: AlertRule): void {
        if (confirm(`Are you sure you want to delete alert "${alert.name}"?`)) {
            this.alertService.deleteAlertRule(alert.id).subscribe({
                next: () => {
                    this.alerts = this.alerts.filter((a) => a.id !== alert.id);
                },
                error: (err) => {
                    console.error('Failed to delete alert:', err);
                },
            });
        }
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
