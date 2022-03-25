package k8s

import (
	"context"
	"github.com/iot-proj/components/controller/api/v1alpha1"

	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
)

// client implements KubernetesClient and acts as a wrapper of the default kubernetes controller client
type client struct {
	ctrlclient.Client
}

// NewClient constructs a new client instance
func NewClient(ctrlClient ctrlclient.Client) *client {
	return &client{Client: ctrlClient}
}

// Get wraps the default kubernetes controller client Get method
func (c *client) Get(ctx context.Context, key ctrlclient.ObjectKey) (*v1alpha1.Application, error) {
	var operation = &v1alpha1.Application{}
	err := c.Client.Get(ctx, key, operation)
	if err != nil {
		return nil, err
	}
	return operation, nil
}
