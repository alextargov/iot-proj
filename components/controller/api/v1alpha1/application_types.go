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

package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ApplicationSpec defines the desired state of Application
type ApplicationSpec struct {
	SourceCode    string `json:"source_code,omitempty"`
	NodeVersion   string `json:"node_version,omitempty"`
	ReplicasCount int    `json:"replicas_count,omitempty"`
}

// +kubebuilder:validation:Enum=Initial;Code Obtained;Build Ready;Image Ready;Deployment Ready;
type State string

const (
	StateInitial         State = "Initial"
	StateCodeObtained    State = "Code Obtained"
	StateBuildReady      State = "Build Ready"
	StateImageReady      State = "Image Ready"
	StateDeploymentReady State = "Deployment Ready"
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
