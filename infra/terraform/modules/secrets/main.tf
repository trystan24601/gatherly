resource "random_bytes" "session_secret" {
  length = 32
}

resource "aws_secretsmanager_secret" "session_secret" {
  name                    = "gatherly/${var.environment}/session-secret"
  description             = "JWT/session signing secret for Gatherly ${var.environment}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, { Name = "gatherly/${var.environment}/session-secret" })
}

resource "aws_secretsmanager_secret_version" "session_secret" {
  secret_id     = aws_secretsmanager_secret.session_secret.id
  secret_string = random_bytes.session_secret.hex
}

resource "aws_secretsmanager_secret" "ses_smtp_password" {
  name                    = "gatherly/${var.environment}/ses-smtp-password"
  description             = "SES SMTP password for Gatherly ${var.environment} — rotate manually after first apply"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, { Name = "gatherly/${var.environment}/ses-smtp-password" })
}

resource "aws_secretsmanager_secret_version" "ses_smtp_password" {
  secret_id     = aws_secretsmanager_secret.ses_smtp_password.id
  secret_string = "PLACEHOLDER_ROTATE_ME"
}

# IAM policy document for Lambda to read both secrets
data "aws_iam_policy_document" "lambda_get_secrets" {
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.session_secret.arn,
      aws_secretsmanager_secret.ses_smtp_password.arn,
    ]
  }
}

resource "aws_iam_policy" "lambda_get_secrets" {
  name        = "gatherly-secrets-read-${var.environment}"
  description = "Allows Lambda to read Gatherly ${var.environment} secrets"
  policy      = data.aws_iam_policy_document.lambda_get_secrets.json

  tags = merge(var.tags, { Name = "gatherly-secrets-read-${var.environment}" })
}
