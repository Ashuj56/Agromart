terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend state configuration (S3 + DynamoDB locking)
  # backend "s3" {
  #   bucket         = "agromart-terraform-state"
  #   key            = "state/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "agromart-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
