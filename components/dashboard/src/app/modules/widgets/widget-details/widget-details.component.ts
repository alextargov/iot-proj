import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetService } from 'src/app/shared/services/widget/widget.service';
import { DeviceService } from 'src/app/shared/services/device/device.service';
import { ToastrService } from 'src/app/shared/services/toastr/toastr.service';
import { AuthService } from 'src/app/shared/services/auth/auth.service';
import { ConfirmDialogService } from 'src/app/shared/components/confirm-dialog/confirm-dialog.service';
import { WidgetInfoFragment } from 'src/app/shared/graphql/generated';

interface LinkedDevice {
    id: string;
    name: string;
}

@Component({
    standalone: false,
    selector: 'app-widget-details',
    templateUrl: './widget-details.component.html',
    styleUrls: ['./widget-details.component.scss'],
})
export class WidgetDetailsComponent implements OnInit, OnDestroy {
    public widget: WidgetInfoFragment | null = null;
    public linkedDevices: LinkedDevice[] = [];
    public loading = true;
    public loadError = false;

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private widgetService: WidgetService,
        private deviceService: DeviceService,
        private toast: ToastrService,
        private authService: AuthService,
        private confirm: ConfirmDialogService
    ) {}

    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    public ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.loadError = true;
            this.loading = false;
            return;
        }
        this.load(id);
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public load(id: string): void {
        this.loading = true;
        this.loadError = false;
        this.widgetService
            .getById(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (widget) => {
                    this.widget = widget;
                    this.loading = false;
                    if (!widget) {
                        this.loadError = true;
                        return;
                    }
                    this.resolveDeviceNames(widget.deviceIds ?? []);
                },
                error: () => {
                    this.loading = false;
                    this.loadError = true;
                },
            });
    }

    private resolveDeviceNames(ids: string[]): void {
        if (!ids.length) {
            this.linkedDevices = [];
            return;
        }
        // Resolve names from the full device list (single query) so the detail
        // page shows friendly names rather than raw UUIDs.
        this.deviceService
            .getAllDevices()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (devices) => {
                    const byId = new Map(devices.map((d) => [d.id, d.name]));
                    this.linkedDevices = ids.map((id) => ({
                        id,
                        name: byId.get(id) ?? id,
                    }));
                },
                error: () => {
                    this.linkedDevices = ids.map((id) => ({ id, name: id }));
                },
            });
    }

    public onEdit(): void {
        if (this.widget) {
            this.router.navigate(['widgets', this.widget.id, 'edit']);
        }
    }

    public onBack(): void {
        this.router.navigate(['widgets']);
    }

    public onDeviceClick(id: string): void {
        this.router.navigate(['devices', id]);
    }

    public onDelete(): void {
        if (!this.widget) {
            return;
        }
        const widget = this.widget;
        this.confirm
            .confirmDelete(widget.name, {
                message:
                    'Deleting this widget stops any scheduled runs and removes its code. This cannot be undone.',
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.widgetService.delete(widget.id).subscribe({
                    next: () => {
                        this.toast.showSuccess(`Widget "${widget.name}" deleted`);
                        this.router.navigate(['widgets']);
                    },
                    error: () => this.toast.showError('Failed to delete widget'),
                });
            });
    }
}
