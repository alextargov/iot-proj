import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Any: any;
  PageCursor: any;
  Timestamp: any;
  _Any: any;
  _FieldSet: any;
};

export enum AggregationType {
  Average = 'AVERAGE',
  LastWeek = 'LAST_WEEK',
  Sum = 'SUM'
}

export type Auth = {
  __typename?: 'Auth';
  accessStrategy?: Maybe<Scalars['String']>;
  credentialForDevice?: Maybe<CredentialData>;
  credentialForService?: Maybe<Scalars['String']>;
};

export type AuthInput = {
  accessStrategy?: InputMaybe<Scalars['String']>;
  credentialForDevice?: InputMaybe<CredentialDataInput>;
  credentialForService?: InputMaybe<Scalars['String']>;
};

export type BasicCredentialData = {
  __typename?: 'BasicCredentialData';
  password: Scalars['String'];
  username: Scalars['String'];
};

export type BasicCredentialDataInput = {
  password: Scalars['String'];
  username: Scalars['String'];
};

export type BearerTokenCredentialData = {
  __typename?: 'BearerTokenCredentialData';
  token: Scalars['String'];
};

export type CertificateOAuthCredentialData = {
  __typename?: 'CertificateOAuthCredentialData';
  certificate: Scalars['String'];
  clientId: Scalars['ID'];
  url: Scalars['String'];
};

export type CertificateOAuthCredentialDataInput = {
  certificate: Scalars['String'];
  clientId: Scalars['ID'];
  url: Scalars['String'];
};

export type CredentialData = BasicCredentialData | BearerTokenCredentialData | CertificateOAuthCredentialData | OAuthCredentialData;

export type CredentialDataInput = {
  basic?: InputMaybe<BasicCredentialDataInput>;
  bearerToken?: InputMaybe<TokenCredentialDataInput>;
  certificateOAuth?: InputMaybe<CertificateOAuthCredentialDataInput>;
  oauth?: InputMaybe<OAuthCredentialDataInput>;
};

export type Device = {
  __typename?: 'Device';
  auth?: Maybe<Auth>;
  createdAt?: Maybe<Scalars['Timestamp']>;
  description?: Maybe<Scalars['String']>;
  host?: Maybe<Host>;
  id: Scalars['ID'];
  name: Scalars['String'];
  status: DeviceStatus;
  tenantId: Scalars['ID'];
  updatedAt?: Maybe<Scalars['Timestamp']>;
};

export type DeviceInput = {
  auth?: InputMaybe<AuthInput>;
  description?: InputMaybe<Scalars['String']>;
  host?: InputMaybe<HostInput>;
  name: Scalars['String'];
  status: DeviceStatus;
};

export type DevicePage = Pageable & {
  __typename?: 'DevicePage';
  data: Array<Device>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int'];
};

export enum DeviceStatus {
  Active = 'ACTIVE',
  Error = 'ERROR',
  Initial = 'INITIAL',
  Unreachable = 'UNREACHABLE'
}

export type Host = {
  __typename?: 'Host';
  id: Scalars['ID'];
  turnOffEndpoint?: Maybe<Scalars['String']>;
  turnOnEndpoint?: Maybe<Scalars['String']>;
  url: Scalars['String'];
};

export type HostInput = {
  turnOffEndpoint?: InputMaybe<Scalars['String']>;
  turnOnEndpoint?: InputMaybe<Scalars['String']>;
  url: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createDevice: Device;
  createWidget: Widget;
  deleteDevice: Scalars['String'];
  deleteWidget: Scalars['String'];
  setDeviceOperation: Device;
  setOperation: Scalars['Boolean'];
};


export type MutationCreateDeviceArgs = {
  input: DeviceInput;
};


export type MutationCreateWidgetArgs = {
  input: WidgetInput;
};


export type MutationDeleteDeviceArgs = {
  id: Scalars['String'];
};


export type MutationDeleteWidgetArgs = {
  id: Scalars['ID'];
};


export type MutationSetDeviceOperationArgs = {
  id: Scalars['ID'];
  op: OperationType;
};


export type MutationSetOperationArgs = {
  data?: InputMaybe<Scalars['Any']>;
  op: OperationType;
};

export type OAuthCredentialData = {
  __typename?: 'OAuthCredentialData';
  clientId: Scalars['ID'];
  clientSecret: Scalars['String'];
  url: Scalars['String'];
};

export type OAuthCredentialDataInput = {
  clientId: Scalars['ID'];
  clientSecret: Scalars['String'];
  url: Scalars['String'];
};

export enum OperationType {
  SendEmail = 'SEND_EMAIL',
  SendEmailWithContent = 'SEND_EMAIL_WITH_CONTENT',
  TurnOff = 'TURN_OFF',
  TurnOn = 'TURN_ON'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Scalars['PageCursor'];
  hasNextPage: Scalars['Boolean'];
  startCursor: Scalars['PageCursor'];
};

export type Pageable = {
  pageInfo: PageInfo;
  totalCount: Scalars['Int'];
};

export type Query = {
  __typename?: 'Query';
  device?: Maybe<Device>;
  deviceByIdAndAggregation?: Maybe<Device>;
  devices: Array<Maybe<Device>>;
  widget?: Maybe<Widget>;
  widgets: Array<Maybe<Widget>>;
};


export type QueryDeviceArgs = {
  id: Scalars['ID'];
};


export type QueryDeviceByIdAndAggregationArgs = {
  aggregation: AggregationType;
  id: Scalars['ID'];
};


export type QueryWidgetArgs = {
  id: Scalars['ID'];
};

export type TokenCredentialDataInput = {
  token: Scalars['String'];
};

export type Widget = {
  __typename?: 'Widget';
  code: Scalars['String'];
  createdAt?: Maybe<Scalars['Timestamp']>;
  description?: Maybe<Scalars['String']>;
  deviceIds?: Maybe<Array<Scalars['String']>>;
  id: Scalars['ID'];
  name: Scalars['String'];
  status: WidgetStatus;
  tenantId: Scalars['ID'];
  updatedAt?: Maybe<Scalars['Timestamp']>;
  workspace: Scalars['String'];
};

export type WidgetInput = {
  code: Scalars['String'];
  description?: InputMaybe<Scalars['String']>;
  deviceIds?: InputMaybe<Array<Scalars['String']>>;
  name: Scalars['String'];
  status: WidgetStatus;
  workspace: Scalars['String'];
};

export enum WidgetStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type DeviceInfoFragment = { __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?: { __typename?: 'BasicCredentialData', username: string, password: string } | { __typename?: 'BearerTokenCredentialData', token: string } | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string } | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string } | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null };

export type GetAllDevicesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllDevicesQuery = { __typename?: 'Query', devices: Array<{ __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?: { __typename?: 'BasicCredentialData', username: string, password: string } | { __typename?: 'BearerTokenCredentialData', token: string } | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string } | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string } | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null } | null> };

export type CreateDeviceMutationVariables = Exact<{
  input: DeviceInput;
}>;


export type CreateDeviceMutation = { __typename?: 'Mutation', createDevice: { __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?: { __typename?: 'BasicCredentialData', username: string, password: string } | { __typename?: 'BearerTokenCredentialData', token: string } | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string } | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string } | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null } };

export type DeleteDeviceMutationVariables = Exact<{
  id: Scalars['String'];
}>;


export type DeleteDeviceMutation = { __typename?: 'Mutation', deleteDevice: string };

export type WidgetInfoFragment = { __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null };

export type GetAllWidgetsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllWidgetsQuery = { __typename?: 'Query', widgets: Array<{ __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null } | null> };

export type CreateWidgetMutationVariables = Exact<{
  input: WidgetInput;
}>;


export type CreateWidgetMutation = { __typename?: 'Mutation', createWidget: { __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null } };

export type DeleteWidgetMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteWidgetMutation = { __typename?: 'Mutation', deleteWidget: string };

export const DeviceInfoFragmentDoc = gql`
    fragment DeviceInfo on Device {
  id
  name
  description
  status
  tenantId
  auth {
    credentialForDevice {
      ... on BasicCredentialData {
        username
        password
      }
      ... on OAuthCredentialData {
        clientId
        clientSecret
        url
      }
      ... on CertificateOAuthCredentialData {
        clientId
        certificate
        url
      }
      ... on BearerTokenCredentialData {
        token
      }
    }
    credentialForService
  }
  host {
    id
    url
    turnOnEndpoint
    turnOffEndpoint
  }
  createdAt
  updatedAt
}
    `;
export const WidgetInfoFragmentDoc = gql`
    fragment WidgetInfo on Widget {
  id
  name
  description
  status
  tenantId
  code
  workspace
  deviceIds
  createdAt
  updatedAt
}
    `;
export const GetAllDevicesDocument = gql`
    query GetAllDevices {
  devices {
    ...DeviceInfo
  }
}
    ${DeviceInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetAllDevicesGQL extends Apollo.Query<GetAllDevicesQuery, GetAllDevicesQueryVariables> {
    document = GetAllDevicesDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const CreateDeviceDocument = gql`
    mutation CreateDevice($input: DeviceInput!) {
  createDevice(input: $input) {
    ...DeviceInfo
  }
}
    ${DeviceInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class CreateDeviceGQL extends Apollo.Mutation<CreateDeviceMutation, CreateDeviceMutationVariables> {
    document = CreateDeviceDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const DeleteDeviceDocument = gql`
    mutation DeleteDevice($id: String!) {
  deleteDevice(id: $id)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class DeleteDeviceGQL extends Apollo.Mutation<DeleteDeviceMutation, DeleteDeviceMutationVariables> {
    document = DeleteDeviceDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetAllWidgetsDocument = gql`
    query GetAllWidgets {
  widgets {
    ...WidgetInfo
  }
}
    ${WidgetInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetAllWidgetsGQL extends Apollo.Query<GetAllWidgetsQuery, GetAllWidgetsQueryVariables> {
    document = GetAllWidgetsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const CreateWidgetDocument = gql`
    mutation CreateWidget($input: WidgetInput!) {
  createWidget(input: $input) {
    ...WidgetInfo
  }
}
    ${WidgetInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class CreateWidgetGQL extends Apollo.Mutation<CreateWidgetMutation, CreateWidgetMutationVariables> {
    document = CreateWidgetDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const DeleteWidgetDocument = gql`
    mutation DeleteWidget($id: ID!) {
  deleteWidget(id: $id)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class DeleteWidgetGQL extends Apollo.Mutation<DeleteWidgetMutation, DeleteWidgetMutationVariables> {
    document = DeleteWidgetDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }