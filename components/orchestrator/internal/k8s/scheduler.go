package k8s

import "github.com/kyma-incubator/compass/components/director/pkg/operation/k8s"

type scheduler struct {
	client k8s.K8SClient
}

func NewScheduler() *scheduler {
	return &scheduler{}
}

func (s *scheduler) name() {

}
