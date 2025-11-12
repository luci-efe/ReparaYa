# Outputs de Terraform
# Estos valores se pueden usar en la configuración de la aplicación

# Region-indexed outputs (maps keyed by region)
output "regions" {
  description = "List of configured regions"
  value       = var.regions
}

output "s3_bucket_names" {
  description = "Map of S3 bucket names by region"
  value       = { for k, v in module.infra_region : k => v.s3_bucket_name }
}

output "s3_bucket_arns" {
  description = "Map of S3 bucket ARNs by region"
  value       = { for k, v in module.infra_region : k => v.s3_bucket_arn }
}

output "s3_bucket_regional_domains" {
  description = "Map of S3 bucket regional domain names by region"
  value       = { for k, v in module.infra_region : k => v.s3_bucket_regional_domain_name }
}

output "ses_identity_arns" {
  description = "Map of SES identity ARNs by region (null if SES disabled)"
  value       = { for k, v in module.infra_region : k => v.ses_identity_arn }
}

output "ses_configuration_set_names" {
  description = "Map of SES configuration set names by region (null if SES disabled)"
  value       = { for k, v in module.infra_region : k => v.ses_configuration_set_name }
}

output "location_place_index_names" {
  description = "Map of Location Place Index names by region (null if Location Service disabled)"
  value       = { for k, v in module.infra_region : k => v.location_place_index_name }
}

output "location_place_index_arns" {
  description = "Map of Location Place Index ARNs by region (null if Location Service disabled)"
  value       = { for k, v in module.infra_region : k => v.location_place_index_arn }
}

output "location_route_calculator_names" {
  description = "Map of Location Route Calculator names by region (null if Location Service disabled)"
  value       = { for k, v in module.infra_region : k => v.location_route_calculator_name }
}

output "location_route_calculator_arns" {
  description = "Map of Location Route Calculator ARNs by region (null if Location Service disabled)"
  value       = { for k, v in module.infra_region : k => v.location_route_calculator_arn }
}

output "iam_policy_arns" {
  description = "Map of IAM policy ARNs by region for application access"
  value       = { for k, v in module.infra_region : k => v.iam_policy_arn }
}

output "iam_policy_names" {
  description = "Map of IAM policy names by region for application access"
  value       = { for k, v in module.infra_region : k => v.iam_policy_name }
}

# CRR status
output "crr_enabled" {
  description = "Whether S3 Cross-Region Replication is enabled"
  value       = var.enable_crr && length(var.regions) > 1
}

output "crr_primary_region" {
  description = "Primary region for CRR (if enabled)"
  value       = var.enable_crr && length(var.regions) > 1 ? (var.primary_region != "" ? var.primary_region : var.regions[0]) : null
}

output "crr_replica_region" {
  description = "Replica region for CRR (if enabled)"
  value       = var.enable_crr && length(var.regions) > 1 ? (var.replica_region != "" ? var.replica_region : var.regions[1]) : null
}
