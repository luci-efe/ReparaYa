# Main Terraform configuration for ReparaYa
# This file orchestrates all AWS resources needed for the platform

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }

  backend "s3" {
    bucket         = "reparaya-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "reparaya-terraform-locks"
    encrypt        = true
  }
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

provider "vercel" {
  api_token = var.vercel_api_token
}

module "aws_resources" {
  source = "./aws"

  environment                    = var.environment
  project_name                   = var.project_name
  s3_media_bucket_name           = var.s3_media_bucket_name
  ses_sender_email               = var.ses_sender_email
  location_place_index_name      = var.location_place_index_name
  location_route_calculator_name = var.location_route_calculator_name
}
