-- Drop indices
DROP INDEX IF EXISTS idx_dashboard_widgets_tenant;
DROP INDEX IF EXISTS idx_dashboard_widgets_device;
DROP INDEX IF EXISTS idx_dashboard_widgets_layout;
DROP INDEX IF EXISTS idx_dashboard_layouts_default;
DROP INDEX IF EXISTS idx_dashboard_layouts_tenant;

-- Drop tables
DROP TABLE IF EXISTS dashboard_widgets;
DROP TABLE IF EXISTS dashboard_layouts;

-- Drop enum type
DROP TYPE IF EXISTS dashboard_widget_type;
