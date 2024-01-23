package device

import (
	"context"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
	"github.com/pkg/errors"
)

type DeviceRepository interface {
	Exists(ctx context.Context, id string) (bool, error)
	Create(ctx context.Context, item model.Device) error
	Get(ctx context.Context, id, tnt string) (*model.Device, error)
	ListByIDs(ctx context.Context, tenant string, ids []string) ([]*model.Device, error)
	ListAll(ctx context.Context, tenantID string) ([]*model.Device, error)
	ListAllGlobal(ctx context.Context) ([]*model.Device, error)
	Update(ctx context.Context, model model.Device) error
	Delete(ctx context.Context, id, tenantID string) error
}

type EncryptionService interface {
	Encrypt(str string) (string, error)
	Compare(hash, rawStr string) (bool, error)
}

type UUIDService interface {
	Generate() string
}

type HostService interface {
	Create(ctx context.Context, deviceID string, hostInput model.HostInput) (*model.Host, error)
}

type service struct {
	deviceRepo  DeviceRepository
	uuidService UUIDService
	hostService HostService
}

func NewService(repo DeviceRepository, uuidService UUIDService, hostService HostService) *service {
	return &service{
		deviceRepo:  repo,
		uuidService: uuidService,
		hostService: hostService,
	}
}

func (s *service) GetByID(ctx context.Context, id string) (*model.Device, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	log.C(ctx).Debugf("Getting device by id %s for tenant %s", id, tnt)

	return s.deviceRepo.Get(ctx, id, tnt)
}

func (s *service) ListAll(ctx context.Context) ([]*model.Device, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	return s.deviceRepo.ListAll(ctx, tnt)
}

func (s *service) ListAllGlobal(ctx context.Context) ([]*model.Device, error) {
	return s.deviceRepo.ListAllGlobal(ctx)
}

func (s *service) Create(ctx context.Context, device model.DeviceInput) (string, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return "", errors.Wrapf(err, "while loading tenant")
	}
	id := s.uuidService.Generate()
	deviceModel := device.ToDevice(id)
	deviceModel.TenantID = tnt

	if err := s.deviceRepo.Create(ctx, deviceModel); err != nil {
		return "", errors.Wrapf(err, "while creating device")
	}

	if err := s.createRelatedResources(ctx, id, device); err != nil {
		return "", err
	}

	return id, err
}

func (s *service) Update(ctx context.Context, device model.DeviceInput) error {
	return nil
	//return s.deviceRepo.Update(ctx, device)
}

func (s *service) Exists(ctx context.Context, id string) (bool, error) {
	return s.deviceRepo.Exists(ctx, id)
}

func (s *service) Delete(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrapf(err, "while loading tenant from context")
	}

	_, err = s.deviceRepo.Get(ctx, id, tnt)
	if err != nil {
		return errors.Wrapf(err, "does not exist or tenant does not have access")
	}

	return s.deviceRepo.Delete(ctx, id, tnt)
}

func (s *service) createRelatedResources(ctx context.Context, deviceID string, device model.DeviceInput) error {
	if device.Host != nil {
		if _, err := s.hostService.Create(ctx, deviceID, *device.Host); err != nil {
			return err
		}
	}

	return nil
}
