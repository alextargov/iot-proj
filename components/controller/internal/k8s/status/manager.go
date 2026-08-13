package status

import (
	"context"
	"fmt"
	"github.com/alextargov/iot-proj/components/controller/api/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var log = ctrl.Log.WithName("manager")

// RequeueResult is returned when the reconciler should requeue after a delay
type RequeueResult struct {
	Requeue      bool
	RequeueAfter time.Duration
}

type statusUpdaterFunc func(application *v1alpha1.Application)

type Function interface {
	DeployCodeConfigmap(context context.Context, name, namespace, contents string) error
	DeployImageBuilder(ctx context.Context, name, namespace string) error
	PushFunctionDeployment(ctx context.Context, replicas int, name, namespace string) error
	PushFunctionService(ctx context.Context, name, namespace string) error
	DeleteImageBuilder(ctx context.Context, name, namespace string) error
}

type PodManager interface {
	Get(ctx context.Context, name, namespace string) (*v1.Pod, error)
}

type DeploymentManager interface {
	Get(ctx context.Context, name, namespace string) (*appsv1.Deployment, error)
}

// manager implements the StatusManager interface
type manager struct {
	mgrClient         client.Client
	function          Function
	podMgr            PodManager
	deploymentMgr     DeploymentManager
	reconnectInterval time.Duration
}

// NewManager constructs a manager instance
func NewManager(mgrClient client.Client, appCode Function, podMgr PodManager, deploymentMgr DeploymentManager, reconnectInterval time.Duration) *manager {
	return &manager{
		mgrClient:         mgrClient,
		function:          appCode,
		podMgr:            podMgr,
		deploymentMgr:     deploymentMgr,
		reconnectInterval: reconnectInterval,
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

	logUpdateStatusWith(v1alpha1.StateInitial)
	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.ObservedGeneration = &application.Generation
		status.Phase = v1alpha1.StateInitial
		status.InitializedAt = metav1.Now()
	})
}

// BuildImage deploys the image builder and updates status to StateBuildStarted.
func (m *manager) BuildImage(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	if err := m.function.DeployImageBuilder(ctx, application.Name, application.Namespace); err != nil {
		log.Error(err, "while deploying image builder")
		return err
	}

	logUpdateStatusWith(v1alpha1.StateBuildStarted)
	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateBuildStarted
	})
}

// BuildError sets the error status for a build failure.
func (m *manager) BuildError(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Error = v1alpha1.ErrorState{
			Type:    v1alpha1.BuildErrorType,
			Message: "build error",
		}
	})
}

// ObtainCode creates the code configmap and updates status to StateCodeObtained.
func (m *manager) ObtainCode(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	code := application.Spec.SourceCode

	if err := m.function.DeployCodeConfigmap(ctx, application.Name, application.Namespace, code); err != nil {
		return err
	}

	logUpdateStatusWith(v1alpha1.StateCodeObtained)
	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateCodeObtained
	})
}

// CheckBuildReady checks if the builder pod has completed. Returns a RequeueResult indicating
// whether the reconciler should requeue (build still in progress) or proceed (build complete).
// This replaces the blocking WatchBuildReady method with a non-blocking check pattern.
func (m *manager) CheckBuildReady(ctx context.Context, application *v1alpha1.Application) (*RequeueResult, error) {
	builderName := application.Name + "-builder"

	pod, err := m.podMgr.Get(ctx, builderName, application.Namespace)
	if err != nil {
		log.Error(err, fmt.Sprintf("Could not get builder pod %s", builderName))
		// Requeue to check again later
		return &RequeueResult{Requeue: true, RequeueAfter: m.reconnectInterval}, nil
	}

	log.Info(fmt.Sprintf("Builder pod %s phase: %s", builderName, pod.Status.Phase))

	switch pod.Status.Phase {
	case v1.PodSucceeded:
		// Build completed successfully, update status
		logUpdateStatusWith(v1alpha1.StateBuildReady)
		if err := m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
			status := &application.Status
			status.Phase = v1alpha1.StateBuildReady
		}); err != nil {
			return nil, err
		}
		// No requeue needed, status change will trigger next reconcile
		return &RequeueResult{Requeue: false}, nil

	case v1.PodFailed:
		// Build failed
		log.Info(fmt.Sprintf("Builder pod %s failed", builderName))
		if err := m.BuildError(ctx, application); err != nil {
			return nil, err
		}
		return &RequeueResult{Requeue: false}, nil

	default:
		// Build still in progress (Pending, Running, Unknown)
		log.Info(fmt.Sprintf("Builder pod %s still running, will requeue", builderName))
		return &RequeueResult{Requeue: true, RequeueAfter: m.reconnectInterval}, nil
	}
}

// Deploy creates the deployment and service, then updates status to StateDeploymentStarted.
func (m *manager) Deploy(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	log.Info("Deleting image builder")
	if err := m.function.DeleteImageBuilder(ctx, application.Name, application.Namespace); err != nil {
		log.Error(err, fmt.Sprintf("while deleting image builder pod with name \"%s\"", application.Name))
		return err
	}

	log.Info("Creating Function Deployment")
	if err := m.function.PushFunctionDeployment(ctx, application.Spec.ReplicasCount, application.Name, application.Namespace); err != nil {
		log.Error(err, fmt.Sprintf("while pushing deployment to cluster with name \"%s\"", application.Name))
		return err
	}

	log.Info("Creating Function Service")
	if err := m.function.PushFunctionService(ctx, application.Name, application.Namespace); err != nil {
		log.Error(err, fmt.Sprintf("while pushing service to cluster with name \"%s\"", application.Name))
		return err
	}

	logUpdateStatusWith(v1alpha1.StateDeploymentStarted)
	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateDeploymentStarted
	})
}

// DeploymentError sets the error status for a deployment failure.
func (m *manager) DeploymentError(ctx context.Context, application *v1alpha1.Application, errMsg string) error {
	if err := application.Validate(); err != nil {
		return err
	}

	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Error = v1alpha1.ErrorState{
			Type:    v1alpha1.DeploymentErrorType,
			Message: errMsg,
		}
	})
}

// CheckDeployReady checks if the deployment is ready. Returns a RequeueResult indicating
// whether the reconciler should requeue (deployment not ready) or proceed (deployment ready).
// This replaces the blocking WatchDeployReady method with a non-blocking check pattern.
func (m *manager) CheckDeployReady(ctx context.Context, application *v1alpha1.Application) (*RequeueResult, error) {
	deployment, err := m.deploymentMgr.Get(ctx, application.Name, application.Namespace)
	if err != nil {
		log.Error(err, fmt.Sprintf("Could not get deployment %s", application.Name))
		// Requeue to check again later
		return &RequeueResult{Requeue: true, RequeueAfter: m.reconnectInterval}, nil
	}

	log.Info(fmt.Sprintf("Deployment %s: available replicas %d", application.Name, deployment.Status.AvailableReplicas))

	if deployment.Status.AvailableReplicas >= int32(1) {
		// Deployment is ready
		logUpdateStatusWith(v1alpha1.StateDeploymentReady)
		if err := m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
			status := &application.Status
			status.Phase = v1alpha1.StateDeploymentReady
		}); err != nil {
			return nil, err
		}
		// No requeue needed, we're done
		return &RequeueResult{Requeue: false}, nil
	}

	// Deployment not ready yet
	log.Info(fmt.Sprintf("Deployment %s not ready yet, will requeue", application.Name))
	return &RequeueResult{Requeue: true, RequeueAfter: m.reconnectInterval}, nil
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
		return m.mgrClient.Status().Update(ctx, application)
	})
}

func logUpdateStatusWith(state v1alpha1.State) {
	log.Info(fmt.Sprintf("Updating status phase to \"%s\"", state))
}
