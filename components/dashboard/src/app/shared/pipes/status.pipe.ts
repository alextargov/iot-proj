import { Pipe, PipeTransform } from '@angular/core';
import { DeviceStatus, WidgetStatus } from '../graphql/generated';
import {
    StatusConfig,
    getDeviceStatusConfig,
    getWidgetStatusConfig,
    DEFAULT_STATUS_CONFIG,
} from '../utils/status-config.utils';

type StatusProperty = keyof StatusConfig;

/**
 * Pipe to get status configuration properties for device statuses
 *
 * Usage:
 *   {{ device.status | deviceStatus:'icon' }}
 *   {{ device.status | deviceStatus:'label' }}
 *   {{ device.status | deviceStatus:'cssClass' }}
 *   {{ device.status | deviceStatus:'tooltip' }}
 *   {{ device.status | deviceStatus:'color' }}
 */
@Pipe({
    name: 'deviceStatus',
    standalone: false,
})
export class DeviceStatusPipe implements PipeTransform {
    transform(status: DeviceStatus | string | null | undefined, property: StatusProperty): string {
        const config = getDeviceStatusConfig(status);
        return config[property];
    }
}

/**
 * Pipe to get status configuration properties for widget statuses
 *
 * Usage:
 *   {{ widget.status | widgetStatus:'icon' }}
 *   {{ widget.status | widgetStatus:'label' }}
 *   {{ widget.status | widgetStatus:'cssClass' }}
 *   {{ widget.status | widgetStatus:'tooltip' }}
 *   {{ widget.status | widgetStatus:'color' }}
 */
@Pipe({
    name: 'widgetStatus',
    standalone: false,
})
export class WidgetStatusPipe implements PipeTransform {
    transform(status: WidgetStatus | string | null | undefined, property: StatusProperty): string {
        const config = getWidgetStatusConfig(status);
        return config[property];
    }
}

/**
 * Pipe to get the full status configuration object
 *
 * Usage:
 *   <ng-container *ngIf="device.status | statusConfig:'device' as config">
 *     <mat-icon [class]="config.cssClass">{{ config.icon }}</mat-icon>
 *     <span>{{ config.label }}</span>
 *   </ng-container>
 */
@Pipe({
    name: 'statusConfig',
    standalone: false,
})
export class StatusConfigPipe implements PipeTransform {
    transform(
        status: DeviceStatus | WidgetStatus | string | null | undefined,
        type: 'device' | 'widget'
    ): StatusConfig {
        if (type === 'device') {
            return getDeviceStatusConfig(status as DeviceStatus);
        } else if (type === 'widget') {
            return getWidgetStatusConfig(status as WidgetStatus);
        }
        return DEFAULT_STATUS_CONFIG;
    }
}
