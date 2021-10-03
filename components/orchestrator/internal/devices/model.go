package devices

type Model struct {
	ID          *string `json:"id"`
	UserId      string  `json:"userId"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	IsAlive     bool    `json:"isAlive"`
	Host        string  `json:"host"`
}
