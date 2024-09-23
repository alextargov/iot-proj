package apperrors

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/99designs/gqlgen/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

// WriteAppError missing godoc
func WriteAppError(ctx context.Context, w http.ResponseWriter, appErr error, statusCode int) {
	errCode := ErrorCode(appErr)
	if errCode == UnknownError || errCode == InternalError {
		errCode = InternalError
	}

	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json")
	resp := graphql.Response{Errors: []*gqlerror.Error{{
		Message:    appErr.Error(),
		Extensions: map[string]interface{}{"error_code": errCode, "error": errCode.String()}}}}
	err := json.NewEncoder(w).Encode(resp)
	if err != nil {
		logger.C(ctx).WithError(err).Errorf("An error occurred while encoding data: %v", err)
	}
}
