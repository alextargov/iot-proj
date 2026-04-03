-- Dashboard widget types
CREATE TYPE dashboard_widget_type AS ENUM (
    'GAUGE',
    'LINE_CHART',
    'STATUS_INDICATOR',
    'STAT_CARD',
    'TABLE'
);

-- Dashboard layouts table (stores user dashboard configurations)
CREATE TABLE dashboard_layouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name varchar(256) NOT NULL DEFAULT 'My Dashboard',
    description text,
    is_default boolean DEFAULT false,
    refresh_interval_seconds int DEFAULT 30,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    CONSTRAINT dashboard_layouts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Dashboard widgets table (individual widgets on a dashboard)
CREATE TABLE dashboard_widgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_layout_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    widget_type dashboard_widget_type NOT NULL,
    title varchar(256) NOT NULL,
    grid_x int NOT NULL DEFAULT 0,
    grid_y int NOT NULL DEFAULT 0,
    grid_cols int NOT NULL DEFAULT 2,
    grid_rows int NOT NULL DEFAULT 2,
    device_id uuid,
    metric_name varchar(128),
    config jsonb NOT NULL DEFAULT '{}',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    CONSTRAINT dashboard_widgets_layout_fkey FOREIGN KEY (dashboard_layout_id) REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
    CONSTRAINT dashboard_widgets_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT dashboard_widgets_device_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- Indices for efficient queries
CREATE INDEX idx_dashboard_layouts_tenant ON dashboard_layouts(tenant_id);
CREATE INDEX idx_dashboard_layouts_default ON dashboard_layouts(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX idx_dashboard_widgets_layout ON dashboard_widgets(dashboard_layout_id);
CREATE INDEX idx_dashboard_widgets_device ON dashboard_widgets(device_id);
CREATE INDEX idx_dashboard_widgets_tenant ON dashboard_widgets(tenant_id);
