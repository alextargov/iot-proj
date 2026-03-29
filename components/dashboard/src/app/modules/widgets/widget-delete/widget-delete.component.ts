import { Component, Inject } from '@angular/core';
import { WidgetInfoFragment } from '../../../shared/graphql/generated';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    standalone: false,
    selector: 'app-widget-delete',
    templateUrl: './widget-delete.component.html',
    styleUrls: ['./widget-delete.component.scss'],
})
export class WidgetDeleteComponent {
    public widget: WidgetInfoFragment;

    constructor(
        private dialogRef: MatDialogRef<WidgetDeleteComponent>,
        @Inject(MAT_DIALOG_DATA) data
    ) {
        this.widget = data.widget;
    }

    delete() {
        this.dialogRef.close(this.widget.id);
    }

    close() {
        this.dialogRef.close();
    }
}
