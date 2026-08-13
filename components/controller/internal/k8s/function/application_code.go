package function

import (
	"context"
	"fmt"
	opv1alpha1 "github.com/alextargov/iot-proj/components/controller/api/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	apiv1 "k8s.io/api/core/v1"
	kubeerrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type app struct {
	k8sClient client.Client
}

const BUILD_IMAGE = "gcr.io/kaniko-project/executor:latest"
const CONFIGMAP_DOCKERFILE = "dockerfile-config"
const CONFIGMAP_PACKAGE_JSON = "packagejson-config"
const SECRET_DOCKER_AUTH = "docker-secret"

var log = ctrl.Log.WithName("application_code")

func NewFunctionBuilder(k8sClient client.Client) *app {
	return &app{
		k8sClient: k8sClient,
	}
}

// newOwnerReference creates an owner reference to the Application CR for garbage collection
func newOwnerReference(app *opv1alpha1.Application) metav1.OwnerReference {
	return *metav1.NewControllerRef(app, opv1alpha1.GroupVersion.WithKind("Application"))
}

func (c *app) DeployCodeConfigmap(ctx context.Context, name, namespace, contents string) error {
	cmData := make(map[string]string, 0)
	cmData["server.js"] = contents

	newConfigMap := &apiv1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Data: cmData,
	}

	cmMeta := types.NamespacedName{
		Namespace: namespace,
		Name:      name,
	}

	if err := c.k8sClient.Get(ctx, cmMeta, &apiv1.ConfigMap{}); err != nil {
		log.Info(fmt.Sprintf("Creating configmap with name \"%s\"", name))
		return c.k8sClient.Create(ctx, newConfigMap)
	} else {
		log.Info(fmt.Sprintf("Updating configmap with name \"%s\"", name))
		return c.k8sClient.Update(ctx, newConfigMap)
	}
}

// DeployCodeConfigmapWithOwner creates or updates the code configmap with an owner reference
func (c *app) DeployCodeConfigmapWithOwner(ctx context.Context, application *opv1alpha1.Application, contents string) error {
	cmData := make(map[string]string, 0)
	cmData["server.js"] = contents

	newConfigMap := &apiv1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:            application.Name,
			Namespace:       application.Namespace,
			OwnerReferences: []metav1.OwnerReference{newOwnerReference(application)},
		},
		Data: cmData,
	}

	cmMeta := types.NamespacedName{
		Namespace: application.Namespace,
		Name:      application.Name,
	}

	if err := c.k8sClient.Get(ctx, cmMeta, &apiv1.ConfigMap{}); err != nil {
		log.Info(fmt.Sprintf("Creating configmap with name \"%s\"", application.Name))
		return c.k8sClient.Create(ctx, newConfigMap)
	} else {
		log.Info(fmt.Sprintf("Updating configmap with name \"%s\"", application.Name))
		return c.k8sClient.Update(ctx, newConfigMap)
	}
}

func (c *app) DeployImageBuilder(ctx context.Context, name, namespace string) error {
	podName := fmt.Sprintf("%s-builder", name)
	pod := &apiv1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      podName,
			Namespace: namespace,
		},
		Spec: apiv1.PodSpec{
			Containers: []apiv1.Container{
				{
					Name:  podName,
					Image: BUILD_IMAGE,
					Args: []string{
						"--dockerfile=/workspace/Dockerfile",
						"--context=dir://workspace",
						fmt.Sprintf("--destination=alextargov/iot-%s:latest", name),
					},
					VolumeMounts: []apiv1.VolumeMount{
						{
							Name:      "dockerfile-storage",
							MountPath: "/workspace/Dockerfile",
							SubPath:   "Dockerfile",
							ReadOnly:  true,
						},
						{
							Name:      "packagejson-storage",
							MountPath: "/workspace/package.json",
							SubPath:   "package.json",
							ReadOnly:  true,
						},
						{
							Name:      "docker-secret",
							MountPath: "/kaniko/.docker/config.json",
							SubPath:   "config.json",
							ReadOnly:  true,
						},
						{
							Name:      name,
							MountPath: "/workspace/server.js",
							SubPath:   "server.js",
							ReadOnly:  true,
						},
					},
					ImagePullPolicy: apiv1.PullIfNotPresent},
			},
			RestartPolicy: apiv1.RestartPolicyNever,
			Volumes: []apiv1.Volume{
				{
					Name: "dockerfile-storage",
					VolumeSource: apiv1.VolumeSource{
						ConfigMap: &apiv1.ConfigMapVolumeSource{
							LocalObjectReference: apiv1.LocalObjectReference{
								Name: CONFIGMAP_DOCKERFILE,
							},
						},
					},
				},
				{
					Name: "packagejson-storage",
					VolumeSource: apiv1.VolumeSource{
						ConfigMap: &apiv1.ConfigMapVolumeSource{
							LocalObjectReference: apiv1.LocalObjectReference{
								Name: CONFIGMAP_PACKAGE_JSON,
							},
						},
					},
				},
				{
					Name: "docker-secret",
					VolumeSource: apiv1.VolumeSource{
						Secret: &apiv1.SecretVolumeSource{
							SecretName: SECRET_DOCKER_AUTH,
						},
					},
				},
				{
					Name: name,
					VolumeSource: apiv1.VolumeSource{
						ConfigMap: &apiv1.ConfigMapVolumeSource{
							LocalObjectReference: apiv1.LocalObjectReference{
								Name: name,
							},
						},
					},
				},
			},
		},
		Status: apiv1.PodStatus{},
	}

	log.Info(fmt.Sprintf("Creating image builder with name \"%s\"", podName))
	return c.k8sClient.Create(ctx, pod)
}

// DeployImageBuilderWithOwner creates the image builder pod with an owner reference
func (c *app) DeployImageBuilderWithOwner(ctx context.Context, application *opv1alpha1.Application) error {
	podName := fmt.Sprintf("%s-builder", application.Name)
	pod := &apiv1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:            podName,
			Namespace:       application.Namespace,
			OwnerReferences: []metav1.OwnerReference{newOwnerReference(application)},
		},
		Spec: apiv1.PodSpec{
			Containers: []apiv1.Container{
				{
					Name:  podName,
					Image: BUILD_IMAGE,
					Args: []string{
						"--dockerfile=/workspace/Dockerfile",
						"--context=dir://workspace",
						fmt.Sprintf("--destination=alextargov/iot-%s:latest", application.Name),
					},
					VolumeMounts: []apiv1.VolumeMount{
						{
							Name:      "dockerfile-storage",
							MountPath: "/workspace/Dockerfile",
							SubPath:   "Dockerfile",
							ReadOnly:  true,
						},
						{
							Name:      "packagejson-storage",
							MountPath: "/workspace/package.json",
							SubPath:   "package.json",
							ReadOnly:  true,
						},
						{
							Name:      "docker-secret",
							MountPath: "/kaniko/.docker/config.json",
							SubPath:   "config.json",
							ReadOnly:  true,
						},
						{
							Name:      application.Name,
							MountPath: "/workspace/server.js",
							SubPath:   "server.js",
							ReadOnly:  true,
						},
					},
					ImagePullPolicy: apiv1.PullIfNotPresent},
			},
			RestartPolicy: apiv1.RestartPolicyNever,
			Volumes: []apiv1.Volume{
				{
					Name: "dockerfile-storage",
					VolumeSource: apiv1.VolumeSource{
						ConfigMap: &apiv1.ConfigMapVolumeSource{
							LocalObjectReference: apiv1.LocalObjectReference{
								Name: CONFIGMAP_DOCKERFILE,
							},
						},
					},
				},
				{
					Name: "packagejson-storage",
					VolumeSource: apiv1.VolumeSource{
						ConfigMap: &apiv1.ConfigMapVolumeSource{
							LocalObjectReference: apiv1.LocalObjectReference{
								Name: CONFIGMAP_PACKAGE_JSON,
							},
						},
					},
				},
				{
					Name: "docker-secret",
					VolumeSource: apiv1.VolumeSource{
						Secret: &apiv1.SecretVolumeSource{
							SecretName: SECRET_DOCKER_AUTH,
						},
					},
				},
				{
					Name: application.Name,
					VolumeSource: apiv1.VolumeSource{
						ConfigMap: &apiv1.ConfigMapVolumeSource{
							LocalObjectReference: apiv1.LocalObjectReference{
								Name: application.Name,
							},
						},
					},
				},
			},
		},
		Status: apiv1.PodStatus{},
	}

	log.Info(fmt.Sprintf("Creating image builder with name \"%s\"", podName))
	return c.k8sClient.Create(ctx, pod)
}

func (c *app) DeleteImageBuilder(ctx context.Context, name, namespace string) error {
	podName := fmt.Sprintf("%s-builder", name)
	pod := &apiv1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      podName,
			Namespace: namespace,
		},
	}

	log.Info(fmt.Sprintf("Delete image builder pod with name \"%s\"", podName))
	if err := c.k8sClient.Delete(ctx, pod); err != nil {
		if !kubeerrors.IsNotFound(err) {
			return err
		}

		log.Info("Image builder pod not found")
	}

	return nil
}

func (c *app) PushFunctionDeployment(ctx context.Context, replicas int, name, namespace string) error {
	replicaPtr := int32(replicas)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicaPtr,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": name,
				},
			},
			Template: apiv1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": name,
					},
				},
				Spec: apiv1.PodSpec{
					Containers: []apiv1.Container{
						{
							Name:  name,
							Image: fmt.Sprintf("alextargov/iot-%s:latest", name),
							Ports: []apiv1.ContainerPort{
								{
									Name:          "http",
									Protocol:      apiv1.ProtocolTCP,
									ContainerPort: 80,
								},
							},
						},
					},
				},
			},
		},
	}

	return c.k8sClient.Create(ctx, deployment)
}

// PushFunctionDeploymentWithOwner creates the deployment with an owner reference
func (c *app) PushFunctionDeploymentWithOwner(ctx context.Context, application *opv1alpha1.Application) error {
	replicaPtr := int32(application.Spec.ReplicasCount)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:            application.Name,
			Namespace:       application.Namespace,
			OwnerReferences: []metav1.OwnerReference{newOwnerReference(application)},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicaPtr,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": application.Name,
				},
			},
			Template: apiv1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": application.Name,
					},
				},
				Spec: apiv1.PodSpec{
					Containers: []apiv1.Container{
						{
							Name:  application.Name,
							Image: fmt.Sprintf("alextargov/iot-%s:latest", application.Name),
							Ports: []apiv1.ContainerPort{
								{
									Name:          "http",
									Protocol:      apiv1.ProtocolTCP,
									ContainerPort: 3000,
								},
							},
						},
					},
				},
			},
		},
	}

	return c.k8sClient.Create(ctx, deployment)
}

func (c *app) PushFunctionService(ctx context.Context, name, namespace string) error {
	svc := &apiv1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Spec: apiv1.ServiceSpec{
			Selector: map[string]string{
				"app": name,
			},
			Ports: []apiv1.ServicePort{{
				Name:     "http",
				Protocol: apiv1.ProtocolTCP,
				Port:     int32(3000),
				TargetPort: intstr.IntOrString{
					Type:   intstr.Int,
					IntVal: int32(3000),
				},
			}},
		},
	}

	return c.k8sClient.Create(ctx, svc)
}

// PushFunctionServiceWithOwner creates the service with an owner reference
func (c *app) PushFunctionServiceWithOwner(ctx context.Context, application *opv1alpha1.Application) error {
	svc := &apiv1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:            application.Name,
			Namespace:       application.Namespace,
			OwnerReferences: []metav1.OwnerReference{newOwnerReference(application)},
		},
		Spec: apiv1.ServiceSpec{
			Selector: map[string]string{
				"app": application.Name,
			},
			Ports: []apiv1.ServicePort{{
				Name:     "http",
				Protocol: apiv1.ProtocolTCP,
				Port:     int32(3000),
				TargetPort: intstr.IntOrString{
					Type:   intstr.Int,
					IntVal: int32(3000),
				},
			}},
		},
	}

	return c.k8sClient.Create(ctx, svc)
}

func (c *app) DeleteFunctionResources(ctx context.Context, name, namespace string) error {
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
	}

	svc := &apiv1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
	}

	if err := c.k8sClient.Delete(ctx, deployment); err != nil {
		if !kubeerrors.IsNotFound(err) {
			return err
		}

		log.Error(err, fmt.Sprintf("%s deployment resource was not found on API server", name))
	}

	if err := c.k8sClient.Delete(ctx, svc); err != nil {
		if !kubeerrors.IsNotFound(err) {
			return err
		}

		log.Error(err, fmt.Sprintf("%s svc resource was not found on API server", name))
	}

	return nil

}
