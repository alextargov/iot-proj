package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
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
	userSvc   UserService
	jwtSvc    JWTService
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
func NewMetricsHandler(db persistence.Transactioner, metricSvc MetricService, deviceSvc DeviceService, userSvc UserService, jwtSvc JWTService) *MetricsHandler {
	return &MetricsHandler{
		db:        db,
		metricSvc: metricSvc,
		deviceSvc: deviceSvc,
		userSvc:   userSvc,
		jwtSvc:    jwtSvc,
	}
}

// authResult holds the result of authentication
type authResult struct {
	// For device token auth
	Device *model.Device
	// For JWT auth
	User     *model.User
	TenantID string
}

// authenticateRequest tries to authenticate the request using either device token or JWT
// Returns authResult with either Device (for device token) or User (for JWT)
func (h *MetricsHandler) authenticateRequest(ctx context.Context, r *http.Request, expectedDeviceID string) (*authResult, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, nil
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 {
		return nil, nil
	}

	scheme := strings.ToLower(parts[0])
	token := parts[1]

	// Try device token auth first (scheme: "device")
	if scheme == "device" {
		device, err := h.deviceSvc.GetByToken(ctx, token)
		if err != nil {
			return nil, err
		}
		if expectedDeviceID != "" && device.ID != expectedDeviceID {
			return nil, nil // Token doesn't match expected device
		}
		return &authResult{Device: device, TenantID: device.TenantID}, nil
	}

	// Try JWT auth (scheme: "bearer")
	if scheme == "bearer" {
		// First try as device token (backward compatibility)
		device, err := h.deviceSvc.GetByToken(ctx, token)
		if err == nil {
			if expectedDeviceID == "" || device.ID == expectedDeviceID {
				return &authResult{Device: device, TenantID: device.TenantID}, nil
			}
		}

		// Try as JWT
		if h.jwtSvc != nil {
			claims, err := h.jwtSvc.ValidateToken(token)
			if err == nil && h.userSvc != nil {
				user, err := h.userSvc.GetByUsername(ctx, claims.Username)
				if err == nil {
					return &authResult{User: user, TenantID: user.ID}, nil
				}
			}
		}
	}

	return nil, nil
}

// RecordMetrics handles POST /api/v1/metrics
// Accepts a batch of metrics to record
// Supports both device token auth and JWT auth
func (h *MetricsHandler) RecordMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var payload MetricsPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		logger.C(ctx).Errorf("Error decoding metrics payload: %v", err)
		apperrors.WriteBadRequest(w, "Invalid request payload")
		return
	}

	if len(payload.Metrics) == 0 {
		apperrors.WriteBadRequest(w, "No metrics provided")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		logger.C(ctx).Errorf("Error starting transaction: %v", err)
		apperrors.WriteInternalError(w, "Internal server error")
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
		apperrors.WriteInternalError(w, "Failed to save metrics")
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
// Supports dual authentication:
//   - Device token: "Authorization: Device <token>" - device authenticates itself
//   - JWT: "Authorization: Bearer <jwt>" - user/admin records metrics on behalf of device
func (h *MetricsHandler) RecordDeviceMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	deviceID := vars["deviceId"]

	if deviceID == "" {
		apperrors.WriteBadRequest(w, "Device ID required")
		return
	}

	var metrics []MetricPayload
	if err := json.NewDecoder(r.Body).Decode(&metrics); err != nil {
		logger.C(ctx).Errorf("Error decoding metrics: %v", err)
		apperrors.WriteBadRequest(w, "Invalid request payload")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		logger.C(ctx).Errorf("Error starting transaction: %v", err)
		apperrors.WriteInternalError(w, "Internal server error")
		return
	}
	defer h.db.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	// Try dual authentication (device token or JWT)
	authRes, err := h.authenticateRequest(ctx, r, deviceID)
	if err != nil {
		logger.C(ctx).Warnf("Authentication error: %v", err)
		apperrors.WriteUnauthorized(w, "Authentication failed")
		return
	}

	var tenantID string
	var device *model.Device

	if authRes != nil {
		if authRes.Device != nil {
			// Device token auth - device authenticates itself
			device = authRes.Device
			tenantID = authRes.TenantID

			// Verify token belongs to the requested device
			if device.ID != deviceID {
				logger.C(ctx).Warnf("Token device ID mismatch: token=%s, requested=%s", device.ID, deviceID)
				apperrors.WriteForbidden(w, "Token does not match device")
				return
			}
		} else if authRes.User != nil {
			// JWT auth - user/admin recording metrics on behalf of device
			tenantID = authRes.TenantID

			// Verify the device belongs to this user's tenant
			device, err = h.deviceSvc.GetByID(ctx, deviceID)
			if err != nil {
				logger.C(ctx).Errorf("Device %s not found: %v", deviceID, err)
				apperrors.WriteNotFound(w, "Device not found")
				return
			}

			if device.TenantID != tenantID {
				logger.C(ctx).Warnf("User %s attempted to record metrics for device %s owned by different tenant", authRes.User.Username, deviceID)
				apperrors.WriteForbidden(w, "Device not owned by this user")
				return
			}
		}
	} else {
		// No auth provided - fall back to looking up device by ID (backward compatibility)
		device, err = h.deviceSvc.GetByID(ctx, deviceID)
		if err != nil {
			logger.C(ctx).Errorf("Device %s not found: %v", deviceID, err)
			apperrors.WriteNotFound(w, "Device not found")
			return
		}
		tenantID = device.TenantID
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

		if _, err := h.metricSvc.RecordMetricWithTenant(ctx, input, tenantID); err != nil {
			logger.C(ctx).Errorf("Error recording metric: %v", err)
			continue
		}
		recorded++
	}

	if err := tx.Commit(); err != nil {
		logger.C(ctx).Errorf("Error committing transaction: %v", err)
		apperrors.WriteInternalError(w, "Failed to save metrics")
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"recorded": recorded,
		"total":    len(metrics),
	})
}
