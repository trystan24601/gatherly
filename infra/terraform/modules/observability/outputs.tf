output "sns_topic_arn" {
  description = "SNS alerts topic ARN"
  value       = aws_sns_topic.alerts.arn
}

output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.this.dashboard_name
}

output "alarm_arn" {
  description = "Lambda error rate alarm ARN"
  value       = aws_cloudwatch_metric_alarm.lambda_error_rate.arn
}
