import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from "@angular/forms";
import {COMMA, ENTER} from "@angular/cdk/keycodes";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {Observable} from "rxjs";
import {map, startWith} from 'rxjs/operators';
import {MatStepper} from "@angular/material/stepper";
import slugify from "slugify";
import {DeviceService} from "../../../shared/services/device/device.service";
import {
  AuthPolicy,
  IDevice,
  IDeviceCredentialsBasic, IDeviceCredentialsBearer,
  IDeviceCredentialsCertificate,
  IDeviceCredentialsOAuth
} from "../../../shared/services/device/device.interface";
import {ToastrService} from "../../../shared/services/toastr/toastr.service";
import { v4 as uuidv4 } from 'uuid';
import {
  AuthInput,
  BasicCredentialDataInput,
  CredentialDataInput,
  DeviceInput,
  DeviceStatus, InputMaybe
} from "../../../shared/graphql/generated";

@Component({
  selector: 'app-device-create',
  templateUrl: './device-create.component.html',
  styleUrls: ['./device-create.component.scss'],
})
export class DeviceCreateComponent implements OnInit, AfterViewInit {
  public deviceCreateMetadataFormGroup: UntypedFormGroup;
  public deviceCreateAuthorizationFormGroup: UntypedFormGroup;
  public deviceCreateOutputFormGroup: UntypedFormGroup;
  public readonly authorizationPolicies: AuthPolicy[] = [AuthPolicy.None, AuthPolicy.Basic, AuthPolicy.OAuth, AuthPolicy.Certificate, AuthPolicy.Bearer];
  public selectedAuthorizationPolicy: AuthPolicy = AuthPolicy.None;
  public authPolicy = AuthPolicy;
  public filteredDataTypes: Observable<string[]>;
  public readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  public dataOutputTypes: {key: string, name: string}[] = [];
  public communicationToDeviceEnabled: boolean = false
  public communicationToServerEnabled: boolean = false

  private readonly  allDataOutputTypes: string[] = [
    "Degrees Celsius",
    "Degrees Kelvin",
    "Degrees Fahrenheit",
    "%",
    "Watt",
    "Amp",
    "Volt",
    "Pascal",
    "Lumen"
  ];

  @ViewChild('dataOutputInput') dataOutputInput: ElementRef<HTMLInputElement>;
  @ViewChild('tokenInput') tokenInput: ElementRef<HTMLInputElement>;
  @ViewChild('deviceStepper') stepper: MatStepper;

  constructor(private fb: UntypedFormBuilder, private deviceService: DeviceService, private toast: ToastrService) {
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
      dataOutput: [],
    });

    this.filteredDataTypes = this.dataOutputControl.valueChanges.pipe(
      startWith(null),
      map((dataType: string | null) => (dataType ? this._filterDataTypes(dataType) : this.allDataOutputTypes.slice())),
    );
  }

  public ngAfterViewInit() {
    this.stepper.reset()
  }

  get dataOutputControl() {
    return this.deviceCreateOutputFormGroup.controls["dataOutput"] as UntypedFormControl;
  }

  public removeDataOutputType(dataOutputType: string): void {
    const index = this.dataOutputTypes.findIndex((ot) => ot.name === dataOutputType);

    if (index >= 0) {
      this.dataOutputTypes.splice(index, 1);
    }
  }

  public selectedDataType(event: MatAutocompleteSelectedEvent): void {
    console.log(this.dataOutputInput.nativeElement.blur())
    this.dataOutputTypes.push({
      name: event.option.viewValue,
      key: slugify(event.option.viewValue, { lower: true })
    });
    this.dataOutputInput.nativeElement.value = '';
    this.dataOutputControl.setValue(null);
  }

  public onResetClick(stepper: MatStepper): void {
    this.deviceCreateMetadataFormGroup.reset();
    this.deviceCreateAuthorizationFormGroup.reset();
    this.selectedAuthorizationPolicy = AuthPolicy.None;
    this.dataOutputTypes = [];
    stepper.reset();
  }

  public isDataTypeOptionDisabled(dataTypeName: string): boolean {
    return this.dataOutputTypes.findIndex((ot) => ot.name === dataTypeName) >= 0
  }

  public onSaveClick(): void {
    const data = this.convertToModel();
    this.deviceService.createDevice(data).subscribe((data) => {
      console.log('success', data)
      this.toast.showSuccess("Successfully created device")
    })
  }

  public onEnableConnectionClick(event: KeyboardEvent, communication: string) {
    event.stopPropagation();
    setTimeout(() => {
      if (communication === 'deviceToServer' && this.deviceCreateAuthorizationFormGroup.get('communicationToServer').value) {
        // TODO: Invoke server to generate a token

        this.tokenInput.nativeElement.value = uuidv4()
      }
    });

  }

    private convertToModel(): DeviceInput {
        const host = this.deviceCreateMetadataFormGroup.get("deviceURL").value ? {
            url:  this.deviceCreateMetadataFormGroup.get("deviceURL").value,
            turnOffEndpoint:  this.deviceCreateMetadataFormGroup.get("turnOffEndpoint").value,
            turnOnEndpoint: this.deviceCreateMetadataFormGroup.get("turnOnEndpoint").value
        } : null;
        return {
            name: this.deviceCreateMetadataFormGroup.get("name").value,
            description: this.deviceCreateMetadataFormGroup.get("description").value,
            host,
            status: DeviceStatus.Active,
            auth: {
                credential: this.getAuthorizationCredentials(this.selectedAuthorizationPolicy)
            },
              // dataOutput: this.dataOutputTypes
              // dataOutputUnit: ""
        }
  }

  private getAuthorizationCredentials(policy: AuthPolicy): CredentialDataInput {
    switch (policy) {
      case AuthPolicy.None:
        return null;
      case AuthPolicy.Basic:
        return {
          basic: {
            username: this.deviceCreateAuthorizationFormGroup.get("authCredentialsBasicUsername").value,
            password: this.deviceCreateAuthorizationFormGroup.get("authCredentialsBasicPassword").value,
          }
        };
      case AuthPolicy.OAuth:
        return {
          oauth: {
            clientId: this.deviceCreateAuthorizationFormGroup.get("authCredentialsOAuthClientID").value,
            clientSecret: this.deviceCreateAuthorizationFormGroup.get("authCredentialsOAuthClientSecret").value,
            url: this.deviceCreateAuthorizationFormGroup.get("authCredentialsOAuthURL").value,
          }
        };
      case AuthPolicy.Certificate:
        return {
          certificateOAuth: {
            clientId: this.deviceCreateAuthorizationFormGroup.get("authCredentialsCertificateClientID").value,
            url: this.deviceCreateAuthorizationFormGroup.get("authCredentialsCertificateClientSecret").value,
            certificate: this.deviceCreateAuthorizationFormGroup.get("authCredentialsCertificateCert").value,
          }
        };
      case AuthPolicy.Bearer:
        return {
          bearerToken: {
            token: this.deviceCreateAuthorizationFormGroup.get("authCredentialsBearerToken").value,
          },
        }
    }
  }

  private _filterDataTypes(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.allDataOutputTypes.filter(dataType => dataType.toLowerCase().includes(filterValue));
  }

}
