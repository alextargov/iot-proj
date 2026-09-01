import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
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
export class IntegrationsListComponent implements OnInit, AfterViewInit {
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    dataSource = new MatTableDataSource<IntegrationInfoFragment>([]);
    loading = true;
    loadError = false;
    testResult: Record<string, 'ok' | 'fail' | 'pending'> = {};
    lastTested: Record<string, Date> = {};
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

    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
    }

    load(): void {
        this.loading = true;
        this.loadError = false;
        this.service.list().subscribe({
            next: (items) => {
                this.dataSource.data = items;
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
                        this.dataSource.data = this.dataSource.data.filter(
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
                this.lastTested[item.id] = new Date();
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
                this.lastTested[item.id] = new Date();
                this.toast.showError(`Could not reach "${item.name}"`);
                this.cdr.detectChanges();
            },
        });
    }
}
