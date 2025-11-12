## Context
Current Terraform setup is single-region and commented out. Need repeatable provisioning for S3, SES, Location Service, and IAM across multiple AWS regions responding to traffic distribution while avoiding frequent create/destroy cycles.

## Goals / Non-Goals
Goals:
- Multi-region resource provisioning using one root module
- Region-keyed outputs consumed by app or deployment pipeline
- Config-driven activation (choose active region) without infra churn
- Least-privilege IAM
Non-Goals:
- Real-time scaling by creating/destroying SES/S3 in hourly windows
- Traffic-based auto-provisioning (will use metrics to adjust config in ops flows)

## Decisions
1. Use `for_each` with provider aliases instead of separate workspaces per region (simpler state management).
2. Pre-provision resources in target regions; app uses an "active region" env variable to select endpoints.
3. Optional S3 Cross-Region Replication (CRR) for durability; disabled by default.
4. Terratest for plan validation (avoid full apply in CI to reduce costs).

## Alternatives Considered
- Multiple root directories per region: increases duplication.
- Terraform workspaces: confusing for per-region resource drift; prefer explicit mapping.
- Dynamic creation based on CloudWatch metrics via Lambda: over-engineered initially.

## Risks / Trade-offs
- SES domain/email verification is manual per region → Document runbook.
- Increased AWS costs for multi-region (accept small baseline idle cost).
- Complexity of CRR IAM role/policy; keep behind feature flag.

## Migration Plan
1. Introduce module + variables (no apply yet).
2. Validate naming outputs with Terratest.
3. Enable apply in dev with one extra region.
4. Gradually add EU region to production by verifying SES domain.

## Open Questions
- Do we need CloudFront CDN fronting regional S3? (Future enhancement)
- Should active region selection live in Parameter Store vs env var? (Pending ops preference)
