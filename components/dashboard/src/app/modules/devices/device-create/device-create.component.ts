import {
    AfterViewInit,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from '@angular/core';
import {
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';

import { MatStepper } from '@angular/material/stepper';
import { DeviceService } from '../../../shared/services/device/device.service';
import { AuthPolicy } from '../../../shared/services/device/device.interface';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';
import { v4 as uuidv4 } from 'uuid';
import {
    CredentialDataInput, DataModelInfoFragment,
    DeviceInput,
    DeviceStatus,
} from '../../../shared/graphql/generated';
import { map, Observable } from "rxjs";
import {startWith} from "rxjs/operators";
import {DatamodelService} from "../../../shared/services/datamodel/datamodel.service";
import {Mode, SchemaTypeEnum} from "../../datamodel/datamodel-create/datamodel-create.component";
import {SchemaField} from "../../../shared/components/schema-node-editor/schema-node-editor.component";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";

@Component({
    selector: 'app-device-create',
    templateUrl: './device-create.component.html',
    styleUrls: ['./device-create.component.scss'],
})
export class DeviceCreateComponent implements OnInit, AfterViewInit {
    public deviceCreateMetadataFormGroup: UntypedFormGroup;
    public deviceCreateAuthorizationFormGroup: UntypedFormGroup;
    public deviceCreateOutputFormGroup: UntypedFormGroup;
    public readonly authorizationPolicies: AuthPolicy[] = [
        AuthPolicy.None,
        AuthPolicy.Basic,
        AuthPolicy.OAuth,
        AuthPolicy.Certificate,
        AuthPolicy.Bearer,
    ];
    public selectedAuthorizationPolicy: AuthPolicy = AuthPolicy.None;
    public authPolicy = AuthPolicy;
    public filteredDataModels: Observable<DataModelInfoFragment[]>;
    public dataModels: DataModelInfoFragment[] = [];

    @ViewChild('tokenInput')
    public tokenInput: ElementRef<HTMLInputElement>;
    @ViewChild('deviceStepper')
    public stepper: MatStepper;

    public schema: SchemaField = { type: SchemaTypeEnum.Object, properties: {} };
    public mode: 'ui' | 'code' = 'code';
    public selectedMode: Mode = Mode.CODE;
    public editorInstance!: any;
    public editorOptions = {
        theme: 'vs-dark',
        language: 'json',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        folding: true,
        tabSize: 2,
        padding: {
            top: 10,
            bottom: 10,
        },
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
        },
    };


    constructor(
        private fb: UntypedFormBuilder,
        private deviceService: DeviceService,
        private dataModelService: DatamodelService,
        private toast: ToastrService
    ) {

    }

    public ngOnInit(): void {
        this.deviceCreateMetadataFormGroup = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(128)]],
            description: ['', [Validators.required, Validators.maxLength(512)]],
            deviceURL: [''],
            turnOnEndpoint: [''],
            turnOffEndpoint: [''],
        });
        this.deviceCreateAuthorizationFormGroup = this.fb.group({
            communicationToDevice: [false],
            communicationToServer: [false],
            authCredentialsBasicUsername: [''],
            authCredentialsBasicPassword: [''],
            authCredentialsOAuthClientID: [''],
            authCredentialsOAuthClientSecret: [''],
            authCredentialsCertificateClientID: [''],
            authCredentialsCertificateClientSecret: [''],
            authCredentialsCertificateClientCert: [''],
            authCredentialsBearerToken: [''],
        });
        this.deviceCreateOutputFormGroup = this.fb.group({
            dataModel: '',
        });

        this.dataModelService.listDataModels().subscribe((data: DataModelInfoFragment[]) => {
            console.log(data)
            this.dataModels = data

            this.filteredDataModels = this.deviceCreateOutputFormGroup.get("dataModel").valueChanges.pipe(
                startWith(''),
                map(dataModel => (dataModel ? this._filterStates(dataModel) : this.dataModels.slice())),
            );
        });
    }

    public ngAfterViewInit() {
        this.stepper.reset();
    }

    public onResetClick(stepper: MatStepper): void {
        this.deviceCreateMetadataFormGroup.reset();
        this.deviceCreateAuthorizationFormGroup.reset();
        this.deviceCreateOutputFormGroup.reset();
        this.selectedAuthorizationPolicy = AuthPolicy.None;
        this.tokenInput.nativeElement.value = '';
        stepper.reset();
    }

    public onSaveClick(): void {
        const data = this.convertToModel();
        this.deviceService.createDevice(data).subscribe((data) => {
            console.log('success', data);
            this.toast.showSuccess('Successfully created device');
        });
    }

    public onEnableConnectionClick(
        event: KeyboardEvent,
        communication: string
    ) {
        event.stopPropagation();
        setTimeout(() => {
            if (
                communication === 'deviceToServer' &&
                this.deviceCreateAuthorizationFormGroup.get(
                    'communicationToServer'
                ).value
            ) {
                // TODO: Invoke server to generate a token

                this.tokenInput.nativeElement.value = uuidv4();
            }
        });
    }

    public displayDataModel(dataModel: DataModelInfoFragment): string {
        return dataModel && dataModel.name ? dataModel.name : '';
    }

    public onCodeToggleClick() {
        this.mode = Mode.CODE;
    }

    public async onUiToggleClick() {
        const code: string = this.deviceCreateOutputFormGroup.get('dataModel').value.schema;

        if (code) {
            this.schema = JSON.parse(code);
        }
        this.mode = Mode.UI;
    }

    public onDataModelSelected(dataModel: MatAutocompleteSelectedEvent) {
        this.schema = JSON.parse(dataModel.option.value.schema);
    }

    public editorInit(editor: any) {
        this.editorInstance = editor;
    }

    private convertToModel(): DeviceInput {
        const host = this.deviceCreateMetadataFormGroup.get('deviceURL').value
            ? {
                  url: this.deviceCreateMetadataFormGroup.get('deviceURL')
                      .value,
                  turnOffEndpoint:
                      this.deviceCreateMetadataFormGroup.get('turnOffEndpoint')
                          .value,
                  turnOnEndpoint:
                      this.deviceCreateMetadataFormGroup.get('turnOnEndpoint')
                          .value,
              }
            : null;
        return {
            name: this.deviceCreateMetadataFormGroup.get('name').value,
            description:
                this.deviceCreateMetadataFormGroup.get('description').value,
            host,
            status: DeviceStatus.Active,
            auth: {
                credentialForDevice: this.getAuthorizationCredentials(
                    this.selectedAuthorizationPolicy
                ),
                credentialForService: this.tokenInput.nativeElement.value,
            },
            dataModel: (this.deviceCreateOutputFormGroup.get('dataModel').value as DataModelInfoFragment).id,
        };
    }


    private getAuthorizationCredentials(
        policy: AuthPolicy
    ): CredentialDataInput {
        switch (policy) {
            case AuthPolicy.None:
                return null;
            case AuthPolicy.Basic:
                return {
                    basic: {
                        username: this.deviceCreateAuthorizationFormGroup.get(
                            'authCredentialsBasicUsername'
                        ).value,
                        password: this.deviceCreateAuthorizationFormGroup.get(
                            'authCredentialsBasicPassword'
                        ).value,
                    },
                };
            case AuthPolicy.OAuth:
                return {
                    oauth: {
                        clientId: this.deviceCreateAuthorizationFormGroup.get(
                            'authCredentialsOAuthClientID'
                        ).value,
                        clientSecret:
                            this.deviceCreateAuthorizationFormGroup.get(
                                'authCredentialsOAuthClientSecret'
                            ).value,
                        url: this.deviceCreateAuthorizationFormGroup.get(
                            'authCredentialsOAuthURL'
                        ).value,
                    },
                };
            case AuthPolicy.Certificate:
                return {
                    certificateOAuth: {
                        clientId: this.deviceCreateAuthorizationFormGroup.get(
                            'authCredentialsCertificateClientID'
                        ).value,
                        url: this.deviceCreateAuthorizationFormGroup.get(
                            'authCredentialsCertificateClientSecret'
                        ).value,
                        certificate:
                            this.deviceCreateAuthorizationFormGroup.get(
                                'authCredentialsCertificateClientCert'
                            ).value,
                    },
                };
            case AuthPolicy.Bearer:
                return {
                    bearerToken: {
                        token: this.deviceCreateAuthorizationFormGroup.get(
                            'authCredentialsBearerToken'
                        ).value,
                    },
                };
        }
    }

    private _filterStates(value: DataModelInfoFragment): DataModelInfoFragment[] {
        const filterValue = value.name.toLowerCase();

        return this.dataModels.filter(state => state.name.toLowerCase().includes(filterValue));
    }
}
