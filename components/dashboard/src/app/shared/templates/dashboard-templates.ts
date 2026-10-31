import { DashboardWidgetType } from '../graphql/generated';

/**
 * A single tile within a dashboard template. Grid position is assigned at
 * creation time (first-free-cell) unless gridX/gridY are provided; the config
 * is a partial widget config — device bindings are intentionally left blank for
 * the user to fill in after the dashboard is created.
 */
export interface TemplateWidget {
    widgetType: DashboardWidgetType;
    title: string;
    gridCols: number;
    gridRows: number;
    gridX?: number;
    gridY?: number;
    config: Record<string, unknown>;
}

export interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    widgets: TemplateWidget[];
}

/**
 * Canned dashboard templates. These are frontend-only: choosing one creates a
 * DashboardLayout and then adds each widget via the existing addWidget API.
 * Tiles ship without a device binding, so they render an empty/no-data state
 * until the user edits each tile and selects a device + metric.
 */
export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
    {
        id: 'blank',
        name: 'Blank',
        description: 'Start with an empty dashboard.',
        icon: 'dashboard',
        widgets: [],
    },
    {
        id: 'device-overview',
        name: 'Device Overview',
        description:
            'Status indicator, a gauge and a stat card — a quick health view for a single device. Bind each tile to a device after creation.',
        icon: 'devices',
        widgets: [
            {
                widgetType: DashboardWidgetType.StatusIndicator,
                title: 'Device Status',
                gridCols: 2,
                gridRows: 2,
                gridX: 0,
                gridY: 0,
                config: { size: 'medium', showLabel: true },
            },
            {
                widgetType: DashboardWidgetType.Gauge,
                title: 'Primary Metric',
                gridCols: 2,
                gridRows: 2,
                gridX: 2,
                gridY: 0,
                config: { minValue: 0, maxValue: 100, decimals: 1 },
            },
            {
                widgetType: DashboardWidgetType.StatCard,
                title: 'Average (last hour)',
                gridCols: 2,
                gridRows: 2,
                gridX: 4,
                gridY: 0,
                config: { aggregation: 'average', timeRange: 'hour', decimals: 1 },
            },
        ],
    },
    {
        id: 'metrics-glance',
        name: 'Metrics at a Glance',
        description:
            'A line chart over a recent-readings table — good for trend monitoring. Bind the tiles to a device and metric after creation.',
        icon: 'insights',
        widgets: [
            {
                widgetType: DashboardWidgetType.LineChart,
                title: 'Metric Trend',
                gridCols: 8,
                gridRows: 4,
                gridX: 0,
                gridY: 0,
                config: { timeRange: 'hour' },
            },
            {
                widgetType: DashboardWidgetType.Table,
                title: 'Recent Readings',
                gridCols: 4,
                gridRows: 4,
                gridX: 8,
                gridY: 0,
                config: { timeRange: 'hour', limit: 10 },
            },
        ],
    },
];
