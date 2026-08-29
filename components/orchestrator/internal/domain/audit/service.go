package audit

import (
	"context"
	"encoding/json"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
)

// AuditRepository defines the interface for audit log repository
type AuditRepository interface {
	Create(ctx context.Context, auditLog *model.AuditLog) error
	ListByTenant(ctx context.Context, tenantID string, first int, afterCursor string) ([]*model.AuditLog, int, error)
	ListByResource(ctx context.Context, tenantID, resourceType, resourceID string, first int) ([]*model.AuditLog, error)
}

// UUIDService defines the interface for UUID generation
type UUIDService interface {
	Generate() string
}

// Service handles audit log business logic
type Service struct {
	repo        AuditRepository
	uuidService UUIDService
	conv        *Converter
}

// NewService creates a new audit service
func NewService(repo AuditRepository, uuidService UUIDService, conv *Converter) *Service {
	return &Service{
		repo:        repo,
		uuidService: uuidService,
		conv:        conv,
	}
}

// LogOperation creates an audit log entry for an operation
func (s *Service) LogOperation(ctx context.Context, input *model.AuditLogInput) error {
	id := s.uuidService.Generate()
	auditLog := s.conv.InputFromModel(id, input)

	logger.C(ctx).Infof("Audit: %s %s %s by user %s", input.Action, input.ResourceType, ptrToString(input.ResourceID), input.Username)

	return s.repo.Create(ctx, auditLog)
}

// LogSuccess creates an audit log entry for a successful operation
func (s *Service) LogSuccess(ctx context.Context, tenantID, userID, username string, action model.AuditAction, resourceType string, resourceID, resourceName *string, details interface{}, ipAddress, userAgent *string) error {
	var detailsJSON json.RawMessage
	if details != nil {
		data, err := json.Marshal(details)
		if err != nil {
			logger.C(ctx).Warnf("Failed to marshal audit details: %v", err)
		} else {
			detailsJSON = data
		}
	}

	input := &model.AuditLogInput{
		TenantID:     tenantID,
		UserID:       userID,
		Username:     username,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		Details:      detailsJSON,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		Status:       model.AuditStatusSuccess,
	}

	return s.LogOperation(ctx, input)
}

// LogFailure creates an audit log entry for a failed operation
func (s *Service) LogFailure(ctx context.Context, tenantID, userID, username string, action model.AuditAction, resourceType string, resourceID, resourceName *string, errorMsg string, ipAddress, userAgent *string) error {
	input := &model.AuditLogInput{
		TenantID:     tenantID,
		UserID:       userID,
		Username:     username,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		Status:       model.AuditStatusFailure,
		ErrorMessage: &errorMsg,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
	}

	return s.LogOperation(ctx, input)
}

// ListByTenant lists audit logs for a tenant
func (s *Service) ListByTenant(ctx context.Context, tenantID string, first int, afterCursor string) ([]*model.AuditLog, int, error) {
	return s.repo.ListByTenant(ctx, tenantID, first, afterCursor)
}

// ListByResource lists audit logs for a specific resource
func (s *Service) ListByResource(ctx context.Context, tenantID, resourceType, resourceID string, first int) ([]*model.AuditLog, error) {
	return s.repo.ListByResource(ctx, tenantID, resourceType, resourceID, first)
}

func ptrToString(s *string) string {
	if s == nil {
		return "<nil>"
	}
	return *s
}
