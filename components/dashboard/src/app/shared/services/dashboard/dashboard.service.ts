import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
    DeviceStatus,
    WidgetStatus,
    GetAllDevicesGQL,
    GetAllWidgetsGQL,
} from '../../graphql/generated';

export interface DashboardStats {
    devices: {
        total: number;
        active: number;
        error: number;
        unreachable: number;
        initial: number;
    };
    widgets: {
        total: number;
        active: number;
        inactive: number;
    };
    dataModels: {
        total: number;
    };
}

@Injectable({
    providedIn: 'root',
})
export class DashboardService {
    constructor(
        private readonly getAllDevicesGql: GetAllDevicesGQL,
        private readonly getAllWidgetsGql: GetAllWidgetsGQL
    ) {}

    public getStats(): Observable<DashboardStats> {
        return forkJoin({
            devices: this.getAllDevicesGql.fetch({ fetchPolicy: 'network-only' }),
            widgets: this.getAllWidgetsGql.fetch({ fetchPolicy: 'network-only' }),
        }).pipe(
            map(({ devices, widgets }) => {
                const deviceList = devices.data?.devices ?? [];
                const widgetList = widgets.data?.widgets ?? [];

                return {
                    devices: {
                        total: deviceList.length,
                        active: deviceList.filter(
                            (d) => d.status === DeviceStatus.Active
                        ).length,
                        error: deviceList.filter(
                            (d) => d.status === DeviceStatus.Error
                        ).length,
                        unreachable: deviceList.filter(
                            (d) => d.status === DeviceStatus.Unreachable
                        ).length,
                        initial: deviceList.filter(
                            (d) => d.status === DeviceStatus.Initial
                        ).length,
                    },
                    widgets: {
                        total: widgetList.length,
                        active: widgetList.filter(
                            (w) => w.status === WidgetStatus.Active
                        ).length,
                        inactive: widgetList.filter(
                            (w) => w.status === WidgetStatus.Inactive
                        ).length,
                    },
                    dataModels: {
                        total: 0, // Can be extended later
                    },
                };
            })
        );
    }
}
