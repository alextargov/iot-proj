package organization

import (
	"database/sql"
	"time"
)

// OrgEntity is the DB entity for organizations.
type OrgEntity struct {
	ID          string       `db:"id"`
	Name        string       `db:"name"`
	OwnerUserID string       `db:"owner_user_id"`
	CreatedAt   *time.Time   `db:"created_at"`
	UpdatedAt   sql.NullTime `db:"updated_at"`
}

// OrgEntityCollection is a slice of organization entities.
type OrgEntityCollection []OrgEntity

// Len returns the length of the collection.
func (c OrgEntityCollection) Len() int { return len(c) }

// MemberEntity is a row from organization_members joined with the user's
// username for display.
type MemberEntity struct {
	ID             string     `db:"id"`
	OrganizationID string     `db:"organization_id"`
	UserID         string     `db:"user_id"`
	Username       string     `db:"username"`
	Role           string     `db:"role"`
	CreatedAt      *time.Time `db:"created_at"`
}

// MemberEntityCollection is a slice of member entities.
type MemberEntityCollection []MemberEntity

// Len returns the length of the collection.
func (c MemberEntityCollection) Len() int { return len(c) }
