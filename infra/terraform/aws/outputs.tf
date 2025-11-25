output "s3_media_bucket_name" {
  value = aws_s3_bucket.media.id
}

output "s3_media_bucket_arn" {
  value = aws_s3_bucket.media.arn
}

output "location_place_index_name" {
  value = aws_location_place_index.places.index_name
}

output "location_route_calculator_name" {
  value = aws_location_route_calculator.routes.calculator_name
}

output "app_access_key_id" {
  value     = aws_iam_access_key.app.id
  sensitive = true
}

output "app_secret_access_key" {
  value     = aws_iam_access_key.app.secret
  sensitive = true
}
