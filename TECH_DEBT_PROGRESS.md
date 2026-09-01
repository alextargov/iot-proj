# Technical Debt Implementation Progress

> Tracking implementation of items from DEEP_ENHANCEMENT_PLAN.md

**Started:** 2026-08-07  
**Last Updated:** 2026-08-30

---

## Phase 1: Foundation (Critical Issues)

### Critical Issues (Fix Immediately)

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| C1 | Entity files misspelled as `enitity.go` | ✅ Completed | Renamed in device, host, user, widget domains |
| C2 | Test imports wrong package | ✅ Completed | Fixed import to use local resource package |
| C3 | Hardcoded DB password in defaults | ✅ Completed | Made password required via env var |
| C4 | Blocking watch loops in reconciler | ✅ Completed | Replaced with non-blocking requeue pattern |
| C5 | No owner references on resources | ✅ Completed | Added `*WithOwner` methods for garbage collection |
| C6 | Empty validation function | ✅ Completed | Added proper validation with kubebuilder markers |

### High Priority Issues

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| H1 | Inconsistent tenant column naming | ✅ Completed | Migration 9 renames user_id to tenant_id |
| H2 | host repo uses wrong resource type | ✅ Completed | Added resource.Host type |
| H3 | auth domain incomplete | ✅ Completed | Added entity/service/resolver; login/register moved behind auth service |
| H4 | Missing resolver.go | ✅ Completed | Added user/resolver.go with `me` query |
| H5 | Alert repo mixes raw SQL with helpers | ✅ Completed | Refactored to use repo helpers consistently |
| H6 | Hardcoded WebSocket URL | ✅ Completed | Uses environment.wsUrl |
| H7 | Hardcoded HTTP URL | ✅ Completed | Uses environment.apiUrl |
| H8 | No lazy loading for most modules | ✅ Completed | All feature modules now lazy loaded |
| H9 | Wrong state in BuildImage | ✅ Completed | Fixed to StateBuildStarted |
| H10 | Missing RBAC for Secrets | ✅ Completed | Added secrets-all ClusterRole and binding |

---

## Phase 2: Stabilization

### Backend Technical Debt

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| TD-B1 | Entity File Naming | ✅ Completed | Same as C1 |
| TD-B2 | Standardize Tenant Column | ✅ Completed | Migration 9, updated device/widget/datamodel entities |
| TD-B3 | Complete auth Domain | ✅ Completed | auth service (Login/Register/UpdateRole), resolver (updateUserRole), REST handler now thin adapter |
| TD-B4 | Add resource.Host Type | ✅ Completed | Added Host, Application, AutomaticScenarioAssigment, Label |
| TD-B5 | Standardize Error Handling | ✅ Completed | Created http_response.go with helper functions |
| TD-B6 | Extract Transaction Boilerplate | ✅ Completed | Created transaction/helper.go with generics |

### Frontend Technical Debt

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| TD-F1 | Enable Lazy Loading | ✅ Completed | All 8 feature modules lazy loaded |
| TD-F2 | Environment Configuration | ✅ Completed | Added apiUrl and wsUrl to environments |
| TD-F3 | Type the EventBus | ✅ Completed | Added typed EventMap interface |
| TD-F4 | Extract Device Status Utilities | ✅ Completed | Created status-config.utils.ts and status pipes |
| TD-F5 | Split Large Components | ✅ Completed | Extracted sub-components for device-create and widget-create |

### Controller Technical Debt

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| TD-C1 | Fix Blocking Reconciler | ✅ Completed | CheckBuildReady/CheckDeployReady with requeue |
| TD-C2 | Add Owner References | ✅ Completed | *WithOwner methods added |
| TD-C3 | Implement CRD Validation | ✅ Completed | Added kubebuilder markers and Validate() |
| TD-C4 | Add Event Recording | ✅ Completed | Added EventRecorder with phase-specific events |

---

## Security Enhancements

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| S1 | Remove Hardcoded Secrets | ✅ Completed | Same as C3 |
| S2 | Implement RBAC | ✅ Completed | Roles (ADMIN/OPERATOR/VIEWER) + @hasRole directive, frontend RoleGuard & role-gated UI |
| S3 | API Rate Limiting | ✅ Completed | Added middlewares/ratelimit.go |
| S4 | Audit Logging | ✅ Completed | Added audit domain with GraphQL queries |
| S5 | Device Certificate Management | ✅ Completed | certmanager package issues mTLS client certs; generate/revoke mutations + UI |

---

## Legend

- ✅ Completed
- 🔄 In Progress
- ⬜ Not Started
- ❌ Blocked

---

## Summary

### Completed: 31 items
### Remaining: 0 items

---

## Implementation Log

### 2026-08-30 — Final outstanding items (S2, H3/TD-B3, S5)

**RBAC (S2):**
- ✅ Migration 11 adds `users.role` (default `VIEWER`; existing users backfilled to `ADMIN`)
- ✅ Added `model.Role` (ADMIN/OPERATOR/VIEWER) with hierarchical `AtLeast()`; threaded through user entity/converter/repository and JWT claim
- ✅ Added `@hasRole(minimum: Role!)` GraphQL directive; annotated all write mutations (OPERATOR) and `updateUserRole` (ADMIN); directive implemented in `internal/domain/directives.go` and wired in `main.go`
- ✅ Frontend: `me` query, `AuthService.hasRole()`/role accessors, `RoleGuard`, navbar shows real username + role, write actions gated for VIEWER

**Complete auth domain (H3 / TD-B3):**
- ✅ Added `internal/domain/auth/service.go` (Login/Register/UpdateRole) composing over the user service, and `resolver.go` (`updateUserRole`)
- ✅ `internal/handlers/auth.go` refactored into a thin HTTP adapter delegating to the auth service; login/register responses now include role
- ✅ Added `user.UpdateRole` service method + repository `Update`

**Device Certificate Management / mTLS (S5):**
- ✅ Migration 12 adds `client_cert`/`client_cert_key`/`client_cert_serial`/`client_cert_expires_at` to `devices`
- ✅ New `internal/certmanager` package: loads a platform CA from `APP_DEVICE_CA_CERT`/`APP_DEVICE_CA_KEY` or generates an ephemeral dev CA; `IssueDeviceCertificate` signs ECDSA client certs
- ✅ `device.service` Generate/Revoke methods; `generateDeviceCertificate`/`revokeDeviceCertificate` mutations + `DeviceCertificate` type; `Device` exposes `hasCertificate`/`certificateSerial`/`certificateExpiresAt`
- ✅ `http_client` presents the issued cert for mTLS in `setDeviceOperation`
- ✅ Frontend device-detail certificate section (generate/rotate/revoke, one-time key download)

**Also:** fixed a latent `logger.Info` → `Infof` format bug in `internal/scheduler/scheduler.go` that was failing `go test` under vet.

### 2026-08-13 (continued)

**Audit Logging (S4):**
- ✅ Created migration 10 for `audit_logs` table with indexes
- ✅ Added `AuditLog` resource type to pkg/resource
- ✅ Created model/audit.go with AuditLog, AuditLogInput, AuditAction, AuditStatus
- ✅ Created audit domain: entity.go, converter.go, repository.go, service.go, resolver.go
- ✅ Added GraphQL types: AuditLog, AuditLogPage, AuditAction enum, AuditStatus enum
- ✅ Added GraphQL queries: auditLogs (paginated), auditLogsForResource
- ✅ Wired audit resolver into root_resolver.go

**Code Quality (H5, TD-F5):**
- ✅ Refactored alert repository to use repo helpers consistently (H5)
- ✅ Added `NewNullableTime()` and `TimePtrFromNullableTime()` to repo/sql_types.go
- ✅ Extracted helper methods: `loadRuleRelations`, `loadMultipleRuleRelations`, `getEventsPaginated`
- ✅ Split device-create component into sub-components:
  - `DeviceMetadataFormComponent` - name, description, URL, endpoints, tags
  - `DeviceAuthFormComponent` - authentication configuration
  - `DeviceDatamodelFormComponent` - data model selection with schema preview
- ✅ Split widget-create component into sub-components:
  - `WidgetScheduleFormComponent` - schedule configuration with presets
  - `WidgetTemplateSelectorComponent` - template selection UI

**User Domain (H4):**
- ✅ Created `user/resolver.go` with `Me` query implementation
- ✅ Added `ToGraphQL()` converter function for User type
- ✅ Wired user resolver into `root_resolver.go`
- ✅ Added User type and `me` query to GraphQL schema
- Note: H3 (auth domain) marked as "by design" - auth credentials are intentionally embedded in Device
- Note: host domain resolver not needed - Host is resolved via Device resolver

**Database Schema:**
- ✅ Created migration 9 to rename `user_id` to `tenant_id` in devices, widgets, data_models tables (H1/TD-B2)
- ✅ Added indexes for tenant_id columns for better query performance
- ✅ Created corresponding down migration for rollback
- ✅ Updated device/entity.go to use `db:"tenant_id"`
- ✅ Updated widget/entity.go to use `db:"tenant_id"`
- ✅ Updated datamodel/entity.go to use `db:"tenant_id"`

### 2026-08-13

**Controller:**
- ✅ Added secrets-all ClusterRole for managing secrets (H10)
- ✅ Added ClusterRoleBinding for secrets permission
- ✅ Added EventRecorder to ApplicationReconciler (TD-C4)
- ✅ Added RBAC marker for events permission
- ✅ Events recorded at all phase transitions (Initialized, CodeObtained, BuildStarted, etc.)
- ✅ Warning events recorded on errors with phase-specific reasons

**Backend (Orchestrator):**
- ✅ Created `internal/apperrors/http_response.go` with standardized error helpers (TD-B5)
- ✅ Added `WriteError`, `WriteBadRequest`, `WriteUnauthorized`, `WriteForbidden`, etc.
- ✅ Added `HTTPStatusCode()` function mapping error types to HTTP status codes
- ✅ Updated `handlers/metrics.go` to use new error helpers
- ✅ Updated `handlers/auth.go` to use new error helpers
- ✅ Created `internal/transaction/helper.go` with generic transaction helpers (TD-B6)
- ✅ Added `WithTransactionResult[T]` and `WithReadOnlyTransaction[T]` generics
- ✅ Updated device resolver to use transaction helpers (as example)
- ✅ Created `internal/middlewares/ratelimit.go` with rate limiting (S3)
- ✅ Added global and per-client rate limiting with configurable limits
- ✅ Integrated rate limiting middleware into main router

**Frontend (Dashboard):**
- ✅ Created `shared/utils/status-config.utils.ts` with status configurations (TD-F4)
- ✅ Created `shared/pipes/status.pipe.ts` with DeviceStatusPipe, WidgetStatusPipe
- ✅ Added pipes to ComponentsModule
- ✅ Updated devices-list.component.ts to use shared status utilities
- ✅ Added missing EventMap entries for legacy events (onLoginChange, onDashboardChange)

### 2026-08-07

**Backend (Orchestrator):**
- ✅ Renamed `enitity.go` to `entity.go` in device, host, user, widget domains
- ✅ Fixed test import to use local `pkg/resource` instead of `kyma-incubator/compass`
- ✅ Added missing resource types (Host, Application, AutomaticScenarioAssigment, Label)
- ✅ Removed hardcoded DB password - now requires `APP_DB_PASSWORD` env var
- ✅ Fixed default port from 5431 to 5432

**Frontend (Dashboard):**
- ✅ Added `apiUrl` and `wsUrl` to environment files
- ✅ Updated graphql.module.ts to use environment config
- ✅ Enabled lazy loading for all 8 feature modules (home, dashboard, devices, widgets, datamodel, profile, alerts, login)
- ✅ Updated all feature routing modules to use relative paths
- ✅ Removed eagerly loaded modules from app.module.ts
- ✅ Added typed EventMap interface to EventBusService

**Controller:**
- ✅ Replaced blocking `WatchBuildReady`/`WatchDeployReady` with non-blocking `CheckBuildReady`/`CheckDeployReady`
- ✅ Changed PodManager/DeploymentManager interfaces from Watch to Get pattern
- ✅ Controller now uses proper requeue pattern with `RequeueAfter`
- ✅ Added owner reference methods (`*WithOwner`) for garbage collection
- ✅ Added CRD validation with kubebuilder markers
- ✅ Added printcolumn annotations for kubectl output
- ✅ Fixed controller-runtime API compatibility (removed deprecated fields)
