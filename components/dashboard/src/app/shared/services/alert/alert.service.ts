import { Observable, map } from 'rxjs';
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { FetchResult } from '@apollo/client/core';

// GraphQL Documents
const GetAlertRulesDocument = gql`
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

const GetAlertRuleDocument = gql`
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

const GetAlertEventsDocument = gql`
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

const CreateAlertRuleDocument = gql`
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

const UpdateAlertRuleDocument = gql`
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

const DeleteAlertRuleDocument = gql`
    mutation DeleteAlertRule($id: ID!) {
        deleteAlertRule(id: $id)
    }
`;

const AcknowledgeAlertEventDocument = gql`
    mutation AcknowledgeAlertEvent($id: ID!) {
        acknowledgeAlertEvent(id: $id) {
            id
            status
        }
    }
`;

// Interfaces
export enum AlertSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL',
}

export enum AlertConditionOperator {
    GT = 'GT',
    LT = 'LT',
    EQ = 'EQ',
    GTE = 'GTE',
    LTE = 'LTE',
    NE = 'NE',
}

export enum AlertEventStatus {
    TRIGGERED = 'TRIGGERED',
    RESOLVED = 'RESOLVED',
    ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export interface AlertCondition {
    id: string;
    metricName: string;
    operator: AlertConditionOperator;
    threshold: number;
}

export interface AlertConditionGroup {
    groupId: number;
    conditions: AlertCondition[];
}

export interface AlertNotification {
    id: string;
    type: string;
    config: string;
}

export interface AlertRule {
    id: string;
    name: string;
    description?: string;
    severity: AlertSeverity;
    enabled: boolean;
    cooldownMinutes: number;
    conditions: AlertConditionGroup[];
    notifications: AlertNotification[];
    lastTriggeredAt?: string;
    createdAt?: string;
    updatedAt?: string;
    device?: {
        id: string;
        name: string;
    };
}

export interface AlertEvent {
    id: string;
    triggeredValues: string;
    status: AlertEventStatus;
    triggeredAt: string;
    resolvedAt?: string;
}

export interface AlertRulePage {
    data: AlertRule[];
    pageInfo: {
        startCursor: string;
        endCursor: string;
        hasNextPage: boolean;
    };
    totalCount: number;
}

export interface AlertEventPage {
    data: AlertEvent[];
    pageInfo: {
        startCursor: string;
        endCursor: string;
        hasNextPage: boolean;
    };
    totalCount: number;
}

export interface AlertConditionInput {
    groupId: number;
    metricName: string;
    operator: AlertConditionOperator;
    threshold: number;
}

export interface AlertNotificationInput {
    type: string;
    config: string;
}

export interface CreateAlertRuleInput {
    deviceId: string;
    name: string;
    description?: string;
    severity?: AlertSeverity;
    cooldownMinutes?: number;
    conditions: AlertConditionInput[];
    notifications: AlertNotificationInput[];
}

export interface UpdateAlertRuleInput {
    name?: string;
    description?: string;
    severity?: AlertSeverity;
    enabled?: boolean;
    cooldownMinutes?: number;
    conditions?: AlertConditionInput[];
    notifications?: AlertNotificationInput[];
}

// Query response types
interface GetAlertRulesQuery {
    alertRules: AlertRulePage;
}

interface GetAlertRuleQuery {
    alertRule: AlertRule | null;
}

interface GetAlertEventsQuery {
    alertEvents: AlertEventPage;
}

interface CreateAlertRuleMutation {
    createAlertRule: AlertRule;
}

interface UpdateAlertRuleMutation {
    updateAlertRule: AlertRule;
}

interface DeleteAlertRuleMutation {
    deleteAlertRule: string;
}

interface AcknowledgeAlertEventMutation {
    acknowledgeAlertEvent: AlertEvent;
}

@Injectable({
    providedIn: 'root',
})
export class AlertService {
    constructor(private readonly apollo: Apollo) {}

    public getAlertRules(
        deviceId?: string,
        first?: number,
        after?: string
    ): Observable<AlertRulePage> {
        return this.apollo
            .query<GetAlertRulesQuery>({
                query: GetAlertRulesDocument,
                variables: { deviceId, first, after },
                fetchPolicy: 'network-only',
            })
            .pipe(
                map((res) => res.data.alertRules)
            );
    }

    public getAlertRule(id: string): Observable<AlertRule | null> {
        return this.apollo
            .query<GetAlertRuleQuery>({
                query: GetAlertRuleDocument,
                variables: { id },
                fetchPolicy: 'network-only',
            })
            .pipe(map((res) => res.data.alertRule));
    }

    public getAlertEvents(
        deviceId?: string,
        ruleId?: string,
        first?: number,
        after?: string
    ): Observable<AlertEventPage> {
        return this.apollo
            .query<GetAlertEventsQuery>({
                query: GetAlertEventsDocument,
                variables: { deviceId, ruleId, first, after },
                fetchPolicy: 'network-only',
            })
            .pipe(map((res) => res.data.alertEvents));
    }

    public createAlertRule(
        input: CreateAlertRuleInput
    ): Observable<FetchResult<CreateAlertRuleMutation>> {
        return this.apollo.mutate<CreateAlertRuleMutation>({
            mutation: CreateAlertRuleDocument,
            variables: { input },
        });
    }

    public updateAlertRule(
        id: string,
        input: UpdateAlertRuleInput
    ): Observable<FetchResult<UpdateAlertRuleMutation>> {
        return this.apollo.mutate<UpdateAlertRuleMutation>({
            mutation: UpdateAlertRuleDocument,
            variables: { id, input },
        });
    }

    public deleteAlertRule(
        id: string
    ): Observable<FetchResult<DeleteAlertRuleMutation>> {
        return this.apollo.mutate<DeleteAlertRuleMutation>({
            mutation: DeleteAlertRuleDocument,
            variables: { id },
        });
    }

    public acknowledgeAlertEvent(
        id: string
    ): Observable<FetchResult<AcknowledgeAlertEventMutation>> {
        return this.apollo.mutate<AcknowledgeAlertEventMutation>({
            mutation: AcknowledgeAlertEventDocument,
            variables: { id },
        });
    }

    // Helper to get operator display text
    public getOperatorDisplay(operator: AlertConditionOperator): string {
        switch (operator) {
            case AlertConditionOperator.GT:
                return '>';
            case AlertConditionOperator.LT:
                return '<';
            case AlertConditionOperator.EQ:
                return '=';
            case AlertConditionOperator.GTE:
                return '>=';
            case AlertConditionOperator.LTE:
                return '<=';
            case AlertConditionOperator.NE:
                return '!=';
            default:
                return operator;
        }
    }

    // Helper to get severity color
    public getSeverityColor(severity: AlertSeverity): string {
        switch (severity) {
            case AlertSeverity.CRITICAL:
                return 'warn';
            case AlertSeverity.WARNING:
                return 'accent';
            case AlertSeverity.INFO:
            default:
                return 'primary';
        }
    }
}
