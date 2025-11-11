# AWS SES para envío de correos transaccionales

# TODO: Descomentar cuando se tenga acceso a AWS

# resource "aws_ses_email_identity" "sender" {
#   email = var.ses_sender_email
# }

# resource "aws_ses_configuration_set" "reparaya" {
#   name = "${var.project_name}-${var.environment}"
# }

# TODO: Configurar SNS topic para bounce/complaint notifications (opcional)
# TODO: Mover de Sandbox a Production (requiere solicitud a AWS)
