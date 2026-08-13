package user

import (
	"time"
)

type Entity struct {
	ID        string     `db:"id"`
	Username  string     `db:"username"`
	Password  string     `db:"password"`
	CreatedAt *time.Time `db:"created_at"`
	UpdatedAt *time.Time `db:"updated_at"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
