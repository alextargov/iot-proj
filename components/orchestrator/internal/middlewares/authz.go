package middlewares

import (
	"github.com/alextargov/iot-proj/components/orchestrator/internal/auth"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
)

func Authz(Config auth.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientToken := c.Request.Header.Get("Authorization")
		if clientToken == "" {
			c.JSON(http.StatusUnauthorized, "No Authorization header provided")
			c.Abort()
			return
		}

		extractedToken := strings.Split(clientToken, "Bearer ")

		if len(extractedToken) == 2 {
			clientToken = strings.TrimSpace(extractedToken[1])
		} else {
			c.JSON(http.StatusBadRequest, "Incorrect Format of Authorization Token")
			c.Abort()
			return
		}

		jwtWrapper := auth.NewJwtWrapper(Config)

		claims, err := jwtWrapper.ValidateToken(clientToken)
		if err != nil {
			c.JSON(http.StatusBadRequest, err.Error())
			c.Abort()
			return
		}

		c.Set("username", claims.Username)

		c.Next()
	}
}
