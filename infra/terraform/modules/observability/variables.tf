variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda function name to monitor"
  type        = string
}

variable "table_name" {
  description = "DynamoDB table name to monitor"
  type        = string
}

variable "sqs_queue_name" {
  description = "SQS queue name to monitor"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "alert_email" {
  description = "Email for SNS alarm subscriptions"
  type        = string
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
