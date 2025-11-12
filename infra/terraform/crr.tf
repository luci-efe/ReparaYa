# S3 Cross-Region Replication configuration (optional)

locals {
  primary_region = var.primary_region != "" ? var.primary_region : (length(var.regions) > 0 ? var.regions[0] : "")
  replica_region = var.replica_region != "" ? var.replica_region : (length(var.regions) > 1 ? var.regions[1] : "")

  enable_crr_internal = var.enable_crr && length(var.regions) > 1 && local.primary_region != "" && local.replica_region != ""
}

# IAM role for S3 replication
resource "aws_iam_role" "replication" {
  count = local.enable_crr_internal ? 1 : 0
  name  = "${var.project_name}-s3-replication-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-s3-replication-role"
    Environment = var.environment
  }
}

# IAM policy for S3 replication
resource "aws_iam_policy" "replication" {
  count = local.enable_crr_internal ? 1 : 0
  name  = "${var.project_name}-s3-replication-policy-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [
          module.infra_region[local.primary_region].s3_bucket_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = [
          "${module.infra_region[local.primary_region].s3_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = [
          "${module.infra_region[local.replica_region].s3_bucket_arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "replication" {
  count      = local.enable_crr_internal ? 1 : 0
  role       = aws_iam_role.replication[0].name
  policy_arn = aws_iam_policy.replication[0].arn
}

# S3 bucket replication configuration on primary bucket
resource "aws_s3_bucket_replication_configuration" "primary_to_replica" {
  count = local.enable_crr_internal ? 1 : 0

  # Must have bucket versioning enabled first
  depends_on = [
    module.infra_region
  ]

  role   = aws_iam_role.replication[0].arn
  bucket = module.infra_region[local.primary_region].s3_bucket_name

  rule {
    id     = "replicate-all"
    status = "Enabled"

    filter {
      prefix = ""
    }

    destination {
      bucket        = module.infra_region[local.replica_region].s3_bucket_arn
      storage_class = "STANDARD"
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }
}
