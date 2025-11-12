# ReparaYa Terraform Quick Start

**⚡ Fast track to deploying your AWS infrastructure**

## Prerequisites Check

```bash
# Verify installations
terraform --version  # Need: >= 1.0
aws --version       # Optional but recommended

# If missing:
# Ubuntu/Debian: sudo apt install terraform awscli
# macOS: brew install terraform awscli
```

## 5-Minute Setup

### 1. Configure AWS Credentials
```bash
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Default region: us-west-2
# Output format: json
```

### 2. Set Up Variables
```bash
cd /home/linguini/ReparaYa/infra/terraform
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars and change:
# - ses_sender_email to YOUR real email address
# - regions (optional, defaults to ["us-west-2"])
```

### 3. Deploy
```bash
terraform init
terraform plan      # Review what will be created
terraform apply     # Type 'yes' to confirm
```

### 4. Verify SES Email (CRITICAL!)
```bash
# For EACH region you configured:
aws ses verify-email-identity \
  --email-address YOUR_EMAIL@domain.com \
  --region us-west-2

# Then check your email and click the verification link
```

### 5. Get Configuration Values
```bash
terraform output

# Copy these values to your app's .env.local file
```

## Common Commands

```bash
# View outputs
terraform output

# View specific output
terraform output s3_bucket_names

# Check what would change
terraform plan

# Apply changes
terraform apply

# Destroy everything (⚠️ CAUTION!)
terraform destroy

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No AWS credentials | Run `aws configure` |
| Access denied | Check IAM permissions (need S3, SES, Location, IAM) |
| Email not verified | Check inbox, click SES verification link |
| Region not supported | Use: us-west-2, eu-central-1, ap-southeast-1 |

## Getting IAM Credentials

1. **AWS Console** → **IAM** → **Users** → **Add User**
2. Name: `terraform-reparaya`
3. Access type: **Programmatic access**
4. Permissions: Attach policies:
   - `AmazonS3FullAccess`
   - `AmazonSESFullAccess`
   - `AmazonLocationFullAccess`
   - `IAMFullAccess` (or limited IAM policy management)
5. **Save the Access Key ID and Secret Access Key**

## What Gets Created

Per region you configure:
- ✅ S3 bucket for media storage (encrypted, versioned)
- ✅ SES email identity + configuration set
- ✅ Amazon Location Place Index (geocoding)
- ✅ Amazon Location Route Calculator (distances)
- ✅ IAM policy for app access

## Cost Estimate

**Single region:** ~$3-5/month
**Two regions:** ~$8-12/month

(Assumes typical low-volume development usage)

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Verify SES email
3. ⏭️ Copy `terraform output` values to app `.env.local`
4. ⏭️ Test S3 upload from your Next.js app
5. ⏭️ Test sending emails
6. ⏭️ Request SES production access (AWS Console)

## Full Documentation

📖 **Detailed guide:** `AWS_SETUP_GUIDE.md`
📖 **Complete README:** `README.md`
📖 **Implementation details:** `IMPLEMENTATION.md`

## Support

- **Terraform errors?** → Run `terraform validate` and `./ci-validate.sh`
- **AWS errors?** → Check IAM permissions with `aws sts get-caller-identity`
- **Need help?** → Review `AWS_SETUP_GUIDE.md` for detailed troubleshooting
