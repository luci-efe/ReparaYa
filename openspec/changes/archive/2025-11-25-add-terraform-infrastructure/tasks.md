## 1. Preparation
- [x] 1.1 Create S3 bucket and DynamoDB table for Terraform remote state (manual step or bootstrap script).
- [x] 1.2 Configure `backend "s3"` in `infra/terraform/main.tf`.

## 2. AWS Infrastructure
- [x] 2.1 Uncomment and review `aws` module in `infra/terraform/main.tf`.
- [x] 2.2 Uncomment and finalize resource definitions in `infra/terraform/aws/*.tf` (S3, SES, Location, IAM).
- [x] 2.3 Ensure IAM policies follow least-privilege principle.

## 3. Vercel Integration
- [x] 3.1 Add `vercel` provider to `infra/terraform/main.tf`.
- [x] 3.2 Define `vercel_project_environment_variable` resources to sync AWS outputs (Access Keys, Bucket Name, Region, etc.) to Vercel.

## 4. Documentation & Validation
- [x] 4.1 Update `infra/terraform/README.md` with deployment instructions.
- [x] 4.2 Verify `terraform plan` and `terraform apply` execute successfully.
- [x] 4.3 Verify environment variables are correctly set in Vercel.
