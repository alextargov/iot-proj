import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
import { DashboardService, DashboardStats } from '../../shared/services/dashboard/dashboard.service';

interface Safe extends GridsterConfig {
    draggable: Draggable;
    resizable: Resizable;
    pushDirections: PushDirections;
}

@Component({
    standalone: false,
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
    public options: Safe;
    public dashboard: Array<GridsterItemConfig>;
    public isLocked: boolean = true;

    public stats: DashboardStats | null = null;
    public isLoading = true;
    public error: string | null = null;

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly router: Router,
        private readonly cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadStats();
        this.initGridsterOptions();
        this.dashboard = [];
    }

    private loadStats(): void {
        this.isLoading = true;
        this.error = null;

        this.dashboardService.getStats().subscribe({
            next: (stats) => {
                this.stats = stats;
                this.isLoading = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Failed to load dashboard stats:', err);
                this.error = 'Failed to load dashboard data. Please try again.';
                this.isLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    public refreshStats(): void {
        this.loadStats();
    }

    public navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    private initGridsterOptions(): void {
        this.options = {
            gridType: GridType.Fit,
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
            minCols: 1,
            maxCols: 100,
            minRows: 1,
            maxRows: 100,
            maxItemCols: 100,
            minItemCols: 1,
            maxItemRows: 100,
            minItemRows: 1,
            maxItemArea: 2500,
            minItemArea: 1,
            defaultItemCols: 1,
            defaultItemRows: 1,
            fixedColWidth: 105,
            fixedRowHeight: 105,
            keepFixedHeightInMobile: false,
            keepFixedWidthInMobile: false,
            scrollSensitivity: 10,
            scrollSpeed: 20,
            enableEmptyCellClick: false,
            enableEmptyCellContextMenu: false,
            enableEmptyCellDrop: true,
            enableEmptyCellDrag: false,
            enableOccupiedCellDrop: false,
            emptyCellDragMaxCols: 50,
            emptyCellDragMaxRows: 50,
            ignoreMarginInRow: false,
            draggable: {
                enabled: false,
            },
            resizable: {
                enabled: false,
            },
            swap: false,
            pushItems: false,
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
        };
    }

    changedOptions(): void {
        if (this.options.api && this.options.api.optionsChanged) {
            this.options.api.optionsChanged();
        }
    }

    removeItem($event: MouseEvent | TouchEvent, item): void {
        $event.preventDefault();
        $event.stopPropagation();
        this.dashboard.splice(this.dashboard.indexOf(item), 1);
    }

    public removeAll($event: MouseEvent | TouchEvent): void {
        $event.preventDefault();
        $event.stopPropagation();
        this.dashboard = [];
    }

    addItem(): void {
        this.dashboard.push({
            x: 0,
            y: 0,
            cols: 1,
            rows: 1,
            dragEnabled: !this.isLocked,
            resizeEnabled: !this.isLocked,
        });
    }

    public onLockButtonClick(): void {
        this.isLocked = !this.isLocked;

        this.options = {
            ...this.options,
            draggable: {
                enabled: !this.options.draggable.enabled,
            },
            resizable: {
                enabled: !this.options.resizable.enabled,
            },
            pushItems: !this.options.pushItems,
            displayGrid:
                this.options.displayGrid === DisplayGrid.None
                    ? DisplayGrid.Always
                    : DisplayGrid.None,
        };
    }
}
