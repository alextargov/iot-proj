package domain

import (
	"context"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/auth"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/datamodel"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/device"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/host"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/widget"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/k8s"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/uuid"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

var _ graphql.ResolverRoot = &RootResolver{}

type RootResolver struct {
	persistence persistence.Transactioner
	device      *device.Resolver
	widget      *widget.Resolver
	dataModel   *datamodel.Resolver
}

func NewRootResolver(persistence persistence.Transactioner, scheduler k8s.Scheduler) *RootResolver {
	uuidService := uuid.NewService()
	authConv := auth.NewConverter()

	hostConv := host.NewConverter()
	hostRepo := host.NewRepository(hostConv)
	hostSvc := host.NewService(hostRepo, uuidService)

	deviceConv := device.NewConverter(hostConv, authConv)
	deviceRepo := device.NewRepository(deviceConv)
	deviceSvc := device.NewService(deviceRepo, uuidService, hostSvc)

	widgetConv := widget.NewConverter()
	widgetRepo := widget.NewRepository(widgetConv)
	widgetSvc := widget.NewService(widgetRepo, uuidService)

	deviceRes := device.NewResolver(persistence, deviceSvc, hostSvc, deviceConv, hostConv)
	widgetRes := widget.NewResolver(persistence, widgetSvc, widgetConv, scheduler)

	dataModelConv := datamodel.NewConverter()
	dataModelRepo := datamodel.NewRepository(dataModelConv)
	dataModelSvc := datamodel.NewService(dataModelRepo, uuidService)
	dataModelRes := datamodel.NewResolver(persistence, dataModelSvc, dataModelConv)

	return &RootResolver{
		persistence: persistence,
		device:      deviceRes,
		widget:      widgetRes,
		dataModel:   dataModelRes,
	}
}

// Mutation missing godoc
func (r *RootResolver) Mutation() graphql.MutationResolver {
	return &mutationResolver{r}
}

// Query missing godoc
func (r *RootResolver) Query() graphql.QueryResolver {
	return &queryResolver{r}
}

type queryResolver struct {
	*RootResolver
}

func (r *RootResolver) Device() graphql.DeviceResolver {
	return &deviceResolver{r}
}

func (r *queryResolver) Devices(ctx context.Context) ([]*graphql.Device, error) {
	return r.device.Devices(ctx)
}

func (r *queryResolver) Device(ctx context.Context, id string) (*graphql.Device, error) {
	return r.device.Device(ctx, id)
}

func (r *queryResolver) DeviceByIDAndAggregation(ctx context.Context, id string, aggregation graphql.AggregationType) (*graphql.Device, error) {
	return r.device.DeviceByIDAndAggregation(ctx, id, aggregation)
}

func (r *queryResolver) Widget(ctx context.Context, id string) (*graphql.Widget, error) {
	return r.widget.Widget(ctx, id)
}

func (r *queryResolver) Widgets(ctx context.Context) ([]*graphql.Widget, error) {
	return r.widget.Widgets(ctx)
}

func (r *queryResolver) DataModels(ctx context.Context) ([]*graphql.DataModel, error) {
	return r.dataModel.DataModels(ctx)
}

type mutationResolver struct {
	*RootResolver
}

func (r *mutationResolver) CreateDevice(ctx context.Context, in graphql.DeviceInput) (*graphql.Device, error) {
	return r.device.CreateDevice(ctx, in)
}

func (r *mutationResolver) SetDeviceOperation(ctx context.Context, id string, op graphql.OperationType) (*graphql.Device, error) {
	return r.device.SetDeviceOperation(ctx, id, op)
}

func (r *mutationResolver) SetOperation(ctx context.Context, op graphql.OperationType, data interface{}) (bool, error) {
	return r.device.SetOperation(ctx, op, data)
}

func (r *mutationResolver) DeleteDevice(ctx context.Context, id string) (string, error) {
	return r.device.DeleteDevice(ctx, id)
}

func (r *mutationResolver) CreateWidget(ctx context.Context, in graphql.WidgetInput) (*graphql.Widget, error) {
	return r.widget.CreateWidget(ctx, in)
}

func (r *mutationResolver) DeleteWidget(ctx context.Context, id string) (string, error) {
	return r.widget.DeleteWidget(ctx, id)
}

func (r *mutationResolver) CreateDataModel(ctx context.Context, in graphql.DataModelInput) (*graphql.DataModel, error) {
	return r.dataModel.CreateDataModel(ctx, in)
}

func (r *mutationResolver) UpdateDataModel(ctx context.Context, id string, in graphql.DataModelInput) (*graphql.DataModel, error) {
	return r.dataModel.UpdateDataModel(ctx, id, in)
}

func (r *mutationResolver) DeleteDataModel(ctx context.Context, id string) (string, error) {
	return r.dataModel.DeleteDataModel(ctx, id)
}

type deviceResolver struct {
	*RootResolver
}

func (r deviceResolver) Host(ctx context.Context, obj *graphql.Device) (*graphql.Host, error) {
	return r.device.Host(ctx, obj)
}
