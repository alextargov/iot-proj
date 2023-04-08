package resource

// Type represents a resource type in compass.
type Type string

const (
	// Device type represents device resource.
	Device Type = "device"
	// Schema type represents schema resource.
	Schema Type = "schemaMigration"
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
