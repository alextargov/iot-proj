import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {COMMA, ENTER} from "@angular/cdk/keycodes";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {Observable} from "rxjs";
import {map, startWith} from 'rxjs/operators';
import {MatStepper} from "@angular/material/stepper";
import slugify from "slugify";
import {DeviceService} from "../../../shared/services/device/device.service";
import {
  AuthPolicy,
  DeviceStatus,
  IDevice,
  IDeviceCredentialsBasic, IDeviceCredentialsBearer,
  IDeviceCredentialsCertificate,
  IDeviceCredentialsOAuth
} from "../../../shared/services/device/device.interface";
import {ToastrService} from "../../../shared/services/toastr/toastr.service";
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-device-create',
  templateUrl: './device-create.component.html',
  styleUrls: ['./device-create.component.scss'],
})
export class DeviceCreateComponent implements OnInit, AfterViewInit {
  public deviceCreateMetadataFormGroup: FormGroup;
  public deviceCreateAuthorizationFormGroup: FormGroup;
  public deviceCreateOutputFormGroup: FormGroup;
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

  constructor(private fb: FormBuilder, private deviceService: DeviceService, private toast: ToastrService) {
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
    return this.deviceCreateOutputFormGroup.controls["dataOutput"] as FormControl;
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
    console.log(data)
    this.deviceService.createDevice(data).subscribe(() => {
      console.log('success')
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

  private convertToModel(): IDevice {
    return {
      userID: "",
      name: this.deviceCreateMetadataFormGroup.get("name").value,
      description: this.deviceCreateMetadataFormGroup.get("description").value,
      host: {
        url:  this.deviceCreateMetadataFormGroup.get("deviceURL").value,
        turnOffEndpoint:  this.deviceCreateMetadataFormGroup.get("turnOffEndpoint").value,
        turnOnEndpoint: this.deviceCreateMetadataFormGroup.get("turnOnEndpoint").value
      },
      status: DeviceStatus.INITIAL,
      credentials: {
        type: this.selectedAuthorizationPolicy,
        credentials: this.getAuthorizationCredentials(this.selectedAuthorizationPolicy)
      },
      dataOutput: this.dataOutputTypes
      // dataOutputUnit: ""
    }
  }

  private getAuthorizationCredentials(policy: AuthPolicy): IDeviceCredentialsBasic | IDeviceCredentialsOAuth | IDeviceCredentialsCertificate | IDeviceCredentialsBearer {
    switch (policy) {
      case AuthPolicy.None:
        return null;
      case AuthPolicy.Basic:
        return {
          username: this.deviceCreateAuthorizationFormGroup.get("authCredentialsBasicUsername").value,
          password: this.deviceCreateAuthorizationFormGroup.get("authCredentialsBasicPassword").value,
        }
      case AuthPolicy.OAuth:
        return {
          clientID: this.deviceCreateAuthorizationFormGroup.get("authCredentialsOAuthClientID").value,
          clientSecret: this.deviceCreateAuthorizationFormGroup.get("authCredentialsOAuthClientSecret").value,
        }
      case AuthPolicy.Certificate:
        return {
          clientID: this.deviceCreateAuthorizationFormGroup.get("authCredentialsCertificateClientID").value,
          clientSecret: this.deviceCreateAuthorizationFormGroup.get("authCredentialsCertificateClientSecret").value,
          certificate: this.deviceCreateAuthorizationFormGroup.get("authCredentialsCertificateCert").value,
        }
      case AuthPolicy.Bearer:
        return {
          token: this.deviceCreateAuthorizationFormGroup.get("authCredentialsBearerToken").value,
        }
    }
  }

  private _filterDataTypes(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.allDataOutputTypes.filter(dataType => dataType.toLowerCase().includes(filterValue));
  }

}
