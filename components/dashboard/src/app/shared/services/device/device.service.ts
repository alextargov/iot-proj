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
    GetDeviceGQL,
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

const GenerateDeviceCertificateDocument = gql`
    mutation GenerateDeviceCertificate($deviceId: ID!) {
        generateDeviceCertificate(deviceId: $deviceId) {
            certificate
            privateKey
            caCertificate
            serial
            expiresAt
        }
    }
`;

const RevokeDeviceCertificateDocument = gql`
    mutation RevokeDeviceCertificate($deviceId: ID!) {
        revokeDeviceCertificate(deviceId: $deviceId)
    }
`;

export interface DeviceCertificate {
    certificate: string;
    privateKey?: string | null;
    caCertificate: string;
    serial: string;
    expiresAt: string;
}

interface GenerateDeviceCertificateMutation {
    generateDeviceCertificate: DeviceCertificate;
}

interface RevokeDeviceCertificateMutation {
    revokeDeviceCertificate: boolean;
}

const TestDeviceConnectionDocument = gql`
    query TestDeviceConnection($url: String!) {
        testDeviceConnection(url: $url)
    }
`;

const UpdateDeviceDocument = gql`
    mutation UpdateDevice($id: ID!, $input: UpdateDeviceInput!) {
        updateDevice(id: $id, input: $input) {
            id
            name
            description
            status
        }
    }
`;

interface UpdateDeviceMutation {
    updateDevice: DeviceInfoFragment;
}

interface UpdateDeviceInput {
    name?: string;
    description?: string;
    status?: DeviceStatus;
    host?: {
        url: string;
        turnOnEndpoint?: string;
        turnOffEndpoint?: string;
    };
    auth?: any;
    dataModel?: string;
    tags?: string[];
}

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
        private readonly getDeviceGql: GetDeviceGQL,
        private readonly apollo: Apollo
    ) {}

    public getAllDevices(): Observable<DeviceInfoFragment[]> {
        return this.getAllDevicesGql
            .fetch({ fetchPolicy: 'network-only' })
            .pipe(map((res) => (res.data?.devices ?? []) as DeviceInfoFragment[]));
    }

    public getDevice(id: string): Observable<DeviceInfoFragment | null> {
        return this.getDeviceGql
            .fetch({ variables: { id }, fetchPolicy: 'network-only' })
            .pipe(map((res) => (res.data?.device ?? null) as DeviceInfoFragment | null));
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

    public updateDevice(
        id: string,
        input: UpdateDeviceInput
    ): Observable<FetchResult<UpdateDeviceMutation>> {
        return this.apollo.mutate<UpdateDeviceMutation>({
            mutation: UpdateDeviceDocument,
            variables: {
                id,
                input,
            },
        });
    }

    public generateDeviceToken(deviceId: string): Observable<string> {
        return this.apollo
            .mutate<GenerateDeviceTokenMutation>({
                mutation: GenerateDeviceTokenDocument,
                variables: { deviceId },
            })
            .pipe(map((res) => res.data?.generateDeviceToken ?? ''));
    }

    public generateDeviceCertificate(
        deviceId: string
    ): Observable<DeviceCertificate | null> {
        return this.apollo
            .mutate<GenerateDeviceCertificateMutation>({
                mutation: GenerateDeviceCertificateDocument,
                variables: { deviceId },
            })
            .pipe(map((res) => res.data?.generateDeviceCertificate ?? null));
    }

    public revokeDeviceCertificate(deviceId: string): Observable<boolean> {
        return this.apollo
            .mutate<RevokeDeviceCertificateMutation>({
                mutation: RevokeDeviceCertificateDocument,
                variables: { deviceId },
            })
            .pipe(map((res) => res.data?.revokeDeviceCertificate ?? false));
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
