package devices

type converter struct {
}

func NewConverter() *converter {
	return &converter{}
}

func (c *converter) ToModel(entity Entity) *Model {
	return &Model{
		ID:          entity.ID,
		UserId:      entity.UserId,
		Name:        entity.Name,
		Description: entity.Description,
		Host:        entity.Host,
		IsAlive:     entity.IsAlive,
	}
}

func (c *converter) ToEntity(model Model) *Entity {
	return &Entity{
		ID:          model.ID,
		UserId:      model.UserId,
		Name:        model.Name,
		Description: model.Description,
		Host:        model.Host,
		IsAlive:     model.IsAlive,
	}
}
