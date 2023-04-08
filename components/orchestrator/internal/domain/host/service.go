package host

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/model"
	"github.com/iot-proj/components/orchestrator/internal/tenant"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
	"github.com/pkg/errors"
)

type HostRepository interface {
	GetByDeviceID(ctx context.Context, id, tnt string) (*model.Host, error)
}

type EncryptionService interface {
	Encrypt(str string) (string, error)
	Compare(hash, rawStr string) (bool, error)
}

type UUIDService interface {
	Generate() string
}

type service struct {
	hostRepo    HostRepository
	uuidService UUIDService
}

func NewService(repo HostRepository, uuidService UUIDService) *service {
	return &service{
		hostRepo:    repo,
		uuidService: uuidService,
	}
}

func (s *service) GetByDeviceID(ctx context.Context, id string) (*model.Host, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	log.C(ctx).Debugf("Getting device by id %s for tenant %s", id, tnt)

	return s.hostRepo.GetByDeviceID(ctx, id, tnt)
}
