import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PromptDialogData {
    title: string;
    label: string;
    value?: string;
    confirmText?: string;
    cancelText?: string;
    /** Max length for the input; defaults to 256 (matches dashboard name column). */
    maxLength?: number;
}

/**
 * Minimal single-text-input dialog. Closes with the trimmed string on confirm,
 * or undefined on cancel. Used for e.g. renaming a dashboard.
 */
@Component({
    standalone: false,
    selector: 'app-prompt-dialog',
    templateUrl: './prompt-dialog.component.html',
    styleUrls: ['./prompt-dialog.component.scss'],
})
export class PromptDialogComponent {
    public data: PromptDialogData;
    public value: string;

    constructor(
        private dialogRef: MatDialogRef<PromptDialogComponent, string | undefined>,
        @Inject(MAT_DIALOG_DATA) data: PromptDialogData
    ) {
        this.data = {
            confirmText: 'Save',
            cancelText: 'Cancel',
            maxLength: 256,
            ...data,
        };
        this.value = data.value ?? '';
    }

    public get canConfirm(): boolean {
        return this.value.trim().length > 0;
    }

    public confirm(): void {
        if (this.canConfirm) {
            this.dialogRef.close(this.value.trim());
        }
    }

    public cancel(): void {
        this.dialogRef.close(undefined);
    }
}
