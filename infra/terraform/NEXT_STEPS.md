# ✅ Legacy Cleanup & AWS Setup Complete

**Date:** November 11, 2025
**Branch:** feature/terraform-setup

## What Was Done

### 1. ✅ Removed Legacy Files
Deleted the deprecated `infra/terraform/aws/` directory containing old single-region files:
- ❌ `aws/s3_media.tf`
- ❌ `aws/ses_email.tf`
- ❌ `aws/location_service.tf`
- ❌ `aws/iam.tf`

These files are obsolete and replaced by the new multi-region module structure.

### 2. ✅ Updated Documentation
- Updated `README.md` to remove references to legacy files
- Added quick start section with links to new guides

### 3. ✅ Created Comprehensive AWS Setup Guides

#### New Files Created:

1. **`QUICKSTART.md`** (Quick Reference)
   - 5-minute setup guide
   - Common commands cheat sheet
   - Troubleshooting table
   - Cost estimates

2. **`AWS_SETUP_GUIDE.md`** (Complete Guide)
   - Step-by-step AWS credential setup
   - IAM user/role configuration
   - Terraform initialization
   - SES email verification process
   - Production deployment guidance
   - Remote state backend setup
   - Custom IAM policies
   - Testing procedures
   - Security best practices

## Current State

```
infra/terraform/
├── 📘 README.md                    # Main documentation (updated)
├── 🚀 QUICKSTART.md                # NEW: 5-minute quick start
├── 📖 AWS_SETUP_GUIDE.md           # NEW: Complete AWS guide
├── 📋 IMPLEMENTATION.md             # Technical implementation details
├── 🔧 main.tf                      # Root module configuration
├── 🔧 variables.tf                 # Configuration variables
├── 🔧 outputs.tf                   # Region-indexed outputs
├── 🔧 crr.tf                       # Cross-region replication
├── ⚙️  terraform.tfvars.example     # Example configuration
├── 🧪 ci-validate.sh               # CI validation script
├── 📝 .tflint.hcl                  # Linting configuration
├── 📂 modules/infra-region/        # Multi-region module
│   ├── s3.tf                       # S3 bucket per region
│   ├── ses.tf                      # SES per region
│   ├── location.tf                 # Location Service per region
│   ├── iam.tf                      # IAM policies per region
│   ├── variables.tf
│   ├── outputs.tf
│   └── versions.tf
└── 📂 tests/                       # Terratest validation
    ├── terraform_multi_region_test.go
    └── go.mod
```

## What You Need to Do Now

### Step 1: Get AWS Credentials

**Option A: Create IAM User (Recommended for Learning/Dev)**

1. Log into AWS Console: https://console.aws.amazon.com
2. Go to **IAM** → **Users** → **Add user**
3. Settings:
   - **User name:** `terraform-reparaya`
   - **Access type:** ☑️ Programmatic access
4. **Attach policies:**
   - `AmazonS3FullAccess`
   - `AmazonSESFullAccess`
   - `AmazonLocationFullAccess`
   - `IAMFullAccess` (or create custom limited policy)
5. **Download credentials** (Access Key ID + Secret Access Key)
   - ⚠️ **SAVE THESE SECURELY** - AWS won't show them again!

**Option B: Use IAM Role (For Production/CI/CD)**
- If running from EC2, Lambda, or GitHub Actions
- Attach IAM role with appropriate policies to your compute resource
- No credentials needed (uses instance metadata)

### Step 2: Configure Credentials on Your Machine

```bash
# Install AWS CLI (if not installed)
# Ubuntu/Debian:
sudo apt install awscli

# macOS:
brew install awscli

# Configure credentials
aws configure

# You'll be prompted for:
# AWS Access Key ID: [paste from Step 1]
# AWS Secret Access Key: [paste from Step 1]
# Default region name: us-west-2
# Default output format: json
```

**Verify it works:**
```bash
aws sts get-caller-identity

# Should output your account info
```

### Step 3: Configure Your ReparaYa Settings

```bash
cd /home/linguini/ReparaYa/infra/terraform

# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit the file
nano terraform.tfvars  # or use your preferred editor
```

**IMPORTANT: Change these values in `terraform.tfvars`:**

```hcl
# Multi-region configuration
regions = ["us-west-2"]  # Start with 1 region, add more later

# Environment
environment  = "dev"
project_name = "reparaya"

# ⚠️ CRITICAL: Change this to YOUR real email!
ses_sender_email = "YOUR_EMAIL@gmail.com"  # ← CHANGE THIS!

# Feature flags
enable_ses              = true
enable_location_service = true

# Start with CRR disabled
enable_crr = false
```

### Step 4: Deploy Infrastructure

```bash
# Make sure you're in the terraform directory
cd /home/linguini/ReparaYa/infra/terraform

# Initialize Terraform (downloads AWS provider)
terraform init

# Preview what will be created
terraform plan

# Review the output, then apply
terraform apply
# Type: yes
```

**What gets created:**
- 1 S3 bucket for media storage
- 1 SES email identity (needs verification)
- 1 Location Place Index (geocoding)
- 1 Location Route Calculator (distances)
- 1 IAM policy for app access

**Time:** 2-5 minutes

### Step 5: Verify Your Email (CRITICAL!)

**Without this, you can't send emails!**

```bash
# Verify your email in SES
aws ses verify-email-identity \
  --email-address YOUR_EMAIL@gmail.com \
  --region us-west-2

# Check your email inbox
# Click the verification link from Amazon SES
```

**Check verification status:**
```bash
aws ses get-identity-verification-attributes \
  --identities YOUR_EMAIL@gmail.com \
  --region us-west-2

# Should show: "VerificationStatus": "Success"
```

### Step 6: Get Configuration for Your App

```bash
# View all outputs
terraform output

# Example output:
# s3_bucket_names = {
#   "us-west-2" = "reparaya-media-dev-us-west-2"
# }

# Save to JSON file
terraform output -json > terraform-outputs.json
```

**Add these to your Next.js app** (`apps/web/.env.local`):

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=us-west-2

# From terraform outputs
AWS_S3_BUCKET=reparaya-media-dev-us-west-2
AWS_SES_CONFIG_SET=reparaya-dev-us-west-2
AWS_LOCATION_PLACE_INDEX=reparaya-places-dev-us-west-2
AWS_LOCATION_ROUTE_CALCULATOR=reparaya-routes-dev-us-west-2
```

## Testing Your Setup

### Test S3
```bash
echo "test" > test.txt
aws s3 cp test.txt s3://reparaya-media-dev-us-west-2/test/
aws s3 ls s3://reparaya-media-dev-us-west-2/test/
```

### Test SES (after email verification)
```bash
aws ses send-email \
  --from YOUR_EMAIL@gmail.com \
  --destination ToAddresses=YOUR_EMAIL@gmail.com \
  --message "Subject={Data=Test},Body={Text={Data=Hello from SES}}" \
  --region us-west-2

# Check your email inbox
```

### Test Location Service
```bash
aws location search-place-index-for-text \
  --index-name reparaya-places-dev-us-west-2 \
  --text "Zócalo, Ciudad de México" \
  --region us-west-2
```

## Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| "No valid credential sources" | Run `aws configure` with your credentials |
| "Access Denied" | Check IAM permissions (need S3/SES/Location/IAM) |
| "Email not verified" | Check email, click SES verification link |
| Can't send to other emails | SES is in sandbox mode, need production access |
| High costs | You're likely okay, but check AWS Cost Explorer |

## Cost Estimate

**Single region (dev):**
- S3: ~$1-2/month (mostly free tier)
- SES: First 62,000 emails free, then $0.10/1000
- Location Service: ~$0.50-1/month
- **Total: Under $5/month**

## Next Steps

1. ✅ Get AWS credentials (IAM user)
2. ✅ Run `aws configure`
3. ✅ Edit `terraform.tfvars` with your email
4. ✅ Run `terraform apply`
5. ✅ Verify email in SES
6. ⏭️ Test S3, SES, Location Service
7. ⏭️ Integrate with Next.js app
8. ⏭️ Request SES production access (to send to any email)
9. ⏭️ Add second region (optional)
10. ⏭️ Enable CRR (optional)

## Detailed Guides

- **Quick Start:** Read `QUICKSTART.md`
- **Full Setup:** Read `AWS_SETUP_GUIDE.md`
- **Architecture:** Read `IMPLEMENTATION.md`
- **Usage:** Read `README.md`

## Questions?

1. **"Do I need an AWS Organization?"**
   - No, a regular AWS account is fine for dev/staging
   - Organizations are for managing multiple AWS accounts (optional)

2. **"What if I don't have a domain?"**
   - Use a personal email (Gmail, etc.) for development
   - You can only send TO that verified email in sandbox mode
   - For production, you'll need a domain and production SES access

3. **"Is this expensive?"**
   - No! Development usage is mostly free tier
   - Expect < $5/month for low-volume usage
   - Set up billing alerts to be safe

4. **"Can I use this for production?"**
   - Yes! The infrastructure is production-ready
   - You'll need: domain verification, SES production access, proper IAM
   - Consider remote state backend and multiple regions

5. **"What about multiple environments (dev/staging/prod)?"**
   - Use Terraform workspaces OR
   - Use separate `terraform.tfvars` files OR
   - Use different directories with different state files

## Security Reminders

- ✅ Never commit `terraform.tfvars` to Git (it's in `.gitignore`)
- ✅ Never commit AWS credentials to Git
- ✅ Rotate access keys every 90 days
- ✅ Enable MFA on your AWS account
- ✅ Use IAM roles for production
- ✅ Review and minimize IAM permissions regularly

---

**Ready to deploy?** Follow the steps above or jump to `QUICKSTART.md`! 🚀
