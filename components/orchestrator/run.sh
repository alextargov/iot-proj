#!/bin/bash

# Configuration
export APP_APPLICATIONS_NAMESPACE="ns"

# JWT Configuration (must match auth.go defaults or env vars)
SECRET_KEY="${APP_AUTH_SECRET:-veryBigSecret}"
ISSUER="${APP_AUTH_ISS:-orchestrator}"
EXPIRATION_HOURS="${APP_AUTH_EXP:-4}"

# Default username for token generation
DEFAULT_USERNAME="${JWT_USERNAME:-alex}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate JWT token
generate_jwt() {
    local username="$1"
    local secret="$2"
    local issuer="$3"
    local exp_hours="$4"

    # Calculate timestamps
    local now=$(date +%s)
    local exp=$((now + exp_hours * 3600))

    # Create header (HS256)
    local header='{"alg":"HS256","typ":"JWT"}'
    local header_base64=$(echo -n "$header" | base64 | tr '+/' '-_' | tr -d '=')

    # Create payload
    local payload=$(cat <<EOF
{"Username":"${username}","exp":${exp},"iat":${now},"iss":"${issuer}"}
EOF
)
    local payload_base64=$(echo -n "$payload" | base64 | tr '+/' '-_' | tr -d '=')

    # Create signature
    local signature=$(echo -n "${header_base64}.${payload_base64}" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr '+/' '-_' | tr -d '=')

    # Return complete token
    echo "${header_base64}.${payload_base64}.${signature}"
}

# Function to display token info
show_token_info() {
    local token="$1"
    local username="$2"

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  JWT Token Generated Successfully${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Username:${NC} $username"
    echo -e "${BLUE}Issuer:${NC} $ISSUER"
    echo -e "${BLUE}Expires:${NC} $EXPIRATION_HOURS hours from now"
    echo ""
    echo -e "${YELLOW}Token:${NC}"
    echo "$token"
    echo ""
    echo -e "${GREEN}───────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Usage Examples:${NC}"
    echo ""
    echo -e "${YELLOW}cURL:${NC}"
    echo "curl -X POST http://localhost:8080/graphql \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -H 'Authorization: Bearer $token' \\"
    echo "  -d '{\"query\": \"{ devices { id name } }\"}'"
    echo ""
    echo -e "${YELLOW}Bruno/Insomnia Header:${NC}"
    echo "Authorization: Bearer $token"
    echo ""
    echo -e "${YELLOW}Export as environment variable:${NC}"
    echo "export AUTH_TOKEN='$token'"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    token|--token|-t)
        # Generate token only (no server start)
        USERNAME="${2:-$DEFAULT_USERNAME}"
        TOKEN=$(generate_jwt "$USERNAME" "$SECRET_KEY" "$ISSUER" "$EXPIRATION_HOURS")
        show_token_info "$TOKEN" "$USERNAME"
        exit 0
        ;;
    help|--help|-h)
        echo "Usage: ./run.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  (no args)     Build and run the orchestrator server"
        echo "  token [user]  Generate a JWT token for the given username (default: alex)"
        echo "  help          Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  APP_AUTH_SECRET    JWT secret key (default: veryBigSecret)"
        echo "  APP_AUTH_ISS       JWT issuer (default: orchestrator)"
        echo "  APP_AUTH_EXP       Token expiration in hours (default: 4)"
        echo "  JWT_USERNAME       Default username for token (default: alex)"
        echo ""
        echo "Examples:"
        echo "  ./run.sh                    # Start the server"
        echo "  ./run.sh token              # Generate token for 'alex'"
        echo "  ./run.sh token admin        # Generate token for 'admin'"
        echo "  JWT_USERNAME=john ./run.sh token  # Generate token for 'john'"
        exit 0
        ;;
    *)
        # Default: build and run server
        echo -e "${BLUE}Building orchestrator...${NC}"
        go build -v -o main ./cmd/orchestrator/main.go

        if [ $? -eq 0 ]; then
            # Generate and display a token before starting
            TOKEN=$(generate_jwt "$DEFAULT_USERNAME" "$SECRET_KEY" "$ISSUER" "$EXPIRATION_HOURS")
            show_token_info "$TOKEN" "$DEFAULT_USERNAME"

            echo -e "${GREEN}Starting orchestrator server...${NC}"
            echo -e "${BLUE}GraphQL Playground:${NC} http://localhost:8080/"
            echo -e "${BLUE}GraphQL Endpoint:${NC}   http://localhost:8080/graphql"
            echo ""
            ./main
        else
            echo -e "${RED}Build failed!${NC}"
            exit 1
        fi
        ;;
esac
