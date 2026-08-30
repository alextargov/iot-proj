package device

import (
	"database/sql"
	"time"
)

type Entity struct {
	ID                  string         `db:"id"`
	TenantID            string         `db:"tenant_id"`
	Name                string         `db:"name"`
	Description         sql.NullString `db:"description"`
	Status              string         `db:"status"`
	Auth                sql.NullString `db:"auth"`
	DataModelID         string         `db:"data_model_id"`
	Tags                sql.NullString `db:"tags"`
	CommunicationToken  sql.NullString `db:"communication_token"`
	ClientCert          sql.NullString `db:"client_cert"`
	ClientCertKey       sql.NullString `db:"client_cert_key"`
	ClientCertSerial    sql.NullString `db:"client_cert_serial"`
	ClientCertExpiresAt sql.NullTime   `db:"client_cert_expires_at"`
	CreatedAt           *time.Time     `db:"created_at"`
	UpdatedAt           *time.Time     `db:"updated_at"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
