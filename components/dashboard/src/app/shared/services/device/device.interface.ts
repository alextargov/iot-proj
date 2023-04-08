export interface IDevice {
  _id?: string;
  userID: string;
  name: string;
  description: string;
  host: IDeviceHost;

  credentials?: IDeviceCredentials
  status: DeviceStatus;
  dataOutput: IDeviceDataOutput[];
  // dataOutputUnit: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface IDeviceHost {
  url?: string;
  turnOnEndpoint?: string;
  turnOffEndpoint?: string;
}

export interface IDeviceCredentials {
  type: AuthPolicy,
  credentials?: IDeviceCredentialsBasic | IDeviceCredentialsOAuth | IDeviceCredentialsCertificate | IDeviceCredentialsBearer;
}

export interface IDeviceCredentialsBearer {
  token: string;
}

export interface IDeviceCredentialsBasic {
  username: string;
  password: string;
}

export interface IDeviceCredentialsOAuth {
  clientID: string;
  clientSecret: string;
}

export interface IDeviceCredentialsCertificate {
  clientID: string;
  clientSecret: string;
  certificate: string
}

export interface IDeviceDataOutput {
  key: string,
  name: string
}

export enum AuthPolicy {
  None = "None",
  Basic = "Basic",
  OAuth = "OAuth",
  Certificate = "Certificate",
  Bearer = "Bearer Token",
}

export enum DeviceStatus {
  INITIAL = 'INITIAL',
  ACTIVE = 'ACTIVE',
  UNREACHABLE = 'UNREACHABLE',
  ERROR = 'ERROR'
}

export interface IDevicePage {
  data: IDevice[],
  pageInfo: {
    start: string,
    cursor: string,
  }
}
