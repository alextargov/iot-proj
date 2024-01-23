package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ApplicationSpec defines the desired state of Application
type ApplicationSpec struct {
	ApplicationID string `json:"application_id,omitempty"`
	WidgetID      string `json:"widget_id,omitempty"`
	SourceCode    string `json:"source_code,omitempty"`
	NodeVersion   string `json:"node_version,omitempty"`
	ReplicasCount int    `json:"replicas_count,omitempty"`
}

// +kubebuilder:validation:Enum=Initial;Code Obtained;Build Ready;Image Ready;Deployment Ready;Deployment Started;
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

// Application is the Schema for the applications API
type Application struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ApplicationSpec   `json:"spec,omitempty"`
	Status ApplicationStatus `json:"status,omitempty"`
}

func (in Application) Validate() error {
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
