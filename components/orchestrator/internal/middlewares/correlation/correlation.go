package correlation

import (
	"context"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/google/uuid"
	"net/http"
)

const correlationIDHeader = "X-Correlation-ID"
const correlationIDKey = "correlationID"

// CorrelationIDMiddleware extracts or generates a correlation ID for each request.
func CorrelationIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		correlationID := r.Header.Get(correlationIDHeader)

		if correlationID == "" {
			correlationID = uuid.New().String() // Generate a new correlation ID
		}

		// Attach the correlation ID to the context
		ctx := context.WithValue(r.Context(), correlationIDKey, correlationID)

		// Log the incoming request with the correlation ID
		logger.C(ctx).WithField(correlationIDKey, correlationID).Info("Received request")

		// Call the next handler with the updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
