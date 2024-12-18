package main

import (
	"context"
	"encoding/json"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/alextargov/iot-proj/components/controller/client"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/auth"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/domain/user"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/handlers"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/k8s"
	authmiddleware "github.com/alextargov/iot-proj/components/orchestrator/internal/middlewares/auth"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/middlewares/correlation"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/uuid"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/graphql"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/persistence"
	"github.com/gorilla/mux"
	"github.com/pkg/errors"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
	"github.com/vrischmann/envconfig"
	"net/http"
	"os/signal"
	cr "sigs.k8s.io/controller-runtime"
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

	JWKSEndpoint          string `envconfig:"default=file://hack/default-jwks.json"`
	AllowJWTSigningNone   bool   `envconfig:"default=true"`
	ClientIDHTTPHeaderKey string `envconfig:"default=client_user,APP_CLIENT_ID_HTTP_HEADER"`

	Database persistence.DatabaseConfig
	Config   auth.Config

	ApplicationsNamespace string

	Log logger.Config
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg := config{}
	err := envconfig.InitWithPrefix(&cfg, envPrefix)
	exitOnError(err, "Error on env init")

	ctx = logger.InitLogger(ctx, cfg.Log)

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
		ctx, cancel := context.WithTimeout(ctx, cfg.ShutdownTimeout)
		defer cancel()

		logrus.Infof("Shutting down %s server...", name)
		if err := srv.Shutdown(ctx); err != nil {
			logrus.Errorf("%s HTTP server Shutdown: %v", name, err)
		}
	}

	return runFn, shutdownFn
}

func initAPIHandler(ctx context.Context, cfg config, db persistence.Transactioner) (http.Handler, error) {
	jwtWrapper := auth.NewJwtWrapper(cfg.Config)
	uidService := uuid.NewService()
	userConv := user.NewConverter()
	userRepo := user.NewRepository(userConv)
	userService := user.NewService(userRepo, uidService)
	authMiddleware := authmiddleware.NewMiddleware(db, jwtWrapper, userService)
	authHandler := handlers.NewAuthHandler(db, userService, jwtWrapper)

	applicationsScheduler, err := buildScheduler(cfg)
	if err != nil {
		return nil, err
	}

	mainRouter := mux.NewRouter()

	mainRouter.HandleFunc("/login", authHandler.Login).Methods(http.MethodPost)
	mainRouter.HandleFunc("/register", authHandler.Register).Methods(http.MethodPost)

	rootResolver := domain.NewRootResolver(db, applicationsScheduler)
	srv := handler.NewDefaultServer(graphql.NewExecutableSchema(graphql.Config{Resolvers: rootResolver}))

	mainRouter.HandleFunc("/", playground.Handler("GraphQL playground", cfg.APIEndpoint))

	gqlRouter := mainRouter.PathPrefix(cfg.APIEndpoint).Subrouter()

	gqlRouter.Use(correlation.CorrelationIDMiddleware)
	gqlRouter.Use(authMiddleware.Handler)

	gqlRouter.Handle("", srv)

	healthCheckRouter := mainRouter.PathPrefix(cfg.DefaultAPI).Subrouter()

	logrus.Infof("Registering readiness endpoint...")
	healthCheckRouter.HandleFunc("/readyz", newReadinessHandler).Methods("GET")

	logrus.Infof("Registering liveness endpoint...")
	healthCheckRouter.HandleFunc("/healthz", newReadinessHandler).Methods("GET")

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4200"}, // Frontend origin
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	return c.Handler(mainRouter), nil
}

func newReadinessHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func buildScheduler(config config) (k8s.Scheduler, error) {
	cfg, err := cr.GetConfig()
	exitOnError(err, "Failed to get cluster config for operations k8s client")

	cfg.Timeout = config.ClientTimeout
	k8sClient, err := client.NewForConfig(cfg)
	if err != nil {
		return nil, err
	}
	operationsK8sClient := k8sClient.Applications(config.ApplicationsNamespace)

	return k8s.NewScheduler(operationsK8sClient), nil
}
