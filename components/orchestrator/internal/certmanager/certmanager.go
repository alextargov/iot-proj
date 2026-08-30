package certmanager

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/pkg/errors"
)

// Config holds the platform CA configuration used to issue device certificates.
type Config struct {
	// CACertFile is a path to a PEM-encoded CA certificate. Optional; if empty
	// an ephemeral in-memory CA is generated at startup (dev only).
	CACertFile string `envconfig:"APP_DEVICE_CA_CERT,optional"`
	// CAKeyFile is a path to the PEM-encoded CA private key. Optional.
	CAKeyFile string `envconfig:"APP_DEVICE_CA_KEY,optional"`
	// ValidityDays is how long issued device certificates remain valid.
	ValidityDays int `envconfig:"APP_DEVICE_CERT_VALIDITY_DAYS,default=365"`
}

// IssuedCertificate is the result of issuing a device client certificate.
type IssuedCertificate struct {
	CertificatePEM   string
	PrivateKeyPEM    string
	CACertificatePEM string
	Serial           string
	ExpiresAt        time.Time
}

// Manager issues and manages device client certificates signed by a platform CA.
type Manager struct {
	caCert       *x509.Certificate
	caKey        *ecdsa.PrivateKey
	caCertPEM    string
	validityDays int
}

// NewManager builds a certificate manager. If a CA cert/key file pair is
// configured it is loaded; otherwise an ephemeral self-signed CA is generated
// (suitable for local development only — a warning should be logged by the
// caller in that case, which it can detect via Ephemeral()).
func NewManager(cfg Config) (*Manager, error) {
	validity := cfg.ValidityDays
	if validity <= 0 {
		validity = 365
	}

	if cfg.CACertFile != "" && cfg.CAKeyFile != "" {
		return newManagerFromFiles(cfg.CACertFile, cfg.CAKeyFile, validity)
	}

	return newEphemeralManager(validity)
}

func newManagerFromFiles(certFile, keyFile string, validity int) (*Manager, error) {
	certBytes, err := os.ReadFile(certFile)
	if err != nil {
		return nil, errors.Wrapf(err, "while reading CA cert file %s", certFile)
	}
	keyBytes, err := os.ReadFile(keyFile)
	if err != nil {
		return nil, errors.Wrapf(err, "while reading CA key file %s", keyFile)
	}

	certBlock, _ := pem.Decode(certBytes)
	if certBlock == nil {
		return nil, errors.New("failed to decode CA certificate PEM")
	}
	caCert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return nil, errors.Wrap(err, "while parsing CA certificate")
	}

	keyBlock, _ := pem.Decode(keyBytes)
	if keyBlock == nil {
		return nil, errors.New("failed to decode CA key PEM")
	}
	caKey, err := x509.ParseECPrivateKey(keyBlock.Bytes)
	if err != nil {
		return nil, errors.Wrap(err, "while parsing CA private key (expected EC key)")
	}

	return &Manager{
		caCert:       caCert,
		caKey:        caKey,
		caCertPEM:    string(certBytes),
		validityDays: validity,
	}, nil
}

func newEphemeralManager(validity int) (*Manager, error) {
	caKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, errors.Wrap(err, "while generating ephemeral CA key")
	}

	serial, err := randomSerial()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	template := &x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			CommonName:   "IoT Platform Device CA (ephemeral)",
			Organization: []string{"iot-proj"},
		},
		NotBefore:             now.Add(-5 * time.Minute),
		NotAfter:              now.AddDate(10, 0, 0),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign | x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}

	der, err := x509.CreateCertificate(rand.Reader, template, template, &caKey.PublicKey, caKey)
	if err != nil {
		return nil, errors.Wrap(err, "while creating ephemeral CA certificate")
	}

	caCert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, errors.Wrap(err, "while parsing ephemeral CA certificate")
	}

	caCertPEM := string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}))

	return &Manager{
		caCert:       caCert,
		caKey:        caKey,
		caCertPEM:    caCertPEM,
		validityDays: validity,
	}, nil
}

// IssueDeviceCertificate mints a new client certificate for the given device.
// commonName is used as the certificate subject CN (typically the device ID).
func (m *Manager) IssueDeviceCertificate(deviceID, commonName string) (*IssuedCertificate, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, errors.Wrap(err, "while generating device key")
	}

	serial, err := randomSerial()
	if err != nil {
		return nil, err
	}

	if commonName == "" {
		commonName = deviceID
	}

	now := time.Now()
	expiresAt := now.AddDate(0, 0, m.validityDays)
	template := &x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			CommonName:   commonName,
			Organization: []string{"iot-proj-devices"},
		},
		NotBefore:             now.Add(-5 * time.Minute),
		NotAfter:              expiresAt,
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		BasicConstraintsValid: true,
	}

	der, err := x509.CreateCertificate(rand.Reader, template, m.caCert, &key.PublicKey, m.caKey)
	if err != nil {
		return nil, errors.Wrap(err, "while creating device certificate")
	}

	certPEM := string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}))

	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return nil, errors.Wrap(err, "while marshalling device key")
	}
	keyPEM := string(pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER}))

	return &IssuedCertificate{
		CertificatePEM:   certPEM,
		PrivateKeyPEM:    keyPEM,
		CACertificatePEM: m.caCertPEM,
		Serial:           serial.Text(16),
		ExpiresAt:        expiresAt,
	}, nil
}

// CACertificatePEM returns the PEM-encoded CA certificate that signs device certs.
func (m *Manager) CACertificatePEM() string {
	return m.caCertPEM
}

func randomSerial() (*big.Int, error) {
	limit := new(big.Int).Lsh(big.NewInt(1), 128)
	serial, err := rand.Int(rand.Reader, limit)
	if err != nil {
		return nil, fmt.Errorf("while generating serial number: %w", err)
	}
	return serial, nil
}
