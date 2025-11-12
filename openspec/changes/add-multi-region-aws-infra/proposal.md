# Change: Add multi-region AWS infrastructure for core services

## Why
ReparaYa needs low-latency, resilient infrastructure across regions as traffic grows in Europe and other geographies. Today the Terraform setup is single-region and commented out. We need a clear, scalable, and testable approach to provision S3 (media), SES (email), Amazon Location Service (geocoding/routing), and IAM permissions across multiple AWS regions.

## What Changes
- Introduce multi-region Terraform modules with provider aliases and per-region for_each.
- Provision per-region resources: S3 buckets (with recommended replication option), Location Place Index and Route Calculator, SES identities/configuration, and IAM policies bound to those resources.
- Add a traffic-aware configuration mechanism to “activate” a preferred region per service without creating/destroying resources hourly (use routing/config toggles instead of time-based infra churn).
- Outputs return region-indexed maps so the app can select endpoints by region at runtime.
- CI validation and unit tests for Terraform (fmt/validate/tflint + Terratest for module instantiation and outputs).

## Impact
- Affected specs: infra-multi-region-aws
- Affected code: infra/terraform/**/* (new modules + root orchestration), CI pipeline, tests.
- Non-goals: Hourly create/destroy of SES/S3/Location resources (operationally fragile, SES requires domain verification per region). Instead, we pre-provision in target regions and switch usage via config.

## Notes
- Requires AWS org/domain ownership for SES domain/email verification per region.
- Optional: enable S3 CRR (Cross-Region Replication) between primary and secondary buckets.
