# S3 Bucket para almacenamiento de imágenes de servicios

# TODO: Descomentar y configurar cuando se tenga acceso a AWS

# resource "aws_s3_bucket" "media" {
#   bucket = var.s3_media_bucket_name
#
#   tags = {
#     Name        = "${var.project_name}-media-${var.environment}"
#     Purpose     = "Almacenamiento de imágenes de servicios"
#   }
# }

# resource "aws_s3_bucket_versioning" "media" {
#   bucket = aws_s3_bucket.media.id
#
#   versioning_configuration {
#     status = "Enabled"
#   }
# }

# resource "aws_s3_bucket_cors_configuration" "media" {
#   bucket = aws_s3_bucket.media.id
#
#   cors_rule {
#     allowed_headers = ["*"]
#     allowed_methods = ["GET", "PUT", "POST"]
#     allowed_origins = ["https://reparaya.vercel.app", "http://localhost:3000"]
#     expose_headers  = ["ETag"]
#     max_age_seconds = 3000
#   }
# }

# resource "aws_s3_bucket_public_access_block" "media" {
#   bucket = aws_s3_bucket.media.id
#
#   block_public_acls       = true
#   block_public_policy     = true
#   ignore_public_acls      = true
#   restrict_public_buckets = true
# }

# TODO: Configurar CloudFront distribution para CDN (opcional)
