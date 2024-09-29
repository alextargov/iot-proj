package model

import "time"

type UserInput struct {
	Username string
	Password string
}

func (ui *UserInput) ToUser(id string) User {
	return User{
		ID:       id,
		Username: ui.Username,
		Password: ui.Password,
	}
}

type User struct {
	ID        string     `json:"id"`
	Username  string     `json:"username"`
	Password  string     `json:"password"`
	CreatedAt *time.Time `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`
}
