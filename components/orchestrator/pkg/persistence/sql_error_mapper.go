package persistence

import (
	"context"
	"database/sql"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/resource"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"

	"github.com/lib/pq"
	"github.com/pkg/errors"
)

// MapSQLError missing godoc
func MapSQLError(ctx context.Context, err error, resourceType resource.Type, sqlOperation resource.SQLOperation, format string, args ...interface{}) error {
	if err == nil {
		return nil
	}

	loggedErr := errors.Wrapf(err, format, args...)
	if errors.Is(err, context.DeadlineExceeded) {
		logger.C(ctx).WithError(loggedErr).Errorf("Timeout error on SQL query")
		return apperrors.NewInternalError("Maximum processing timeout reached")
	}

	if err == sql.ErrNoRows {
		logger.C(ctx).WithError(loggedErr).Errorf("SQL: no rows in result set for '%s' resource type", resourceType)
		return apperrors.NewNotFoundErrorWithType(resourceType)
	}

	pgErr, ok := err.(*pq.Error)
	if !ok {
		logger.C(ctx).WithError(loggedErr).Errorf("Error while casting to postgres error")
		return apperrors.NewInternalError("Unexpected error while executing SQL query")
	}

	logger.C(ctx).WithError(loggedErr).Errorf("SQL Error. Caused by: %s. DETAILS: %s", pgErr.Message, pgErr.Detail)

	switch pgErr.Code {
	case NotNullViolation:
		return apperrors.NewNotNullViolationError(resourceType)
	case CheckViolation:
		return apperrors.NewCheckViolationError(resourceType)
	case UniqueViolation:
		return apperrors.NewNotUniqueError(resourceType)
	case ForeignKeyViolation:
		return apperrors.NewForeignKeyInvalidOperationError(sqlOperation, resourceType)
	}

	return apperrors.NewInternalError("Unexpected error while executing SQL query")
}
