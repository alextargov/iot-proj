package domain

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/domain/auth"
	"github.com/iot-proj/components/orchestrator/internal/domain/device"
	"github.com/iot-proj/components/orchestrator/internal/domain/host"
	"github.com/iot-proj/components/orchestrator/internal/uuid"
	"github.com/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/iot-proj/components/orchestrator/pkg/persistence"
)

var _ graphql.ResolverRoot = &RootResolver{}

type RootResolver struct {
	persistence persistence.Transactioner
	device      *device.Resolver
}

func NewRootResolver(persistence persistence.Transactioner) *RootResolver {
	uuidService := uuid.NewService()
	authConv := auth.NewConverter()

	hostConv := host.NewConverter()
	hostRepo := host.NewRepository(hostConv)
	hostSvc := host.NewService(hostRepo, uuidService)

	deviceConv := device.NewConverter(hostConv, authConv)
	deviceRepo := device.NewRepository(deviceConv)
	deviceSvc := device.NewService(deviceRepo, uuidService)
	deviceResolver := device.NewResolver(persistence, deviceSvc, hostSvc, deviceConv, hostConv)

	return &RootResolver{
		persistence: persistence,
		device:      deviceResolver,
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

// ApplicationTemplate missing godoc
func (r *RootResolver) Device() graphql.DeviceResolver {
	return &deviceResolver{r}
}

func (r *queryResolver) Devices(ctx context.Context) ([]*graphql.Device, error) {
	return r.device.Devices(ctx)
}

func (r *queryResolver) DevicesForTenant(ctx context.Context) (*graphql.DevicePage, error) {
	return nil, nil
}

func (r *queryResolver) Device(ctx context.Context, id string) (*graphql.Device, error) {
	return r.device.Device(ctx, id)
}

func (r *queryResolver) DeviceByIDAndAggregation(ctx context.Context, id string, aggregation graphql.AggregationType) (*graphql.Device, error) {
	return r.device.DeviceByIDAndAggregation(ctx, id, aggregation)
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

type deviceResolver struct {
	*RootResolver
}

func (r deviceResolver) Host(ctx context.Context, obj *graphql.Device) (*graphql.Host, error) {
	return r.device.Host(ctx, obj)
}
