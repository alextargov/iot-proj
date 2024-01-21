import {Component, OnInit, ViewChild} from '@angular/core'
import { Router } from '@angular/router'
import { ContentHeaderButton } from 'src/app/shared/components/content-header/content-header.component'
import {MatTableDataSource} from "@angular/material/table";
import {DeviceInfoFragment, WidgetInfoFragment} from "../../../shared/graphql/generated";
import {MatPaginator} from "@angular/material/paginator";
import {MatDialog} from "@angular/material/dialog";
import {WidgetService} from "../../../shared/services/widget/widget.service";
import {WidgetStatus} from "../../../shared/services/widget/widget.interface";
import {WidgetDeleteComponent} from "../widget-delete/widget-delete.component";

@Component({
    selector: 'app-widgets',
    templateUrl: './widgets.component.html',
    styleUrls: ['./widgets.component.scss'],
})
export class WidgetsComponent implements OnInit {
    displayedColumns: string[] = [
        'name',
        'description',
        'status',
        'createdAt',
        'actions',
    ]
    dataSource = new MatTableDataSource<WidgetInfoFragment>()

    public buttons: ContentHeaderButton[] = [
        {
            text: 'Create widget',
            icon: 'add',
            action: this.onAddClick.bind(this),
            color: 'primary',
        },
    ]

    @ViewChild(MatPaginator) public paginator: MatPaginator

    public ngAfterViewInit() {
        this.dataSource.paginator = this.paginator
    }

    constructor(
        private widgetService: WidgetService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    public ngOnInit(): void {
        this.widgetService.getAll().subscribe((widgetList) => {
            console.log('ngOnInit')

            this.dataSource.data = widgetList
        })
    }

    public getStatus(status: WidgetStatus) {
        if (status === WidgetStatus.ACTIVE) {
            return 'check_circle'
        }

        return 'circle'
    }

    public async onAddClick(): Promise<void> {
        try {
            await this.router.navigate(['widgets/create'])
        } catch (e) {
            console.log(e)
        }
    }

    public onDelete(widget: DeviceInfoFragment): void {
        const dialogRef = this.dialog.open(WidgetDeleteComponent, {
            data: {
                widget,
            },
        })

        dialogRef.afterClosed().subscribe((widgetToDelete) => {
            if (widgetToDelete) {
                this.widgetService
                    .delete(widgetToDelete)
                    .subscribe((res) => {
                        this.dataSource.data = this.dataSource.data.filter(
                            (widget) => widget.id !== widgetToDelete
                        )
                    })
            }
        })
    }
}
