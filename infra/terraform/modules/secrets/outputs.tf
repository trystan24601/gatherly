output "session_secret_arn" {
  description = "Session secret ARN"
  value       = aws_secretsmanager_secret.session_secret.arn
}

output "ses_smtp_password_arn" {
  description = "SES SMTP password secret ARN"
  value       = aws_secretsmanager_secret.ses_smtp_password.arn
}

output "secrets_policy_arn" {
  description = "IAM policy ARN granting Lambda read access to secrets"
  value       = aws_iam_policy.lambda_get_secrets.arn
}
