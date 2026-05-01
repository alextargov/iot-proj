package device

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
)

// AuthenticatedHTTPClient handles HTTP requests with device authentication
type AuthenticatedHTTPClient struct {
	client *http.Client
}

// NewAuthenticatedHTTPClient creates a new authenticated HTTP client
func NewAuthenticatedHTTPClient() *AuthenticatedHTTPClient {
	return &AuthenticatedHTTPClient{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// DoRequest performs an HTTP request with authentication based on device credentials
func (c *AuthenticatedHTTPClient) DoRequest(ctx context.Context, method, endpoint string, body []byte, auth *model.Auth) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, endpoint, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	if err := c.applyAuth(ctx, req, auth); err != nil {
		return nil, fmt.Errorf("failed to apply authentication: %w", err)
	}

	return c.client.Do(req)
}

// applyAuth adds authentication headers to the request based on credential type
func (c *AuthenticatedHTTPClient) applyAuth(ctx context.Context, req *http.Request, auth *model.Auth) error {
	if auth == nil {
		return nil
	}

	cred := auth.CredentialForDevice

	// Basic Auth
	if cred.Basic != nil {
		credentials := base64.StdEncoding.EncodeToString(
			[]byte(cred.Basic.Username + ":" + cred.Basic.Password),
		)
		req.Header.Set("Authorization", "Basic "+credentials)
		return nil
	}

	// Bearer Token
	if cred.BearerToken != nil && cred.BearerToken.Token != "" {
		req.Header.Set("Authorization", "Bearer "+cred.BearerToken.Token)
		return nil
	}

	// OAuth (Client Credentials flow)
	if cred.Oauth != nil {
		token, err := c.fetchOAuthToken(ctx, cred.Oauth)
		if err != nil {
			return fmt.Errorf("failed to fetch OAuth token: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+token)
		return nil
	}

	// Certificate OAuth (mTLS)
	if cred.CertificateOAuth != nil {
		token, err := c.fetchCertOAuthToken(ctx, cred.CertificateOAuth)
		if err != nil {
			return fmt.Errorf("failed to fetch certificate OAuth token: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+token)
		return nil
	}

	return nil
}

// fetchOAuthToken performs OAuth client credentials flow
func (c *AuthenticatedHTTPClient) fetchOAuthToken(ctx context.Context, oauth *model.OAuthCredentialData) (string, error) {
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", oauth.ClientID)
	data.Set("client_secret", oauth.ClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, oauth.URL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OAuth token request failed with status %d", resp.StatusCode)
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode token response: %w", err)
	}

	return tokenResp.AccessToken, nil
}

// fetchCertOAuthToken performs OAuth with mTLS client certificate
func (c *AuthenticatedHTTPClient) fetchCertOAuthToken(ctx context.Context, certOAuth *model.CertificateOAuthCredentialData) (string, error) {
	cert, err := tls.X509KeyPair([]byte(certOAuth.Certificate), []byte(certOAuth.Certificate))
	if err != nil {
		return "", fmt.Errorf("failed to load certificate: %w", err)
	}

	tlsClient := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				Certificates: []tls.Certificate{cert},
			},
		},
	}

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", certOAuth.ClientID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, certOAuth.URL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := tlsClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("certificate OAuth token request failed with status %d", resp.StatusCode)
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode token response: %w", err)
	}

	return tokenResp.AccessToken, nil
}
