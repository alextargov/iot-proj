package status

import (
	"context"
	"fmt"
	"github.com/alextargov/iot-proj/components/controller/api/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/watch"
	ctrl "sigs.k8s.io/controller-runtime"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var log = ctrl.Log.WithName("manager")

type statusUpdaterFunc func(application *v1alpha1.Application)

type Function interface {
	DeployCodeConfigmap(context context.Context, name, namespace, contents string) error
	DeployImageBuilder(ctx context.Context, name, namespace string) error
	PushFunctionDeployment(ctx context.Context, replicas int, name, namespace string) error
	PushFunctionService(ctx context.Context, name, namespace string) error
	DeleteImageBuilder(ctx context.Context, name, namespace string) error
}

type PodManager interface {
	Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error)
}

type DeploymentManager interface {
	Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error)
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

// BuildImage sets the initial status of an Application CR.
func (m *manager) BuildImage(ctx context.Context, application *v1alpha1.Application) error {
	if err := application.Validate(); err != nil {
		return err
	}

	if err := m.function.DeployImageBuilder(ctx, application.Name, application.Namespace); err != nil {
		log.Error(err, "while deploying image builder")
		return err
	}

	logUpdateStatusWith(v1alpha1.StateBuildReady)
	return m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
		status := &application.Status
		status.Phase = v1alpha1.StateBuildReady
	})
}

// BuildError sets the initial status of an Application CR.
func (m *manager) BuildError(ctx context.Context, application *v1alpha1.Application) error {
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

func (m *manager) WatchBuildReady(ctx context.Context, application *v1alpha1.Application) error {
	for {
		select {
		case <-ctx.Done():
			log.Info("Context cancelled, stopping config map watcher...")

			return nil
		default:
		}

		log.Info("Starting watcher for configmap changes...")
		watcher, err := m.podMgr.Watch(ctx, metav1.ListOptions{
			FieldSelector: "metadata.name=" + application.Name + "-builder",
			Watch:         true,
		})
		if err != nil {
			log.Error(err, fmt.Sprintf("Could not initialize watcher. Sleep for %s and try again...", m.reconnectInterval.String()))
			time.Sleep(m.reconnectInterval)
			continue
		}
		log.Info("Waiting for image builder events...")

		m.processPodEvents(ctx, watcher.ResultChan(), application)

		// Cleanup any allocated resources
		watcher.Stop()
		time.Sleep(m.reconnectInterval)
	}
}

// Deploy sets the initial status of an Application CR.
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

func (m *manager) WatchDeployReady(ctx context.Context, application *v1alpha1.Application) error {
	for {
		select {
		case <-ctx.Done():
			log.Info("Context cancelled, stopping deployment watcher...")
			return nil
		default:
		}

		log.Info("Starting watcher for Deployment changes...")
		watcher, err := m.deploymentMgr.Watch(ctx, metav1.ListOptions{
			FieldSelector: "metadata.name=" + application.Name,
			Watch:         true,
		})
		if err != nil {
			log.Error(err, fmt.Sprintf("Could not initialize watcher. Sleep for %s and try again...", m.reconnectInterval.String()))
			time.Sleep(m.reconnectInterval)
			continue
		}
		log.Info("Waiting for Deployment events...")

		m.processDeploymentEvents(ctx, watcher.ResultChan(), application)

		watcher.Stop()
		time.Sleep(m.reconnectInterval)
	}
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

func (m *manager) processPodEvents(ctx context.Context, events <-chan watch.Event, application *v1alpha1.Application) {
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-events:
			if !ok {
				return
			}
			switch ev.Type {
			case watch.Added:
				fallthrough
			case watch.Modified:
				log.Info("Pod updated")
				pod, ok := ev.Object.(*v1.Pod)
				if !ok {
					log.Info("Unexpected error: object is not pod. Try again")
					continue
				}
				if pod.Status.Phase == v1.PodSucceeded {
					logUpdateStatusWith(v1alpha1.StateBuildReady)
					if err := m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
						status := &application.Status
						status.Phase = v1alpha1.StateBuildReady
					}); err != nil {
						log.Error(err, fmt.Sprintf("while updating status to \"%s\"", v1alpha1.StateBuildReady))
					}

					ctx.Done()
				}
			case watch.Error:
				log.Info("Error event is received, stop pod watcher and try again...")
				return
			}
		}
	}
}

func (m *manager) processDeploymentEvents(ctx context.Context, events <-chan watch.Event, application *v1alpha1.Application) {
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-events:
			if !ok {
				return
			}
			switch ev.Type {
			case watch.Added:
				fallthrough
			case watch.Modified:
				deployment, ok := ev.Object.(*appsv1.Deployment)
				if !ok {
					log.Info("Unexpected error: object is not Deployment. Try again")
					continue
				}
				if deployment.Status.AvailableReplicas >= int32(1) {
					logUpdateStatusWith(v1alpha1.StateDeploymentReady)
					if err := m.updateStatusFunc(ctx, application, func(application *v1alpha1.Application) {
						status := &application.Status
						status.Phase = v1alpha1.StateDeploymentReady
					}); err != nil {
						log.Error(err, fmt.Sprintf("while updating status to \"%s\"", v1alpha1.StateDeploymentReady))
					}

					ctx.Done()
				}
			case watch.Error:
				log.Info("Error event is received, stop Deployment watcher and try again...")
				return
			}
		}
	}
}

func logUpdateStatusWith(state v1alpha1.State) {
	log.Info(fmt.Sprintf("Updating status phase to \"%s\"", state))
}
