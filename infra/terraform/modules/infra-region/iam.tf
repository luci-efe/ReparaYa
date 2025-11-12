# IAM policies for application access to regional resources

# IAM policy document for S3 access
data "aws_iam_policy_document" "s3_access" {
  statement {
    sid    = "S3ObjectAccess"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject"
    ]
    resources = ["${aws_s3_bucket.media.arn}/*"]
  }

  statement {
    sid    = "S3BucketAccess"
    effect = "Allow"
    actions = [
      "s3:ListBucket"
    ]
    resources = [aws_s3_bucket.media.arn]
  }
}

# IAM policy document for SES access
data "aws_iam_policy_document" "ses_access" {
  count = var.enable_ses ? 1 : 0

  statement {
    sid    = "SESEmailSend"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = [
      aws_ses_email_identity.sender[0].arn,
      aws_ses_configuration_set.main[0].arn
    ]
  }
}

# IAM policy document for Location Service access
data "aws_iam_policy_document" "location_access" {
  count = var.enable_location_service ? 1 : 0

  statement {
    sid    = "LocationServiceAccess"
    effect = "Allow"
    actions = [
      "geo:SearchPlaceIndexForText",
      "geo:SearchPlaceIndexForPosition",
      "geo:GetPlace"
    ]
    resources = [
      aws_location_place_index.places[0].index_arn
    ]
  }

  statement {
    sid    = "LocationRouteAccess"
    effect = "Allow"
    actions = [
      "geo:CalculateRoute"
    ]
    resources = [
      aws_location_route_calculator.routes[0].calculator_arn
    ]
  }
}

# Combined policy for application IAM user/role
data "aws_iam_policy_document" "combined" {
  source_policy_documents = concat(
    [data.aws_iam_policy_document.s3_access.json],
    var.enable_ses ? [data.aws_iam_policy_document.ses_access[0].json] : [],
    var.enable_location_service ? [data.aws_iam_policy_document.location_access[0].json] : []
  )
}

# IAM policy resource
resource "aws_iam_policy" "app_access" {
  name        = "${var.project_name}-app-${var.environment}-${var.region}"
  description = "Application access policy for ${var.region} resources"
  policy      = data.aws_iam_policy_document.combined.json

  tags = {
    Name        = "${var.project_name}-app-policy-${var.environment}-${var.region}"
    Environment = var.environment
    Region      = var.region
  }
}
