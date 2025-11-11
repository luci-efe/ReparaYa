# Main Terraform configuration for ReparaYa
# This file orchestrates all AWS resources needed for the platform

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # TODO: Configurar backend remoto (S3) para state cuando se tenga AWS
  # backend "s3" {
  #   bucket = "reparaya-terraform-state"
  #   key    = "dev/terraform.tfstate"
  #   region = "us-west-2"
  # }
}

provider "aws" {
  region = var.aws_region

  # TODO: Configurar profile o credenciales según ambiente
  # profile = "reparaya-dev"

  default_tags {
    tags = {
      Project     = "ReparaYa"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# TODO: Descomentar y configurar cuando se creen los recursos
# module "s3" {
#   source = "./aws"
# }
