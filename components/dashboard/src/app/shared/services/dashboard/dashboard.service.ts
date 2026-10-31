import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import {
    DeviceStatus,
    WidgetStatus,
    GetAllDevicesGQL,
    GetAllWidgetsGQL,
    GetAlertEventsGQL,
    AlertEventStatus,
    DeviceInfoFragment,
    WidgetInfoFragment,
} from '../../graphql/generated';

export interface DeviceStats {
    total: number;
    active: number;
    error: number;
    unreachable: number;
    initial: number;
}

export interface WidgetStats {
    total: number;
    active: number;
    inactive: number;
}

export interface DashboardStats {
    devices: DeviceStats;
    widgets: WidgetStats;
    dataModels: {
        total: number;
    };
}

/** Full overview payload: aggregated stats plus the raw lists the Home page
 *  needs for "recent devices" and for recomputing device counts live when a
 *  status-change subscription fires. */
export interface DashboardOverview {
    stats: DashboardStats;
    devices: DeviceInfoFragment[];
    widgets: WidgetInfoFragment[];
    /** Count of alert events still in the TRIGGERED (unacknowledged) state. */
    openAlerts: number;
}

@Injectable({
    providedIn: 'root',
})
export class DashboardService {
    constructor(
        private readonly getAllDevicesGql: GetAllDevicesGQL,
        private readonly getAllWidgetsGql: GetAllWidgetsGQL,
        private readonly getAlertEventsGql: GetAlertEventsGQL
    ) {}

    /** Aggregates a device list into the counts the Home cards display. */
    public deviceStats(devices: DeviceInfoFragment[]): DeviceStats {
        return {
            total: devices.length,
            active: devices.filter((d) => d.status === DeviceStatus.Active).length,
            error: devices.filter((d) => d.status === DeviceStatus.Error).length,
            unreachable: devices.filter(
                (d) => d.status === DeviceStatus.Unreachable
            ).length,
            initial: devices.filter((d) => d.status === DeviceStatus.Initial)
                .length,
        };
    }

    /** Aggregates a widget list into the counts the Home cards display. */
    public widgetStats(widgets: WidgetInfoFragment[]): WidgetStats {
        return {
            total: widgets.length,
            active: widgets.filter((w) => w.status === WidgetStatus.Active).length,
            inactive: widgets.filter((w) => w.status === WidgetStatus.Inactive)
                .length,
        };
    }

    /** One-shot load of everything the Home page renders. */
    public getOverview(): Observable<DashboardOverview> {
        return forkJoin({
            devices: this.getAllDevicesGql.fetch({ fetchPolicy: 'network-only' }),
            widgets: this.getAllWidgetsGql.fetch({ fetchPolicy: 'network-only' }),
            // Alert events are optional context; a failure here must not sink the
            // whole overview, so swallow it and report zero open alerts.
            openAlerts: this.getAlertEventsGql
                .fetch({
                    variables: { first: 100 },
                    fetchPolicy: 'network-only',
                })
                .pipe(
                    map((res) =>
                        (res.data?.alertEvents?.data ?? []).filter(
                            (e) => e.status === AlertEventStatus.Triggered
                        ).length
                    ),
                    catchError(() => of(0))
                ),
        }).pipe(
            map(({ devices, widgets, openAlerts }) => {
                const deviceList = (devices.data?.devices ?? []).filter(
                    (d): d is DeviceInfoFragment => !!d
                );
                const widgetList = (widgets.data?.widgets ?? []).filter(
                    (w): w is WidgetInfoFragment => !!w
                );

                return {
                    stats: {
                        devices: this.deviceStats(deviceList),
                        widgets: this.widgetStats(widgetList),
                        dataModels: { total: 0 },
                    },
                    devices: deviceList,
                    widgets: widgetList,
                    openAlerts,
                };
            })
        );
    }

    /** Legacy aggregated-stats accessor retained for any existing callers. */
    public getStats(): Observable<DashboardStats> {
        return this.getOverview().pipe(map((o) => o.stats));
    }
}
