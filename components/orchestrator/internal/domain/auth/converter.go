package auth

import (
	"github.com/iot-proj/components/orchestrator/internal/model"
	"github.com/iot-proj/components/orchestrator/pkg/graphql"
)

type converter struct {
}

// NewConverter missing godoc
func NewConverter() *converter {
	return &converter{}
}

func (c *converter) ToGraphQL(in *model.Auth) *graphql.Auth {
	if in == nil {
		return nil
	}

	return &graphql.Auth{
		Credential:     c.credentialToGraphQL(in.Credential),
		AccessStrategy: in.AccessStrategy,
	}
}

// InputFromGraphQL missing godoc
func (c *converter) InputFromGraphQL(in *graphql.AuthInput) *model.AuthInput {
	if in == nil {
		return nil
	}

	credential := c.credentialInputFromGraphQL(in.Credential)

	return &model.AuthInput{
		Credential:     credential,
		AccessStrategy: in.AccessStrategy,
	}
}

func (c *converter) credentialInputFromGraphQL(in *graphql.CredentialDataInput) *model.CredentialDataInput {
	if in == nil {
		return nil
	}

	var basic *model.BasicCredentialDataInput
	var oauth *model.OAuthCredentialDataInput
	var certOAuth *model.CertificateOAuthCredentialDataInput
	var token *model.TokenCredentialDataInput

	if in.Basic != nil {
		basic = &model.BasicCredentialDataInput{
			Username: in.Basic.Username,
			Password: in.Basic.Password,
		}
	} else if in.Oauth != nil {
		oauth = &model.OAuthCredentialDataInput{
			URL:          in.Oauth.URL,
			ClientID:     in.Oauth.ClientID,
			ClientSecret: in.Oauth.ClientSecret,
		}
	} else if in.BearerToken != nil {
		token = &model.TokenCredentialDataInput{
			Token: in.BearerToken.Token,
		}
	} else if in.CertificateOAuth != nil {
		certOAuth = &model.CertificateOAuthCredentialDataInput{
			ClientID:    in.CertificateOAuth.ClientID,
			Certificate: in.CertificateOAuth.Certificate,
			URL:         in.CertificateOAuth.URL,
		}
	}

	return &model.CredentialDataInput{
		Basic:            basic,
		Oauth:            oauth,
		CertificateOAuth: certOAuth,
		Token:            token,
	}
}

func (c *converter) credentialToGraphQL(in model.CredentialData) graphql.CredentialData {
	var credential graphql.CredentialData
	if in.Basic != nil {
		credential = graphql.BasicCredentialData{
			Username: in.Basic.Username,
			Password: in.Basic.Password,
		}
	} else if in.Oauth != nil {
		credential = graphql.OAuthCredentialData{
			URL:          in.Oauth.URL,
			ClientID:     in.Oauth.ClientID,
			ClientSecret: in.Oauth.ClientSecret,
		}
	} else if in.CertificateOAuth != nil {
		credential = graphql.CertificateOAuthCredentialData{
			ClientID:    in.CertificateOAuth.ClientID,
			Certificate: in.CertificateOAuth.Certificate,
			URL:         in.CertificateOAuth.URL,
		}
	} else if in.BearerToken != nil {
		credential = graphql.BearerTokenCredentialData{
			Token: in.BearerToken.Token,
		}
	}

	return credential
}
