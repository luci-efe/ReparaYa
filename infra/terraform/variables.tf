# Variables de configuración para Terraform

variable "aws_region" {
  description = "AWS region donde se desplegarán los recursos"
  type        = string
  default     = "us-west-2"
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
