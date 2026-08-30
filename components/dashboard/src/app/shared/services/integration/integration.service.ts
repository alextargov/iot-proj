import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
    GetIntegrationsGQL,
    GetIntegrationGQL,
    CreateIntegrationGQL,
    UpdateIntegrationGQL,
    DeleteIntegrationGQL,
    TestIntegrationGQL,
    IntegrationInfoFragment,
    CreateIntegrationInput,
    UpdateIntegrationInput,
} from '../../graphql/generated';

@Injectable({ providedIn: 'root' })
export class IntegrationService {
    constructor(
        private getIntegrationsGQL: GetIntegrationsGQL,
        private getIntegrationGQL: GetIntegrationGQL,
        private createGQL: CreateIntegrationGQL,
        private updateGQL: UpdateIntegrationGQL,
        private deleteGQL: DeleteIntegrationGQL,
        private testGQL: TestIntegrationGQL
    ) {}

    list(): Observable<IntegrationInfoFragment[]> {
        return this.getIntegrationsGQL
            .fetch({ fetchPolicy: 'network-only' })
            .pipe(map((res) => res.data.integrations));
    }

    get(id: string): Observable<IntegrationInfoFragment | null> {
        return this.getIntegrationGQL
            .fetch({ variables: { id }, fetchPolicy: 'network-only' })
            .pipe(map((res) => res.data.integration ?? null));
    }

    create(input: CreateIntegrationInput): Observable<IntegrationInfoFragment | null> {
        return this.createGQL
            .mutate({ variables: { input } })
            .pipe(map((res) => res.data?.createIntegration ?? null));
    }

    update(
        id: string,
        input: UpdateIntegrationInput
    ): Observable<IntegrationInfoFragment | null> {
        return this.updateGQL
            .mutate({ variables: { id, input } })
            .pipe(map((res) => res.data?.updateIntegration ?? null));
    }

    remove(id: string): Observable<string | null> {
        return this.deleteGQL
            .mutate({ variables: { id } })
            .pipe(map((res) => res.data?.deleteIntegration ?? null));
    }

    test(id: string): Observable<boolean> {
        return this.testGQL
            .mutate({ variables: { id } })
            .pipe(map((res) => res.data?.testIntegration ?? false));
    }
}
