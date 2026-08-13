package controllers

import (
	"context"
	"fmt"
	opv1alpha1 "github.com/alextargov/iot-proj/components/controller/api/v1alpha1"
	logger "github.com/alextargov/iot-proj/components/controller/internal/log"
	kubeerrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// ApplicationReconciler reconciles a Application object
type ApplicationReconciler struct {
	statusManager StatusManager
	k8sClient     KubernetesClient
	Scheme        *runtime.Scheme
	function      Function
}

type Function interface {
	DeleteFunctionResources(ctx context.Context, name, namespace string) error
}

func NewApplicationReconciler(statusManager StatusManager, k8sClient KubernetesClient, function Function) *ApplicationReconciler {
	return &ApplicationReconciler{
		statusManager: statusManager,
		k8sClient:     k8sClient,
		function:      function,
	}
}

//+kubebuilder:rbac:groups=controller,resources=applications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=controller,resources=applications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=controller,resources=applications/finalizers,verbs=update

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := ctrl.Log.WithValues("application", req.NamespacedName)
	ctx = logger.ContextWithLogger(ctx, log)

	application, err := r.k8sClient.Get(ctx, req.NamespacedName)
	if err != nil {
		return r.handleGetError(ctx, req.NamespacedName, err)
	}

	data := "Reconciles " + string(application.Status.Phase)
	logger.C(ctx).Info(data)

	finalizer := "application/delete-finalizer"

	if application.ObjectMeta.DeletionTimestamp == nil || application.ObjectMeta.DeletionTimestamp.IsZero() {
		if !controllerutil.ContainsFinalizer(application, finalizer) {
			logger.C(ctx).Info("Finalizer does not exists. Will try to add it.")
			controllerutil.AddFinalizer(application, finalizer)
			if err := r.k8sClient.Update(ctx, application); err != nil {
				return ctrl.Result{}, err
			}
		}

	} else {
		if controllerutil.ContainsFinalizer(application, finalizer) {
			logger.C(ctx).Info(fmt.Sprintf("Application \"%s\" is being deleted. Will remove finalizer and delete related resources.", application.Name))

			if err := r.function.DeleteFunctionResources(ctx, application.Name, application.Namespace); err != nil {
				return ctrl.Result{}, err
			}

			controllerutil.RemoveFinalizer(application, finalizer)
			if err := r.k8sClient.Update(ctx, application); err != nil {
				return ctrl.Result{}, err
			}
		}

		return ctrl.Result{}, nil
	}

	switch application.Status.Phase {
	case "":
		if err := r.statusManager.Initialize(ctx, application); err != nil {
			return r.handleInitializationError(ctx, err)
		}
	case opv1alpha1.StateInitial:
		if err := r.statusManager.ObtainCode(ctx, application); err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateInitial, application.Name)
		}
	case opv1alpha1.StateCodeObtained:
		if err := r.statusManager.BuildImage(ctx, application); err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateCodeObtained, application.Name)
		}
	case opv1alpha1.StateBuildStarted:
		// Non-blocking check - requeue if build not ready yet
		result, err := r.statusManager.CheckBuildReady(ctx, application)
		if err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateBuildStarted, application.Name)
		}
		if result != nil && result.Requeue {
			return ctrl.Result{RequeueAfter: result.RequeueAfter}, nil
		}
	case opv1alpha1.StateBuildReady:
		if err := r.statusManager.Deploy(ctx, application); err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateBuildReady, application.Name)
		}
	case opv1alpha1.StateDeploymentStarted:
		// Non-blocking check - requeue if deployment not ready yet
		result, err := r.statusManager.CheckDeployReady(ctx, application)
		if err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateDeploymentStarted, application.Name)
		}
		if result != nil && result.Requeue {
			return ctrl.Result{RequeueAfter: result.RequeueAfter}, nil
		}
	}

	return ctrl.Result{}, nil
}

func (r ApplicationReconciler) handleGetError(ctx context.Context, namespacedName types.NamespacedName, err error) (ctrl.Result, error) {
	logger.C(ctx).Error(err, fmt.Sprintf("Unable to retrieve %s resource from API server", namespacedName))
	if kubeerrors.IsNotFound(err) {
		logger.C(ctx).Error(err, fmt.Sprintf("%s resource was not found in API server", namespacedName))
		return ctrl.Result{}, nil
	}

	return ctrl.Result{}, err
}

func (r ApplicationReconciler) handleInitializationError(ctx context.Context, err error) (ctrl.Result, error) {
	logger.C(ctx).Error(err, "Failed to initialize operation status")
	return ctrl.Result{}, err
}

func (r ApplicationReconciler) handleError(ctx context.Context, err error, op opv1alpha1.State, appName string) (ctrl.Result, error) {
	msg := fmt.Sprintf("Failed to do operation %s for application %s", op, appName)
	logger.C(ctx).Error(err, msg)
	return ctrl.Result{}, err
}

// SetupWithManager sets up the controller with the Manager.
func (r *ApplicationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&opv1alpha1.Application{}).
		Complete(r)
}
