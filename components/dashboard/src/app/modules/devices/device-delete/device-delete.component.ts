import {Component, Inject, OnInit} from "@angular/core";
import {DeviceInfoFragment} from "../../../shared/graphql/generated";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

@Component({
    selector: 'device-delete',
    templateUrl: './device-delete.component.html',
    styleUrls: ['./device-delete.component.scss']
})
export class DeviceDeleteComponent implements OnInit {
    public device: DeviceInfoFragment;

    constructor(
        private dialogRef: MatDialogRef<DeviceDeleteComponent>,
        @Inject(MAT_DIALOG_DATA) data) {

        this.device = data.device;
    }

    ngOnInit() {

    }

    delete() {
        this.dialogRef.close(this.device.id);
    }

    close() {
        this.dialogRef.close();
    }
}
