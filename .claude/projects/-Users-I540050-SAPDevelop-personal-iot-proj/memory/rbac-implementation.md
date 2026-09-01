---
name: rbac-implementation
description: How RBAC is implemented in the orchestrator — roles, @hasRole directive, enforcement source of truth
metadata:
  type: project
---

RBAC in the orchestrator (added 2026-08-30, completing TECH_DEBT S2):

- Single role per user in `users.role`: `ADMIN` > `OPERATOR` > `VIEWER` (hierarchical). `model.Role.AtLeast(min)` does the comparison.
- Enforced by a **gqlgen `@hasRole(minimum: Role!)` directive** declared in `pkg/graphql/schema.graphql`, implemented in `internal/domain/directives.go` (`NewHasRoleDirective`), wired via `graphql.Config{Directives:...}` in `cmd/orchestrator/main.go`.
- **Source of truth is the `*model.User` in context** (`user.UserContextKey`), NOT the JWT `Role` claim — the claim is only frontend convenience.
- Write mutations → `OPERATOR`; `updateUserRole` → `ADMIN`; queries/`me` open to any authenticated user.
- Defaults: migration 11 backfilled existing users to `ADMIN`; new registrations default to `VIEWER` (set in `auth.service.Register`).

**How to apply:** to protect a new mutation, add `@hasRole(minimum: OPERATOR)` in the schema and run `./gqlgen.sh`. Frontend gating uses `AuthService.hasRole()` + `RoleGuard`. Related: [[tenant-equals-user]].
