package host

import "database/sql"

type Entity struct {
	ID              string         `db:"id"`
	DeviceID        string         `db:"device_id"`
	Url             string         `db:"url"`
	TurnOnEndpoint  sql.NullString `db:"turn_on_endpoint"`
	TurnOffEndpoint sql.NullString `db:"turn_off_endpoint"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
