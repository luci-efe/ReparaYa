# AWS Setup Guide for ReparaYa Terraform

This guide walks you through connecting Terraform with your AWS organization and deploying the multi-region infrastructure.

## Prerequisites

Before you begin, ensure you have:
- An AWS account with appropriate permissions
- Terraform >= 1.0 installed
- AWS CLI installed (optional but recommended)
- Access to create IAM users/roles in your AWS organization

---

## Step 1: AWS Account Setup

### Option A: Using IAM User (Recommended for Development)

1. **Log into AWS Console**
   - Go to https://console.aws.amazon.com/
   - Navigate to **IAM** → **Users**

2. **Create a new IAM user for Terraform**
   ```
   User name: terraform-reparaya
   Access type: ☑ Programmatic access
   ```

3. **Attach permissions policy**
   
   For this infrastructure, you need the following AWS services:
   - Amazon S3 (for media storage)
   - Amazon SES (for email)
   - Amazon Location Service (for geocoding)
   - IAM (for policy management)
   
   **Recommended approach:** Create a custom policy or use these managed policies:
   - `AmazonS3FullAccess`
   - `AmazonSESFullAccess`
   - `AmazonLocationFullAccess`
   - `IAMFullAccess` (or limited to policy creation/attachment)
   
   **For production:** Use a more restrictive custom policy (example below)

4. **Save the credentials**
   ```
   Access Key ID: AKIA...
   Secret Access Key: wJalrXUtnFEMI...
   ```
   
   ⚠️ **IMPORTANT:** Save these securely! AWS won't show the secret again.

### Option B: Using IAM Role (Recommended for Production/CI/CD)

If running Terraform from an EC2 instance, Lambda, or GitHub Actions:

1. **Create an IAM Role** with appropriate permissions
2. **Attach the role** to your compute resource
3. **No credentials needed** - AWS SDK uses instance metadata

---

## Step 2: Configure AWS Credentials

### Method 1: Using AWS CLI (Recommended)

```bash
# Install AWS CLI if not already installed
# Ubuntu/Debian:
sudo apt install awscli

# macOS:
brew install awscli

# Configure credentials
aws configure

# You'll be prompted for:
# AWS Access Key ID: [paste your key]
# AWS Secret Access Key: [paste your secret]
# Default region name: us-west-2
# Default output format: json
```

This creates two files in your home directory:
- **`~/.aws/credentials`** - Contains your access keys
  ```ini
  [default]
  aws_access_key_id = AKIA...
  aws_secret_access_key = wJalrXUtnFEMI...
  ```
- **`~/.aws/config`** - Contains your default region and output format
  ```ini
  [default]
  region = us-west-2
  output = json
  ```

**To view your configuration:**
```bash
# Check files exist
ls -la ~/.aws/

# View config (safe to display)
cat ~/.aws/config

# View credentials (contains secret keys - be careful!)
cat ~/.aws/credentials
```

Terraform and AWS CLI will automatically detect and use these files.

### Method 2: Using Environment Variables

**Note:** If you already used Method 1 (`aws configure`), you don't need this. Environment variables take precedence over `~/.aws/credentials` files, but Method 1 is simpler for most use cases.

```bash
# Add to your ~/.bashrc or ~/.zshrc
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI..."
export AWS_DEFAULT_REGION="us-west-2"

# Reload your shell
source ~/.bashrc
```

**Credential precedence order (highest to lowest):**
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Credentials file (`~/.aws/credentials`)
3. IAM role (for EC2/ECS/Lambda)

### Method 3: Using Terraform Variables (Not Recommended - Security Risk)

**⚠️ DO NOT commit credentials to version control**

```hcl
# In terraform.tfvars (add to .gitignore)
aws_access_key = "AKIA..."
aws_secret_key = "wJalrXUtnFEMI..."
```

---

## Step 3: Verify AWS Connection

Test your AWS credentials:

```bash
# Using AWS CLI
aws sts get-caller-identity

# Expected output:
# {
#     "UserId": "AIDA...",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/terraform-reparaya"
# }
```

**Verify your configuration files:**
```bash
# Check which credentials are being used
aws configure list

# Expected output:
#       Name                    Value             Type    Location
#       ----                    -----             ----    --------
#    profile                <not set>             None    None
# access_key     ****************AFUK shared-credentials-file
# secret_key     ****************jQuv shared-credentials-file
#     region                us-west-2      config-file    ~/.aws/config
```

If you see "could not be found" errors, your credentials aren't configured correctly. Repeat Step 2.

---

## Step 4: Configure Terraform Variables

1. **Copy the example configuration**
   ```bash
   cd /home/linguini/ReparaYa/infra/terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your settings:
   ```hcl
   # Multi-region configuration
   regions = ["us-west-2", "eu-central-1"]  # Choose your regions
   
   # Environment
   environment  = "dev"  # or "staging", "prod"
   project_name = "reparaya"
   
   # SES Configuration - MUST be a real email you own
   ses_sender_email = "noreply@yourdomain.com"  # ← Change this!
   
   # Feature flags
   enable_ses              = true
   enable_location_service = true
   
   # Cross-Region Replication (optional)
   enable_crr      = false  # Enable after initial deployment
   primary_region  = "us-west-2"
   replica_region  = "eu-central-1"
   ```

3. **Verify `.gitignore` includes terraform.tfvars**
   ```bash
   grep "terraform.tfvars" .gitignore
   # Should output: *.tfvars
   ```

---

## Step 5: Initialize Terraform

```bash
cd /home/linguini/ReparaYa/infra/terraform

# Download provider plugins and initialize
terraform init

# Expected output:
# Initializing modules...
# Initializing provider plugins...
# - hashicorp/aws v5.x.x
# Terraform has been successfully initialized!
```

---

## Step 6: Plan Infrastructure Changes

```bash
# Preview what Terraform will create
terraform plan

# Save the plan to a file (optional)
terraform plan -out=tfplan
```

**Review the plan carefully:**
- Number of resources to create (should be ~11 per region for full setup)
- Resource names follow the pattern: `reparaya-*-dev-us-west-2`
- Check that regions match your configuration

---

## Step 7: Apply Infrastructure

```bash
# Apply the configuration
terraform apply

# You'll be prompted to confirm
# Type: yes

# Or use saved plan:
terraform apply tfplan
```

**This will create:**
- S3 buckets for media storage (per region)
- SES email identities (per region) - **requires verification**
- Amazon Location Service indexes (per region)
- IAM policies for application access (per region)

**Estimated time:** 2-5 minutes

---

## Step 8: Verify SES Email (CRITICAL)

⚠️ **Without this step, you cannot send emails!**

### For Each Region You Configured:

```bash
# Verify your email address in us-west-2
aws ses verify-email-identity \
  --email-address noreply@yourdomain.com \
  --region us-west-2

# Verify in eu-central-1 (if using multi-region)
aws ses verify-email-identity \
  --email-address noreply@yourdomain.com \
  --region eu-central-1
```

**Then:**
1. Check your email inbox
2. Click the verification link from Amazon SES
3. Repeat for each region

**Verify status:**
```bash
aws ses get-identity-verification-attributes \
  --identities noreply@yourdomain.com \
  --region us-west-2
```

---

## Step 9: Get Terraform Outputs

```bash
# View all outputs
terraform output

# Get specific output (e.g., S3 bucket names)
terraform output s3_bucket_names

# Output format:
# {
#   "us-west-2" = "reparaya-media-dev-us-west-2"
#   "eu-central-1" = "reparaya-media-dev-eu-central-1"
# }

# Get IAM policy ARNs for application configuration
terraform output iam_policy_arns

# Save outputs to JSON file for application config
terraform output -json > terraform-outputs.json
```

---

## Step 10: Configure Your Application

Use the Terraform outputs to configure your Next.js application:

```bash
# In apps/web/.env.local
AWS_REGION=us-west-2
AWS_S3_BUCKET=reparaya-media-dev-us-west-2
AWS_SES_CONFIG_SET=reparaya-dev-us-west-2
AWS_LOCATION_PLACE_INDEX=reparaya-places-dev-us-west-2
AWS_LOCATION_ROUTE_CALCULATOR=reparaya-routes-dev-us-west-2

# For multi-region support
ACTIVE_REGION_S3=us-west-2
ACTIVE_REGION_LOCATION=eu-central-1
ACTIVE_REGION_SES=us-west-2
FALLBACK_REGION=us-west-2

# Application will need AWS credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI...
```

---

## Additional Configuration

### Setting Up SES for Production

**By default, SES is in "Sandbox" mode** (limited to verified emails only).

To send to any email address:

1. **Go to AWS Console** → SES → Account Dashboard
2. **Click "Request production access"**
3. **Fill out the form:**
   - Use case: Transactional emails
   - Website: https://reparaya.com (or your domain)
   - Mail type: Transactional
   - Describe use case: "Service booking confirmations, password resets, notifications"
4. **Submit and wait** (typically 24-48 hours for approval)

### Domain Verification (Recommended for Production)

Instead of verifying individual email addresses:

```bash
# Verify entire domain
aws ses verify-domain-identity --domain yourdomain.com --region us-west-2
```

Then add the DNS records AWS provides (TXT, DKIM, DMARC).

### Setting Up Remote State Backend (Team Collaboration)

1. **Create S3 bucket for Terraform state:**
   ```bash
   aws s3 mb s3://reparaya-terraform-state-123 --region us-west-2
   aws s3api put-bucket-versioning \
     --bucket reparaya-terraform-state-123 \
     --versioning-configuration Status=Enabled
   ```

2. **Create DynamoDB table for state locking:**
   ```bash
   aws dynamodb create-table \
     --table-name terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-west-2
   ```

3. **Update `main.tf` backend configuration:**
   ```hcl
   terraform {
     backend "s3" {
       bucket         = "reparaya-terraform-state-123"
       key            = "dev/terraform.tfstate"
       region         = "us-west-2"
       encrypt        = true
       dynamodb_table = "terraform-locks"
     }
   }
   ```

4. **Re-initialize Terraform:**
   ```bash
   terraform init -migrate-state
   ```

---

## Custom IAM Policy (Production-Ready)

For tighter security, use this minimal IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Management",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:Get*",
        "s3:List*",
        "s3:PutBucket*",
        "s3:PutObject*",
        "s3:DeleteObject*"
      ],
      "Resource": [
        "arn:aws:s3:::reparaya-*",
        "arn:aws:s3:::reparaya-*/*"
      ]
    },
    {
      "Sid": "SESManagement",
      "Effect": "Allow",
      "Action": [
        "ses:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LocationServiceManagement",
      "Effect": "Allow",
      "Action": [
        "geo:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMPolicyManagement",
      "Effect": "Allow",
      "Action": [
        "iam:CreatePolicy",
        "iam:DeletePolicy",
        "iam:GetPolicy",
        "iam:GetPolicyVersion",
        "iam:ListPolicyVersions",
        "iam:CreatePolicyVersion",
        "iam:DeletePolicyVersion",
        "iam:TagPolicy"
      ],
      "Resource": "arn:aws:iam::*:policy/reparaya-*"
    }
  ]
}
```

---

## Troubleshooting

### "Error: No valid credential sources found"

**Solution:** Configure AWS credentials (see Step 2)

### "Error: AccessDenied when calling CreateBucket"

**Solution:** Your IAM user/role lacks S3 permissions. Add `AmazonS3FullAccess` policy.

### "Error: Email address is not verified"

**Solution:** Complete Step 8 (SES email verification)

### "Error: Service Amazon Location Service is not available in region"

**Solution:** Check [AWS Regional Services](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) for Location Service availability.

Available regions: us-east-1, us-east-2, us-west-2, eu-central-1, eu-west-1, eu-north-1, ap-southeast-1, ap-southeast-2, ap-northeast-1

### Terraform state is locked

**Solution:** If a previous run crashed:
```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

### Cost concerns

**Monitor usage:**
```bash
# Check AWS costs
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

**Set up billing alerts** in AWS Console → Billing → Budgets

---

## Testing Your Setup

### Test S3 Upload
```bash
# Upload a test file
echo "test" > test.txt
aws s3 cp test.txt s3://reparaya-media-dev-us-west-2/test/
aws s3 ls s3://reparaya-media-dev-us-west-2/test/
```

### Test SES Sending (after verification)
```bash
aws ses send-email \
  --from noreply@yourdomain.com \
  --destination ToAddresses=your-email@example.com \
  --message "Subject={Data=Test},Body={Text={Data=Test email}}" \
  --region us-west-2
```

### Test Location Service
```bash
aws location search-place-index-for-text \
  --index-name reparaya-places-dev-us-west-2 \
  --text "1600 Amphitheatre Parkway, Mountain View, CA" \
  --region us-west-2
```

---

## Next Steps

1. ✅ Configure AWS credentials
2. ✅ Deploy infrastructure with `terraform apply`
3. ✅ Verify SES email in each region
4. ✅ Copy outputs to application configuration
5. ⏭️ Test S3 uploads from your Next.js application
6. ⏭️ Test SES email sending from your application
7. ⏭️ Enable CRR after validating single-region setup
8. ⏭️ Set up remote state backend for team collaboration
9. ⏭️ Request SES production access
10. ⏭️ Set up monitoring and billing alerts

---

## Security Best Practices

- ✅ Never commit `terraform.tfvars` or AWS credentials to Git
- ✅ Use IAM roles for production deployments
- ✅ Enable MFA on your AWS root account
- ✅ Rotate access keys regularly (every 90 days)
- ✅ Use AWS Organizations for multi-account setup
- ✅ Enable CloudTrail for audit logging
- ✅ Set up billing alerts to avoid surprise charges
- ✅ Review IAM policies regularly for least-privilege
- ✅ Enable S3 bucket encryption (already configured)
- ✅ Use AWS Secrets Manager for sensitive config in production

---

## Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Amazon Location Service Documentation](https://docs.aws.amazon.com/location/)
- [AWS Cost Calculator](https://calculator.aws/)

---

## Need Help?

- Check the main `README.md` in this directory
- Review `IMPLEMENTATION.md` for architecture details
- Run `./ci-validate.sh` to verify Terraform configuration
- Contact your AWS account administrator for permissions issues
