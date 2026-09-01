import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IntegrationService } from '../../../shared/services/integration/integration.service';
import { AuthService } from '../../../shared/services/auth/auth.service';
import { IntegrationInfoFragment } from '../../../shared/graphql/generated';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from '../../../shared/services/toastr/toastr.service';

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
        private cdr: ChangeDetectorRef,
        private confirm: ConfirmDialogService,
        private toast: ToastrService
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
        this.confirm
            .confirmDelete(item.name, {
                title: 'Delete integration?',
                message: `"${item.name}" will be permanently removed. Rules using it will no longer be able to invoke it.`,
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.service.remove(item.id).subscribe({
                    next: () => {
                        this.integrations = this.integrations.filter(
                            (i) => i.id !== item.id
                        );
                        this.toast.showSuccess('Integration deleted');
                        this.cdr.detectChanges();
                    },
                    error: () =>
                        this.toast.showError('Failed to delete integration'),
                });
            });
    }

    test(item: IntegrationInfoFragment): void {
        this.testResult[item.id] = 'pending';
        this.service.test(item.id).subscribe({
            next: (ok) => {
                this.testResult[item.id] = ok ? 'ok' : 'fail';
                if (ok) {
                    this.toast.showSuccess(`"${item.name}" responded OK`);
                } else {
                    this.toast.showWarning(
                        `"${item.name}" did not respond successfully`
                    );
                }
                this.cdr.detectChanges();
            },
            error: () => {
                this.testResult[item.id] = 'fail';
                this.toast.showError(`Could not reach "${item.name}"`);
                this.cdr.detectChanges();
            },
        });
    }
}
