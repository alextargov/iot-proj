package widget

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/k8s"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/pagination"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

type WidgetConverter interface {
	InputFromGraphQL(in graphql.WidgetInput) model.WidgetInput
	MultipleToGraphQL(in []*model.Widget) []*graphql.Widget
	ToGraphQL(in *model.Widget) *graphql.Widget
}

type WidgetSvc interface {
	ListAll(ctx context.Context) ([]*model.Widget, error)
	ListPage(ctx context.Context, pageSize int, cursor string) ([]*model.Widget, *pagination.Page, int, error)
	Create(ctx context.Context, widget model.WidgetInput) (string, error)
	Update(ctx context.Context, id string, widget model.WidgetInput) error
	Clone(ctx context.Context, id string) (string, error)
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

// CronScheduler defines the interface for widget cron scheduling
type CronScheduler interface {
	AddJob(ctx context.Context, w *model.Widget) error
	RemoveJob(ctx context.Context, widgetID string)
}

type Resolver struct {
	transact        persistence.Transactioner
	widgetSvc       WidgetSvc
	hostSvc         HostSvc
	widgetConverter WidgetConverter
	scheduler       k8s.Scheduler
	cronScheduler   CronScheduler
}

func NewResolver(transact persistence.Transactioner, widgetSvc WidgetSvc, widgetConverter WidgetConverter, scheduler k8s.Scheduler, cronScheduler CronScheduler) *Resolver {
	return &Resolver{
		transact:        transact,
		widgetSvc:       widgetSvc,
		widgetConverter: widgetConverter,
		scheduler:       scheduler,
		cronScheduler:   cronScheduler,
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

func (r *Resolver) WidgetsPage(ctx context.Context, first *int, after *string) (*graphql.WidgetPage, error) {
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

	widgets, page, totalCount, err := r.widgetSvc.ListPage(ctx, pageSize, cursor)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	return &graphql.WidgetPage{
		Data:       r.widgetConverter.MultipleToGraphQL(widgets),
		TotalCount: totalCount,
		PageInfo: &graphql.PageInfo{
			StartCursor: page.StartCursor,
			EndCursor:   page.EndCursor,
			HasNextPage: page.HasNextPage,
		},
	}, nil
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

	result := r.widgetConverter.ToGraphQL(widget)

	// code/workspace are not persisted in the DB — they live on the Application
	// CR. Populate them for the single-widget view (e.g. the edit form) on a
	// best-effort basis; a missing CR or an unreachable cluster must not fail
	// the query.
	if app, appErr := r.scheduler.GetApplication(ctx, id); appErr != nil {
		logger.C(ctx).Warnf("could not load Application CR for widget %s: %v", id, appErr)
	} else if app != nil {
		result.Code = app.SourceCode
		result.Workspace = app.Workspace
	}

	return result, nil
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

	application := &k8s.Application{
		WidgetID:   id,
		SourceCode: convertedIn.Code,
		Workspace:  convertedIn.Workspace,
	}

	if _, err = r.scheduler.Schedule(ctx, application); err != nil {
		logger.C(ctx).Errorf("error while scheduling Application for widget %s: %v", id, err)
		// The widget was created successfully; the Application CR will be
		// reconciled once the cluster is reachable.
	}

	if r.cronScheduler != nil && widget.Schedule != nil && widget.Status == model.DeviceStatusActive {
		if err := r.cronScheduler.AddJob(ctx, widget); err != nil {
			logger.C(ctx).Errorf("error while adding a cron scheduler job: %v", err)
			// The widget was created successfully, cron job can be added later
		}
	}

	return r.widgetConverter.ToGraphQL(widget), nil
}

func (r *Resolver) UpdateWidget(ctx context.Context, id string, input graphql.WidgetInput) (*graphql.Widget, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	convertedIn := r.widgetConverter.InputFromGraphQL(input)

	if err = r.widgetSvc.Update(ctx, id, convertedIn); err != nil {
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

	application := &k8s.Application{
		WidgetID:   id,
		SourceCode: convertedIn.Code,
		Workspace:  convertedIn.Workspace,
	}

	if _, err = r.scheduler.Schedule(ctx, application); err != nil {
		logger.C(ctx).Errorf("error while scheduling Application for updated widget %s: %v", id, err)
		// The widget was updated successfully; the Application CR will be
		// reconciled once the cluster is reachable.
	}

	// Refresh the cron job so schedule/status changes take effect.
	if r.cronScheduler != nil {
		r.cronScheduler.RemoveJob(ctx, id)
		if widget.Schedule != nil && widget.Status == model.DeviceStatusActive {
			if err := r.cronScheduler.AddJob(ctx, widget); err != nil {
				logger.C(ctx).Errorf("error while adding a cron scheduler job: %v", err)
			}
		}
	}

	result := r.widgetConverter.ToGraphQL(widget)
	result.Code = convertedIn.Code
	result.Workspace = convertedIn.Workspace

	return result, nil
}

func (r *Resolver) CloneWidget(ctx context.Context, id string) (*graphql.Widget, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	newID, err := r.widgetSvc.Clone(ctx, id)
	if err != nil {
		return nil, err
	}

	widget, err := r.widgetSvc.GetByID(ctx, newID)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}

	// code/workspace are not stored in the DB, so read them from the source
	// widget's Application CR to carry them onto the clone. Best-effort: if the
	// CR is missing or the cluster is unreachable, clone with empty source
	// rather than failing.
	sourceCode := widget.Code
	workspace := widget.Workspace
	if app, appErr := r.scheduler.GetApplication(ctx, id); appErr != nil {
		logger.C(ctx).Warnf("could not load source Application CR for widget %s: %v", id, appErr)
	} else if app != nil {
		sourceCode = app.SourceCode
		workspace = app.Workspace
	}

	application := &k8s.Application{
		WidgetID:   newID,
		SourceCode: sourceCode,
		Workspace:  workspace,
	}

	if _, err = r.scheduler.Schedule(ctx, application); err != nil {
		logger.C(ctx).Errorf("error while scheduling Application for cloned widget %s: %v", newID, err)
		// The widget was cloned successfully; the Application CR will be
		// reconciled once the cluster is reachable.
	}

	if r.cronScheduler != nil && widget.Schedule != nil && widget.Status == model.DeviceStatusActive {
		if err := r.cronScheduler.AddJob(ctx, widget); err != nil {
			logger.C(ctx).Errorf("error while adding a cron scheduler job: %v", err)
		}
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

	if r.cronScheduler != nil {
		r.cronScheduler.RemoveJob(ctx, id)
	}

	return id, nil
}
