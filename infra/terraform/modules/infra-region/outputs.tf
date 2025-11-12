output "region" {
  description = "AWS region for this module"
  value       = var.region
}

# S3 outputs
output "s3_bucket_name" {
  description = "Name of the S3 media bucket"
  value       = aws_s3_bucket.media.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 media bucket"
  value       = aws_s3_bucket.media.arn
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.media.bucket_regional_domain_name
}

# SES outputs
output "ses_identity_arn" {
  description = "ARN of the SES email identity"
  value       = var.enable_ses ? aws_ses_email_identity.sender[0].arn : null
}

output "ses_configuration_set_name" {
  description = "Name of the SES configuration set"
  value       = var.enable_ses ? aws_ses_configuration_set.main[0].name : null
}

# Location Service outputs
output "location_place_index_name" {
  description = "Name of the Location Place Index"
  value       = var.enable_location_service ? aws_location_place_index.places[0].index_name : null
}

output "location_place_index_arn" {
  description = "ARN of the Location Place Index"
  value       = var.enable_location_service ? aws_location_place_index.places[0].index_arn : null
}

output "location_route_calculator_name" {
  description = "Name of the Location Route Calculator"
  value       = var.enable_location_service ? aws_location_route_calculator.routes[0].calculator_name : null
}

output "location_route_calculator_arn" {
  description = "ARN of the Location Route Calculator"
  value       = var.enable_location_service ? aws_location_route_calculator.routes[0].calculator_arn : null
}

# IAM outputs
output "iam_policy_arn" {
  description = "ARN of the IAM policy for application access"
  value       = aws_iam_policy.app_access.arn
}

output "iam_policy_name" {
  description = "Name of the IAM policy for application access"
  value       = aws_iam_policy.app_access.name
}
