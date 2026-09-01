import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AdminService, AdminUser } from '../../shared/services/admin/admin.service';
import {
    OrganizationInfoFragment,
    Role,
} from '../../shared/graphql/generated';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from '../../shared/services/toastr/toastr.service';

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
    standalone: false,
})
export class AdminComponent implements OnInit, AfterViewInit {
    @ViewChild(MatPaginator) userPaginator!: MatPaginator;
    @ViewChild(MatSort) userSort!: MatSort;

    usersDataSource = new MatTableDataSource<AdminUser>([]);
    organizations: OrganizationInfoFragment[] = [];
    loadingUsers = true;
    loadingOrgs = true;

    readonly roles = Object.values(Role);

    newOrgName = '';
    // Per-org "add member" scratch state keyed by org id.
    memberUserId: Record<string, string> = {};
    memberRole: Record<string, Role> = {};

    constructor(
        private admin: AdminService,
        private cdr: ChangeDetectorRef,
        private confirm: ConfirmDialogService,
        private toast: ToastrService
    ) {}

    ngOnInit(): void {
        this.loadUsers();
        this.loadOrgs();
    }

    ngAfterViewInit(): void {
        this.usersDataSource.paginator = this.userPaginator;
        this.usersDataSource.sort = this.userSort;
    }

    // ---- Users ----

    loadUsers(): void {
        this.loadingUsers = true;
        this.admin.listUsers().subscribe({
            next: (users) => {
                this.usersDataSource.data = users;
                this.loadingUsers = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingUsers = false;
                this.cdr.detectChanges();
            },
        });
    }

    applyUserFilter(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.usersDataSource.filter = value.trim().toLowerCase();
        if (this.usersDataSource.paginator) {
            this.usersDataSource.paginator.firstPage();
        }
    }

    changeUserRole(user: AdminUser, role: Role): void {
        if (user.role === role) {
            return;
        }
        this.confirm
            .open({
                title: 'Change user role?',
                message: `Change ${user.username}'s role from ${user.role} to ${role}? This takes effect immediately.`,
                confirmText: 'Change role',
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    // Revert the select's optimistic value.
                    this.usersDataSource.data = [...this.usersDataSource.data];
                    this.cdr.detectChanges();
                    return;
                }
                this.admin.updateUserRole(user.id, role).subscribe({
                    next: (updated) => {
                        if (updated) {
                            user.role = updated;
                            this.toast.showSuccess(`Role updated to ${updated}`);
                        }
                        this.cdr.detectChanges();
                    },
                    error: () => {
                        this.toast.showError('Failed to update role');
                        this.usersDataSource.data = [...this.usersDataSource.data];
                        this.cdr.detectChanges();
                    },
                });
            });
    }

    // ---- Organizations ----

    loadOrgs(): void {
        this.loadingOrgs = true;
        this.admin.listOrganizations().subscribe({
            next: (orgs) => {
                this.organizations = orgs;
                this.loadingOrgs = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingOrgs = false;
                this.cdr.detectChanges();
            },
        });
    }

    createOrg(): void {
        const name = this.newOrgName.trim();
        if (!name) {
            return;
        }
        this.admin.createOrganization(name).subscribe({
            next: (org) => {
                if (org) {
                    this.organizations = [org, ...this.organizations];
                    this.newOrgName = '';
                    this.toast.showSuccess('Organization created');
                    this.cdr.detectChanges();
                }
            },
            error: () => this.toast.showError('Failed to create organization'),
        });
    }

    deleteOrg(org: OrganizationInfoFragment): void {
        this.confirm
            .confirmDelete(org.name, {
                title: 'Delete organization?',
                message: `"${org.name}" and its membership assignments will be permanently removed.`,
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.admin.deleteOrganization(org.id).subscribe({
                    next: () => {
                        this.organizations = this.organizations.filter(
                            (o) => o.id !== org.id
                        );
                        this.toast.showSuccess('Organization deleted');
                        this.cdr.detectChanges();
                    },
                    error: () =>
                        this.toast.showError('Failed to delete organization'),
                });
            });
    }

    addMember(org: OrganizationInfoFragment): void {
        const userId = (this.memberUserId[org.id] || '').trim();
        const role = this.memberRole[org.id] || Role.Viewer;
        if (!userId) {
            return;
        }
        this.admin.addMember(org.id, userId, role).subscribe({
            next: (updated) => {
                if (updated) {
                    this.replaceOrg(updated);
                    this.memberUserId[org.id] = '';
                    this.toast.showSuccess('Member added');
                    this.cdr.detectChanges();
                }
            },
            error: () => this.toast.showError('Failed to add member. Check the User ID.'),
        });
    }

    changeMemberRole(org: OrganizationInfoFragment, userId: string, role: Role): void {
        this.confirm
            .open({
                title: 'Change member role?',
                message: `Update this member's role to ${role}? This takes effect immediately.`,
                confirmText: 'Change role',
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    // Force a re-render so the mat-select reverts.
                    this.organizations = [...this.organizations];
                    this.cdr.detectChanges();
                    return;
                }
                this.admin.updateMemberRole(org.id, userId, role).subscribe({
                    next: (updated) => {
                        if (updated) {
                            this.replaceOrg(updated);
                            this.toast.showSuccess('Member role updated');
                            this.cdr.detectChanges();
                        }
                    },
                    error: () => this.toast.showError('Failed to update member role'),
                });
            });
    }

    removeMember(org: OrganizationInfoFragment, userId: string): void {
        this.confirm
            .open({
                title: 'Remove member?',
                message: 'This user will lose access to the organization.',
                confirmText: 'Remove',
                confirmColor: 'warn',
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }
                this.admin.removeMember(org.id, userId).subscribe({
                    next: (updated) => {
                        if (updated) {
                            this.replaceOrg(updated);
                            this.toast.showSuccess('Member removed');
                            this.cdr.detectChanges();
                        }
                    },
                    error: () => this.toast.showError('Failed to remove member'),
                });
            });
    }

    private replaceOrg(updated: OrganizationInfoFragment): void {
        this.organizations = this.organizations.map((o) =>
            o.id === updated.id ? updated : o
        );
    }
}
