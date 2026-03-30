import { Observable, map } from 'rxjs';
import { Injectable } from '@angular/core';

import { DeviceStatus, IDevice } from './device.interface';
import {
    CreateDeviceDocument,
    CreateDeviceMutation,
    DeleteDeviceDocument,
    DeleteDeviceMutation,
    DeviceInfoFragment,
    GetAllDevicesGQL,
} from '../../graphql/generated';
import { DeviceInput } from '../../graphql/generated';
import { FetchResult } from '@apollo/client/core';
import { Apollo, gql } from 'apollo-angular';

// Temporary inline definitions until types are regenerated
const GenerateDeviceTokenDocument = gql`
    mutation GenerateDeviceToken {
        generateDeviceToken
    }
`;

const TestDeviceConnectionDocument = gql`
    query TestDeviceConnection($url: String!) {
        testDeviceConnection(url: $url)
    }
`;

interface GenerateDeviceTokenMutation {
    generateDeviceToken: string;
}

interface TestDeviceConnectionQuery {
    testDeviceConnection: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class DeviceService {
    private deviceList: IDevice[] = [
        {
            _id: 'b2e8f85c-3caa-4d2e-8c0e-641385d3ddbc',
            userID: 'fc43d375-9283-4a87-9510-77359800f87c',
            name: 'Temperature',
            description: 'Temperature sensor in living room',
            status: DeviceStatus.ACTIVE,
            dataOutput: [{ key: 'temp', name: 'Temperature' }],
            // dataOutputUnit: "degrees celsius",
            host: {
                url: 'http://localhost:4000',
                turnOnEndpoint: '/on',
                turnOffEndpoint: '/off',
            },
            createdAt: new Date().getTime(),
        },
        {
            _id: 'b2e8f85c-3caa-4d2e-8c0e-641385d3ddbd',
            userID: 'fc43d375-9283-4a87-9510-77359800f87d',
            name: 'Humidity',
            description: 'Humidity sensor in living room',
            status: DeviceStatus.ERROR,
            dataOutput: [{ key: 'humidity', name: 'Humidity %' }],
            // dataOutputUnit: "%",
            host: {
                url: 'http://localhost:4000',
                turnOnEndpoint: '/on',
                turnOffEndpoint: '/off',
            },
            createdAt: new Date().getTime(),
        },
    ];

    constructor(
        private readonly getAllDevicesGql: GetAllDevicesGQL,
        private readonly apollo: Apollo
    ) {}

    public getAllDevices(): Observable<DeviceInfoFragment[]> {
        return this.getAllDevicesGql
            .fetch({ fetchPolicy: 'network-only' })
            .pipe(map((res) => (res.data?.devices ?? []) as DeviceInfoFragment[]));
    }

    public createDevice(
        data: DeviceInput
    ): Observable<FetchResult<CreateDeviceMutation>> {
        return this.apollo.mutate<CreateDeviceMutation>({
            mutation: CreateDeviceDocument,
            variables: {
                input: data,
            },
        });
    }

    public deleteDevice(
        id: string
    ): Observable<FetchResult<DeleteDeviceMutation>> {
        return this.apollo.mutate<DeleteDeviceMutation>({
            mutation: DeleteDeviceDocument,
            variables: {
                id,
            },
        });
    }

    public generateDeviceToken(): Observable<string> {
        return this.apollo
            .mutate<GenerateDeviceTokenMutation>({
                mutation: GenerateDeviceTokenDocument,
            })
            .pipe(map((res) => res.data?.generateDeviceToken ?? ''));
    }

    public testDeviceConnection(url: string): Observable<boolean> {
        return this.apollo
            .query<TestDeviceConnectionQuery>({
                query: TestDeviceConnectionDocument,
                variables: { url },
                fetchPolicy: 'network-only',
            })
            .pipe(map((res) => res.data?.testDeviceConnection ?? false));
    }
}
