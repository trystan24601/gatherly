variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "waf_rate_limit" {
  description = "Max requests per 5-minute window per IP"
  type        = number
  default     = 2000
}

variable "api_gateway_stage_arn" {
  description = "API Gateway stage ARN to associate the WAF with"
  type        = string
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
