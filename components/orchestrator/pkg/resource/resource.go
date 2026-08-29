package resource

// Type represents a resource type in the IoT platform.
type Type string

const (
	// Device type represents device resource.
	Device           Type = "device"
	Widget           Type = "widget"
	User             Type = "user"
	Host             Type = "host"
	DataModel        Type = "dataModel"
	DataModelVersion Type = "dataModelVersion"
	DeviceMetric     Type = "deviceMetric"
	AlertRule        Type = "alertRule"
	AlertEvent       Type = "alertEvent"
	DashboardLayout  Type = "dashboardLayout"
	DashboardWidget  Type = "dashboardWidget"
	AuditLog         Type = "auditLog"
	// Schema type represents schema resource.
	Schema Type = "schemaMigration"

	// Legacy types kept for test compatibility
	Application                Type = "application"
	AutomaticScenarioAssigment Type = "automaticScenarioAssignment"
	Label                      Type = "label"
)

// SQLOperation represents an SQL operation
type SQLOperation string

const (
	// Create represents Create SQL operation
	Create SQLOperation = "Create"
	// Update represents Update SQL operation
	Update SQLOperation = "Update"
	// Upsert represents Upsert SQL operation
	Upsert SQLOperation = "Upsert"
	// Delete represents Delete SQL operation
	Delete SQLOperation = "Delete"
	// Exists represents Exists SQL operation
	Exists SQLOperation = "Exists"
	// Get represents Get SQL operation
	Get SQLOperation = "Get"
	// List represents List SQL operation
	List SQLOperation = "List"
)
