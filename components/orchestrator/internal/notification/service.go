package notification

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
	"github.com/alextargov/iot-proj/components/orchestrator/pkg/logger"
)

// Config holds the notification service configuration
type Config struct {
	SMTP SMTPConfig
}

// SMTPConfig holds SMTP configuration
type SMTPConfig struct {
	Host     string `envconfig:"APP_NOTIFICATION_SMTP_HOST,default=smtp.example.com"`
	Port     int    `envconfig:"APP_NOTIFICATION_SMTP_PORT,default=587"`
	Username string `envconfig:"APP_NOTIFICATION_SMTP_USERNAME,default=alex"`
	Password string `envconfig:"APP_NOTIFICATION_SMTP_PASSWORD,default=secret"`
	From     string `envconfig:"APP_NOTIFICATION_SMTP_FROM,default=iot-app"`
	UseTLS   bool   `envconfig:"APP_NOTIFICATION_SMTP_USE_TLS,default=false"`
}

// Service defines the notification service interface
type Service interface {
	Send(ctx context.Context, notification model.AlertNotification, rule *model.AlertRule, device *model.Device, values map[string]float64) error
	SendEmail(ctx context.Context, to []string, subject, body string) error
	SendWebhook(ctx context.Context, url string, method string, headers map[string]string, payload interface{}) error
}

type service struct {
	config     SMTPConfig
	httpClient *http.Client
}

// NewService creates a new notification service
func NewService(cfg SMTPConfig) Service {
	return &service{
		config: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Send sends a notification based on the notification type
func (s *service) Send(ctx context.Context, notification model.AlertNotification, rule *model.AlertRule, device *model.Device, values map[string]float64) error {
	switch notification.Type {
	case "email":
		return s.sendEmailNotification(ctx, notification, rule, device, values)
	case "webhook":
		return s.sendWebhookNotification(ctx, notification, rule, device, values)
	default:
		return fmt.Errorf("unknown notification type: %s", notification.Type)
	}
}

func (s *service) sendEmailNotification(ctx context.Context, notification model.AlertNotification, rule *model.AlertRule, device *model.Device, values map[string]float64) error {
	var config model.EmailNotificationConfig
	if err := json.Unmarshal([]byte(notification.Config), &config); err != nil {
		return fmt.Errorf("failed to parse email config: %w", err)
	}

	if len(config.Recipients) == 0 {
		return fmt.Errorf("no recipients configured for email notification")
	}

	subject := config.Subject
	if subject == "" {
		subject = fmt.Sprintf("[%s] Alert: %s", rule.Severity, rule.Name)
	}

	body := s.buildEmailBody(rule, device, values)

	return s.SendEmail(ctx, config.Recipients, subject, body)
}

func (s *service) buildEmailBody(rule *model.AlertRule, device *model.Device, values map[string]float64) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("Alert: %s\n", rule.Name))
	sb.WriteString(fmt.Sprintf("Severity: %s\n", rule.Severity))

	if device != nil {
		sb.WriteString(fmt.Sprintf("Device: %s (ID: %s)\n", device.Name, device.ID))
	}

	if rule.Description != nil && *rule.Description != "" {
		sb.WriteString(fmt.Sprintf("Description: %s\n", *rule.Description))
	}

	sb.WriteString("\nTriggered Values:\n")
	for metric, value := range values {
		sb.WriteString(fmt.Sprintf("  - %s: %.2f\n", metric, value))
	}

	sb.WriteString("\nConditions:\n")
	for _, group := range rule.Conditions {
		sb.WriteString(fmt.Sprintf("  Group %d:\n", group.GroupID))
		for _, cond := range group.Conditions {
			sb.WriteString(fmt.Sprintf("    - %s %s %.2f\n", cond.MetricName, cond.Operator, cond.Threshold))
		}
	}

	sb.WriteString(fmt.Sprintf("\nTime: %s\n", time.Now().Format(time.RFC3339)))

	return sb.String()
}

func (s *service) sendWebhookNotification(ctx context.Context, notification model.AlertNotification, rule *model.AlertRule, device *model.Device, values map[string]float64) error {
	var config model.WebhookNotificationConfig
	if err := json.Unmarshal([]byte(notification.Config), &config); err != nil {
		return fmt.Errorf("failed to parse webhook config: %w", err)
	}

	if config.URL == "" {
		return fmt.Errorf("no URL configured for webhook notification")
	}

	method := config.Method
	if method == "" {
		method = http.MethodPost
	}

	payload := map[string]interface{}{
		"alert": map[string]interface{}{
			"id":       rule.ID,
			"name":     rule.Name,
			"severity": rule.Severity,
		},
		"device": map[string]interface{}{
			"id":   device.ID,
			"name": device.Name,
		},
		"triggeredValues": values,
		"timestamp":       time.Now().Format(time.RFC3339),
	}

	return s.SendWebhook(ctx, config.URL, method, config.Headers, payload)
}

// SendEmail sends an email via SMTP
func (s *service) SendEmail(ctx context.Context, to []string, subject, body string) error {
	if s.config.Host == "" {
		logger.C(ctx).Warn("SMTP not configured, skipping email notification")
		return nil
	}

	from := s.config.From
	if from == "" {
		from = "alerts@iot-app.local"
	}

	// Build email message
	var msg strings.Builder
	msg.WriteString(fmt.Sprintf("From: %s\r\n", from))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(to, ", ")))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(body)

	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)

	var auth smtp.Auth
	if s.config.Username != "" {
		auth = smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
	}

	if s.config.UseTLS {
		return s.sendEmailTLS(addr, auth, from, to, msg.String())
	}

	logger.C(ctx).Debugf("Sending email to %v via %s", to, addr)
	return smtp.SendMail(addr, auth, from, to, []byte(msg.String()))
}

func (s *service) sendEmailTLS(addr string, auth smtp.Auth, from string, to []string, msg string) error {
	tlsConfig := &tls.Config{
		ServerName: s.config.Host,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to dial TLS: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.config.Host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP auth failed: %w", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("SMTP MAIL command failed: %w", err)
	}

	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("SMTP RCPT command failed for %s: %w", recipient, err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA command failed: %w", err)
	}

	if _, err := w.Write([]byte(msg)); err != nil {
		return fmt.Errorf("failed to write email body: %w", err)
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("failed to close email writer: %w", err)
	}

	return client.Quit()
}

// SendWebhook sends a webhook HTTP request
func (s *service) SendWebhook(ctx context.Context, url string, method string, headers map[string]string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal webhook payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create webhook request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	logger.C(ctx).Debugf("Sending webhook to %s", url)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("webhook returned error status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}
