package k8s

import (
	"context"
	"path/filepath"
	"time"

	"github.com/pkg/errors"
	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	restclient "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	ctrl "sigs.k8s.io/controller-runtime"
)

var log = ctrl.Log.WithName("k8s-client")

// Config missing godoc
type Config struct {
	PollInterval time.Duration `envconfig:"default=2s,APP_KUBERNETES_POLL_INTERVAL"`
	PollTimeout  time.Duration `envconfig:"default=1m,APP_KUBERNETES_POLL_TIMEOUT"`
	Timeout      time.Duration `envconfig:"default=2m,APP_KUBERNETES_TIMEOUT"`
}

// NewKubernetesClientSet missing godoc
func NewKubernetesClientSet(ctx context.Context, interval, pollingTimeout, timeout time.Duration) (*kubernetes.Clientset, error) {
	kubeConfig, err := restclient.InClusterConfig()
	if err != nil {
		log.Error(err, "An error has occurred while trying to read in cluster Config")
		log.Info("Trying to initialize Kubernetes Client with local Config")
		home := homedir.HomeDir()
		kubeConfPath := filepath.Join(home, ".kube", "Config")
		kubeConfig, err = clientcmd.BuildConfigFromFlags("", kubeConfPath)
		if err != nil {
			return nil, errors.Errorf("failed to read k8s in-cluster configuration, %s", err.Error())
		}
	}

	kubeConfig.Timeout = timeout

	kubeClientSet, err := kubernetes.NewForConfig(kubeConfig)
	if err != nil {
		return nil, errors.Errorf("failed to create k8s core client, %s", err.Error())
	}

	err = wait.PollImmediate(interval, pollingTimeout, func() (bool, error) {
		_, err := kubeClientSet.ServerVersion()
		if err != nil {
			log.Error(err, "An error has occurred while trying to access API Server")
			return false, nil
		}
		return true, nil
	})
	if err != nil {
		return nil, err
	}

	log.Info("Successfully initialized kubernetes client")
	return kubeClientSet, nil
}

// PodManager wraps the Kubernetes Pods interface to provide a Get method
type PodManager struct {
	clientset *kubernetes.Clientset
	namespace string
}

// NewPodManager creates a new PodManager for the given namespace
func NewPodManager(clientset *kubernetes.Clientset, namespace string) *PodManager {
	return &PodManager{clientset: clientset, namespace: namespace}
}

// Get retrieves a pod by name and namespace
func (p *PodManager) Get(ctx context.Context, name, namespace string) (*v1.Pod, error) {
	ns := namespace
	if ns == "" {
		ns = p.namespace
	}
	return p.clientset.CoreV1().Pods(ns).Get(ctx, name, metav1.GetOptions{})
}

// DeploymentManager wraps the Kubernetes Deployments interface to provide a Get method
type DeploymentManager struct {
	clientset *kubernetes.Clientset
	namespace string
}

// NewDeploymentManager creates a new DeploymentManager for the given namespace
func NewDeploymentManager(clientset *kubernetes.Clientset, namespace string) *DeploymentManager {
	return &DeploymentManager{clientset: clientset, namespace: namespace}
}

// Get retrieves a deployment by name and namespace
func (d *DeploymentManager) Get(ctx context.Context, name, namespace string) (*appsv1.Deployment, error) {
	ns := namespace
	if ns == "" {
		ns = d.namespace
	}
	return d.clientset.AppsV1().Deployments(ns).Get(ctx, name, metav1.GetOptions{})
}
