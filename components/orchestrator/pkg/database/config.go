package database

import (
	"fmt"
	"net/url"
	"time"
)

const connStringf string = "mongodb://%s:%s@%s:%s"

type dbCtxKey string

const (
	// PersistenceCtxKey is a key used in context to store the persistence object
	DBCtxKey dbCtxKey = "DBCtx"
)

type DatabaseConfig struct {
	User               string        `envconfig:"default=admin,APP_DB_USER"`
	Password           string        `envconfig:"default=admin,APP_DB_PASSWORD"`
	Host               string        `envconfig:"default=localhost,APP_DB_HOST"`
	Port               string        `envconfig:"default=27017,APP_DB_PORT"`
	Name               string        `envconfig:"default=iot,APP_DB_NAME"`
	MaxOpenConnections uint64        `envconfig:"default=2,APP_DB_MAX_OPEN_CONNECTIONS"`
	MaxIdleConnections int           `envconfig:"default=2,APP_DB_MAX_IDLE_CONNECTIONS"`
	ConnMaxLifetime    time.Duration `envconfig:"default=30m,APP_DB_CONNECTION_MAX_LIFETIME"`
}

func (cfg DatabaseConfig) GetConnString() string {
	password := url.QueryEscape(cfg.Password)

	return fmt.Sprintf(connStringf, cfg.User, password, cfg.Host, cfg.Port)
}
