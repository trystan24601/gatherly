output "sqs_queue_url" {
  description = "SQS main queue URL"
  value       = aws_sqs_queue.main.url
}

output "sqs_queue_arn" {
  description = "SQS main queue ARN"
  value       = aws_sqs_queue.main.arn
}

output "sqs_queue_name" {
  description = "SQS main queue name"
  value       = aws_sqs_queue.main.name
}

output "sqs_dlq_url" {
  description = "SQS dead-letter queue URL"
  value       = aws_sqs_queue.dlq.url
}

output "ses_domain_identity_arn" {
  description = "SES domain identity ARN"
  value       = aws_ses_domain_identity.this.arn
}
