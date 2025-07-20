import { Component, Inject, OnInit } from '@angular/core'
import {DataModelInfoFragment, DeviceInfoFragment} from '../../../shared/graphql/generated'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

@Component({
    selector: 'device-delete',
    templateUrl: './datamodel-delete.component.html',
    styleUrls: ['./datamodel-delete.component.scss'],
})
export class DataModelDeleteComponent implements OnInit {
    public dataModel: DataModelInfoFragment

    constructor(
        private dialogRef: MatDialogRef<DataModelDeleteComponent>,
        @Inject(MAT_DIALOG_DATA) data
    ) {
        this.dataModel = data.dataModel
    }

    ngOnInit() {}

    delete() {
        this.dialogRef.close(this.dataModel.id)
    }

    close() {
        this.dialogRef.close()
    }
}
