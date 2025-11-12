## ADDED Requirements

### Requirement: Multi-Region AWS Provisioning for Core Services
The system SHALL provision core AWS services across one or more configured regions using Terraform.

#### Scenario: Provision per configured region
- **WHEN** Terraform is applied with `regions = ["us-west-2", "eu-central-1"]`
- **THEN** an AWS provider alias SHALL be configured for each region
- **AND** the following resources SHALL be created per region:
  - S3 media bucket named `${project_name}-media-${environment}-${region}`
  - Amazon Location Place Index and Route Calculator named with `${project_name}-${environment}` prefixes
  - SES identity/config set for the sender email/domain (subject to verification)
  - IAM policies granting least-privilege access for app usage of S3/SES/Location in that region

#### Scenario: Region-indexed outputs
- **WHEN** Terraform apply completes
- **THEN** outputs SHALL include maps keyed by region for S3 bucket names/ARNs, Location Index/Calculator names/ARNs, and SES configuration name

### Requirement: Traffic-Aware Regional Activation (Configuration-Driven)
The system SHALL allow activating a preferred region per service for the application without creating/destroying resources dynamically.

#### Scenario: Select preferred region via configuration
- **WHEN** operations set a parameter (e.g., SSM Parameter Store or environment variable) like `ACTIVE_REGION_LOCATION=eu-central-1`
- **THEN** the application SHALL use the Location Service endpoints in that region for read operations

#### Scenario: Fallback to nearest or default
- **WHEN** the preferred region is unavailable
- **THEN** the application SHALL fall back to the nearest available region or a configured default region

### Requirement: CI Validation and Unit Tests for Terraform
The system MUST include automated validation and unit-like tests for the Terraform modules.

#### Scenario: Static checks pass in CI
- **WHEN** CI runs on PRs
- **THEN** `terraform fmt -check`, `terraform validate`, and `tflint` SHALL pass

#### Scenario: Module instantiation test via Terratest
- **WHEN** Terratest runs against the modules with a small test fixture (plan-only for PRs)
- **THEN** it SHALL verify that for a given set of regions, the plan includes one set of region-scoped resources per region with expected names

### Requirement: Security and Least Privilege
The IAM policies MUST grant only the actions required by the application for its use cases.

#### Scenario: IAM policy scope
- **WHEN** policies are generated for S3/SES/Location
- **THEN** they SHALL reference specific bucket ARNs and Location resource ARNs for that region, avoiding `*` wildcards whenever feasible

### Requirement: Data Residency and Replication (Optional)
The system SHALL support enabling S3 cross-region replication (CRR) via configuration.

#### Scenario: CRR configurable toggle
- **WHEN** CRR is enabled via variable
- **THEN** the primary bucket SHALL replicate object versions to the configured replica bucket in a secondary region
