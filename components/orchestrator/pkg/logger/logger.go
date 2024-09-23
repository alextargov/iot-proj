package logger

import (
	"context"
	"github.com/sirupsen/logrus"
	"io"
	"os"
)

type Config struct {
	Level  string `envconfig:"default=info,APP_LOG_LEVEL"`
	Format string `envconfig:"default=text,APP_LOG_FORMAT"`
	Output string `envconfig:"APP_LOG_OUTPUT,default=/dev/stdout"`
}

type logKey struct{}

// Log is the global logger instance
var (
	log *logrus.Logger
	C   = WithContext
)

const correlationIDKey = "correlationID"

// InitLogger initializes the logger with the provided log level and format
func InitLogger(ctx context.Context, config Config) context.Context {
	log = logrus.New()

	// Set the log level
	level, err := logrus.ParseLevel(config.Level)
	if err != nil {
		log.Errorf("Invalid log level '%s', defaulting to 'info'", config.Level)
		level = logrus.InfoLevel
	}
	log.SetLevel(level)

	// Set the log format (JSON or Text)
	switch config.Format {
	case "json":
		log.SetFormatter(&logrus.JSONFormatter{})
	case "text":
		log.SetFormatter(&logrus.TextFormatter{
			FullTimestamp: true,
		})
	default:
		log.Errorf("Invalid log format '%s', defaulting to 'text'", config.Format)
		log.SetFormatter(&logrus.TextFormatter{
			FullTimestamp: true,
		})
	}

	var output io.Writer
	switch config.Output {
	case os.Stdout.Name():
		output = os.Stdout
	case os.Stderr.Name():
		output = os.Stderr
	}

	log.SetOutput(output)
	return ContextWithLogger(ctx, log.WithContext(ctx))
}

// WithContext adds the correlation ID from the context to the log entry
func WithContext(ctx context.Context) *logrus.Entry {
	// Extract the correlation ID from the context
	correlationID, ok := ctx.Value(correlationIDKey).(string)
	if !ok {
		// Fallback if no correlation ID is present in the context
		return log.WithField(correlationIDKey, "unknown")
	}

	// Return a log entry with the correlation ID field
	return log.WithField(correlationIDKey, correlationID)
}

func ContextWithLogger(ctx context.Context, entry *logrus.Entry) context.Context {
	return context.WithValue(ctx, logKey{}, entry)
}
