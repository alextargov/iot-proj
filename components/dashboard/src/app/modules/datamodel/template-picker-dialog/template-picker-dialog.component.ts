import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SchemaTemplate, SCHEMA_TEMPLATES } from '../schema-templates';

@Component({
    standalone: false,
    selector: 'app-template-picker-dialog',
    templateUrl: './template-picker-dialog.component.html',
    styleUrls: ['./template-picker-dialog.component.scss'],
})
export class TemplatePickerDialogComponent {
    templates = SCHEMA_TEMPLATES;
    selectedTemplate: SchemaTemplate | null = null;

    constructor(private dialogRef: MatDialogRef<TemplatePickerDialogComponent>) {}

    selectTemplate(template: SchemaTemplate | null): void {
        this.selectedTemplate = template;
    }

    confirm(): void {
        this.dialogRef.close(this.selectedTemplate);
    }

    cancel(): void {
        this.dialogRef.close(undefined);
    }
}
