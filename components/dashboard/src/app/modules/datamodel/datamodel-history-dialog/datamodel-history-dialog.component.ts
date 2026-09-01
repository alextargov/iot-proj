import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DatamodelService } from '../../../shared/services/datamodel/datamodel.service';
import { DataModelInfoFragment, DataModelVersionInfoFragment } from '../../../shared/graphql/generated';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';

export interface DataModelHistoryDialogData {
    dataModel: DataModelInfoFragment;
}

/** A single line in a unified diff. */
export interface DiffLine {
    type: 'context' | 'add' | 'remove';
    text: string;
}

@Component({
    standalone: false,
    selector: 'app-datamodel-history-dialog',
    templateUrl: './datamodel-history-dialog.component.html',
    styleUrls: ['./datamodel-history-dialog.component.scss'],
})
export class DataModelHistoryDialogComponent implements OnInit {
    public versions: DataModelVersionInfoFragment[] = [];
    public loading = true;
    public selectedVersion: DataModelVersionInfoFragment | null = null;
    public compareVersion: DataModelVersionInfoFragment | null = null;
    public viewMode: 'list' | 'view' | 'compare' = 'list';

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DataModelHistoryDialogData,
        private dialogRef: MatDialogRef<DataModelHistoryDialogComponent>,
        private datamodelService: DatamodelService,
        private toast: ToastrService,
        private confirm: ConfirmDialogService
    ) {}

    public ngOnInit(): void {
        this.loadVersions();
    }

    private loadVersions(): void {
        this.loading = true;
        this.datamodelService.listVersions(this.data.dataModel.id).subscribe({
            next: (versions) => {
                this.versions = versions;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading versions:', err);
                this.toast.showError('Failed to load version history');
                this.loading = false;
            },
        });
    }

    public onViewClick(version: DataModelVersionInfoFragment): void {
        this.selectedVersion = version;
        this.viewMode = 'view';
    }

    public onCompareClick(version: DataModelVersionInfoFragment): void {
        this.compareVersion = version;
        this.viewMode = 'compare';
    }

    public onRestoreClick(version: DataModelVersionInfoFragment): void {
        this.confirm
            .open({
                title: `Restore to version ${version.versionNumber}?`,
                message: `This will create a new version with the schema from v${version.versionNumber}. Current data is not lost — it stays in history.`,
                confirmText: 'Restore',
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.datamodelService
                    .rollbackToVersion(this.data.dataModel.id, version.versionNumber)
                    .subscribe({
                        next: () => {
                            this.toast.showSuccess(
                                `Restored to version ${version.versionNumber}`
                            );
                            this.dialogRef.close(true); // Signal refresh needed
                        },
                        error: (err) => {
                            console.error('Error restoring version:', err);
                            this.toast.showError('Failed to restore version');
                        },
                    });
            });
    }

    public onBackClick(): void {
        this.viewMode = 'list';
        this.selectedVersion = null;
        this.compareVersion = null;
    }

    public onClose(): void {
        this.dialogRef.close(false);
    }

    public formatDate(date: string): string {
        return new Date(date).toLocaleString();
    }

    public formatSchema(schema: unknown): string {
        try {
            const parsed = typeof schema === 'string' ? JSON.parse(schema) : schema;
            return JSON.stringify(parsed, null, 2);
        } catch {
            return String(schema);
        }
    }

    /**
     * Computes a unified line diff (older `compareVersion` → current schema)
     * using a longest-common-subsequence backtrace, so unchanged lines are
     * shown as context and only real edits are highlighted.
     */
    public get diff(): DiffLine[] {
        if (!this.compareVersion) {
            return [];
        }
        const oldLines = this.formatSchema(this.compareVersion.schema).split('\n');
        const newLines = this.formatSchema(this.data.dataModel.schema).split('\n');
        return this.diffLines(oldLines, newLines);
    }

    private diffLines(a: string[], b: string[]): DiffLine[] {
        const n = a.length;
        const m = b.length;
        // LCS length table.
        const lcs: number[][] = Array.from({ length: n + 1 }, () =>
            new Array<number>(m + 1).fill(0)
        );
        for (let i = n - 1; i >= 0; i--) {
            for (let j = m - 1; j >= 0; j--) {
                lcs[i][j] =
                    a[i] === b[j]
                        ? lcs[i + 1][j + 1] + 1
                        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
            }
        }

        const result: DiffLine[] = [];
        let i = 0;
        let j = 0;
        while (i < n && j < m) {
            if (a[i] === b[j]) {
                result.push({ type: 'context', text: a[i] });
                i++;
                j++;
            } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
                result.push({ type: 'remove', text: a[i] });
                i++;
            } else {
                result.push({ type: 'add', text: b[j] });
                j++;
            }
        }
        while (i < n) {
            result.push({ type: 'remove', text: a[i++] });
        }
        while (j < m) {
            result.push({ type: 'add', text: b[j++] });
        }
        return result;
    }
}
