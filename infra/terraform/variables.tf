# Variables de configuración para Terraform

variable "aws_region" {
  description = "AWS region donde se desplegarán los recursos (deprecated, use regions)"
  type        = string
  default     = "us-west-2"
}

variable "regions" {
  description = "List of AWS regions to deploy resources to"
  type        = list(string)
  default     = ["us-west-2"]

  validation {
    condition     = length(var.regions) > 0
    error_message = "At least one region must be specified."
  }
}

variable "environment" {
  description = "Ambiente de despliegue (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "reparaya"
}

# S3 Variables
variable "s3_media_bucket_name" {
  description = "Nombre del bucket S3 para almacenar medios (imágenes de servicios)"
  type        = string
  default     = "reparaya-media-dev"
}

# SES Variables
variable "ses_sender_email" {
  description = "Email verificado en SES para envío de correos"
  type        = string
  default     = "noreply@reparaya.com"
}

# Amazon Location Service Variables
variable "location_place_index_name" {
  description = "Nombre del Place Index para geocodificación"
  type        = string
  default     = "reparaya-places"
}

variable "location_route_calculator_name" {
  description = "Nombre del Route Calculator para cálculo de distancias"
  type        = string
  default     = "reparaya-routes"
}

# Multi-region configuration
variable "enable_ses" {
  description = "Enable SES email service provisioning"
  type        = bool
  default     = true
}

variable "enable_location_service" {
  description = "Enable Amazon Location Service provisioning"
  type        = bool
  default     = true
}

variable "enable_crr" {
  description = "Enable S3 Cross-Region Replication between primary and secondary buckets"
  type        = bool
  default     = false
}

variable "primary_region" {
  description = "Primary region for CRR source (defaults to first region in list)"
  type        = string
  default     = ""
}

variable "replica_region" {
  description = "Replica region for CRR destination (defaults to second region in list if available)"
  type        = string
  default     = ""
}
