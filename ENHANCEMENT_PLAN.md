# IoT Automation Platform - Enhancement Plan

## Project Overview

This IoT automation platform is a Kubernetes-native system for managing IoT devices and widgets. It features:
- **Orchestrator** (Go): GraphQL API server with authentication, device/widget management, and K8s scheduling
- **Controller** (Go): Kubernetes operator managing Application CRDs for deploying widget code
- **Dashboard** (Angular 21): Web UI with Apollo Client, Blockly visual programming, and Monaco editor
- **Database**: PostgreSQL with time-series metrics storage

---

## Table of Contents

1. [Current Feature Status](#current-feature-status)
2. [Feature Enhancements](#feature-enhancements)
3. [Technical Debt](#technical-debt)
4. [Architecture & Scaling](#architecture--scaling)
5. [Infrastructure & Quality](#infrastructure--quality)
6. [Security](#security)
7. [Success Metrics](#success-metrics)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Current Feature Status

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Dashboard home page | ✅ **Implemented** | Overview cards with device/widget counts and status breakdown |
| 2 | Device status indicators | ✅ **Implemented** | Real-time status badges (Active, Initial, Error, Unreachable) |
| 3 | Widget execution logs | ❌ **Not Implemented** | `last_executed_at` exists but no execution history |
| 4 | Duplicate device/widget | ✅ **Implemented** | Clone functionality via `history.state?.duplicate` |
| 5 | Export/Import | ❌ **Not Implemented** | No JSON/YAML import/export |
| 6 | Device groups/tags | ⚠️ **Partial** | Tags exist (JSONB), no dedicated groups |
| 7 | Widget templates | ✅ **Implemented** | 6 pre-built templates with categories |
| 8 | Scheduling | ✅ **Implemented** | Cron-based via `robfig/cron/v3` |
| 9 | Data visualization | ✅ **Implemented** | Line charts, gauges, stat cards via Chart.js |
| 10 | Notifications | ✅ **Implemented** | Email (SMTP) and webhook notifications |
| 11 | Dashboard builder | ✅ **Implemented** | Drag-and-drop with angular-gridster2 |
| 12 | Device simulator | ❌ **Not Implemented** | Manual device creation only |
| 13 | Rule engine | ❌ **Not Implemented** | Only alert rules, no general rule engine |
| 14 | Multi-tenant support | ✅ **Implemented** | Tenant context with scoped data |
| 15 | API integrations | ⚠️ **Partial** | GraphQL API only, no external connectors |
| 16 | WebSocket support | ✅ **Implemented** | Real-time metric subscriptions |
| 17 | Data persistence | ✅ **Implemented** | Time-series in PostgreSQL with aggregations |
| 18 | Device discovery | ❌ **Not Implemented** | No auto-discovery mechanism |

**Summary**: 11 implemented, 2 partial, 5 not implemented

---

## Feature Enhancements

### Quick Wins (1-2 weeks each)

#### Widget Execution Logs
**Priority**: High | **Effort**: Low | **Impact**: High

Track and display widget execution history for debugging and monitoring.

**Backend Changes**:
- New migration: `widget_executions` table
  ```sql
  CREATE TABLE widget_executions (
      id UUID PRIMARY KEY,
      widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES users(id),
      status VARCHAR(32) NOT NULL, -- 'SUCCESS', 'FAILURE', 'TIMEOUT'
      started_at TIMESTAMP NOT NULL,
      finished_at TIMESTAMP,
      duration_ms INTEGER,
      output TEXT,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX idx_widget_executions_widget ON widget_executions(widget_id, started_at DESC);
  ```
- Add `WidgetExecution` domain in orchestrator
- GraphQL: `widgetExecutions(widgetId: ID!, first: Int, after: String): WidgetExecutionPage`
- Update scheduler to log executions

**Frontend Changes**:
- New `widget-executions.component.ts` with execution history table
- Status indicators (success/failure icons)
- Expandable rows for output/error details
- Add tab to widget details page

---

#### Export/Import Configuration
**Priority**: High | **Effort**: Low | **Impact**: Medium

Enable backup, sharing, and migration of configurations.

**Backend Changes**:
- New REST endpoints or GraphQL mutations:
  ```graphql
  type Query {
      exportDevices(ids: [ID!]): ExportData!
      exportWidgets(ids: [ID!]): ExportData!
      exportDashboard(id: ID!): ExportData!
  }
  type Mutation {
      importDevices(data: JSON!): ImportResult!
      importWidgets(data: JSON!): ImportResult!
      importDashboard(data: JSON!): ImportResult!
  }
  ```
- Export format: JSON with version metadata for compatibility

**Frontend Changes**:
- Export buttons on list views (single and bulk)
- Import dialog with file upload and preview
- Conflict resolution options (skip, overwrite, rename)

---

### Medium Effort (2-4 weeks each)

#### Device Groups
**Priority**: Medium | **Effort**: Medium | **Impact**: High

Hierarchical device organization beyond flat tags.

**Backend Changes**:
- New migration: `device_groups` table
  ```sql
  CREATE TABLE device_groups (
      id UUID PRIMARY KEY,
      tenant_id UUID REFERENCES users(id),
      parent_id UUID REFERENCES device_groups(id),
      name VARCHAR(128) NOT NULL,
      description TEXT,
      color VARCHAR(7), -- hex color
      icon VARCHAR(32),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE device_group_members (
      id UUID PRIMARY KEY,
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      group_id UUID REFERENCES device_groups(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(device_id, group_id)
  );
  ```
- GraphQL types: `DeviceGroup`, `CreateDeviceGroupInput`, etc.
- Queries: `deviceGroups`, `deviceGroup(id)`, `devicesInGroup(groupId)`
- Mutations: `createDeviceGroup`, `updateDeviceGroup`, `addDeviceToGroup`, `removeDeviceFromGroup`

**Frontend Changes**:
- Device groups sidebar/tree component
- Drag-and-drop devices into groups
- Group CRUD dialogs
- Filter device list by group
- Bulk actions on groups

---

#### Device Simulator
**Priority**: Medium | **Effort**: Medium | **Impact**: High

Test automations without physical hardware.

**Backend Changes**:
- New domain: `simulator`
- Simulated device type with configurable metric generation
- Patterns: constant, random, sine wave, step function, realistic sensor noise
  ```graphql
  type SimulatorConfig {
      metricName: String!
      pattern: SimulatorPattern! # CONSTANT, RANDOM, SINE, STEP, REALISTIC
      minValue: Float!
      maxValue: Float!
      intervalSeconds: Int!
      noisePercent: Float
  }
  ```
- Virtual device endpoints that respond to operations

**Frontend Changes**:
- Simulator configuration dialog
- Real-time preview of generated data
- Start/stop/pause controls
- Multiple simultaneous simulators
- Visual pattern preview (mini chart)

---

#### Additional Widget Templates
**Priority**: Low | **Effort**: Low | **Impact**: Medium

Expand template library for common IoT scenarios.

**New Templates**:
1. **Energy Monitor** - Track power consumption, calculate costs
2. **Motion Detector** - Presence detection with cooldown
3. **Data Logger** - Periodic metric recording to file/database
4. **Device Orchestrator** - Coordinate multiple devices (e.g., smart home scenes)
5. **Weather Reactor** - React to weather API data
6. **Time-based Automation** - Sunrise/sunset, working hours
7. **Anomaly Detector** - Alert on unusual patterns
8. **Rate Limiter** - Throttle device operations

**Implementation**:
- Add to `widget-templates.ts`
- Include Blockly workspace XML
- Provide documentation/examples

---

### Larger Features (1-2 months each)

#### Visual Rule Engine
**Priority**: High | **Effort**: High | **Impact**: Very High

Simplified automation for non-programmers (alternative to Blockly).

**Concept**: IF-THEN rules with visual builder
```
WHEN [device] [metric] [operator] [value]
AND/OR [additional conditions]
THEN [action] [target device] [parameters]
WAIT [duration] (optional)
```

**Backend Changes**:
- New migration: `automation_rules` table
  ```sql
  CREATE TABLE automation_rules (
      id UUID PRIMARY KEY,
      tenant_id UUID REFERENCES users(id),
      name VARCHAR(128) NOT NULL,
      description TEXT,
      enabled BOOLEAN DEFAULT true,
      priority INT DEFAULT 0,
      trigger_type VARCHAR(32), -- 'METRIC', 'SCHEDULE', 'EVENT'
      conditions JSONB NOT NULL,
      actions JSONB NOT NULL,
      cooldown_seconds INT DEFAULT 60,
      last_triggered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- Rule evaluation engine (separate from alert rules)
- Action types: device operation, notification, webhook, set variable, delay

**Frontend Changes**:
- Visual rule builder with drag-and-drop
- Condition groups (AND/OR logic)
- Action sequence builder
- Rule testing/simulation mode
- Rule enable/disable toggle
- Execution history

---

#### External API Integrations
**Priority**: Medium | **Effort**: High | **Impact**: High

Connect to external services and protocols.

**Protocol Support**:
- MQTT broker integration (subscribe/publish)
- CoAP support for constrained devices
- Modbus TCP/RTU for industrial devices
- HTTP polling for REST APIs

**Cloud Integrations**:
- AWS IoT Core connector
- Azure IoT Hub connector
- Google Cloud IoT connector
- Custom webhook endpoints

**Home Automation**:
- Home Assistant integration
- IFTTT webhooks
- Zigbee2MQTT bridge
- Matter/Thread support (future)

**Implementation Approach**:
- Plugin architecture for connectors
- Credential management (secure storage)
- Connection health monitoring
- Message transformation/mapping

---

#### Device Discovery
**Priority**: Low | **Effort**: High | **Impact**: Medium

Auto-discover devices on local network.

**Discovery Methods**:
1. **mDNS/Bonjour** - Service discovery
2. **SSDP/UPnP** - Universal Plug and Play
3. **Network scan** - IP range scanning with port detection
4. **Bluetooth LE** - BLE device scanning (requires agent)

**Backend Changes**:
- Discovery service with pluggable scanners
- Background discovery jobs
- Device fingerprinting (identify device type)
- Pending devices queue for approval

**Frontend Changes**:
- Discovery wizard
- Network scan configuration
- Discovered devices list with add/ignore actions
- Device type detection display

---

#### Advanced Analytics & ML
**Priority**: Low | **Effort**: Very High | **Impact**: High

Intelligent insights from device data.

**Features**:
1. **Anomaly Detection** - Identify unusual patterns automatically
2. **Predictive Maintenance** - Predict device failures
3. **Usage Analytics** - Device utilization reports
4. **Trend Analysis** - Long-term pattern recognition
5. **Correlation Discovery** - Find relationships between metrics

**Implementation**:
- Consider TimescaleDB or InfluxDB for time-series optimization
- ML model integration (TensorFlow Lite, ONNX)
- Scheduled analysis jobs
- Dashboard widgets for insights

---

## Technical Debt

### Frontend Code Organization

| Issue | Current State | Target State | Priority |
|-------|--------------|--------------|----------|
| Shared types scattered | Types defined in component files | Dedicated `types/` directory with domain-specific files | High |
| Inconsistent error handling | Mix of try/catch, subscribe error callbacks | Centralized error service with toast notifications | High |
| Loading state management | Manual boolean flags per component | Shared loading service or NgRx state | Medium |
| Component size | Some components > 500 lines | Split into smart/dumb components, max 300 lines | Medium |
| Unused imports | Various unused Angular imports | Clean up with `ng lint --fix` | Low |

**Action Items**:
1. Create `src/app/shared/types/` with `device.types.ts`, `widget.types.ts`, etc.
2. Implement `ErrorHandlerService` with centralized error processing
3. Add `LoadingService` for global loading state
4. Audit and split large components

---

### Backend Improvements

| Issue | Current State | Target State | Priority |
|-------|--------------|--------------|----------|
| Repository pattern inconsistency | Some repos use helpers, some don't | Consistent use of `repo.*` helpers everywhere | High |
| Error messages | Generic "internal error" responses | Structured errors with codes (e.g., `DEVICE_NOT_FOUND`) | High |
| Input validation | Validation in resolvers | Dedicated validation middleware | Medium |
| Logging | Basic `log.Printf` | Structured logging with request context | Medium |
| Configuration | Environment variables only | Support config files + env vars with validation | Low |

**Action Items**:
1. Audit all repositories for consistent helper usage
2. Create `errors` package with typed errors and codes
3. Add `go-playground/validator` for input validation
4. Migrate to `zerolog` or `zap` for structured logging

---

### Database

| Issue | Current State | Target State | Priority |
|-------|--------------|--------------|----------|
| Missing indexes | Only basic indexes exist | Query-pattern-based indexes | High |
| Metrics table growth | Unbounded growth | Partitioning by time (monthly) | High |
| Hard deletes | Physical deletes | Soft deletes with `deleted_at` | Medium |
| Connection pooling | Default settings | Tuned pool size based on load | Medium |
| Query analysis | No visibility | pg_stat_statements enabled | Low |

**Recommended Indexes**:
```sql
-- Device queries by tenant and status
CREATE INDEX idx_devices_tenant_status ON devices(user_id, status);

-- Alert events by time range
CREATE INDEX idx_alert_events_time ON alert_events(triggered_at DESC) WHERE status = 'TRIGGERED';

-- Dashboard widgets by layout
CREATE INDEX idx_dashboard_widgets_layout ON dashboard_widgets(dashboard_layout_id, grid_y, grid_x);
```

**Metrics Table Partitioning**:
```sql
-- Convert to partitioned table
CREATE TABLE device_metrics_new (
    LIKE device_metrics INCLUDING ALL
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions
CREATE TABLE device_metrics_2026_08 PARTITION OF device_metrics_new
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

---

### Documentation

| Gap | Description | Priority |
|-----|-------------|----------|
| API documentation | GraphQL schema lacks descriptions | High |
| ADRs | No architecture decision records | Medium |
| Onboarding guide | No developer setup guide | Medium |
| Runbook | No operational procedures | Medium |
| Code comments | Sparse comments in complex logic | Low |

**Action Items**:
1. Add GraphQL schema descriptions for Playground
2. Create `docs/adr/` with template and initial decisions
3. Write `CONTRIBUTING.md` with setup instructions
4. Create `docs/runbook.md` for common operations

---

## Architecture & Scaling

### Scaling the Metrics Pipeline

**Current State**: Direct REST → PostgreSQL inserts

**Challenge**: High-volume metric ingestion (>10k metrics/sec) will overwhelm the database

**Solution Phases**:

```
Phase 1 (Current)          Phase 2 (Medium Scale)         Phase 3 (High Scale)
┌─────────┐               ┌─────────┐                    ┌─────────┐
│ Device  │               │ Device  │                    │ Device  │
└────┬────┘               └────┬────┘                    └────┬────┘
     │                         │                              │
     ▼                         ▼                              ▼
┌─────────┐               ┌─────────┐                    ┌─────────┐
│REST API │               │REST API │                    │REST API │
└────┬────┘               └────┬────┘                    └────┬────┘
     │                         │                              │
     │                         ▼                              ▼
     │                    ┌─────────┐                    ┌─────────┐
     │                    │  Redis  │                    │  Kafka  │
     │                    │ Buffer  │                    │         │
     │                    └────┬────┘                    └────┬────┘
     │                         │                              │
     ▼                         ▼                              ▼
┌─────────┐               ┌─────────┐                    ┌─────────┐
│PostgreSQL│              │PostgreSQL│                   │TimescaleDB│
└─────────┘               └─────────┘                    └─────────┘
```

**Phase 2: Buffered Writes (1k-10k metrics/sec)**
- Add Redis as write buffer
- Batch inserts every N seconds or M records
- Configurable flush intervals

**Phase 3: Stream Processing (10k+ metrics/sec)**
- Kafka/NATS for ingestion
- Consumer workers for processing
- TimescaleDB or ClickHouse for analytics
- Metric downsampling for historical data

---

### Multi-Region Deployment

**Architecture for Global Scale**:

```
                           ┌──────────────┐
                           │   Global     │
                           │   DNS/LB     │
                           └──────┬───────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   US-West     │         │   EU-Central  │         │   AP-South    │
│   K8s Cluster │         │   K8s Cluster │         │   K8s Cluster │
├───────────────┤         ├───────────────┤         ├───────────────┤
│ • Orchestrator│◄───────►│ • Orchestrator│◄───────►│ • Orchestrator│
│ • Controller  │         │ • Controller  │         │ • Controller  │
│ • Dashboard   │         │ • Dashboard   │         │ • Dashboard   │
├───────────────┤         ├───────────────┤         ├───────────────┤
│   PostgreSQL  │◄───────►│   PostgreSQL  │◄───────►│   PostgreSQL  │
│   (Primary)   │  Sync   │   (Replica)   │  Sync   │   (Replica)   │
└───────────────┘         └───────────────┘         └───────────────┘
```

**Considerations**:
1. **Database**: PostgreSQL streaming replication or CockroachDB for multi-region
2. **Edge Processing**: Local metric processing to reduce latency
3. **CDN**: Dashboard assets via CloudFlare/Fastly
4. **Federation**: Kubernetes federation for unified management

---

### Plugin Architecture

**Goal**: Enable extensibility without core changes

**Plugin Types**:

| Plugin Type | Purpose | Interface |
|-------------|---------|-----------|
| Device Connector | Protocol adapters (MQTT, Modbus, etc.) | `Connector` interface |
| Notification Channel | Alert delivery methods | `Notifier` interface |
| Dashboard Widget | Custom visualization components | Angular component registry |
| Data Transformer | Metric processing/enrichment | `Transformer` interface |
| Authentication Provider | External auth (OIDC, SAML) | `AuthProvider` interface |

**Example: Connector Interface**:
```go
type Connector interface {
    // Metadata
    Name() string
    Version() string
    ConfigSchema() json.RawMessage
    
    // Lifecycle
    Init(config json.RawMessage) error
    Start(ctx context.Context) error
    Stop() error
    
    // Operations
    SendCommand(deviceID string, command Command) error
    Subscribe(deviceID string, handler MetricHandler) error
}
```

**Plugin Registry**:
- Plugins registered at startup
- Hot-reload support for development
- Sandboxed execution (optional)
- Health monitoring per plugin

---

## Infrastructure & Quality

### Testing Infrastructure

| Test Type | Current State | Target | Tools |
|-----------|--------------|--------|-------|
| Unit Tests | Partial coverage | >80% coverage | Go testing, Karma/Jest |
| Integration Tests | None | API contract tests | Testcontainers, Apollo testing |
| E2E Tests | None | Critical path coverage | Cypress or Playwright |
| Load Tests | None | Metrics pipeline stress test | k6 or Locust |
| Chaos Tests | None | K8s resilience validation | Chaos Mesh or Litmus |

**Priority Actions**:
1. Set up CI pipeline with coverage gates (80% minimum)
2. Add Testcontainers for database integration tests
3. Create Cypress E2E suite for login → create device → create widget flow
4. Implement k6 load test for `/api/v1/devices/{id}/metrics` endpoint

---

### Observability

**Three Pillars**:

```
┌─────────────────────────────────────────────────────────────┐
│                        Grafana                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │   Metrics   │  │    Logs     │  │   Traces    │        │
│   │  Dashboard  │  │   Search    │  │   Explorer  │        │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└──────────┼────────────────┼────────────────┼───────────────┘
           │                │                │
           ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Prometheus  │ │    Loki     │ │    Tempo     │
    │   (Metrics)  │ │   (Logs)    │ │  (Traces)    │
    └──────────────┘ └──────────────┘ └──────────────┘
           ▲                ▲                ▲
           │                │                │
    ┌──────┴────────────────┴────────────────┴──────┐
    │              OpenTelemetry Collector          │
    └───────────────────────┬───────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │Orchestrator│ │Controller│ │Dashboard │
        └──────────┘  └──────────┘  └──────────┘
```

**Implementation**:
1. Add OpenTelemetry SDK to orchestrator and controller
2. Configure OTLP exporter to collector
3. Deploy Prometheus, Loki, Tempo, Grafana stack
4. Create dashboards for:
   - API latency and error rates
   - Metric ingestion throughput
   - Widget execution stats
   - K8s resource utilization

---

### Performance Optimization

| Area | Optimization | Expected Impact |
|------|--------------|-----------------|
| Database | Connection pooling (pgbouncer) | 2-3x connection efficiency |
| Database | Query result caching (Redis) | 10x read performance |
| GraphQL | Query complexity limits | Prevent resource exhaustion |
| GraphQL | DataLoader for N+1 prevention | 5-10x query performance |
| API | Response compression (gzip) | 70% bandwidth reduction |
| Frontend | Code splitting | 40% faster initial load |
| Frontend | Service worker caching | Offline capability |

**Quick Wins**:
```go
// Add DataLoader for batching device lookups
loader := dataloader.NewBatchedLoader(func(ctx context.Context, keys dataloader.Keys) []*dataloader.Result {
    deviceIDs := make([]string, len(keys))
    for i, key := range keys {
        deviceIDs[i] = key.String()
    }
    devices, _ := deviceRepo.GetByIDs(ctx, deviceIDs)
    // ... map results
})
```

---

## Security

### Authentication & Authorization

| Feature | Current State | Target | Priority |
|---------|--------------|--------|----------|
| User Auth | Basic JWT | OAuth2/OIDC support | High |
| Device Auth | Token-based | Certificate-based (mTLS) option | Medium |
| RBAC | Single role | Role-based (Admin, Operator, Viewer) | High |
| API Keys | None | Service account API keys | Medium |
| MFA | None | TOTP/WebAuthn support | Low |

**RBAC Model**:
```
Admin:      Full access (create, read, update, delete all)
Operator:   Manage devices/widgets, view dashboards
Viewer:     Read-only access to dashboards and metrics
Device:     Device token scope (metrics only)
```

---

### API Security

| Control | Implementation | Priority |
|---------|---------------|----------|
| Rate Limiting | Token bucket per user/IP | High |
| Input Validation | GraphQL directive validation | High |
| Query Depth Limit | Max depth: 10 | High |
| Audit Logging | Log all mutations | Medium |
| CORS | Strict origin whitelist | Medium |
| CSP | Content Security Policy headers | Medium |

**Rate Limiting Example**:
```go
// Per-user rate limit: 100 requests/minute
limiter := rate.NewLimiter(rate.Every(time.Minute/100), 10)

func RateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID := getUserID(r)
        if !getLimiter(userID).Allow() {
            http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

---

### Data Security

| Control | Implementation | Priority |
|---------|---------------|----------|
| Encryption at Rest | PostgreSQL TDE or disk encryption | High |
| Encryption in Transit | TLS 1.3 everywhere | High |
| Secrets Management | HashiCorp Vault or K8s secrets | High |
| Data Retention | Configurable retention policies | Medium |
| PII Handling | Identify and protect PII fields | Medium |

---

## Success Metrics

### Feature Success Metrics

| Feature | Metric | Target | Measurement |
|---------|--------|--------|-------------|
| Widget Execution Logs | Debug time reduction | 50% | User survey |
| Export/Import | Data recovery time | < 5 min | Measured test |
| Device Groups | Devices organized in groups | > 80% | Database query |
| Device Simulator | Test coverage improvement | > 70% | CI metrics |
| Rule Engine | Non-technical user adoption | > 30% | User analytics |
| API Integrations | External protocol connections | 3+ | Feature count |

### Platform Health Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Latency (p99) | < 200ms | > 500ms |
| API Error Rate | < 0.1% | > 1% |
| Metric Ingestion Rate | > 1000/sec sustained | < 100/sec |
| Dashboard Load Time | < 2s | > 5s |
| Widget Execution Success | > 99% | < 95% |
| System Uptime | 99.9% | < 99% |

### Business Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Active Users (DAU) | Daily active users | Growth month-over-month |
| Devices per User | Average devices managed | > 5 |
| Widgets per User | Average automations created | > 3 |
| Feature Adoption | % users using new features | > 25% within 30 days |
| Support Tickets | Issues per 100 users | < 5/month |

---

## Implementation Roadmap

### Immediate (Next Sprint - 2 weeks)
| Task | Effort | Owner |
|------|--------|-------|
| Widget Execution Logs | 1 week | Backend + Frontend |
| Export/Import | 1 week | Backend + Frontend |
| Add missing database indexes | 2 days | Backend |
| Set up E2E test framework | 3 days | QA |

### Short-term (Next Month)
| Task | Effort | Owner |
|------|--------|-------|
| Device Groups | 2 weeks | Full stack |
| Device Simulator | 2 weeks | Full stack |
| RBAC implementation | 1 week | Backend |
| OpenTelemetry integration | 1 week | Backend |

### Medium-term (Next Quarter)
| Task | Effort | Owner |
|------|--------|-------|
| Visual Rule Engine | 6 weeks | Full stack |
| MQTT Integration | 3 weeks | Backend |
| Additional Templates | 1 week | Frontend |
| Database partitioning | 2 weeks | Backend/DBA |
| OAuth2/OIDC support | 2 weeks | Backend |

### Long-term (Next 6 Months)
| Task | Effort | Owner |
|------|--------|-------|
| Cloud Integrations (AWS/Azure/GCP) | 2 months | Backend |
| Device Discovery | 1 month | Full stack |
| Advanced Analytics | 2 months | Data team |
| Multi-region deployment | 1 month | Infrastructure |
| Plugin architecture | 2 months | Architecture |

---

## Appendix: Quick Reference

### Key File Locations

**Backend**:
- GraphQL Schema: `components/orchestrator/pkg/graphql/schema.graphql`
- Domains: `components/orchestrator/internal/domain/{device,widget,metric,alert}/`
- Scheduler: `components/orchestrator/internal/scheduler/scheduler.go`
- Notifications: `components/orchestrator/internal/notification/service.go`

**Frontend**:
- Routing: `components/dashboard/src/app/app-routing.module.ts`
- Templates: `components/dashboard/src/app/shared/templates/widget-templates.ts`
- Charts: `components/dashboard/src/app/shared/components/charts/`
- Dashboard: `components/dashboard/src/app/modules/dashboard/`

**Database**:
- Migrations: `components/database/migrations/`

**Infrastructure**:
- Helm Charts: `charts/`
- Install Script: `scripts/install.sh`

### Common Commands

```bash
# Start full stack
./scripts/install.sh

# Regenerate GraphQL (after schema changes)
cd components/orchestrator && ./gqlgen.sh

# Regenerate frontend types
cd components/dashboard && npm run generate-types

# Run frontend tests
cd components/dashboard && npm test

# Run backend tests
cd components/controller && make test
```

---

*Document created: 2026-08-04*
*Last updated: 2026-08-04*
