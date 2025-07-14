import { Observable, map } from 'rxjs'
import { Injectable } from '@angular/core'

import {
    CreateDataModelDocument,
    CreateDataModelGQL,
    DataModelInfoFragment,
    DataModelInput,
    DeleteDataModelDocument,
    DeleteDataModelMutation,
    ListDataModelsGQL,
} from '../../graphql/generated'
import { FetchResult } from '@apollo/client/core'
import { Apollo } from 'apollo-angular'

@Injectable({
    providedIn: 'root',
})
export class DatamodelService {
    constructor(
        private readonly listDataModelsGql: ListDataModelsGQL,
        private readonly apollo: Apollo
    ) {}

    public listDataModels(): Observable<DataModelInfoFragment[]> {
        return this.listDataModelsGql
            .watch({}, { fetchPolicy: 'network-only' })
            .valueChanges.pipe(map((res) => res.data?.dataModels ?? []))
    }

    public createDataModel(
        data: DataModelInput
    ): Observable<FetchResult<CreateDataModelGQL>> {
        const inputData: DataModelInput = {
            ...data,
            schema: JSON.stringify(data.schema), // Ensure schema is a string
        }
        return this.apollo.mutate<CreateDataModelGQL>({
            mutation: CreateDataModelDocument,
            variables: {
                input: inputData,
            },
        })
    }

    public deleteDataModel(
        id: string
    ): Observable<FetchResult<DeleteDataModelMutation>> {
        return this.apollo.mutate<DeleteDataModelMutation>({
            mutation: DeleteDataModelDocument,
            variables: {
                id,
            },
        })
    }
}
