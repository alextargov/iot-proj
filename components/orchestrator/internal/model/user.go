package model

import "time"

// Role represents a user's authorization role for RBAC.
type Role string

const (
	// RoleAdmin can manage everything, including other users and their roles.
	RoleAdmin Role = "ADMIN"
	// RoleOperator can manage devices, widgets, data models, alerts and dashboards.
	RoleOperator Role = "OPERATOR"
	// RoleViewer has read-only access.
	RoleViewer Role = "VIEWER"
)

// rank returns a comparable privilege level for a role (higher = more privileged).
func (r Role) rank() int {
	switch r {
	case RoleAdmin:
		return 3
	case RoleOperator:
		return 2
	case RoleViewer:
		return 1
	default:
		return 0
	}
}

// AtLeast reports whether the role has at least the privilege of minimum.
func (r Role) AtLeast(minimum Role) bool {
	return r.rank() >= minimum.rank()
}

// IsValid reports whether the role is one of the known roles.
func (r Role) IsValid() bool {
	return r.rank() > 0
}

type UserInput struct {
	Username string
	Password string
	Role     Role
}

func (ui *UserInput) ToUser(id string) User {
	role := ui.Role
	if role == "" {
		role = RoleViewer
	}
	return User{
		ID:       id,
		Username: ui.Username,
		Password: ui.Password,
		Role:     role,
	}
}

type User struct {
	ID        string     `json:"id"`
	Username  string     `json:"username"`
	Password  string     `json:"password"`
	Role      Role       `json:"role"`
	CreatedAt *time.Time `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`
}
