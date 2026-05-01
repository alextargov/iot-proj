import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DatamodelService } from '../../../shared/services/datamodel/datamodel.service';
import { DataModelInfoFragment, DataModelVersionInfoFragment } from '../../../shared/graphql/generated';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';

export interface DataModelHistoryDialogData {
    dataModel: DataModelInfoFragment;
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
        private toast: ToastrService
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
        if (confirm(`Restore to version ${version.versionNumber}? This will create a new version with the schema from v${version.versionNumber}.`)) {
            this.datamodelService.rollbackToVersion(this.data.dataModel.id, version.versionNumber).subscribe({
                next: () => {
                    this.toast.showSuccess(`Restored to version ${version.versionNumber}`);
                    this.dialogRef.close(true); // Signal refresh needed
                },
                error: (err) => {
                    console.error('Error restoring version:', err);
                    this.toast.showError('Failed to restore version');
                },
            });
        }
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
}
