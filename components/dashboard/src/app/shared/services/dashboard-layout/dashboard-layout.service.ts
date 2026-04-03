import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import {
    GetDashboardLayoutsDocument,
    GetDashboardLayoutsQuery,
    GetDashboardLayoutDocument,
    GetDashboardLayoutQuery,
    GetDefaultDashboardLayoutDocument,
    GetDefaultDashboardLayoutQuery,
    CreateDashboardLayoutDocument,
    CreateDashboardLayoutMutation,
    UpdateDashboardLayoutDocument,
    UpdateDashboardLayoutMutation,
    DeleteDashboardLayoutDocument,
    DeleteDashboardLayoutMutation,
    AddDashboardWidgetDocument,
    AddDashboardWidgetMutation,
    UpdateDashboardWidgetDocument,
    UpdateDashboardWidgetMutation,
    DeleteDashboardWidgetDocument,
    DeleteDashboardWidgetMutation,
    UpdateWidgetPositionsDocument,
    UpdateWidgetPositionsMutation,
    DashboardLayoutInfoFragment,
    DashboardWidgetInfoFragment,
    DashboardLayoutInput,
    UpdateDashboardLayoutInput,
    DashboardWidgetInput,
    UpdateDashboardWidgetInput,
    WidgetPositionInput,
} from '../../graphql/generated';

@Injectable({
    providedIn: 'root',
})
export class DashboardLayoutService {
    constructor(private apollo: Apollo) {}

    getLayouts(): Observable<DashboardLayoutInfoFragment[]> {
        return this.apollo
            .query<GetDashboardLayoutsQuery>({
                query: GetDashboardLayoutsDocument,
                fetchPolicy: 'network-only',
            })
            .pipe(map((result) => result.data.dashboardLayouts));
    }

    getLayout(id: string): Observable<DashboardLayoutInfoFragment | null> {
        return this.apollo
            .query<GetDashboardLayoutQuery>({
                query: GetDashboardLayoutDocument,
                variables: { id },
                fetchPolicy: 'network-only',
            })
            .pipe(map((result) => result.data.dashboardLayout ?? null));
    }

    getDefaultLayout(): Observable<DashboardLayoutInfoFragment | null> {
        return this.apollo
            .query<GetDefaultDashboardLayoutQuery>({
                query: GetDefaultDashboardLayoutDocument,
                fetchPolicy: 'network-only',
            })
            .pipe(map((result) => result.data.defaultDashboardLayout ?? null));
    }

    createLayout(input: DashboardLayoutInput): Observable<DashboardLayoutInfoFragment> {
        return this.apollo
            .mutate<CreateDashboardLayoutMutation>({
                mutation: CreateDashboardLayoutDocument,
                variables: { input },
            })
            .pipe(map((result) => result.data!.createDashboardLayout));
    }

    updateLayout(id: string, input: UpdateDashboardLayoutInput): Observable<DashboardLayoutInfoFragment> {
        return this.apollo
            .mutate<UpdateDashboardLayoutMutation>({
                mutation: UpdateDashboardLayoutDocument,
                variables: { id, input },
            })
            .pipe(map((result) => result.data!.updateDashboardLayout));
    }

    deleteLayout(id: string): Observable<string> {
        return this.apollo
            .mutate<DeleteDashboardLayoutMutation>({
                mutation: DeleteDashboardLayoutDocument,
                variables: { id },
            })
            .pipe(map((result) => result.data!.deleteDashboardLayout));
    }

    addWidget(layoutId: string, input: DashboardWidgetInput): Observable<DashboardWidgetInfoFragment> {
        return this.apollo
            .mutate<AddDashboardWidgetMutation>({
                mutation: AddDashboardWidgetDocument,
                variables: { layoutId, input },
            })
            .pipe(map((result) => result.data!.addDashboardWidget));
    }

    updateWidget(id: string, input: UpdateDashboardWidgetInput): Observable<DashboardWidgetInfoFragment> {
        return this.apollo
            .mutate<UpdateDashboardWidgetMutation>({
                mutation: UpdateDashboardWidgetDocument,
                variables: { id, input },
            })
            .pipe(map((result) => result.data!.updateDashboardWidget));
    }

    deleteWidget(id: string): Observable<string> {
        return this.apollo
            .mutate<DeleteDashboardWidgetMutation>({
                mutation: DeleteDashboardWidgetDocument,
                variables: { id },
            })
            .pipe(map((result) => result.data!.deleteDashboardWidget));
    }

    updateWidgetPositions(layoutId: string, positions: WidgetPositionInput[]): Observable<boolean> {
        return this.apollo
            .mutate<UpdateWidgetPositionsMutation>({
                mutation: UpdateWidgetPositionsDocument,
                variables: { layoutId, positions },
            })
            .pipe(map((result) => result.data!.updateWidgetPositions));
    }
}
