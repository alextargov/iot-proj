import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
export class AdminComponent implements OnInit {
    users: AdminUser[] = [];
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

    // ---- Users ----

    loadUsers(): void {
        this.loadingUsers = true;
        this.admin.listUsers().subscribe({
            next: (users) => {
                this.users = users;
                this.loadingUsers = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingUsers = false;
                this.cdr.detectChanges();
            },
        });
    }

    changeUserRole(user: AdminUser, role: Role): void {
        this.admin.updateUserRole(user.id, role).subscribe((updated) => {
            if (updated) {
                user.role = updated;
                this.cdr.detectChanges();
            }
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
        this.admin.createOrganization(name).subscribe((org) => {
            if (org) {
                this.organizations = [org, ...this.organizations];
                this.newOrgName = '';
                this.cdr.detectChanges();
            }
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
        this.admin.addMember(org.id, userId, role).subscribe((updated) => {
            if (updated) {
                this.replaceOrg(updated);
                this.memberUserId[org.id] = '';
                this.cdr.detectChanges();
            }
        });
    }

    changeMemberRole(org: OrganizationInfoFragment, userId: string, role: Role): void {
        this.admin.updateMemberRole(org.id, userId, role).subscribe((updated) => {
            if (updated) {
                this.replaceOrg(updated);
                this.cdr.detectChanges();
            }
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
