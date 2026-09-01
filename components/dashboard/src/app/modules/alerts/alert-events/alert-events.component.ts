import {
    Component,
    OnInit,
    AfterViewInit,
    Input,
    ViewChild,
    ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import {
    AlertService,
    AlertEvent,
    AlertEventStatus,
    AlertSeverity,
} from '../../../shared/services/alert/alert.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { finalize, forkJoin } from 'rxjs';

@Component({
    selector: 'app-alert-events',
    templateUrl: './alert-events.component.html',
    styleUrls: ['./alert-events.component.scss'],
    standalone: false,
})
export class AlertEventsComponent implements OnInit, AfterViewInit {
    @Input() deviceId?: string;
    @Input() ruleId?: string;

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    dataSource = new MatTableDataSource<AlertEvent>([]);
    loading = true;
    loadError = false;
    acknowledging = false;
    statusFilter: 'ALL' | AlertEventStatus = 'ALL';
    readonly statusOptions: Array<'ALL' | AlertEventStatus> = [
        'ALL',
        AlertEventStatus.TRIGGERED,
        AlertEventStatus.ACKNOWLEDGED,
        AlertEventStatus.RESOLVED,
    ];

    selection = new SelectionModel<AlertEvent>(true, []);

    displayedColumns: string[] = [
        'select',
        'status',
        'alertRule',
        'device',
        'triggeredValues',
        'triggeredAt',
        'actions',
    ];

    constructor(
        private alertService: AlertService,
        private route: ActivatedRoute,
        private authService: AuthService,
        private toast: ToastrService,
        private cdr: ChangeDetectorRef
    ) {}

    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    ngOnInit(): void {
        // Check route params if not provided as inputs
        if (!this.ruleId) {
            this.ruleId = this.route.snapshot.params['id'];
        }

        if (!this.deviceId) {
            this.deviceId = this.route.snapshot.params['deviceId'];
        }
        this.loadEvents();
    }

    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.dataSource.filterPredicate = (event) =>
            this.statusFilter === 'ALL' || event.status === this.statusFilter;
    }

    loadEvents(): void {
        this.loading = true;
        this.loadError = false;
        this.selection.clear();
        this.alertService
            .getAlertEvents(this.deviceId, this.ruleId)
            .pipe(
                finalize(() => {
                    this.loading = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe({
                next: (page) => {
                    this.dataSource.data = page.data;
                    this.applyStatusFilter();
                },
                error: (err) => {
                    console.error('Failed to load events:', err);
                    this.loadError = true;
                },
            });
    }

    onStatusFilterChange(): void {
        this.applyStatusFilter();
    }

    private applyStatusFilter(): void {
        // filterPredicate ignores the string value and reads statusFilter,
        // but MatTableDataSource only re-filters when `filter` changes, so
        // toggle it to force re-evaluation.
        this.dataSource.filter = `${this.statusFilter}:${Date.now()}`;
        this.selection.clear();
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    /** Rows currently visible under the active filter. */
    private get filteredData(): AlertEvent[] {
        return this.dataSource.filteredData;
    }

    /** Triggered rows that can still be acknowledged. */
    get acknowledgeable(): AlertEvent[] {
        return this.filteredData.filter(
            (e) => e.status === AlertEventStatus.TRIGGERED
        );
    }

    isAllSelected(): boolean {
        const target = this.acknowledgeable;
        return (
            target.length > 0 && target.every((e) => this.selection.isSelected(e))
        );
    }

    isSomeSelected(): boolean {
        return this.selection.selected.length > 0 && !this.isAllSelected();
    }

    toggleAll(): void {
        if (this.isAllSelected()) {
            this.selection.clear();
        } else {
            this.selection.select(...this.acknowledgeable);
        }
    }

    isSelectable(event: AlertEvent): boolean {
        return event.status === AlertEventStatus.TRIGGERED;
    }

    acknowledge(event: AlertEvent): void {
        this.alertService.acknowledgeAlertEvent(event.id).subscribe({
            next: (result) => {
                if (result.data?.acknowledgeAlertEvent) {
                    event.status = result.data.acknowledgeAlertEvent.status;
                    this.selection.deselect(event);
                    this.toast.showSuccess('Event acknowledged');
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Failed to acknowledge event:', err);
                this.toast.showError('Failed to acknowledge event');
            },
        });
    }

    acknowledgeSelected(): void {
        const selected = this.selection.selected.filter((e) =>
            this.isSelectable(e)
        );
        if (selected.length === 0) {
            return;
        }
        this.acknowledging = true;
        forkJoin(
            selected.map((e) => this.alertService.acknowledgeAlertEvent(e.id))
        )
            .pipe(
                finalize(() => {
                    this.acknowledging = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe({
                next: (results) => {
                    results.forEach((result, idx) => {
                        const acked = result.data?.acknowledgeAlertEvent;
                        if (acked) {
                            selected[idx].status = acked.status;
                        }
                    });
                    this.selection.clear();
                    this.toast.showSuccess(
                        `${selected.length} event(s) acknowledged`
                    );
                },
                error: (err) => {
                    console.error('Failed to acknowledge events:', err);
                    this.toast.showError('Failed to acknowledge some events');
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

    /** True when the event is still active (triggered) — used to highlight rows. */
    isActive(event: AlertEvent): boolean {
        return event.status === AlertEventStatus.TRIGGERED;
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
