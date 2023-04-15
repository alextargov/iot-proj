// connect device with the app - like CMP

import { Component, OnInit, ViewChild } from '@angular/core'
import { MatPaginator } from '@angular/material/paginator'
import { MatTableDataSource } from '@angular/material/table'
import {
    DeviceStatus,
    IDevice,
} from 'src/app/shared/services/device/device.interface'
import { DeviceService } from 'src/app/shared/services/device/device.service'
import { ContentHeaderButton } from '../../../shared/components/content-header/content-header.component'
import { Router } from '@angular/router'
import { DeviceInfoFragment } from 'src/app/shared/graphql/generated'
import { MatDialog } from '@angular/material/dialog'
import { DeviceDeleteComponent } from '../device-delete/device-delete.component'

@Component({
    selector: 'app-devices-list',
    templateUrl: './devices-list.component.html',
    styleUrls: ['./devices-list.component.scss'],
})
export class DevicesListComponent implements OnInit {
    displayedColumns: string[] = [
        'name',
        'description',
        'url',
        'isRunning',
        'createdAt',
        'actions',
    ]
    dataSource = new MatTableDataSource<DeviceInfoFragment>()

    public buttons: ContentHeaderButton[] = [
        {
            text: 'Create device',
            icon: 'add',
            action: this.onAddClick.bind(this),
            color: 'primary',
        },
    ]

    @ViewChild(MatPaginator) public paginator: MatPaginator

    public ngAfterViewInit() {
        this.dataSource.paginator = this.paginator
    }

    constructor(
        private deviceService: DeviceService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    public ngOnInit(): void {
        this.deviceService.getAllDevices().subscribe((deviceList) => {
            console.log('ngOnInit')

            this.dataSource.data = deviceList
        })
    }

    public getStatus(status: DeviceStatus) {
        if (status === DeviceStatus.ACTIVE) {
            return 'check_circle'
        } else if (status === DeviceStatus.ERROR) {
            return 'error'
        } else if (
            status === DeviceStatus.INITIAL ||
            status === DeviceStatus.UNREACHABLE
        ) {
            return 'circle'
        }
    }

    public async onAddClick(): Promise<void> {
        try {
            await this.router.navigate(['devices/create'])
        } catch (e) {
            console.log(e)
        }
    }

    public onDelete(device: DeviceInfoFragment): void {
        const dialogRef = this.dialog.open(DeviceDeleteComponent, {
            data: {
                device,
            },
        })

        dialogRef.afterClosed().subscribe((deviceToDelete) => {
            if (deviceToDelete) {
                this.deviceService
                    .deleteDevice(deviceToDelete)
                    .subscribe((res) => {
                        this.dataSource.data = this.dataSource.data.filter(
                            (device) => device.id !== deviceToDelete
                        )
                    })
            }
        })
    }
}
