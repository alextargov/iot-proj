package widget

import (
	"context"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
	"github.com/pkg/errors"
)

type WidgetRepository interface {
	Create(ctx context.Context, item model.Widget) error
	Get(ctx context.Context, id, tnt string) (*model.Widget, error)
	ListByIDs(ctx context.Context, tenant string, ids []string) ([]*model.Widget, error)
	ListAll(ctx context.Context, tenantID string) ([]*model.Widget, error)
	Delete(ctx context.Context, id, tenantID string) error
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

	log.C(ctx).Debugf("Getting widget by id %s for tenant %s", id, tnt)

	return s.widgetRepo.Get(ctx, id, tnt)
}

func (s *service) ListAll(ctx context.Context) ([]*model.Widget, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	return s.widgetRepo.ListAll(ctx, tnt)
}

func (s *service) Create(ctx context.Context, widget model.WidgetInput) (string, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return "", errors.Wrapf(err, "while loading tenant")
	}

	id := s.uuidService.Generate()
	widgetModel := widget.ToWidget(id)
	widgetModel.TenantID = tnt

	if err = s.widgetRepo.Create(ctx, widgetModel); err != nil {
		return "", errors.Wrapf(err, "while creating widget")
	}

	return id, err
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

	return s.widgetRepo.Delete(ctx, id, tnt)
}
