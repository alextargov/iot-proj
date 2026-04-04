// connect device with the app - like CMP

import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { DeviceService } from 'src/app/shared/services/device/device.service';
import { ContentHeaderButton } from '../../../shared/components/content-header/content-header.component';
import { Router } from '@angular/router';
import { DeviceInfoFragment, DeviceStatus } from 'src/app/shared/graphql/generated';
import { MatDialog } from '@angular/material/dialog';
import { DeviceDeleteComponent } from '../device-delete/device-delete.component';

interface StatusConfig {
    icon: string;
    label: string;
    cssClass: string;
    tooltip: string;
}

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
        'url',
        'status',
        'createdAt',
        'actions',
    ];
    dataSource = new MatTableDataSource<DeviceInfoFragment>();
    activeTagFilter: string | null = null;
    private searchFilter: string = '';

    public buttons: ContentHeaderButton[] = [
        {
            text: 'Create device',
            icon: 'add',
            action: this.onAddClick.bind(this),
            color: 'primary',
        },
    ];

    private readonly statusConfigs: Record<string, StatusConfig> = {
        [DeviceStatus.Active]: {
            icon: 'check_circle',
            label: 'Active',
            cssClass: 'status--active',
            tooltip: 'Device is online and operational',
        },
        [DeviceStatus.Initial]: {
            icon: 'hourglass_empty',
            label: 'Initial',
            cssClass: 'status--initial',
            tooltip: 'Device is initializing',
        },
        [DeviceStatus.Error]: {
            icon: 'error',
            label: 'Error',
            cssClass: 'status--error',
            tooltip: 'Device encountered an error',
        },
        [DeviceStatus.Unreachable]: {
            icon: 'cloud_off',
            label: 'Unreachable',
            cssClass: 'status--unreachable',
            tooltip: 'Device is not reachable',
        },
    };

    @ViewChild(MatPaginator) public paginator: MatPaginator;

    public ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    constructor(
        private deviceService: DeviceService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    public ngOnInit(): void {
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
