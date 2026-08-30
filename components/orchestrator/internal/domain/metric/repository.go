package metric

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/repo"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"
)

const (
	tableName    string = `public.device_metrics`
	tenantColumn string = `tenant_id`
)

var (
	tableColumns = []string{"id", "device_id", "tenant_id", "metric_name", "metric_value", "unit", "recorded_at", "created_at"}
)

// EntityConverter defines the interface for metric entity conversion
type EntityConverter interface {
	ToEntity(model model.DeviceMetric) *Entity
	FromEntity(entity *Entity) *model.DeviceMetric
	MultipleFromEntity(entities EntityCollection) []*model.DeviceMetric
}

type repository struct {
	creator repo.CreatorGlobal
	lister  repo.ListerGlobal
	deleter repo.Deleter
	conv    EntityConverter
}

// NewRepository creates a new metric repository
func NewRepository(converter EntityConverter) *repository {
	return &repository{
		creator: repo.NewCreatorGlobal(resource.DeviceMetric, tableName, tableColumns),
		lister:  repo.NewListerGlobal(resource.DeviceMetric, tableName, tableColumns),
		deleter: repo.NewDeleter(tableName),
		conv:    converter,
	}
}

// Create creates a new metric entry
func (r *repository) Create(ctx context.Context, item model.DeviceMetric) error {
	entity := r.conv.ToEntity(item)

	now := time.Now()
	entity.CreatedAt = &now

	logger.C(ctx).Debugf("Persisting DeviceMetric entity with id %s to db", item.ID)
	return r.creator.Create(ctx, entity)
}

// CreateBatch creates multiple metric entries in a batch
func (r *repository) CreateBatch(ctx context.Context, items []model.DeviceMetric) error {
	if len(items) == 0 {
		return nil
	}

	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	values := make([]string, 0, len(items))
	args := make([]interface{}, 0, len(items)*len(tableColumns))

	for i, item := range items {
		entity := r.conv.ToEntity(item)
		entity.CreatedAt = &now

		placeholders := make([]string, len(tableColumns))
		for j := range tableColumns {
			placeholders[j] = fmt.Sprintf("$%d", i*len(tableColumns)+j+1)
		}
		values = append(values, fmt.Sprintf("(%s)", strings.Join(placeholders, ", ")))

		args = append(args,
			entity.ID,
			entity.DeviceID,
			entity.TenantID,
			entity.MetricName,
			entity.MetricValue,
			entity.Unit,
			entity.RecordedAt,
			entity.CreatedAt,
		)
	}

	stmt := fmt.Sprintf("INSERT INTO %s (%s) VALUES %s",
		tableName,
		strings.Join(tableColumns, ", "),
		strings.Join(values, ", "))

	logger.C(ctx).Debugf("Executing batch insert: %s", stmt)
	_, err = persist.ExecContext(ctx, stmt, args...)
	return err
}

// GetByDeviceID retrieves metrics for a device with optional filtering
func (r *repository) GetByDeviceID(ctx context.Context, deviceID string, filter model.MetricFilter) ([]*model.DeviceMetric, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("device_id = $%d", argIdx))
	args = append(args, deviceID)
	argIdx++

	if filter.MetricName != nil {
		conditions = append(conditions, fmt.Sprintf("metric_name = $%d", argIdx))
		args = append(args, *filter.MetricName)
		argIdx++
	}

	if filter.StartTime != nil {
		conditions = append(conditions, fmt.Sprintf("recorded_at >= $%d", argIdx))
		args = append(args, *filter.StartTime)
		argIdx++
	}

	if filter.EndTime != nil {
		conditions = append(conditions, fmt.Sprintf("recorded_at <= $%d", argIdx))
		args = append(args, *filter.EndTime)
		argIdx++
	}

	limit := 1000
	if filter.Limit > 0 && filter.Limit < 1000 {
		limit = filter.Limit
	}

	stmt := fmt.Sprintf("SELECT %s FROM %s WHERE %s ORDER BY recorded_at DESC LIMIT %d",
		strings.Join(tableColumns, ", "),
		tableName,
		strings.Join(conditions, " AND "),
		limit)

	logger.C(ctx).Debugf("Executing query: %s", stmt)

	var entities EntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, args...); err != nil {
		return nil, err
	}

	return r.conv.MultipleFromEntity(entities), nil
}

// GetAggregated retrieves aggregated metrics for a device
func (r *repository) GetAggregated(ctx context.Context, deviceID string, aggregationType string, filter model.MetricFilter) (*model.AggregatedMetric, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("device_id = $%d", argIdx))
	args = append(args, deviceID)
	argIdx++

	if filter.MetricName != nil {
		conditions = append(conditions, fmt.Sprintf("metric_name = $%d", argIdx))
		args = append(args, *filter.MetricName)
		argIdx++
	}

	if filter.StartTime != nil {
		conditions = append(conditions, fmt.Sprintf("recorded_at >= $%d", argIdx))
		args = append(args, *filter.StartTime)
		argIdx++
	}

	if filter.EndTime != nil {
		conditions = append(conditions, fmt.Sprintf("recorded_at <= $%d", argIdx))
		args = append(args, *filter.EndTime)
		argIdx++
	}

	stmt := fmt.Sprintf(`
		SELECT
			COALESCE(metric_name, '') as metric_name,
			COALESCE(SUM(metric_value), 0) as sum_value,
			COALESCE(AVG(metric_value), 0) as avg_value,
			COALESCE(MIN(metric_value), 0) as min_value,
			COALESCE(MAX(metric_value), 0) as max_value,
			COUNT(*) as count,
			MIN(recorded_at) as start_time,
			MAX(recorded_at) as end_time
		FROM %s
		WHERE %s
		GROUP BY metric_name`,
		tableName,
		strings.Join(conditions, " AND "))

	logger.C(ctx).Debugf("Executing aggregation query: %s", stmt)

	type aggregatedRow struct {
		MetricName string    `db:"metric_name"`
		SumValue   float64   `db:"sum_value"`
		AvgValue   float64   `db:"avg_value"`
		MinValue   float64   `db:"min_value"`
		MaxValue   float64   `db:"max_value"`
		Count      int       `db:"count"`
		StartTime  time.Time `db:"start_time"`
		EndTime    time.Time `db:"end_time"`
	}

	var rows []aggregatedRow
	if err := persist.SelectContext(ctx, &rows, stmt, args...); err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, nil
	}

	row := rows[0]
	var value float64
	switch aggregationType {
	case "SUM":
		value = row.SumValue
	case "AVERAGE":
		value = row.AvgValue
	case "MIN":
		value = row.MinValue
	case "MAX":
		value = row.MaxValue
	case "COUNT":
		value = float64(row.Count)
	default:
		value = row.AvgValue
	}

	return &model.AggregatedMetric{
		MetricName: row.MetricName,
		Value:      value,
		Count:      row.Count,
		Min:        row.MinValue,
		Max:        row.MaxValue,
		StartTime:  row.StartTime,
		EndTime:    row.EndTime,
	}, nil
}

// DeleteByDeviceID deletes all metrics for a device
func (r *repository) DeleteByDeviceID(ctx context.Context, deviceID string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}

	stmt := fmt.Sprintf("DELETE FROM %s WHERE device_id = $1", tableName)
	logger.C(ctx).Debugf("Executing delete: %s", stmt)

	_, err = persist.ExecContext(ctx, stmt, deviceID)
	return err
}

// DeleteOlderThan deletes metrics recorded before the given cutoff time across
// all tenants. Used by the retention cleanup job. Returns the number of rows
// deleted.
func (r *repository) DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return 0, err
	}

	stmt := fmt.Sprintf("DELETE FROM %s WHERE recorded_at < $1", tableName)
	res, err := persist.ExecContext(ctx, stmt, cutoff)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// RollupHourly computes hourly aggregates from raw device_metrics recorded at or
// after `since` and upserts them into device_metrics_hourly. It is idempotent:
// re-running for an overlapping window recomputes and overwrites the affected
// buckets. Returns the number of rollup rows written.
func (r *repository) RollupHourly(ctx context.Context, since time.Time) (int64, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return 0, err
	}

	stmt := fmt.Sprintf(`
INSERT INTO device_metrics_hourly
    (device_id, tenant_id, metric_name, bucket, sum_value, count_value, min_value, max_value, avg_value, unit, updated_at)
SELECT
    device_id,
    tenant_id,
    metric_name,
    date_trunc('hour', recorded_at) AS bucket,
    SUM(metric_value)   AS sum_value,
    COUNT(*)            AS count_value,
    MIN(metric_value)   AS min_value,
    MAX(metric_value)   AS max_value,
    AVG(metric_value)   AS avg_value,
    MAX(unit)           AS unit,
    CURRENT_TIMESTAMP
FROM %s
WHERE recorded_at >= $1
GROUP BY device_id, tenant_id, metric_name, date_trunc('hour', recorded_at)
ON CONFLICT (device_id, metric_name, bucket) DO UPDATE SET
    sum_value   = EXCLUDED.sum_value,
    count_value = EXCLUDED.count_value,
    min_value   = EXCLUDED.min_value,
    max_value   = EXCLUDED.max_value,
    avg_value   = EXCLUDED.avg_value,
    unit        = EXCLUDED.unit,
    tenant_id   = EXCLUDED.tenant_id,
    updated_at  = CURRENT_TIMESTAMP`, tableName)

	res, err := persist.ExecContext(ctx, stmt, since)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// GetMetricNames retrieves unique metric names for a device
func (r *repository) GetMetricNames(ctx context.Context, deviceID string) ([]string, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}

	stmt := fmt.Sprintf("SELECT DISTINCT metric_name FROM %s WHERE device_id = $1 ORDER BY metric_name", tableName)

	var names []string
	if err := persist.SelectContext(ctx, &names, stmt, deviceID); err != nil {
		return nil, err
	}

	return names, nil
}
