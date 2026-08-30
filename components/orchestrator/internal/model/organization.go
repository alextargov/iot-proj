package model

import "time"

// Organization is a team/workspace grouping users. It is an overlay on the
// existing per-user tenancy: data ownership remains keyed by tenant_id ==
// users.id; organizations add membership and per-member roles.
type Organization struct {
	ID          string
	Name        string
	OwnerUserID string
	Members     []OrganizationMember
	CreatedAt   *time.Time
	UpdatedAt   *time.Time
}

// OrganizationMember is a user's membership (and role) within an organization.
type OrganizationMember struct {
	ID             string
	OrganizationID string
	UserID         string
	Username       string
	Role           Role
	CreatedAt      *time.Time
}

// CreateOrganizationInput is the input for creating an organization.
type CreateOrganizationInput struct {
	Name string
}

// AddOrganizationMemberInput is the input for adding a member to an org.
type AddOrganizationMemberInput struct {
	OrganizationID string
	UserID         string
	Role           Role
}
