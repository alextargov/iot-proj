# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IoT automation platform with a Kubernetes-native architecture for managing IoT devices and widgets. The system deploys on k3d clusters with Istio service mesh.

## Architecture

Three main components in `components/`:

- **orchestrator** (Go): GraphQL API server handling authentication, device/widget management, and K8s scheduling. Uses gqlgen for GraphQL code generation.
- **controller** (Go): Kubernetes operator built with kubebuilder that manages Application CRDs for deploying widget code as containerized workloads.
- **dashboard** (Angular 21): Web UI with Apollo Client for GraphQL, custom Blockly wrapper for visual programming, and Monaco editor.

Database: PostgreSQL with golang-migrate for migrations (`components/database/migrations/`).

Deployment: Helm charts in `charts/` for k3d/Kubernetes deployment.

## Common Commands

### Full Stack (Docker/k3d)
```bash
./scripts/install.sh                    # Create k3d cluster, install Istio, deploy all components
```
Access: http://localhost:8080 (UI), http://localhost:8080/graphql (API)

Default credentials: `alex` / `pass`

### Orchestrator (Backend)
```bash
cd components/orchestrator
./run.sh                                # Build and run locally
./hack/run.sh                           # Full local dev with ephemeral Postgres + k3d
./gqlgen.sh                             # Regenerate GraphQL code after schema changes
```

### Dashboard (Frontend)
```bash
cd components/dashboard
npm start                               # Dev server on http://localhost:4200
npm run start:proxy                     # Dev server with API proxy
npm run generate-types                  # Regenerate GraphQL types (requires orchestrator running)
npm run lint                            # ESLint
npm run format                          # Prettier
npm test                                # Karma tests
```

### Controller (Kubernetes Operator)
```bash
cd components/controller
make build                              # Build operator binary
make run                                # Run operator locally
make manifests                          # Generate CRDs and RBAC
make generate                           # Generate DeepCopy methods
make test                               # Run tests with envtest
make install                            # Install CRDs to cluster
```

### Database
```bash
# Migrations use golang-migrate
migrate -path components/database/migrations -database "$CONNECTION_STRING" up
migrate -path components/database/migrations -database "$CONNECTION_STRING" down
```

## GraphQL Schema Workflow

1. Edit `components/orchestrator/pkg/graphql/schema.graphql`
2. Run `./gqlgen.sh` in orchestrator to regenerate Go code
3. Implement resolvers in `components/orchestrator/internal/domain/*/resolver.go`
4. With orchestrator running, run `npm run generate-types` in dashboard to update TypeScript types

## Key Paths

- GraphQL schema: `components/orchestrator/pkg/graphql/schema.graphql`
- GraphQL config: `components/orchestrator/pkg/graphql/gqlgen.yml`
- Domain logic: `components/orchestrator/internal/domain/{device,widget,host,user,datamodel,metric,alert}/`
- Application CRD: `components/controller/api/v1alpha1/application_types.go`
- DB migrations: `components/database/migrations/`
- Frontend GraphQL queries: `components/dashboard/src/app/shared/graphql/*.graphql`

## Orchestrator Domain Structure

Each domain (device, widget, metric, etc.) follows a consistent pattern:

```
internal/domain/{name}/
├── entity.go       # Database entity struct with `db:` tags
├── converter.go    # Converts between Entity ↔ Model ↔ GraphQL
├── repository.go   # Database operations using repo.* helpers
├── service.go      # Business logic, tenant handling
└── resolver.go     # GraphQL resolver implementation
```

**Key patterns:**
- **Tenant isolation**: Services load tenant from context via `tenant.LoadFromContext(ctx)`
- **Transactions**: Resolvers wrap operations in `r.transact.Begin()` / `tx.Commit()`
- **Repository helpers**: Use `repo.NewListerWithEmbeddedTenant()`, `repo.NewSingleGetterGlobal()`, etc.
- **Nullable fields**: Use `sql.NullString` in entities, `repo.NewNullableString()` / `repo.StringPtrFromNullableString()` for conversion

**Adding a new domain:**
1. Create entity with `db:` tags matching table columns
2. Create converter with `ToEntity()`, `FromEntity()`, `ToGraphQL()`, `InputFromGraphQL()`
3. Create repository using `repo.*` helpers
4. Create service with business logic
5. Create resolver, wire into `root_resolver.go`
6. Add to GraphQL schema, run `./gqlgen.sh`

## Environment Variables (Orchestrator)

Prefix: `APP_`
- `APP_DB_USER`, `APP_DB_PASSWORD`, `APP_DB_NAME` - Database credentials
- `APP_CONFIGURATION_FILE` - Path to config YAML
- `APP_APPLICATIONS_NAMESPACE` - K8s namespace for Application CRs
- `APP_JWKS_ENDPOINT` - JWT key source (default: `file://hack/default-jwks.json`)
- `APP_AUTH_SECRET`, `APP_AUTH_ISS`, `APP_AUTH_EXP` - JWT signing secret, issuer, expiry (hours)
- `APP_DEVICE_CA_CERT`, `APP_DEVICE_CA_KEY` - PEM file paths for the device mTLS CA. If unset, an ephemeral in-memory CA is generated at startup (dev only)
- `APP_DEVICE_CERT_VALIDITY_DAYS` - Issued device certificate validity (default 365)

## Authorization (RBAC)

Users have one role stored in `users.role`: `ADMIN` > `OPERATOR` > `VIEWER` (hierarchical).

- **Enforcement**: the `@hasRole(minimum: Role!)` GraphQL directive (declared in `schema.graphql`, implemented in `internal/domain/directives.go`, wired in `cmd/orchestrator/main.go`). All write mutations require `OPERATOR`; `updateUserRole` requires `ADMIN`; queries and `me` are open to any authenticated user.
- The directive reads the authenticated `*model.User` from context (`user.UserContextKey`) — the JWT `Role` claim is for frontend convenience, not the source of truth for enforcement.
- **Defaults**: existing users were backfilled to `ADMIN` (migration 11); new self-registrations default to `VIEWER`.
- **Tenant note**: tenant ID == the user's UUID (see migration 9); roles are orthogonal to tenant scoping.
- **Frontend**: `AuthService.hasRole(min)` + `RoleGuard` (route `data.minimumRole`); write UI is gated for `VIEWER`.

## Device Certificate Management (mTLS)

The platform can issue managed mTLS client certificates to devices (`internal/certmanager`):

```graphql
mutation { generateDeviceCertificate(deviceId: "uuid") { certificate privateKey caCertificate serial expiresAt } }
mutation { revokeDeviceCertificate(deviceId: "uuid") }
```

- The private key is returned **only** at issuance. Cert material is stored on the `devices` row (migration 12).
- `setDeviceOperation` presents the issued cert for mTLS to the device endpoint via `AuthenticatedHTTPClient` (`internal/domain/device/http_client.go`).
- This is distinct from `CertificateOAuthCredentialData` (a client cert used to fetch an OAuth token from the device's auth server).

## Device Communication Architecture

The platform supports bidirectional communication between the server and IoT devices.

### Device → Server (Metrics Upload)

Devices send metrics to the server via REST API. Supports dual authentication:

```bash
# Option 1: Device token auth (device authenticates itself)
curl -X POST http://localhost:8080/api/v1/devices/{deviceId}/metrics \
  -H "Authorization: Device <device-token>" \
  -H "Content-Type: application/json" \
  -d '[{"metricName": "temperature", "metricValue": 25.5, "unit": "°C"}]'

# Option 2: JWT auth (user/admin records on behalf of device)
curl -X POST http://localhost:8080/api/v1/devices/{deviceId}/metrics \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '[{"metricName": "temperature", "metricValue": 25.5, "unit": "°C"}]'

# Generate device token via GraphQL
mutation { generateDeviceToken(deviceId: "device-uuid") }
```

**Key files:**
- REST handler: `components/orchestrator/internal/handlers/metrics.go`
- Token storage: `devices.communication_token` column (migration 8)
- Token validation: `GetByToken()` in device repository/service
- Dual-auth logic: `authenticateRequest()` in metrics.go

### Server → Device (Commands)

Server sends commands to devices via `setDeviceOperation` mutation, using the device's configured authentication:

```graphql
mutation { setDeviceOperation(id: "device-uuid", op: TURN_ON) { id status } }
```

**Supported auth types** (stored in `device.auth.credentialForDevice`):
- **Basic Auth**: Username/password sent as `Authorization: Basic <base64>`
- **Bearer Token**: Static token sent as `Authorization: Bearer <token>`
- **OAuth (Client Credentials)**: Fetches token from OAuth URL, then uses Bearer
- **mTLS Certificate OAuth**: Uses client certificate for token fetch

**Key files:**
- HTTP client with auth: `components/orchestrator/internal/domain/device/http_client.go`
- Operation resolver: `components/orchestrator/internal/domain/device/resolver.go` (`SetDeviceOperation`)
- Host endpoints: `device.host.turnOnEndpoint`, `device.host.turnOffEndpoint`

### Real-time Updates (WebSocket Subscriptions)

Dashboard receives live metric updates via GraphQL subscriptions:

```graphql
subscription { metricRecorded(deviceId: "device-uuid") { metricName metricValue } }
```

**Key files:**
- PubSub manager: `components/orchestrator/internal/pubsub/pubsub.go`
- Subscription resolver: `components/orchestrator/internal/domain/root_resolver.go` (`MetricRecorded`)
- WebSocket config: `components/orchestrator/cmd/orchestrator/main.go` (transport.Websocket)
- Frontend WebSocket link: `components/dashboard/src/app/shared/graphql/graphql.module.ts`

## Dashboard Architecture

### Angular 21 with NgModules
The dashboard uses Angular 21 with traditional NgModules (not standalone components). All components must have `standalone: false` in their decorators.

### Key Dependencies
- **Angular Material 21**: UI components. Import standalone components directly (e.g., `Gridster`, `GridsterItem` from angular-gridster2)
- **Apollo Angular 13**: GraphQL client. Uses `provideApollo()` in app config, not `ApolloModule`
- **Blockly 10.4**: Visual block programming. Custom wrapper at `src/app/shared/blockly/`
- **angular-gridster2 21**: Dashboard grid layout. Import `Gridster` and `GridsterItem` components directly

### Blockly Integration
Custom Blockly wrapper replaces ngx-blockly (which only supported Angular 19):

- **Location**: `src/app/shared/blockly/`
- **Key files**:
  - `blockly-utils.ts`: CustomBlock base class, Category, Separator, standard categories, `registerCustomBlocks()`
  - `blockly.component.ts`: Angular wrapper component (`<ngx-blockly>`)
  - `blockly.module.ts`: NgModule exporting BlocklyComponent

### Custom Blocks
Located in `src/app/shared/blocks/`:
- `dynamic-dropdown.ts`: Device selection dropdowns
- `aggregation.ts`: Data aggregation blocks
- `operation.ts`: Device operation blocks
- `repeatFor.ts`: Interval repeat blocks

Custom blocks extend `CustomBlock` and must:
1. Set `this.class = ClassName` in constructor
2. Read config from `obj` parameter (second constructor arg): `const config = obj || (args[0] ?? {})`
3. Implement `defineBlock()` and `toJavaScriptCode()`

### Toolbox Configuration
Use JSON format (not XML) for Blockly 10+ compatibility:
```typescript
const toolbox = new BlocklyToolbox();
toolbox.nodes = [LOGIC_CATEGORY, new Category('Custom', '#color', customBlocks)];
this.config.toolbox = toolbox.toJSON();  // Not toXML()
```

### Module Structure
- `SharedModule`: Common components, pipes, directives
- `CoreModule`: Services, guards, interceptors
- `MaterialModule`: Re-exports Angular Material modules
- Feature modules: `DashboardModule`, `WidgetsModule`, `LoginModule`, etc.