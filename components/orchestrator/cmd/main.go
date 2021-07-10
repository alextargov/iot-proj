package main

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/iot-proj/components/orchestrator/internal/users"
	"github.com/iot-proj/components/orchestrator/pkg/database"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"github.com/vrischmann/envconfig"
	"net/http"
	"os/signal"
	"syscall"
	"time"
)

const envPrefix = "APP"

type config struct {
	Address         string        `envconfig:"default=127.0.0.1:8080"`
	ServerTimeout   time.Duration `envconfig:"default=110s"`
	ShutdownTimeout time.Duration `envconfig:"default=10s"`
	DefaultAPI      string        `envconfig:"APP_ROOT_API,default=/"`
	RootAPI         string        `envconfig:"APP_ROOT_API,default=/api"`
	Database        database.DatabaseConfig
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg := config{}
	err := envconfig.InitWithPrefix(&cfg, envPrefix)
	exitOnError(err, "Error on env init")

	db, closeFunc, err := database.GetConnection(ctx, cfg.Database)
	exitOnError(err, "Error while getting db connection")

	defer func() {
		err := closeFunc(ctx)
		exitOnError(err, "Error while closing the connection to the database")
	}()

	ctx = database.SaveToContext(ctx, db)

	handler, err := initAPIHandler(ctx, cfg, db)
	exitOnError(err, "Error while registering handler")

	runMainSrv, shutdownMainSrv := createServer(ctx, cfg, handler, "orchestrator")

	go func() {
		<-ctx.Done()

		// Interrupt signal received - shut down the servers
		shutdownMainSrv()
	}()

	runMainSrv()
}

func exitOnError(err error, context string) {
	if err != nil {
		wrappedError := errors.Wrap(err, context)
		logrus.Fatal(wrappedError)
	}
}

func createServer(ctx context.Context, cfg config, handler http.Handler, name string) (func(), func()) {
	srv := &http.Server{
		Addr:              cfg.Address,
		Handler:           handler,
		ReadHeaderTimeout: cfg.ServerTimeout,
	}

	runFn := func() {
		logrus.Infof("Running %s server on %s...", name, cfg.Address)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			logrus.Errorf("%s HTTP server ListenAndServe: %v", name, err)
		}
	}

	shutdownFn := func() {
		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		logrus.Infof("Shutting down %s server...", name)
		if err := srv.Shutdown(ctx); err != nil {
			logrus.Errorf("%s HTTP server Shutdown: %v", name, err)
		}
	}

	return runFn, shutdownFn
}

func initAPIHandler(ctx context.Context, cfg config, db database.PersistenceOp) (http.Handler, error) {
	mainRouter := gin.Default()
	mainRouter.Use()

	router := mainRouter.Group(cfg.RootAPI)
	healthCheckRouter := mainRouter.Group(cfg.DefaultAPI)

	conv := users.NewConverter()

	r := users.NewRepository(conv)

	s := users.NewService(r)

	users.RegisterRouters(ctx, db, router, s)

	//if err := tenant.RegisterHandler(ctx, router, cfg.Handler, authCfg, transact); err != nil {
	//	return nil, err
	//}

	logrus.Infof("Registering readiness endpoint...")
	healthCheckRouter.GET("/readyz", newReadinessHandler())

	logrus.Infof("Registering liveness endpoint...")
	healthCheckRouter.GET("/healthz", newReadinessHandler())

	return mainRouter, nil
}

func newReadinessHandler() func(c *gin.Context) {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "OK",
		})
	}
}
