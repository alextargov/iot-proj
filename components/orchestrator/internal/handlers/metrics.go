package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
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
	GetByToken(ctx context.Context, token string) (*model.Device, error)
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

// extractDeviceToken extracts a device token from the Authorization header
// Expects format: "Device <token>" or "Bearer <token>"
func extractDeviceToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return ""
	}

	parts := strings.SplitN(auth, " ", 2)
	if len(parts) != 2 {
		return ""
	}

	scheme := strings.ToLower(parts[0])
	if scheme == "device" || scheme == "bearer" {
		return parts[1]
	}

	return ""
}

// validateDeviceToken validates the device token and returns the device if valid
func (h *MetricsHandler) validateDeviceToken(ctx context.Context, r *http.Request, expectedDeviceID string) (*model.Device, error) {
	token := extractDeviceToken(r)
	if token == "" {
		return nil, nil
	}

	device, err := h.deviceSvc.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	// If expectedDeviceID is provided, verify the token belongs to that device
	if expectedDeviceID != "" && device.ID != expectedDeviceID {
		return nil, nil
	}

	return device, nil
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
// Requires device token authentication via "Authorization: Device <token>" or "Authorization: Bearer <token>"
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

	// Validate device token if provided
	token := extractDeviceToken(r)
	var device *model.Device

	if token != "" {
		device, err = h.deviceSvc.GetByToken(ctx, token)
		if err != nil {
			logger.C(ctx).Warnf("Invalid device token: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid device token"})
			return
		}

		// Verify token belongs to the requested device
		if device.ID != deviceID {
			logger.C(ctx).Warnf("Token device ID mismatch: token=%s, requested=%s", device.ID, deviceID)
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "Token does not match device"})
			return
		}
	} else {
		// No token provided - fall back to looking up device by ID
		// This maintains backward compatibility but should be deprecated
		device, err = h.deviceSvc.GetByID(ctx, deviceID)
		if err != nil {
			logger.C(ctx).Errorf("Device %s not found: %v", deviceID, err)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Device not found"})
			return
		}
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
