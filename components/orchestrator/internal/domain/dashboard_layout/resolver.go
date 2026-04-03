package dashboard_layout

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

type LayoutSvc interface {
	Create(ctx context.Context, input model.DashboardLayoutInput) (*model.DashboardLayout, error)
	Get(ctx context.Context, id string) (*model.DashboardLayout, error)
	GetDefault(ctx context.Context) (*model.DashboardLayout, error)
	List(ctx context.Context) ([]*model.DashboardLayout, error)
	Update(ctx context.Context, id string, input model.UpdateDashboardLayoutInput) (*model.DashboardLayout, error)
	Delete(ctx context.Context, id string) error
}

type WidgetSvc interface {
	ListByLayoutID(ctx context.Context, layoutID string) ([]*model.DashboardWidget, error)
}

type LayoutConv interface {
	ToGraphQL(m *model.DashboardLayout, widgets []*graphql.DashboardWidget) *graphql.DashboardLayout
	MultipleToGraphQL(layouts []*model.DashboardLayout, widgetsByLayout map[string][]*graphql.DashboardWidget) []*graphql.DashboardLayout
	InputFromGraphQL(in graphql.DashboardLayoutInput) model.DashboardLayoutInput
	UpdateInputFromGraphQL(in graphql.UpdateDashboardLayoutInput) model.UpdateDashboardLayoutInput
}

type WidgetConv interface {
	ToGraphQL(m *model.DashboardWidget) *graphql.DashboardWidget
	MultipleToGraphQL(widgets []*model.DashboardWidget) []*graphql.DashboardWidget
}

type Resolver struct {
	transact   persistence.Transactioner
	layoutSvc  LayoutSvc
	widgetSvc  WidgetSvc
	layoutConv LayoutConv
	widgetConv WidgetConv
}

func NewResolver(
	transact persistence.Transactioner,
	layoutSvc LayoutSvc,
	widgetSvc WidgetSvc,
	layoutConv LayoutConv,
	widgetConv WidgetConv,
) *Resolver {
	return &Resolver{
		transact:   transact,
		layoutSvc:  layoutSvc,
		widgetSvc:  widgetSvc,
		layoutConv: layoutConv,
		widgetConv: widgetConv,
	}
}

func (r *Resolver) DashboardLayouts(ctx context.Context) ([]*graphql.DashboardLayout, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	layouts, err := r.layoutSvc.List(ctx)
	if err != nil {
		return nil, err
	}

	// Fetch widgets for all layouts
	widgetsByLayout := make(map[string][]*graphql.DashboardWidget)
	for _, layout := range layouts {
		widgets, err := r.widgetSvc.ListByLayoutID(ctx, layout.ID)
		if err != nil {
			return nil, err
		}
		widgetsByLayout[layout.ID] = r.widgetConv.MultipleToGraphQL(widgets)
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.layoutConv.MultipleToGraphQL(layouts, widgetsByLayout), nil
}

func (r *Resolver) DashboardLayout(ctx context.Context, id string) (*graphql.DashboardLayout, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	layout, err := r.layoutSvc.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	widgets, err := r.widgetSvc.ListByLayoutID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.layoutConv.ToGraphQL(layout, r.widgetConv.MultipleToGraphQL(widgets)), nil
}

func (r *Resolver) DefaultDashboardLayout(ctx context.Context) (*graphql.DashboardLayout, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	layout, err := r.layoutSvc.GetDefault(ctx)
	if err != nil {
		return nil, err
	}

	if layout == nil {
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return nil, nil
	}

	widgets, err := r.widgetSvc.ListByLayoutID(ctx, layout.ID)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.layoutConv.ToGraphQL(layout, r.widgetConv.MultipleToGraphQL(widgets)), nil
}

func (r *Resolver) CreateDashboardLayout(ctx context.Context, input graphql.DashboardLayoutInput) (*graphql.DashboardLayout, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.layoutConv.InputFromGraphQL(input)
	layout, err := r.layoutSvc.Create(ctx, modelInput)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	// New layout has no widgets
	return r.layoutConv.ToGraphQL(layout, []*graphql.DashboardWidget{}), nil
}

func (r *Resolver) UpdateDashboardLayout(ctx context.Context, id string, input graphql.UpdateDashboardLayoutInput) (*graphql.DashboardLayout, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.layoutConv.UpdateInputFromGraphQL(input)
	layout, err := r.layoutSvc.Update(ctx, id, modelInput)
	if err != nil {
		return nil, err
	}

	widgets, err := r.widgetSvc.ListByLayoutID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.layoutConv.ToGraphQL(layout, r.widgetConv.MultipleToGraphQL(widgets)), nil
}

func (r *Resolver) DeleteDashboardLayout(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	if err := r.layoutSvc.Delete(ctx, id); err != nil {
		return "", err
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}

	return id, nil
}
