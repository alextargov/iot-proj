import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    OnInit,
    ViewChild,
} from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { MatStepper } from '@angular/material/stepper';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Router } from '@angular/router';
import { DeviceService } from '../../../shared/services/device/device.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import {
    DataModelInfoFragment,
    DeviceInput,
    DeviceStatus,
} from '../../../shared/graphql/generated';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import {
    DeviceMetadataFormComponent,
    DeviceMetadataFormValue,
} from './components/device-metadata-form/device-metadata-form.component';
import { DeviceAuthFormComponent } from './components/device-auth-form/device-auth-form.component';
import { DeviceDatamodelFormComponent } from './components/device-datamodel-form/device-datamodel-form.component';

@Component({
    standalone: false,
    selector: 'app-device-create',
    templateUrl: './device-create.component.html',
    styleUrls: ['./device-create.component.scss'],
})
export class DeviceCreateComponent
    implements OnInit, AfterViewInit, HasUnsavedChanges
{
    // Form groups owned by the sub-forms and surfaced here via (formReady) so
    // the stepper can gate each step via [stepControl].
    public metadataGroup?: UntypedFormGroup;
    public authGroup?: UntypedFormGroup;
    public dataModelGroup?: UntypedFormGroup;

    private submitted = false;
    public isSaving = false;

    // Prefill data derived from a "duplicate" navigation payload.
    public initialMetadata?: Partial<DeviceMetadataFormValue>;
    public initialDataModelId?: string;

    // Snapshot of the sub-form values, refreshed when the Review step is
    // entered. Binding the Review template to plain fields (rather than calling
    // sub-form getters every CD cycle) keeps change detection stable.
    public review: {
        name: string;
        description: string;
        deviceURL: string;
        tags: string[];
        authPolicy: string;
        dataModelName: string;
    } = {
        name: '',
        description: '',
        deviceURL: '',
        tags: [],
        authPolicy: '-',
        dataModelName: '',
    };

    @ViewChild('deviceStepper')
    public stepper: MatStepper;

    @ViewChild(DeviceMetadataFormComponent)
    public metadataForm: DeviceMetadataFormComponent;
    @ViewChild(DeviceAuthFormComponent)
    public authForm: DeviceAuthFormComponent;
    @ViewChild(DeviceDatamodelFormComponent)
    public dataModelForm: DeviceDatamodelFormComponent;

    constructor(
        private deviceService: DeviceService,
        private toast: ToastrService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    public ngOnInit(): void {
        const duplicateData = history.state?.duplicate;

        if (duplicateData) {
            this.initialMetadata = {
                name: duplicateData.name,
                description: duplicateData.description,
                deviceURL: duplicateData.host?.url,
                turnOnEndpoint: duplicateData.host?.turnOnEndpoint,
                turnOffEndpoint: duplicateData.host?.turnOffEndpoint,
                tags: duplicateData.tags ? [...duplicateData.tags] : [],
            };
            this.initialDataModelId = duplicateData.dataModel?.id;
        }
    }

    public ngAfterViewInit(): void {
        this.stepper.reset();
    }

    // Sub-forms emit their FormGroup from ngOnInit, which fires during the
    // parent's change-detection pass; binding it straight to [stepControl]
    // would throw ExpressionChangedAfterItHasBeenChecked. Defer the assignment
    // to the next microtask so the binding settles on a stable value.
    public onMetadataReady(group: UntypedFormGroup): void {
        Promise.resolve().then(() => {
            this.metadataGroup = group;
            this.cdr.markForCheck();
        });
    }

    public onAuthReady(group: UntypedFormGroup): void {
        Promise.resolve().then(() => {
            this.authGroup = group;
            this.cdr.markForCheck();
        });
    }

    public onDataModelReady(group: UntypedFormGroup): void {
        Promise.resolve().then(() => {
            this.dataModelGroup = group;
            this.cdr.markForCheck();
        });
    }

    public onStepChange(event: StepperSelectionEvent): void {
        // Refresh the Review snapshot when the user lands on the last step.
        const reviewIndex = this.stepper?.steps?.length
            ? this.stepper.steps.length - 1
            : 3;
        if (event.selectedIndex === reviewIndex) {
            const metadata = this.metadataForm?.getValue();
            this.review = {
                name: metadata?.name || '',
                description: metadata?.description || '',
                deviceURL: metadata?.deviceURL || '',
                tags: this.metadataForm?.getTags() ?? [],
                authPolicy: this.authForm?.selectedAuthorizationPolicy || '-',
                dataModelName:
                    this.dataModelForm?.getSelectedDataModel()?.name || '',
            };
        }
    }

    public onResetClick(stepper: MatStepper): void {
        this.metadataForm?.reset();
        this.authForm?.reset();
        this.dataModelForm?.reset();
        this.review = {
            name: '',
            description: '',
            deviceURL: '',
            tags: [],
            authPolicy: '-',
            dataModelName: '',
        };
        stepper.reset();
    }

    public hasUnsavedChanges(): boolean {
        if (this.submitted) {
            return false;
        }
        return (
            !!this.metadataGroup?.dirty ||
            !!this.authGroup?.dirty ||
            !!this.dataModelGroup?.dirty
        );
    }

    public onSaveClick(): void {
        if (this.isSaving) {
            return;
        }

        // Data model is a required field server-side; the stepper gates it, but
        // guard here too so Save can never issue an invalid mutation.
        const dataModel = this.dataModelForm?.getSelectedDataModel();
        if (!dataModel?.id) {
            this.toast.showError('Please select a data model');
            return;
        }

        const data = this.convertToModel();
        const shouldGenerateToken = this.authForm?.shouldGenerateToken();

        this.isSaving = true;
        this.deviceService.createDevice(data).subscribe({
            next: (result) => {
                const device = result.data?.createDevice;
                this.submitted = true;
                this.toast.showSuccess('Successfully created device');

                // Generate communication token after device creation when
                // "device to server" communication is enabled.
                if (shouldGenerateToken && device?.id) {
                    this.deviceService.generateDeviceToken(device.id).subscribe({
                        next: (token) => {
                            this.authForm?.setToken(token);
                            this.toast.showSuccess('Device token generated');
                            this.isSaving = false;
                        },
                        error: (err) => {
                            console.error('Failed to generate token', err);
                            this.toast.showError('Failed to generate device token');
                            this.isSaving = false;
                        },
                    });
                } else {
                    this.isSaving = false;
                }
            },
            error: (err) => {
                console.error('Failed to create device', err);
                this.toast.showError('Failed to create device');
                this.isSaving = false;
            },
        });
    }

    public onTestConnection(url: string): void {
        if (!url || !this.metadataForm) {
            return;
        }

        this.metadataForm.isTestingConnection = true;
        this.deviceService.testDeviceConnection(url).subscribe({
            next: (isReachable) => {
                this.metadataForm.isTestingConnection = false;
                if (isReachable) {
                    this.toast.showSuccess('Device is reachable');
                } else {
                    this.toast.showError('Device is not reachable');
                }
            },
            error: () => {
                this.metadataForm.isTestingConnection = false;
                this.toast.showError('Failed to test connection');
            },
        });
    }

    private convertToModel(): DeviceInput {
        const metadata = this.metadataForm?.getValue();
        const auth = this.authForm?.getValue();
        const dataModel = this.dataModelForm?.getSelectedDataModel();

        const host = metadata?.deviceURL
            ? {
                  url: metadata.deviceURL,
                  turnOffEndpoint: metadata.turnOffEndpoint,
                  turnOnEndpoint: metadata.turnOnEndpoint,
              }
            : null;

        return {
            name: metadata?.name,
            description: metadata?.description,
            host,
            status: DeviceStatus.Active,
            auth: {
                credentialForDevice: auth?.credentials,
                credentialForService: auth?.serverToken,
            },
            dataModel: (dataModel as DataModelInfoFragment)?.id,
            tags: metadata?.tags?.length ? metadata.tags : undefined,
        };
    }
}
