package organization

import (
	"context"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
)

// EntityConverter defines the entity conversions the repository needs.
type EntityConverter interface {
	OrgFromEntity(entity *OrgEntity) *model.Organization
	MembersFromEntities(entities MemberEntityCollection) []model.OrganizationMember
}

type repository struct {
	conv EntityConverter
}

// NewRepository creates a new organization repository.
func NewRepository(conv EntityConverter) *repository {
	return &repository{conv: conv}
}

// CreateOrg inserts an organization.
func (r *repository) CreateOrg(ctx context.Context, org model.Organization) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}
	stmt := `INSERT INTO public.organizations (id, name, owner_user_id, created_at) VALUES ($1, $2, $3, $4)`
	_, err = persist.ExecContext(ctx, stmt, org.ID, org.Name, org.OwnerUserID, time.Now())
	return err
}

// ListForUser returns organizations the user owns or is a member of.
func (r *repository) ListForUser(ctx context.Context, userID string) ([]*model.Organization, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}
	stmt := `SELECT DISTINCT o.id, o.name, o.owner_user_id, o.created_at, o.updated_at
	         FROM public.organizations o
	         LEFT JOIN public.organization_members m ON m.organization_id = o.id
	         WHERE o.owner_user_id = $1 OR m.user_id = $1
	         ORDER BY o.created_at DESC`
	var entities OrgEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, userID); err != nil {
		return nil, err
	}

	orgs := make([]*model.Organization, 0, len(entities))
	for i := range entities {
		org := r.conv.OrgFromEntity(&entities[i])
		members, err := r.listMembers(ctx, org.ID)
		if err != nil {
			return nil, err
		}
		org.Members = members
		orgs = append(orgs, org)
	}
	return orgs, nil
}

// GetOrg returns a single organization with its members.
func (r *repository) GetOrg(ctx context.Context, id string) (*model.Organization, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}
	stmt := `SELECT id, name, owner_user_id, created_at, updated_at FROM public.organizations WHERE id = $1`
	var entity OrgEntity
	if err := persist.GetContext(ctx, &entity, stmt, id); err != nil {
		return nil, err
	}
	org := r.conv.OrgFromEntity(&entity)
	members, err := r.listMembers(ctx, id)
	if err != nil {
		return nil, err
	}
	org.Members = members
	return org, nil
}

// RenameOrg updates an organization's name.
func (r *repository) RenameOrg(ctx context.Context, id, name string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}
	stmt := `UPDATE public.organizations SET name = $1, updated_at = $2 WHERE id = $3`
	_, err = persist.ExecContext(ctx, stmt, name, time.Now(), id)
	return err
}

// DeleteOrg deletes an organization (members cascade).
func (r *repository) DeleteOrg(ctx context.Context, id string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}
	_, err = persist.ExecContext(ctx, `DELETE FROM public.organizations WHERE id = $1`, id)
	return err
}

// AddMember inserts a membership row.
func (r *repository) AddMember(ctx context.Context, id, orgID, userID string, role model.Role) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}
	stmt := `INSERT INTO public.organization_members (id, organization_id, user_id, role, created_at)
	         VALUES ($1, $2, $3, $4, $5)
	         ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role`
	_, err = persist.ExecContext(ctx, stmt, id, orgID, userID, string(role), time.Now())
	return err
}

// UpdateMemberRole changes a member's role.
func (r *repository) UpdateMemberRole(ctx context.Context, orgID, userID string, role model.Role) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}
	stmt := `UPDATE public.organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3`
	_, err = persist.ExecContext(ctx, stmt, string(role), orgID, userID)
	return err
}

// RemoveMember deletes a membership row.
func (r *repository) RemoveMember(ctx context.Context, orgID, userID string) error {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return err
	}
	stmt := `DELETE FROM public.organization_members WHERE organization_id = $1 AND user_id = $2`
	_, err = persist.ExecContext(ctx, stmt, orgID, userID)
	return err
}

func (r *repository) listMembers(ctx context.Context, orgID string) ([]model.OrganizationMember, error) {
	persist, err := persistence.FromCtx(ctx)
	if err != nil {
		return nil, err
	}
	stmt := `SELECT m.id, m.organization_id, m.user_id, u.username, m.role, m.created_at
	         FROM public.organization_members m
	         JOIN public.users u ON u.id = m.user_id
	         WHERE m.organization_id = $1
	         ORDER BY m.created_at ASC`
	var entities MemberEntityCollection
	if err := persist.SelectContext(ctx, &entities, stmt, orgID); err != nil {
		return nil, err
	}
	return r.conv.MembersFromEntities(entities), nil
}
