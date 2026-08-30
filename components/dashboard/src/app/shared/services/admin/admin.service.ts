import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
    GetUsersGQL,
    UpdateUserRoleAdminGQL,
    GetOrganizationsGQL,
    CreateOrganizationGQL,
    RenameOrganizationGQL,
    DeleteOrganizationGQL,
    AddOrganizationMemberGQL,
    UpdateOrganizationMemberRoleGQL,
    RemoveOrganizationMemberGQL,
    OrganizationInfoFragment,
    Role,
} from '../../graphql/generated';

export interface AdminUser {
    id: string;
    username: string;
    role: Role;
    createdAt?: unknown;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    constructor(
        private getUsersGQL: GetUsersGQL,
        private updateUserRoleGQL: UpdateUserRoleAdminGQL,
        private getOrgsGQL: GetOrganizationsGQL,
        private createOrgGQL: CreateOrganizationGQL,
        private renameOrgGQL: RenameOrganizationGQL,
        private deleteOrgGQL: DeleteOrganizationGQL,
        private addMemberGQL: AddOrganizationMemberGQL,
        private updateMemberRoleGQL: UpdateOrganizationMemberRoleGQL,
        private removeMemberGQL: RemoveOrganizationMemberGQL
    ) {}

    // ---- Users ----

    listUsers(): Observable<AdminUser[]> {
        return this.getUsersGQL
            .fetch({ fetchPolicy: 'network-only' })
            .pipe(map((res) => res.data.users as AdminUser[]));
    }

    updateUserRole(userId: string, role: Role): Observable<Role | null> {
        return this.updateUserRoleGQL
            .mutate({ variables: { userId, role } })
            .pipe(map((res) => (res.data?.updateUserRole?.role as Role) ?? null));
    }

    // ---- Organizations ----

    listOrganizations(): Observable<OrganizationInfoFragment[]> {
        return this.getOrgsGQL
            .fetch({ fetchPolicy: 'network-only' })
            .pipe(map((res) => res.data.organizations));
    }

    createOrganization(name: string): Observable<OrganizationInfoFragment | null> {
        return this.createOrgGQL
            .mutate({ variables: { input: { name } } })
            .pipe(map((res) => res.data?.createOrganization ?? null));
    }

    renameOrganization(id: string, name: string): Observable<OrganizationInfoFragment | null> {
        return this.renameOrgGQL
            .mutate({ variables: { id, name } })
            .pipe(map((res) => res.data?.renameOrganization ?? null));
    }

    deleteOrganization(id: string): Observable<string | null> {
        return this.deleteOrgGQL
            .mutate({ variables: { id } })
            .pipe(map((res) => res.data?.deleteOrganization ?? null));
    }

    addMember(
        organizationId: string,
        userId: string,
        role: Role
    ): Observable<OrganizationInfoFragment | null> {
        return this.addMemberGQL
            .mutate({ variables: { organizationId, userId, role } })
            .pipe(map((res) => res.data?.addOrganizationMember ?? null));
    }

    updateMemberRole(
        organizationId: string,
        userId: string,
        role: Role
    ): Observable<OrganizationInfoFragment | null> {
        return this.updateMemberRoleGQL
            .mutate({ variables: { organizationId, userId, role } })
            .pipe(map((res) => res.data?.updateOrganizationMemberRole ?? null));
    }

    removeMember(
        organizationId: string,
        userId: string
    ): Observable<OrganizationInfoFragment | null> {
        return this.removeMemberGQL
            .mutate({ variables: { organizationId, userId } })
            .pipe(map((res) => res.data?.removeOrganizationMember ?? null));
    }
}
