/*
Copyright 2022.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"fmt"
	"github.com/iot-proj/components/controller/internal/log"
	"k8s.io/apimachinery/pkg/types"

	opv1alpha1 "github.com/iot-proj/components/controller/api/v1alpha1"
	kubeerrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
)

// ApplicationReconciler reconciles a Application object
type ApplicationReconciler struct {
	statusManager StatusManager
	k8sClient     KubernetesClient
	Scheme        *runtime.Scheme
}

func NewApplicationReconciler(statusManager StatusManager, k8sClient KubernetesClient) *ApplicationReconciler {
	return &ApplicationReconciler{
		statusManager: statusManager,
		k8sClient:     k8sClient,
	}
}

//+kubebuilder:rbac:groups=controller,resources=applications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=controller,resources=applications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=controller,resources=applications/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Application object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := ctrl.Log.WithValues("application", req.NamespacedName)
	ctx = log.ContextWithLogger(ctx, logger)

	application, err := r.k8sClient.Get(ctx, req.NamespacedName)
	if err != nil {
		return r.handleGetError(ctx, req.NamespacedName, err)
	}

	data := "Reconciles " + string(application.Status.Phase)
	log.C(ctx).Info(data)

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
			return r.handleError(ctx, err, opv1alpha1.StateInitial, application.Name)
		}
	case opv1alpha1.StateBuildStarted:
		if err := r.statusManager.WatchBuildReady(ctx, application); err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateInitial, application.Name)
		}
	case opv1alpha1.StateBuildReady:
		if err := r.statusManager.Deploy(ctx, application); err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateInitial, application.Name)
		}
	case opv1alpha1.StateDeploymentStarted:
		if err := r.statusManager.WatchDeployReady(ctx, application); err != nil {
			return r.handleError(ctx, err, opv1alpha1.StateInitial, application.Name)
		}
	}

	return ctrl.Result{}, nil
}

func (r ApplicationReconciler) handleGetError(ctx context.Context, namespacedName types.NamespacedName, err error) (ctrl.Result, error) {
	log.C(ctx).Error(err, fmt.Sprintf("Unable to retrieve %s resource from API server", namespacedName))
	if kubeerrors.IsNotFound(err) {
		log.C(ctx).Error(err, fmt.Sprintf("%s resource was not found in API server", namespacedName))
		return ctrl.Result{}, nil
	}

	return ctrl.Result{}, err
}

func (r ApplicationReconciler) handleInitializationError(ctx context.Context, err error) (ctrl.Result, error) {
	log.C(ctx).Error(err, "Failed to initialize operation status")
	return ctrl.Result{}, err
}

func (r ApplicationReconciler) handleError(ctx context.Context, err error, op opv1alpha1.State, appName string) (ctrl.Result, error) {
	msg := fmt.Sprintf("Failed to do operation %s for application %s", op, appName)
	log.C(ctx).Error(err, msg)
	return ctrl.Result{}, err
}

// SetupWithManager sets up the controller with the Manager.
func (r *ApplicationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&opv1alpha1.Application{}).
		Complete(r)
}
