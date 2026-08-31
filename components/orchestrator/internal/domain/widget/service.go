package widget

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/pagination"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/pkg/errors"
)

type WidgetRepository interface {
	Create(ctx context.Context, item model.Widget) error
	Update(ctx context.Context, item model.Widget) error
	Get(ctx context.Context, id, tnt string) (*model.Widget, error)
	ListByIDs(ctx context.Context, tenant string, ids []string) ([]*model.Widget, error)
	ListAll(ctx context.Context, tenantID string) ([]*model.Widget, error)
	ListPage(ctx context.Context, tenantID string, pageSize int, cursor string) ([]*model.Widget, *pagination.Page, int, error)
	Delete(ctx context.Context, id, tenantID string) error
	GetScheduledWidgets(ctx context.Context) ([]*model.Widget, error)
	UpdateLastExecuted(ctx context.Context, id string, timestamp time.Time) error
	SetDeviceIDs(ctx context.Context, widgetID string, deviceIDs []string) error
	GetDeviceIDs(ctx context.Context, widgetID string) ([]string, error)
}

type UUIDService interface {
	Generate() string
}

type service struct {
	widgetRepo  WidgetRepository
	uuidService UUIDService
}

func NewService(repo WidgetRepository, uuidService UUIDService) *service {
	return &service{
		widgetRepo:  repo,
		uuidService: uuidService,
	}
}

func (s *service) GetByID(ctx context.Context, id string) (*model.Widget, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Getting widget by id %s for tenant %s", id, tnt)

	return s.widgetRepo.Get(ctx, id, tnt)
}

func (s *service) ListAll(ctx context.Context) ([]*model.Widget, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	return s.widgetRepo.ListAll(ctx, tnt)
}

func (s *service) ListPage(ctx context.Context, pageSize int, cursor string) ([]*model.Widget, *pagination.Page, int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, nil, 0, errors.Wrapf(err, "while loading tenant from context")
	}

	return s.widgetRepo.ListPage(ctx, tnt, pageSize, cursor)
}

func (s *service) Create(ctx context.Context, widget model.WidgetInput) (string, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return "", errors.Wrapf(err, "while loading tenant")
	}

	id := s.uuidService.Generate()
	widgetModel := widget.ToWidget(id)
	widgetModel.TenantID = tnt

	// Create the widget first
	if err = s.widgetRepo.Create(ctx, widgetModel); err != nil {
		return "", errors.Wrapf(err, "while creating widget")
	}

	// Set device associations in the junction table
	if len(widget.DeviceIDs) > 0 {
		if err = s.widgetRepo.SetDeviceIDs(ctx, id, widget.DeviceIDs); err != nil {
			return "", errors.Wrapf(err, "while setting widget device associations")
		}
	}

	return id, nil
}

// Update modifies an existing widget's mutable fields and device associations.
// code/workspace live on the Application CR (scheduled by the resolver), not in
// the DB, so they are not touched here.
func (s *service) Update(ctx context.Context, id string, widget model.WidgetInput) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrapf(err, "while loading tenant")
	}

	existing, err := s.widgetRepo.Get(ctx, id, tnt)
	if err != nil {
		return errors.Wrapf(err, "while getting widget %s", id)
	}

	widgetModel := widget.ToWidget(id)
	widgetModel.TenantID = tnt
	widgetModel.CreatedAt = existing.CreatedAt

	if err = s.widgetRepo.Update(ctx, widgetModel); err != nil {
		return errors.Wrapf(err, "while updating widget %s", id)
	}

	if err = s.widgetRepo.SetDeviceIDs(ctx, id, widget.DeviceIDs); err != nil {
		return errors.Wrapf(err, "while updating widget device associations")
	}

	return nil
}

// Clone creates a copy of an existing widget (including its device
// associations, code, workspace and schedule) under a new ID. The clone is
// created INACTIVE so it does not execute until explicitly activated.
func (s *service) Clone(ctx context.Context, id string) (string, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return "", errors.Wrapf(err, "while loading tenant from context")
	}

	source, err := s.widgetRepo.Get(ctx, id, tnt)
	if err != nil {
		return "", errors.Wrapf(err, "while getting source widget %s", id)
	}

	input := model.WidgetInput{
		Name:        source.Name + " (copy)",
		Description: source.Description,
		Status:      model.DeviceStatusInactive,
		Code:        source.Code,
		Workspace:   source.Workspace,
		DeviceIDs:   append([]string(nil), source.DeviceIDs...),
		Schedule:    source.Schedule,
	}

	return s.Create(ctx, input)
}

func (s *service) Delete(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrapf(err, "while loading tenant from context")
	}

	if _, err = s.widgetRepo.Get(ctx, id, tnt); err != nil {
		if apperrors.IsNotFoundError(err) {
			return nil
		}

		return errors.Wrapf(err, "tenant does not have access")
	}

	// widget_devices entries are deleted via CASCADE
	return s.widgetRepo.Delete(ctx, id, tnt)
}

// GetScheduledWidgets returns all widgets that have a schedule configured
func (s *service) GetScheduledWidgets(ctx context.Context) ([]*model.Widget, error) {
	return s.widgetRepo.GetScheduledWidgets(ctx)
}

// UpdateLastExecuted updates the last execution timestamp for a widget
func (s *service) UpdateLastExecuted(ctx context.Context, id string) error {
	return s.widgetRepo.UpdateLastExecuted(ctx, id, time.Now())
}
