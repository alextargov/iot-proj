import { Observable, map } from 'rxjs'
import { Injectable } from '@angular/core'

import { ApiService } from '../api/api.service'
import {
    CreateWidgetDocument,
    CreateWidgetGQL,
    CreateWidgetMutation, DeleteWidgetDocument, DeleteWidgetMutation,
    GetAllWidgetsGQL,
    WidgetInfoFragment,
    WidgetInput
} from '../../graphql/generated'
import {  FetchResult } from '@apollo/client/core'
import { Apollo } from 'apollo-angular'

@Injectable({
    providedIn: 'root',
})
export class WidgetService {
    constructor(
        private readonly apiService: ApiService,
        private readonly getAllWidgetsGql: GetAllWidgetsGQL,
        private readonly createWidgetGql: CreateWidgetGQL,
        private readonly apollo: Apollo
    ) {}

    public getAll(): Observable<WidgetInfoFragment[]> {
        return this.getAllWidgetsGql
            .watch()
            .valueChanges.pipe(map((res) => res.data?.widgets ?? []))
    }

    public create(
        data: WidgetInput
    ): Observable<FetchResult<CreateWidgetMutation>> {
        return this.apollo.mutate<CreateWidgetMutation>({
            mutation: CreateWidgetDocument,
            variables: {
                input: data,
            },
        })
    }

    public delete(
        id: string
    ): Observable<FetchResult<DeleteWidgetMutation>> {
        return this.apollo.mutate<DeleteWidgetMutation>({
            mutation: DeleteWidgetDocument,
            variables: {
                id,
            },
        })
    }
}
