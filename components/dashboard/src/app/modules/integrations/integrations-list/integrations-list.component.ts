import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IntegrationService } from '../../../shared/services/integration/integration.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { IntegrationInfoFragment } from '../../../shared/graphql/generated';

@Component({
    selector: 'app-integrations-list',
    templateUrl: './integrations-list.component.html',
    styleUrls: ['./integrations-list.component.scss'],
    standalone: false,
})
export class IntegrationsListComponent implements OnInit {
    integrations: IntegrationInfoFragment[] = [];
    loading = true;
    testResult: Record<string, 'ok' | 'fail' | 'pending'> = {};
    displayedColumns = ['name', 'type', 'endpoint', 'enabled', 'actions'];

    constructor(
        private service: IntegrationService,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    get canWrite(): boolean {
        return this.authService.hasRole('OPERATOR');
    }

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        this.service.list().subscribe({
            next: (items) => {
                this.integrations = items;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }

    create(): void {
        this.router.navigate(['/integrations/create']);
    }

    edit(item: IntegrationInfoFragment): void {
        this.router.navigate(['/integrations', item.id, 'edit']);
    }

    remove(item: IntegrationInfoFragment): void {
        if (confirm(`Delete integration "${item.name}"?`)) {
            this.service.remove(item.id).subscribe(() => {
                this.integrations = this.integrations.filter((i) => i.id !== item.id);
                this.cdr.detectChanges();
            });
        }
    }

    test(item: IntegrationInfoFragment): void {
        this.testResult[item.id] = 'pending';
        this.service.test(item.id).subscribe({
            next: (ok) => {
                this.testResult[item.id] = ok ? 'ok' : 'fail';
                this.cdr.detectChanges();
            },
            error: () => {
                this.testResult[item.id] = 'fail';
                this.cdr.detectChanges();
            },
        });
    }
}
