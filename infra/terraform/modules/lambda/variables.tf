variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "table_arn" {
  description = "DynamoDB table ARN"
  type        = string
}

variable "sqs_queue_arn" {
  description = "SQS queue ARN"
  type        = string
}

variable "secret_arns" {
  description = "Secrets Manager secret ARNs Lambda may access"
  type        = list(string)
}

variable "frontend_origin" {
  description = "Frontend origin URL for CORS (e.g. https://gatherlywork.com)"
  type        = string
}

variable "reserved_concurrent_executions" {
  description = "Lambda reserved concurrent executions (-1 for unreserved)"
  type        = number
  default     = -1
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
