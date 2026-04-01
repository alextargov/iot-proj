import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
    GetDeviceMetricsGQL,
    GetDeviceMetricsSeriesGQL,
    GetDeviceAggregatedMetricsGQL,
    DeviceMetricInfoFragment,
    MetricSeriesInfoFragment,
    AggregatedMetricInfoFragment,
    AggregationType,
    MetricFilterInput,
} from '../../graphql/generated';

@Injectable({
    providedIn: 'root',
})
export class MetricsService {
    constructor(
        private getDeviceMetricsGQL: GetDeviceMetricsGQL,
        private getDeviceMetricsSeriesGQL: GetDeviceMetricsSeriesGQL,
        private getDeviceAggregatedMetricsGQL: GetDeviceAggregatedMetricsGQL
    ) {}

    /**
     * Get metrics for a device with optional filtering
     */
    getMetrics(
        deviceId: string,
        filter?: MetricFilterInput
    ): Observable<DeviceMetricInfoFragment[]> {
        return this.getDeviceMetricsGQL
            .fetch({ variables: { deviceId, filter } })
            .pipe(map((result) => result.data.deviceMetrics));
    }

    /**
     * Get metrics grouped by metric name as series
     */
    getMetricsSeries(
        deviceId: string,
        metricNames?: string[],
        filter?: MetricFilterInput
    ): Observable<MetricSeriesInfoFragment[]> {
        return this.getDeviceMetricsSeriesGQL
            .fetch({ variables: { deviceId, metricNames, filter } })
            .pipe(map((result) => result.data.deviceMetricsSeries));
    }

    /**
     * Get aggregated metrics for a device
     */
    getAggregatedMetrics(
        deviceId: string,
        aggregation: AggregationType,
        filter?: MetricFilterInput
    ): Observable<AggregatedMetricInfoFragment | null> {
        return this.getDeviceAggregatedMetricsGQL
            .fetch({ variables: { deviceId, aggregation, filter } })
            .pipe(map((result) => result.data.deviceAggregatedMetrics ?? null));
    }
}
