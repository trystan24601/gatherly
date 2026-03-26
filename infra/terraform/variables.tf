variable "environment" {
  description = "Deployment environment (staging or prod)"
  type        = string

  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "Environment must be 'staging' or 'prod'."
  }
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "gatherlywork.com"
}

variable "waf_rate_limit" {
  description = "WAF rate limit: max requests per 5 minutes per IP"
  type        = number
  default     = 2000
}

variable "alert_email" {
  description = "Email address for CloudWatch alarms and budget alerts"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "lambda_reserved_concurrency" {
  description = "Lambda reserved concurrent executions (-1 for unreserved)"
  type        = number
  default     = 100
}
