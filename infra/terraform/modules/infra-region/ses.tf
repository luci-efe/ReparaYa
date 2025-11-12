# AWS SES for transactional emails (conditionally created)

resource "aws_ses_email_identity" "sender" {
  count = var.enable_ses ? 1 : 0
  email = var.ses_sender_email
}

resource "aws_ses_configuration_set" "main" {
  count = var.enable_ses ? 1 : 0
  name  = "${var.project_name}-${var.environment}-${var.region}"
}

# Event destination for bounce/complaint tracking (optional)
resource "aws_ses_event_destination" "bounces" {
  count                  = var.enable_ses ? 1 : 0
  name                   = "bounces-complaints"
  configuration_set_name = aws_ses_configuration_set.main[0].name
  enabled                = true
  matching_types         = ["bounce", "complaint"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:configuration-set"
    value_source   = "emailHeader"
  }
}
