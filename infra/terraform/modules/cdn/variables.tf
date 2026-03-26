variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "account_id" {
  description = "AWS account ID"
  type        = string
}

variable "domain_name" {
  description = "CloudFront alias domain (e.g. gatherlywork.com or staging.gatherlywork.com)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1)"
  type        = string
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
