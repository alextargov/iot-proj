package metric

import (
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct{}

// NewConverter creates a new metric converter
func NewConverter() *converter {
	return &converter{}
}

// ToEntity converts a model.DeviceMetric to an Entity
func (c *converter) ToEntity(m model.DeviceMetric) *Entity {
	return &Entity{
		ID:          m.ID,
		DeviceID:    m.DeviceID,
		TenantID:    m.TenantID,
		MetricName:  m.MetricName,
		MetricValue: m.MetricValue,
		Unit:        repo.NewNullableString(m.Unit),
		RecordedAt:  m.RecordedAt,
		CreatedAt:   m.CreatedAt,
	}
}

// FromEntity converts an Entity to a model.DeviceMetric
func (c *converter) FromEntity(entity *Entity) *model.DeviceMetric {
	if entity == nil {
		return nil
	}

	return &model.DeviceMetric{
		ID:          entity.ID,
		DeviceID:    entity.DeviceID,
		TenantID:    entity.TenantID,
		MetricName:  entity.MetricName,
		MetricValue: entity.MetricValue,
		Unit:        repo.StringPtrFromNullableString(entity.Unit),
		RecordedAt:  entity.RecordedAt,
		CreatedAt:   entity.CreatedAt,
	}
}

// MultipleFromEntity converts a collection of entities to models
func (c *converter) MultipleFromEntity(entities EntityCollection) []*model.DeviceMetric {
	metrics := make([]*model.DeviceMetric, 0, len(entities))
	for _, entity := range entities {
		metrics = append(metrics, c.FromEntity(&entity))
	}
	return metrics
}

// ToGraphQL converts a model.DeviceMetric to graphql.DeviceMetric
func (c *converter) ToGraphQL(m *model.DeviceMetric) *graphql.DeviceMetric {
	if m == nil {
		return nil
	}

	return &graphql.DeviceMetric{
		ID:          m.ID,
		DeviceID:    m.DeviceID,
		MetricName:  m.MetricName,
		MetricValue: m.MetricValue,
		Unit:        m.Unit,
		RecordedAt:  graphql.Timestamp(m.RecordedAt),
	}
}

// MultipleToGraphQL converts a slice of model.DeviceMetric to graphql.DeviceMetric
func (c *converter) MultipleToGraphQL(metrics []*model.DeviceMetric) []*graphql.DeviceMetric {
	result := make([]*graphql.DeviceMetric, 0, len(metrics))
	for _, m := range metrics {
		if m != nil {
			result = append(result, c.ToGraphQL(m))
		}
	}
	return result
}

// InputFromGraphQL converts graphql.DeviceMetricInput to model.DeviceMetricInput
func (c *converter) InputFromGraphQL(in graphql.DeviceMetricInput) model.DeviceMetricInput {
	var recordedAt *time.Time
	if in.RecordedAt != nil {
		t := time.Time(*in.RecordedAt)
		recordedAt = &t
	}

	return model.DeviceMetricInput{
		DeviceID:    in.DeviceID,
		MetricName:  in.MetricName,
		MetricValue: in.MetricValue,
		Unit:        in.Unit,
		RecordedAt:  recordedAt,
	}
}

// AggregatedToGraphQL converts model.AggregatedMetric to graphql.AggregatedMetric
func (c *converter) AggregatedToGraphQL(m *model.AggregatedMetric) *graphql.AggregatedMetric {
	if m == nil {
		return nil
	}

	return &graphql.AggregatedMetric{
		MetricName: m.MetricName,
		Value:      m.Value,
		Count:      m.Count,
		Min:        m.Min,
		Max:        m.Max,
		StartTime:  graphql.Timestamp(m.StartTime),
		EndTime:    graphql.Timestamp(m.EndTime),
	}
}

// MetricSeriesToGraphQL converts model.MetricSeries to graphql.MetricSeries
func (c *converter) MetricSeriesToGraphQL(s *model.MetricSeries) *graphql.MetricSeries {
	if s == nil {
		return nil
	}

	return &graphql.MetricSeries{
		MetricName: s.MetricName,
		Unit:       s.Unit,
		DataPoints: c.MultipleToGraphQL(s.DataPoints),
	}
}

// MultipleMetricSeriesToGraphQL converts multiple model.MetricSeries to graphql
func (c *converter) MultipleMetricSeriesToGraphQL(series []*model.MetricSeries) []*graphql.MetricSeries {
	result := make([]*graphql.MetricSeries, 0, len(series))
	for _, s := range series {
		if s != nil {
			result = append(result, c.MetricSeriesToGraphQL(s))
		}
	}
	return result
}
