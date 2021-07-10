package users

import (
	"github.com/gin-gonic/gin"
)

type UserSerializer struct {
	C *gin.Context
	Entity
}

//// Declare your response schema here
//type UserResponse struct {
//	ID       string `json:"-"`
//	Username string `json:"username"`
//	Type     string `json:"type"`
//}
//
//// Put your response logic including wrap the userModel here.
//func (self *UserSerializer) Response() UserResponse {
//	//myUserModel := self.C.MustGet("my_user_model").(Entity)
//	profile := UserResponse{
//		ID:       self.ID,
//		Username: self.Username,
//		Type:     self.Type,
//	}
//	return profile
//}
