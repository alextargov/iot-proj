package k8s

import (
	"context"
	"fmt"
	"github.com/alextargov/iot-proj/components/controller/api/v1alpha1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type K8SClient interface {
	Create(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error)
	Get(ctx context.Context, name string, options metav1.GetOptions) (*v1alpha1.Application, error)
	Update(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error)
}

type scheduler struct {
	client K8SClient
}

func NewScheduler(kcli K8SClient) *scheduler {
	return &scheduler{
		client: kcli,
	}
}

func (s *scheduler) Schedule(ctx context.Context, app *Application) (string, error) {
	operationName := fmt.Sprintf("%s", app.WidgetID)
	getApp, err := s.client.Get(ctx, operationName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			k8sOp := toK8SOperation(app)
			createdOperation, err := s.client.Create(ctx, k8sOp)
			if err != nil {
				return "", err
			}
			return string(createdOperation.UID), nil
		}
		return "", err
	}
	getApp = updateOperationSpec(app, getApp)
	updatedOperation, err := s.client.Update(ctx, getApp)
	if err != nil {
		if errors.IsConflict(err) {
			return "", fmt.Errorf("another Application is in progress for resource with ID %q", app.WidgetID)
		}
		return "", err
	}
	return string(updatedOperation.UID), err
}

func toK8SOperation(op *Application) *v1alpha1.Application {
	result := &v1alpha1.Application{
		ObjectMeta: metav1.ObjectMeta{
			Name: op.WidgetID,
		},
	}
	return updateOperationSpec(op, result)
}

func updateOperationSpec(app *Application, k8sApp *v1alpha1.Application) *v1alpha1.Application {
	k8sApp.Spec = v1alpha1.ApplicationSpec{
		ApplicationID: app.ApplicationID,
		WidgetID:      app.WidgetID,
		SourceCode:    app.SourceCode,
		NodeVersion:   app.NodeVersion,
		ReplicasCount: app.ReplicasCount,
	}
	return k8sApp
}
