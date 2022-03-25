package log

import (
	"context"

	"github.com/go-logr/logr"
	ctrl "sigs.k8s.io/controller-runtime"
)

const ContextKey = "LogCtxKey"

var C = LoggerFromContext

// ContextWithLogger returns a new context with the provided logger
func ContextWithLogger(ctx context.Context, logger logr.Logger) context.Context {
	return context.WithValue(ctx, ContextKey, logger)
}

// LoggerFromContext retrieves the current logger from the context
func LoggerFromContext(ctx context.Context) logr.Logger {
	logger, ok := ctx.Value(ContextKey).(logr.Logger)
	if !ok {
		logger = ctrl.Log
	}
	return logger
}
