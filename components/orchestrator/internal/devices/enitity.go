package devices

type Entity struct {
	ID          *string `bson:"_id,omitempty"`
	UserId      string  `bson:"userId,omitempty"`
	Name        string  `bson:"name,omitempty"`
	Description string  `bson:"description,omitempty"`
	IsAlive     bool    `bson:"isAlive,omitempty"`
	Host        string  `bson:"host,omitempty"`
}

type EntityCollection []Entity

func (a EntityCollection) Len() int {
	return len(a)
}
