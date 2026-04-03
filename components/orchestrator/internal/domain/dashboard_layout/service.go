package dashboard_layout

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/pkg/errors"
)

type LayoutRepository interface {
	Create(ctx context.Context, item model.DashboardLayout) error
	Get(ctx context.Context, id, tenantID string) (*model.DashboardLayout, error)
	GetDefault(ctx context.Context, tenantID string) (*model.DashboardLayout, error)
	List(ctx context.Context, tenantID string) ([]*model.DashboardLayout, error)
	Update(ctx context.Context, layout *model.DashboardLayout) error
	Delete(ctx context.Context, id, tenantID string) error
	ClearDefaults(ctx context.Context, tenantID string) error
}

type UUIDService interface {
	Generate() string
}

type Service struct {
	repo        LayoutRepository
	uuidService UUIDService
}

func NewService(repo LayoutRepository, uuidService UUIDService) *Service {
	return &Service{
		repo:        repo,
		uuidService: uuidService,
	}
}

func (s *Service) Create(ctx context.Context, input model.DashboardLayoutInput) (*model.DashboardLayout, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	id := s.uuidService.Generate()
	layout := input.ToDashboardLayout(id, tnt)

	logger.C(ctx).Debugf("Creating dashboard layout with id %s for tenant %s", id, tnt)

	if layout.IsDefault {
		if err := s.repo.ClearDefaults(ctx, tnt); err != nil {
			return nil, errors.Wrap(err, "while clearing existing default layouts")
		}
	}

	if err := s.repo.Create(ctx, layout); err != nil {
		return nil, errors.Wrap(err, "while creating dashboard layout")
	}

	return s.repo.Get(ctx, id, tnt)
}

func (s *Service) Get(ctx context.Context, id string) (*model.DashboardLayout, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Getting dashboard layout %s for tenant %s", id, tnt)

	return s.repo.Get(ctx, id, tnt)
}

func (s *Service) GetDefault(ctx context.Context) (*model.DashboardLayout, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Getting default dashboard layout for tenant %s", tnt)

	return s.repo.GetDefault(ctx, tnt)
}

func (s *Service) List(ctx context.Context) ([]*model.DashboardLayout, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Listing dashboard layouts for tenant %s", tnt)

	return s.repo.List(ctx, tnt)
}

func (s *Service) Update(ctx context.Context, id string, input model.UpdateDashboardLayoutInput) (*model.DashboardLayout, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Updating dashboard layout %s for tenant %s", id, tnt)

	layout, err := s.repo.Get(ctx, id, tnt)
	if err != nil {
		return nil, errors.Wrap(err, "while getting dashboard layout")
	}

	// Apply updates
	if input.Name != nil {
		layout.Name = *input.Name
	}
	if input.Description != nil {
		layout.Description = input.Description
	}
	if input.RefreshIntervalSeconds != nil {
		layout.RefreshIntervalSeconds = *input.RefreshIntervalSeconds
	}
	if input.IsDefault != nil {
		if *input.IsDefault && !layout.IsDefault {
			if err := s.repo.ClearDefaults(ctx, tnt); err != nil {
				return nil, errors.Wrap(err, "while clearing existing default layouts")
			}
		}
		layout.IsDefault = *input.IsDefault
	}

	if err := s.repo.Update(ctx, layout); err != nil {
		return nil, errors.Wrap(err, "while updating dashboard layout")
	}

	return s.repo.Get(ctx, id, tnt)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrap(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Deleting dashboard layout %s for tenant %s", id, tnt)

	return s.repo.Delete(ctx, id, tnt)
}

// GetByIDAndTenant is used by widget service for authorization checks
func (s *Service) GetByIDAndTenant(ctx context.Context, id, tenantID string) (*model.DashboardLayout, error) {
	return s.repo.Get(ctx, id, tenantID)
}
