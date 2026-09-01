import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
    title: string;
    message: string;
    /** Confirm button label. Defaults to "Confirm". */
    confirmText?: string;
    /** Cancel button label. Defaults to "Cancel". */
    cancelText?: string;
    /** Material color for the confirm button. Use "warn" for destructive actions. */
    confirmColor?: 'primary' | 'accent' | 'warn';
    /**
     * When set, the user must type this exact string before the confirm button
     * enables. Use for high-risk destructive actions (e.g. the resource name).
     */
    requireTextConfirmation?: string;
}

@Component({
    standalone: false,
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.scss'],
})
export class ConfirmDialogComponent {
    public data: ConfirmDialogData;
    public typedConfirmation = '';

    constructor(
        private dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
        @Inject(MAT_DIALOG_DATA) data: ConfirmDialogData
    ) {
        this.data = {
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            confirmColor: 'primary',
            ...data,
        };
    }

    public get canConfirm(): boolean {
        if (!this.data.requireTextConfirmation) {
            return true;
        }
        return this.typedConfirmation === this.data.requireTextConfirmation;
    }

    public confirm(): void {
        if (this.canConfirm) {
            this.dialogRef.close(true);
        }
    }

    public cancel(): void {
        this.dialogRef.close(false);
    }
}
