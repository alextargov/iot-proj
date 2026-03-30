import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ContentHeaderButton } from 'src/app/shared/components/content-header/content-header.component';
import { MatTableDataSource } from '@angular/material/table';
import {
    DeviceInfoFragment,
    WidgetInfoFragment,
    WidgetStatus,
} from '../../../shared/graphql/generated';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { WidgetService } from '../../../shared/services/widget/widget.service';
import { WidgetDeleteComponent } from '../widget-delete/widget-delete.component';

interface StatusConfig {
    icon: string;
    label: string;
    cssClass: string;
    tooltip: string;
}

@Component({
    standalone: false,
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
    ];
    dataSource = new MatTableDataSource<WidgetInfoFragment>();

    public buttons: ContentHeaderButton[] = [
        {
            text: 'Create widget',
            icon: 'add',
            action: this.onAddClick.bind(this),
            color: 'primary',
        },
    ];

    private readonly statusConfigs: Record<string, StatusConfig> = {
        [WidgetStatus.Active]: {
            icon: 'check_circle',
            label: 'Active',
            cssClass: 'status--active',
            tooltip: 'Widget is running',
        },
        [WidgetStatus.Inactive]: {
            icon: 'pause_circle',
            label: 'Inactive',
            cssClass: 'status--inactive',
            tooltip: 'Widget is not running',
        },
    };

    @ViewChild(MatPaginator) public paginator: MatPaginator;

    public ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    constructor(
        private widgetService: WidgetService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    public ngOnInit(): void {
        this.widgetService.getAll().subscribe((widgetList) => {
            console.log('ngOnInit');

            this.dataSource.data = widgetList;
        });
    }

    public getStatusConfig(status: string): StatusConfig {
        return (
            this.statusConfigs[status] || {
                icon: 'help',
                label: 'Unknown',
                cssClass: 'status--unknown',
                tooltip: 'Unknown status',
            }
        );
    }

    public async onAddClick(): Promise<void> {
        try {
            await this.router.navigate(['widgets/create']);
        } catch (e) {
            console.log(e);
        }
    }

    public onDelete(widget: DeviceInfoFragment): void {
        const dialogRef = this.dialog.open(WidgetDeleteComponent, {
            data: {
                widget,
            },
        });

        dialogRef.afterClosed().subscribe((widgetToDelete) => {
            if (widgetToDelete) {
                this.widgetService.delete(widgetToDelete).subscribe((res) => {
                    this.dataSource.data = this.dataSource.data.filter(
                        (widget) => widget.id !== widgetToDelete
                    );
                });
            }
        });
    }

    public onDuplicate(widget: WidgetInfoFragment): void {
        this.router.navigate(['widgets/create'], {
            state: {
                duplicate: {
                    name: `${widget.name} (Copy)`,
                    description: widget.description,
                    code: widget.code,
                    workspace: widget.workspace,
                    deviceIds: widget.deviceIds,
                },
            },
        });
    }
}
