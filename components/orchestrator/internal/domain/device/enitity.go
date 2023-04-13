package device

import "database/sql"

type Entity struct {
	ID          string         `db:"id"`
	TenantID    string         `db:"tenant_id"`
	Name        string         `db:"name"`
	Description sql.NullString `db:"description"`
	Status      string         `db:"status"`
	Auth        sql.NullString `db:"auth"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
