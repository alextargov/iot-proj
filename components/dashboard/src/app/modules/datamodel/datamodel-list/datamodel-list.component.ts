// connect device with the app - like CMP

import {Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef} from '@angular/core';
import {
    animate,
    state,
    style,
    transition,
    trigger,
} from '@angular/animations';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ContentHeaderButton } from '../../../shared/components/content-header/content-header.component';
import { ActivatedRoute, Router } from '@angular/router';
import { DatamodelService } from '../../../shared/services/datamodel/datamodel.service';
import { IDataModel } from '../../../shared/services/datamodel/datamodel.interface';
import { DataModelDeleteComponent } from '../datamodel-delete/datamodel-delete.component';
import { TemplatePickerDialogComponent } from '../template-picker-dialog/template-picker-dialog.component';
import { DataModelHistoryDialogComponent, DataModelHistoryDialogData } from '../datamodel-history-dialog/datamodel-history-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { SchemaTemplate } from '../schema-templates';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { DataModelInfoFragment } from '../../../shared/graphql/generated';
import {catchError, of} from "rxjs";

@Component({
    standalone: false,
    selector: 'app-datamodel-list',
    templateUrl: './datamodel-list.component.html',
    styleUrls: ['./datamodel-list.component.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({ height: '0px', minHeight: '0' })),
            state('expanded', style({ height: '*' })),
            transition(
                'expanded <=> collapsed',
                animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
            ),
        ]),
    ],
})
export class DatamodelListComponent implements OnInit, AfterViewInit {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    public dataSource = new MatTableDataSource<DataModelInfoFragment>([]);
    public loading = true;
    public loadError = false;
    public columnsToDisplay = [
        { key: 'name', displayName: 'Name' },
        { key: 'description', displayName: 'Description' },
        { key: 'deviceCount', displayName: 'Devices' },
        { key: 'currentVersion', displayName: 'Version' },
        { key: 'createdAt', displayName: 'Created At' },
    ];
    public columnsToDisplayWithExpand = [
        ...this.columnsToDisplay.map((c) => c.key),
        'expand',
    ];
    public expandedElement: any | null;

    constructor(
        private datamodelService: DatamodelService,
        private router: Router,
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private toast: ToastrService,
        private cdr: ChangeDetectorRef,
    ) {}

    public buttons: ContentHeaderButton[] = [
        {
            text: 'Import',
            icon: 'upload',
            action: this.onImportClick.bind(this),
            color: '',
        },
        {
            text: 'Create data model',
            icon: 'add',
            action: this.onAddClick.bind(this),
            color: 'primary',
        },
    ];

    public ngOnInit(): void {
        this.loadDataModels();
    }

    public ngAfterViewInit(): void {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
    }

    private loadDataModels(): void {
        this.loading = true;
        this.loadError = false;
        this.datamodelService.listDataModels().pipe(
            catchError((error) => {
                console.error('Error loading data models:', error);
                this.loadError = true;
                return of([]);
            })
        ).subscribe({
            next: (dataModels) => {
                this.dataSource.data = dataModels;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.loadError = true;
                this.cdr.detectChanges();
            },
        });
    }

    public reload(): void {
        this.loadDataModels();
    }

    public applyFilter(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.dataSource.filter = value.trim().toLowerCase();
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    public onAddClick(): void {
        const dialogRef = this.dialog.open(TemplatePickerDialogComponent, {
            width: '600px',
        });

        dialogRef.afterClosed().subscribe((result: SchemaTemplate | null | undefined) => {
            if (result === undefined) {
                // User cancelled
                return;
            }
            // Navigate to create page with template data
            this.router.navigate(['datamodel/create'], {
                state: { template: result },
            });
        });
    }

    public onToggleClick(event: MouseEvent, row: IDataModel): void {
        event.stopPropagation();
        this.expandedElement = this.expandedElement === row ? null : row;
    }

    public onDeleteClick(event: MouseEvent, dataModel: IDataModel): void {
        event.stopPropagation();

        const dialogRef = this.dialog.open(DataModelDeleteComponent, {
            data: {
                dataModel,
            },
        });

        dialogRef.afterClosed().subscribe((deletedDataModelId: string) => {
            if (deletedDataModelId) {
                this.datamodelService
                    .deleteDataModel(deletedDataModelId)
                    .subscribe({
                        next: () => {
                            this.dataSource.data = this.dataSource.data.filter(
                                (item) => item.id !== deletedDataModelId
                            );
                            this.toast.showSuccess('Data model deleted');
                        },
                        error: (err) => {
                            console.error('Error deleting data model:', err);
                            this.toast.showError(
                                'Failed to delete data model. Please try again later.'
                            );
                        },
                    });
            }
        });
    }

    public onExportClick(event: MouseEvent, dataModel: DataModelInfoFragment): void {
        event.stopPropagation();

        const exportData = {
            name: dataModel.name,
            description: dataModel.description,
            schema: dataModel.schema,
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dataModel.name.toLowerCase().replace(/\s+/g, '-')}-schema.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.toast.showSuccess('Schema exported successfully');
    }

    public onHistoryClick(event: MouseEvent, dataModel: DataModelInfoFragment): void {
        event.stopPropagation();

        const dialogRef = this.dialog.open(DataModelHistoryDialogComponent, {
            data: { dataModel } as DataModelHistoryDialogData,
            width: '900px',
            maxHeight: '80vh',
        });

        dialogRef.afterClosed().subscribe((refreshNeeded: boolean) => {
            if (refreshNeeded) {
                // Reload the data models list to reflect any version changes
                this.datamodelService.listDataModels().subscribe({
                    next: (dataModels) => {
                        this.dataSource.data = dataModels;
                    },
                });
            }
        });
    }

    public onImportClick(): void {
        this.fileInput.nativeElement.click();
    }

    public onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const content = JSON.parse(reader.result as string);

                // Validate the imported data
                if (!content.name || !content.schema) {
                    this.toast.showError('Invalid schema file: missing name or schema');
                    return;
                }

                // Check for name conflicts
                const existingNames = this.dataSource.data.map((dm) => dm.name.toLowerCase());
                let importName = content.name;
                if (existingNames.includes(importName.toLowerCase())) {
                    importName = `${content.name} (Imported)`;
                }

                // Create the data model
                this.datamodelService
                    .createDataModel({
                        name: importName,
                        description: content.description || '',
                        schema: content.schema,
                    })
                    .subscribe({
                        next: (result) => {
                            if (result.data?.createDataModel) {
                                this.dataSource.data = [...this.dataSource.data, result.data.createDataModel as DataModelInfoFragment];
                            }
                            this.toast.showSuccess('Schema imported successfully');
                        },
                        error: (err) => {
                            console.error('Error importing schema:', err);
                            this.toast.showError('Failed to import schema');
                        },
                    });
            } catch (err) {
                console.error('Error parsing file:', err);
                this.toast.showError('Invalid JSON file');
            }

            // Reset the file input
            input.value = '';
        };

        reader.readAsText(file);
    }
}
