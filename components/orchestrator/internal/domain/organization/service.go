package organization

import (
	"context"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/tenant"
	"github.com/pkg/errors"
)

// Repository defines the data access the service needs.
type Repository interface {
	CreateOrg(ctx context.Context, org model.Organization) error
	ListForUser(ctx context.Context, userID string) ([]*model.Organization, error)
	GetOrg(ctx context.Context, id string) (*model.Organization, error)
	RenameOrg(ctx context.Context, id, name string) error
	DeleteOrg(ctx context.Context, id string) error
	AddMember(ctx context.Context, id, orgID, userID string, role model.Role) error
	UpdateMemberRole(ctx context.Context, orgID, userID string, role model.Role) error
	RemoveMember(ctx context.Context, orgID, userID string) error
}

// UUIDService generates UUIDs.
type UUIDService interface {
	Generate() string
}

type service struct {
	repo        Repository
	uuidService UUIDService
}

// NewService creates a new organization service.
func NewService(repo Repository, uuidService UUIDService) *service {
	return &service{repo: repo, uuidService: uuidService}
}

// currentUserID returns the authenticated user's ID (tenant == user id).
func currentUserID(ctx context.Context) (string, error) {
	return tenant.LoadFromContext(ctx)
}

func (s *service) Create(ctx context.Context, input model.CreateOrganizationInput) (*model.Organization, error) {
	userID, err := currentUserID(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading current user")
	}

	org := model.Organization{
		ID:          s.uuidService.Generate(),
		Name:        input.Name,
		OwnerUserID: userID,
	}
	if err := s.repo.CreateOrg(ctx, org); err != nil {
		return nil, errors.Wrap(err, "while creating organization")
	}

	// The owner is automatically an ADMIN member.
	if err := s.repo.AddMember(ctx, s.uuidService.Generate(), org.ID, userID, model.RoleAdmin); err != nil {
		return nil, errors.Wrap(err, "while adding owner as member")
	}

	return s.repo.GetOrg(ctx, org.ID)
}

func (s *service) List(ctx context.Context) ([]*model.Organization, error) {
	userID, err := currentUserID(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "while loading current user")
	}
	return s.repo.ListForUser(ctx, userID)
}

func (s *service) Get(ctx context.Context, id string) (*model.Organization, error) {
	return s.repo.GetOrg(ctx, id)
}

func (s *service) Rename(ctx context.Context, id, name string) (*model.Organization, error) {
	if err := s.repo.RenameOrg(ctx, id, name); err != nil {
		return nil, errors.Wrap(err, "while renaming organization")
	}
	return s.repo.GetOrg(ctx, id)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.DeleteOrg(ctx, id)
}

func (s *service) AddMember(ctx context.Context, input model.AddOrganizationMemberInput) (*model.Organization, error) {
	role := input.Role
	if !role.IsValid() {
		role = model.RoleViewer
	}
	if err := s.repo.AddMember(ctx, s.uuidService.Generate(), input.OrganizationID, input.UserID, role); err != nil {
		return nil, errors.Wrap(err, "while adding member")
	}
	return s.repo.GetOrg(ctx, input.OrganizationID)
}

func (s *service) UpdateMemberRole(ctx context.Context, orgID, userID string, role model.Role) (*model.Organization, error) {
	if !role.IsValid() {
		return nil, errors.Errorf("invalid role %q", role)
	}
	if err := s.repo.UpdateMemberRole(ctx, orgID, userID, role); err != nil {
		return nil, errors.Wrap(err, "while updating member role")
	}
	return s.repo.GetOrg(ctx, orgID)
}

func (s *service) RemoveMember(ctx context.Context, orgID, userID string) (*model.Organization, error) {
	if err := s.repo.RemoveMember(ctx, orgID, userID); err != nil {
		return nil, errors.Wrap(err, "while removing member")
	}
	return s.repo.GetOrg(ctx, orgID)
}
