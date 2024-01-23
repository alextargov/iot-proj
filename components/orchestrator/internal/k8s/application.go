package k8s

import (
	"context"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
	"github.com/pkg/errors"
	"time"
)

// Scheduler is responsible for scheduling any provided Application entity for later processing
//
//go:generate mockery --name=Scheduler --output=automock --outpkg=automock --case=underscore --disable-version-string
type Scheduler interface {
	Schedule(ctx context.Context, app *Application) (string, error)
}

type Application struct {
	ApplicationID string    `json:"application_id,omitempty"`
	WidgetID      string    `json:"widget_id,omitempty"`
	SourceCode    string    `json:"source_code,omitempty"`
	NodeVersion   string    `json:"node_version,omitempty"`
	ReplicasCount int       `json:"replicas_count,omitempty"`
	CreationTime  time.Time `json:"creation_time,omitempty"`
}

// Validate ensures that the constructed Operation has valid properties
func (app *Application) Validate() error {
	return validation.ValidateStruct(app,
		validation.Field(&app.WidgetID, is.UUID))
}

type svc struct {
	transact  persistence.Transactioner
	scheduler Scheduler
}

func NewApplicationService(transactioner persistence.Transactioner, scheduler Scheduler) *svc {
	return &svc{
		transact:  transactioner,
		scheduler: scheduler,
	}
}

func (s *svc) Handle(ctx context.Context, application *Application) error {
	application.CreationTime = time.Now()
	application.NodeVersion = "15.0.0"
	application.ReplicasCount = 1

	if err := application.Validate(); err != nil {
		return errors.Wrap(err, "while validation Application object")
	}

	applicationID, err := s.scheduler.Schedule(ctx, application)
	if err != nil {
		log.C(ctx).WithError(err).Errorf("An error occurred while scheduling operation for Application: %s", err.Error())
		return errors.Wrap(err, "Unable to schedule operation")
	}

	application.ApplicationID = applicationID

	return nil
}
