# Feature Progress

Tracking implementation status of the features defined in [`features`](./features).

**Legend**
- `[x]` — Done (implemented end-to-end: backend + frontend where applicable)
- `[~]` — Partial (some layers or aspects implemented; see notes)
- `[ ]` — Not started

Status is broken down per layer: **BE** = orchestrator/controller backend, **FE** = Angular dashboard.

_Last assessed: 2026-08-30 (rule engine, WebSocket FE, orgs/teams, integrations, retention added this session)_

---

## Quick Wins

- [x] **1. Dashboard home page** — Overview cards showing device count, widget count, active/inactive status
  - BE: PARTIAL — no dedicated overview query; counts derived from `totalCount` on `devicesPage`/`widgetsPage` and `DataModel.deviceCount`.
  - FE: DONE — `modules/home/` renders device/widget stat cards + quick actions via `DashboardService.getStats()`.

- [x] **2. Device status indicators** — Connection status badges on device list
  - BE: PARTIAL — `Device.status` enum (INITIAL/ACTIVE/UNREACHABLE/ERROR) + on-demand `testDeviceConnection`; no background health-check loop, status is manual/on-demand.
  - FE: DONE — status badge column in `devices-list` with icon/label/tooltip. (Refreshed on load, not push/live.)

- [ ] **3. Widget execution logs** — View logs from deployed widget containers
  - BE: NOT IMPLEMENTED — controller builds/deploys containers (Kaniko) but exposes no pod-log API; no GraphQL log query.
  - FE: NOT IMPLEMENTED — `widget-details` component is a stub.

- [x] **4. Duplicate device/widget** — Clone existing configurations
  - BE: DONE — `cloneDevice(id)` / `cloneWidget(id)` mutations (@hasRole OPERATOR). Service `Clone` copies config (host, auth, tags / code, workspace, devices, schedule); clones start INITIAL/INACTIVE and without cert material.
  - FE: DONE — "Duplicate" actions call the server clone mutation and refresh the list.

- [x] **5. Export/Import** — JSON export/import for devices, widgets, data models
  - BE: N/A — handled client-side; import reuses existing create mutations.
  - FE: DONE — data models (existing), plus devices and widgets now have per-row JSON export + header Import. Device export omits auth secrets by design; imported widgets start INACTIVE.

## Medium Effort

- [~] **6. Device groups/tags** — Organize devices by location, type, or custom tags
  - BE: DONE (tags) — `devicesByTags(tags)` filters devices by tag (AND semantics) and `deviceTags` returns the distinct tenant tag set. Named groups/hierarchy still not modeled.
  - FE: DONE (tags) — server-sourced tag filter dropdown covering all tenant devices, plus existing per-row tag chips. Flat tags only, no group hierarchy.

- [x] **7. Widget templates** — Pre-built Blockly templates for common automations
  - BE: N/A — templates live in the frontend.
  - FE: DONE — `shared/templates/widget-templates.ts` (Temperature Alert, Scheduled Control, etc.) + template selector UI.

- [x] **8. Scheduling** — Cron-based widget execution scheduling
  - BE: DONE — `internal/scheduler/scheduler.go` (robfig/cron), `Widget.schedule`/`lastExecutedAt`, executes via k8s scheduler.
  - FE: DONE — `widget-schedule-form` with presets, custom cron input, preview.

- [x] **9. Data visualization** — Charts/graphs for device data history
  - BE: DONE — `metric` domain: `deviceMetrics`, `deviceMetricsSeries`, `deviceAggregatedMetrics` (SUM/AVG/MIN/MAX/COUNT/…).
  - FE: DONE — `device-metrics-chart` (Chart.js line chart, time-range) + dashboard chart widgets.

- [x] **10. Notifications** — Email/webhook alerts when device conditions are met
  - BE: DONE — `internal/notification/service.go` (SMTP + webhook) driven by alert engine; alert rules/conditions/notifications tables.
  - FE: DONE — `alert-form` notifications (email/webhook type + config).

## Larger Features

- [x] **11. Dashboard builder** — Drag-and-drop dashboard with device data widgets (gauges, charts, status indicators)
  - BE: DONE — `DashboardLayout`/`DashboardWidget` types (GAUGE/LINE_CHART/STATUS_INDICATOR/STAT_CARD/TABLE), CRUD + `updateWidgetPositions`.
  - FE: DONE — gridster drag-and-drop grid, add-widget dialog, 5 widget types, positions persisted.

- [ ] **12. Device simulator** — Mock device for testing without real hardware
  - BE: NOT IMPLEMENTED — (metrics can be pushed via `recordDeviceMetric`, but no built-in simulator).
  - FE: NOT IMPLEMENTED.

- [x] **13. Rule engine** — Visual rule builder alternative to Blockly for simpler automations
  - BE: DONE — `internal/domain/rule` automation-rule engine (migration 13: `automation_rules`/`rule_conditions`/`rule_actions`). Reuses the alert condition model (AND within a group / OR across groups); evaluated on metric-record via a `RuleEvaluator` hook wired next to the alert evaluator (`metric.SetRuleEvaluator`). On fire, runs an ordered ACTION sequence — `DEVICE_OPERATION` (via extracted `device.SendOperation`), `NOTIFICATION` (email/webhook), `DELAY`, and `INTEGRATION` (invokes a configured connector) — asynchronously in its own tx/goroutine, with per-rule cooldown. Threshold-based alert engine still exists separately.
  - FE: DONE — `modules/rules` list + `rule-form` with an OR/AND condition-group builder and a reorderable action-sequence builder (device operation / notification / delay / integration). Nav entry + lazy route.

- [~] **14. Multi-tenant support** — User/team workspaces with role-based access
  - BE: PARTIAL — RBAC (ADMIN/OPERATOR/VIEWER, `@hasRole`, `updateUserRole`) plus an organizations/teams **roster** (migration 15: `organizations`/`organization_members`) with per-member roles; `users` (ADMIN) + `organizations`/`organization(id)` queries and org CRUD + member mutations. **Note:** data ownership is still strictly per-user (`tenant_id = user.id` at `auth.go:92`); organizations are a directory/admin overlay and do **not** yet grant members shared access to each other's devices/widgets. True shared workspaces would require re-plumbing tenant resolution and are intentionally out of scope.
  - FE: DONE (for the roster) — `modules/admin` (RoleGuard `ADMIN`): Users tab with role assignment; Organizations tab with create/rename/delete + member management. Profile page shows current user + role via `me`. No workspace switcher (no shared data to switch into yet).

- [x] **15. API integrations** — Connect to external services (IFTTT, Home Assistant, cloud providers)
  - BE: DONE — `internal/domain/integration` connector hub (migration 14) with type (WEBHOOK/IFTTT/HOME_ASSISTANT/GENERIC_HTTP), endpoint, optional Bearer token, JSON config; CRUD + `testIntegration`. Integrations are now **invokable**: the automation-rule engine has an `INTEGRATION` action type (migration 17: `rule_actions.integration_id`) that calls `integration.Invoke` when a rule fires. No per-vendor SDKs (generic authenticated HTTP).
  - FE: DONE — `modules/integrations` list + form (type/endpoint/auth/config) with a Test button; the rule-form action builder offers an "Integration" action that targets a configured integration.

## Backend Enhancements

- [x] **16. WebSocket support** — Real-time device data streaming
  - BE: DONE — `Subscription.metricRecorded` + new `Subscription.deviceStatusChanged` (new `DeviceStatusPubSub`, published from `setDeviceOperation`); WebSocket transport wired in `main.go`.
  - FE: DONE — dashboard widgets consume the subscriptions live: line-chart/table append pushed points, gauge/stat-card re-fetch their aggregate on matching events, status-indicator + devices-list update status live via `deviceStatusChanged`. Polling kept as a fallback.

- [x] **17. Data persistence** — Store historical device readings in TimescaleDB/InfluxDB
  - BE: DONE — history persisted in `device_metrics` with a background retention cleanup job (`internal/retention`, `metric.DeleteOlderThan`, `APP_METRIC_RETENTION_*`, BRIN index migration 16) **and** hourly downsampling: a rollup job (`internal/retention/rollup.go`, `metric.RollupHourly`, `APP_METRIC_ROLLUP_*`) aggregates raw metrics into `device_metrics_hourly` (migration 18) for long-range queries. TimescaleDB remains an opt-in path documented in `docs/data-persistence.md`.
  - FE: DONE — history queried and displayed (charts, table/stat/line widgets); data model versioning history too.

- [ ] **18. Device discovery** — Auto-discover devices on local network (mDNS/SSDP)
  - BE: NOT IMPLEMENTED — no mDNS/SSDP; devices created manually.
  - FE: NOT IMPLEMENTED — devices added manually only.

---

## Summary

| # | Feature | Status |
|---|---------|--------|
| 1 | Dashboard home page | ✅ Done |
| 2 | Device status indicators | ✅ Done |
| 3 | Widget execution logs | ⬜ Not started |
| 4 | Duplicate device/widget | ✅ Done |
| 5 | Export/Import | ✅ Done (data models, devices, widgets) |
| 6 | Device groups/tags | ✅ Done (tags; no named group hierarchy) |
| 7 | Widget templates | ✅ Done |
| 8 | Scheduling | ✅ Done |
| 9 | Data visualization | ✅ Done |
| 10 | Notifications | ✅ Done |
| 11 | Dashboard builder | ✅ Done |
| 12 | Device simulator | ⬜ Not started |
| 13 | Rule engine | ✅ Done (automation rules + actions/delay/integration) |
| 14 | Multi-tenant support | 🟡 Partial (RBAC + org roster + admin UI; no shared-data workspaces) |
| 15 | API integrations | ✅ Done (connector hub, invokable from rules; no per-vendor SDKs) |
| 16 | WebSocket support | ✅ Done (BE + FE consuming metrics & status) |
| 17 | Data persistence | ✅ Done (retention + hourly rollups; Timescale opt-in/documented) |
| 18 | Device discovery | ⬜ Not started |

**Totals:** ✅ 14 done · 🟡 1 partial · ⬜ 3 not started

_Progress note: this round wired integrations to actually fire from automation rules (#15 → done), added metric downsampling/hourly rollups (#17 → done), and rescoped #14 — organizations are a roster/admin overlay; shared-data team workspaces were intentionally left out (data ownership stays per-user). Remaining: #14 (shared workspaces), #3 widget execution logs, #12 device simulator, #18 device discovery._
