package domain

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/alert"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/auth"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/dashboard_layout"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/dashboard_widget"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/datamodel"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/device"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/host"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/metric"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/widget"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/k8s"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/notification"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/pubsub"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/uuid"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/sirupsen/logrus"
)

var _ graphql.ResolverRoot = &RootResolver{}

// CronScheduler defines the interface for widget cron scheduling
type CronScheduler interface {
	AddJob(ctx context.Context, w *model.Widget) error
	RemoveJob(ctx context.Context, widgetID string)
}

// MetricServiceWithPublisher defines the interface for metric service that supports PubSub
type MetricServiceWithPublisher interface {
	metric.MetricSvc
	SetMetricPublisher(publisher metric.MetricPublisher)
	SetAlertEvaluator(evaluator metric.AlertEvaluator)
}

// DeviceServiceWithToken defines the interface for device service that supports communication tokens
type DeviceServiceWithToken interface {
	SetCommunicationToken(ctx context.Context, id, token string) error
	GetByToken(ctx context.Context, token string) (*model.Device, error)
}

type RootResolver struct {
	persistence     persistence.Transactioner
	device          *device.Resolver
	widget          *widget.Resolver
	dataModel       *datamodel.Resolver
	metric          *metric.Resolver
	alert           *alert.Resolver
	dashboardLayout *dashboard_layout.Resolver
	dashboardWidget *dashboard_widget.Resolver
	metricPubSub    *pubsub.MetricPubSub
	deviceSvc       DeviceServiceWithToken
}

func NewRootResolver(persistence persistence.Transactioner, notificationSMTPConfig notification.SMTPConfig, scheduler k8s.Scheduler, cronScheduler CronScheduler, log *logrus.Logger, sharedMetricSvc MetricServiceWithPublisher) *RootResolver {
	uuidService := uuid.NewService()
	authConv := auth.NewConverter()

	metricPubSub := pubsub.NewMetricPubSub(log)

	// Wire the PubSub into the shared metric service (used by both REST and GraphQL)
	sharedMetricSvc.SetMetricPublisher(metricPubSub)

	hostConv := host.NewConverter()
	hostRepo := host.NewRepository(hostConv)
	hostSvc := host.NewService(hostRepo, uuidService)

	deviceConv := device.NewConverter(hostConv, authConv)
	deviceRepo := device.NewRepository(deviceConv)
	deviceSvc := device.NewService(deviceRepo, uuidService, hostSvc)

	widgetConv := widget.NewConverter()
	widgetRepo := widget.NewRepository(widgetConv)
	widgetSvc := widget.NewService(widgetRepo, uuidService)

	dataModelConv := datamodel.NewConverter()
	dataModelRepo := datamodel.NewRepository(dataModelConv)
	dataModelSvc := datamodel.NewService(dataModelRepo, uuidService)
	dataModelRes := datamodel.NewResolver(persistence, dataModelSvc, deviceSvc, dataModelConv)

	metricConv := metric.NewConverter()
	metricRes := metric.NewResolver(persistence, sharedMetricSvc, metricConv)

	notificationSvc := notification.NewService(notificationSMTPConfig)

	alertConv := alert.NewConverter()
	alertRepo := alert.NewRepository(alertConv)
	metricRepo := metric.NewRepository(metricConv)
	alertSvc := alert.NewService(alertRepo, metricRepo, deviceSvc, notificationSvc, uuidService)
	alertRes := alert.NewResolver(persistence, alertSvc, alertConv, deviceSvc, deviceConv)

	// Dashboard layout domain
	layoutConv := dashboard_layout.NewConverter()
	layoutRepo := dashboard_layout.NewRepository(layoutConv)
	layoutSvc := dashboard_layout.NewService(layoutRepo, uuidService)

	// Dashboard widget domain
	dashboardWidgetConv := dashboard_widget.NewConverter()
	dashboardWidgetRepo := dashboard_widget.NewRepository(dashboardWidgetConv)
	dashboardWidgetSvc := dashboard_widget.NewService(dashboardWidgetRepo, layoutSvc, uuidService)

	// Dashboard resolvers (layout needs widget service for fetching widgets)
	dashboardLayoutRes := dashboard_layout.NewResolver(persistence, layoutSvc, dashboardWidgetSvc, layoutConv, dashboardWidgetConv)
	dashboardWidgetRes := dashboard_widget.NewResolver(persistence, dashboardWidgetSvc, dashboardWidgetConv, deviceSvc, deviceConv)

	// Wire the alert evaluator into the shared metric service for real-time alert evaluation
	sharedMetricSvc.SetAlertEvaluator(alertSvc)

	deviceRes := device.NewResolver(persistence, deviceSvc, hostSvc, dataModelSvc, deviceConv, hostConv, dataModelConv)
	widgetRes := widget.NewResolver(persistence, widgetSvc, widgetConv, scheduler, cronScheduler)

	return &RootResolver{
		persistence:     persistence,
		device:          deviceRes,
		widget:          widgetRes,
		dataModel:       dataModelRes,
		metric:          metricRes,
		alert:           alertRes,
		dashboardLayout: dashboardLayoutRes,
		dashboardWidget: dashboardWidgetRes,
		metricPubSub:    metricPubSub,
		deviceSvc:       deviceSvc,
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

// Subscription returns the subscription resolver
func (r *RootResolver) Subscription() graphql.SubscriptionResolver {
	return &subscriptionResolver{r}
}

type queryResolver struct {
	*RootResolver
}

type subscriptionResolver struct {
	*RootResolver
}

func (r *subscriptionResolver) MetricRecorded(ctx context.Context, deviceID string) (<-chan *graphql.DeviceMetric, error) {
	ch := r.metricPubSub.Subscribe(deviceID)

	out := make(chan *graphql.DeviceMetric, 10)

	go func() {
		defer close(out)
		for {
			select {
			case <-ctx.Done():
				r.metricPubSub.Unsubscribe(deviceID, ch)
				return
			case metric, ok := <-ch:
				if !ok {
					return
				}
				out <- &graphql.DeviceMetric{
					ID:          metric.ID,
					DeviceID:    metric.DeviceID,
					MetricName:  metric.MetricName,
					MetricValue: metric.MetricValue,
					Unit:        metric.Unit,
					RecordedAt:  graphql.Timestamp(metric.RecordedAt),
				}
			}
		}
	}()

	return out, nil
}

func (r *RootResolver) Device() graphql.DeviceResolver {
	return &deviceResolver{r}
}

func (r *queryResolver) Devices(ctx context.Context) ([]*graphql.Device, error) {
	return r.device.Devices(ctx)
}

func (r *queryResolver) DevicesPage(ctx context.Context, first *int, after *string) (*graphql.DevicePage, error) {
	return r.device.DevicesPage(ctx, first, after)
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

func (r *queryResolver) WidgetsPage(ctx context.Context, first *int, after *string) (*graphql.WidgetPage, error) {
	return r.widget.WidgetsPage(ctx, first, after)
}

func (r *queryResolver) DataModels(ctx context.Context) ([]*graphql.DataModel, error) {
	return r.dataModel.DataModels(ctx)
}

func (r *queryResolver) DataModelVersions(ctx context.Context, dataModelID string) ([]*graphql.DataModelVersion, error) {
	return r.dataModel.DataModelVersions(ctx, dataModelID)
}

func (r *queryResolver) DataModelVersion(ctx context.Context, dataModelID string, version int) (*graphql.DataModelVersion, error) {
	return r.dataModel.DataModelVersion(ctx, dataModelID, version)
}

func (r *queryResolver) DeviceMetrics(ctx context.Context, deviceID string, filter *graphql.MetricFilterInput) ([]*graphql.DeviceMetric, error) {
	return r.metric.DeviceMetrics(ctx, deviceID, filter)
}

func (r *queryResolver) DeviceMetricsSeries(ctx context.Context, deviceID string, metricNames []string, filter *graphql.MetricFilterInput) ([]*graphql.MetricSeries, error) {
	return r.metric.DeviceMetricsSeries(ctx, deviceID, metricNames, filter)
}

func (r *queryResolver) DeviceAggregatedMetrics(ctx context.Context, deviceID string, aggregation graphql.AggregationType, filter *graphql.MetricFilterInput) (*graphql.AggregatedMetric, error) {
	return r.metric.DeviceAggregatedMetrics(ctx, deviceID, aggregation, filter)
}

func (r *queryResolver) AlertRules(ctx context.Context, deviceID *string, first *int, after *string) (*graphql.AlertRulePage, error) {
	return r.alert.AlertRules(ctx, deviceID, first, after)
}

func (r *queryResolver) AlertRule(ctx context.Context, id string) (*graphql.AlertRule, error) {
	return r.alert.AlertRule(ctx, id)
}

func (r *queryResolver) AlertEvents(ctx context.Context, deviceID *string, ruleID *string, first *int, after *string) (*graphql.AlertEventPage, error) {
	return r.alert.AlertEvents(ctx, deviceID, ruleID, first, after)
}

func (r *queryResolver) DashboardLayouts(ctx context.Context) ([]*graphql.DashboardLayout, error) {
	return r.dashboardLayout.DashboardLayouts(ctx)
}

func (r *queryResolver) DashboardLayout(ctx context.Context, id string) (*graphql.DashboardLayout, error) {
	return r.dashboardLayout.DashboardLayout(ctx, id)
}

func (r *queryResolver) DefaultDashboardLayout(ctx context.Context) (*graphql.DashboardLayout, error) {
	return r.dashboardLayout.DefaultDashboardLayout(ctx)
}

func (r *queryResolver) TestDeviceConnection(ctx context.Context, url string) (bool, error) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return false, nil
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 400, nil
}

type mutationResolver struct {
	*RootResolver
}

func (r *mutationResolver) CreateDevice(ctx context.Context, in graphql.DeviceInput) (*graphql.Device, error) {
	return r.device.CreateDevice(ctx, in)
}

func (r *mutationResolver) UpdateDevice(ctx context.Context, id string, in graphql.UpdateDeviceInput) (*graphql.Device, error) {
	return r.device.UpdateDevice(ctx, id, in)
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

func (r *mutationResolver) UpdateDataModel(ctx context.Context, id string, in graphql.UpdateDataModelInput) (*graphql.DataModel, error) {
	return r.dataModel.UpdateDataModel(ctx, id, in)
}

func (r *mutationResolver) DeleteDataModel(ctx context.Context, id string) (string, error) {
	return r.dataModel.DeleteDataModel(ctx, id)
}

func (r *mutationResolver) RollbackDataModel(ctx context.Context, dataModelID string, toVersion int) (*graphql.DataModel, error) {
	return r.dataModel.RollbackDataModel(ctx, dataModelID, toVersion)
}

func (r *mutationResolver) GenerateDeviceToken(ctx context.Context, deviceID string) (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(bytes)

	tx, err := r.persistence.Begin()
	if err != nil {
		return "", err
	}
	defer r.persistence.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	if err := r.deviceSvc.SetCommunicationToken(ctx, deviceID, token); err != nil {
		return "", err
	}

	if err := tx.Commit(); err != nil {
		return "", err
	}

	return token, nil
}

func (r *mutationResolver) RecordDeviceMetric(ctx context.Context, input graphql.DeviceMetricInput) (*graphql.DeviceMetric, error) {
	return r.metric.RecordDeviceMetric(ctx, input)
}

func (r *mutationResolver) RecordDeviceMetrics(ctx context.Context, inputs []*graphql.DeviceMetricInput) (bool, error) {
	return r.metric.RecordDeviceMetrics(ctx, inputs)
}

func (r *mutationResolver) CreateAlertRule(ctx context.Context, input graphql.CreateAlertRuleInput) (*graphql.AlertRule, error) {
	return r.alert.CreateAlertRule(ctx, input)
}

func (r *mutationResolver) UpdateAlertRule(ctx context.Context, id string, input graphql.UpdateAlertRuleInput) (*graphql.AlertRule, error) {
	return r.alert.UpdateAlertRule(ctx, id, input)
}

func (r *mutationResolver) DeleteAlertRule(ctx context.Context, id string) (string, error) {
	return r.alert.DeleteAlertRule(ctx, id)
}

func (r *mutationResolver) AcknowledgeAlertEvent(ctx context.Context, id string) (*graphql.AlertEvent, error) {
	return r.alert.AcknowledgeAlertEvent(ctx, id)
}

func (r *mutationResolver) CreateDashboardLayout(ctx context.Context, input graphql.DashboardLayoutInput) (*graphql.DashboardLayout, error) {
	return r.dashboardLayout.CreateDashboardLayout(ctx, input)
}

func (r *mutationResolver) UpdateDashboardLayout(ctx context.Context, id string, input graphql.UpdateDashboardLayoutInput) (*graphql.DashboardLayout, error) {
	return r.dashboardLayout.UpdateDashboardLayout(ctx, id, input)
}

func (r *mutationResolver) DeleteDashboardLayout(ctx context.Context, id string) (string, error) {
	return r.dashboardLayout.DeleteDashboardLayout(ctx, id)
}

func (r *mutationResolver) AddDashboardWidget(ctx context.Context, layoutID string, input graphql.DashboardWidgetInput) (*graphql.DashboardWidget, error) {
	return r.dashboardWidget.AddDashboardWidget(ctx, layoutID, input)
}

func (r *mutationResolver) UpdateDashboardWidget(ctx context.Context, id string, input graphql.UpdateDashboardWidgetInput) (*graphql.DashboardWidget, error) {
	return r.dashboardWidget.UpdateDashboardWidget(ctx, id, input)
}

func (r *mutationResolver) DeleteDashboardWidget(ctx context.Context, id string) (string, error) {
	return r.dashboardWidget.DeleteDashboardWidget(ctx, id)
}

func (r *mutationResolver) UpdateWidgetPositions(ctx context.Context, layoutID string, positions []*graphql.WidgetPositionInput) (bool, error) {
	return r.dashboardWidget.UpdateWidgetPositions(ctx, layoutID, positions)
}

type deviceResolver struct {
	*RootResolver
}

func (r deviceResolver) Host(ctx context.Context, obj *graphql.Device) (*graphql.Host, error) {
	return r.device.Host(ctx, obj)
}

func (r deviceResolver) DataModel(ctx context.Context, obj *graphql.Device) (*graphql.DataModel, error) {
	return r.device.DataModel(ctx, obj)
}

// AlertRule resolver
func (r *RootResolver) AlertRule() graphql.AlertRuleResolver {
	return &alertRuleResolver{r}
}

type alertRuleResolver struct {
	*RootResolver
}

func (r alertRuleResolver) Device(ctx context.Context, obj *graphql.AlertRule) (*graphql.Device, error) {
	return r.alert.AlertRuleDevice(ctx, obj)
}

type alertEventResolver struct {
	*RootResolver
}

// DashboardWidget resolver
func (r *RootResolver) DashboardWidget() graphql.DashboardWidgetResolver {
	return &dashboardWidgetResolver{r}
}

type dashboardWidgetResolver struct {
	*RootResolver
}

func (r dashboardWidgetResolver) Device(ctx context.Context, obj *graphql.DashboardWidget) (*graphql.Device, error) {
	return r.dashboardWidget.DashboardWidgetDevice(ctx, obj)
}
