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
    public confirmName = '';

    constructor(
        private dialogRef: MatDialogRef<DeviceDeleteComponent>,
        @Inject(MAT_DIALOG_DATA) data
    ) {
        this.device = data.device;
    }

    /** True once the typed name exactly matches the device name. */
    public get nameMatches(): boolean {
        return this.confirmName.trim() === this.device.name;
    }

    delete() {
        if (!this.nameMatches) {
            return;
        }
        this.dialogRef.close(this.device.id);
    }

    close() {
        this.dialogRef.close();
    }
}
