# UI Enhancement Plan

_Scope: the Angular 21 dashboard (`components/dashboard`). This is a UI/UX-only plan — no orchestrator/controller work unless noted._

_Assessed: 2026-08-31. Findings below were gathered by auditing every feature module + the shared/global layer, and the highest-signal claims were verified directly against source. File paths and line numbers are given so each item is actionable._

---

## How to read this

Items are grouped into three tiers by leverage:

- **Tier 1 — Foundations & correctness.** Cross-cutting fixes and things that are outright broken or misleading. Highest ROI: they remove real defects and unlock the polish in later tiers.
- **Tier 2 — Per-module UX.** Concrete improvements inside individual feature modules.
- **Tier 3 — Bigger features.** Larger additions that add net-new capability.

Each item: **what** → **where** → **why**.

---

## Tier 1 — Foundations & correctness

### 1.1 Broken / misleading UI (fix first)

- **`widget-details` is a stub.** `modules/widgets/widget-details/widget-details.component.html` is literally `<p>widget-details works!</p>` and the class is empty, yet it's wired to the `:id` route (`widgets-routing.module.ts:22`). Any navigation to a widget shows a broken page. Build a real detail view (see 3.1).
- **Dead "Edit" button on devices.** `modules/devices/devices-list/devices-list.component.html:172` renders an Edit icon whose only handler is `$event.stopPropagation()` — no route, no dialog. Either wire it to an edit flow or remove the affordance.
- **`-- Wikipedia` leftover** in the datamodel expanded row (`modules/datamodel/datamodel-list/datamodel-list.component.html:95`) — demo text shipped to prod. Remove.
- **Empty-search shows raw JSON.** `devices-list` renders `No devices match "{{ dataSource.filter }}"` but `filter` is a stringified `{search,tag}` object, so users see `{"search":"foo","tag":null}` (`devices-list.component.html:197`). Show the typed term.
- **Create flows navigate away before the mutation resolves / swallow errors.**
  - `widget-create.component.ts:~416` awaits `router.navigate(['widgets'])` regardless of create success and toasts success unconditionally — a failed create still "succeeds" visually.
  - `device-create` `onSaveClick` has only a `next` handler (no error toast).
  - `datamodel-create` `saveDatamodel` ignores errors and always navigates.
  - Fix pattern: disable submit + show spinner while pending, toast on error, navigate only in the success callback.
- **Debug noise.** ~49 `console.*` calls remain across modules (`widget-create`, `widgets`, `rules`, `alerts`, `datamodel`, `app.component`). Several swallow real errors (e.g. `widgets.component` import/nav errors logged, not surfaced). Remove logs; convert error logs to toasts.
- **Login field/label mismatch.** Label says "Email Address" / error "Email is required", but the control is `username` (text) with placeholder "Enter your username" (`login.component.html:7,15`). `hasError('username')` is a dead branch (no such validator). Pick "username" consistently; also the "Sign up" link is a raw `<a href="/register">` causing a full reload — use `routerLink` and confirm the route exists.

### 1.2 Standardize confirmations (replace native `confirm()`/`alert()`)

Native dialogs are used in 5+ places, inconsistent with the Material dialogs used elsewhere:
`admin.component.ts:95`, `integrations-list.component.ts:58`, `rules-list.component.ts:74`, `datamodel-history-dialog.component.ts:61` (`confirm`), `datamodel-list.component.ts:146` (`alert`), plus destructive actions with **no** confirm at all (dashboard `removeWidget`, device cert rotate/revoke, admin remove-member).

- **Build one shared `ConfirmDialogComponent`** (title, message, optional "type name to confirm" for destructive ops, confirm/cancel labels) in `shared/components`.
- Replace all native dialogs and add confirmation to the currently-unguarded destructive actions.
- Pair deletes with a **snackbar-with-undo** where feasible (device/widget/rule/alert delete).

### 1.3 Shared UI primitives (kill the duplication)

The `shared/components` layer is thin; the same markup is re-implemented per module. Add:

- **`<app-empty-state>`** — icon + message + optional CTA. Replaces the ad-hoc "No … yet" blocks in devices, widgets, rules, alerts, integrations, datamodel, dashboard, admin. Standardize so every empty list offers a "create your first …" CTA (rules/integrations/admin currently don't).
- **`<app-loading-state>` / skeletons** — no skeleton loaders exist anywhere; loading is blocking spinners re-coded in ~19 files. Lists render empty during load, so empty-states flash misleadingly (esp. `devices-list`, `widgets`, `datamodel-list`).
- **`<app-error-state>`** — icon + message + Retry. Reuse in the widget dashboard tiles (gauge/line/stat/table all show a bare "Failed to load data" with no retry).
- **`ConfirmDialog`** (1.2).

### 1.4 Global error & auth feedback

- **GraphQL/network errors are invisible.** `shared/graphql/graphql.module.ts:18-33` only `console.error`s errors; a 401 just logs "Please log in again" with **no redirect and no toast**. Expired-token users get silent failures. Surface errors as toasts and redirect to `/login` on 401.
- **Register a global Angular `ErrorHandler`** — none exists, so uncaught runtime errors only hit the console.
- **`ToastrService` is minimal** (`showSuccess`/`showError` only). Add `info`/`warning`, titles, and consistent usage; many components toast success but log failures.
- **WebSocket connection has no status indicator.** The WS link retries silently (`graphql.module.ts:47-61`); add a global connection-state badge in the shell so users know when live subscriptions drop/reconnect.

### 1.5 Forms safety

- **No `CanDeactivate` guards anywhere** (verified). The heavy editors — device-create wizard, widget-create (Blockly + Monaco), datamodel builder — can be abandoned mid-edit with zero warning. Add a shared unsaved-changes guard + dirty tracking.
- **Inconsistent/absent `mat-error`.** Several forms only `markAllAsTouched()` on invalid submit with no visible messages (`rule-form`, `integration-form`, `datamodel-create`); `alert-form` has static `mat-error` not bound to control state. Standardize inline validation feedback.

### 1.6 Theming, shell & accessibility

- **No custom theme / no dark mode.** Only the prebuilt `azure-blue.css` is loaded (`angular.json`); brand colors are hard-coded hex literals (`#002b5c`, `#f0f2f5`) and Material internals are restyled via fragile `::ng-deep` + `!important`. Define a Material 3 theme with tokens + a light/dark toggle; this removes most of the hacks.
- **No responsive layout.** `app.component.scss` hard-codes a 240px sidebar with no media queries. The `BreakpointObserver.observe(['(max-width: 800px)'])` subscription exists but its body is **empty** (`app.component.ts:150-154`) — wire it to a collapsible `mat-sidenav`. The `NavigationEnd` subscription is likewise empty dead code.
- **Accessibility gaps.** Icon-only buttons lack `aria-label` (dashboard `more_vert`, home `refresh`); dashboard list items are `<div (click)>` (not focusable, no `role="button"`/keydown); `<nav>` has no `aria-label`; contrast risks on the dark sidebar (`lightgrey`/`rgba(255,255,255,0.5)` text). Add labels, make clickables real buttons, audit contrast.
- **No breadcrumbs / no document titles.** No `TitleStrategy` and no route `title`s; deep pages give no location context. Add a `TitleStrategy` and optional breadcrumb in `ContentHeader`.

---

## Tier 2 — Per-module UX

### Devices
- **List:** add `matSort` (name/status/created); compose text + tag filters (today the tag dropdown refetches and discards the text filter; chip-click and dropdown use divergent client-vs-server filtering); add row selection + **bulk actions** (delete/tag/export); gate Duplicate/Export by `canWrite` (Duplicate is a write op shown to VIEWERs); toast on duplicate (currently silent); add a responsive card fallback for the 5-col table; add a list-level subscription/refetch so newly created devices appear.
- **Create wizard:** consolidate onto the polished, currently-unused sub-forms (`device-auth-form`, `device-datamodel-form`, `device-metadata-form`) instead of the inline markup — the inline wizard has **plaintext password fields** (`device-create.component.html:160,173,186,190,199`), is **missing the OAuth URL control** entirely (so OAuth URL can never be entered though the code reads it), and lacks the copy-token button the sub-form already has. Add a save-in-progress/disabled state (prevents double-submit), require a valid data-model selection, and summarize connectivity/token on the Review step.
- **Detail:** subscribe to `deviceStatusChanged` so the status badge is live (the list does this; detail loads once and goes stale); add edit + TURN_ON/TURN_OFF controls (detail is entirely read-only); confirm cert rotate/revoke and toast their errors; reuse the shared `getDeviceStatusConfig` instead of the locally-duplicated `StatusConfig`.
- **Delete dialog:** fix copy ("…delete the device." → name the device, add irreversibility + dependent-data warning); consider type-to-confirm.

### Home / Overview
- Make stat cards/segments clickable → deep-link to filtered lists (e.g. "Issues" → devices filtered to error/unreachable).
- Auto-refresh or subscribe (stats load once); show a "last updated" timestamp; per-card skeletons instead of one full-page spinner; replace the redundant Quick Actions (dupes of card buttons) with genuinely distinct shortcuts (recent devices, open alerts).

### Dashboard builder
- **Edit-widget is unreachable:** the config dialog supports `mode:'edit'` but the builder never opens it — you must delete & recreate. Wire an edit action.
- Add **duplicate widget**; add **remove confirmation** (currently deletes on the X click, no undo); place new widgets in the first free cell instead of hard-coded `(0,0)` overlap; add an in-page **dashboard switcher/create/rename**; add **fullscreen/kiosk mode**, a manual "refresh all", and a live refresh-interval control; add **dashboard templates**.
- **Widget config dialog:** make Metric Name a **picker/autocomplete** from the selected device's metrics (it's free-text today → typos); expose the gauge `thresholds` and line-chart `showLegend` (both inputs exist but the dialog never sets them); validate gauge `min < max`; add a live preview.
- **Widgets:** gauge hard-codes `LastHour` aggregation and never receives thresholds (always green) — fix both, and distinguish "no data" from a real 0; reconcile line-chart's poll-vs-live-append (can flicker/duplicate); add a "no data" + retry state to all tiles; give stat-card a trend/sparkline; add sort/pagination/sticky-header + relative timestamps to the table widget; ensure status-indicator subscribes to `deviceStatusChanged`.
- **`device-metrics-chart`:** unify live-vs-historical x-axis labels (live uses `toLocaleTimeString`, history uses range-aware `formatTime`); cap live data growth (currently unbounded; the line-chart widget caps at 500); push live points to all datasets, not just `datasets[0]`; add zoom/pan, CSV/PNG export, and a custom date-range picker.

### Widgets
- **List:** add `matSort`; make rows navigate to detail; add loading skeleton; surface import/nav errors (currently logged); real status states beyond Active/Inactive (running/failed).
- **Create:** add a **Blockly fullscreen** toggle; **validate the logic step** (can currently save an empty workspace — Review shows "Logic Configured: Yes/No" but never blocks); reuse the existing `widget-schedule-form` with its live cron `schedule-preview` instead of the inline schedule UI that has no validation/preview; consolidate the two template-selection UIs (inline cards vs. the unused `widget-template-selector`); expose undo/redo affordances.
- **Delete dialog:** fix generic/broken copy; warn that scheduled runs stop.

### Rules & Alerts
- **rule-form / alert-form:** add a **plain-English summary** of the OR/AND logic + action sequence, and a **"test against recent metrics"** preview (biggest gap in both builders); make condition metric name an **autocomplete** from the device's data-model; replace **raw-JSON notification config** with structured inputs (email recipient chips, webhook URL field) + client-side JSON validation; add inline `mat-error`s; convert rule action reordering from up/down arrows to **CDK drag-and-drop**.
- **rules-list / alerts-list:** add search/sort/pagination (`MatTableDataSource`); replace native `confirm()`; add empty-state CTAs; add severity legend/tooltip (alerts).
- **alert-events:** add filter (status/severity/date) + pagination; **live updates** (fetched once today); bulk-acknowledge; highlight which value breached which threshold.

### Integrations
- Show explicit test-connection **feedback** (today it's only an icon color swap) + last-tested timestamp; add a **Test** button inside the form; URL-format validation + `mat-error`s + JSON-config validation; replace native `confirm()`; add search/sort + endpoint truncation tooltip; empty-state CTA.

### Data model
- **datamodel-list:** remove the "-- Wikipedia" leftover; add search/sort/pagination + loading skeleton; make delete-failure use a toast (not `alert()`); remove dead code (`displayName`, commented `columnsToDisplay`).
- **datamodel-create:** polish the raw `<h1>`/`<pre>` builder; toast why a Code→UI switch is blocked on invalid JSON; error handling on save + unsaved-changes guard; remove `console.log`s.
- **schema-node-editor:** validate duplicate/empty keys; support enum/format/min/max/default; add drag-to-reorder.
- **datamodel-history-dialog:** real **diff highlighting** in compare (currently side-by-side `<pre>` dumps); confirm before restore.

### Admin & Profile & Login
- **Admin:** add user-list **search + pagination**; **confirm role changes** (inline `mat-select` fires immediately, no undo) + success/error feedback; **user search/autocomplete** for org membership instead of pasting raw User IDs; confirm remove-member; empty states; paginate organization cards.
- **Profile:** currently read-only — add change-password / preferences (incl. the theme toggle from 1.6); distinguish fetch-error from unauthenticated; add loading state.
- **Login:** add password visibility toggle; loading/disabled state during submit (prevents double-submit); clearer error copy (distinguish bad credentials vs. network) and fix the "…logging in!." double punctuation.

---

## Tier 3 — Bigger features

- **3.1 Widget detail + execution logs (highest-value functional gap).** Replace the stub with: metadata, schedule + next-run time, device list, read-only Monaco of generated code, a **run-history / live execution-logs panel**, last-run status + duration, and a **"Run now"** button. There is currently no execution-logs view anywhere in the app. _(Note: a logs panel needs a backend log API — this is also open item #3 in `FEATURE_PROGRESS.md`; the FE can ship against a mocked/",coming-soon" state first.)_
- **3.2 Design system pass.** Land the Material 3 theme + tokens + dark mode (1.6), then migrate components off `::ng-deep`/`!important` and hard-coded colors onto tokens. Enables consistent theming and a user-facing theme toggle.
- **3.3 i18n readiness.** No i18n exists; all copy is inline English. If localization is on the roadmap, retrofitting is far cheaper now — introduce `@angular/localize` (or ngx-translate) and extract strings as modules are touched.
- **3.4 Accessibility conformance pass.** Beyond the quick wins in 1.6, do a WCAG AA sweep (focus management on route/dialog changes, skip-link, keyboard nav for all interactive lists, contrast tokens).

---

## Suggested sequencing

1. **Tier 1.1 + 1.2 + 1.3** — fix the broken/misleading UI, build `ConfirmDialog` + `EmptyState` + `LoadingState`/`ErrorState`, and roll them out. (Removes real defects and de-duplicates a lot.)
2. **Tier 1.4 + 1.5** — global error/auth feedback and the unsaved-changes guard.
3. **Tier 1.6** — theme/tokens + responsive sidebar + a11y quick wins.
4. **Tier 2** — module-by-module, starting with Devices and the Dashboard builder (most-used surfaces).
5. **Tier 3** — widget detail/logs, design-system migration, i18n, full a11y.

## Cross-cutting themes (recurring across modules)
- Inconsistent confirmations (Material dialog vs native `confirm()`/`alert()`).
- No test/preview for the complex builders (rules, alerts).
- Free-text metric names instead of autocomplete from device data-models.
- Raw-JSON config inputs with little/no validation (rule/alert/integration forms).
- Missing search/sort/pagination on most list tables.
- Blocking spinners, no skeletons; empty-states flash during load.
- Leftover debug/demo code (`console.*`, "-- Wikipedia").
