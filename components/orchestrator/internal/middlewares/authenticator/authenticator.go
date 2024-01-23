package authenticator

import (
	"context"
	"crypto/rsa"
	"fmt"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/apperrors"
	"github.com/alextargov/iot-proj/components/orchestrator/internal/middlewares/authenticator/claims"
	"github.com/form3tech-oss/jwt-go"
	"github.com/kyma-incubator/compass/components/director/pkg/log"
	"github.com/kyma-incubator/compass/components/hydrator/pkg/authenticator"
	"github.com/lestrrat-go/iter/arrayiter"
	"github.com/lestrrat-go/jwx/jwk"
	"github.com/pkg/errors"
	"net/http"
	"strings"
	"sync"
)

const (
	AuthorizationHeaderKey = "Authorization"
	JwksKeyIDKey           = "kid"
)

// Authenticator missing godoc
type Authenticator struct {
	httpClient          *http.Client
	jwksEndpoint        string
	allowJWTSigningNone bool
	cachedJWKS          jwk.Set
	clientIDHeaderKey   string
	mux                 sync.RWMutex
}

// New missing godoc
func New(httpClient *http.Client, jwksEndpoint string, allowJWTSigningNone bool, clientIDHeaderKey string) *Authenticator {
	return &Authenticator{
		httpClient:          httpClient,
		jwksEndpoint:        jwksEndpoint,
		allowJWTSigningNone: allowJWTSigningNone,
		clientIDHeaderKey:   clientIDHeaderKey,
	}
}

func (a *Authenticator) Handler() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			bearerToken, err := a.getBearerToken(r)
			if err != nil {
				log.C(ctx).WithError(err).Errorf("An error has occurred while getting token from header. Error code: %d: %v", http.StatusBadRequest, err)
				apperrors.WriteAppError(ctx, w, err, http.StatusBadRequest)
				return
			}

			tokenClaims, err := a.parseClaimsWithRetry(ctx, bearerToken)
			if err != nil {
				log.C(ctx).WithError(err).Errorf("An error has occurred while parsing claims: %v", err)
				apperrors.WriteAppError(ctx, w, err, http.StatusUnauthorized)
				return
			}

			ctx = tokenClaims.ContextWithClaims(ctx)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func (a *Authenticator) SynchronizeJWKS(ctx context.Context) error {
	log.C(ctx).Info("Synchronizing JWKS...")
	a.mux.Lock()
	defer a.mux.Unlock()

	jwks, err := FetchJWK(ctx, a.jwksEndpoint, jwk.WithHTTPClient(a.httpClient))
	if err != nil {
		return errors.Wrapf(err, "while fetching JWKS from endpoint %s", a.jwksEndpoint)
	}

	a.cachedJWKS = jwks
	log.C(ctx).Info("Successfully synchronized JWKS")

	return nil
}

func (a *Authenticator) parseClaimsWithRetry(ctx context.Context, bearerToken string) (*claims.Claims, error) {
	parsedClaims, err := a.parseClaims(ctx, bearerToken)
	if err != nil {
		validationErr, ok := err.(*jwt.ValidationError)
		if !ok || (validationErr.Inner != rsa.ErrVerification && !apperrors.IsKeyDoesNotExist(validationErr.Inner)) {
			log.C(ctx).WithError(err).Errorf("Failed to parse: %v", err)

			return nil, apperrors.NewUnauthorizedError(err.Error())
		}

		if err := a.SynchronizeJWKS(ctx); err != nil {
			log.C(ctx).WithError(err).Errorf("Failed to synchronize: %v", err)
			return nil, apperrors.InternalErrorFrom(err, "while synchronizing JWKS during parsing token")
		}

		parsedClaims, err = a.parseClaims(ctx, bearerToken)
		if err != nil {
			log.C(ctx).WithError(err).Errorf("Failed to parse claims: %v", err)
			return nil, apperrors.NewUnauthorizedError(err.Error())
		}
	}

	return parsedClaims, nil
}

func (a *Authenticator) getBearerToken(r *http.Request) (string, error) {
	reqToken := r.Header.Get(AuthorizationHeaderKey)
	fmt.Printf("AuthorizationHeaderKey: %q\n", r.Header.Get(AuthorizationHeaderKey))
	if reqToken == "" {
		return "", apperrors.NewUnauthorizedError("invalid bearer token")
	}

	reqToken = strings.TrimPrefix(reqToken, "Bearer ")
	return reqToken, nil
}

func (a *Authenticator) parseClaims(ctx context.Context, bearerToken string) (*claims.Claims, error) {
	parsed := claims.Claims{}

	if _, err := jwt.ParseWithClaims(bearerToken, &parsed, a.getKeyFunc(ctx)); err != nil {
		log.C(ctx).WithError(err).Errorf("Failed to parse jwt claims: %v", err)

		return &parsed, err
	}

	return &parsed, nil
}

func (a *Authenticator) getKeyFunc(ctx context.Context) func(token *jwt.Token) (interface{}, error) {
	return func(token *jwt.Token) (interface{}, error) {
		a.mux.RLock()
		defer a.mux.RUnlock()

		unsupportedErr := fmt.Errorf("unexpected signing method: %v", token.Method.Alg())

		switch token.Method.Alg() {
		case jwt.SigningMethodRS256.Name:
			keyID, err := a.getKeyID(*token)
			if err != nil {
				log.C(ctx).WithError(err).Errorf("An error occurred while getting the token signing key ID: %v", err)
				return nil, errors.Wrap(err, "while getting the key ID")
			}

			if a.cachedJWKS == nil {
				log.C(ctx).Debugf("Empty JWKS cache... Signing key %s is not found", keyID)
				return nil, apperrors.NewKeyDoesNotExistError(keyID)
			}

			keyIterator := &authenticator.JWTKeyIterator{
				AlgorithmCriteria: func(alg string) bool {
					return token.Method.Alg() == alg
				},
				IDCriteria: func(id string) bool {
					return id == keyID
				},
			}

			if err := arrayiter.Walk(ctx, a.cachedJWKS, keyIterator); err != nil {
				log.C(ctx).WithError(err).Errorf("An error occurred while walking through the JWKS: %v", err)
				return nil, err
			}

			if keyIterator.ResultingKey == nil {
				log.C(ctx).Debugf("Signing key %s is not found", keyID)
				return nil, apperrors.NewKeyDoesNotExistError(keyID)
			}

			return keyIterator.ResultingKey, nil
		case jwt.SigningMethodNone.Alg():
			if !a.allowJWTSigningNone {
				return nil, unsupportedErr
			}
			return jwt.UnsafeAllowNoneSignatureType, nil
		}

		return nil, unsupportedErr
	}
}

func (a *Authenticator) getKeyID(token jwt.Token) (string, error) {
	keyID, ok := token.Header[JwksKeyIDKey]
	if !ok {
		return "", apperrors.NewInternalError("unable to find the key ID in the token")
	}

	keyIDStr, ok := keyID.(string)
	if !ok {
		return "", apperrors.NewInternalError("unable to cast the key ID to a string")
	}

	return keyIDStr, nil
}
