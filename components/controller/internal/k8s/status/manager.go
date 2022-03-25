package status

import (
	"context"
	"github.com/iot-proj/components/controller/api/v1alpha1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type statusUpdaterFunc func(application *v1alpha1.Application)

// manager implements the StatusManager interface
type manager struct {
	k8sClient client.Client
}

// NewManager constructs a manager instance
func NewManager(k8sClient client.Client) *manager {
	return &manager{
		k8sClient: k8sClient,
	}
}

// Initialize sets the initial status of an Application CR.
// The method executes only if the generation of the Application CR mismatches the observed generation in the status,
// which allows the method to be used on the same resource over and over, for example when consecutive async requests
// are scheduled on the same Application CR and the old status should be wiped off.
func (m *manager) Initialize(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	status := &application.Status
	if status.ObservedGeneration != nil && application.ObjectMeta.Generation == *status.ObservedGeneration {
		return nil
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.ObservedGeneration = &application.Generation
		status.Phase = v1alpha1.StateInitial
		status.InitializedAt = metav1.Now()
	})
}

// BuildReady sets the initial status of an Application CR.
func (m *manager) BuildReady(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateBuildReady
	})
}

// BuildError sets the initial status of an Application CR.
func (m *manager) BuildError(ctx context.Context, application *v1alpha1.Application, errMsg string) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		//status.Phase = v1alpha1.StateBuildError
		status.Error = v1alpha1.ErrorState{
			Type:    v1alpha1.BuildErrorType,
			Message: "build error",
		}
	})
}

// StateCodeObtained sets the initial status of an Application CR.
func (m *manager) CodeObtained(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateCodeObtained
	})
}

// ImageReady sets the initial status of an Application CR.
func (m *manager) ImageReady(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateImageReady
	})
}

// DeploymentReady sets the initial status of an Application CR.
func (m *manager) DeploymentReady(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateDeploymentReady
	})
}

// DeploymentError sets the initial status of an Application CR.
func (m *manager) DeploymentError(ctx context.Context, application *v1alpha1.Application, errMsg string) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		//status := &application.Status
		//status.Phase = v1alpha1.StateDeploymentError
		//status.Error = errMsg
	})
}

func (m *manager) updateStatusFunc(ctx context.Context, application *v1alpha1.Application, statusUpdaterFunc statusUpdaterFunc) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := application.Validate(); err != nil {
			return err
		}

		statusUpdaterFunc(application)

		// The following error might be observed if we try to update an application that was retrieved from an outdated K8s client cache:
		// "the object has been modified; please apply your changes to the latest version and try again"
		// The error is expected, and should be ignored - kubernetes-sigs/controller-runtime#1464
		return m.k8sClient.Status().Update(ctx, application)
	})
}
