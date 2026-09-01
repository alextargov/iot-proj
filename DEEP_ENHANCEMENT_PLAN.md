   # IoT Automation Platform - Deep Enhancement Plan

> A comprehensive technical roadmap based on deep codebase analysis

**Document Version:** 2.0  
**Created:** 2026-08-04  
**Last Updated:** 2026-08-04

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision & Use Cases](#project-vision--use-cases)
3. [Current State Analysis](#current-state-analysis)
4. [Code Quality Issues](#code-quality-issues)
5. [Feature Implementation Status](#feature-implementation-status)
6. [Technical Debt Backlog](#technical-debt-backlog)
7. [Architecture Improvements](#architecture-improvements)
8. [Security Enhancements](#security-enhancements)
9. [New Feature Roadmap](#new-feature-roadmap)
10. [Testing Strategy](#testing-strategy)
11. [DevOps & Infrastructure](#devops--infrastructure)
12. [Implementation Priorities](#implementation-priorities)
13. [Success Metrics](#success-metrics)

---

## Executive Summary

This IoT automation platform is a Kubernetes-native system for managing IoT devices and visual automation workflows. After deep analysis of the codebase, documentation, and architecture, this plan identifies:

- **47 code quality issues** across backend, frontend, and controller
- **5 features not implemented**, 2 partially implemented out of 18 planned
- **Critical gaps** in testing (near-zero coverage), security, and observability
- **Significant technical debt** that should be addressed before new features

### Key Recommendations

1. **Immediate**: Fix critical code quality issues (misspelled files, inconsistent patterns)
2. **Short-term**: Implement comprehensive testing, complete MQTT integration
3. **Medium-term**: Add missing features (execution logs, export/import, device groups)
4. **Long-term**: Scale architecture (time-series DB, event streaming, multi-region)

---

## Project Vision & Use Cases

### Target Use Cases (from `/docs/usecases.md`)

1. **Smart Home Control**
   - ESP32 controlling a lamp with ON/OFF state
   - Schedule-based automation (9pm ON, 6am OFF)
   - Real-time status widget

2. **GPS Tracking**
   - ESP32 with GPS module sending coordinates
   - Map widget with OpenStreetMap integration
   - Historical track vs. latest-only modes

3. **Environmental Monitoring**
   - Temperature and humidity sensors
   - Historical data visualization
   - Alert-based notifications

### Design Principles

- **Low-code automation**: Blockly visual programming for non-developers
- **Protocol flexibility**: HTTP REST now, MQTT planned for NAT traversal
- **Kubernetes-native**: Widget code runs as containerized workloads
- **Multi-tenant**: User isolation with tenant context

---

## Current State Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              k3d Cluster                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Dashboard     │  │   Orchestrator  │  │      Controller         │  │
│  │   (Angular 21)  │  │   (Go/GraphQL)  │  │   (Kubebuilder)         │  │
│  │                 │  │                 │  │                         │  │
│  │ • Blockly       │  │ • Auth (JWT)    │  │ • Application CRD       │  │
│  │ • Monaco        │  │ • Device CRUD   │  │ • Kaniko builds         │  │
│  │ • Gridster      │  │ • Widget CRUD   │  │ • Deployment mgmt       │  │
│  │ • Apollo Client │  │ • Metrics       │  │                         │  │
│  │                 │  │ • Alerts        │  │                         │  │
│  │                 │  │ • Scheduler     │  │                         │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           │    ┌───────────────┴───────────────┐        │               │
│           │    │         Istio Gateway         │        │               │
│           │    │    (localhost:8080)           │        │               │
│           │    └───────────────┬───────────────┘        │               │
│           │                    │                        │               │
│  ┌────────┴────────────────────┴────────────────────────┴────────────┐  │
│  │                         PostgreSQL                                │  │
│  │  Tables: users, devices, hosts, widgets, device_metrics,          │  │
│  │          alert_rules, alert_conditions, alert_notifications,      │  │
│  │          alert_events, dashboard_layouts, dashboard_widgets,      │  │
│  │          data_models, data_model_versions, widget_devices         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Health Assessment

| Component | Health | Key Issues |
|-----------|--------|------------|
| **Orchestrator** | ⚠️ Fair | Near-zero test coverage, inconsistent patterns, entity file typos |
| **Dashboard** | ⚠️ Fair | No lazy loading, 50+ `any` types, large components, minimal tests |
| **Controller** | ❌ Poor | Zero tests, blocking reconciler, no owner references, dead code |
| **Database** | ✅ Good | Well-structured schema, proper indexes, migrations working |
| **Deployment** | ✅ Good | Helm charts functional, Istio configured, k3d working |

---

## Code Quality Issues

### Critical Issues (Fix Immediately)

| ID | Component | Issue | Location | Impact |
|----|-----------|-------|----------|--------|
| C1 | Orchestrator | Entity files misspelled as `enitity.go` | device, host, user, widget domains | Confusion, IDE issues |
| C2 | Orchestrator | Test imports wrong package | `apperrors/errors_test.go` | Tests may not run correctly |
| C3 | Orchestrator | Hardcoded DB password in defaults | `pkg/persistence/config.go` | Security risk |
| C4 | Controller | Blocking watch loops in reconciler | `application_controller.go` | Reconciler hangs |
| C5 | Controller | No owner references on resources | `function/application_code.go` | Resources not garbage collected |
| C6 | Controller | Empty validation function | `application_types.go:62-64` | No CRD validation |

### High Priority Issues

| ID | Component | Issue | Location | Fix |
|----|-----------|-------|----------|-----|
| H1 | Orchestrator | Inconsistent tenant column naming | Multiple entities | Standardize on `tenant_id` |
| H2 | Orchestrator | host repo uses wrong resource type | `host/repository.go` | Use `resource.Host` |
| H3 | Orchestrator | auth domain incomplete | `domain/auth/` | Add missing files |
| H4 | Orchestrator | Missing resolver.go | host, user domains | Add resolvers |
| H5 | Orchestrator | Alert repo mixes raw SQL with helpers | `alert/repository.go` | Use repo helpers consistently |
| H6 | Dashboard | Hardcoded WebSocket URL | `graphql.module.ts:54` | Use environment config |
| H7 | Dashboard | Hardcoded HTTP URL | `graphql.module.ts:73` | Use environment config |
| H8 | Dashboard | No lazy loading for most modules | `app-routing.module.ts` | Add lazy loading |
| H9 | Controller | Wrong state in BuildImage | `status/manager.go:94` | Fix state transition |
| H10 | Controller | Missing RBAC for Secrets | `charts/.../rbac.yaml` | Add secrets permission |

### Medium Priority Issues

| ID | Component | Issue | Location |
|----|-----------|-------|----------|
| M1 | Orchestrator | Inconsistent error wrapping | Multiple services |
| M2 | Orchestrator | REST handlers return plain strings | `handlers/auth.go` |
| M3 | Orchestrator | Boilerplate transaction code | All resolvers |
| M4 | Dashboard | 50+ `any` type usages | Multiple files |
| M5 | Dashboard | Large components (300+ lines) | widget-create, device-create, alert-form |
| M6 | Dashboard | Duplicate StatusConfig code | devices-list, device-detail |
| M7 | Dashboard | EventBus uses `any` types | `eventbus.service.ts` |
| M8 | Dashboard | Misnamed CoreModule | `core/core.module.ts` |
| M9 | Controller | No event recording | `application_controller.go` |
| M10 | Controller | Port mismatch (80 vs 3000) | `function/application_code.go` |
| M11 | Controller | Hardcoded image registry | `function/application_code.go:74,199` |

### Low Priority Issues

| ID | Component | Issue |
|----|-----------|-------|
| L1 | Orchestrator | Missing godoc comments throughout |
| L2 | Orchestrator | Empty config-local.yaml |
| L3 | Dashboard | 53 console.log/console.error statements |
| L4 | Dashboard | Apollo cache underutilized (network-only) |
| L5 | Controller | Logger variable shadowing |
| L6 | Controller | Dead code in DeploymentError/BuildError |

---

## Feature Implementation Status

### Implemented Features ✅

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Dashboard home page | ✅ | ✅ | Overview cards with device/widget counts |
| Device status indicators | ✅ | ✅ | Real-time badges with icons |
| Duplicate device/widget | ✅ | ✅ | Clone via history.state |
| Widget templates | ✅ | ✅ | 6 templates with categories |
| Cron scheduling | ✅ | ✅ | robfig/cron, presets UI |
| Data visualization | ✅ | ✅ | Chart.js, 5 widget types |
| Notifications | ✅ | ✅ | Email (SMTP) + Webhook |
| Dashboard builder | ✅ | ✅ | angular-gridster2, drag-drop |
| Multi-tenant support | ✅ | ✅ | Tenant context isolation |
| WebSocket subscriptions | ✅ | ✅ | metricRecorded subscription |
| Time-series metrics | ✅ | ✅ | PostgreSQL with aggregations |

### Partially Implemented ⚠️

| Feature | Status | Missing |
|---------|--------|---------|
| Device groups/tags | Backend has tags field | No group hierarchy, no group management UI |
| API integrations | GraphQL API complete | No external protocol connectors (MQTT, etc.) |

### Not Implemented ❌

| Feature | Complexity | Dependency |
|---------|------------|------------|
| Widget execution logs | Low | None |
| Export/Import config | Low | None |
| Device simulator | Medium | None |
| Visual rule engine | High | None |
| Device discovery | High | Network access |

---

## Technical Debt Backlog

### Backend Technical Debt

#### TD-B1: Entity File Naming
**Priority**: Critical | **Effort**: 15 min

```bash
# Files to rename
mv components/orchestrator/internal/domain/device/enitity.go entity.go
mv components/orchestrator/internal/domain/host/enitity.go entity.go
mv components/orchestrator/internal/domain/user/enitity.go entity.go
mv components/orchestrator/internal/domain/widget/enitity.go entity.go
```

#### TD-B2: Standardize Tenant Column
**Priority**: High | **Effort**: 2 hours

Current state:
- `device`, `widget`, `datamodel`: use `user_id`
- `metric`, `alert`, `dashboard_*`: use `tenant_id`

Migration needed:
```sql
-- Option 1: Rename user_id to tenant_id (breaking change)
ALTER TABLE devices RENAME COLUMN user_id TO tenant_id;
ALTER TABLE widgets RENAME COLUMN user_id TO tenant_id;
ALTER TABLE data_models RENAME COLUMN user_id TO tenant_id;

-- Option 2: Add tenant_id as alias (backward compatible)
-- Keep user_id, update entity db tags to use tenant_id
```

Update all entity files to use consistent `db:"tenant_id"` tag.

#### TD-B3: Complete auth Domain
**Priority**: High | **Effort**: 4 hours

Create missing files:
- `domain/auth/entity.go` - User entity for auth context
- `domain/auth/repository.go` - User lookup for auth
- `domain/auth/service.go` - Auth business logic
- `domain/auth/resolver.go` - GraphQL auth mutations

#### TD-B4: Add resource.Host Type
**Priority**: Medium | **Effort**: 30 min

```go
// pkg/resource/resource.go
const (
    Device    Type = "device"
    Widget    Type = "widget"
    User      Type = "user"
    Host      Type = "host"      // Add this
    Metric    Type = "metric"    // Add this
    Alert     Type = "alert"     // Add this
    Dashboard Type = "dashboard" // Add this
)
```

Update `host/repository.go` to use `resource.Host`.

#### TD-B5: Standardize Error Handling
**Priority**: Medium | **Effort**: 3 hours

Create error middleware and standardize responses:

```go
// internal/apperrors/http_response.go
type ErrorResponse struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details any    `json:"details,omitempty"`
}

func WriteError(w http.ResponseWriter, err error) {
    var appErr Error
    if errors.As(err, &appErr) {
        resp := ErrorResponse{
            Code:    appErr.ErrorCode(),
            Message: appErr.Error(),
        }
        w.WriteHeader(appErr.HTTPCode())
        json.NewEncoder(w).Encode(resp)
        return
    }
    // ... handle unknown errors
}
```

#### TD-B6: Extract Transaction Boilerplate
**Priority**: Low | **Effort**: 2 hours

Create helper for common transaction pattern:

```go
// internal/transaction/helper.go
func WithTransaction[T any](ctx context.Context, transact Transactioner, fn func(ctx context.Context) (T, error)) (T, error) {
    tx, err := transact.Begin()
    if err != nil {
        var zero T
        return zero, err
    }
    defer transact.RollbackUnlessCommitted(ctx, tx)
    
    ctx = persistence.SaveToContext(ctx, tx)
    result, err := fn(ctx)
    if err != nil {
        var zero T
        return zero, err
    }
    
    if err := tx.Commit(); err != nil {
        var zero T
        return zero, err
    }
    return result, nil
}
```

### Frontend Technical Debt

#### TD-F1: Enable Lazy Loading
**Priority**: High | **Effort**: 2 hours

Update `app-routing.module.ts`:

```typescript
const routes: Routes = [
  { path: '', component: LayoutComponent, canActivate: [AuthGuard], children: [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule) },
    { path: 'devices', loadChildren: () => import('./modules/devices/devices.module').then(m => m.DevicesModule) },
    { path: 'widgets', loadChildren: () => import('./modules/widgets/widgets.module').then(m => m.WidgetsModule) },
    { path: 'dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule) },
    { path: 'datamodel', loadChildren: () => import('./modules/datamodel/datamodel.module').then(m => m.DatamodelModule) },
    { path: 'profile', loadChildren: () => import('./modules/profile/profile.module').then(m => m.ProfileModule) },
    { path: 'alerts', loadChildren: () => import('./modules/alerts/alerts.module').then(m => m.AlertsModule) },
  ]},
  { path: 'login', loadChildren: () => import('./modules/login/login.module').then(m => m.LoginModule) },
];
```

#### TD-F2: Environment Configuration
**Priority**: High | **Effort**: 1 hour

Update `environment.ts` and `environment.prod.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/graphql',
  wsUrl: 'ws://localhost:8080/graphql',
};
```

Update `graphql.module.ts` to use environment:

```typescript
import { environment } from '../../../environments/environment';

// ...
url: environment.wsUrl,
// ...
uri: environment.apiUrl,
```

#### TD-F3: Type the EventBus
**Priority**: Medium | **Effort**: 1 hour

```typescript
// shared/services/eventbus/events.ts
export type EventMap = {
  'user:login': { userId: string };
  'user:logout': void;
  'device:updated': { deviceId: string };
  'dashboard:refresh': void;
};

// shared/services/eventbus/eventbus.service.ts
export class EventBusService {
  private eventBus$ = new Subject<{ event: keyof EventMap; payload: EventMap[keyof EventMap] }>();
  
  public emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.eventBus$.next({ event, payload });
  }
  
  public on<K extends keyof EventMap>(event: K): Observable<EventMap[K]> {
    return this.eventBus$.pipe(
      filter(e => e.event === event),
      map(e => e.payload as EventMap[K])
    );
  }
}
```

#### TD-F4: Extract Device Status Utilities
**Priority**: Medium | **Effort**: 1 hour

```typescript
// shared/utils/device-status.util.ts
export interface StatusConfig {
  label: string;
  icon: string;
  class: string;
  tooltip: string;
}

export const DEVICE_STATUS_CONFIG: Record<DeviceStatus, StatusConfig> = {
  [DeviceStatus.Active]: {
    label: 'Active',
    icon: 'check_circle',
    class: 'status-active',
    tooltip: 'Device is online and functioning normally',
  },
  [DeviceStatus.Initial]: {
    label: 'Initial',
    icon: 'hourglass_empty',
    class: 'status-initial',
    tooltip: 'Device is initializing',
  },
  // ...
};

// shared/pipes/device-status.pipe.ts
@Pipe({ name: 'deviceStatus' })
export class DeviceStatusPipe implements PipeTransform {
  transform(status: DeviceStatus, property: keyof StatusConfig): string {
    return DEVICE_STATUS_CONFIG[status]?.[property] ?? '';
  }
}
```

#### TD-F5: Split Large Components
**Priority**: Medium | **Effort**: 4 hours

**widget-create.component.ts** (441 lines) → Split into:
- `WidgetBasicInfoComponent` - Name, description
- `DeviceSelectionComponent` - Device picker with tags
- `ScheduleConfigComponent` - Cron schedule configuration
- `TemplatePickerDialogComponent` - Template selection dialog
- `WidgetCreateComponent` - Orchestrator component

**device-create.component.ts** (349 lines) → Split into:
- `DeviceBasicInfoComponent` - Name, description, status
- `DeviceHostConfigComponent` - URL and endpoints
- `DeviceAuthConfigComponent` - Authorization credentials
- `DataModelSelectorComponent` - Data model selection with Monaco
- `DeviceCreateComponent` - Orchestrator component

### Controller Technical Debt

#### TD-C1: Fix Blocking Reconciler
**Priority**: Critical | **Effort**: 4 hours

Replace blocking watch loops with proper requeue pattern:

```go
func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    app := &v1alpha1.Application{}
    if err := r.Get(ctx, req.NamespacedName, app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }
    
    switch app.Status.Phase {
    case v1alpha1.StateInitial:
        // Start build, update to BuildStarted
        return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
        
    case v1alpha1.StateBuildStarted:
        // Check if build complete
        if buildComplete {
            // Update to BuildReady
            return ctrl.Result{}, nil
        }
        // Requeue to check again
        return ctrl.Result{RequeueAfter: 10 * time.Second}, nil
        
    case v1alpha1.StateBuildReady:
        // Start deployment
        return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
        
    // ... etc
    }
}
```

#### TD-C2: Add Owner References
**Priority**: Critical | **Effort**: 2 hours

```go
func (a *ApplicationCode) createDeployment(ctx context.Context, app *v1alpha1.Application) error {
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      deploymentName(app),
            Namespace: app.Namespace,
            OwnerReferences: []metav1.OwnerReference{
                *metav1.NewControllerRef(app, v1alpha1.GroupVersion.WithKind("Application")),
            },
        },
        // ... spec
    }
    return a.client.Create(ctx, deployment)
}
```

Apply to all created resources: ConfigMap, Pod, Deployment, Service.

#### TD-C3: Implement CRD Validation
**Priority**: High | **Effort**: 2 hours

```go
func (a *Application) Validate() error {
    var errs []string
    
    if a.Spec.WidgetID == "" {
        errs = append(errs, "widget_id is required")
    }
    if a.Spec.SourceCode == "" {
        errs = append(errs, "source_code is required")
    }
    if a.Spec.ReplicasCount < 0 {
        errs = append(errs, "replicas_count must be >= 0")
    }
    if a.Spec.ReplicasCount > 10 {
        errs = append(errs, "replicas_count must be <= 10")
    }
    
    if len(errs) > 0 {
        return fmt.Errorf("validation failed: %s", strings.Join(errs, "; "))
    }
    return nil
}
```

Add kubebuilder markers:

```go
// +kubebuilder:validation:Required
WidgetID string `json:"widget_id"`

// +kubebuilder:validation:Required
SourceCode string `json:"source_code"`

// +kubebuilder:default=1
// +kubebuilder:validation:Minimum=0
// +kubebuilder:validation:Maximum=10
ReplicasCount int `json:"replicas_count,omitempty"`
```

#### TD-C4: Add Event Recording
**Priority**: Medium | **Effort**: 1 hour

```go
type ApplicationReconciler struct {
    client.Client
    Scheme   *runtime.Scheme
    Recorder record.EventRecorder  // Add this
}

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // ... get app
    
    // Record events
    r.Recorder.Event(app, corev1.EventTypeNormal, "BuildStarted", "Starting image build")
    
    // On error
    r.Recorder.Event(app, corev1.EventTypeWarning, "BuildFailed", err.Error())
}

func (r *ApplicationReconciler) SetupWithManager(mgr ctrl.Manager) error {
    r.Recorder = mgr.GetEventRecorderFor("application-controller")
    return ctrl.NewControllerManagedBy(mgr).
        For(&v1alpha1.Application{}).
        Owns(&appsv1.Deployment{}).  // Add owned resources
        Owns(&corev1.Service{}).
        Owns(&corev1.ConfigMap{}).
        Complete(r)
}
```

---

## Architecture Improvements

### A1: MQTT Integration (from `/docs/mqtt-integration-plan.md`)

**Status**: Fully designed, not implemented

**Why**: Current HTTP-based server→device communication requires devices to have public IPs. MQTT solves NAT traversal.

**Components to Add**:
1. **Mosquitto Broker** - Helm chart in `charts/mosquitto/`
2. **MQTT Bridge Service** - New Go service in `components/mqtt-bridge/`
3. **Orchestrator Updates** - MQTT credential management, command routing

**Implementation Order**:
1. Phase 1: Deploy Mosquitto (2-3 days)
2. Phase 2: Build Bridge Service (4-5 days)
3. Phase 3: Orchestrator Integration (2-3 days)
4. Phase 4: Dashboard UI (2-3 days)
5. Phase 5: Device SDKs (2-3 days)

**Total**: ~2-3 weeks

### A2: Metrics Pipeline Scaling

**Current**: Direct REST → PostgreSQL

**Problem**: Won't scale beyond ~1k metrics/second

**Solution Phases**:

```
Phase 1 (Now)           Phase 2 (10k/s)           Phase 3 (100k/s)
┌─────────┐            ┌─────────┐               ┌─────────┐
│REST API │            │REST API │               │REST API │
└────┬────┘            └────┬────┘               └────┬────┘
     │                      │                         │
     │                      ▼                         ▼
     │                 ┌─────────┐               ┌─────────┐
     │                 │  Redis  │               │  Kafka  │
     │                 │ Buffer  │               │         │
     │                 └────┬────┘               └────┬────┘
     │                      │                         │
     ▼                      ▼                         ▼
┌──────────┐           ┌──────────┐             ┌───────────┐
│PostgreSQL│           │PostgreSQL│             │TimescaleDB│
└──────────┘           └──────────┘             └───────────┘
```

### A3: Plugin Architecture

**Goal**: Enable extensibility without core changes

```go
// Plugin interface definitions
type DeviceConnector interface {
    Name() string
    Connect(config json.RawMessage) error
    SendCommand(deviceID string, cmd Command) error
    Subscribe(handler MetricHandler) error
    Close() error
}

type NotificationChannel interface {
    Name() string
    Send(ctx context.Context, notification Notification) error
}

type DashboardWidgetPlugin interface {
    Name() string
    Type() string
    Render(data any) (template.HTML, error)
}
```

### A4: Observability Stack

**Components**:
- **Prometheus** - Metrics collection
- **Loki** - Log aggregation
- **Tempo** - Distributed tracing
- **Grafana** - Visualization

**Implementation**:
1. Add OpenTelemetry SDK to orchestrator and controller
2. Deploy observability stack via Helm
3. Create dashboards for key metrics

---

## Security Enhancements

### S1: Remove Hardcoded Secrets
**Priority**: Critical

```go
// BEFORE (pkg/persistence/config.go)
Password string `envconfig:"default=pgsql@12345,APP_DB_PASSWORD"`

// AFTER
Password string `envconfig:"APP_DB_PASSWORD,required"`
```

### S2: Implement RBAC
**Priority**: High

```graphql
enum Role {
    ADMIN
    OPERATOR
    VIEWER
}

type User {
    id: ID!
    username: String!
    role: Role!
}
```

| Role | Devices | Widgets | Dashboards | Alerts | Users |
|------|---------|---------|------------|--------|-------|
| Admin | CRUD | CRUD | CRUD | CRUD | CRUD |
| Operator | CRUD | CRUD | RU | CRUD | R |
| Viewer | R | R | R | R | - |

### S3: API Rate Limiting
**Priority**: Medium

From `/docs/usecases.md`: "Rate limit incoming requests to 10 per second or 1 per user"

```go
// internal/middlewares/ratelimit.go
func RateLimitMiddleware(limit rate.Limit, burst int) func(http.Handler) http.Handler {
    limiter := rate.NewLimiter(limit, burst)
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### S4: Audit Logging
**Priority**: Medium

Log all mutations with user context:
```go
type AuditLog struct {
    ID        string    `json:"id"`
    Timestamp time.Time `json:"timestamp"`
    UserID    string    `json:"user_id"`
    Action    string    `json:"action"`    // CREATE, UPDATE, DELETE
    Resource  string    `json:"resource"`  // device, widget, alert
    ResourceID string   `json:"resource_id"`
    OldValue  string    `json:"old_value,omitempty"`
    NewValue  string    `json:"new_value,omitempty"`
    IPAddress string    `json:"ip_address"`
}
```

### S5: Device Certificate Management
**Priority**: Low

For mTLS authentication:
- Certificate generation via API
- Certificate rotation support
- Revocation list management

---

## New Feature Roadmap

### F1: Widget Execution Logs
**Priority**: High | **Effort**: 1 week | **Dependencies**: None

**Database**:
```sql
CREATE TABLE widget_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(32) NOT NULL, -- SUCCESS, FAILURE, TIMEOUT, RUNNING
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    trigger_type VARCHAR(32), -- MANUAL, SCHEDULED, EVENT
    output TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_widget_executions_widget ON widget_executions(widget_id, started_at DESC);
CREATE INDEX idx_widget_executions_tenant ON widget_executions(tenant_id);
```

**GraphQL**:
```graphql
type WidgetExecution {
    id: ID!
    widgetId: ID!
    status: ExecutionStatus!
    startedAt: Timestamp!
    finishedAt: Timestamp
    durationMs: Int
    triggerType: TriggerType!
    output: String
    error: String
}

enum ExecutionStatus { RUNNING, SUCCESS, FAILURE, TIMEOUT }
enum TriggerType { MANUAL, SCHEDULED, EVENT }

extend type Query {
    widgetExecutions(widgetId: ID!, first: Int, after: String): WidgetExecutionPage!
    widgetExecution(id: ID!): WidgetExecution
}

extend type Widget {
    executions(first: Int): [WidgetExecution!]!
    lastExecution: WidgetExecution
}
```

**Frontend**:
- Add "Executions" tab to widget detail page
- Show execution history table with status icons
- Expandable rows for output/error details
- Real-time updates via subscription

### F2: Export/Import Configuration
**Priority**: High | **Effort**: 1 week | **Dependencies**: None

**Format**:
```json
{
  "version": "1.0",
  "exportedAt": "2026-08-04T10:00:00Z",
  "devices": [...],
  "widgets": [...],
  "dashboards": [...],
  "alerts": [...],
  "dataModels": [...]
}
```

**GraphQL**:
```graphql
type ExportData {
    version: String!
    exportedAt: Timestamp!
    devices: [DeviceExport!]
    widgets: [WidgetExport!]
    dashboards: [DashboardExport!]
    alerts: [AlertExport!]
    dataModels: [DataModelExport!]
}

type ImportResult {
    success: Boolean!
    created: Int!
    updated: Int!
    skipped: Int!
    errors: [ImportError!]
}

type ImportError {
    resource: String!
    name: String!
    error: String!
}

extend type Query {
    exportAll: ExportData!
    exportDevices(ids: [ID!]): ExportData!
    exportWidgets(ids: [ID!]): ExportData!
}

extend type Mutation {
    importConfig(data: JSON!, mode: ImportMode!): ImportResult!
}

enum ImportMode { SKIP_EXISTING, UPDATE_EXISTING, FAIL_ON_EXISTING }
```

### F3: Device Groups
**Priority**: Medium | **Effort**: 2 weeks | **Dependencies**: None

**Database**:
```sql
CREATE TABLE device_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES device_groups(id),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, parent_id, name)
);

CREATE TABLE device_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES device_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, group_id)
);

CREATE INDEX idx_device_groups_tenant ON device_groups(tenant_id);
CREATE INDEX idx_device_groups_parent ON device_groups(parent_id);
CREATE INDEX idx_device_group_members_device ON device_group_members(device_id);
CREATE INDEX idx_device_group_members_group ON device_group_members(group_id);
```

**Frontend**:
- Tree view sidebar for group hierarchy
- Drag-and-drop devices into groups
- Group CRUD dialogs with color/icon picker
- Filter device list by group
- Bulk operations on groups

### F4: Device Simulator
**Priority**: Medium | **Effort**: 2 weeks | **Dependencies**: None

**Simulation Patterns**:
```go
type SimulationPattern string

const (
    PatternConstant   SimulationPattern = "CONSTANT"
    PatternRandom     SimulationPattern = "RANDOM"
    PatternSine       SimulationPattern = "SINE"
    PatternStep       SimulationPattern = "STEP"
    PatternRealistic  SimulationPattern = "REALISTIC"
)

type SimulatorConfig struct {
    MetricName      string            `json:"metricName"`
    Pattern         SimulationPattern `json:"pattern"`
    MinValue        float64           `json:"minValue"`
    MaxValue        float64           `json:"maxValue"`
    IntervalSeconds int               `json:"intervalSeconds"`
    NoisePercent    float64           `json:"noisePercent,omitempty"`
}
```

**Features**:
- Create virtual devices that generate metrics
- Configurable patterns: constant, random, sine wave, step, realistic
- Start/stop/pause controls
- Preview chart before starting
- Multiple simultaneous simulators

### F5: Visual Rule Engine
**Priority**: Low | **Effort**: 1 month | **Dependencies**: None

Alternative to Blockly for simpler automations:

```
WHEN [device] [metric] [operator] [value]
AND/OR [additional conditions]
THEN [action] [target] [parameters]
WAIT [duration] (optional)
```

**Database**:
```sql
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,
    trigger_type VARCHAR(32), -- METRIC, SCHEDULE, EVENT
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    cooldown_seconds INT DEFAULT 60,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Testing Strategy

### Current State

| Component | Test Files | Coverage |
|-----------|-----------|----------|
| Orchestrator | 2 | ~0% |
| Dashboard | 7 | ~5% (only "should create" tests) |
| Controller | 0 | 0% |

### Target State

| Component | Target Coverage | Priority Tests |
|-----------|----------------|----------------|
| Orchestrator | 70% | Services, Repositories, Resolvers |
| Dashboard | 60% | Services, Critical components |
| Controller | 80% | Reconciler, Status manager |

### Testing Frameworks

**Backend (Go)**:
- `testing` - Standard library
- `testify` - Assertions and mocks
- `testcontainers-go` - Database integration tests
- `envtest` - Controller integration tests

**Frontend (Angular)**:
- `Karma/Jasmine` - Unit tests
- `Apollo Testing` - GraphQL mock
- `Cypress` or `Playwright` - E2E tests

### Test Implementation Plan

#### Phase 1: Critical Path (2 weeks)

**Orchestrator**:
```go
// internal/domain/device/service_test.go
func TestDeviceService_Create(t *testing.T) {
    // Setup mock repository
    // Test successful creation
    // Test validation errors
    // Test duplicate name
}

func TestDeviceService_GetByID(t *testing.T) {
    // Test existing device
    // Test not found
    // Test wrong tenant
}
```

**Controller**:
```go
// controllers/application_controller_test.go
func TestApplicationReconciler_Reconcile(t *testing.T) {
    // Use envtest
    // Test state transitions
    // Test error handling
    // Test resource creation
}
```

#### Phase 2: Integration Tests (2 weeks)

```go
// integration/device_integration_test.go
func TestDeviceLifecycle(t *testing.T) {
    // Use testcontainers for PostgreSQL
    // Create device via GraphQL
    // Update device
    // Record metrics
    // Create alert rule
    // Verify alert triggers
    // Delete device
}
```

#### Phase 3: E2E Tests (2 weeks)

```typescript
// cypress/e2e/device-workflow.cy.ts
describe('Device Workflow', () => {
    it('should create and manage a device', () => {
        cy.login('alex', 'pass');
        cy.visit('/devices');
        cy.get('[data-testid="create-device"]').click();
        // ... fill form
        cy.get('[data-testid="submit"]').click();
        cy.url().should('include', '/devices/');
    });
});
```

---

## DevOps & Infrastructure

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - name: Run tests
        run: |
          cd components/orchestrator
          go test -race -coverprofile=coverage.out ./...
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install and test
        run: |
          cd components/dashboard
          npm ci
          npm run lint
          npm test -- --no-watch --code-coverage

  controller-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - name: Run tests
        run: |
          cd components/controller
          make test

  build:
    needs: [backend-test, frontend-test, controller-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: |
          docker build -t orchestrator ./components/orchestrator
          docker build -t dashboard ./components/dashboard
          docker build -t controller ./components/controller
```

### Monitoring & Alerting

**Key Metrics to Track**:

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API Latency (p99) | Prometheus | > 500ms |
| API Error Rate | Prometheus | > 1% |
| Metric Ingestion Rate | Prometheus | < 100/s (too low) |
| Database Connections | PostgreSQL | > 80% pool |
| Memory Usage | Kubernetes | > 80% limit |
| Pod Restarts | Kubernetes | > 3 in 5min |

**Grafana Dashboards**:
1. API Overview - Latency, throughput, errors
2. Device Metrics - Ingestion rate, storage growth
3. Widget Execution - Success rate, duration
4. Infrastructure - CPU, memory, disk, network

---

## Implementation Priorities

### Phase 1: Foundation (Weeks 1-2)
**Focus**: Fix critical issues, establish quality baseline

| Task | Effort | Owner |
|------|--------|-------|
| Fix entity file names | 15 min | Backend |
| Fix hardcoded secrets | 30 min | Backend |
| Fix controller blocking reconciler | 4 hours | Backend |
| Add owner references | 2 hours | Backend |
| Setup CI pipeline | 4 hours | DevOps |
| Add basic backend tests | 3 days | Backend |
| Add basic frontend tests | 2 days | Frontend |

### Phase 2: Stabilization (Weeks 3-4)
**Focus**: Complete technical debt, improve reliability

| Task | Effort | Owner |
|------|--------|-------|
| Standardize tenant column | 2 hours | Backend |
| Complete auth domain | 4 hours | Backend |
| Enable lazy loading | 2 hours | Frontend |
| Environment configuration | 1 hour | Frontend |
| Type EventBus | 1 hour | Frontend |
| Add controller tests | 3 days | Backend |
| Integration tests | 3 days | QA |

### Phase 3: Features (Weeks 5-8)
**Focus**: High-value new features

| Task | Effort | Owner |
|------|--------|-------|
| Widget execution logs | 1 week | Full Stack |
| Export/Import config | 1 week | Full Stack |
| Device groups | 2 weeks | Full Stack |

### Phase 4: Scale (Weeks 9-12)
**Focus**: MQTT integration, observability

| Task | Effort | Owner |
|------|--------|-------|
| MQTT integration | 3 weeks | Backend |
| Observability stack | 1 week | DevOps |
| Device simulator | 2 weeks | Full Stack |

### Phase 5: Advanced (Months 4-6)
**Focus**: Enterprise features

| Task | Effort | Owner |
|------|--------|-------|
| Visual rule engine | 1 month | Full Stack |
| Plugin architecture | 1 month | Architecture |
| Multi-region deployment | 1 month | DevOps |

---

## Success Metrics

### Code Quality Metrics

| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Backend Test Coverage | ~0% | 70% | Week 8 |
| Frontend Test Coverage | ~5% | 60% | Week 8 |
| Controller Test Coverage | 0% | 80% | Week 6 |
| TypeScript `any` usages | 50+ | < 10 | Week 4 |
| ESLint errors | Unknown | 0 | Week 2 |
| Go lint errors | Unknown | 0 | Week 2 |

### Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| API Latency (p99) | Unknown | < 200ms |
| Dashboard Load Time | Unknown | < 2s |
| Metric Ingestion | Unknown | > 1000/s |
| Widget Execution Success | Unknown | > 99% |

### Feature Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Execution Logs | Debug time reduction | 50% |
| Export/Import | Recovery time | < 5 min |
| Device Groups | Devices organized | > 80% |
| Simulator | Tests using simulator | > 50% |

### Business Metrics

| Metric | Target |
|--------|--------|
| System Uptime | 99.9% |
| Devices per User | > 5 |
| Widgets per User | > 3 |
| Feature Adoption (30 days) | > 25% |

---

## Appendix A: File Reference

### Key Files to Modify

**Backend**:
- `components/orchestrator/internal/domain/*/enitity.go` → Rename to `entity.go`
- `components/orchestrator/pkg/persistence/config.go` → Remove default password
- `components/orchestrator/internal/domain/auth/` → Add missing files
- `components/orchestrator/pkg/resource/resource.go` → Add missing resource types

**Frontend**:
- `components/dashboard/src/app/app-routing.module.ts` → Add lazy loading
- `components/dashboard/src/app/shared/graphql/graphql.module.ts` → Use environment
- `components/dashboard/src/app/shared/services/eventbus/` → Add types
- `components/dashboard/src/environments/` → Add API URLs

**Controller**:
- `components/controller/controllers/application_controller.go` → Fix blocking
- `components/controller/internal/k8s/function/application_code.go` → Add owner refs
- `components/controller/api/v1alpha1/application_types.go` → Add validation

### Command Reference

```bash
# Backend
cd components/orchestrator
./run.sh                    # Run locally
./gqlgen.sh                 # Regenerate GraphQL
go test ./...               # Run tests

# Frontend
cd components/dashboard
npm start                   # Dev server
npm run generate-types      # Regenerate GraphQL types
npm test                    # Run tests
npm run lint                # Lint check

# Controller
cd components/controller
make build                  # Build
make test                   # Run tests
make manifests              # Generate CRDs

# Full Stack
./scripts/install.sh        # Deploy to k3d
```

---

## Appendix B: Database Schema Reference

### Current Tables

```
users
├── id (uuid, PK)
├── username (varchar)
├── password (varchar)
├── created_at, updated_at

devices
├── id (uuid, PK)
├── user_id (uuid, FK → users) -- Should be tenant_id
├── name, description, status
├── data_model_id (FK → data_models)
├── tags (jsonb)
├── auth (jsonb)
├── communication_token
├── created_at, updated_at

hosts
├── id (uuid, PK)
├── device_id (uuid, FK → devices)
├── url, turn_on_endpoint, turn_off_endpoint

widgets
├── id (uuid, PK)
├── user_id (uuid, FK → users) -- Should be tenant_id
├── name, description, status
├── schedule, last_executed_at
├── created_at, updated_at

widget_devices (junction)
├── widget_id (FK → widgets)
├── device_id (FK → devices)

data_models
├── id (uuid, PK)
├── user_id (uuid, FK → users) -- Should be tenant_id
├── name, description
├── schema (jsonb)
├── current_version
├── created_at, updated_at

data_model_versions
├── id (uuid, PK)
├── data_model_id (FK → data_models)
├── version_number, schema (jsonb)
├── change_description
├── created_at, created_by

device_metrics
├── id (varchar, PK)
├── device_id (FK → devices)
├── tenant_id (varchar) -- Uses tenant_id
├── metric_name, metric_value, unit
├── recorded_at, created_at

alert_rules
├── id (uuid, PK)
├── tenant_id (FK → users) -- Uses tenant_id
├── device_id (FK → devices)
├── name, description, severity
├── enabled, cooldown_minutes
├── last_triggered_at
├── created_at, updated_at

alert_conditions
├── alert_rule_id (FK → alert_rules)
├── group_id, metric_name
├── operator, threshold

alert_notifications
├── alert_rule_id (FK → alert_rules)
├── type, config (jsonb)

alert_events
├── alert_rule_id (FK → alert_rules)
├── device_id, tenant_id
├── triggered_values (jsonb)
├── status, triggered_at, resolved_at

dashboard_layouts
├── id (uuid, PK)
├── tenant_id (FK → users) -- Uses tenant_id
├── name, description
├── is_default, refresh_interval_seconds
├── created_at, updated_at

dashboard_widgets
├── id (uuid, PK)
├── dashboard_layout_id (FK → dashboard_layouts)
├── tenant_id (FK → users) -- Uses tenant_id
├── widget_type, title
├── grid_x, grid_y, grid_cols, grid_rows
├── device_id (FK → devices)
├── metric_name, config (jsonb)
├── created_at, updated_at
```

---

*Document Version: 2.0*  
*Created: 2026-08-04*  
*Based on: Deep codebase analysis with 3 specialized agents*