import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { AuthPolicy } from '../../../../../shared/services/device/device.interface';
import { CredentialDataInput } from '../../../../../shared/graphql/generated';

export interface DeviceAuthFormValue {
  communicationToDevice: boolean;
  communicationToServer: boolean;
  authPolicy: AuthPolicy;
  credentials: CredentialDataInput | null;
  serverToken: string;
}

@Component({
  standalone: false,
  selector: 'app-device-auth-form',
  templateUrl: './device-auth-form.component.html',
  styleUrls: ['./device-auth-form.component.scss'],
})
export class DeviceAuthFormComponent implements OnInit {
  @Input() initialData?: Partial<DeviceAuthFormValue>;
  @Output() formReady = new EventEmitter<UntypedFormGroup>();
  @Output() generateToken = new EventEmitter<void>();

  @ViewChild('tokenInput') public tokenInput: ElementRef<HTMLInputElement>;

  public form: UntypedFormGroup;
  public selectedAuthorizationPolicy: AuthPolicy = AuthPolicy.None;
  public readonly authorizationPolicies: AuthPolicy[] = [
    AuthPolicy.None,
    AuthPolicy.Basic,
    AuthPolicy.OAuth,
    AuthPolicy.Certificate,
    AuthPolicy.Bearer,
  ];
  public authPolicy = AuthPolicy;

  /** Per-field secret visibility toggles (all masked by default). */
  public secretVisible: {
    basicPassword: boolean;
    oauthClientSecret: boolean;
    bearerToken: boolean;
  } = {
    basicPassword: false,
    oauthClientSecret: false,
    bearerToken: false,
  };

  constructor(private fb: UntypedFormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      communicationToDevice: [false],
      communicationToServer: [false],
      authCredentialsBasicUsername: [''],
      authCredentialsBasicPassword: [''],
      authCredentialsOAuthClientID: [''],
      authCredentialsOAuthClientSecret: [''],
      authCredentialsOAuthURL: [''],
      authCredentialsCertificateClientID: [''],
      authCredentialsCertificateClientSecret: [''],
      authCredentialsCertificateClientCert: [''],
      authCredentialsBearerToken: [''],
    });

    this.formReady.emit(this.form);
  }

  public onEnableConnectionClick(event: Event, communication: string): void {
    event.stopPropagation();
    // Token generation is handled by parent after device creation
  }

  public setToken(token: string): void {
    if (this.tokenInput) {
      this.tokenInput.nativeElement.value = token;
    }
  }

  public getToken(): string {
    return this.tokenInput?.nativeElement?.value || '';
  }

  public copyToken(): void {
    if (this.tokenInput?.nativeElement) {
      this.tokenInput.nativeElement.select();
      navigator.clipboard.writeText(this.tokenInput.nativeElement.value);
    }
  }

  public getValue(): DeviceAuthFormValue {
    return {
      communicationToDevice: this.form.get('communicationToDevice')?.value,
      communicationToServer: this.form.get('communicationToServer')?.value,
      authPolicy: this.selectedAuthorizationPolicy,
      credentials: this.getAuthorizationCredentials(),
      serverToken: this.getToken(),
    };
  }

  public shouldGenerateToken(): boolean {
    return this.form.get('communicationToServer')?.value;
  }

  public reset(): void {
    this.form.reset();
    this.selectedAuthorizationPolicy = AuthPolicy.None;
    if (this.tokenInput) {
      this.tokenInput.nativeElement.value = '';
    }
  }

  private getAuthorizationCredentials(): CredentialDataInput | null {
    switch (this.selectedAuthorizationPolicy) {
      case AuthPolicy.None:
        return null;
      case AuthPolicy.Basic:
        return {
          basic: {
            username: this.form.get('authCredentialsBasicUsername')?.value,
            password: this.form.get('authCredentialsBasicPassword')?.value,
          },
        };
      case AuthPolicy.OAuth:
        return {
          oauth: {
            clientId: this.form.get('authCredentialsOAuthClientID')?.value,
            clientSecret: this.form.get('authCredentialsOAuthClientSecret')?.value,
            url: this.form.get('authCredentialsOAuthURL')?.value,
          },
        };
      case AuthPolicy.Certificate:
        return {
          certificateOAuth: {
            clientId: this.form.get('authCredentialsCertificateClientID')?.value,
            url: this.form.get('authCredentialsCertificateClientSecret')?.value,
            certificate: this.form.get('authCredentialsCertificateClientCert')?.value,
          },
        };
      case AuthPolicy.Bearer:
        return {
          bearerToken: {
            token: this.form.get('authCredentialsBearerToken')?.value,
          },
        };
    }
  }
}
