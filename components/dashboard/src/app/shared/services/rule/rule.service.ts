import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
    GetAutomationRulesGQL,
    GetAutomationRuleGQL,
    CreateAutomationRuleGQL,
    UpdateAutomationRuleGQL,
    SetAutomationRuleEnabledGQL,
    DeleteAutomationRuleGQL,
    AutomationRuleInfoFragment,
    CreateAutomationRuleInput,
    UpdateAutomationRuleInput,
} from '../../graphql/generated';

@Injectable({ providedIn: 'root' })
export class RuleService {
    constructor(
        private getRulesGQL: GetAutomationRulesGQL,
        private getRuleGQL: GetAutomationRuleGQL,
        private createRuleGQL: CreateAutomationRuleGQL,
        private updateRuleGQL: UpdateAutomationRuleGQL,
        private setEnabledGQL: SetAutomationRuleEnabledGQL,
        private deleteRuleGQL: DeleteAutomationRuleGQL
    ) {}

    getRules(): Observable<AutomationRuleInfoFragment[]> {
        return this.getRulesGQL
            .fetch({ variables: { first: 100 }, fetchPolicy: 'network-only' })
            .pipe(map((res) => res.data.automationRules.data));
    }

    getRule(id: string): Observable<AutomationRuleInfoFragment | null> {
        return this.getRuleGQL
            .fetch({ variables: { id }, fetchPolicy: 'network-only' })
            .pipe(map((res) => res.data.automationRule ?? null));
    }

    createRule(input: CreateAutomationRuleInput): Observable<AutomationRuleInfoFragment | null> {
        return this.createRuleGQL
            .mutate({ variables: { input } })
            .pipe(map((res) => res.data?.createAutomationRule ?? null));
    }

    updateRule(
        id: string,
        input: UpdateAutomationRuleInput
    ): Observable<AutomationRuleInfoFragment | null> {
        return this.updateRuleGQL
            .mutate({ variables: { id, input } })
            .pipe(map((res) => res.data?.updateAutomationRule ?? null));
    }

    setEnabled(id: string, enabled: boolean): Observable<boolean> {
        return this.setEnabledGQL
            .mutate({ variables: { id, enabled } })
            .pipe(map((res) => res.data?.setAutomationRuleEnabled?.enabled ?? false));
    }

    deleteRule(id: string): Observable<string | null> {
        return this.deleteRuleGQL
            .mutate({ variables: { id } })
            .pipe(map((res) => res.data?.deleteAutomationRule ?? null));
    }
}
