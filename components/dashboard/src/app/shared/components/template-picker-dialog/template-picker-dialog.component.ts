import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import {
    DASHBOARD_TEMPLATES,
    DashboardTemplate,
} from '../../templates/dashboard-templates';

/**
 * Lets the user pick a canned dashboard template (or Blank). Closes with the
 * chosen DashboardTemplate, or undefined on cancel.
 */
@Component({
    standalone: false,
    selector: 'app-template-picker-dialog',
    templateUrl: './template-picker-dialog.component.html',
    styleUrls: ['./template-picker-dialog.component.scss'],
})
export class TemplatePickerDialogComponent {
    public templates = DASHBOARD_TEMPLATES;
    public selected: DashboardTemplate = DASHBOARD_TEMPLATES[0];

    constructor(
        private dialogRef: MatDialogRef<TemplatePickerDialogComponent, DashboardTemplate | undefined>
    ) {}

    public select(template: DashboardTemplate): void {
        this.selected = template;
    }

    public isSelected(template: DashboardTemplate): boolean {
        return this.selected?.id === template.id;
    }

    public confirm(): void {
        this.dialogRef.close(this.selected);
    }

    public cancel(): void {
        this.dialogRef.close(undefined);
    }
}
