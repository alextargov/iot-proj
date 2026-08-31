import { Observable, map } from 'rxjs';
import { Injectable } from '@angular/core';

import { ApiService } from '../api/api.service';
import {
    CreateWidgetDocument,
    CreateWidgetGQL,
    CreateWidgetMutation,
    DeleteWidgetDocument,
    DeleteWidgetMutation,
    GetAllWidgetsGQL,
    GetWidgetGQL,
    UpdateWidgetDocument,
    UpdateWidgetMutation,
    WidgetInfoFragment,
    WidgetInput,
} from '../../graphql/generated';
import { FetchResult } from '@apollo/client/core';
import { Apollo, gql } from 'apollo-angular';

const CloneWidgetDocument = gql`
    mutation CloneWidget($id: ID!) {
        cloneWidget(id: $id) {
            id
            name
            description
            status
        }
    }
`;

interface CloneWidgetMutation {
    cloneWidget: WidgetInfoFragment;
}

@Injectable({
    providedIn: 'root',
})
export class WidgetService {
    constructor(
        private readonly apiService: ApiService,
        private readonly getAllWidgetsGql: GetAllWidgetsGQL,
        private readonly getWidgetGql: GetWidgetGQL,
        private readonly createWidgetGql: CreateWidgetGQL,
        private readonly apollo: Apollo
    ) {}

    public getAll(): Observable<WidgetInfoFragment[]> {
        return this.getAllWidgetsGql
            .watch()
            .valueChanges.pipe(map((res) => (res.data?.widgets ?? []) as WidgetInfoFragment[]));
    }

    public getById(id: string): Observable<WidgetInfoFragment | null> {
        return this.getWidgetGql
            .fetch({ variables: { id }, fetchPolicy: 'network-only' })
            .pipe(map((res) => (res.data?.widget ?? null) as WidgetInfoFragment | null));
    }

    public create(
        data: WidgetInput
    ): Observable<FetchResult<CreateWidgetMutation>> {
        return this.apollo.mutate<CreateWidgetMutation>({
            mutation: CreateWidgetDocument,
            variables: {
                input: data,
            },
        });
    }

    public update(
        id: string,
        data: WidgetInput
    ): Observable<FetchResult<UpdateWidgetMutation>> {
        return this.apollo.mutate<UpdateWidgetMutation>({
            mutation: UpdateWidgetDocument,
            variables: {
                id,
                input: data,
            },
        });
    }

    public clone(id: string): Observable<WidgetInfoFragment | null> {
        return this.apollo
            .mutate<CloneWidgetMutation>({
                mutation: CloneWidgetDocument,
                variables: { id },
            })
            .pipe(map((res) => res.data?.cloneWidget ?? null));
    }

    public delete(id: string): Observable<FetchResult<DeleteWidgetMutation>> {
        return this.apollo.mutate<DeleteWidgetMutation>({
            mutation: DeleteWidgetDocument,
            variables: {
                id,
            },
        });
    }
}
