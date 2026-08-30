package device

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/certmanager"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/pagination"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/transaction"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

type DeviceConverter interface {
	InputFromGraphQL(in graphql.DeviceInput) model.DeviceInput
	UpdateInputFromGraphQL(in graphql.UpdateDeviceInput) model.UpdateDeviceInput
	MultipleToGraphQL(in []*model.Device) []*graphql.Device
	ToGraphQL(in *model.Device) *graphql.Device
}

type DeviceSvc interface {
	ListAll(ctx context.Context) ([]*model.Device, error)
	ListByTags(ctx context.Context, tags []string) ([]*model.Device, error)
	ListAllTags(ctx context.Context) ([]string, error)
	ListPage(ctx context.Context, pageSize int, cursor string) ([]*model.Device, *pagination.Page, int, error)
	Create(ctx context.Context, device model.DeviceInput) (string, error)
	Clone(ctx context.Context, id string) (string, error)
	Update(ctx context.Context, id string, input model.UpdateDeviceInput) (*model.Device, error)
	Exists(ctx context.Context, id string) (bool, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*model.Device, error)
	SetCommunicationToken(ctx context.Context, id, token string) error
	SendOperation(ctx context.Context, deviceID string, op model.OperationType) error
	GetByToken(ctx context.Context, token string) (*model.Device, error)
	GenerateDeviceCertificate(ctx context.Context, id string) (*certmanager.IssuedCertificate, error)
	RevokeDeviceCertificate(ctx context.Context, id string) error
}

type HostSvc interface {
	GetByDeviceID(ctx context.Context, id string) (*model.Host, error)
	DeleteByDeviceID(ctx context.Context, deviceID string) error
}

type DataModelSvc interface {
	GetByID(ctx context.Context, id string) (*model.DataModel, error)
}

type HostConv interface {
	ToGraphQL(in *model.Host) *graphql.Host
}

type DataModelConv interface {
	ToGraphQL(in *model.DataModel) *graphql.DataModel
}

type Resolver struct {
	transact        persistence.Transactioner
	deviceSvc       DeviceSvc
	hostSvc         HostSvc
	dataModelSvc    DataModelSvc
	deviceConverter DeviceConverter
	hostConv        HostConv
	dataModelConv   DataModelConv
	statusPublisher StatusPublisher
}

// StatusPublisher publishes device status changes for real-time subscriptions.
// It is optional; when nil, status changes are simply not broadcast.
type StatusPublisher interface {
	Publish(deviceID, status string)
}

func NewResolver(transact persistence.Transactioner, deviceSvc DeviceSvc, hostSvc HostSvc, dataModelSvc DataModelSvc, deviceConverter DeviceConverter, hostConv HostConv, dataModelConv DataModelConv) *Resolver {
	return &Resolver{
		transact:        transact,
		deviceSvc:       deviceSvc,
		hostSvc:         hostSvc,
		dataModelSvc:    dataModelSvc,
		deviceConverter: deviceConverter,
		hostConv:        hostConv,
		dataModelConv:   dataModelConv,
	}
}

// SetStatusPublisher wires an optional publisher for real-time device status
// updates. Called during root resolver construction.
func (r *Resolver) SetStatusPublisher(p StatusPublisher) {
	r.statusPublisher = p
}

func (r *Resolver) Devices(ctx context.Context) ([]*graphql.Device, error) {
	return transaction.WithReadOnlyTransaction(ctx, r.transact, func(ctx context.Context) ([]*graphql.Device, error) {
		devices, err := r.deviceSvc.ListAll(ctx)
		if err != nil {
			return nil, err
		}
		return r.deviceConverter.MultipleToGraphQL(devices), nil
	})
}

func (r *Resolver) DevicesByTags(ctx context.Context, tags []string) ([]*graphql.Device, error) {
	return transaction.WithReadOnlyTransaction(ctx, r.transact, func(ctx context.Context) ([]*graphql.Device, error) {
		devices, err := r.deviceSvc.ListByTags(ctx, tags)
		if err != nil {
			return nil, err
		}
		return r.deviceConverter.MultipleToGraphQL(devices), nil
	})
}

func (r *Resolver) DeviceTags(ctx context.Context) ([]string, error) {
	return transaction.WithReadOnlyTransaction(ctx, r.transact, func(ctx context.Context) ([]string, error) {
		return r.deviceSvc.ListAllTags(ctx)
	})
}

func (r *Resolver) DevicesPage(ctx context.Context, first *int, after *string) (*graphql.DevicePage, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	pageSize := 20
	if first != nil {
		pageSize = *first
	}

	cursor := ""
	if after != nil {
		cursor = *after
	}

	devices, page, totalCount, err := r.deviceSvc.ListPage(ctx, pageSize, cursor)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return &graphql.DevicePage{
		Data:       r.deviceConverter.MultipleToGraphQL(devices),
		TotalCount: totalCount,
		PageInfo: &graphql.PageInfo{
			StartCursor: page.StartCursor,
			EndCursor:   page.EndCursor,
			HasNextPage: page.HasNextPage,
		},
	}, nil
}

func (r *Resolver) Device(ctx context.Context, id string) (*graphql.Device, error) {
	return transaction.WithReadOnlyTransaction(ctx, r.transact, func(ctx context.Context) (*graphql.Device, error) {
		device, err := r.deviceSvc.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		return r.deviceConverter.ToGraphQL(device), nil
	})
}

func (r *Resolver) DeviceByIDAndAggregation(ctx context.Context, id string, aggregation graphql.AggregationType) (*graphql.Device, error) {
	return nil, nil
}

func (r *Resolver) CreateDevice(ctx context.Context, input graphql.DeviceInput) (*graphql.Device, error) {
	return transaction.WithTransactionResult(ctx, r.transact, func(ctx context.Context) (*graphql.Device, error) {
		convertedIn := r.deviceConverter.InputFromGraphQL(input)

		id, err := r.deviceSvc.Create(ctx, convertedIn)
		if err != nil {
			return nil, err
		}

		device, err := r.deviceSvc.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}

		return r.deviceConverter.ToGraphQL(device), nil
	})
}

func (r *Resolver) CloneDevice(ctx context.Context, id string) (*graphql.Device, error) {
	return transaction.WithTransactionResult(ctx, r.transact, func(ctx context.Context) (*graphql.Device, error) {
		newID, err := r.deviceSvc.Clone(ctx, id)
		if err != nil {
			return nil, err
		}

		device, err := r.deviceSvc.GetByID(ctx, newID)
		if err != nil {
			return nil, err
		}

		return r.deviceConverter.ToGraphQL(device), nil
	})
}

func (r *Resolver) UpdateDevice(ctx context.Context, id string, input graphql.UpdateDeviceInput) (*graphql.Device, error) {
	return transaction.WithTransactionResult(ctx, r.transact, func(ctx context.Context) (*graphql.Device, error) {
		convertedIn := r.deviceConverter.UpdateInputFromGraphQL(input)

		device, err := r.deviceSvc.Update(ctx, id, convertedIn)
		if err != nil {
			return nil, err
		}

		return r.deviceConverter.ToGraphQL(device), nil
	})
}

func (r *Resolver) DeleteDevice(ctx context.Context, id string) (string, error) {
	return transaction.WithTransactionResult(ctx, r.transact, func(ctx context.Context) (string, error) {
		if err := r.hostSvc.DeleteByDeviceID(ctx, id); err != nil {
			return "", err
		}

		if err := r.deviceSvc.Delete(ctx, id); err != nil {
			return "", err
		}

		return id, nil
	})
}

func (r *Resolver) SetDeviceOperation(ctx context.Context, id string, op graphql.OperationType) (*graphql.Device, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	device, err := r.deviceSvc.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := r.deviceSvc.SendOperation(ctx, id, model.OperationType(op)); err != nil {
		r.publishStatus(id, string(model.DeviceStatusUnreachable))
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	r.publishStatus(id, string(model.DeviceStatusACTIVE))

	return r.deviceConverter.ToGraphQL(device), nil
}

// publishStatus broadcasts a device status change if a publisher is wired.
func (r *Resolver) publishStatus(deviceID, status string) {
	if r.statusPublisher != nil {
		r.statusPublisher.Publish(deviceID, status)
	}
}

func (r *Resolver) SetOperation(ctx context.Context, op graphql.OperationType, data interface{}) (bool, error) {
	return false, nil
}

func (r *Resolver) Host(ctx context.Context, obj *graphql.Device) (*graphql.Host, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	host, err := r.hostSvc.GetByDeviceID(ctx, obj.ID)
	if err != nil {
		if apperrors.IsNotFoundError(err) {
			return nil, tx.Commit()
		}
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.hostConv.ToGraphQL(host), nil
}

func (r *Resolver) DataModel(ctx context.Context, obj *graphql.Device) (*graphql.DataModel, error) {
	if obj.DataModelID == "" {
		return nil, nil
	}

	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	dataModel, err := r.dataModelSvc.GetByID(ctx, obj.DataModelID)
	if err != nil {
		if apperrors.IsNotFoundError(err) {
			return nil, tx.Commit()
		}
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.dataModelConv.ToGraphQL(dataModel), nil
}

// GenerateDeviceCertificate issues a new mTLS client certificate for the device.
func (r *Resolver) GenerateDeviceCertificate(ctx context.Context, deviceID string) (*graphql.DeviceCertificate, error) {
	return transaction.WithTransactionResult(ctx, r.transact, func(ctx context.Context) (*graphql.DeviceCertificate, error) {
		issued, err := r.deviceSvc.GenerateDeviceCertificate(ctx, deviceID)
		if err != nil {
			return nil, err
		}

		privateKey := issued.PrivateKeyPEM
		return &graphql.DeviceCertificate{
			Certificate:   issued.CertificatePEM,
			PrivateKey:    &privateKey,
			CaCertificate: issued.CACertificatePEM,
			Serial:        issued.Serial,
			ExpiresAt:     graphql.Timestamp(issued.ExpiresAt),
		}, nil
	})
}

// RevokeDeviceCertificate clears the stored certificate for the device.
func (r *Resolver) RevokeDeviceCertificate(ctx context.Context, deviceID string) (bool, error) {
	return transaction.WithTransactionResult(ctx, r.transact, func(ctx context.Context) (bool, error) {
		if err := r.deviceSvc.RevokeDeviceCertificate(ctx, deviceID); err != nil {
			return false, err
		}
		return true, nil
	})
}
