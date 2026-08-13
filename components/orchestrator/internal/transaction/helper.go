package transaction

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// Helper provides a simplified interface for transaction management
type Helper struct {
	transact persistence.Transactioner
}

// NewHelper creates a new transaction helper
func NewHelper(transact persistence.Transactioner) *Helper {
	return &Helper{transact: transact}
}

// WithTransaction executes a function within a transaction context
// The transaction is committed if the function returns without error,
// otherwise it is rolled back
func (h *Helper) WithTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	tx, err := h.transact.Begin()
	if err != nil {
		return err
	}
	defer h.transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	if err := fn(ctx); err != nil {
		return err
	}

	return tx.Commit()
}

// WithTransactionResult executes a function within a transaction context and returns a result
// The transaction is committed if the function returns without error,
// otherwise it is rolled back
func WithTransactionResult[T any](ctx context.Context, transact persistence.Transactioner, fn func(ctx context.Context) (T, error)) (T, error) {
	var zero T

	tx, err := transact.Begin()
	if err != nil {
		return zero, err
	}
	defer transact.RollbackUnlessCommitted(ctx, tx)

	ctx = persistence.SaveToContext(ctx, tx)

	result, err := fn(ctx)
	if err != nil {
		return zero, err
	}

	if err := tx.Commit(); err != nil {
		return zero, err
	}

	return result, nil
}

// WithReadOnlyTransaction executes a read-only function within a transaction context
// Similar to WithTransactionResult but semantically indicates read-only operations
func WithReadOnlyTransaction[T any](ctx context.Context, transact persistence.Transactioner, fn func(ctx context.Context) (T, error)) (T, error) {
	return WithTransactionResult(ctx, transact, fn)
}
