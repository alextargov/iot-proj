// Code generated by github.com/99designs/gqlgen, DO NOT EDIT.

package graphql

import (
	"fmt"
	"io"
	"strconv"
)

type CredentialData interface {
	IsCredentialData()
}

type Pageable interface {
	IsPageable()
}

type Auth struct {
	Credential     CredentialData `json:"credential"`
	AccessStrategy *string        `json:"accessStrategy"`
}

type AuthInput struct {
	Credential     *CredentialDataInput `json:"credential"`
	AccessStrategy *string              `json:"accessStrategy"`
}

type BasicCredentialData struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (BasicCredentialData) IsCredentialData() {}

type BasicCredentialDataInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type BearerTokenCredentialData struct {
	Token string `json:"token"`
}

func (BearerTokenCredentialData) IsCredentialData() {}

type CertificateOAuthCredentialData struct {
	ClientID    string `json:"clientId"`
	Certificate string `json:"certificate"`
	URL         string `json:"url"`
}

func (CertificateOAuthCredentialData) IsCredentialData() {}

type CertificateOAuthCredentialDataInput struct {
	ClientID    string `json:"clientId"`
	Certificate string `json:"certificate"`
	URL         string `json:"url"`
}

type CredentialDataInput struct {
	Basic            *BasicCredentialDataInput            `json:"basic"`
	Oauth            *OAuthCredentialDataInput            `json:"oauth"`
	CertificateOAuth *CertificateOAuthCredentialDataInput `json:"certificateOAuth"`
	BearerToken      *TokenCredentialDataInput            `json:"bearerToken"`
}

type DeviceInput struct {
	Name        string       `json:"name"`
	Description *string      `json:"description"`
	Status      DeviceStatus `json:"status"`
	Host        *HostInput   `json:"host"`
	Auth        *AuthInput   `json:"auth"`
}

type DevicePage struct {
	Data       []*Device `json:"data"`
	PageInfo   *PageInfo `json:"pageInfo"`
	TotalCount int       `json:"totalCount"`
}

func (DevicePage) IsPageable() {}

type Host struct {
	ID              string  `json:"id"`
	URL             string  `json:"url"`
	TurnOnEndpoint  *string `json:"turnOnEndpoint"`
	TurnOffEndpoint *string `json:"turnOffEndpoint"`
}

type HostInput struct {
	URL             string  `json:"url"`
	TurnOnEndpoint  *string `json:"turnOnEndpoint"`
	TurnOffEndpoint *string `json:"turnOffEndpoint"`
}

type OAuthCredentialData struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	URL          string `json:"url"`
}

func (OAuthCredentialData) IsCredentialData() {}

type OAuthCredentialDataInput struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	URL          string `json:"url"`
}

type PageInfo struct {
	StartCursor string `json:"startCursor"`
	EndCursor   string `json:"endCursor"`
	HasNextPage bool   `json:"hasNextPage"`
}

type TokenCredentialDataInput struct {
	Token string `json:"token"`
}

type AggregationType string

const (
	AggregationTypeSum      AggregationType = "SUM"
	AggregationTypeAverage  AggregationType = "AVERAGE"
	AggregationTypeLastWeek AggregationType = "LAST_WEEK"
)

var AllAggregationType = []AggregationType{
	AggregationTypeSum,
	AggregationTypeAverage,
	AggregationTypeLastWeek,
}

func (e AggregationType) IsValid() bool {
	switch e {
	case AggregationTypeSum, AggregationTypeAverage, AggregationTypeLastWeek:
		return true
	}
	return false
}

func (e AggregationType) String() string {
	return string(e)
}

func (e *AggregationType) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = AggregationType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid AggregationType", str)
	}
	return nil
}

func (e AggregationType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type DeviceStatus string

const (
	DeviceStatusInitial     DeviceStatus = "INITIAL"
	DeviceStatusACTIVE       DeviceStatus = "ACTIVE"
	DeviceStatusUnreachable DeviceStatus = "UNREACHABLE"
	DeviceStatusError       DeviceStatus = "ERROR"
)

var AllDeviceStatus = []DeviceStatus{
	DeviceStatusInitial,
	DeviceStatusACTIVE,
	DeviceStatusUnreachable,
	DeviceStatusError,
}

func (e DeviceStatus) IsValid() bool {
	switch e {
	case DeviceStatusInitial, DeviceStatusACTIVE, DeviceStatusUnreachable, DeviceStatusError:
		return true
	}
	return false
}

func (e DeviceStatus) String() string {
	return string(e)
}

func (e *DeviceStatus) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = DeviceStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid DeviceStatus", str)
	}
	return nil
}

func (e DeviceStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

type OperationType string

const (
	OperationTypeTurnOn               OperationType = "TURN_ON"
	OperationTypeTurnOff              OperationType = "TURN_OFF"
	OperationTypeSendEmail            OperationType = "SEND_EMAIL"
	OperationTypeSendEmailWithContent OperationType = "SEND_EMAIL_WITH_CONTENT"
)

var AllOperationType = []OperationType{
	OperationTypeTurnOn,
	OperationTypeTurnOff,
	OperationTypeSendEmail,
	OperationTypeSendEmailWithContent,
}

func (e OperationType) IsValid() bool {
	switch e {
	case OperationTypeTurnOn, OperationTypeTurnOff, OperationTypeSendEmail, OperationTypeSendEmailWithContent:
		return true
	}
	return false
}

func (e OperationType) String() string {
	return string(e)
}

func (e *OperationType) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	*e = OperationType(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid OperationType", str)
	}
	return nil
}

func (e OperationType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}
