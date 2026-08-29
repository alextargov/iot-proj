package scheduler

import (
	"context"
	"sync"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/k8s"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/robfig/cron/v3"
)

// WidgetService defines the methods needed from the widget service
type WidgetService interface {
	GetScheduledWidgets(ctx context.Context) ([]*model.Widget, error)
	UpdateLastExecuted(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*model.Widget, error)
}

// WidgetScheduler manages cron-based widget execution
type WidgetScheduler struct {
	cron         *cron.Cron
	widgetSvc    WidgetService
	k8sScheduler k8s.Scheduler
	jobs         map[string]cron.EntryID
	mu           sync.RWMutex
}

// New creates a new WidgetScheduler instance
func New(widgetSvc WidgetService, k8sSched k8s.Scheduler) *WidgetScheduler {
	return &WidgetScheduler{
		cron:         cron.New(),
		widgetSvc:    widgetSvc,
		k8sScheduler: k8sSched,
		jobs:         make(map[string]cron.EntryID),
	}
}

// Start loads existing scheduled widgets and starts the cron scheduler
func (s *WidgetScheduler) Start(ctx context.Context, transact persistence.Transactioner) error {
	logger.C(ctx).Info("Starting widget scheduler...")

	tx, err := transact.Begin()
	if err != nil {
		return err
	}
	defer transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	// Load existing scheduled widgets from DB
	widgets, err := s.widgetSvc.GetScheduledWidgets(ctx)
	if err != nil {
		logger.C(ctx).Warnf("Failed to load scheduled widgets: %v", err)
	} else {
		for _, w := range widgets {
			if w.Schedule != nil && w.Status == model.DeviceStatusActive {
				if err := s.AddJob(ctx, w); err != nil {
					logger.C(ctx).Warnf("Failed to add job for widget %s: %v", w.ID, err)
				}
			}
		}
		logger.C(ctx).Infof("Loaded %d scheduled widgets", len(widgets))
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	s.cron.Start()
	logger.C(ctx).Info("Widget scheduler started")

	// Wait for shutdown
	<-ctx.Done()
	logger.C(ctx).Info("Stopping widget scheduler...")
	s.cron.Stop()
	return nil
}

// AddJob adds a cron job for the given widget.
func (s *WidgetScheduler) AddJob(ctx context.Context, w *model.Widget) error {
	if w.Schedule == nil || *w.Schedule == "" {
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.jobs[w.ID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobs, w.ID)
	}

	widgetID := w.ID
	widgetCode := w.Code
	widgetWorkspace := w.Workspace

	entryID, err := s.cron.AddFunc(*w.Schedule, func() {
		s.executeWidget(ctx, widgetID, widgetCode, widgetWorkspace)
	})
	if err != nil {
		return err
	}

	s.jobs[w.ID] = entryID
	logger.C(ctx).Infof("Added cron job for widget %s with schedule: %s", w.ID, *w.Schedule)
	return nil
}

// RemoveJob removes the cron job for the given widget ID
func (s *WidgetScheduler) RemoveJob(ctx context.Context, widgetID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.jobs[widgetID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobs, widgetID)
		logger.C(ctx).Infof("Removed cron job for widget %s", widgetID)
	}
}

// executeWidget triggers the widget execution via K8s scheduler
func (s *WidgetScheduler) executeWidget(ctx context.Context, widgetID, code, workspace string) {
	logger.C(ctx).Infof("Executing scheduled widget: %s", widgetID)

	app := &k8s.Application{
		WidgetID:   widgetID,
		SourceCode: code,
		Workspace:  workspace,
	}

	if _, err := s.k8sScheduler.Schedule(ctx, app); err != nil {
		logger.C(ctx).Errorf("Failed to schedule widget %s: %v", widgetID, err)
		return
	}

	if err := s.widgetSvc.UpdateLastExecuted(ctx, widgetID); err != nil {
		logger.C(ctx).Errorf("Failed to update last_executed_at for widget %s: %v", widgetID, err)
	}

	logger.C(ctx).Info("Successfully executed scheduled widget: %s", widgetID)
}

// GetJobCount returns the number of active cron jobs
func (s *WidgetScheduler) GetJobCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.jobs)
}
