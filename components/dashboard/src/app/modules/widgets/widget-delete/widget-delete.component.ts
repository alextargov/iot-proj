import { Component, Inject, OnInit } from '@angular/core'
import {DeviceInfoFragment, WidgetInfoFragment} from '../../../shared/graphql/generated'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

@Component({
    selector: 'widget-delete',
    templateUrl: './widget-delete.component.html',
    styleUrls: ['./widget-delete.component.scss'],
})
export class WidgetDeleteComponent implements OnInit {
    public widget: WidgetInfoFragment

    constructor(
        private dialogRef: MatDialogRef<WidgetDeleteComponent>,
        @Inject(MAT_DIALOG_DATA) data
    ) {
        this.widget = data.widget
    }

    ngOnInit() {}

    delete() {
        this.dialogRef.close(this.widget.id)
    }

    close() {
        this.dialogRef.close()
    }
}
