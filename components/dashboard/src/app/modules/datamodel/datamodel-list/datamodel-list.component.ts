// connect device with the app - like CMP

import { Component, OnInit } from '@angular/core'
import {animate, state, style, transition, trigger} from '@angular/animations';
import {ContentHeaderButton} from "../../../shared/components/content-header/content-header.component";
import {ActivatedRoute, Router} from "@angular/router";
import {DatamodelService} from "../../../shared/services/datamodel/datamodel.service";
import {IDataModel} from "../../../shared/services/datamodel/datamodel.interface";
import {DataModelDeleteComponent} from "../datamodel-delete/datamodel-delete.component";
import {MatDialog} from "@angular/material/dialog";

@Component({
    selector: 'app-datamodel-list',
    templateUrl: './datamodel-list.component.html',
    styleUrls: ['./datamodel-list.component.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({height: '0px', minHeight: '0'})),
            state('expanded', style({height: '*'})),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
})
export class DatamodelListComponent implements OnInit {
    public dataSource = [];
    // public columnsToDisplay = ['name', 'description', 'createdAt'];
    public columnsToDisplay = [{key: 'name', displayName: "Name"}, {key: 'description', displayName: 'Description'},{ key: 'createdAt', displayName: 'Created At' }];
    public columnsToDisplayWithExpand = [...this.columnsToDisplay.map((c) => c.key), 'expand' ];
    public expandedElement: any | null;

    constructor(
        private datamodelService: DatamodelService,
        private router: Router,
        private route: ActivatedRoute,
        private dialog: MatDialog
    ) {}

    public buttons: ContentHeaderButton[] = [
        {
            text: 'Create data model',
            icon: 'add',
            action: this.onAddClick.bind(this),
            color: 'primary',
        },
    ]

    public ngOnInit(): void {
        this.route.data.subscribe(({ dataModels }) => {
            this.dataSource = dataModels;
        });
    }

    public async onAddClick(): Promise<void> {
        try {
            await this.router.navigate(['datamodel/create'])
        } catch (e) {
            console.log(e)
        }
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
        })

        dialogRef.afterClosed().subscribe((deletedDataModelId: string) => {
            if (deletedDataModelId) {
                this.datamodelService.deleteDataModel(deletedDataModelId).subscribe({
                    next: () => {
                        this.dataSource = this.dataSource.filter((item) => item.id !== deletedDataModelId);
                    },
                    error: (err) => {
                        console.error('Error deleting data model:', err);
                        alert('Failed to delete data model. Please try again later.');
                    }
                });
            }
        })
    }
}
