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

# Dynamic provider aliases for multi-region support
provider "aws" {
  alias  = "us-west-2"
  region = "us-west-2"

  default_tags {
    tags = {
      Project     = "ReparaYa"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "aws" {
  alias  = "eu-central-1"
  region = "eu-central-1"

  default_tags {
    tags = {
      Project     = "ReparaYa"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

provider "aws" {
  alias  = "ap-southeast-1"
  region = "ap-southeast-1"

  default_tags {
    tags = {
      Project     = "ReparaYa"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Multi-region infrastructure module instantiation
module "infra_region" {
  source   = "./modules/infra-region"
  for_each = toset(var.regions)

  region                  = each.key
  environment             = var.environment
  project_name            = var.project_name
  ses_sender_email        = var.ses_sender_email
  enable_ses              = var.enable_ses
  enable_location_service = var.enable_location_service

  providers = {
    aws = aws
  }
}
