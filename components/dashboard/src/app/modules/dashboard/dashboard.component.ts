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
    DashboardWidgetInput,
    DashboardWidgetType,
} from '../../shared/graphql/generated';
import {
    WidgetConfigDialogComponent,
    WidgetConfigDialogData,
    WidgetConfigDialogResult,
} from './components/widget-config-dialog/widget-config-dialog.component';
import { ToastrService } from '../../shared/services/toastr/toastr.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { EventBusService } from '../../shared/services/eventbus/eventbus.service';

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
    public loadError = false;
    /** Feedback for the debounced position auto-save. */
    public saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
    /** Kiosk/fullscreen presentation mode (chrome hidden, editing locked). */
    public isKiosk = false;

    private destroy$ = new Subject<void>();
    private positionChange$ = new Subject<void>();
    private lastLayoutId: string | null = null;
    private savedResetTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly fullscreenChangeHandler = (): void => this.onFullscreenChange();
    private wasLockedBeforeKiosk = true;

    readonly DashboardWidgetType = DashboardWidgetType;

    constructor(
        private readonly dashboardLayoutService: DashboardLayoutService,
        private readonly route: ActivatedRoute,
        private readonly cdr: ChangeDetectorRef,
        private readonly dialog: MatDialog,
        private readonly toast: ToastrService,
        private readonly confirm: ConfirmDialogService,
        private readonly eventBus: EventBusService
    ) {}

    ngOnInit(): void {
        this.initGridsterOptions();

        document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);

        // Debounce position changes to avoid too many API calls
        this.positionChange$
            .pipe(takeUntil(this.destroy$), debounceTime(1000))
            .subscribe(() => this.saveWidgetPositions());

        // Handle query param for direct navigation to specific dashboard
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            this.lastLayoutId = params['id'] ?? null;
            if (params['id']) {
                this.loadLayout(params['id']);
            } else {
                this.loadDefaultLayout();
            }
        });
    }

    ngOnDestroy(): void {
        document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
        if (this.savedResetTimer) {
            clearTimeout(this.savedResetTimer);
        }
        // Make sure we never leave the global chrome hidden if we're torn down
        // while in kiosk mode.
        if (this.isKiosk) {
            this.eventBus.emit('kiosk:changed', { active: false });
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    /** Re-run the current load (used by the error-state retry button). */
    public reloadLayout(): void {
        if (this.lastLayoutId) {
            this.loadLayout(this.lastLayoutId);
        } else {
            this.loadDefaultLayout();
        }
    }

    private loadLayout(layoutId: string): void {
        this.isLayoutsLoading = true;
        this.loadError = false;
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
                this.loadError = true;
                this.cdr.markForCheck();
            },
        });
    }

    private loadDefaultLayout(): void {
        this.isLayoutsLoading = true;
        this.loadError = false;
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
                this.loadError = true;
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

        this.saveState = 'saving';
        this.cdr.markForCheck();
        this.dashboardLayoutService
            .updateWidgetPositions(this.currentLayout.id, positions)
            .subscribe({
                next: () => {
                    this.saveState = 'saved';
                    this.cdr.markForCheck();
                    // Clear the "saved" badge after a moment so the indicator
                    // reflects live state rather than sticking permanently.
                    if (this.savedResetTimer) {
                        clearTimeout(this.savedResetTimer);
                    }
                    this.savedResetTimer = setTimeout(() => {
                        this.saveState = 'idle';
                        this.cdr.markForCheck();
                    }, 2000);
                },
                error: (err) => {
                    console.error('Failed to save widget positions:', err);
                    this.saveState = 'error';
                    this.toast.showError('Failed to save layout');
                    this.cdr.markForCheck();
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

    /**
     * Toggle kiosk/fullscreen presentation mode: enter browser fullscreen, hide
     * the global chrome (via the event bus), and force the layout locked.
     */
    public toggleKiosk(): void {
        if (this.isKiosk) {
            this.exitKiosk();
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            return;
        }

        this.enterKiosk();
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch((err) => {
                // Fullscreen can be rejected (not a user gesture, policy). We
                // still honour kiosk mode by hiding chrome — graceful fallback.
                console.warn('Fullscreen request rejected; kiosk chrome only', err);
            });
        }
    }

    private enterKiosk(): void {
        if (this.isKiosk) return;
        this.isKiosk = true;
        // Remember the pre-kiosk lock state so we can restore it on exit.
        this.wasLockedBeforeKiosk = this.isLocked;
        if (!this.isLocked) {
            this.onLockButtonClick(); // force locked (read-only) in kiosk
        }
        this.eventBus.emit('kiosk:changed', { active: true });
        this.cdr.markForCheck();
    }

    private exitKiosk(): void {
        if (!this.isKiosk) return;
        this.isKiosk = false;
        // Restore the editing state the user had before entering kiosk.
        if (this.isLocked !== this.wasLockedBeforeKiosk) {
            this.onLockButtonClick();
        }
        this.eventBus.emit('kiosk:changed', { active: false });
        this.cdr.markForCheck();
    }

    /** Keep kiosk state in sync when the user leaves fullscreen via Esc. */
    private onFullscreenChange(): void {
        if (!document.fullscreenElement && this.isKiosk) {
            this.exitKiosk();
        }
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

    /** Open the config dialog pre-filled with a tile's current settings. */
    public editWidget(item: DashboardGridsterItem): void {
        if (!item.widget) return;

        const dialogRef = this.dialog.open(WidgetConfigDialogComponent, {
            width: '600px',
            data: {
                mode: 'edit',
                widgetType: item.widget.widgetType,
                title: item.widget.title,
                config: item.widgetConfig,
            } as WidgetConfigDialogData,
        });

        dialogRef.afterClosed().subscribe((result: WidgetConfigDialogResult | undefined) => {
            if (!result || !item.widget) return;

            // Only title + config change here; grid position/size are owned by
            // the drag/resize autosave path and must not be clobbered.
            this.dashboardLayoutService
                .updateWidget(item.widget.id, {
                    title: result.title,
                    config: JSON.stringify(result.config),
                })
                .subscribe({
                    next: (updated) => {
                        item.widget = updated;
                        item.widgetConfig = result.config;
                        this.toast.showSuccess('Widget updated');
                        this.cdr.markForCheck();
                    },
                    error: (err) => {
                        console.error('Failed to update widget:', err);
                        this.toast.showError('Failed to update widget');
                    },
                });
        });
    }

    /** Clone a tile (same type/config/size) into the first free cell. */
    public duplicateWidget(item: DashboardGridsterItem): void {
        if (!item.widget || !this.currentLayout) return;

        const cols = item.widget.gridCols;
        const rows = item.widget.gridRows;
        const { x, y } = this.findFreeCell(cols, rows);

        const input: DashboardWidgetInput = {
            widgetType: item.widget.widgetType,
            title: `${item.widget.title} (copy)`,
            gridX: x,
            gridY: y,
            gridCols: cols,
            gridRows: rows,
            config: JSON.stringify(item.widgetConfig ?? {}),
        };

        this.appendWidget(input, item.widgetConfig, 'Widget duplicated');
    }

    private addWidgetToLayout(config: WidgetConfigDialogResult): void {
        if (!this.currentLayout) return;

        const cols = this.getDefaultCols(config.widgetType);
        const rows = this.getDefaultRows(config.widgetType);
        const { x, y } = this.findFreeCell(cols, rows);

        const input = {
            widgetType: config.widgetType,
            title: config.title,
            gridX: x,
            gridY: y,
            gridCols: cols,
            gridRows: rows,
            config: JSON.stringify(config.config),
        };

        this.appendWidget(input, config.config, 'Widget added');
    }

    /**
     * Persist a new widget and push it onto the local grid. Shared by the
     * add-widget, duplicate-widget, and template flows.
     */
    private appendWidget(
        input: DashboardWidgetInput,
        parsedConfig: any,
        successMessage: string
    ): void {
        if (!this.currentLayout) return;

        this.dashboardLayoutService.addWidget(this.currentLayout.id, input).subscribe({
            next: (widget) => {
                const gridsterItem: DashboardGridsterItem = {
                    x: widget.gridX,
                    y: widget.gridY,
                    cols: widget.gridCols,
                    rows: widget.gridRows,
                    widget: widget,
                    widgetConfig: parsedConfig,
                    dragEnabled: !this.isLocked,
                    resizeEnabled: !this.isLocked,
                };
                this.dashboard.push(gridsterItem);
                this.toast.showSuccess(successMessage);
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Failed to add widget:', err);
                this.toast.showError('Failed to add widget');
            },
        });
    }

    /**
     * Find the first free top-left cell for a cols×rows block on the 12-column
     * grid, scanning top-to-bottom then left-to-right. Falls back to the row
     * just below the lowest existing item when the scanned region is full, so a
     * returned position never overlaps an existing tile.
     */
    private findFreeCell(cols: number, rows: number): { x: number; y: number } {
        const gridCols = 12;
        const maxX = Math.max(0, gridCols - cols);

        // Lowest occupied row, used to bound the scan and as the fallback.
        const maxBottom = this.dashboard.reduce(
            (max, item) => Math.max(max, (item.y ?? 0) + (item.rows ?? 0)),
            0
        );

        for (let y = 0; y <= maxBottom; y++) {
            for (let x = 0; x <= maxX; x++) {
                if (!this.collides(x, y, cols, rows)) {
                    return { x, y };
                }
            }
        }

        // Grid is full across the scanned rows; drop the tile below everything.
        return { x: 0, y: maxBottom };
    }

    /** Rectangle-overlap test of a candidate block against existing tiles. */
    private collides(x: number, y: number, cols: number, rows: number): boolean {
        return this.dashboard.some((item) => {
            const ix = item.x ?? 0;
            const iy = item.y ?? 0;
            const ic = item.cols ?? 0;
            const ir = item.rows ?? 0;
            return x < ix + ic && x + cols > ix && y < iy + ir && y + rows > iy;
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
