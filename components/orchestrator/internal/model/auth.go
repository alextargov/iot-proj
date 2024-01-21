package model

// Auth missing godoc
type Auth struct {
	CredentialForDevice  CredentialData
	CredentialForService *string
	AccessStrategy       *string
}

// CredentialData missing godoc
type CredentialData struct {
	Basic            *BasicCredentialData
	Oauth            *OAuthCredentialData
	CertificateOAuth *CertificateOAuthCredentialData
	BearerToken      *TokenCredentialData
}

// BasicCredentialData missing godoc
type BasicCredentialData struct {
	Username string
	Password string
}

// OAuthCredentialData missing godoc
type OAuthCredentialData struct {
	ClientID     string
	ClientSecret string
	URL          string
}

// CertificateOAuthCredentialData represents a structure for mTLS OAuth credentials
type CertificateOAuthCredentialData struct {
	ClientID    string
	Certificate string
	URL         string
}

type TokenCredentialData struct {
	Token string
}

// AuthInput missing godoc
type AuthInput struct {
	CredentialForDevice  *CredentialDataInput
	CredentialForService *string
	AccessStrategy       *string
}

// ToAuth missing godoc
func (i *AuthInput) ToAuth() *Auth {
	if i == nil {
		return nil
	}

	var credentialForDevice CredentialData
	if i.CredentialForDevice != nil {
		credentialForDevice = *i.CredentialForDevice.ToCredentialData()
	}

	return &Auth{
		CredentialForDevice:  credentialForDevice,
		CredentialForService: i.CredentialForService,
		AccessStrategy:       i.AccessStrategy,
	}
}

// CredentialDataInput missing godoc
type CredentialDataInput struct {
	Basic            *BasicCredentialDataInput
	Oauth            *OAuthCredentialDataInput
	CertificateOAuth *CertificateOAuthCredentialDataInput
	Token            *TokenCredentialDataInput
}

// ToCredentialData missing godoc
func (i *CredentialDataInput) ToCredentialData() *CredentialData {
	if i == nil {
		return nil
	}

	var basic *BasicCredentialData
	var oauth *OAuthCredentialData
	var certOAuth *CertificateOAuthCredentialData
	var token *TokenCredentialData

	if i.Basic != nil {
		basic = i.Basic.ToBasicCredentialData()
	}

	if i.Oauth != nil {
		oauth = i.Oauth.ToOAuthCredentialData()
	}

	if i.CertificateOAuth != nil {
		certOAuth = i.CertificateOAuth.ToCertificateOAuthCredentialData()
	}

	if i.Token != nil {
		token = i.Token.ToTokenCredentialData()
	}

	return &CredentialData{
		Basic:            basic,
		Oauth:            oauth,
		CertificateOAuth: certOAuth,
		BearerToken:      token,
	}
}

// BasicCredentialDataInput missing godoc
type BasicCredentialDataInput struct {
	Username string
	Password string
}

// ToBasicCredentialData missing godoc
func (i *BasicCredentialDataInput) ToBasicCredentialData() *BasicCredentialData {
	if i == nil {
		return nil
	}

	return &BasicCredentialData{
		Username: i.Username,
		Password: i.Password,
	}
}

type TokenCredentialDataInput struct {
	Token string
}

// ToTokenCredentialData missing godoc
func (i *TokenCredentialDataInput) ToTokenCredentialData() *TokenCredentialData {
	if i == nil {
		return nil
	}

	return &TokenCredentialData{
		Token: i.Token,
	}
}

// OAuthCredentialDataInput missing godoc
type OAuthCredentialDataInput struct {
	ClientID     string
	ClientSecret string
	URL          string
}

// ToOAuthCredentialData missing godoc
func (i *OAuthCredentialDataInput) ToOAuthCredentialData() *OAuthCredentialData {
	if i == nil {
		return nil
	}

	return &OAuthCredentialData{
		ClientID:     i.ClientID,
		ClientSecret: i.ClientSecret,
		URL:          i.URL,
	}
}

// CertificateOAuthCredentialDataInput represents an input structure for mTLS OAuth credentials
type CertificateOAuthCredentialDataInput struct {
	ClientID    string
	Certificate string
	URL         string
}

// ToCertificateOAuthCredentialData converts a CertificateOAuthCredentialDataInput into CertificateOAuthCredentialData
func (i *CertificateOAuthCredentialDataInput) ToCertificateOAuthCredentialData() *CertificateOAuthCredentialData {
	if i == nil {
		return nil
	}

	return &CertificateOAuthCredentialData{
		ClientID:    i.ClientID,
		Certificate: i.Certificate,
		URL:         i.URL,
	}
}
