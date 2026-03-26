variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for DNS records"
  type        = string
}

variable "domain_name" {
  description = "Root domain name for SES (e.g. gatherlywork.com)"
  type        = string
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
