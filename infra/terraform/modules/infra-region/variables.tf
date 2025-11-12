variable "region" {
  description = "AWS region for this module instance"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "ses_sender_email" {
  description = "Email address for SES sender identity"
  type        = string
}

variable "enable_ses" {
  description = "Enable SES resources in this region"
  type        = bool
  default     = true
}

variable "enable_location_service" {
  description = "Enable Amazon Location Service resources in this region"
  type        = bool
  default     = true
}
