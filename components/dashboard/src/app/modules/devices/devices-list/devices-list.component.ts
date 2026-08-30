// connect device with the app - like CMP

import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { DeviceService } from 'src/app/shared/services/device/device.service';
import { ContentHeaderButton } from '../../../shared/components/content-header/content-header.component';
import { Router } from '@angular/router';
import { DeviceInfoFragment } from 'src/app/shared/graphql/generated';
import { MatDialog } from '@angular/material/dialog';
import { DeviceDeleteComponent } from '../device-delete/device-delete.component';
import { getDeviceStatusConfig, StatusConfig } from 'src/app/shared/utils/status-config.utils';
import { AuthService } from 'src/app/shared/services/auth/auth.service';

@Component({
    standalone: false,
    selector: 'app-devices-list',
    templateUrl: './devices-list.component.html',
    styleUrls: ['./devices-list.component.scss'],
})
export class DevicesListComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = [
        'name',
        'description',
        'tags',
        'status',
        'actions',
    ];
    dataSource = new MatTableDataSource<DeviceInfoFragment>();
    activeTagFilter: string | null = null;
    private searchFilter: string = '';

    public buttons: ContentHeaderButton[] = [];

    @ViewChild(MatPaginator) public paginator: MatPaginator;

    public ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    constructor(
        private deviceService: DeviceService,
        private router: Router,
        private dialog: MatDialog,
        private authService: AuthService
    ) {}

    /** Whether the current user may perform write operations (OPERATOR+). */
    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    public ngOnInit(): void {
        if (this.canWrite) {
            this.buttons = [
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

        this.deviceService.getAllDevices().subscribe((deviceList) => {
            this.dataSource.data = deviceList;
        });
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
        this.searchFilter = (event.target as HTMLInputElement).value.trim().toLowerCase();
        this.applyFilters();
    }

    public filterByTag(tag: string, event: Event): void {
        event.stopPropagation();
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
        try {
            await this.router.navigate(['devices/create']);
        } catch (e) {
            console.log(e);
        }
    }

    public onDelete(device: DeviceInfoFragment): void {
        const dialogRef = this.dialog.open(DeviceDeleteComponent, {
            data: {
                device,
            },
        });

        dialogRef.afterClosed().subscribe((deviceToDelete) => {
            if (deviceToDelete) {
                this.deviceService
                    .deleteDevice(deviceToDelete)
                    .subscribe((res) => {
                        this.dataSource.data = this.dataSource.data.filter(
                            (device) => device.id !== deviceToDelete
                        );
                    });
            }
        });
    }

    public onDuplicate(device: DeviceInfoFragment): void {
        this.router.navigate(['devices/create'], {
            state: {
                duplicate: {
                    name: `${device.name} (Copy)`,
                    description: device.description,
                    host: device.host,
                    tags: device.tags,
                },
            },
        });
    }

    public onRowClick(device: DeviceInfoFragment): void {
        this.router.navigate(['devices', device.id]);
    }
}
