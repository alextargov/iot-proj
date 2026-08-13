package v1alpha1

import (
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ApplicationSpec defines the desired state of Application
type ApplicationSpec struct {
	// ApplicationID is the unique identifier for the application
	ApplicationID string `json:"application_id,omitempty"`

	// WidgetID is the ID of the widget that owns this application
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	WidgetID string `json:"widget_id"`

	// SourceCode contains the JavaScript code to run
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	SourceCode string `json:"source_code"`

	// Workspace is the working directory for the application
	Workspace string `json:"workspace,omitempty"`

	// NodeVersion specifies the Node.js version to use
	// +kubebuilder:default="18"
	NodeVersion string `json:"node_version,omitempty"`

	// ReplicasCount is the number of replicas for the deployment
	// +kubebuilder:default=1
	// +kubebuilder:validation:Minimum=0
	// +kubebuilder:validation:Maximum=10
	ReplicasCount int `json:"replicas_count,omitempty"`
}

// +kubebuilder:validation:Enum=Initial;Code Obtained;Build Started;Build Ready;Deployment Ready;Deployment Started
type State string

const (
	StateInitial           State = "Initial"
	StateCodeObtained      State = "Code Obtained"
	StateBuildStarted      State = "Build Started"
	StateBuildReady        State = "Build Ready"
	StateDeploymentReady   State = "Deployment Ready"
	StateDeploymentStarted State = "Deployment Started"
)

// +kubebuilder:validation:Enum=Build Error;Deployment Error
type ErrorType string

const (
	BuildErrorType      ErrorType = "Build Error"
	DeploymentErrorType ErrorType = "Deployment Error"
)

type ErrorState struct {
	Type    ErrorType `json:"type,omitempty"`
	Message string    `json:"message,omitempty"`
}

// ApplicationStatus defines the observed state of Application
type ApplicationStatus struct {
	Phase              State       `json:"phase,omitempty"`
	Error              ErrorState  `json:"error,omitempty"`
	InitializedAt      metav1.Time `json:"initialized_at,omitempty"`
	ObservedGeneration *int64      `json:"observed_generation,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
//+kubebuilder:printcolumn:name="Widget",type=string,JSONPath=`.spec.widget_id`
//+kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas_count`
//+kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

// Application is the Schema for the applications API
type Application struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ApplicationSpec   `json:"spec,omitempty"`
	Status ApplicationStatus `json:"status,omitempty"`
}

// Validate performs validation on the Application spec
func (in Application) Validate() error {
	var errs []string

	if in.Spec.WidgetID == "" {
		errs = append(errs, "widget_id is required")
	}
	if in.Spec.SourceCode == "" {
		errs = append(errs, "source_code is required")
	}
	if in.Spec.ReplicasCount < 0 {
		errs = append(errs, "replicas_count must be >= 0")
	}
	if in.Spec.ReplicasCount > 10 {
		errs = append(errs, "replicas_count must be <= 10")
	}

	if len(errs) > 0 {
		return fmt.Errorf("validation failed: %s", strings.Join(errs, "; "))
	}
	return nil
}

//+kubebuilder:object:root=true

// ApplicationList contains a list of Application
type ApplicationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Application `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Application{}, &ApplicationList{})
}
