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

export type AggregatedMetric = {
  __typename?: 'AggregatedMetric';
  count: Scalars['Int']['output'];
  endTime: Scalars['Timestamp']['output'];
  max: Scalars['Float']['output'];
  metricName: Scalars['String']['output'];
  min: Scalars['Float']['output'];
  startTime: Scalars['Timestamp']['output'];
  value: Scalars['Float']['output'];
};

export enum AggregationType {
  Average = 'AVERAGE',
  Count = 'COUNT',
  LastDay = 'LAST_DAY',
  LastHour = 'LAST_HOUR',
  LastWeek = 'LAST_WEEK',
  Max = 'MAX',
  Min = 'MIN',
  Sum = 'SUM'
}

export type AlertCondition = {
  __typename?: 'AlertCondition';
  id: Scalars['ID']['output'];
  metricName: Scalars['String']['output'];
  operator: AlertConditionOperator;
  threshold: Scalars['Float']['output'];
};

export type AlertConditionGroup = {
  __typename?: 'AlertConditionGroup';
  conditions: Array<AlertCondition>;
  groupId: Scalars['Int']['output'];
};

export type AlertConditionInput = {
  groupId: Scalars['Int']['input'];
  metricName: Scalars['String']['input'];
  operator: AlertConditionOperator;
  threshold: Scalars['Float']['input'];
};

export enum AlertConditionOperator {
  Eq = 'EQ',
  Gt = 'GT',
  Gte = 'GTE',
  Lt = 'LT',
  Lte = 'LTE',
  Ne = 'NE'
}

export type AlertEvent = {
  __typename?: 'AlertEvent';
  id: Scalars['ID']['output'];
  resolvedAt?: Maybe<Scalars['Timestamp']['output']>;
  status: AlertEventStatus;
  triggeredAt: Scalars['Timestamp']['output'];
  triggeredValues: Scalars['String']['output'];
};

export type AlertEventPage = Pageable & {
  __typename?: 'AlertEventPage';
  data: Array<AlertEvent>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum AlertEventStatus {
  Acknowledged = 'ACKNOWLEDGED',
  Resolved = 'RESOLVED',
  Triggered = 'TRIGGERED'
}

export type AlertNotification = {
  __typename?: 'AlertNotification';
  config: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  type: Scalars['String']['output'];
};

export type AlertNotificationInput = {
  config: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type AlertRule = {
  __typename?: 'AlertRule';
  conditions: Array<AlertConditionGroup>;
  cooldownMinutes: Scalars['Int']['output'];
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  device: Device;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  lastTriggeredAt?: Maybe<Scalars['Timestamp']['output']>;
  name: Scalars['String']['output'];
  notifications: Array<AlertNotification>;
  severity: AlertSeverity;
  updatedAt?: Maybe<Scalars['Timestamp']['output']>;
};

export type AlertRulePage = Pageable & {
  __typename?: 'AlertRulePage';
  data: Array<AlertRule>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum AlertSeverity {
  Critical = 'CRITICAL',
  Info = 'INFO',
  Warning = 'WARNING'
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

export type CreateAlertRuleInput = {
  conditions: Array<AlertConditionInput>;
  cooldownMinutes?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  deviceId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  notifications: Array<AlertNotificationInput>;
  severity?: InputMaybe<AlertSeverity>;
};

export type CredentialData = BasicCredentialData | BearerTokenCredentialData | CertificateOAuthCredentialData | OAuthCredentialData;

export type CredentialDataInput = {
  basic?: InputMaybe<BasicCredentialDataInput>;
  bearerToken?: InputMaybe<TokenCredentialDataInput>;
  certificateOAuth?: InputMaybe<CertificateOAuthCredentialDataInput>;
  oauth?: InputMaybe<OAuthCredentialDataInput>;
};

export type DashboardLayout = {
  __typename?: 'DashboardLayout';
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  refreshIntervalSeconds: Scalars['Int']['output'];
  tenantId: Scalars['ID']['output'];
  updatedAt?: Maybe<Scalars['Timestamp']['output']>;
  widgets: Array<DashboardWidget>;
};

export type DashboardLayoutInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  refreshIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
};

export type DashboardWidget = {
  __typename?: 'DashboardWidget';
  config: Scalars['JSON']['output'];
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  dashboardLayoutId: Scalars['ID']['output'];
  device?: Maybe<Device>;
  gridCols: Scalars['Int']['output'];
  gridRows: Scalars['Int']['output'];
  gridX: Scalars['Int']['output'];
  gridY: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  metricName?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['Timestamp']['output']>;
  widgetType: DashboardWidgetType;
};

export type DashboardWidgetInput = {
  config: Scalars['JSON']['input'];
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  gridCols: Scalars['Int']['input'];
  gridRows: Scalars['Int']['input'];
  gridX: Scalars['Int']['input'];
  gridY: Scalars['Int']['input'];
  metricName?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  widgetType: DashboardWidgetType;
};

export enum DashboardWidgetType {
  Gauge = 'GAUGE',
  LineChart = 'LINE_CHART',
  StatusIndicator = 'STATUS_INDICATOR',
  StatCard = 'STAT_CARD',
  Table = 'TABLE'
}

export type DataModel = {
  __typename?: 'DataModel';
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  currentVersion: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  deviceCount: Scalars['Int']['output'];
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

export type DataModelVersion = {
  __typename?: 'DataModelVersion';
  changeDescription?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Timestamp']['output'];
  createdBy?: Maybe<Scalars['ID']['output']>;
  dataModelId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  schema: Scalars['JSON']['output'];
  versionNumber: Scalars['Int']['output'];
};

export type UpdateDataModelInput = {
  changeDescription?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  schema?: InputMaybe<Scalars['JSON']['input']>;
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
  tags?: Maybe<Array<Scalars['String']['output']>>;
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
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type DeviceMetric = {
  __typename?: 'DeviceMetric';
  deviceId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  metricName: Scalars['String']['output'];
  metricValue: Scalars['Float']['output'];
  recordedAt: Scalars['Timestamp']['output'];
  unit?: Maybe<Scalars['String']['output']>;
};

export type DeviceMetricInput = {
  deviceId: Scalars['ID']['input'];
  metricName: Scalars['String']['input'];
  metricValue: Scalars['Float']['input'];
  recordedAt?: InputMaybe<Scalars['Timestamp']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
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

export type MetricFilterInput = {
  endTime?: InputMaybe<Scalars['Timestamp']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  metricName?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['Timestamp']['input']>;
};

export type MetricSeries = {
  __typename?: 'MetricSeries';
  dataPoints: Array<DeviceMetric>;
  metricName: Scalars['String']['output'];
  unit?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  acknowledgeAlertEvent: AlertEvent;
  addDashboardWidget: DashboardWidget;
  createAlertRule: AlertRule;
  createDashboardLayout: DashboardLayout;
  createDataModel: DataModel;
  createDevice: Device;
  createWidget: Widget;
  deleteAlertRule: Scalars['ID']['output'];
  deleteDashboardLayout: Scalars['ID']['output'];
  deleteDashboardWidget: Scalars['ID']['output'];
  deleteDataModel: Scalars['String']['output'];
  deleteDevice: Scalars['String']['output'];
  deleteWidget: Scalars['String']['output'];
  generateDeviceToken: Scalars['String']['output'];
  recordDeviceMetric: DeviceMetric;
  recordDeviceMetrics: Scalars['Boolean']['output'];
  rollbackDataModel: DataModel;
  setDeviceOperation: Device;
  setOperation: Scalars['Boolean']['output'];
  updateAlertRule: AlertRule;
  updateDashboardLayout: DashboardLayout;
  updateDashboardWidget: DashboardWidget;
  updateDataModel: DataModel;
  updateWidgetPositions: Scalars['Boolean']['output'];
};


export type MutationAcknowledgeAlertEventArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAddDashboardWidgetArgs = {
  input: DashboardWidgetInput;
  layoutId: Scalars['ID']['input'];
};


export type MutationCreateAlertRuleArgs = {
  input: CreateAlertRuleInput;
};


export type MutationCreateDashboardLayoutArgs = {
  input: DashboardLayoutInput;
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


export type MutationDeleteAlertRuleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteDashboardLayoutArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteDashboardWidgetArgs = {
  id: Scalars['ID']['input'];
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


export type MutationRecordDeviceMetricArgs = {
  input: DeviceMetricInput;
};


export type MutationRecordDeviceMetricsArgs = {
  inputs: Array<DeviceMetricInput>;
};


export type MutationSetDeviceOperationArgs = {
  id: Scalars['ID']['input'];
  op: OperationType;
};


export type MutationSetOperationArgs = {
  data?: InputMaybe<Scalars['Any']['input']>;
  op: OperationType;
};


export type MutationUpdateAlertRuleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAlertRuleInput;
};


export type MutationUpdateDashboardLayoutArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDashboardLayoutInput;
};


export type MutationUpdateDashboardWidgetArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDashboardWidgetInput;
};


export type MutationUpdateDataModelArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDataModelInput;
};

export type MutationRollbackDataModelArgs = {
  dataModelId: Scalars['ID']['input'];
  toVersion: Scalars['Int']['input'];
};


export type MutationUpdateWidgetPositionsArgs = {
  layoutId: Scalars['ID']['input'];
  positions: Array<WidgetPositionInput>;
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
  alertEvents: AlertEventPage;
  alertRule?: Maybe<AlertRule>;
  alertRules: AlertRulePage;
  dashboardLayout?: Maybe<DashboardLayout>;
  dashboardLayouts: Array<DashboardLayout>;
  dataModels: Array<Maybe<DataModel>>;
  dataModelVersion?: Maybe<DataModelVersion>;
  dataModelVersions: Array<DataModelVersion>;
  defaultDashboardLayout?: Maybe<DashboardLayout>;
  device?: Maybe<Device>;
  deviceAggregatedMetrics?: Maybe<AggregatedMetric>;
  deviceByIdAndAggregation?: Maybe<Device>;
  deviceMetrics: Array<DeviceMetric>;
  deviceMetricsSeries: Array<MetricSeries>;
  devices: Array<Maybe<Device>>;
  devicesPage: DevicePage;
  testDeviceConnection: Scalars['Boolean']['output'];
  widget?: Maybe<Widget>;
  widgets: Array<Maybe<Widget>>;
  widgetsPage: WidgetPage;
};


export type QueryAlertEventsArgs = {
  after?: InputMaybe<Scalars['PageCursor']['input']>;
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  ruleId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAlertRuleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAlertRulesArgs = {
  after?: InputMaybe<Scalars['PageCursor']['input']>;
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDashboardLayoutArgs = {
  id: Scalars['ID']['input'];
};

export type QueryDataModelVersionArgs = {
  dataModelId: Scalars['ID']['input'];
  version: Scalars['Int']['input'];
};

export type QueryDataModelVersionsArgs = {
  dataModelId: Scalars['ID']['input'];
};


export type QueryDeviceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceAggregatedMetricsArgs = {
  aggregation: AggregationType;
  deviceId: Scalars['ID']['input'];
  filter?: InputMaybe<MetricFilterInput>;
};


export type QueryDeviceByIdAndAggregationArgs = {
  aggregation: AggregationType;
  id: Scalars['ID']['input'];
};


export type QueryDeviceMetricsArgs = {
  deviceId: Scalars['ID']['input'];
  filter?: InputMaybe<MetricFilterInput>;
};


export type QueryDeviceMetricsSeriesArgs = {
  deviceId: Scalars['ID']['input'];
  filter?: InputMaybe<MetricFilterInput>;
  metricNames?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type UpdateAlertRuleInput = {
  conditions?: InputMaybe<Array<AlertConditionInput>>;
  cooldownMinutes?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notifications?: InputMaybe<Array<AlertNotificationInput>>;
  severity?: InputMaybe<AlertSeverity>;
};

export type UpdateDashboardLayoutInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  refreshIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateDashboardWidgetInput = {
  config?: InputMaybe<Scalars['JSON']['input']>;
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  gridCols?: InputMaybe<Scalars['Int']['input']>;
  gridRows?: InputMaybe<Scalars['Int']['input']>;
  gridX?: InputMaybe<Scalars['Int']['input']>;
  gridY?: InputMaybe<Scalars['Int']['input']>;
  metricName?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type Widget = {
  __typename?: 'Widget';
  code: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  deviceIds?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  lastExecutedAt?: Maybe<Scalars['Timestamp']['output']>;
  name: Scalars['String']['output'];
  schedule?: Maybe<Scalars['String']['output']>;
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
  schedule?: InputMaybe<Scalars['String']['input']>;
  status: WidgetStatus;
  workspace: Scalars['String']['input'];
};

export type WidgetPage = Pageable & {
  __typename?: 'WidgetPage';
  data: Array<Widget>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WidgetPositionInput = {
  gridCols: Scalars['Int']['input'];
  gridRows: Scalars['Int']['input'];
  gridX: Scalars['Int']['input'];
  gridY: Scalars['Int']['input'];
  widgetId: Scalars['ID']['input'];
};

export enum WidgetStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type _Service = {
  __typename?: '_Service';
  sdl?: Maybe<Scalars['String']['output']>;
};

export type GetAlertRulesQueryVariables = Exact<{
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['PageCursor']['input']>;
}>;


export type GetAlertRulesQuery = { __typename?: 'Query', alertRules: { __typename?: 'AlertRulePage', totalCount: number, data: Array<{ __typename?: 'AlertRule', id: string, name: string, description?: string | null, severity: AlertSeverity, enabled: boolean, cooldownMinutes: number, lastTriggeredAt?: any | null, createdAt?: any | null, updatedAt?: any | null, conditions: Array<{ __typename?: 'AlertConditionGroup', groupId: number, conditions: Array<{ __typename?: 'AlertCondition', id: string, metricName: string, operator: AlertConditionOperator, threshold: number }> }>, notifications: Array<{ __typename?: 'AlertNotification', id: string, type: string, config: string }>, device: { __typename?: 'Device', id: string, name: string } }>, pageInfo: { __typename?: 'PageInfo', startCursor: any, endCursor: any, hasNextPage: boolean } } };

export type GetAlertRuleQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetAlertRuleQuery = { __typename?: 'Query', alertRule?: { __typename?: 'AlertRule', id: string, name: string, description?: string | null, severity: AlertSeverity, enabled: boolean, cooldownMinutes: number, lastTriggeredAt?: any | null, createdAt?: any | null, updatedAt?: any | null, conditions: Array<{ __typename?: 'AlertConditionGroup', groupId: number, conditions: Array<{ __typename?: 'AlertCondition', id: string, metricName: string, operator: AlertConditionOperator, threshold: number }> }>, notifications: Array<{ __typename?: 'AlertNotification', id: string, type: string, config: string }>, device: { __typename?: 'Device', id: string, name: string } } | null };

export type GetAlertEventsQueryVariables = Exact<{
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  ruleId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['PageCursor']['input']>;
}>;


export type GetAlertEventsQuery = { __typename?: 'Query', alertEvents: { __typename?: 'AlertEventPage', totalCount: number, data: Array<{ __typename?: 'AlertEvent', id: string, triggeredValues: string, status: AlertEventStatus, triggeredAt: any, resolvedAt?: any | null }>, pageInfo: { __typename?: 'PageInfo', startCursor: any, endCursor: any, hasNextPage: boolean } } };

export type CreateAlertRuleMutationVariables = Exact<{
  input: CreateAlertRuleInput;
}>;


export type CreateAlertRuleMutation = { __typename?: 'Mutation', createAlertRule: { __typename?: 'AlertRule', id: string, name: string, description?: string | null, severity: AlertSeverity, enabled: boolean, cooldownMinutes: number, createdAt?: any | null, conditions: Array<{ __typename?: 'AlertConditionGroup', groupId: number, conditions: Array<{ __typename?: 'AlertCondition', id: string, metricName: string, operator: AlertConditionOperator, threshold: number }> }>, notifications: Array<{ __typename?: 'AlertNotification', id: string, type: string, config: string }> } };

export type UpdateAlertRuleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateAlertRuleInput;
}>;


export type UpdateAlertRuleMutation = { __typename?: 'Mutation', updateAlertRule: { __typename?: 'AlertRule', id: string, name: string, description?: string | null, severity: AlertSeverity, enabled: boolean, cooldownMinutes: number, updatedAt?: any | null, conditions: Array<{ __typename?: 'AlertConditionGroup', groupId: number, conditions: Array<{ __typename?: 'AlertCondition', id: string, metricName: string, operator: AlertConditionOperator, threshold: number }> }>, notifications: Array<{ __typename?: 'AlertNotification', id: string, type: string, config: string }> } };

export type DeleteAlertRuleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAlertRuleMutation = { __typename?: 'Mutation', deleteAlertRule: string };

export type AcknowledgeAlertEventMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AcknowledgeAlertEventMutation = { __typename?: 'Mutation', acknowledgeAlertEvent: { __typename?: 'AlertEvent', id: string, status: AlertEventStatus } };

export type DashboardWidgetInfoFragment = { __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null };

export type DashboardLayoutInfoFragment = { __typename?: 'DashboardLayout', id: string, tenantId: string, name: string, description?: string | null, isDefault: boolean, refreshIntervalSeconds: number, createdAt?: any | null, updatedAt?: any | null, widgets: Array<{ __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null }> };

export type GetDashboardLayoutsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDashboardLayoutsQuery = { __typename?: 'Query', dashboardLayouts: Array<{ __typename?: 'DashboardLayout', id: string, tenantId: string, name: string, description?: string | null, isDefault: boolean, refreshIntervalSeconds: number, createdAt?: any | null, updatedAt?: any | null, widgets: Array<{ __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null }> }> };

export type GetDashboardLayoutQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDashboardLayoutQuery = { __typename?: 'Query', dashboardLayout?: { __typename?: 'DashboardLayout', id: string, tenantId: string, name: string, description?: string | null, isDefault: boolean, refreshIntervalSeconds: number, createdAt?: any | null, updatedAt?: any | null, widgets: Array<{ __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null }> } | null };

export type GetDefaultDashboardLayoutQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDefaultDashboardLayoutQuery = { __typename?: 'Query', defaultDashboardLayout?: { __typename?: 'DashboardLayout', id: string, tenantId: string, name: string, description?: string | null, isDefault: boolean, refreshIntervalSeconds: number, createdAt?: any | null, updatedAt?: any | null, widgets: Array<{ __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null }> } | null };

export type CreateDashboardLayoutMutationVariables = Exact<{
  input: DashboardLayoutInput;
}>;


export type CreateDashboardLayoutMutation = { __typename?: 'Mutation', createDashboardLayout: { __typename?: 'DashboardLayout', id: string, tenantId: string, name: string, description?: string | null, isDefault: boolean, refreshIntervalSeconds: number, createdAt?: any | null, updatedAt?: any | null, widgets: Array<{ __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null }> } };

export type UpdateDashboardLayoutMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDashboardLayoutInput;
}>;


export type UpdateDashboardLayoutMutation = { __typename?: 'Mutation', updateDashboardLayout: { __typename?: 'DashboardLayout', id: string, tenantId: string, name: string, description?: string | null, isDefault: boolean, refreshIntervalSeconds: number, createdAt?: any | null, updatedAt?: any | null, widgets: Array<{ __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null }> } };

export type DeleteDashboardLayoutMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDashboardLayoutMutation = { __typename?: 'Mutation', deleteDashboardLayout: string };

export type AddDashboardWidgetMutationVariables = Exact<{
  layoutId: Scalars['ID']['input'];
  input: DashboardWidgetInput;
}>;


export type AddDashboardWidgetMutation = { __typename?: 'Mutation', addDashboardWidget: { __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null } };

export type UpdateDashboardWidgetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDashboardWidgetInput;
}>;


export type UpdateDashboardWidgetMutation = { __typename?: 'Mutation', updateDashboardWidget: { __typename?: 'DashboardWidget', id: string, dashboardLayoutId: string, widgetType: DashboardWidgetType, title: string, gridX: number, gridY: number, gridCols: number, gridRows: number, metricName?: string | null, config: any, createdAt?: any | null, updatedAt?: any | null } };

export type DeleteDashboardWidgetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDashboardWidgetMutation = { __typename?: 'Mutation', deleteDashboardWidget: string };

export type UpdateWidgetPositionsMutationVariables = Exact<{
  layoutId: Scalars['ID']['input'];
  positions: Array<WidgetPositionInput> | WidgetPositionInput;
}>;


export type UpdateWidgetPositionsMutation = { __typename?: 'Mutation', updateWidgetPositions: boolean };

export type DataModelInfoFragment = { __typename?: 'DataModel', id: string, name: string, description: string, schema: any, deviceCount: number, currentVersion: number, createdAt?: any | null, updatedAt?: any | null };

export type DataModelVersionInfoFragment = { __typename?: 'DataModelVersion', id: string, dataModelId: string, versionNumber: number, schema: any, changeDescription?: string | null, createdAt: any, createdBy?: string | null };

export type ListDataModelsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDataModelsQuery = { __typename?: 'Query', dataModels: Array<{ __typename?: 'DataModel', id: string, name: string, description: string, schema: any, deviceCount: number, currentVersion: number, createdAt?: any | null, updatedAt?: any | null } | null> };

export type ListDataModelVersionsQueryVariables = Exact<{
  dataModelId: Scalars['ID']['input'];
}>;


export type ListDataModelVersionsQuery = { __typename?: 'Query', dataModelVersions: Array<{ __typename?: 'DataModelVersion', id: string, dataModelId: string, versionNumber: number, schema: any, changeDescription?: string | null, createdAt: any, createdBy?: string | null }> };

export type GetDataModelVersionQueryVariables = Exact<{
  dataModelId: Scalars['ID']['input'];
  version: Scalars['Int']['input'];
}>;


export type GetDataModelVersionQuery = { __typename?: 'Query', dataModelVersion?: { __typename?: 'DataModelVersion', id: string, dataModelId: string, versionNumber: number, schema: any, changeDescription?: string | null, createdAt: any, createdBy?: string | null } | null };

export type CreateDataModelMutationVariables = Exact<{
  input: DataModelInput;
}>;


export type CreateDataModelMutation = { __typename?: 'Mutation', createDataModel: { __typename?: 'DataModel', id: string, name: string, description: string, schema: any, deviceCount: number, currentVersion: number, createdAt?: any | null, updatedAt?: any | null } };

export type UpdateDataModelMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDataModelInput;
}>;


export type UpdateDataModelMutation = { __typename?: 'Mutation', updateDataModel: { __typename?: 'DataModel', id: string, name: string, description: string, schema: any, deviceCount: number, currentVersion: number, createdAt?: any | null, updatedAt?: any | null } };

export type RollbackDataModelMutationVariables = Exact<{
  dataModelId: Scalars['ID']['input'];
  toVersion: Scalars['Int']['input'];
}>;


export type RollbackDataModelMutation = { __typename?: 'Mutation', rollbackDataModel: { __typename?: 'DataModel', id: string, name: string, description: string, schema: any, deviceCount: number, currentVersion: number, createdAt?: any | null, updatedAt?: any | null } };

export type DeleteDataModelMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDataModelMutation = { __typename?: 'Mutation', deleteDataModel: string };

export type DeviceInfoFragment = { __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, tags?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
      | { __typename?: 'BasicCredentialData', username: string, password: string }
      | { __typename?: 'BearerTokenCredentialData', token: string }
      | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
      | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
     | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null };

export type GetAllDevicesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllDevicesQuery = { __typename?: 'Query', devices: Array<{ __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, tags?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
        | { __typename?: 'BasicCredentialData', username: string, password: string }
        | { __typename?: 'BearerTokenCredentialData', token: string }
        | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
        | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
       | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null } | null> };

export type GetDeviceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDeviceQuery = { __typename?: 'Query', device?: { __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, tags?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
        | { __typename?: 'BasicCredentialData', username: string, password: string }
        | { __typename?: 'BearerTokenCredentialData', token: string }
        | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
        | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
       | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null } | null };

export type GetDevicesPageQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['PageCursor']['input']>;
}>;


export type GetDevicesPageQuery = { __typename?: 'Query', devicesPage: { __typename?: 'DevicePage', totalCount: number, data: Array<{ __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, tags?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
          | { __typename?: 'BasicCredentialData', username: string, password: string }
          | { __typename?: 'BearerTokenCredentialData', token: string }
          | { __typename?: 'CertificateOAuthCredentialData', clientId: string, certificate: string, url: string }
          | { __typename?: 'OAuthCredentialData', clientId: string, clientSecret: string, url: string }
         | null } | null, host?: { __typename?: 'Host', id: string, url: string, turnOnEndpoint?: string | null, turnOffEndpoint?: string | null } | null }>, pageInfo: { __typename?: 'PageInfo', startCursor: any, endCursor: any, hasNextPage: boolean } } };

export type CreateDeviceMutationVariables = Exact<{
  input: DeviceInput;
}>;


export type CreateDeviceMutation = { __typename?: 'Mutation', createDevice: { __typename?: 'Device', id: string, name: string, description?: string | null, status: DeviceStatus, tenantId: string, tags?: Array<string> | null, createdAt?: any | null, updatedAt?: any | null, auth?: { __typename?: 'Auth', credentialForService?: string | null, credentialForDevice?:
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

export type DeviceMetricInfoFragment = { __typename?: 'DeviceMetric', id: string, deviceId: string, metricName: string, metricValue: number, unit?: string | null, recordedAt: any };

export type MetricSeriesInfoFragment = { __typename?: 'MetricSeries', metricName: string, unit?: string | null, dataPoints: Array<{ __typename?: 'DeviceMetric', id: string, deviceId: string, metricName: string, metricValue: number, unit?: string | null, recordedAt: any }> };

export type AggregatedMetricInfoFragment = { __typename?: 'AggregatedMetric', metricName: string, value: number, count: number, min: number, max: number, startTime: any, endTime: any };

export type GetDeviceMetricsQueryVariables = Exact<{
  deviceId: Scalars['ID']['input'];
  filter?: InputMaybe<MetricFilterInput>;
}>;


export type GetDeviceMetricsQuery = { __typename?: 'Query', deviceMetrics: Array<{ __typename?: 'DeviceMetric', id: string, deviceId: string, metricName: string, metricValue: number, unit?: string | null, recordedAt: any }> };

export type GetDeviceMetricsSeriesQueryVariables = Exact<{
  deviceId: Scalars['ID']['input'];
  metricNames?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  filter?: InputMaybe<MetricFilterInput>;
}>;


export type GetDeviceMetricsSeriesQuery = { __typename?: 'Query', deviceMetricsSeries: Array<{ __typename?: 'MetricSeries', metricName: string, unit?: string | null, dataPoints: Array<{ __typename?: 'DeviceMetric', id: string, deviceId: string, metricName: string, metricValue: number, unit?: string | null, recordedAt: any }> }> };

export type GetDeviceAggregatedMetricsQueryVariables = Exact<{
  deviceId: Scalars['ID']['input'];
  aggregation: AggregationType;
  filter?: InputMaybe<MetricFilterInput>;
}>;


export type GetDeviceAggregatedMetricsQuery = { __typename?: 'Query', deviceAggregatedMetrics?: { __typename?: 'AggregatedMetric', metricName: string, value: number, count: number, min: number, max: number, startTime: any, endTime: any } | null };

export type RecordDeviceMetricMutationVariables = Exact<{
  input: DeviceMetricInput;
}>;


export type RecordDeviceMetricMutation = { __typename?: 'Mutation', recordDeviceMetric: { __typename?: 'DeviceMetric', id: string, deviceId: string, metricName: string, metricValue: number, unit?: string | null, recordedAt: any } };

export type RecordDeviceMetricsMutationVariables = Exact<{
  inputs: Array<DeviceMetricInput> | DeviceMetricInput;
}>;


export type RecordDeviceMetricsMutation = { __typename?: 'Mutation', recordDeviceMetrics: boolean };

export type WidgetInfoFragment = { __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, schedule?: string | null, lastExecutedAt?: any | null, createdAt?: any | null, updatedAt?: any | null };

export type GetAllWidgetsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllWidgetsQuery = { __typename?: 'Query', widgets: Array<{ __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, schedule?: string | null, lastExecutedAt?: any | null, createdAt?: any | null, updatedAt?: any | null } | null> };

export type GetWidgetsPageQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['PageCursor']['input']>;
}>;


export type GetWidgetsPageQuery = { __typename?: 'Query', widgetsPage: { __typename?: 'WidgetPage', totalCount: number, data: Array<{ __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, schedule?: string | null, lastExecutedAt?: any | null, createdAt?: any | null, updatedAt?: any | null }>, pageInfo: { __typename?: 'PageInfo', startCursor: any, endCursor: any, hasNextPage: boolean } } };

export type CreateWidgetMutationVariables = Exact<{
  input: WidgetInput;
}>;


export type CreateWidgetMutation = { __typename?: 'Mutation', createWidget: { __typename?: 'Widget', id: string, name: string, description?: string | null, status: WidgetStatus, tenantId: string, code: string, workspace: string, deviceIds?: Array<string> | null, schedule?: string | null, lastExecutedAt?: any | null, createdAt?: any | null, updatedAt?: any | null } };

export type DeleteWidgetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWidgetMutation = { __typename?: 'Mutation', deleteWidget: string };

export const DashboardWidgetInfoFragmentDoc = gql`
    fragment DashboardWidgetInfo on DashboardWidget {
  id
  dashboardLayoutId
  widgetType
  title
  gridX
  gridY
  gridCols
  gridRows
  metricName
  config
  createdAt
  updatedAt
}
    `;
export const DashboardLayoutInfoFragmentDoc = gql`
    fragment DashboardLayoutInfo on DashboardLayout {
  id
  tenantId
  name
  description
  isDefault
  refreshIntervalSeconds
  widgets {
    ...DashboardWidgetInfo
  }
  createdAt
  updatedAt
}
    ${DashboardWidgetInfoFragmentDoc}`;
export const DataModelInfoFragmentDoc = gql`
    fragment DataModelInfo on DataModel {
  id
  name
  description
  schema
  deviceCount
  currentVersion
  createdAt
  updatedAt
}
    `;
export const DataModelVersionInfoFragmentDoc = gql`
    fragment DataModelVersionInfo on DataModelVersion {
  id
  dataModelId
  versionNumber
  schema
  changeDescription
  createdAt
  createdBy
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
  tags
  createdAt
  updatedAt
}
    `;
export const DeviceMetricInfoFragmentDoc = gql`
    fragment DeviceMetricInfo on DeviceMetric {
  id
  deviceId
  metricName
  metricValue
  unit
  recordedAt
}
    `;
export const MetricSeriesInfoFragmentDoc = gql`
    fragment MetricSeriesInfo on MetricSeries {
  metricName
  unit
  dataPoints {
    ...DeviceMetricInfo
  }
}
    ${DeviceMetricInfoFragmentDoc}`;
export const AggregatedMetricInfoFragmentDoc = gql`
    fragment AggregatedMetricInfo on AggregatedMetric {
  metricName
  value
  count
  min
  max
  startTime
  endTime
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
  schedule
  lastExecutedAt
  createdAt
  updatedAt
}
    `;
export const GetAlertRulesDocument = gql`
    query GetAlertRules($deviceId: ID, $first: Int, $after: PageCursor) {
  alertRules(deviceId: $deviceId, first: $first, after: $after) {
    data {
      id
      name
      description
      severity
      enabled
      cooldownMinutes
      conditions {
        groupId
        conditions {
          id
          metricName
          operator
          threshold
        }
      }
      notifications {
        id
        type
        config
      }
      lastTriggeredAt
      createdAt
      updatedAt
      device {
        id
        name
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetAlertRulesGQL extends Apollo.Query<GetAlertRulesQuery, GetAlertRulesQueryVariables> {
    document = GetAlertRulesDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetAlertRuleDocument = gql`
    query GetAlertRule($id: ID!) {
  alertRule(id: $id) {
    id
    name
    description
    severity
    enabled
    cooldownMinutes
    conditions {
      groupId
      conditions {
        id
        metricName
        operator
        threshold
      }
    }
    notifications {
      id
      type
      config
    }
    lastTriggeredAt
    createdAt
    updatedAt
    device {
      id
      name
    }
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetAlertRuleGQL extends Apollo.Query<GetAlertRuleQuery, GetAlertRuleQueryVariables> {
    document = GetAlertRuleDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetAlertEventsDocument = gql`
    query GetAlertEvents($deviceId: ID, $ruleId: ID, $first: Int, $after: PageCursor) {
  alertEvents(deviceId: $deviceId, ruleId: $ruleId, first: $first, after: $after) {
    data {
      id
      triggeredValues
      status
      triggeredAt
      resolvedAt
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetAlertEventsGQL extends Apollo.Query<GetAlertEventsQuery, GetAlertEventsQueryVariables> {
    document = GetAlertEventsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const CreateAlertRuleDocument = gql`
    mutation CreateAlertRule($input: CreateAlertRuleInput!) {
  createAlertRule(input: $input) {
    id
    name
    description
    severity
    enabled
    cooldownMinutes
    conditions {
      groupId
      conditions {
        id
        metricName
        operator
        threshold
      }
    }
    notifications {
      id
      type
      config
    }
    createdAt
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class CreateAlertRuleGQL extends Apollo.Mutation<CreateAlertRuleMutation, CreateAlertRuleMutationVariables> {
    document = CreateAlertRuleDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const UpdateAlertRuleDocument = gql`
    mutation UpdateAlertRule($id: ID!, $input: UpdateAlertRuleInput!) {
  updateAlertRule(id: $id, input: $input) {
    id
    name
    description
    severity
    enabled
    cooldownMinutes
    conditions {
      groupId
      conditions {
        id
        metricName
        operator
        threshold
      }
    }
    notifications {
      id
      type
      config
    }
    updatedAt
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class UpdateAlertRuleGQL extends Apollo.Mutation<UpdateAlertRuleMutation, UpdateAlertRuleMutationVariables> {
    document = UpdateAlertRuleDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const DeleteAlertRuleDocument = gql`
    mutation DeleteAlertRule($id: ID!) {
  deleteAlertRule(id: $id)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class DeleteAlertRuleGQL extends Apollo.Mutation<DeleteAlertRuleMutation, DeleteAlertRuleMutationVariables> {
    document = DeleteAlertRuleDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const AcknowledgeAlertEventDocument = gql`
    mutation AcknowledgeAlertEvent($id: ID!) {
  acknowledgeAlertEvent(id: $id) {
    id
    status
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class AcknowledgeAlertEventGQL extends Apollo.Mutation<AcknowledgeAlertEventMutation, AcknowledgeAlertEventMutationVariables> {
    document = AcknowledgeAlertEventDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetDashboardLayoutsDocument = gql`
    query GetDashboardLayouts {
  dashboardLayouts {
    ...DashboardLayoutInfo
  }
}
    ${DashboardLayoutInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDashboardLayoutsGQL extends Apollo.Query<GetDashboardLayoutsQuery, GetDashboardLayoutsQueryVariables> {
    document = GetDashboardLayoutsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetDashboardLayoutDocument = gql`
    query GetDashboardLayout($id: ID!) {
  dashboardLayout(id: $id) {
    ...DashboardLayoutInfo
  }
}
    ${DashboardLayoutInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDashboardLayoutGQL extends Apollo.Query<GetDashboardLayoutQuery, GetDashboardLayoutQueryVariables> {
    document = GetDashboardLayoutDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetDefaultDashboardLayoutDocument = gql`
    query GetDefaultDashboardLayout {
  defaultDashboardLayout {
    ...DashboardLayoutInfo
  }
}
    ${DashboardLayoutInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDefaultDashboardLayoutGQL extends Apollo.Query<GetDefaultDashboardLayoutQuery, GetDefaultDashboardLayoutQueryVariables> {
    document = GetDefaultDashboardLayoutDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const CreateDashboardLayoutDocument = gql`
    mutation CreateDashboardLayout($input: DashboardLayoutInput!) {
  createDashboardLayout(input: $input) {
    ...DashboardLayoutInfo
  }
}
    ${DashboardLayoutInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class CreateDashboardLayoutGQL extends Apollo.Mutation<CreateDashboardLayoutMutation, CreateDashboardLayoutMutationVariables> {
    document = CreateDashboardLayoutDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const UpdateDashboardLayoutDocument = gql`
    mutation UpdateDashboardLayout($id: ID!, $input: UpdateDashboardLayoutInput!) {
  updateDashboardLayout(id: $id, input: $input) {
    ...DashboardLayoutInfo
  }
}
    ${DashboardLayoutInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class UpdateDashboardLayoutGQL extends Apollo.Mutation<UpdateDashboardLayoutMutation, UpdateDashboardLayoutMutationVariables> {
    document = UpdateDashboardLayoutDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const DeleteDashboardLayoutDocument = gql`
    mutation DeleteDashboardLayout($id: ID!) {
  deleteDashboardLayout(id: $id)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class DeleteDashboardLayoutGQL extends Apollo.Mutation<DeleteDashboardLayoutMutation, DeleteDashboardLayoutMutationVariables> {
    document = DeleteDashboardLayoutDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const AddDashboardWidgetDocument = gql`
    mutation AddDashboardWidget($layoutId: ID!, $input: DashboardWidgetInput!) {
  addDashboardWidget(layoutId: $layoutId, input: $input) {
    ...DashboardWidgetInfo
  }
}
    ${DashboardWidgetInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class AddDashboardWidgetGQL extends Apollo.Mutation<AddDashboardWidgetMutation, AddDashboardWidgetMutationVariables> {
    document = AddDashboardWidgetDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const UpdateDashboardWidgetDocument = gql`
    mutation UpdateDashboardWidget($id: ID!, $input: UpdateDashboardWidgetInput!) {
  updateDashboardWidget(id: $id, input: $input) {
    ...DashboardWidgetInfo
  }
}
    ${DashboardWidgetInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class UpdateDashboardWidgetGQL extends Apollo.Mutation<UpdateDashboardWidgetMutation, UpdateDashboardWidgetMutationVariables> {
    document = UpdateDashboardWidgetDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const DeleteDashboardWidgetDocument = gql`
    mutation DeleteDashboardWidget($id: ID!) {
  deleteDashboardWidget(id: $id)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class DeleteDashboardWidgetGQL extends Apollo.Mutation<DeleteDashboardWidgetMutation, DeleteDashboardWidgetMutationVariables> {
    document = DeleteDashboardWidgetDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const UpdateWidgetPositionsDocument = gql`
    mutation UpdateWidgetPositions($layoutId: ID!, $positions: [WidgetPositionInput!]!) {
  updateWidgetPositions(layoutId: $layoutId, positions: $positions)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class UpdateWidgetPositionsGQL extends Apollo.Mutation<UpdateWidgetPositionsMutation, UpdateWidgetPositionsMutationVariables> {
    document = UpdateWidgetPositionsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
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
export const ListDataModelVersionsDocument = gql`
    query ListDataModelVersions($dataModelId: ID!) {
  dataModelVersions(dataModelId: $dataModelId) {
    ...DataModelVersionInfo
  }
}
    ${DataModelVersionInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class ListDataModelVersionsGQL extends Apollo.Query<ListDataModelVersionsQuery, ListDataModelVersionsQueryVariables> {
    document = ListDataModelVersionsDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetDataModelVersionDocument = gql`
    query GetDataModelVersion($dataModelId: ID!, $version: Int!) {
  dataModelVersion(dataModelId: $dataModelId, version: $version) {
    ...DataModelVersionInfo
  }
}
    ${DataModelVersionInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDataModelVersionGQL extends Apollo.Query<GetDataModelVersionQuery, GetDataModelVersionQueryVariables> {
    document = GetDataModelVersionDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const UpdateDataModelDocument = gql`
    mutation UpdateDataModel($id: ID!, $input: UpdateDataModelInput!) {
  updateDataModel(id: $id, input: $input) {
    ...DataModelInfo
  }
}
    ${DataModelInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class UpdateDataModelGQL extends Apollo.Mutation<UpdateDataModelMutation, UpdateDataModelMutationVariables> {
    document = UpdateDataModelDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const RollbackDataModelDocument = gql`
    mutation RollbackDataModel($dataModelId: ID!, $toVersion: Int!) {
  rollbackDataModel(dataModelId: $dataModelId, toVersion: $toVersion) {
    ...DataModelInfo
  }
}
    ${DataModelInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class RollbackDataModelGQL extends Apollo.Mutation<RollbackDataModelMutation, RollbackDataModelMutationVariables> {
    document = RollbackDataModelDocument;

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
export const GetDeviceDocument = gql`
    query GetDevice($id: ID!) {
  device(id: $id) {
    ...DeviceInfo
  }
}
    ${DeviceInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDeviceGQL extends Apollo.Query<GetDeviceQuery, GetDeviceQueryVariables> {
    document = GetDeviceDocument;
    
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
export const GetDeviceMetricsDocument = gql`
    query GetDeviceMetrics($deviceId: ID!, $filter: MetricFilterInput) {
  deviceMetrics(deviceId: $deviceId, filter: $filter) {
    ...DeviceMetricInfo
  }
}
    ${DeviceMetricInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDeviceMetricsGQL extends Apollo.Query<GetDeviceMetricsQuery, GetDeviceMetricsQueryVariables> {
    document = GetDeviceMetricsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetDeviceMetricsSeriesDocument = gql`
    query GetDeviceMetricsSeries($deviceId: ID!, $metricNames: [String!], $filter: MetricFilterInput) {
  deviceMetricsSeries(
    deviceId: $deviceId
    metricNames: $metricNames
    filter: $filter
  ) {
    ...MetricSeriesInfo
  }
}
    ${MetricSeriesInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDeviceMetricsSeriesGQL extends Apollo.Query<GetDeviceMetricsSeriesQuery, GetDeviceMetricsSeriesQueryVariables> {
    document = GetDeviceMetricsSeriesDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetDeviceAggregatedMetricsDocument = gql`
    query GetDeviceAggregatedMetrics($deviceId: ID!, $aggregation: AggregationType!, $filter: MetricFilterInput) {
  deviceAggregatedMetrics(
    deviceId: $deviceId
    aggregation: $aggregation
    filter: $filter
  ) {
    ...AggregatedMetricInfo
  }
}
    ${AggregatedMetricInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class GetDeviceAggregatedMetricsGQL extends Apollo.Query<GetDeviceAggregatedMetricsQuery, GetDeviceAggregatedMetricsQueryVariables> {
    document = GetDeviceAggregatedMetricsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const RecordDeviceMetricDocument = gql`
    mutation RecordDeviceMetric($input: DeviceMetricInput!) {
  recordDeviceMetric(input: $input) {
    ...DeviceMetricInfo
  }
}
    ${DeviceMetricInfoFragmentDoc}`;

  @Injectable({
    providedIn: 'root'
  })
  export class RecordDeviceMetricGQL extends Apollo.Mutation<RecordDeviceMetricMutation, RecordDeviceMetricMutationVariables> {
    document = RecordDeviceMetricDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const RecordDeviceMetricsDocument = gql`
    mutation RecordDeviceMetrics($inputs: [DeviceMetricInput!]!) {
  recordDeviceMetrics(inputs: $inputs)
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class RecordDeviceMetricsGQL extends Apollo.Mutation<RecordDeviceMetricsMutation, RecordDeviceMetricsMutationVariables> {
    document = RecordDeviceMetricsDocument;
    
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