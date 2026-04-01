package model

import "time"

// DeviceMetric represents a single metric data point recorded from a device
type DeviceMetric struct {
	ID          string     `json:"id"`
	DeviceID    string     `json:"deviceId"`
	TenantID    string     `json:"tenantId"`
	MetricName  string     `json:"metricName"`
	MetricValue float64    `json:"metricValue"`
	Unit        *string    `json:"unit"`
	RecordedAt  time.Time  `json:"recordedAt"`
	CreatedAt   *time.Time `json:"createdAt"`
}

// DeviceMetricInput represents input for creating a new metric
type DeviceMetricInput struct {
	DeviceID    string
	MetricName  string
	MetricValue float64
	Unit        *string
	RecordedAt  *time.Time // Optional, defaults to now
}

// MetricFilter represents filter options for querying metrics
type MetricFilter struct {
	MetricName *string
	StartTime  *time.Time
	EndTime    *time.Time
	Limit      int
}

// AggregatedMetric represents aggregated metric data
type AggregatedMetric struct {
	MetricName string
	Value      float64
	Count      int
	Min        float64
	Max        float64
	StartTime  time.Time
	EndTime    time.Time
}

// MetricSeries represents a series of metrics for a specific metric name
type MetricSeries struct {
	MetricName string
	Unit       *string
	DataPoints []*DeviceMetric
}
