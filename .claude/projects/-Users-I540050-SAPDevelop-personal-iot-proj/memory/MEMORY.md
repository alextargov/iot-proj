# Project Memory Index

- [Tenant equals user](tenant-equals-user.md) — orchestrator has no separate tenant; tenant_id == authenticated user's UUID
- [RBAC implementation](rbac-implementation.md) — roles + @hasRole directive; enforcement reads user from context, not JWT claim
