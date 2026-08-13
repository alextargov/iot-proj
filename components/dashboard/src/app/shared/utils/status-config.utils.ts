import { DeviceStatus, WidgetStatus } from '../graphql/generated';

/**
 * Configuration for status display
 */
export interface StatusConfig {
    icon: string;
    label: string;
    cssClass: string;
    tooltip: string;
    color: string;
}

/**
 * Device status configurations
 */
export const DEVICE_STATUS_CONFIGS: Record<DeviceStatus, StatusConfig> = {
    [DeviceStatus.Active]: {
        icon: 'check_circle',
        label: 'Active',
        cssClass: 'status--active',
        tooltip: 'Device is online and operational',
        color: '#4caf50',
    },
    [DeviceStatus.Initial]: {
        icon: 'hourglass_empty',
        label: 'Initial',
        cssClass: 'status--initial',
        tooltip: 'Device is initializing',
        color: '#ff9800',
    },
    [DeviceStatus.Error]: {
        icon: 'error',
        label: 'Error',
        cssClass: 'status--error',
        tooltip: 'Device encountered an error',
        color: '#f44336',
    },
    [DeviceStatus.Unreachable]: {
        icon: 'cloud_off',
        label: 'Unreachable',
        cssClass: 'status--unreachable',
        tooltip: 'Device is not reachable',
        color: '#9e9e9e',
    },
};

/**
 * Widget status configurations
 */
export const WIDGET_STATUS_CONFIGS: Record<WidgetStatus, StatusConfig> = {
    [WidgetStatus.Active]: {
        icon: 'check_circle',
        label: 'Active',
        cssClass: 'status--active',
        tooltip: 'Widget is active and running',
        color: '#4caf50',
    },
    [WidgetStatus.Inactive]: {
        icon: 'pause_circle',
        label: 'Inactive',
        cssClass: 'status--inactive',
        tooltip: 'Widget is inactive',
        color: '#9e9e9e',
    },
};

/**
 * Default status config for unknown statuses
 */
export const DEFAULT_STATUS_CONFIG: StatusConfig = {
    icon: 'help_outline',
    label: 'Unknown',
    cssClass: 'status--unknown',
    tooltip: 'Status unknown',
    color: '#9e9e9e',
};

/**
 * Get status configuration for a device
 * @param status Device status
 * @returns StatusConfig for the status
 */
export function getDeviceStatusConfig(status: DeviceStatus | string | null | undefined): StatusConfig {
    if (!status) {
        return DEFAULT_STATUS_CONFIG;
    }
    return DEVICE_STATUS_CONFIGS[status as DeviceStatus] ?? DEFAULT_STATUS_CONFIG;
}

/**
 * Get status configuration for a widget
 * @param status Widget status
 * @returns StatusConfig for the status
 */
export function getWidgetStatusConfig(status: WidgetStatus | string | null | undefined): StatusConfig {
    if (!status) {
        return DEFAULT_STATUS_CONFIG;
    }
    return WIDGET_STATUS_CONFIGS[status as WidgetStatus] ?? DEFAULT_STATUS_CONFIG;
}

/**
 * Check if a device status indicates the device is operational
 * @param status Device status
 * @returns true if the device is operational
 */
export function isDeviceOperational(status: DeviceStatus | string | null | undefined): boolean {
    return status === DeviceStatus.Active;
}

/**
 * Check if a widget status indicates the widget is active
 * @param status Widget status
 * @returns true if the widget is active
 */
export function isWidgetActive(status: WidgetStatus | string | null | undefined): boolean {
    return status === WidgetStatus.Active;
}

/**
 * Check if a status indicates an error state
 * @param status Device status
 * @returns true if the status indicates an error
 */
export function isErrorStatus(status: DeviceStatus | string | null | undefined): boolean {
    return status === DeviceStatus.Error;
}
