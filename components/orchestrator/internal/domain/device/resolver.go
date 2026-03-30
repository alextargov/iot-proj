package device

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/pagination"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

type DeviceConverter interface {
	InputFromGraphQL(in graphql.DeviceInput) model.DeviceInput
	MultipleToGraphQL(in []*model.Device) []*graphql.Device
	ToGraphQL(in *model.Device) *graphql.Device
}

type DeviceSvc interface {
	ListAll(ctx context.Context) ([]*model.Device, error)
	ListPage(ctx context.Context, pageSize int, cursor string) ([]*model.Device, *pagination.Page, int, error)
	Create(ctx context.Context, device model.DeviceInput) (string, error)
	Update(ctx context.Context, device model.DeviceInput) error
	Exists(ctx context.Context, id string) (bool, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*model.Device, error)
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

func (r *Resolver) Devices(ctx context.Context) ([]*graphql.Device, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	devices, err := r.deviceSvc.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.deviceConverter.MultipleToGraphQL(devices), nil
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

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.deviceConverter.ToGraphQL(device), nil
}

func (r *Resolver) DeviceByIDAndAggregation(ctx context.Context, id string, aggregation graphql.AggregationType) (*graphql.Device, error) {
	return nil, nil
}

func (r *Resolver) CreateDevice(ctx context.Context, input graphql.DeviceInput) (*graphql.Device, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	convertedIn := r.deviceConverter.InputFromGraphQL(input)

	id, err := r.deviceSvc.Create(ctx, convertedIn)
	if err != nil {
		return nil, err
	}

	device, err := r.deviceSvc.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.deviceConverter.ToGraphQL(device), nil
}

func (r *Resolver) DeleteDevice(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	if err = r.hostSvc.DeleteByDeviceID(ctx, id); err != nil {
		return "", err
	}

	if err = r.deviceSvc.Delete(ctx, id); err != nil {
		return "", err
	}

	err = tx.Commit()
	if err != nil {
		return "", err
	}

	return id, nil
}

func (r *Resolver) SetDeviceOperation(ctx context.Context, id string, op graphql.OperationType) (*graphql.Device, error) {
	return nil, nil
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
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	host, err := r.dataModelSvc.GetByID(ctx, obj.DataModelID)
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

	return r.dataModelConv.ToGraphQL(host), nil
}
