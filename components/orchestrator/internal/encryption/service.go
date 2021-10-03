package encryption

import (
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

type service struct {
}

func NewService() *service {
	return &service{}
}

func (s *service) Encrypt(str string) (string, error) {
	byte := []byte(str)

	hash, err := bcrypt.GenerateFromPassword(byte, bcrypt.MinCost)
	if err != nil {
		logrus.Error(err)
		return "", errors.Wrapf(err, "while generating hash")
	}

	return string(hash), nil
}

func (s *service) Compare(hash, rawStr string) (bool, error) {
	byteHash := []byte(hash)
	byteStr := []byte(rawStr)

	err := bcrypt.CompareHashAndPassword(byteHash, byteStr)
	if err != nil {
		logrus.Error(err)
		return false, errors.Wrapf(err, "while comparing hash with string")
	}

	return true, nil
}
