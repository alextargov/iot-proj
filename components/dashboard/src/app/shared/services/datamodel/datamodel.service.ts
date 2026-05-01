import { Observable, map } from 'rxjs';
import { Injectable } from '@angular/core';

import {
    CreateDataModelDocument,
    CreateDataModelMutation,
    DataModelInfoFragment,
    DataModelInput,
    DataModelVersionInfoFragment,
    DeleteDataModelDocument,
    DeleteDataModelMutation,
    ListDataModelVersionsDocument,
    ListDataModelVersionsQuery,
    ListDataModelsDocument,
    RollbackDataModelDocument,
    RollbackDataModelMutation,
    UpdateDataModelDocument,
    UpdateDataModelInput,
    UpdateDataModelMutation,
} from '../../graphql/generated';
import { FetchResult } from '@apollo/client/core';
import { Apollo } from 'apollo-angular';

@Injectable({
    providedIn: 'root',
})
export class DatamodelService {
    constructor(
        private readonly apollo: Apollo
    ) {}

    public listDataModels(): Observable<DataModelInfoFragment[]> {
        return this.apollo
            .query<{ dataModels: DataModelInfoFragment[] }>({
                query: ListDataModelsDocument,
                fetchPolicy: 'network-only',
            })
            .pipe(map((res) => (res.data?.dataModels ?? []) as DataModelInfoFragment[]));
    }

    public createDataModel(
        data: DataModelInput
    ): Observable<FetchResult<CreateDataModelMutation>> {
        const inputData: DataModelInput = {
            ...data,
            schema: JSON.stringify(data.schema), // Ensure schema is a string
        };
        return this.apollo.mutate<CreateDataModelMutation>({
            mutation: CreateDataModelDocument,
            variables: {
                input: inputData,
            },
        });
    }

    public updateDataModel(
        id: string,
        data: UpdateDataModelInput
    ): Observable<FetchResult<UpdateDataModelMutation>> {
        const inputData: UpdateDataModelInput = {
            ...data,
            schema: data.schema ? JSON.stringify(data.schema) : undefined,
        };
        return this.apollo.mutate<UpdateDataModelMutation>({
            mutation: UpdateDataModelDocument,
            variables: {
                id,
                input: inputData,
            },
        });
    }

    public deleteDataModel(
        id: string
    ): Observable<FetchResult<DeleteDataModelMutation>> {
        return this.apollo.mutate<DeleteDataModelMutation>({
            mutation: DeleteDataModelDocument,
            variables: {
                id,
            },
        });
    }

    public listVersions(
        dataModelId: string
    ): Observable<DataModelVersionInfoFragment[]> {
        return this.apollo
            .watchQuery<ListDataModelVersionsQuery>({
                query: ListDataModelVersionsDocument,
                variables: { dataModelId },
                fetchPolicy: 'network-only',
            })
            .valueChanges.pipe(
                map((res) => (res.data?.dataModelVersions ?? []) as DataModelVersionInfoFragment[])
            );
    }

    public rollbackToVersion(
        dataModelId: string,
        toVersion: number
    ): Observable<FetchResult<RollbackDataModelMutation>> {
        return this.apollo.mutate<RollbackDataModelMutation>({
            mutation: RollbackDataModelDocument,
            variables: {
                dataModelId,
                toVersion,
            },
        });
    }
}
