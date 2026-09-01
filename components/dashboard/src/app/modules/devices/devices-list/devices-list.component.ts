// connect device with the app - like CMP

import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DeviceService } from 'src/app/shared/services/device/device.service';
import { ContentHeaderButton } from '../../../shared/components/content-header/content-header.component';
import { Router } from '@angular/router';
import { DeviceInfoFragment } from 'src/app/shared/graphql/generated';
import { MatDialog } from '@angular/material/dialog';
import { DeviceDeleteComponent } from '../device-delete/device-delete.component';
import { getDeviceStatusConfig, StatusConfig } from 'src/app/shared/utils/status-config.utils';
import { AuthService } from 'src/app/shared/services/auth/auth.service';
import { ToastrService } from 'src/app/shared/services/toastr/toastr.service';

@Component({
    standalone: false,
    selector: 'app-devices-list',
    templateUrl: './devices-list.component.html',
    styleUrls: ['./devices-list.component.scss'],
})
export class DevicesListComponent implements OnInit, AfterViewInit, OnDestroy {
    displayedColumns: string[] = [
        'name',
        'description',
        'tags',
        'status',
        'actions',
    ];
    dataSource = new MatTableDataSource<DeviceInfoFragment>();
    activeTagFilter: string | null = null;
    /** All distinct tags in use across the tenant's devices (server-sourced). */
    public availableTags: string[] = [];
    /** Human-readable search term for the empty-results message. */
    public searchTerm = '';
    public loading = true;
    public loadError = false;
    private searchFilter: string = '';
    private destroy$ = new Subject<void>();

    public buttons: ContentHeaderButton[] = [];

    @ViewChild(MatPaginator) public paginator: MatPaginator;
    @ViewChild('fileInput') public fileInput!: ElementRef<HTMLInputElement>;

    public ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    constructor(
        private deviceService: DeviceService,
        private router: Router,
        private dialog: MatDialog,
        private authService: AuthService,
        private toast: ToastrService
    ) {}

    /** Whether the current user may perform write operations (OPERATOR+). */
    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    public ngOnInit(): void {
        if (this.canWrite) {
            this.buttons = [
                {
                    text: 'Import',
                    icon: 'upload',
                    action: this.onImportClick.bind(this),
                    color: '',
                },
                {
                    text: 'Create device',
                    icon: 'add',
                    action: this.onAddClick.bind(this),
                    color: 'primary',
                },
            ];
        }

        this.dataSource.filterPredicate = (data: DeviceInfoFragment, filter: string) => {
            // Parse the combined filter
            const { search, tag } = JSON.parse(filter || '{}');

            // Check tag filter first
            if (tag && !data.tags?.includes(tag)) {
                return false;
            }

            // Then check search filter
            if (search) {
                const searchStr = search.toLowerCase();
                return (
                    data.name.toLowerCase().includes(searchStr) ||
                    (data.description?.toLowerCase().includes(searchStr) ?? false) ||
                    (data.tags?.some(t => t.toLowerCase().includes(searchStr)) ?? false)
                );
            }

            return true;
        };

        this.loading = true;
        this.loadError = false;
        this.deviceService.getAllDevices().subscribe({
            next: (deviceList) => {
                this.dataSource.data = deviceList;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.loadError = true;
                this.toast.showError('Failed to load devices');
            },
        });

        this.deviceService.getDeviceTags().subscribe((tags) => {
            this.availableTags = tags;
        });

        // Live status: update the matching device's badge as status changes
        // arrive (wildcard subscription covers all devices in the list).
        this.deviceService
            .subscribeToDeviceStatus()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (event) => {
                    const rows = this.dataSource.data;
                    const idx = rows.findIndex((d) => d.id === event.deviceId);
                    if (idx !== -1) {
                        rows[idx] = { ...rows[idx], status: event.status };
                        this.dataSource.data = [...rows];
                    }
                },
                error: () => {
                    /* non-fatal; list still loads via query */
                },
            });
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private applyFilters(): void {
        this.dataSource.filter = JSON.stringify({
            search: this.searchFilter,
            tag: this.activeTagFilter,
        });

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    public applyFilter(event: Event): void {
        const raw = (event.target as HTMLInputElement).value.trim();
        this.searchTerm = raw;
        this.searchFilter = raw.toLowerCase();
        this.applyFilters();
    }

    public filterByTag(tag: string, event: Event): void {
        event.stopPropagation();
        this.activeTagFilter = tag;
        this.applyFilters();
    }

    /**
     * Selects a tag from the dropdown. Uses the same client-side combined
     * predicate as the text search so the two filters compose instead of one
     * clobbering the other.
     */
    public selectTagFilter(tag: string | null): void {
        this.activeTagFilter = tag;
        this.applyFilters();
    }

    public clearTagFilter(): void {
        this.activeTagFilter = null;
        this.applyFilters();
    }

    public getStatusConfig(status: string): StatusConfig {
        return getDeviceStatusConfig(status);
    }

    public async onAddClick(): Promise<void> {
        await this.router.navigate(['devices/create']);
    }

    public onDelete(device: DeviceInfoFragment): void {
        const dialogRef = this.dialog.open(DeviceDeleteComponent, {
            data: {
                device,
            },
        });

        dialogRef.afterClosed().subscribe((deviceToDelete) => {
            if (deviceToDelete) {
                this.deviceService.deleteDevice(deviceToDelete).subscribe({
                    next: () => {
                        this.dataSource.data = this.dataSource.data.filter(
                            (device) => device.id !== deviceToDelete
                        );
                        this.toast.showSuccess('Device deleted');
                    },
                    error: () => this.toast.showError('Failed to delete device'),
                });
            }
        });
    }

    public onDuplicate(device: DeviceInfoFragment): void {
        this.deviceService.cloneDevice(device.id).subscribe({
            next: (cloned) => {
                if (cloned) {
                    this.deviceService.getAllDevices().subscribe((deviceList) => {
                        this.dataSource.data = deviceList;
                    });
                    this.toast.showSuccess(`Device "${device.name}" duplicated`);
                }
            },
            error: () => this.toast.showError('Failed to duplicate device'),
        });
    }

    public onExport(device: DeviceInfoFragment): void {
        // Auth credentials are intentionally omitted from the export to avoid
        // leaking secrets in plaintext JSON. Import re-creates the device
        // without credentials, which can be re-added afterwards.
        const exportData = {
            name: device.name,
            description: device.description,
            status: device.status,
            tags: device.tags,
            host: device.host
                ? {
                      url: device.host.url,
                      turnOnEndpoint: device.host.turnOnEndpoint,
                      turnOffEndpoint: device.host.turnOffEndpoint,
                  }
                : null,
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${device.name.toLowerCase().replace(/\s+/g, '-')}-device.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.toast.showSuccess('Device exported successfully');
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

                if (!content.name) {
                    this.toast.showError('Invalid device file: missing name');
                    input.value = '';
                    return;
                }

                const existingNames = this.dataSource.data.map((d) =>
                    d.name.toLowerCase()
                );
                let importName = content.name;
                if (existingNames.includes(importName.toLowerCase())) {
                    importName = `${content.name} (Imported)`;
                }

                const createInput: any = {
                    name: importName,
                    description: content.description || undefined,
                    status: content.status || 'INITIAL',
                    tags: content.tags || [],
                    dataModel: '',
                };
                if (content.host?.url) {
                    createInput.host = {
                        url: content.host.url,
                        turnOnEndpoint: content.host.turnOnEndpoint,
                        turnOffEndpoint: content.host.turnOffEndpoint,
                    };
                }

                this.deviceService.createDevice(createInput).subscribe({
                    next: (result) => {
                        if (result.data?.createDevice) {
                            this.dataSource.data = [
                                ...this.dataSource.data,
                                result.data.createDevice as DeviceInfoFragment,
                            ];
                        }
                        this.toast.showSuccess('Device imported successfully');
                    },
                    error: (err) => {
                        console.error('Error importing device:', err);
                        this.toast.showError('Failed to import device');
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

    public onRowClick(device: DeviceInfoFragment): void {
        this.router.navigate(['devices', device.id]);
    }

    public onEdit(device: DeviceInfoFragment): void {
        this.router.navigate(['devices', device.id]);
    }
}
