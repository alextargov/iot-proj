package controllers

import (
	"context"
	"github.com/iot-proj/components/controller/api/v1alpha1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// StatusManager defines an abstraction for managing the status of a given kubernetes resource
//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 . StatusManager
type StatusManager interface {
	Initialize(ctx context.Context, application *v1alpha1.Application) error
	BuildReady(ctx context.Context, application *v1alpha1.Application) error
	BuildError(ctx context.Context, application *v1alpha1.Application, errMsg string) error
	CodeObtained(ctx context.Context, application *v1alpha1.Application) error
	ImageReady(ctx context.Context, application *v1alpha1.Application) error
	DeploymentReady(ctx context.Context, application *v1alpha1.Application) error
	DeploymentError(ctx context.Context, application *v1alpha1.Application, errMsg string) error
}

// KubernetesClient is a defines a Kubernetes client capable of retrieving and deleting resources as well as updating their status
//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 . KubernetesClient
type KubernetesClient interface {
	Get(ctx context.Context, key client.ObjectKey) (*v1alpha1.Application, error)
	Delete(ctx context.Context, obj client.Object, opts ...client.DeleteOption) error
}
