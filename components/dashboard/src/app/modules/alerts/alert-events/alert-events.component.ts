import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    AlertService,
    AlertEvent,
    AlertEventStatus,
    AlertSeverity,
} from '../../../shared/services/alert/alert.service';

@Component({
    selector: 'app-alert-events',
    templateUrl: './alert-events.component.html',
    styleUrls: ['./alert-events.component.scss'],
    standalone: false,
})
export class AlertEventsComponent implements OnInit {
    @Input() deviceId?: string;
    @Input() ruleId?: string;

    events: AlertEvent[] = [];
    loading = true;
    displayedColumns: string[] = [
        'status',
        'alertRule',
        'device',
        'triggeredValues',
        'triggeredAt',
        'actions',
    ];

    constructor(
        private alertService: AlertService,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        // Check route params if not provided as inputs
        if (!this.ruleId) {
            this.ruleId = this.route.snapshot.params['id'];
        }
        this.loadEvents();
    }

    loadEvents(): void {
        this.loading = true;
        this.alertService
            .getAlertEvents(this.deviceId, this.ruleId)
            .subscribe({
                next: (page) => {
                    this.events = page.data;
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Failed to load events:', err);
                    this.loading = false;
                },
            });
    }

    acknowledge(event: AlertEvent): void {
        this.alertService.acknowledgeAlertEvent(event.id).subscribe({
            next: (result) => {
                if (result.data?.acknowledgeAlertEvent) {
                    event.status = result.data.acknowledgeAlertEvent.status;
                }
            },
            error: (err) => {
                console.error('Failed to acknowledge event:', err);
            },
        });
    }

    getStatusIcon(status: AlertEventStatus): string {
        switch (status) {
            case AlertEventStatus.TRIGGERED:
                return 'error';
            case AlertEventStatus.RESOLVED:
                return 'check_circle';
            case AlertEventStatus.ACKNOWLEDGED:
                return 'done';
            default:
                return 'help';
        }
    }

    getStatusColor(status: AlertEventStatus): string {
        switch (status) {
            case AlertEventStatus.TRIGGERED:
                return 'warn';
            case AlertEventStatus.RESOLVED:
                return 'primary';
            case AlertEventStatus.ACKNOWLEDGED:
                return 'accent';
            default:
                return '';
        }
    }

    getSeverityColor(severity: AlertSeverity): string {
        return this.alertService.getSeverityColor(severity);
    }

    parseTriggeredValues(values: string): { [key: string]: number } {
        try {
            return JSON.parse(values);
        } catch {
            return {};
        }
    }

    formatTriggeredValues(values: string): string {
        const parsed = this.parseTriggeredValues(values);
        return Object.entries(parsed)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }
}
