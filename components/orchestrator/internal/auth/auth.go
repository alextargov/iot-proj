package auth

import (
	"errors"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
)

type Config struct {
	SecretKey       string `envconfig:"APP_AUTH_SECRET,default=veryBigSecret"`
	Issuer          string `envconfig:"APP_AUTH_ISS,default=orchestrator"`
	ExpirationHours int64  `envconfig:"APP_AUTH_EXP,default=4"`
}

// JwtWrapper wraps the signing key and the issuer
type JwtWrapper struct {
	SecretKey       string
	Issuer          string
	ExpirationHours int64
}

func NewJwtWrapper(c Config) *JwtWrapper {
	return &JwtWrapper{
		SecretKey:       c.SecretKey,
		Issuer:          c.Issuer,
		ExpirationHours: c.ExpirationHours,
	}
}

// JwtClaim adds email as a claim to the token
type JwtClaim struct {
	Username string
	jwt.StandardClaims
}

// GenerateToken generates a jwt token
func (j *JwtWrapper) GenerateToken(username string) (string, error) {
	now := time.Now().Local()
	claims := &JwtClaim{
		Username: username,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: now.Add(time.Hour * time.Duration(j.ExpirationHours)).Unix(),
			Issuer:    j.Issuer,
			IssuedAt:  now.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString([]byte(j.SecretKey))
	if err != nil {
		return "", errors.New("error while signing token")
	}

	return signedToken, nil
}

//ValidateToken validates the jwt token
func (j *JwtWrapper) ValidateToken(signedToken string) (claims *JwtClaim, err error) {
	token, err := jwt.ParseWithClaims(
		signedToken,
		&JwtClaim{},
		func(token *jwt.Token) (interface{}, error) {
			return []byte(j.SecretKey), nil
		},
	)

	if err != nil {
		return
	}

	claims, ok := token.Claims.(*JwtClaim)
	if !ok {
		err = errors.New("couldn't parse claims")
		return
	}

	if claims.ExpiresAt < time.Now().Local().Unix() {
		err = errors.New("JWT is expired")
		return
	}

	return

}
