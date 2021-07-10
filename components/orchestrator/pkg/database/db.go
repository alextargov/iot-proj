package database

import (
	"context"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RetryCount is a number of retries when trying to open the database
const RetryCount int = 50

func SaveToContext(ctx context.Context, persistOp PersistenceOp) context.Context {
	return context.WithValue(ctx, DBCtxKey, persistOp)
}

// FromCtx extracts DatabaseOp interface from context
func FromCtx(ctx context.Context) (PersistenceOp, error) {
	dbCtx := ctx.Value(DBCtxKey)

	if db, ok := dbCtx.(PersistenceOp); ok {
		return db, nil
	}

	return nil, errors.New("unable to fetch database from context")
}

type db struct {
	client   *mongo.Client
	instance *mongo.Database
}

func (db *db) Ping(ctx context.Context) error {
	return db.Ping(ctx)
}

func (db *db) Collection(name string) *mongo.Collection {
	return db.instance.Collection(name, nil)
}

func (db *db) StartSession(opts ...*options.SessionOptions) (mongo.Session, error) {
	return db.client.StartSession(opts...)
}

type PersistenceOp interface {
	Collection(name string) *mongo.Collection
	StartSession(opts ...*options.SessionOptions) (mongo.Session, error)
}

// Configure returns the instance of the database
func GetConnection(context context.Context, conf DatabaseConfig) (PersistenceOp, func(ctx context.Context) error, error) {
	db, closeFunc, err := connect(context, conf, RetryCount)

	return db, closeFunc, err
}

func connect(ctx context.Context, conf DatabaseConfig, retryCount int) (PersistenceOp, func(context.Context) error, error) {
	var client *mongo.Client
	var err error

	for i := 0; i < retryCount; i++ {
		if i > 0 {
			time.Sleep(5 * time.Second)
		}
		logrus.Infof("Trying to connect to DB: %s", conf.GetConnString())

		client, err = mongo.NewClient(
			options.Client().ApplyURI(conf.GetConnString()),
			options.Client().SetConnectTimeout(conf.ConnMaxLifetime),
			options.Client().SetMaxPoolSize(conf.MaxOpenConnections),
			options.Client().SetAuth(options.Credential{
				Username: conf.User,
				Password: conf.Password,
			}),
		)
		if err != nil {
			return nil, nil, err
		}

		dbInstance := client.Database(conf.Name)

		err := client.Connect(ctx)
		if err != nil {
			logrus.Errorf("Failed to connect")
			continue
		}

		ctxWithTimeout, cancelFunc := context.WithTimeout(ctx, time.Second)
		err = client.Ping(ctxWithTimeout, nil)
		cancelFunc()
		if err != nil {
			logrus.Infof("Got error on pinging DB: %v", err)
			continue
		}

		logrus.Infof("Configuring MaxOpenConnections: [%d], MaxIdleConnections: [%d], ConnectionMaxLifetime: [%s]", conf.MaxOpenConnections, conf.MaxIdleConnections, conf.ConnMaxLifetime.String())

		return &db{client: client, instance: dbInstance}, client.Disconnect, nil
	}

	return nil, nil, err
}
