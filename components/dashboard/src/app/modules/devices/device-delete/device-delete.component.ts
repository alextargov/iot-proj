import { Component, Inject } from '@angular/core';
import { DeviceInfoFragment } from '../../../shared/graphql/generated';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    standalone: false,
    selector: 'app-device-delete',
    templateUrl: './device-delete.component.html',
    styleUrls: ['./device-delete.component.scss'],
})
export class DeviceDeleteComponent {
    public device: DeviceInfoFragment;

    constructor(
        private dialogRef: MatDialogRef<DeviceDeleteComponent>,
        @Inject(MAT_DIALOG_DATA) data
    ) {
        this.device = data.device;
    }

    delete() {
        this.dialogRef.close(this.device.id);
    }

    close() {
        this.dialogRef.close();
    }
}
