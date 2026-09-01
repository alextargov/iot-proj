import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { RuleService } from '../../../shared/services/rule/rule.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { AutomationRuleInfoFragment } from '../../../shared/graphql/generated';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';

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
        private cdr: ChangeDetectorRef,
        private confirm: ConfirmDialogService,
        private toast: ToastrService
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
        this.confirm
            .confirmDelete(rule.name, {
                title: 'Delete automation rule?',
                message: `"${rule.name}" and its conditions and actions will be permanently removed.`,
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.ruleService.deleteRule(rule.id).subscribe({
                    next: () => {
                        this.rules = this.rules.filter((r) => r.id !== rule.id);
                        this.toast.showSuccess('Automation rule deleted');
                        this.cdr.detectChanges();
                    },
                    error: () =>
                        this.toast.showError('Failed to delete rule'),
                });
            });
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
