import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
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
export class RulesListComponent implements OnInit, AfterViewInit {
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    public dataSource = new MatTableDataSource<AutomationRuleInfoFragment>([]);
    public loading = true;
    public loadError = false;
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

    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.dataSource.filterPredicate = (rule, filter) =>
            (rule.name ?? '').toLowerCase().includes(filter) ||
            (rule.device?.name ?? '').toLowerCase().includes(filter);
    }

    load(): void {
        this.loading = true;
        this.loadError = false;
        this.ruleService.getRules().subscribe({
            next: (rules) => {
                this.dataSource.data = rules;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.loadError = true;
                this.cdr.detectChanges();
            },
        });
    }

    applyFilter(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.dataSource.filter = value.trim().toLowerCase();
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
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
                this.toast.showSuccess(
                    `Rule ${rule.enabled ? 'enabled' : 'disabled'}`
                );
                this.cdr.detectChanges();
            },
            error: () => this.toast.showError('Failed to update rule'),
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
                        this.dataSource.data = this.dataSource.data.filter(
                            (r) => r.id !== rule.id
                        );
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
