package device

import (
	"context"
	"net/http"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/certmanager"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/pagination"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/pkg/errors"
)

type DeviceRepository interface {
	Exists(ctx context.Context, id string) (bool, error)
	Create(ctx context.Context, item model.Device) error
	Get(ctx context.Context, id, tnt string) (*model.Device, error)
	GetByToken(ctx context.Context, token string) (*model.Device, error)
	ListByIDs(ctx context.Context, tenant string, ids []string) ([]*model.Device, error)
	ListAll(ctx context.Context, tenantID string) ([]*model.Device, error)
	ListPage(ctx context.Context, tenantID string, pageSize int, cursor string) ([]*model.Device, *pagination.Page, int, error)
	ListAllGlobal(ctx context.Context) ([]*model.Device, error)
	Update(ctx context.Context, model model.Device) error
	Delete(ctx context.Context, id, tenantID string) error
	CountByDataModelID(ctx context.Context, tenantID, dataModelID string) (int, error)
}

type EncryptionService interface {
	Encrypt(str string) (string, error)
	Compare(hash, rawStr string) (bool, error)
}

type UUIDService interface {
	Generate() string
}

type HostService interface {
	Create(ctx context.Context, deviceID string, hostInput model.HostInput) (*model.Host, error)
	GetByDeviceID(ctx context.Context, id string) (*model.Host, error)
	Update(ctx context.Context, id string, hostInput model.HostInput) error
}

// CertificateIssuer issues client certificates for devices.
type CertificateIssuer interface {
	IssueDeviceCertificate(deviceID, commonName string) (*certmanager.IssuedCertificate, error)
}

type service struct {
	deviceRepo  DeviceRepository
	uuidService UUIDService
	hostService HostService
	certIssuer  CertificateIssuer
}

func NewService(repo DeviceRepository, uuidService UUIDService, hostService HostService, certIssuer CertificateIssuer) *service {
	return &service{
		deviceRepo:  repo,
		uuidService: uuidService,
		hostService: hostService,
		certIssuer:  certIssuer,
	}
}

func (s *service) GetByID(ctx context.Context, id string) (*model.Device, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	logger.C(ctx).Debugf("Getting device by id %s for tenant %s", id, tnt)

	return s.deviceRepo.Get(ctx, id, tnt)
}

func (s *service) ListAll(ctx context.Context) ([]*model.Device, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	return s.deviceRepo.ListAll(ctx, tnt)
}

func (s *service) ListPage(ctx context.Context, pageSize int, cursor string) ([]*model.Device, *pagination.Page, int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, nil, 0, errors.Wrapf(err, "while loading tenant from context")
	}

	return s.deviceRepo.ListPage(ctx, tnt, pageSize, cursor)
}

func (s *service) ListAllGlobal(ctx context.Context) ([]*model.Device, error) {
	return s.deviceRepo.ListAllGlobal(ctx)
}

// ListByTags returns all devices for the current tenant that carry ALL of the
// given tags. An empty tag list returns all devices. Filtering is done in
// memory because tags are stored as a JSON array column.
func (s *service) ListByTags(ctx context.Context, tags []string) ([]*model.Device, error) {
	devices, err := s.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	if len(tags) == 0 {
		return devices, nil
	}

	filtered := make([]*model.Device, 0, len(devices))
	for _, d := range devices {
		if hasAllTags(d.Tags, tags) {
			filtered = append(filtered, d)
		}
	}
	return filtered, nil
}

// ListAllTags returns the distinct set of tags used across the current
// tenant's devices, in first-seen order.
func (s *service) ListAllTags(ctx context.Context) ([]string, error) {
	devices, err := s.ListAll(ctx)
	if err != nil {
		return nil, err
	}

	seen := make(map[string]struct{})
	tags := make([]string, 0)
	for _, d := range devices {
		for _, t := range d.Tags {
			if _, ok := seen[t]; ok {
				continue
			}
			seen[t] = struct{}{}
			tags = append(tags, t)
		}
	}
	return tags, nil
}

func hasAllTags(deviceTags, required []string) bool {
	set := make(map[string]struct{}, len(deviceTags))
	for _, t := range deviceTags {
		set[t] = struct{}{}
	}
	for _, r := range required {
		if _, ok := set[r]; !ok {
			return false
		}
	}
	return true
}

func (s *service) Create(ctx context.Context, device model.DeviceInput) (string, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return "", errors.Wrapf(err, "while loading tenant")
	}
	id := s.uuidService.Generate()
	deviceModel := device.ToDevice(id)
	deviceModel.TenantID = tnt

	if err := s.deviceRepo.Create(ctx, deviceModel); err != nil {
		return "", errors.Wrapf(err, "while creating device")
	}

	if err := s.createRelatedResources(ctx, id, device); err != nil {
		return "", err
	}

	return id, err
}

func (s *service) Update(ctx context.Context, id string, input model.UpdateDeviceInput) (*model.Device, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	device, err := s.deviceRepo.Get(ctx, id, tnt)
	if err != nil {
		return nil, errors.Wrapf(err, "while getting device %s", id)
	}

	input.ToModel(device)

	if err := s.deviceRepo.Update(ctx, *device); err != nil {
		return nil, errors.Wrapf(err, "while updating device %s", id)
	}

	// Handle host update if provided
	if input.Host != nil {
		existingHost, err := s.hostService.GetByDeviceID(ctx, id)
		if err != nil {
			// Host doesn't exist, create it
			if _, err := s.hostService.Create(ctx, id, *input.Host); err != nil {
				return nil, errors.Wrapf(err, "while creating host for device %s", id)
			}
		} else {
			// Host exists, update it
			if err := s.hostService.Update(ctx, existingHost.ID, *input.Host); err != nil {
				return nil, errors.Wrapf(err, "while updating host for device %s", id)
			}
		}
	}

	return s.deviceRepo.Get(ctx, id, tnt)
}

// Clone creates a copy of an existing device (including its host and auth
// configuration) under a new ID. Certificate material and communication tokens
// are intentionally NOT copied — the clone starts without issued credentials.
func (s *service) Clone(ctx context.Context, id string) (string, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return "", errors.Wrapf(err, "while loading tenant from context")
	}

	source, err := s.deviceRepo.Get(ctx, id, tnt)
	if err != nil {
		return "", errors.Wrapf(err, "while getting source device %s", id)
	}

	input := deviceInputFromModel(source)

	if source.Host != nil {
		input.Host = hostInputFromModel(source.Host)
	} else {
		host, err := s.hostService.GetByDeviceID(ctx, id)
		if err == nil && host != nil {
			input.Host = hostInputFromModel(host)
		}
	}

	return s.Create(ctx, input)
}

// deviceInputFromModel builds a DeviceInput from an existing device, appending
// a "(copy)" suffix to the name so the clone is distinguishable.
func deviceInputFromModel(d *model.Device) model.DeviceInput {
	name := d.Name + " (copy)"
	return model.DeviceInput{
		Name:        name,
		Description: d.Description,
		Status:      model.DeviceStatusInitial,
		Auth:        authInputFromModel(d.Auth),
		DataModel:   d.DataModelID,
		Tags:        append([]string(nil), d.Tags...),
	}
}

func hostInputFromModel(h *model.Host) *model.HostInput {
	if h == nil {
		return nil
	}
	return &model.HostInput{
		Url:             h.Url,
		TurnOnEndpoint:  h.TurnOnEndpoint,
		TurnOffEndpoint: h.TurnOffEndpoint,
	}
}

func authInputFromModel(a *model.Auth) *model.AuthInput {
	if a == nil {
		return nil
	}

	cred := &model.CredentialDataInput{}
	if a.CredentialForDevice.Basic != nil {
		cred.Basic = &model.BasicCredentialDataInput{
			Username: a.CredentialForDevice.Basic.Username,
			Password: a.CredentialForDevice.Basic.Password,
		}
	}
	if a.CredentialForDevice.Oauth != nil {
		cred.Oauth = &model.OAuthCredentialDataInput{
			ClientID:     a.CredentialForDevice.Oauth.ClientID,
			ClientSecret: a.CredentialForDevice.Oauth.ClientSecret,
			URL:          a.CredentialForDevice.Oauth.URL,
		}
	}
	if a.CredentialForDevice.CertificateOAuth != nil {
		cred.CertificateOAuth = &model.CertificateOAuthCredentialDataInput{
			ClientID:    a.CredentialForDevice.CertificateOAuth.ClientID,
			Certificate: a.CredentialForDevice.CertificateOAuth.Certificate,
			URL:         a.CredentialForDevice.CertificateOAuth.URL,
		}
	}
	if a.CredentialForDevice.BearerToken != nil {
		cred.Token = &model.TokenCredentialDataInput{
			Token: a.CredentialForDevice.BearerToken.Token,
		}
	}

	return &model.AuthInput{
		CredentialForDevice:  cred,
		CredentialForService: a.CredentialForService,
		AccessStrategy:       a.AccessStrategy,
	}
}

func (s *service) Exists(ctx context.Context, id string) (bool, error) {
	return s.deviceRepo.Exists(ctx, id)
}

func (s *service) Delete(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrapf(err, "while loading tenant from context")
	}

	_, err = s.deviceRepo.Get(ctx, id, tnt)
	if err != nil {
		return errors.Wrapf(err, "does not exist or tenant does not have access")
	}

	return s.deviceRepo.Delete(ctx, id, tnt)
}

func (s *service) CountByDataModelID(ctx context.Context, dataModelID string) (int, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return 0, errors.Wrapf(err, "while loading tenant from context")
	}

	return s.deviceRepo.CountByDataModelID(ctx, tnt, dataModelID)
}

func (s *service) SetCommunicationToken(ctx context.Context, id, token string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrapf(err, "while loading tenant from context")
	}

	device, err := s.deviceRepo.Get(ctx, id, tnt)
	if err != nil {
		return errors.Wrapf(err, "while getting device %s", id)
	}

	device.CommunicationToken = &token

	return s.deviceRepo.Update(ctx, *device)
}

func (s *service) GetByToken(ctx context.Context, token string) (*model.Device, error) {
	return s.deviceRepo.GetByToken(ctx, token)
}

// SendOperation sends a TURN_ON / TURN_OFF command to a device using its
// configured host endpoints and authentication. It is used both by the
// setDeviceOperation GraphQL mutation and by the rule engine when executing
// DEVICE_OPERATION actions. Returns an error if the device has no host, the
// requested endpoint is not configured, or the device responds with a non-2xx
// status.
func (s *service) SendOperation(ctx context.Context, deviceID string, op model.OperationType) error {
	device, err := s.GetByID(ctx, deviceID)
	if err != nil {
		return errors.Wrapf(err, "while getting device %s", deviceID)
	}

	host, err := s.hostService.GetByDeviceID(ctx, deviceID)
	if err != nil {
		return errors.Wrapf(err, "device %s has no host configured", deviceID)
	}

	var endpoint string
	switch op {
	case model.OperationTypeTurnOn:
		if host.TurnOnEndpoint == nil || *host.TurnOnEndpoint == "" {
			return errors.Errorf("device %s has no turn-on endpoint configured", deviceID)
		}
		endpoint = host.Url + *host.TurnOnEndpoint
	case model.OperationTypeTurnOff:
		if host.TurnOffEndpoint == nil || *host.TurnOffEndpoint == "" {
			return errors.Errorf("device %s has no turn-off endpoint configured", deviceID)
		}
		endpoint = host.Url + *host.TurnOffEndpoint
	default:
		return errors.Errorf("unsupported operation type: %s", op)
	}

	var httpClient *AuthenticatedHTTPClient
	if device.ClientCert != nil && device.ClientCertKey != nil && *device.ClientCert != "" {
		httpClient = NewAuthenticatedHTTPClientWithCert(*device.ClientCert, *device.ClientCertKey)
	} else {
		httpClient = NewAuthenticatedHTTPClient()
	}

	resp, err := httpClient.DoRequest(ctx, http.MethodPost, endpoint, nil, device.Auth)
	if err != nil {
		return errors.Wrapf(err, "while calling device %s endpoint", deviceID)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errors.Errorf("device %s returned error status: %d", deviceID, resp.StatusCode)
	}

	return nil
}

// GenerateDeviceCertificate issues (or rotates) an mTLS client certificate for
// the device and persists the certificate, private key, serial and expiry.
// The returned IssuedCertificate contains the private key, which is only
// available at issuance time.
func (s *service) GenerateDeviceCertificate(ctx context.Context, id string) (*certmanager.IssuedCertificate, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrapf(err, "while loading tenant from context")
	}

	if s.certIssuer == nil {
		return nil, errors.New("certificate issuer is not configured")
	}

	device, err := s.deviceRepo.Get(ctx, id, tnt)
	if err != nil {
		return nil, errors.Wrapf(err, "while getting device %s", id)
	}

	issued, err := s.certIssuer.IssueDeviceCertificate(device.ID, device.Name)
	if err != nil {
		return nil, errors.Wrapf(err, "while issuing certificate for device %s", id)
	}

	device.ClientCert = &issued.CertificatePEM
	device.ClientCertKey = &issued.PrivateKeyPEM
	device.ClientCertSerial = &issued.Serial
	expiresAt := issued.ExpiresAt
	device.ClientCertExpiresAt = &expiresAt

	if err := s.deviceRepo.Update(ctx, *device); err != nil {
		return nil, errors.Wrapf(err, "while persisting certificate for device %s", id)
	}

	return issued, nil
}

// RevokeDeviceCertificate clears the stored certificate material for a device.
func (s *service) RevokeDeviceCertificate(ctx context.Context, id string) error {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return errors.Wrapf(err, "while loading tenant from context")
	}

	device, err := s.deviceRepo.Get(ctx, id, tnt)
	if err != nil {
		return errors.Wrapf(err, "while getting device %s", id)
	}

	device.ClientCert = nil
	device.ClientCertKey = nil
	device.ClientCertSerial = nil
	device.ClientCertExpiresAt = nil

	return s.deviceRepo.Update(ctx, *device)
}

func (s *service) createRelatedResources(ctx context.Context, deviceID string, device model.DeviceInput) error {
	if device.Host != nil {
		if _, err := s.hostService.Create(ctx, deviceID, *device.Host); err != nil {
			return err
		}
	}

	return nil
}
