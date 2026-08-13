package apperrors

import (
	"encoding/json"
	"errors"
	"net/http"
)

// ErrorResponse represents a standardized JSON error response
type ErrorResponse struct {
	Error       string `json:"error"`
	Code        string `json:"code,omitempty"`
	Description string `json:"description,omitempty"`
}

// HTTPStatusCode returns the appropriate HTTP status code for an error type
func HTTPStatusCode(errType ErrorType) int {
	switch errType {
	case NotFound, TenantNotFound:
		return http.StatusNotFound
	case NotUnique, NotUniqueName, Conflict:
		return http.StatusConflict
	case InvalidData, EmptyData, InconsistentData, BadRequest:
		return http.StatusBadRequest
	case Unauthorized, InsufficientScopes:
		return http.StatusUnauthorized
	case InvalidOperation, TenantRequired:
		return http.StatusForbidden
	case OperationTimeout:
		return http.StatusGatewayTimeout
	case ConcurrentOperation, ConcurrentUpdate:
		return http.StatusConflict
	case InvalidStatusCondition, CannotUpdateObjectInManyBundles:
		return http.StatusUnprocessableEntity
	case InternalError, UnknownError:
		return http.StatusInternalServerError
	default:
		// Check if it's a direct HTTP status code
		if int(errType) >= 400 && int(errType) < 600 {
			return int(errType)
		}
		return http.StatusInternalServerError
	}
}

// WriteError writes a standardized error response based on the error type
func WriteError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")

	var appErr Error
	if errors.As(err, &appErr) {
		statusCode := HTTPStatusCode(appErr.errorCode)
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:       appErr.Error(),
			Code:        appErr.errorCode.String(),
			Description: getErrorDescription(appErr.errorCode),
		})
		return
	}

	// Unknown error - treat as internal server error
	w.WriteHeader(http.StatusInternalServerError)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: "Internal server error",
		Code:  InternalError.String(),
	})
}

// WriteErrorWithStatus writes an error with a specific HTTP status code
func WriteErrorWithStatus(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error: message,
		Code:  getCodeFromStatus(statusCode),
	})
}

// WriteBadRequest writes a 400 Bad Request error
func WriteBadRequest(w http.ResponseWriter, message string) {
	WriteErrorWithStatus(w, http.StatusBadRequest, message)
}

// WriteUnauthorized writes a 401 Unauthorized error
func WriteUnauthorized(w http.ResponseWriter, message string) {
	WriteErrorWithStatus(w, http.StatusUnauthorized, message)
}

// WriteForbidden writes a 403 Forbidden error
func WriteForbidden(w http.ResponseWriter, message string) {
	WriteErrorWithStatus(w, http.StatusForbidden, message)
}

// WriteNotFound writes a 404 Not Found error
func WriteNotFound(w http.ResponseWriter, message string) {
	WriteErrorWithStatus(w, http.StatusNotFound, message)
}

// WriteInternalError writes a 500 Internal Server Error
func WriteInternalError(w http.ResponseWriter, message string) {
	WriteErrorWithStatus(w, http.StatusInternalServerError, message)
}

// getErrorDescription returns a user-friendly description for error types
func getErrorDescription(errType ErrorType) string {
	switch errType {
	case NotFound:
		return "The requested resource could not be found"
	case NotUnique, NotUniqueName:
		return "A resource with this identifier already exists"
	case InvalidData:
		return "The provided data is invalid"
	case Unauthorized:
		return "Authentication is required"
	case InsufficientScopes:
		return "You do not have sufficient permissions"
	case TenantRequired:
		return "A tenant context is required for this operation"
	case TenantNotFound:
		return "The specified tenant could not be found"
	case InvalidOperation:
		return "This operation is not allowed"
	case OperationTimeout:
		return "The operation timed out"
	case ConcurrentOperation, ConcurrentUpdate:
		return "A concurrent operation is in progress"
	default:
		return ""
	}
}

// getCodeFromStatus returns a code string for HTTP status codes
func getCodeFromStatus(statusCode int) string {
	switch statusCode {
	case http.StatusBadRequest:
		return "BAD_REQUEST"
	case http.StatusUnauthorized:
		return "UNAUTHORIZED"
	case http.StatusForbidden:
		return "FORBIDDEN"
	case http.StatusNotFound:
		return "NOT_FOUND"
	case http.StatusConflict:
		return "CONFLICT"
	case http.StatusUnprocessableEntity:
		return "UNPROCESSABLE_ENTITY"
	case http.StatusInternalServerError:
		return "INTERNAL_ERROR"
	case http.StatusGatewayTimeout:
		return "TIMEOUT"
	default:
		return "ERROR"
	}
}
