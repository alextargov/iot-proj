import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ContentHeaderButton } from 'src/app/shared/components/content-header/content-header.component';
import { MatTableDataSource } from '@angular/material/table';
import {
    WidgetInfoFragment,
    WidgetStatus,
} from '../../../shared/graphql/generated';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { WidgetService } from '../../../shared/services/widget/widget.service';
import { WidgetDeleteComponent } from '../widget-delete/widget-delete.component';
import { formatSchedule } from '../../../shared/constants/schedule-presets';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { AuthService } from '../../../shared/services/auth/auth.service';

interface StatusConfig {
    icon: string;
    label: string;
    cssClass: string;
    tooltip: string;
}

@Component({
    standalone: false,
    selector: 'app-widgets',
    templateUrl: './widgets.component.html',
    styleUrls: ['./widgets.component.scss'],
})
export class WidgetsComponent implements OnInit {
    displayedColumns: string[] = [
        'name',
        'description',
        'schedule',
        'status',
        'createdAt',
        'actions',
    ];
    dataSource = new MatTableDataSource<WidgetInfoFragment>();
    public loading = true;
    public loadError = false;

    public formatSchedule = formatSchedule;

    public get buttons(): ContentHeaderButton[] {
        if (!this.canWrite) {
            return [];
        }
        return [
            {
                text: 'Import',
                icon: 'upload',
                action: this.onImportClick.bind(this),
                color: '',
            },
            {
                text: 'Create widget',
                icon: 'add',
                action: this.onAddClick.bind(this),
                color: 'primary',
            },
        ];
    }

    private readonly statusConfigs: Record<string, StatusConfig> = {
        [WidgetStatus.Active]: {
            icon: 'check_circle',
            label: 'Active',
            cssClass: 'status--active',
            tooltip: 'Widget is running',
        },
        [WidgetStatus.Inactive]: {
            icon: 'pause_circle',
            label: 'Inactive',
            cssClass: 'status--inactive',
            tooltip: 'Widget is not running',
        },
    };

    @ViewChild(MatPaginator) public paginator: MatPaginator;
    @ViewChild(MatSort) public sort: MatSort;
    @ViewChild('fileInput') public fileInput!: ElementRef<HTMLInputElement>;

    public ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    constructor(
        private widgetService: WidgetService,
        private router: Router,
        private dialog: MatDialog,
        private toast: ToastrService,
        private authService: AuthService
    ) {}

    /** Whether the current user may create/edit/delete widgets (OPERATOR+). */
    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    public ngOnInit(): void {
        this.dataSource.filterPredicate = (data: WidgetInfoFragment, filter: string) => {
            const searchStr = filter.toLowerCase();
            return (
                data.name.toLowerCase().includes(searchStr) ||
                (data.description?.toLowerCase().includes(searchStr) ?? false)
            );
        };

        this.loadWidgets();
    }

    public loadWidgets(): void {
        this.loading = true;
        this.loadError = false;
        this.widgetService.getAll().subscribe({
            next: (widgetList) => {
                this.dataSource.data = widgetList;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.loadError = true;
                this.toast.showError('Failed to load widgets');
            },
        });
    }

    public applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    public getStatusConfig(status: string): StatusConfig {
        return (
            this.statusConfigs[status] || {
                icon: 'help',
                label: 'Unknown',
                cssClass: 'status--unknown',
                tooltip: 'Unknown status',
            }
        );
    }

    public async onAddClick(): Promise<void> {
        await this.router.navigate(['widgets/create']);
    }

    public onDelete(widget: WidgetInfoFragment): void {
        const dialogRef = this.dialog.open(WidgetDeleteComponent, {
            data: {
                widget,
            },
        });

        dialogRef.afterClosed().subscribe((widgetToDelete) => {
            if (widgetToDelete) {
                this.widgetService.delete(widgetToDelete).subscribe({
                    next: () => {
                        this.dataSource.data = this.dataSource.data.filter(
                            (widget) => widget.id !== widgetToDelete
                        );
                        this.toast.showSuccess('Widget deleted');
                    },
                    error: () => this.toast.showError('Failed to delete widget'),
                });
            }
        });
    }

    public onDuplicate(widget: WidgetInfoFragment): void {
        this.widgetService.clone(widget.id).subscribe({
            next: (cloned) => {
                if (cloned) {
                    this.widgetService.getAll().subscribe((widgetList) => {
                        this.dataSource.data = widgetList;
                    });
                    this.toast.showSuccess(`Widget "${widget.name}" duplicated`);
                }
            },
            error: () => this.toast.showError('Failed to duplicate widget'),
        });
    }

    public async onEdit(widget: WidgetInfoFragment): Promise<void> {
        await this.router.navigate(['widgets', widget.id, 'edit']);
    }

    public onExport(widget: WidgetInfoFragment): void {
        const exportData = {
            name: widget.name,
            description: widget.description,
            status: widget.status,
            code: widget.code,
            workspace: widget.workspace,
            schedule: widget.schedule,
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${widget.name.toLowerCase().replace(/\s+/g, '-')}-widget.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.toast.showSuccess('Widget exported successfully');
    }

    public onImportClick(): void {
        this.fileInput.nativeElement.click();
    }

    public onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const content = JSON.parse(reader.result as string);

                if (!content.name || content.code === undefined) {
                    this.toast.showError(
                        'Invalid widget file: missing name or code'
                    );
                    input.value = '';
                    return;
                }

                const existingNames = this.dataSource.data.map((w) =>
                    w.name.toLowerCase()
                );
                let importName = content.name;
                if (existingNames.includes(importName.toLowerCase())) {
                    importName = `${content.name} (Imported)`;
                }

                // Imported widgets start inactive so they don't execute until reviewed.
                this.widgetService
                    .create({
                        name: importName,
                        description: content.description || undefined,
                        status: WidgetStatus.Inactive,
                        code: content.code,
                        workspace: content.workspace || '',
                        deviceIds: [],
                        schedule: content.schedule || undefined,
                    })
                    .subscribe({
                        next: () => {
                            this.widgetService.getAll().subscribe((widgetList) => {
                                this.dataSource.data = widgetList;
                            });
                            this.toast.showSuccess('Widget imported successfully');
                        },
                        error: (err) => {
                            console.error('Error importing widget:', err);
                            this.toast.showError('Failed to import widget');
                        },
                    });
            } catch (err) {
                console.error('Error parsing file:', err);
                this.toast.showError('Invalid JSON file');
            }

            input.value = '';
        };

        reader.readAsText(file);
    }
}
