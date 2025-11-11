# IAM Roles y Policies para acceso a recursos AWS desde la aplicación

# TODO: Descomentar cuando se tenga acceso a AWS

# # IAM User para la aplicación (opción 1: user + access keys)
# # Nota: En producción, preferir IAM Roles con OIDC desde Vercel
# resource "aws_iam_user" "app" {
#   name = "${var.project_name}-app-${var.environment}"
#
#   tags = {
#     Name        = "${var.project_name}-app-user"
#     Environment = var.environment
#   }
# }

# # Policy para S3 (upload/read de imágenes)
# resource "aws_iam_user_policy" "s3_media" {
#   name = "${var.project_name}-s3-media-policy"
#   user = aws_iam_user.app.name
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "s3:PutObject",
#           "s3:GetObject",
#           "s3:DeleteObject"
#         ]
#         Resource = "${aws_s3_bucket.media.arn}/*"
#       },
#       {
#         Effect = "Allow"
#         Action = [
#           "s3:ListBucket"
#         ]
#         Resource = aws_s3_bucket.media.arn
#       }
#     ]
#   })
# }

# # Policy para SES (envío de emails)
# resource "aws_iam_user_policy" "ses_send" {
#   name = "${var.project_name}-ses-send-policy"
#   user = aws_iam_user.app.name
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "ses:SendEmail",
#           "ses:SendRawEmail"
#         ]
#         Resource = "*"
#       }
#     ]
#   })
# }

# # Policy para Amazon Location Service
# resource "aws_iam_user_policy" "location" {
#   name = "${var.project_name}-location-policy"
#   user = aws_iam_user.app.name
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "geo:SearchPlaceIndexForText",
#           "geo:SearchPlaceIndexForPosition",
#           "geo:CalculateRoute"
#         ]
#         Resource = [
#           aws_location_place_index.places.index_arn,
#           aws_location_route_calculator.routes.calculator_arn
#         ]
#       }
#     ]
#   })
# }

# # Access keys para el usuario (CUIDADO: no commitear en código)
# resource "aws_iam_access_key" "app" {
#   user = aws_iam_user.app.name
# }

# # Output de las credenciales (usar con precaución)
# output "app_access_key_id" {
#   value     = aws_iam_access_key.app.id
#   sensitive = true
# }

# output "app_secret_access_key" {
#   value     = aws_iam_access_key.app.secret
#   sensitive = true
# }
