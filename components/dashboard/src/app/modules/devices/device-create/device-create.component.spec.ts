import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { MaterialModule } from '../../../shared/material.module';
import { DeviceCreateComponent } from './device-create.component';
import { DeviceMetadataFormComponent } from './components/device-metadata-form/device-metadata-form.component';
import { DeviceAuthFormComponent } from './components/device-auth-form/device-auth-form.component';
import { DeviceDatamodelFormComponent } from './components/device-datamodel-form/device-datamodel-form.component';
import { DeviceService } from '../../../shared/services/device/device.service';
import { DatamodelService } from '../../../shared/services/datamodel/datamodel.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';

describe('DeviceCreateComponent', () => {
    let component: DeviceCreateComponent;
    let fixture: ComponentFixture<DeviceCreateComponent>;

    // The create wizard is composed from three sub-forms; declare them so the
    // template compiles and (formReady) wiring runs. Deeper template elements
    // (Material, Monaco) are ignored via NO_ERRORS_SCHEMA — this is a unit test
    // of the parent↔sub-form wiring, not a full render test.
    const deviceServiceStub = {
        createDevice: () => of({ data: { createDevice: { id: 'd1' } } }),
        generateDeviceToken: () => of('token-123'),
        testDeviceConnection: () => of(true),
    };
    const datamodelServiceStub = {
        listDataModels: () => of([]),
    };
    const toastStub = { showSuccess: () => {}, showError: () => {} };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                DeviceCreateComponent,
                DeviceMetadataFormComponent,
                DeviceAuthFormComponent,
                DeviceDatamodelFormComponent,
            ],
            imports: [ReactiveFormsModule, FormsModule, NoopAnimationsModule, MaterialModule],
            providers: [
                { provide: DeviceService, useValue: deviceServiceStub },
                { provide: DatamodelService, useValue: datamodelServiceStub },
                { provide: ToastrService, useValue: toastStub },
            ],
            schemas: [NO_ERRORS_SCHEMA],
            teardown: { destroyAfterEach: false },
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DeviceCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('wires the auth sub-form and its OAuth URL control', async () => {
        // (formReady) is emitted from the sub-form's ngOnInit and applied in a
        // microtask (Promise.resolve().then); await microtasks explicitly so the
        // assertion is deterministic rather than relying on whenStable ordering.
        await Promise.resolve();
        await Promise.resolve();
        fixture.detectChanges();
        expect(component.authForm).toBeTruthy();
        expect(
            component.authGroup?.get('authCredentialsOAuthURL')
        ).toBeTruthy();
    });

    it('resolves all three sub-forms via ViewChild', () => {
        expect(component.metadataForm).toBeTruthy();
        expect(component.authForm).toBeTruthy();
        expect(component.dataModelForm).toBeTruthy();
    });

    it('blocks save and warns when no data model is selected', () => {
        const toast = TestBed.inject(ToastrService);
        const createSpy = spyOn(
            TestBed.inject(DeviceService),
            'createDevice'
        ).and.callThrough();
        const errorSpy = spyOn(toast, 'showError');

        // No data model selected -> onSaveClick must bail before createDevice.
        component.onSaveClick();

        expect(errorSpy).toHaveBeenCalled();
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('marks the data model control required (stepper gate)', async () => {
        await Promise.resolve();
        await Promise.resolve();
        fixture.detectChanges();
        const ctrl = component.dataModelGroup?.get('dataModel');
        expect(ctrl?.valid).toBeFalse();
    });
});
