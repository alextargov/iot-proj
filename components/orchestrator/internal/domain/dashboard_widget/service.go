package dashboard_widget

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/pkg/errors"
)

type WidgetRepository interface {
	Create(ctx context.Context, item model.DashboardWidget) error
	Get(ctx context.Context, id, tenantID string) (*model.DashboardWidget, error)
	ListByLayoutID(ctx context.Context, layoutID, tenantID string) ([]*model.DashboardWidget, error)
	Update(ctx context.Context, widget *model.DashboardWidget) error
	Delete(ctx context.Context, id, tenantID string) error
	UpdatePositions(ctx context.Context, positions []model.WidgetPositionInput) error
}

type LayoutGetter interface {
	GetByIDAndTenant(ctx context.Context, id, tenantID string) (*model.DashboardLayout, error)
}

type UUIDService interface {
	Generate() string
}

type Service struct {
	repo         WidgetRepository
	layoutGetter LayoutGetter
	uuidService  UUIDService
}

func NewService(repo WidgetRepository, layoutGetter LayoutGetter, uuidService UUIDService) *Service {
	return &Service{
		repo:         repo,
		layoutGetter: layoutGetter,
		uuidService:  uuidService,
	}
}

func (s *Service) Add(ctx context.Context, layoutID string, input model.DashboardWidgetInput) (*model.DashboardWidget, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	// Verify layout exists and belongs to tenant
	_, err = s.layoutGetter.GetByIDAndTenant(ctx, layoutID, tnt)
	if err != nil {
		return nil, errors.Wrap(err, "while verifying layout ownership")
	}

	id := s.uuidService.Generate()
	widget := input.ToDashboardWidget(id, layoutID, tnt)

	logger.C(ctx).Debugf("Adding widget %s to layout %s for tenant %s", id, layoutID, tnt)

	if err := s.repo.Create(ctx, widget); err != nil {
		return nil, errors.Wrap(err, "while creating dashboard widget")
	}

	return s.repo.Get(ctx, id, tnt)
}

func (s *Service) Get(ctx context.Context, id string) (*model.DashboardWidget, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	return s.repo.Get(ctx, id, tnt)
}

func (s *Service) ListByLayoutID(ctx context.Context, layoutID string) ([]*model.DashboardWidget, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	return s.repo.ListByLayoutID(ctx, layoutID, tnt)
}

func (s *Service) Update(ctx context.Context, id string, input model.UpdateDashboardWidgetInput) (*model.DashboardWidget, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Updating widget %s for tenant %s", id, tnt)

	widget, err := s.repo.Get(ctx, id, tnt)
	if err != nil {
		return nil, errors.Wrap(err, "while getting widget")
	}

	if input.Title != nil {
		widget.Title = *input.Title
	}
	if input.GridX != nil {
		widget.GridX = *input.GridX
	}
	if input.GridY != nil {
		widget.GridY = *input.GridY
	}
	if input.GridCols != nil {
		widget.GridCols = *input.GridCols
	}
	if input.GridRows != nil {
		widget.GridRows = *input.GridRows
	}
	if input.DeviceID != nil {
		widget.DeviceID = input.DeviceID
	}
	if input.MetricName != nil {
		widget.MetricName = input.MetricName
	}
	if input.Config != nil {
		widget.Config = input.Config
	}

	if err := s.repo.Update(ctx, widget); err != nil {
		return nil, errors.Wrap(err, "while updating widget")
	}

	return s.repo.Get(ctx, id, tnt)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrap(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Deleting widget %s for tenant %s", id, tnt)

	return s.repo.Delete(ctx, id, tnt)
}

func (s *Service) UpdatePositions(ctx context.Context, layoutID string, positions []model.WidgetPositionInput) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrap(err, "while loading tenant from context")
	}

	// Verify layout exists and belongs to tenant
	_, err = s.layoutGetter.GetByIDAndTenant(ctx, layoutID, tnt)
	if err != nil {
		return errors.Wrap(err, "while verifying layout ownership")
	}

	logger.C(ctx).Debugf("Updating widget positions for layout %s, tenant %s", layoutID, tnt)

	return s.repo.UpdatePositions(ctx, positions)
}
