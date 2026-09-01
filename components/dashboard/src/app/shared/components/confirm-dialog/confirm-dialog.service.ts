import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ConfirmDialogComponent,
    ConfirmDialogData,
} from './confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    constructor(private dialog: MatDialog) {}

    /** Opens a confirm dialog. Emits true when confirmed, false otherwise. */
    public open(data: ConfirmDialogData): Observable<boolean> {
        return this.dialog
            .open(ConfirmDialogComponent, {
                width: '420px',
                data,
                autoFocus: data.requireTextConfirmation ? 'input' : 'button',
            })
            .afterClosed()
            .pipe(map((result) => result === true));
    }

    /** Convenience helper for destructive confirmations (warn-colored). */
    public confirmDelete(
        name: string,
        opts: Partial<ConfirmDialogData> = {}
    ): Observable<boolean> {
        return this.open({
            title: `Delete "${name}"?`,
            message: 'This action cannot be undone.',
            confirmText: 'Delete',
            confirmColor: 'warn',
            ...opts,
        });
    }
}
