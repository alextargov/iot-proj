import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { MaterialModule } from '../../../shared/material.module';
import { WidgetCreateComponent } from './widget-create.component';
import { WidgetScheduleFormComponent } from './components/widget-schedule-form/widget-schedule-form.component';
import { WidgetTemplateSelectorComponent } from './components/widget-template-selector/widget-template-selector.component';
import { DeviceService } from '../../../shared/services/device/device.service';
import { WidgetService } from '../../../shared/services/widget/widget.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';

describe('WidgetCreateComponent', () => {
    let component: WidgetCreateComponent;
    let fixture: ComponentFixture<WidgetCreateComponent>;

    // Unit test of the parent↔sub-form wiring. Sub-forms are declared so the
    // template compiles; Blockly/Material elements are ignored via
    // NO_ERRORS_SCHEMA and the injected services are stubbed.
    const deviceServiceStub = { getAllDevices: () => of([]) };
    const widgetServiceStub = {
        getById: () => of(null),
        create: () => of({}),
        update: () => of({}),
    };
    const toastStub = { showSuccess: () => {}, showError: () => {} };
    const routeStub = {
        snapshot: { paramMap: { get: () => null } },
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                WidgetCreateComponent,
                WidgetScheduleFormComponent,
                WidgetTemplateSelectorComponent,
            ],
            imports: [ReactiveFormsModule, FormsModule, NoopAnimationsModule, MaterialModule],
            providers: [
                { provide: DeviceService, useValue: deviceServiceStub },
                { provide: WidgetService, useValue: widgetServiceStub },
                { provide: ToastrService, useValue: toastStub },
                { provide: ActivatedRoute, useValue: routeStub },
            ],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false },
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(WidgetCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('resolves the schedule sub-form via ViewChild', () => {
        expect(component.scheduleForm).toBeTruthy();
    });
});
