package model

import (
	"encoding/json"
	"time"
)

// AuditAction represents the type of operation performed
type AuditAction string

const (
	AuditActionCreate AuditAction = "CREATE"
	AuditActionUpdate AuditAction = "UPDATE"
	AuditActionDelete AuditAction = "DELETE"
)

// AuditStatus represents the outcome of the operation
type AuditStatus string

const (
	AuditStatusSuccess AuditStatus = "SUCCESS"
	AuditStatusFailure AuditStatus = "FAILURE"
)

// AuditLog represents an audit log entry
type AuditLog struct {
	ID           string          `json:"id"`
	TenantID     string          `json:"tenantId"`
	UserID       string          `json:"userId"`
	Username     string          `json:"username"`
	Action       AuditAction     `json:"action"`
	ResourceType string          `json:"resourceType"`
	ResourceID   *string         `json:"resourceId,omitempty"`
	ResourceName *string         `json:"resourceName,omitempty"`
	Details      json.RawMessage `json:"details,omitempty"`
	IPAddress    *string         `json:"ipAddress,omitempty"`
	UserAgent    *string         `json:"userAgent,omitempty"`
	Status       AuditStatus     `json:"status"`
	ErrorMessage *string         `json:"errorMessage,omitempty"`
	CreatedAt    time.Time       `json:"createdAt"`
}

// AuditLogInput represents input for creating an audit log entry
type AuditLogInput struct {
	TenantID     string
	UserID       string
	Username     string
	Action       AuditAction
	ResourceType string
	ResourceID   *string
	ResourceName *string
	Details      json.RawMessage
	IPAddress    *string
	UserAgent    *string
	Status       AuditStatus
	ErrorMessage *string
}
