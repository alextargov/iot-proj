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
	WatchBuildReady(ctx context.Context, application *v1alpha1.Application) error
	BuildError(ctx context.Context, application *v1alpha1.Application) error
	ObtainCode(ctx context.Context, application *v1alpha1.Application) error
	BuildImage(ctx context.Context, application *v1alpha1.Application) error
	Deploy(ctx context.Context, application *v1alpha1.Application) error
	WatchDeployReady(ctx context.Context, application *v1alpha1.Application) error
	DeploymentError(ctx context.Context, application *v1alpha1.Application, errMsg string) error
}

// KubernetesClient is a defines a Kubernetes client capable of retrieving and deleting resources as well as updating their status
//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 . KubernetesClient
type KubernetesClient interface {
	Get(ctx context.Context, key client.ObjectKey) (*v1alpha1.Application, error)
	Delete(ctx context.Context, obj client.Object, opts ...client.DeleteOption) error
	Update(ctx context.Context, obj client.Object, opts ...client.UpdateOption) error
}
