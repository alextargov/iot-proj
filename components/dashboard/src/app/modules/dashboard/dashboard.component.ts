import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import {
    CompactType,
    DisplayGrid,
    Draggable,
    GridsterConfig,
    GridsterItemConfig,
    GridType,
    PushDirections,
    Resizable,
} from 'angular-gridster2';
import { DashboardLayoutService } from '../../shared/services/dashboard-layout/dashboard-layout.service';
import {
    DashboardLayoutInfoFragment,
    DashboardWidgetInfoFragment,
    DashboardWidgetType,
} from '../../shared/graphql/generated';
import {
    WidgetConfigDialogComponent,
    WidgetConfigDialogData,
    WidgetConfigDialogResult,
} from './components/widget-config-dialog/widget-config-dialog.component';
import { ToastrService } from '../../shared/services/toastr/toastr.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';

interface Safe extends GridsterConfig {
    draggable: Draggable;
    resizable: Resizable;
    pushDirections: PushDirections;
}

interface DashboardGridsterItem extends GridsterItemConfig {
    widget?: DashboardWidgetInfoFragment;
    widgetConfig?: any;
}

@Component({
    standalone: false,
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {
    public options: Safe;
    public dashboard: Array<DashboardGridsterItem> = [];
    public isLocked: boolean = true;
    public currentLayout: DashboardLayoutInfoFragment | null = null;
    public refreshInterval: number = 30000;
    public isLayoutsLoading = false;

    private destroy$ = new Subject<void>();
    private positionChange$ = new Subject<void>();

    readonly DashboardWidgetType = DashboardWidgetType;

    constructor(
        private readonly dashboardLayoutService: DashboardLayoutService,
        private readonly route: ActivatedRoute,
        private readonly cdr: ChangeDetectorRef,
        private readonly dialog: MatDialog,
        private readonly toast: ToastrService,
        private readonly confirm: ConfirmDialogService
    ) {}

    ngOnInit(): void {
        this.initGridsterOptions();

        // Debounce position changes to avoid too many API calls
        this.positionChange$
            .pipe(takeUntil(this.destroy$), debounceTime(1000))
            .subscribe(() => this.saveWidgetPositions());

        // Handle query param for direct navigation to specific dashboard
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            if (params['id']) {
                this.loadLayout(params['id']);
            } else {
                this.loadDefaultLayout();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadLayout(layoutId: string): void {
        this.isLayoutsLoading = true;
        this.dashboardLayoutService.getLayout(layoutId).subscribe({
            next: (layout) => {
                this.isLayoutsLoading = false;
                if (layout) {
                    this.setLayout(layout);
                }
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Failed to load layout:', err);
                this.isLayoutsLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    private loadDefaultLayout(): void {
        this.isLayoutsLoading = true;
        this.dashboardLayoutService.getDefaultLayout().subscribe({
            next: (layout) => {
                this.isLayoutsLoading = false;
                if (layout) {
                    this.setLayout(layout);
                }
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Failed to load default layout:', err);
                this.isLayoutsLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    private setLayout(layout: DashboardLayoutInfoFragment): void {
        this.currentLayout = layout;
        this.refreshInterval = layout.refreshIntervalSeconds * 1000;
        this.loadWidgetsFromLayout(layout);
    }

    private loadWidgetsFromLayout(layout: DashboardLayoutInfoFragment): void {
        this.dashboard = layout.widgets.map((widget) => {
            const config = this.parseWidgetConfig(widget.config);
            return {
                x: widget.gridX,
                y: widget.gridY,
                cols: widget.gridCols,
                rows: widget.gridRows,
                widget: widget,
                widgetConfig: config,
                dragEnabled: !this.isLocked,
                resizeEnabled: !this.isLocked,
            };
        });
    }

    private parseWidgetConfig(configStr: string): any {
        try {
            return JSON.parse(configStr);
        } catch {
            return {};
        }
    }

    private initGridsterOptions(): void {
        this.options = {
            gridType: GridType.ScrollVertical,
            compactType: CompactType.None,
            margin: 10,
            outerMargin: true,
            outerMarginTop: null,
            outerMarginRight: null,
            outerMarginBottom: null,
            outerMarginLeft: null,
            useTransformPositioning: true,
            mobileBreakpoint: 640,
            useBodyForBreakpoint: false,
            minCols: 12,
            maxCols: 12,
            minRows: 1,
            maxRows: 100,
            maxItemCols: 12,
            minItemCols: 1,
            maxItemRows: 10,
            minItemRows: 1,
            maxItemArea: 120,
            minItemArea: 1,
            defaultItemCols: 2,
            defaultItemRows: 2,
            fixedColWidth: 100,
            fixedRowHeight: 100,
            keepFixedHeightInMobile: false,
            keepFixedWidthInMobile: false,
            scrollSensitivity: 10,
            scrollSpeed: 20,
            enableEmptyCellClick: false,
            enableEmptyCellContextMenu: false,
            enableEmptyCellDrop: false,
            enableEmptyCellDrag: false,
            enableOccupiedCellDrop: false,
            emptyCellDragMaxCols: 50,
            emptyCellDragMaxRows: 50,
            ignoreMarginInRow: false,
            draggable: {
                enabled: false,
                ignoreContentClass: 'widget-content',
                dragHandleClass: 'drag-handler',
            },
            resizable: {
                enabled: false,
                handles: {
                    s: true,
                    e: true,
                    n: true,
                    w: true,
                    se: true,
                    ne: true,
                    sw: true,
                    nw: true,
                },
            },
            swap: true,
            pushItems: true,
            disablePushOnDrag: false,
            disablePushOnResize: false,
            pushDirections: {
                north: true,
                east: true,
                south: true,
                west: true,
            },
            pushResizeItems: false,
            displayGrid: DisplayGrid.None,
            disableWindowResize: false,
            disableWarnings: false,
            scrollToNewItems: false,
            itemChangeCallback: () => this.onItemChange(),
            itemResizeCallback: () => this.onItemChange(),
        };
    }

    private onItemChange(): void {
        if (!this.isLocked) {
            this.positionChange$.next();
        }
    }

    private saveWidgetPositions(): void {
        if (!this.currentLayout) return;

        const positions = this.dashboard
            .filter((item) => item.widget)
            .map((item) => ({
                widgetId: item.widget!.id,
                gridX: item.x,
                gridY: item.y,
                gridCols: item.cols,
                gridRows: item.rows,
            }));

        this.dashboardLayoutService
            .updateWidgetPositions(this.currentLayout.id, positions)
            .subscribe({
                next: () => {},
                error: (err) => {
                    console.error('Failed to save widget positions:', err);
                    this.toast.showError('Failed to save layout');
                },
            });
    }

    changedOptions(): void {
        if (this.options.api && this.options.api.optionsChanged) {
            this.options.api.optionsChanged();
        }
    }

    removeWidget(item: DashboardGridsterItem): void {
        if (!item.widget) return;
        const widgetId = item.widget.id;

        this.confirm
            .open({
                title: 'Remove widget from dashboard?',
                message:
                    'This removes the widget from this dashboard layout. The widget itself is not deleted and can be added back later.',
                confirmText: 'Remove',
                confirmColor: 'warn',
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.dashboardLayoutService.deleteWidget(widgetId).subscribe({
                    next: () => {
                        this.dashboard.splice(this.dashboard.indexOf(item), 1);
                        this.toast.showSuccess('Widget removed');
                        this.cdr.markForCheck();
                    },
                    error: (err) => {
                        console.error('Failed to delete widget:', err);
                        this.toast.showError('Failed to remove widget');
                    },
                });
            });
    }

    public onLockButtonClick(): void {
        this.isLocked = !this.isLocked;

        this.options = {
            ...this.options,
            draggable: {
                ...this.options.draggable,
                enabled: !this.isLocked,
            },
            resizable: {
                ...this.options.resizable,
                enabled: !this.isLocked,
            },
            displayGrid: this.isLocked ? DisplayGrid.None : DisplayGrid.Always,
        };

        this.dashboard = this.dashboard.map((item) => ({
            ...item,
            dragEnabled: !this.isLocked,
            resizeEnabled: !this.isLocked,
        }));

        this.changedOptions();
        this.cdr.markForCheck();
    }

    public openAddWidgetDialog(): void {
        const dialogRef = this.dialog.open(WidgetConfigDialogComponent, {
            width: '600px',
            data: { mode: 'create' } as WidgetConfigDialogData,
        });

        dialogRef.afterClosed().subscribe((result: WidgetConfigDialogResult | undefined) => {
            if (result) {
                this.addWidgetToLayout(result);
            }
        });
    }

    private addWidgetToLayout(config: WidgetConfigDialogResult): void {
        if (!this.currentLayout) return;

        const input = {
            widgetType: config.widgetType,
            title: config.title,
            gridX: 0,
            gridY: 0,
            gridCols: this.getDefaultCols(config.widgetType),
            gridRows: this.getDefaultRows(config.widgetType),
            config: JSON.stringify(config.config),
        };

        this.dashboardLayoutService.addWidget(this.currentLayout.id, input).subscribe({
            next: (widget) => {
                const gridsterItem: DashboardGridsterItem = {
                    x: widget.gridX,
                    y: widget.gridY,
                    cols: widget.gridCols,
                    rows: widget.gridRows,
                    widget: widget,
                    widgetConfig: config.config,
                    dragEnabled: !this.isLocked,
                    resizeEnabled: !this.isLocked,
                };
                this.dashboard.push(gridsterItem);
                this.toast.showSuccess('Widget added');
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Failed to add widget:', err);
                this.toast.showError('Failed to add widget');
            },
        });
    }

    private getDefaultCols(widgetType: DashboardWidgetType): number {
        switch (widgetType) {
            case DashboardWidgetType.Gauge:
            case DashboardWidgetType.StatusIndicator:
            case DashboardWidgetType.StatCard:
                return 2;
            case DashboardWidgetType.LineChart:
            case DashboardWidgetType.Table:
                return 4;
            default:
                return 2;
        }
    }

    private getDefaultRows(widgetType: DashboardWidgetType): number {
        switch (widgetType) {
            case DashboardWidgetType.Gauge:
            case DashboardWidgetType.StatusIndicator:
            case DashboardWidgetType.StatCard:
                return 2;
            case DashboardWidgetType.LineChart:
            case DashboardWidgetType.Table:
                return 3;
            default:
                return 2;
        }
    }
}
