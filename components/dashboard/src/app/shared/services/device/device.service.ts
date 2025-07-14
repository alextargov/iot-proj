import { Observable, map } from 'rxjs'
import { Injectable } from '@angular/core'

import { DeviceStatus, IDevice } from './device.interface'
import {
    CreateDeviceDocument,
    CreateDeviceMutation,
    DeleteDeviceDocument,
    DeleteDeviceMutation,
    DeviceInfoFragment,
    GetAllDevicesGQL,
} from '../../graphql/generated'
import { DeviceInput } from '../../graphql/generated'
import { FetchResult } from '@apollo/client/core'
import { Apollo } from 'apollo-angular'

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
    ]

    constructor(
        private readonly getAllDevicesGql: GetAllDevicesGQL,
        private readonly apollo: Apollo
    ) {}

    public getAllDevices(): Observable<DeviceInfoFragment[]> {
        return this.getAllDevicesGql
            .watch()
            .valueChanges.pipe(map((res) => res.data?.devices ?? []))
    }

    public createDevice(
        data: DeviceInput
    ): Observable<FetchResult<CreateDeviceMutation>> {
        return this.apollo.mutate<CreateDeviceMutation>({
            mutation: CreateDeviceDocument,
            variables: {
                input: data,
            },
        })
    }

    public deleteDevice(
        id: string
    ): Observable<FetchResult<DeleteDeviceMutation>> {
        return this.apollo.mutate<DeleteDeviceMutation>({
            mutation: DeleteDeviceDocument,
            variables: {
                id,
            },
        })
    }
}
