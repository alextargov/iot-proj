package widget

import (
	"context"
	"github.com/iot-proj/components/orchestrator/internal/model"
	"github.com/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/iot-proj/components/orchestrator/pkg/persistence"
)

type WidgetConverter interface {
	InputFromGraphQL(in graphql.WidgetInput) model.WidgetInput
	MultipleToGraphQL(in []*model.Widget) []*graphql.Widget
	ToGraphQL(in *model.Widget) *graphql.Widget
}

type WidgetSvc interface {
	ListAll(ctx context.Context) ([]*model.Widget, error)
	Create(ctx context.Context, widget model.WidgetInput) (string, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*model.Widget, error)
}

type HostSvc interface {
	GetByWidgetID(ctx context.Context, id string) (*model.Host, error)
	DeleteByWidgetID(ctx context.Context, widgetID string) error
}

type HostConv interface {
	ToGraphQL(in *model.Host) *graphql.Host
}

type Resolver struct {
	transact        persistence.Transactioner
	widgetSvc       WidgetSvc
	hostSvc         HostSvc
	widgetConverter WidgetConverter
}

func NewResolver(transact persistence.Transactioner, widgetSvc WidgetSvc, widgetConverter WidgetConverter) *Resolver {
	return &Resolver{
		transact:        transact,
		widgetSvc:       widgetSvc,
		widgetConverter: widgetConverter,
	}
}

func (r *Resolver) Widgets(ctx context.Context) ([]*graphql.Widget, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	widgets, err := r.widgetSvc.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.widgetConverter.MultipleToGraphQL(widgets), nil
}

func (r *Resolver) Widget(ctx context.Context, id string) (*graphql.Widget, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	widget, err := r.widgetSvc.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.widgetConverter.ToGraphQL(widget), nil
}

func (r *Resolver) CreateWidget(ctx context.Context, input graphql.WidgetInput) (*graphql.Widget, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	convertedIn := r.widgetConverter.InputFromGraphQL(input)

	id, err := r.widgetSvc.Create(ctx, convertedIn)
	if err != nil {
		return nil, err
	}

	widget, err := r.widgetSvc.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return r.widgetConverter.ToGraphQL(widget), nil
}

func (r *Resolver) DeleteWidget(ctx context.Context, id string) (string, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return "", err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	if err := r.hostSvc.DeleteByWidgetID(ctx, id); err != nil {
		return "", err
	}

	if err := r.widgetSvc.Delete(ctx, id); err != nil {
		return "", err
	}

	err = tx.Commit()
	if err != nil {
		return "", err
	}

	return id, nil
}
