package users

type Entity struct {
	ID       string `bson:"id,omitempty"`
	Username string `bson:"username,omitempty"`
	Password string `bson:"password,omitempty"`
	Type     string `bson:"type,omitempty"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
