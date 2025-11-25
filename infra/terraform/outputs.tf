# Outputs de Terraform
# Estos valores se pueden usar en la configuración de la aplicación

# TODO: Descomentar cuando se creen los recursos

output "s3_media_bucket_name" {
  description = "Nombre del bucket S3 para medios"
  value       = module.aws_resources.s3_media_bucket_name
}

output "s3_media_bucket_arn" {
  description = "ARN del bucket S3 para medios"
  value       = module.aws_resources.s3_media_bucket_arn
}

output "ses_sender_email" {
  description = "Email configurado en SES"
  value       = var.ses_sender_email
}

output "location_place_index_name" {
  description = "Nombre del Place Index de Amazon Location"
  value       = module.aws_resources.location_place_index_name
}

output "location_route_calculator_name" {
  description = "Nombre del Route Calculator de Amazon Location"
  value       = module.aws_resources.location_route_calculator_name
}

output "app_access_key_id" {
  description = "Access Key ID para la aplicación"
  value       = module.aws_resources.app_access_key_id
  sensitive   = true
}

output "app_secret_access_key" {
  description = "Secret Access Key para la aplicación"
  value       = module.aws_resources.app_secret_access_key
  sensitive   = true
}
