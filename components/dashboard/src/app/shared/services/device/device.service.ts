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
    OnDeviceStatusChangedGQL,
    DeviceStatus as GqlDeviceStatus,
    DeviceInfoFragmentDoc,
    OperationType,
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

const SetDeviceOperationDocument = gql`
    mutation SetDeviceOperation($id: ID!, $op: OperationType!) {
        setDeviceOperation(id: $id, op: $op) {
            ...DeviceInfo
        }
    }
    ${DeviceInfoFragmentDoc}
`;

interface SetDeviceOperationMutation {
    setDeviceOperation: DeviceInfoFragment;
}

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

const CloneDeviceDocument = gql`
    mutation CloneDevice($id: ID!) {
        cloneDevice(id: $id) {
            id
            name
            description
            status
        }
    }
`;

interface CloneDeviceMutation {
    cloneDevice: DeviceInfoFragment;
}

const GetDeviceTagsDocument = gql`
    query GetDeviceTags {
        deviceTags
    }
`;

interface GetDeviceTagsQuery {
    deviceTags: string[];
}

const GetDevicesByTagsDocument = gql`
    query GetDevicesByTags($tags: [String!]!) {
        devicesByTags(tags: $tags) {
            id
            name
            description
            status
            tenantId
            tags
            host {
                id
                url
                turnOnEndpoint
                turnOffEndpoint
            }
            hasCertificate
            certificateSerial
            certificateExpiresAt
            createdAt
            updatedAt
        }
    }
`;

interface GetDevicesByTagsQuery {
    devicesByTags: DeviceInfoFragment[];
}

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
        private readonly onDeviceStatusChangedGql: OnDeviceStatusChangedGQL,
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

    public getDeviceTags(): Observable<string[]> {
        return this.apollo
            .query<GetDeviceTagsQuery>({
                query: GetDeviceTagsDocument,
                fetchPolicy: 'network-only',
            })
            .pipe(map((res) => res.data?.deviceTags ?? []));
    }

    public getDevicesByTags(tags: string[]): Observable<DeviceInfoFragment[]> {
        return this.apollo
            .query<GetDevicesByTagsQuery>({
                query: GetDevicesByTagsDocument,
                variables: { tags },
                fetchPolicy: 'network-only',
            })
            .pipe(
                map(
                    (res) =>
                        (res.data?.devicesByTags ?? []) as DeviceInfoFragment[]
                )
            );
    }

    public cloneDevice(
        id: string
    ): Observable<DeviceInfoFragment | null> {
        return this.apollo
            .mutate<CloneDeviceMutation>({
                mutation: CloneDeviceDocument,
                variables: { id },
            })
            .pipe(map((res) => res.data?.cloneDevice ?? null));
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

    /**
     * Send an operation (e.g. TURN_ON / TURN_OFF) to a device. The server
     * relays the command to the device using its configured authentication and
     * returns the updated device.
     */
    public setDeviceOperation(
        id: string,
        op: OperationType
    ): Observable<DeviceInfoFragment | null> {
        return this.apollo
            .mutate<SetDeviceOperationMutation>({
                mutation: SetDeviceOperationDocument,
                variables: { id, op },
            })
            .pipe(map((res) => res.data?.setDeviceOperation ?? null));
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

    /**
     * Subscribe to real-time device status changes. Pass a deviceId to receive
     * events for a single device, or omit it to receive status changes for all
     * devices (used by the devices list view).
     */
    public subscribeToDeviceStatus(
        deviceId?: string
    ): Observable<{ deviceId: string; status: GqlDeviceStatus }> {
        return this.onDeviceStatusChangedGql
            .subscribe({ variables: { deviceId } })
            .pipe(
                map((res) => {
                    const evt = res.data!.deviceStatusChanged;
                    return {
                        deviceId: evt.deviceId,
                        status: evt.status,
                    };
                })
            );
    }
}
