package users

type UserModel struct {
	ID       *string `json:"id"`
	Username string  `json:"username"`
	Password string  `json:"password"`
	Type     string  `json:"type"`
}

type LoginModel struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
