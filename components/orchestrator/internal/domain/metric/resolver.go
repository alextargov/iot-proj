package metric

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// MetricSvc defines the interface for the metric service
type MetricSvc interface {
	RecordMetric(ctx context.Context, input model.DeviceMetricInput) (*model.DeviceMetric, error)
	RecordMetrics(ctx context.Context, inputs []model.DeviceMetricInput) error
	GetDeviceMetrics(ctx context.Context, deviceID string, filter model.MetricFilter) ([]*model.DeviceMetric, error)
	GetAggregatedMetrics(ctx context.Context, deviceID string, aggregationType string, filter model.MetricFilter) (*model.AggregatedMetric, error)
	GetMetricSeries(ctx context.Context, deviceID string, metricNames []string, filter model.MetricFilter) ([]*model.MetricSeries, error)
}

// MetricConv defines the interface for metric conversion
type MetricConv interface {
	ToGraphQL(*model.DeviceMetric) *graphql.DeviceMetric
	MultipleToGraphQL([]*model.DeviceMetric) []*graphql.DeviceMetric
	InputFromGraphQL(graphql.DeviceMetricInput) model.DeviceMetricInput
	AggregatedToGraphQL(*model.AggregatedMetric) *graphql.AggregatedMetric
	MultipleMetricSeriesToGraphQL([]*model.MetricSeries) []*graphql.MetricSeries
}

// Resolver handles GraphQL queries and mutations for metrics
type Resolver struct {
	transact   persistence.Transactioner
	metricSvc  MetricSvc
	metricConv MetricConv
}

// NewResolver creates a new metric resolver
func NewResolver(transact persistence.Transactioner, metricSvc MetricSvc, metricConv MetricConv) *Resolver {
	return &Resolver{
		transact:   transact,
		metricSvc:  metricSvc,
		metricConv: metricConv,
	}
}

// DeviceMetrics retrieves metrics for a device
func (r *Resolver) DeviceMetrics(ctx context.Context, deviceID string, filter *graphql.MetricFilterInput) ([]*graphql.DeviceMetric, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelFilter := r.convertFilterInput(filter)
	metrics, err := r.metricSvc.GetDeviceMetrics(ctx, deviceID, modelFilter)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.metricConv.MultipleToGraphQL(metrics), nil
}

// DeviceMetricsSeries retrieves metrics grouped by metric name
func (r *Resolver) DeviceMetricsSeries(ctx context.Context, deviceID string, metricNames []string, filter *graphql.MetricFilterInput) ([]*graphql.MetricSeries, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelFilter := r.convertFilterInput(filter)
	series, err := r.metricSvc.GetMetricSeries(ctx, deviceID, metricNames, modelFilter)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.metricConv.MultipleMetricSeriesToGraphQL(series), nil
}

// DeviceAggregatedMetrics retrieves aggregated metrics for a device
func (r *Resolver) DeviceAggregatedMetrics(ctx context.Context, deviceID string, aggregation graphql.AggregationType, filter *graphql.MetricFilterInput) (*graphql.AggregatedMetric, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelFilter := r.convertFilterInput(filter)

	// Handle time-based aggregation types
	switch aggregation {
	case graphql.AggregationTypeLastHour:
		t := time.Now().Add(-1 * time.Hour)
		modelFilter.StartTime = &t
		aggregation = graphql.AggregationTypeAverage
	case graphql.AggregationTypeLastDay:
		t := time.Now().Add(-24 * time.Hour)
		modelFilter.StartTime = &t
		aggregation = graphql.AggregationTypeAverage
	case graphql.AggregationTypeLastWeek:
		t := time.Now().Add(-7 * 24 * time.Hour)
		modelFilter.StartTime = &t
		aggregation = graphql.AggregationTypeAverage
	}

	result, err := r.metricSvc.GetAggregatedMetrics(ctx, deviceID, string(aggregation), modelFilter)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.metricConv.AggregatedToGraphQL(result), nil
}

// RecordDeviceMetric records a single metric
func (r *Resolver) RecordDeviceMetric(ctx context.Context, input graphql.DeviceMetricInput) (*graphql.DeviceMetric, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return nil, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInput := r.metricConv.InputFromGraphQL(input)
	metric, err := r.metricSvc.RecordMetric(ctx, modelInput)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.metricConv.ToGraphQL(metric), nil
}

// RecordDeviceMetrics records multiple metrics
func (r *Resolver) RecordDeviceMetrics(ctx context.Context, inputs []*graphql.DeviceMetricInput) (bool, error) {
	tx, err := r.transact.Begin()
	if err != nil {
		return false, err
	}
	defer r.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	modelInputs := make([]model.DeviceMetricInput, 0, len(inputs))
	for _, input := range inputs {
		if input != nil {
			modelInputs = append(modelInputs, r.metricConv.InputFromGraphQL(*input))
		}
	}

	if err := r.metricSvc.RecordMetrics(ctx, modelInputs); err != nil {
		return false, err
	}

	if err = tx.Commit(); err != nil {
		return false, err
	}

	return true, nil
}

// convertFilterInput converts GraphQL filter input to model filter
func (r *Resolver) convertFilterInput(filter *graphql.MetricFilterInput) model.MetricFilter {
	if filter == nil {
		return model.MetricFilter{Limit: 100}
	}

	result := model.MetricFilter{
		MetricName: filter.MetricName,
		Limit:      100,
	}

	if filter.StartTime != nil {
		t := time.Time(*filter.StartTime)
		result.StartTime = &t
	}

	if filter.EndTime != nil {
		t := time.Time(*filter.EndTime)
		result.EndTime = &t
	}

	if filter.Limit != nil && *filter.Limit > 0 {
		result.Limit = *filter.Limit
	}

	return result
}
