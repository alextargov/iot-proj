package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/gorilla/mux"
)

// MetricService defines the interface for recording metrics
type MetricService interface {
	RecordMetricWithTenant(ctx context.Context, input model.DeviceMetricInput, tenantID string) (*model.DeviceMetric, error)
}

// DeviceService defines the interface for device operations
type DeviceService interface {
	GetByID(ctx context.Context, id string) (*model.Device, error)
}

// MetricsHandler handles REST API requests for device metrics
type MetricsHandler struct {
	db        persistence.Transactioner
	metricSvc MetricService
	deviceSvc DeviceService
}

// MetricPayload represents the JSON payload for recording a metric
type MetricPayload struct {
	DeviceID    string  `json:"deviceId"`
	MetricName  string  `json:"metricName"`
	MetricValue float64 `json:"metricValue"`
	Unit        *string `json:"unit,omitempty"`
	RecordedAt  *string `json:"recordedAt,omitempty"`
}

// MetricsPayload represents a batch of metrics
type MetricsPayload struct {
	Metrics []MetricPayload `json:"metrics"`
}

// NewMetricsHandler creates a new metrics handler
func NewMetricsHandler(db persistence.Transactioner, metricSvc MetricService, deviceSvc DeviceService) *MetricsHandler {
	return &MetricsHandler{
		db:        db,
		metricSvc: metricSvc,
		deviceSvc: deviceSvc,
	}
}

// RecordMetrics handles POST /api/v1/metrics
// Accepts a batch of metrics to record
func (h *MetricsHandler) RecordMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var payload MetricsPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		logger.C(ctx).Errorf("Error decoding metrics payload: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if len(payload.Metrics) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "No metrics provided"})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		logger.C(ctx).Errorf("Error starting transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
		return
	}
	defer h.db.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	recorded := 0
	for _, m := range payload.Metrics {
		if m.DeviceID == "" || m.MetricName == "" {
			continue
		}

		// Get device to determine tenant
		device, err := h.deviceSvc.GetByID(ctx, m.DeviceID)
		if err != nil {
			logger.C(ctx).Warnf("Device %s not found: %v", m.DeviceID, err)
			continue
		}

		input := model.DeviceMetricInput{
			DeviceID:    m.DeviceID,
			MetricName:  m.MetricName,
			MetricValue: m.MetricValue,
			Unit:        m.Unit,
		}

		if m.RecordedAt != nil {
			t, err := time.Parse(time.RFC3339, *m.RecordedAt)
			if err == nil {
				input.RecordedAt = &t
			}
		}

		if _, err := h.metricSvc.RecordMetricWithTenant(ctx, input, device.TenantID); err != nil {
			logger.C(ctx).Errorf("Error recording metric: %v", err)
			continue
		}
		recorded++
	}

	if err := tx.Commit(); err != nil {
		logger.C(ctx).Errorf("Error committing transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save metrics"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"recorded": recorded,
		"total":    len(payload.Metrics),
	})
}

// RecordDeviceMetrics handles POST /api/v1/devices/{deviceId}/metrics
// Records metrics for a specific device
func (h *MetricsHandler) RecordDeviceMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	deviceID := vars["deviceId"]

	if deviceID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Device ID required"})
		return
	}

	var metrics []MetricPayload
	if err := json.NewDecoder(r.Body).Decode(&metrics); err != nil {
		logger.C(ctx).Errorf("Error decoding metrics: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		logger.C(ctx).Errorf("Error starting transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
		return
	}
	defer h.db.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	// Get device to verify it exists and get tenant
	device, err := h.deviceSvc.GetByID(ctx, deviceID)
	if err != nil {
		logger.C(ctx).Errorf("Device %s not found: %v", deviceID, err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Device not found"})
		return
	}

	recorded := 0
	for _, m := range metrics {
		if m.MetricName == "" {
			continue
		}

		input := model.DeviceMetricInput{
			DeviceID:    deviceID,
			MetricName:  m.MetricName,
			MetricValue: m.MetricValue,
			Unit:        m.Unit,
		}

		if m.RecordedAt != nil {
			t, err := time.Parse(time.RFC3339, *m.RecordedAt)
			if err == nil {
				input.RecordedAt = &t
			}
		}

		if _, err := h.metricSvc.RecordMetricWithTenant(ctx, input, device.TenantID); err != nil {
			logger.C(ctx).Errorf("Error recording metric: %v", err)
			continue
		}
		recorded++
	}

	if err := tx.Commit(); err != nil {
		logger.C(ctx).Errorf("Error committing transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save metrics"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"recorded": recorded,
		"total":    len(metrics),
	})
}
