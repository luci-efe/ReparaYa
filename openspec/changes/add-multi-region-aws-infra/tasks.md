## 1. Implementation
- [x] 1.1 Add `regions` variable and provider aliases in `infra/terraform/main.tf`
- [x] 1.2 Create `modules/infra-region/` Terraform module for S3, Location, SES (feature flags for SES/Location) and IAM policies
- [x] 1.3 Add optional S3 CRR configuration (replication role + rules) when `enable_crr = true` and two+ regions provided
- [x] 1.4 Root module: iterate over `var.regions` with `for_each` to instantiate `infra-region` module
- [x] 1.5 Expose region-indexed outputs (maps) at root
- [x] 1.6 Add variables for activation config (active region per service) via outputs or SSM parameters (document only)
- [x] 1.7 Write Terratest: plan-only test verifying resource count and naming patterns for 2 regions
- [x] 1.8 Add CI script: terraform fmt/validate/tflint + go test (Terratest) with `-run TestPlanMultiRegion`
- [x] 1.9 Update `infra/terraform/README.md` with multi-region usage and activation guidance
- [x] 1.10 Document IAM least-privilege patterns and S3/SES domain verification caveats
- [x] 1.11 Run local validation; ensure `openspec validate add-multi-region-aws-infra --strict` passes

## 2. Quality & Validation
- [x] 2.1 Add `.tflint.hcl` baseline if absent
- [x] 2.2 Ensure module input variable validation (non-empty regions)
- [x] 2.3 Add pre-commit hook instructions (optional) for terraform fmt/tflint

## 3. Deployment & Ops
- [x] 3.1 Provide guidance for one-time SES domain/email verification per region
- [x] 3.2 Provide guidance for enabling/disabling CRR
- [x] 3.3 Provide fallback region strategy doc snippet

## 4. Post-Implementation
- [x] 4.1 Update change tasks to checked
- [ ] 4.2 Prepare for archive after deployment (`openspec archive add-multi-region-aws-infra --yes`)
