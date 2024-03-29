package main

import (
	"context"
	"encoding/json"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/auth"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/middlewares/authenticator"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/middlewares/cors"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/gorilla/mux"
	"github.com/kyma-incubator/compass/components/director/pkg/executor"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
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
	ShutdownTimeout time.Duration `envconfig:"default=10s"`
	DefaultAPI      string        `envconfig:"APP_ROOT_API,default=/"`
	APIEndpoint     string        `envconfig:"default=/graphql"`

	ClientTimeout time.Duration `envconfig:"default=105s"`
	ServerTimeout time.Duration `envconfig:"default=110s"`

	JWKSEndpoint          string        `envconfig:"default=file://hack/default-jwks.json"`
	JWKSSyncPeriod        time.Duration `envconfig:"default=5m"`
	AllowJWTSigningNone   bool          `envconfig:"default=true"`
	ClientIDHTTPHeaderKey string        `envconfig:"default=client_user,APP_CLIENT_ID_HTTP_HEADER"`

	Database persistence.DatabaseConfig
	Config   auth.Config

	Log log.Config
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg := config{}
	err := envconfig.InitWithPrefix(&cfg, envPrefix)
	exitOnError(err, "Error on env init")

	ctx, err = log.Configure(ctx, &cfg.Log)
	exitOnError(err, "Failed to configure Logger")

	transact, closeFunc, err := persistence.Configure(ctx, cfg.Database)
	exitOnError(err, "Error while establishing the connection to the database")

	defer func() {
		err := closeFunc()
		exitOnError(err, "Error while closing the connection to the database")
	}()

	handler, err := initAPIHandler(ctx, cfg, transact)
	exitOnError(err, "Error while registering handler")

	runMainSrv, shutdownMainSrv := createServer(ctx, cfg, handler, "orchestrator")

	go func() {
		<-ctx.Done()

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

func initAPIHandler(ctx context.Context, cfg config, db persistence.Transactioner) (*mux.Router, error) {
	mainRouter := mux.NewRouter()

	httpClient := &http.Client{
		Timeout: cfg.ClientTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	authMiddleware := authenticator.New(httpClient, cfg.JWKSEndpoint, cfg.AllowJWTSigningNone, cfg.ClientIDHTTPHeaderKey)

	if cfg.JWKSSyncPeriod != 0 {
		logrus.Infof("JWKS synchronization enabled. Sync period: %v", cfg.JWKSSyncPeriod)
		periodicExecutor := executor.NewPeriodic(cfg.JWKSSyncPeriod, func(ctx context.Context) {
			err := authMiddleware.SynchronizeJWKS(ctx)
			if err != nil {
				logrus.WithError(err).Errorf("An error has occurred while synchronizing JWKS: %v", err)
			}
		})
		go periodicExecutor.Run(ctx)
	}

	healthCheckRouter := mainRouter.PathPrefix(cfg.DefaultAPI).Subrouter()

	rootResolver := domain.NewRootResolver(db)
	srv := handler.NewDefaultServer(graphql.NewExecutableSchema(graphql.Config{Resolvers: rootResolver}))
	//mainRouter.Handle("/", playground.Handler("GraphQL playground", cfg.APIEndpoint))
	mainRouter.Use(cors.New().Handler())

	mainRouter.HandleFunc("/", playground.Handler("GraphQL playground", cfg.APIEndpoint))

	gqlRouter := mainRouter.PathPrefix(cfg.APIEndpoint).Subrouter()
	gqlRouter.Use(cors.New().Handler())

	gqlRouter.Use(authMiddleware.Handler())
	gqlRouter.Handle("", srv)

	logrus.Infof("Registering readiness endpoint...")

	healthCheckRouter.HandleFunc("/readyz", newReadinessHandler).Methods("GET")

	logrus.Infof("Registering liveness endpoint...")
	healthCheckRouter.HandleFunc("/healthz", newReadinessHandler).Methods("GET")

	return mainRouter, nil
}

func newReadinessHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
