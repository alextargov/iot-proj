package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/pkg/errors"
)

// Repository defines the data access the service needs.
type Repository interface {
	Create(ctx context.Context, m model.Integration) error
	List(ctx context.Context) ([]*model.Integration, error)
	Get(ctx context.Context, id string) (*model.Integration, error)
	Update(ctx context.Context, m model.Integration) error
	Delete(ctx context.Context, id string) error
}

// UUIDService generates UUIDs.
type UUIDService interface {
	Generate() string
}

type service struct {
	repo        Repository
	uuidService UUIDService
	httpClient  *http.Client
}

// NewService creates a new integration service.
func NewService(repo Repository, uuidService UUIDService) *service {
	return &service{
		repo:        repo,
		uuidService: uuidService,
		httpClient:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *service) Create(ctx context.Context, input model.CreateIntegrationInput) (*model.Integration, error) {
	tnt, err := tenant.LoadFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading tenant from context")
	}

	m := model.Integration{
		ID:        s.uuidService.Generate(),
		TenantID:  tnt,
		Name:      input.Name,
		Type:      input.Type,
		Endpoint:  input.Endpoint,
		AuthToken: input.AuthToken,
		Config:    input.Config,
		Enabled:   true,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		return nil, errors.Wrap(err, "while creating integration")
	}
	return s.repo.Get(ctx, m.ID)
}

func (s *service) List(ctx context.Context) ([]*model.Integration, error) {
	return s.repo.List(ctx)
}

func (s *service) Get(ctx context.Context, id string) (*model.Integration, error) {
	return s.repo.Get(ctx, id)
}

func (s *service) Update(ctx context.Context, id string, input model.UpdateIntegrationInput) (*model.Integration, error) {
	m, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, errors.Wrap(err, "while getting integration")
	}
	if input.Name != nil {
		m.Name = *input.Name
	}
	if input.Endpoint != nil {
		m.Endpoint = *input.Endpoint
	}
	if input.AuthToken != nil {
		m.AuthToken = input.AuthToken
	}
	if input.Config != nil {
		m.Config = input.Config
	}
	if input.Enabled != nil {
		m.Enabled = *input.Enabled
	}
	if err := s.repo.Update(ctx, *m); err != nil {
		return nil, errors.Wrap(err, "while updating integration")
	}
	return s.repo.Get(ctx, id)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// Test fires a sample POST to the integration endpoint and reports whether the
// external service accepted it (2xx). Used by the "Test" button in the UI.
func (s *service) Test(ctx context.Context, id string) (bool, error) {
	m, err := s.repo.Get(ctx, id)
	if err != nil {
		return false, errors.Wrap(err, "while getting integration")
	}
	payload := map[string]interface{}{
		"test":        true,
		"integration": m.Name,
		"triggeredAt": time.Now().Format(time.RFC3339),
	}
	return s.invoke(ctx, m, payload)
}

// Invoke sends a payload to the integration endpoint. Exposed for other domains
// (e.g. the rule engine) to trigger integrations as actions.
func (s *service) Invoke(ctx context.Context, id string, payload map[string]interface{}) (bool, error) {
	m, err := s.repo.Get(ctx, id)
	if err != nil {
		return false, errors.Wrap(err, "while getting integration")
	}
	if !m.Enabled {
		return false, errors.New("integration is disabled")
	}
	return s.invoke(ctx, m, payload)
}

func (s *service) invoke(ctx context.Context, m *model.Integration, payload map[string]interface{}) (bool, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return false, errors.Wrap(err, "while marshaling payload")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.Endpoint, bytes.NewReader(body))
	if err != nil {
		return false, errors.Wrap(err, "while building request")
	}
	req.Header.Set("Content-Type", "application/json")
	if m.AuthToken != nil && *m.AuthToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", *m.AuthToken))
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, errors.Wrap(err, "while calling integration endpoint")
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300, nil
}
