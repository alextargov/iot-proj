import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { RuleService } from '../../../shared/services/rule/rule.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { AutomationRuleInfoFragment } from '../../../shared/graphql/generated';

@Component({
    selector: 'app-rules-list',
    templateUrl: './rules-list.component.html',
    styleUrls: ['./rules-list.component.scss'],
    standalone: false,
})
export class RulesListComponent implements OnInit {
    public rules: AutomationRuleInfoFragment[] = [];
    public loading = true;
    public displayedColumns: string[] = [
        'name',
        'device',
        'conditions',
        'actions_count',
        'enabled',
        'lastTriggered',
        'actions',
    ];

    constructor(
        private ruleService: RuleService,
        private router: Router,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {}

    public get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        this.ruleService.getRules().subscribe({
            next: (rules) => {
                this.rules = rules;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }

    createRule(): void {
        this.router.navigate(['/rules/create']);
    }

    editRule(rule: AutomationRuleInfoFragment): void {
        this.router.navigate(['/rules', rule.id, 'edit']);
    }

    toggleEnabled(rule: AutomationRuleInfoFragment): void {
        this.ruleService.setEnabled(rule.id, !rule.enabled).subscribe({
            next: () => {
                rule.enabled = !rule.enabled;
                this.cdr.detectChanges();
            },
        });
    }

    deleteRule(rule: AutomationRuleInfoFragment): void {
        if (confirm(`Delete automation rule "${rule.name}"?`)) {
            this.ruleService.deleteRule(rule.id).subscribe({
                next: () => {
                    this.rules = this.rules.filter((r) => r.id !== rule.id);
                    this.cdr.detectChanges();
                },
            });
        }
    }

    formatConditions(rule: AutomationRuleInfoFragment): string {
        if (!rule.conditions || rule.conditions.length === 0) {
            return 'No conditions';
        }
        return rule.conditions
            .map((group) => {
                const condStr = group.conditions
                    .map((c) => `${c.metricName} ${c.operator} ${c.threshold}`)
                    .join(' AND ');
                return `(${condStr})`;
            })
            .join(' OR ');
    }

    formatActions(rule: AutomationRuleInfoFragment): string {
        return `${rule.actions?.length ?? 0} action(s)`;
    }
}
