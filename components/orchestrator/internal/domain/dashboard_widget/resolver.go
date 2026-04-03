package dashboard_widget

import (
	"context"
	"encoding/json"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

type WidgetSvc interface {
	Add(ctx context.Context, layoutID string, input model.DashboardWidgetInput) (*model.DashboardWidget, error)
	Update(ctx context.Context, id string, input model.UpdateDashboardWidgetInput) (*model.DashboardWidget, error)
	Delete(ctx context.Context, id string) error
	UpdatePositions(ctx context.Context, layoutID string, positions []model.WidgetPositionInput) error
}

type WidgetConv interface {
	ToGraphQL(m *model.DashboardWidget) *graphql.DashboardWidget
	InputFromGraphQL(in graphql.DashboardWidgetInput) model.DashboardWidgetInput
	UpdateInputFromGraphQL(in graphql.UpdateDashboardWidgetInput) model.UpdateDashboardWidgetInput
	PositionsFromGraphQL(positions []*graphql.WidgetPositionInput) []model.WidgetPositionInput
}

type DeviceSvc interface {
	GetByID(ctx context.Context, id string) (*model.Device, error)
}

type DeviceConv interface {
	ToGraphQL(*model.Device) *graphql.Device
}

type Resolver struct {
	transact   persistence.Transactioner
	widgetSvc  WidgetSvc
	widgetConv WidgetConv
	deviceSvc  DeviceSvc
	deviceConv DeviceConv
}

func NewResolver(
	transact persistence.Transactioner,
	widgetSvc WidgetSvc,
	widgetConv WidgetConv,
	deviceSvc DeviceSvc,
	deviceConv DeviceConv,
) *Resolver {
	return &Resolver{
		transact:   transact,
		widgetSvc:  widgetSvc,
		widgetConv: widgetConv,
		deviceSvc:  deviceSvc,
		deviceConv: deviceConv,
	}
}

func (r *Resolver) AddDashboardWidget(ctx context.Context, layoutID string, input graphql.DashboardWidgetInput) (*graphql.DashboardWidget, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.widgetConv.InputFromGraphQL(input)
	widget, err := r.widgetSvc.Add(ctx, layoutID, modelInput)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.widgetConv.ToGraphQL(widget), nil
}

func (r *Resolver) UpdateDashboardWidget(ctx context.Context, id string, input graphql.UpdateDashboardWidgetInput) (*graphql.DashboardWidget, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.widgetConv.UpdateInputFromGraphQL(input)
	widget, err := r.widgetSvc.Update(ctx, id, modelInput)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.widgetConv.ToGraphQL(widget), nil
}

func (r *Resolver) DeleteDashboardWidget(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	if err := r.widgetSvc.Delete(ctx, id); err != nil {
		return "", err
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}

	return id, nil
}

func (r *Resolver) UpdateWidgetPositions(ctx context.Context, layoutID string, positions []*graphql.WidgetPositionInput) (bool, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return false, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelPositions := r.widgetConv.PositionsFromGraphQL(positions)
	if err := r.widgetSvc.UpdatePositions(ctx, layoutID, modelPositions); err != nil {
		return false, err
	}

	if err = tx.Commit(); err != nil {
		return false, err
	}

	return true, nil
}

// DashboardWidgetDevice resolves the device field for a DashboardWidget
func (r *Resolver) DashboardWidgetDevice(ctx context.Context, obj *graphql.DashboardWidget) (*graphql.Device, error) {
	if obj == nil {
		return nil, nil
	}

	// Get the device ID from config
	configStr := string(obj.Config)
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configStr), &config); err != nil {
		return nil, nil
	}

	deviceIDRaw, ok := config["deviceId"]
	if !ok {
		return nil, nil
	}

	deviceID, ok := deviceIDRaw.(string)
	if !ok || deviceID == "" {
		return nil, nil
	}

	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	device, err := r.deviceSvc.GetByID(ctx, deviceID)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.deviceConv.ToGraphQL(device), nil
}
