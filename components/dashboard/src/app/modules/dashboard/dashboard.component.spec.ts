import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { MaterialModule } from '../../shared/material.module';
import { DashboardComponent } from './dashboard.component';
import { DashboardLayoutService } from '../../shared/services/dashboard-layout/dashboard-layout.service';
import { ToastrService } from '../../shared/services/toastr/toastr.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { EventBusService } from '../../shared/services/eventbus/eventbus.service';
import { MatDialog } from '@angular/material/dialog';
import { DashboardWidgetType } from '../../shared/graphql/generated';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;
    let layoutService: jasmine.SpyObj<DashboardLayoutService>;

    const makeItem = (x: number, y: number, cols: number, rows: number, id = `w${x}${y}`) => ({
        x,
        y,
        cols,
        rows,
        widget: {
            id,
            dashboardLayoutId: 'l1',
            widgetType: DashboardWidgetType.Gauge,
            title: 'Tile',
            gridX: x,
            gridY: y,
            gridCols: cols,
            gridRows: rows,
            config: {},
        } as any,
        widgetConfig: { deviceId: 'd1', unit: '°C' },
    });

    beforeEach(async () => {
        layoutService = jasmine.createSpyObj<DashboardLayoutService>('DashboardLayoutService', [
            'getLayout',
            'getDefaultLayout',
            'addWidget',
            'updateWidget',
            'deleteWidget',
            'updateWidgetPositions',
        ]);
        layoutService.getDefaultLayout.and.returnValue(of(null));

        const dialogStub = { open: () => ({ afterClosed: () => of(undefined) }) };

        await TestBed.configureTestingModule({
            declarations: [DashboardComponent],
            imports: [NoopAnimationsModule, MaterialModule],
            providers: [
                { provide: DashboardLayoutService, useValue: layoutService },
                { provide: ToastrService, useValue: { showSuccess: () => {}, showError: () => {} } },
                { provide: ConfirmDialogService, useValue: { open: () => of(true) } },
                { provide: EventBusService, useValue: { emit: () => {}, on: () => of() } },
                { provide: MatDialog, useValue: dialogStub },
                { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false },
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('findFreeCell', () => {
        it('returns (0,0) on an empty grid', () => {
            component.dashboard = [];
            expect((component as any).findFreeCell(2, 2)).toEqual({ x: 0, y: 0 });
        });

        it('returns a non-overlapping cell when the top-left is occupied', () => {
            component.dashboard = [makeItem(0, 0, 2, 2)];
            const cell = (component as any).findFreeCell(2, 2);
            expect((component as any).collides(cell.x, cell.y, 2, 2)).toBeFalse();
        });

        it('places a 2x2 next to an existing 2x2 in the same row', () => {
            component.dashboard = [makeItem(0, 0, 2, 2)];
            expect((component as any).findFreeCell(2, 2)).toEqual({ x: 2, y: 0 });
        });

        it('wraps below when the first row is full across 12 cols', () => {
            // Six 2-wide tiles fill the 12-col row at y=0..2.
            component.dashboard = [0, 2, 4, 6, 8, 10].map((x) => makeItem(x, 0, 2, 2, `w${x}`));
            const cell = (component as any).findFreeCell(2, 2);
            expect((component as any).collides(cell.x, cell.y, 2, 2)).toBeFalse();
            expect(cell.y).toBeGreaterThan(0);
        });
    });

    describe('editWidget', () => {
        it('persists title/config via updateWidget and patches the item in place', () => {
            const item = makeItem(0, 0, 2, 2, 'wEdit');
            component.dashboard = [item];
            const updated = { ...item.widget, title: 'New Title' };
            layoutService.updateWidget.and.returnValue(of(updated as any));

            const dialog = TestBed.inject(MatDialog);
            spyOn(dialog, 'open').and.returnValue({
                afterClosed: () =>
                    of({
                        widgetType: DashboardWidgetType.Gauge,
                        title: 'New Title',
                        config: { deviceId: 'd2' },
                    }),
            } as any);

            component.editWidget(item as any);

            expect(layoutService.updateWidget).toHaveBeenCalledWith('wEdit', {
                title: 'New Title',
                config: JSON.stringify({ deviceId: 'd2' }),
            });
            expect(item.widget.title).toBe('New Title');
            expect(item.widgetConfig).toEqual({ deviceId: 'd2' } as any);
        });
    });

    describe('duplicateWidget', () => {
        it('adds a copy with a free-cell position and "(copy)" title', () => {
            const item = makeItem(0, 0, 2, 2, 'wDup');
            component.dashboard = [item];
            (component as any).currentLayout = { id: 'l1' };
            layoutService.addWidget.and.returnValue(
                of({ ...item.widget, id: 'wNew', gridX: 2, gridY: 0 } as any)
            );

            component.duplicateWidget(item as any);

            expect(layoutService.addWidget).toHaveBeenCalled();
            const [layoutId, input] = layoutService.addWidget.calls.mostRecent().args;
            expect(layoutId).toBe('l1');
            expect(input.title).toBe('Tile (copy)');
            expect(input.gridX).toBe(2);
            expect(input.gridY).toBe(0);
            // The duplicate landed in the local grid.
            expect(component.dashboard.length).toBe(2);
        });
    });
});
