import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';

/**
 * Components guarded by unsavedChangesGuard implement this to report whether
 * they hold unsaved edits. Return `true` from hasUnsavedChanges() to trigger a
 * confirmation prompt before the user navigates away.
 */
export interface HasUnsavedChanges {
    hasUnsavedChanges(): boolean;
}

/**
 * Route guard that prompts the user before leaving a form with unsaved
 * changes. Attach via `canDeactivate: [unsavedChangesGuard]` on a route whose
 * component implements HasUnsavedChanges.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
    component
): Observable<boolean> | boolean => {
    if (!component || typeof component.hasUnsavedChanges !== 'function') {
        return true;
    }
    if (!component.hasUnsavedChanges()) {
        return true;
    }

    const confirm = inject(ConfirmDialogService);
    return confirm.open({
        title: 'Discard unsaved changes?',
        message:
            'You have unsaved changes on this page. If you leave now, they will be lost.',
        confirmText: 'Discard changes',
        cancelText: 'Stay on page',
        confirmColor: 'warn',
    });
};
