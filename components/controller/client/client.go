package client

import (
	"context"
	"github.com/alextargov/iot-proj/components/controller/api/v1alpha1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
)

type ApplicationsInterface interface {
	List(ctx context.Context, opts metav1.ListOptions) (*v1alpha1.ApplicationList, error)
	Get(ctx context.Context, name string, options metav1.GetOptions) (*v1alpha1.Application, error)
	Create(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error)
	Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error)
	Update(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error)
	Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error
}

type ApplicationsClient struct {
	restClient rest.Interface
	namespace  string
}

type ApplicationsClientInterface interface {
	Applications(string) ApplicationsInterface
}

func NewForConfig(cfg *rest.Config) (ApplicationsClientInterface, error) {
	if err := v1alpha1.AddToScheme(scheme.Scheme); err != nil {
		return nil, err
	}
	cfg.ContentConfig.GroupVersion = &schema.GroupVersion{Group: v1alpha1.GroupVersion.Group, Version: v1alpha1.GroupVersion.Version}
	cfg.APIPath = "/apis"
	cfg.NegotiatedSerializer = serializer.WithoutConversionCodecFactory{
		CodecFactory: scheme.Codecs,
	}
	cfg.UserAgent = rest.DefaultKubernetesUserAgent()
	c, err := rest.RESTClientFor(cfg)
	if err != nil {
		return nil, err
	}
	return &ApplicationsClient{
		restClient: c,
	}, nil
}

func (c *ApplicationsClient) Applications(namespace string) ApplicationsInterface {
	c.namespace = namespace
	return c
}

func (c *ApplicationsClient) List(ctx context.Context, opts metav1.ListOptions) (*v1alpha1.ApplicationList, error) {
	result := v1alpha1.ApplicationList{}
	err := c.restClient.Get().
		Namespace(c.namespace).
		Resource("applications").
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Into(&result)

	return &result, err
}

func (c *ApplicationsClient) Get(ctx context.Context, name string, opts metav1.GetOptions) (*v1alpha1.Application, error) {
	result := v1alpha1.Application{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource("applications").
		Name(name).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Into(&result)

	return &result, err
}

func (c *ApplicationsClient) Create(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error) {
	result := v1alpha1.Application{}
	err := c.restClient.
		Post().
		Namespace(c.namespace).
		Resource("applications").
		Body(operation).
		Do(ctx).
		Into(&result)

	return &result, err
}

func (c *ApplicationsClient) Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error {
	return c.restClient.
		Delete().
		Namespace(c.namespace).
		Resource("applications").
		Name(name).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Error()
}

func (c *ApplicationsClient) Update(ctx context.Context, operation *v1alpha1.Application) (*v1alpha1.Application, error) {
	err := c.restClient.
		Put().
		Namespace(c.namespace).
		Resource("applications").
		Name(operation.Name).
		Body(operation).
		Do(ctx).
		Into(operation)

	return operation, err
}

func (c *ApplicationsClient) Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error) {
	opts.Watch = true
	return c.restClient.
		Get().
		Namespace(c.namespace).
		Resource("applications").
		VersionedParams(&opts, scheme.ParameterCodec).
		Watch(ctx)
}
