package k8s

import (
	"context"
	"fmt"
	"github.com/iot-proj/components/controller/api/v1alpha1"
	"github.com/kyma-incubator/compass/components/director/pkg/operation"
	"github.com/kyma-incubator/compass/components/director/pkg/operation/k8s"
	"github.com/kyma-incubator/compass/components/director/pkg/str"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type K8SClient interface {
	Create(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error)
	Get(ctx context.Context, name string, options metav1.GetOptions) (*v1alpha1.Application, error)
	Update(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error)
}

type scheduler struct {
	client k8s.K8SClient
}

func NewScheduler() *scheduler {
	return &scheduler{}
}

func (s *scheduler) name() {

}

func (s *Scheduler) Schedule(ctx context.Context, op *operation.Operation) (string, error) {
	operationName := fmt.Sprintf("%s-%s", op.ResourceType, op.ResourceID)
	getOp, err := s.kcli.Get(ctx, operationName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			k8sOp := toK8SOperation(op)
			createdOperation, err := s.kcli.Create(ctx, k8sOp)
			if err != nil {
				return "", err
			}
			return string(createdOperation.UID), nil
		}
		return "", err
	}
	if isOpInProgress(getOp) {
		return "", fmt.Errorf("another operation is in progress for resource with ID %q", op.ResourceID)
	}
	getOp = updateOperationSpec(op, getOp)
	updatedOperation, err := s.kcli.Update(ctx, getOp)
	if err != nil {
		if errors.IsConflict(err) {
			return "", fmt.Errorf("another operation is in progress for resource with ID %q", op.ResourceID)
		}
		return "", err
	}
	return string(updatedOperation.UID), err
}

func isOpInProgress(op *v1alpha1.Application) bool {
	for _, cond := range op.Status.Conditions {
		if cond.Status == v1.ConditionTrue {
			return false
		}
	}
	return true
}

func toK8SOperation(op *operation.Operation) *v1alpha1.Application {
	operationName := fmt.Sprintf("%s-%s", op.ResourceType, op.ResourceID)
	result := &v1alpha1.Application{
		ObjectMeta: metav1.ObjectMeta{
			Name: operationName,
		},
	}
	return updateOperationSpec(op, result)
}

func updateOperationSpec(op *operation.Operation, k8sOp *v1alpha1.Application) *v1alpha1.Application {
	k8sOp.Spec = v1alpha1.ApplicationSpec{
		OperationCategory: op.OperationCategory,
		OperationType:     v1alpha1.ApplicationType(str.Title(string(op.OperationType))),
		ResourceType:      string(op.ResourceType),
		ResourceID:        op.ResourceID,
		CorrelationID:     op.CorrelationID,
		WebhookIDs:        op.WebhookIDs,
		RequestObject:     op.RequestObject,
	}
	return k8sOp
}
