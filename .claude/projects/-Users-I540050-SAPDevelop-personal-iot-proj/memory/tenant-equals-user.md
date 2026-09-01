---
name: tenant-equals-user
description: In the orchestrator, tenant_id == the authenticated user's UUID; there is no separate tenant concept
metadata:
  type: project
---

In the orchestrator, there is no separate tenant entity — **tenant ID is the authenticated user's `user.ID` (UUID)**.

The auth middleware (`internal/middlewares/auth/auth.go`) sets both `ctx.WithValue("user", *model.User)` and `tenant.SaveToContext(ctx, user.ID)`. Migration 9 renamed `user_id` → `tenant_id` on devices/widgets/data_models, all FK to `users(id)`. ~50 domain call sites use `tenant.LoadFromContext(ctx)` to scope queries.

**Why:** Matters for RBAC work — adding roles-on-users does not affect tenant scoping, but any multi-user-per-tenant model would require decoupling `tenant_id` from `user.ID`.

**How to apply:** When adding role checks, read the user from context (key `"user"`, exported as `user.UserContextKey`). Auth is REST-only (`POST /login`, `POST /register`); JWT (`internal/auth/auth.go`, `JwtClaim`) carries only `Username`. Related: [[rbac-implementation]].
