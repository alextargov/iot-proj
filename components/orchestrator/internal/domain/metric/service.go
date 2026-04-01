package metric

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/pkg/errors"
)

// MetricRepository defines the interface for metric data access
type MetricRepository interface {
	Create(ctx context.Context, item model.DeviceMetric) error
	CreateBatch(ctx context.Context, items []model.DeviceMetric) error
	GetByDeviceID(ctx context.Context, deviceID string, filter model.MetricFilter) ([]*model.DeviceMetric, error)
	GetAggregated(ctx context.Context, deviceID string, aggregationType string, filter model.MetricFilter) (*model.AggregatedMetric, error)
	DeleteByDeviceID(ctx context.Context, deviceID string) error
	GetMetricNames(ctx context.Context, deviceID string) ([]string, error)
}

// UUIDService defines the interface for UUID generation
type UUIDService interface {
	Generate() string
}

type service struct {
	metricRepo  MetricRepository
	uuidService UUIDService
}

// NewService creates a new metric service
func NewService(repo MetricRepository, uuidService UUIDService) *service {
	return &service{
		metricRepo:  repo,
		uuidService: uuidService,
	}
}

// RecordMetric records a single metric
func (s *service) RecordMetric(ctx context.Context, input model.DeviceMetricInput) (*model.DeviceMetric, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	id := s.uuidService.Generate()
	recordedAt := time.Now()
	if input.RecordedAt != nil {
		recordedAt = *input.RecordedAt
	}

	metric := model.DeviceMetric{
		ID:          id,
		DeviceID:    input.DeviceID,
		TenantID:    tnt,
		MetricName:  input.MetricName,
		MetricValue: input.MetricValue,
		Unit:        input.Unit,
		RecordedAt:  recordedAt,
	}

	logger.C(ctx).Debugf("Recording metric %s for device %s", input.MetricName, input.DeviceID)

	if err := s.metricRepo.Create(ctx, metric); err != nil {
		return nil, errors.Wrap(err, "while creating metric")
	}

	return &metric, nil
}

// RecordMetrics records multiple metrics in batch
func (s *service) RecordMetrics(ctx context.Context, inputs []model.DeviceMetricInput) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrap(err, "while loading tenant from context")
	}

	metrics := make([]model.DeviceMetric, 0, len(inputs))
	now := time.Now()

	for _, input := range inputs {
		recordedAt := now
		if input.RecordedAt != nil {
			recordedAt = *input.RecordedAt
		}

		metric := model.DeviceMetric{
			ID:          s.uuidService.Generate(),
			DeviceID:    input.DeviceID,
			TenantID:    tnt,
			MetricName:  input.MetricName,
			MetricValue: input.MetricValue,
			Unit:        input.Unit,
			RecordedAt:  recordedAt,
		}
		metrics = append(metrics, metric)
	}

	logger.C(ctx).Debugf("Recording %d metrics in batch", len(metrics))

	return s.metricRepo.CreateBatch(ctx, metrics)
}

// RecordMetricWithTenant records a metric with explicit tenant (for REST API)
func (s *service) RecordMetricWithTenant(ctx context.Context, input model.DeviceMetricInput, tenantID string) (*model.DeviceMetric, error) {
	id := s.uuidService.Generate()
	recordedAt := time.Now()
	if input.RecordedAt != nil {
		recordedAt = *input.RecordedAt
	}

	metric := model.DeviceMetric{
		ID:          id,
		DeviceID:    input.DeviceID,
		TenantID:    tenantID,
		MetricName:  input.MetricName,
		MetricValue: input.MetricValue,
		Unit:        input.Unit,
		RecordedAt:  recordedAt,
	}

	logger.C(ctx).Debugf("Recording metric %s for device %s (tenant: %s)", input.MetricName, input.DeviceID, tenantID)

	if err := s.metricRepo.Create(ctx, metric); err != nil {
		return nil, errors.Wrap(err, "while creating metric")
	}

	return &metric, nil
}

// GetDeviceMetrics retrieves metrics for a device
func (s *service) GetDeviceMetrics(ctx context.Context, deviceID string, filter model.MetricFilter) ([]*model.DeviceMetric, error) {
	logger.C(ctx).Debugf("Getting metrics for device %s", deviceID)
	return s.metricRepo.GetByDeviceID(ctx, deviceID, filter)
}

// GetAggregatedMetrics retrieves aggregated metrics for a device
func (s *service) GetAggregatedMetrics(ctx context.Context, deviceID string, aggregationType string, filter model.MetricFilter) (*model.AggregatedMetric, error) {
	logger.C(ctx).Debugf("Getting aggregated metrics for device %s (type: %s)", deviceID, aggregationType)
	return s.metricRepo.GetAggregated(ctx, deviceID, aggregationType, filter)
}

// GetMetricSeries retrieves metrics grouped by metric name
func (s *service) GetMetricSeries(ctx context.Context, deviceID string, metricNames []string, filter model.MetricFilter) ([]*model.MetricSeries, error) {
	logger.C(ctx).Debugf("Getting metric series for device %s", deviceID)

	// If no specific metric names provided, get all unique names
	if len(metricNames) == 0 {
		names, err := s.metricRepo.GetMetricNames(ctx, deviceID)
		if err != nil {
			return nil, errors.Wrap(err, "while getting metric names")
		}
		metricNames = names
	}

	result := make([]*model.MetricSeries, 0, len(metricNames))

	for _, name := range metricNames {
		filterWithName := filter
		filterWithName.MetricName = &name

		metrics, err := s.metricRepo.GetByDeviceID(ctx, deviceID, filterWithName)
		if err != nil {
			return nil, errors.Wrapf(err, "while getting metrics for %s", name)
		}

		if len(metrics) > 0 {
			series := &model.MetricSeries{
				MetricName: name,
				Unit:       metrics[0].Unit,
				DataPoints: metrics,
			}
			result = append(result, series)
		}
	}

	return result, nil
}

// DeleteByDeviceID deletes all metrics for a device
func (s *service) DeleteByDeviceID(ctx context.Context, deviceID string) error {
	logger.C(ctx).Debugf("Deleting metrics for device %s", deviceID)
	return s.metricRepo.DeleteByDeviceID(ctx, deviceID)
}
