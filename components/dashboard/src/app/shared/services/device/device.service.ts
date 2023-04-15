import { Observable, map } from 'rxjs'
import { Injectable } from '@angular/core'

import { ApiService } from '../api/api.service'
import { DeviceStatus, IDevice, IDevicePage } from './device.interface'
import {
    CreateDeviceDocument,
    CreateDeviceGQL,
    CreateDeviceMutation,
    DeleteDeviceDocument,
    DeleteDeviceMutation,
    DeviceInfoFragment,
    GetAllDevicesDocument,
    GetAllDevicesGQL,
    GetAllDevicesQuery,
} from '../../graphql/generated'
import { DeviceInput } from '../../graphql/generated'
import { DataProxy, FetchResult } from '@apollo/client/core'
import { Apollo } from 'apollo-angular'
// import { AuthService } from '../auth/auth.service';

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
        private readonly apiService: ApiService,
        private readonly getAllDevicesGql: GetAllDevicesGQL,
        private readonly createDeviceGql: CreateDeviceGQL,
        // private readonly authService: AuthService,
        private readonly apollo: Apollo
    ) {}

    public getDevices(): Observable<IDevice[]> {
        return new Observable((s) => s.next(this.deviceList))
    }

    public getAllDevices(): Observable<DeviceInfoFragment[]> {
        return this.getAllDevicesGql
            .watch()
            .valueChanges.pipe(map((res) => res.data.devices ?? []))
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

    // public createMovie(input: DeviceInput): Observable<FetchResult<CreateDeviceMutation>> {
    //     return this.createDeviceGql.mutate(
    //         {
    //             input,
    //         },
    //         {
    //             optimisticResponse: {
    //                 createDevice: {
    //                     __typename: "Device",
    //                     tenantId: "",
    //                     id: "-1",
    //                     name: input.name,
    //                     description: input.description,
    //                     status: input.status,
    //                     host: {
    //                         __typename: "Host",
    //                         id: "-1",
    //                         url: input.host.url,
    //                         turnOffEndpoint: input.host.turnOffEndpoint,
    //                         turnOnEndpoint: input.host.turnOnEndpoint,
    //                     },
    //                     auth: {
    //                         __typename: "Auth",
    //                         credential: {
    //                             ...input.auth.credential,
    //                         } as any,
    //                     }
    //                 },
    //             },
    //           update: (store: DataProxy, { data }) => {
    //             const createdDevice = data?.createDevice as DeviceInfoFragment;
    //
    //             // query movies from cache
    //             const moviesQuery = store.readQuery<GetAllDevicesQuery>({
    //               query: GetAllDevicesDocument,
    //             });
    //
    //             // movies haven't been loaded yet - no data in cache
    //             if (!moviesQuery?.devices) {
    //               return;
    //             }
    //
    //             // update cache
    //             store.writeQuery<GetAllDevicesQuery>({
    //               query: GetAllDevicesDocument,
    //               data: {
    //                 __typename: 'Query',
    //                 devices: [
    //                   ...moviesQuery.devices, createdDevice
    //                 ],
    //               },
    //             });
    //           },
    //         },
    //     );
    //  }
}
