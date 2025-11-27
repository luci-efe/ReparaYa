resource "vercel_project_environment_variable" "aws_access_key_id" {
  project_id = var.vercel_project_id
  key        = "AWS_ACCESS_KEY_ID"
  value      = module.aws_resources.app_access_key_id
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "aws_secret_access_key" {
  project_id = var.vercel_project_id
  key        = "AWS_SECRET_ACCESS_KEY"
  value      = module.aws_resources.app_secret_access_key
  target     = ["production", "preview", "development"]
  sensitive  = true
}

resource "vercel_project_environment_variable" "aws_region" {
  project_id = var.vercel_project_id
  key        = "AWS_REGION"
  value      = var.aws_region
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "aws_s3_bucket_media" {
  project_id = var.vercel_project_id
  key        = "AWS_S3_BUCKET_MEDIA"
  value      = module.aws_resources.s3_media_bucket_name
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "aws_ses_sender_email" {
  project_id = var.vercel_project_id
  key        = "AWS_SES_SENDER_EMAIL"
  value      = var.ses_sender_email
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "aws_location_place_index" {
  project_id = var.vercel_project_id
  key        = "AWS_LOCATION_PLACE_INDEX"
  value      = module.aws_resources.location_place_index_name
  target     = ["production", "preview", "development"]
}

resource "vercel_project_environment_variable" "aws_location_route_calculator" {
  project_id = var.vercel_project_id
  key        = "AWS_LOCATION_ROUTE_CALCULATOR"
  value      = module.aws_resources.location_route_calculator_name
  target     = ["production", "preview", "development"]
}
