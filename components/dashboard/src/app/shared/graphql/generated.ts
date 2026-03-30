import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Any: { input: any; output: any; }
  JSON: { input: any; output: any; }
  PageCursor: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
  _Any: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

export enum AggregationType {
  Average = 'AVERAGE',
  LastWeek = 'LAST_WEEK',
  Sum = 'SUM'
}

export type Auth = {
  __typename?: 'Auth';
  accessStrategy?: Maybe<Scalars['String']['output']>;
  credentialForDevice?: Maybe<CredentialData>;
  credentialForService?: Maybe<Scalars['String']['output']>;
};

export type AuthInput = {
  accessStrategy?: InputMaybe<Scalars['String']['input']>;
  credentialForDevice?: InputMaybe<CredentialDataInput>;
  credentialForService?: InputMaybe<Scalars['String']['input']>;
};

export type BasicCredentialData = {
  __typename?: 'BasicCredentialData';
  password: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type BasicCredentialDataInput = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type BearerTokenCredentialData = {
  __typename?: 'BearerTokenCredentialData';
  token: Scalars['String']['output'];
};

export type CertificateOAuthCredentialData = {
  __typename?: 'CertificateOAuthCredentialData';
  certificate: Scalars['String']['output'];
  clientId: Scalars['ID']['output'];
  url: Scalars['String']['output'];
};

export type CertificateOAuthCredentialDataInput = {
  certificate: Scalars['String']['input'];
  clientId: Scalars['ID']['input'];
  url: Scalars['String']['input'];
};

export type CredentialData = BasicCredentialData | BearerTokenCredentialData | CertificateOAuthCredentialData | OAuthCredentialData;

export type CredentialDataInput = {
  basic?: InputMaybe<BasicCredentialDataInput>;
  bearerToken?: InputMaybe<TokenCredentialDataInput>;
  certificateOAuth?: InputMaybe<CertificateOAuthCredentialDataInput>;
  oauth?: InputMaybe<OAuthCredentialDataInput>;
};

export type DataModel = {
  __typename?: 'DataModel';
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  schema: Scalars['JSON']['output'];
  updatedAt?: Maybe<Scalars['Timestamp']['output']>;
};

export type DataModelInput = {
  description: Scalars['String']['input'];
  name: Scalars['String']['input'];
  schema: Scalars['JSON']['input'];
};

export type Device = {
  __typename?: 'Device';
  auth?: Maybe<Auth>;
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  dataModel?: Maybe<DataModel>;
  description?: Maybe<Scalars['String']['output']>;
  host?: Maybe<Host>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  status: DeviceStatus;
  tenantId: Scalars['ID']['output'];
  updatedAt?: Maybe<Scalars['Timestamp']['output']>;
};

export type DeviceInput = {
  auth?: InputMaybe<AuthInput>;
  dataModel: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  host?: InputMaybe<HostInput>;
  name: Scalars['String']['input'];
  status: DeviceStatus;
};

export type DevicePage = Pageable & {
  __typename?: 'DevicePage';
  data: Array<Device>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum DeviceStatus {
  Active = 'ACTIVE',
  Error = 'ERROR',
  Initial = 'INITIAL',
  Unreachable = 'UNREACHABLE'
}

export type Host = {
  __typename?: 'Host';
  id: Scalars['ID']['output'];
  turnOffEndpoint?: Maybe<Scalars['String']['output']>;
  turnOnEndpoint?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type HostInput = {
  turnOffEndpoint?: InputMaybe<Scalars['String']['input']>;
  turnOnEndpoint?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createDataModel: DataModel;
  createDevice: Device;
  createWidget: Widget;
  deleteDataModel: Scalars['String']['output'];
  deleteDevice: Scalars['String']['output'];
  deleteWidget: Scalars['String']['output'];
  generateDeviceToken: Scalars['String']['output'];
  setDeviceOperation: Device;
  setOperation: Scalars['Boolean']['output'];
  updateDataModel: DataModel;
};


export type MutationCreateDataModelArgs = {
  input: DataModelInput;
};


export type MutationCreateDeviceArgs = {
  input: DeviceInput;
};


export type MutationCreateWidgetArgs = {
  input: WidgetInput;
};


export type MutationDeleteDataModelArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteDeviceArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteWidgetArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetDeviceOperationArgs = {
  id: Scalars['ID']['input'];
  op: OperationType;
};


export type MutationSetOperationArgs = {
  data?: InputMaybe<Scalars['Any']['input']>;
  op: OperationType;
};


export type MutationUpdateDataModelArgs = {
  id: Scalars['ID']['input'];
  input: DataModelInput;
};

export type OAuthCredentialData = {
  __typename?: 'OAuthCredentialData';
  clientId: Scalars['ID']['output'];
  clientSecret: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type OAuthCredentialDataInput = {
  clientId: Scalars['ID']['input'];
  clientSecret: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export enum OperationType {
  SendEmail = 'SEND_EMAIL',
  SendEmailWithContent = 'SEND_EMAIL_WITH_CONTENT',
  TurnOff = 'TURN_OFF',
  TurnOn = 'TURN_ON'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Scalars['PageCursor']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  startCursor: Scalars['PageCursor']['output'];
};

export type Pageable = {
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  _service: _Service;
  dataModels: Array<Maybe<DataModel>>;
  device?: Maybe<Device>;
  deviceByIdAndAggregation?: Maybe<Device>;
  devices: Array<Maybe<Device>>;
  devicesPage: DevicePage;
  testDeviceConnection: Scalars['Boolean']['output'];
  widget?: Maybe<Widget>;
  widgets: Array<Maybe<Widget>>;
  widgetsPage: WidgetPage;
};


export type QueryDeviceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceByIdAndAggregationArgs = {
  aggregation: AggregationType;
  id: Scalars['ID']['input'];
};


export type QueryDevicesPageArgs = {
  after?: InputMaybe<Scalars['PageCursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTestDeviceConnectionArgs = {
  url: Scalars['String']['input'];
};


export type QueryWidgetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWidgetsPageArgs = {
  after?: InputMaybe<Scalars['PageCursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type TokenCredentialDataInput = {
  token: Scalars['String']['input'];
};

export type Widget = {
  __typename?: 'Widget';
  code: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  deviceIds?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  status: WidgetStatus;
  tenantId: Scalars['ID']['output'];
  updatedAt?: Maybe<Scalars['Timestamp']['output']>;
  workspace: Scalars['String']['output'];
};

export type WidgetInput = {
  code: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  deviceIds?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  status: WidgetStatus;
  workspace: Scalars['String']['input'];
};

export type WidgetPage = Pageable & {
  __typename?: 'WidgetPage';
  data: Array<Widget>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum WidgetStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type _Service = {
  __typename?: '_Service';
  sdl?: Maybe<Scalars['String']['output']>;
};

export type DataModelInfoFragment = { __typename?: 'DataModel', id: string, name: string, description: string, schema: any, createdAt?: any | null, updatedAt?: any | null };

export type ListDataModelsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDataModelsQuery = { __typename?: 'Query', dataModels: Array<{ __typename?: 'DataModel', id: string, name: string, description: string, schema: any, createdAt?: any | null, updatedAt?: any | null } | null> };

export type CreateDataModelMutationVariables = Exact<{
  input: DataModelInput;
}>;


export type CreateDataModelMutation = { __typename?: 'Mutation', createDataModel: { __typename?: 'DataModel', id: string, name: string, description: string, schema: any, createdAt?: any | null, updatedAt?: any | null } };

export type DeleteDataModelMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDataModelMutation = { __typename?: 'Mutation', deleteDataModel: string };

export type DeviceInfoFragment = { __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
      | { __typename?: 'BasicCredentialData', username: string, password: string }
      | { __typename?: 'BearerTokenCredentialData', token: string }
      | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
      | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
     | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null };

export type GetAllDevicesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllDevicesQuery = { __typename?: 'Query', devices: Array<{ __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
        | { __typename?: 'BasicCredentialData', username: string, password: string }
        | { __typename?: 'BearerTokenCredentialData', token: string }
        | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
        | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
       | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null } | null> };

export type GetDevicesPageQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['PageCursor']['input']>;
}>;


export type GetDevicesPageQuery = { __typename?: 'Query', devicesPage: { __typename?: 'DevicePage', totalCount: number, data: Array<{ __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
          | { __typename?: 'BasicCredentialData', username: string, password: string }
          | { __typename?: 'BearerTokenCredentialData', token: string }
          | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
          | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
         | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null }>, pageInfo: { __typename?: 'PageInfo', startCursor: any, endCursor: any, hasNextPage: boolean } } };

export type CreateDeviceMutationVariables = Exact<{
  input: DeviceInput;
}>;


export type CreateDeviceMutation = { __typename?: 'Mutation', createDevice: { __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
        | { __typename?: 'BasicCredentialData', username: string, password: string }
        | { __typename?: 'BearerTokenCredentialData', token: string }
        | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
        | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
       | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null } };

export type DeleteDeviceMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteDeviceMutation = { __typename?: 'Mutation', deleteDevice: string };

export type GenerateDeviceTokenMutationVariables = Exact<{ [key: string]: never; }>;


export type GenerateDeviceTokenMutation = { __typename?: 'Mutation', generateDeviceToken: string };

export type TestDeviceConnectionQueryVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type TestDeviceConnectionQuery = { __typename?: 'Query', testDeviceConnection: boolean };

export type WidgetInfoFragment = { __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null };

export type GetAllWidgetsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllWidgetsQuery = { __typename?: 'Query', widgets: Array<{ __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null } | null> };

export type GetWidgetsPageQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['PageCursor']['input']>;
}>;


export type GetWidgetsPageQuery = { __typename?: 'Query', widgetsPage: { __typename?: 'WidgetPage', totalCount: number, data: Array<{ __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null }>, pageInfo: { __typename?: 'PageInfo', startCursor: any, endCursor: any, hasNextPage: boolean } } };

export type CreateWidgetMutationVariables = Exact<{
  input: WidgetInput;
}>;


export type CreateWidgetMutation = { __typename?: 'Mutation', createWidget: { __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null } };

export type DeleteWidgetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWidgetMutation = { __typename?: 'Mutation', deleteWidget: string };

export const DataModelInfoFragmentDoc = gql`
    fragment DataModelInfo on DataModel {
  id
  name
  description
  schema
  createdAt
  updatedAt
}
    `;
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
export const ListDataModelsDocument = gql`
    query ListDataModels {
  dataModels {
    ...DataModelInfo
  }
}
    ${DataModelInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class ListDataModelsGQL extends Apollo.Query<ListDataModelsQuery, ListDataModelsQueryVariables> {
    document = ListDataModelsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const CreateDataModelDocument = gql`
    mutation CreateDataModel($input: DataModelInput!) {
  createDataModel(input: $input) {
    ...DataModelInfo
  }
}
    ${DataModelInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class CreateDataModelGQL extends Apollo.Mutation<CreateDataModelMutation, CreateDataModelMutationVariables> {
    document = CreateDataModelDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const DeleteDataModelDocument = gql`
    mutation DeleteDataModel($id: ID!) {
  deleteDataModel(id: $id)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class DeleteDataModelGQL extends Apollo.Mutation<DeleteDataModelMutation, DeleteDataModelMutationVariables> {
    document = DeleteDataModelDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
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
export const GetDevicesPageDocument = gql`
    query GetDevicesPage($first: Int, $after: PageCursor) {
  devicesPage(first: $first, after: $after) {
    data {
      ...DeviceInfo
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
    }
    totalCount
  }
}
    ${DeviceInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDevicesPageGQL extends Apollo.Query<GetDevicesPageQuery, GetDevicesPageQueryVariables> {
    document = GetDevicesPageDocument;
    
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
export const GenerateDeviceTokenDocument = gql`
    mutation GenerateDeviceToken {
  generateDeviceToken
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GenerateDeviceTokenGQL extends Apollo.Mutation<GenerateDeviceTokenMutation, GenerateDeviceTokenMutationVariables> {
    document = GenerateDeviceTokenDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const TestDeviceConnectionDocument = gql`
    query TestDeviceConnection($url: String!) {
  testDeviceConnection(url: $url)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class TestDeviceConnectionGQL extends Apollo.Query<TestDeviceConnectionQuery, TestDeviceConnectionQueryVariables> {
    document = TestDeviceConnectionDocument;
    
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
export const GetWidgetsPageDocument = gql`
    query GetWidgetsPage($first: Int, $after: PageCursor) {
  widgetsPage(first: $first, after: $after) {
    data {
      ...WidgetInfo
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
    }
    totalCount
  }
}
    ${WidgetInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetWidgetsPageGQL extends Apollo.Query<GetWidgetsPageQuery, GetWidgetsPageQueryVariables> {
    document = GetWidgetsPageDocument;
    
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