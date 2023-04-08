import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';


import { ApiService } from '../api/api.service';
import { DeviceStatus, IDevice, IDevicePage } from './device.interface';
// import { AuthService } from '../auth/auth.service';

@Injectable()
export class DeviceService  {
    public readonly route = '/device';

    private deviceList: IDevice[] = [{
      _id: "b2e8f85c-3caa-4d2e-8c0e-641385d3ddbc",
      userID: "fc43d375-9283-4a87-9510-77359800f87c",
      name: "Temperature",
      description: "Temperature sensor in living room",
      status: DeviceStatus.ACTIVE,
      dataOutput: [
        { key: 'temp', name: 'Temperature'}
      ],
      // dataOutputUnit: "degrees celsius",
      host:  {
        url: "http://localhost:4000",
        turnOnEndpoint: "/on",
        turnOffEndpoint: "/off",
      },
      createdAt: new Date().getTime(),
    },
    {
      _id: "b2e8f85c-3caa-4d2e-8c0e-641385d3ddbd",
      userID: "fc43d375-9283-4a87-9510-77359800f87d",
      name: "Humidity",
      description: "Humidity sensor in living room",
      status: DeviceStatus.ERROR,
      dataOutput: [
        { key: 'humidity', name: 'Humidity %'}
      ],
      // dataOutputUnit: "%",
      host:  {
        url: "http://localhost:4000",
        turnOnEndpoint: "/on",
        turnOffEndpoint: "/off",
      },
      createdAt: new Date().getTime() ,
    }]

    constructor(
        private readonly apiService: ApiService,
        // private readonly authService: AuthService,
    ) {}

    public getDevices(): Observable<IDevice[]> {
        return new Observable((s) =>  s.next(this.deviceList))

        return this.apiService.request(this.route);
    }

    public getDeviceById(id: string): Observable<IDevice> {
        return this.apiService.request(this.route, {
            data: { id }
        });
    }

    public getDeviceByUserId(userId: string): Observable<IDevicePage> {
      return new Observable((s) => {
        s.next({
          data: this.deviceList,
          pageInfo: {
            start: null,
            cursor: null,
          }
        } as IDevicePage)
      })
        // return this.apiService.request(`${this.route}/user/${userId}`);
    }

    public createDevice(data: IDevice): Observable<{ data: IDevice, error: number }> {
        const hydratedData: IDevice = {
            ...data,
            // userId: this.authService.getUser()._id
        };

        this.deviceList.push(data)

        return new Observable((s) =>  s.next({ data ,error:0}))

        return this.apiService.request(`${this.route}`, {
            method: 'post',
            data: hydratedData
        });
    }

    public updateDevice(id: string, data: IDevice): Observable<{ data: IDevice, error: number }> {
        return this.apiService.request(`${this.route}/${id}`, {
            method: 'put',
            data
        });
    }

    public deleteDevice(id: string): Observable<void> {
        return this.apiService.request(`${this.route}/${id}`, {
            method: 'delete',
        });
    }
}
