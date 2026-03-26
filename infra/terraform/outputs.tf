output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = module.lambda.api_gateway_url
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.cdn.cloudfront_distribution_id
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend assets"
  value       = module.cdn.frontend_bucket_name
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.lambda.lambda_function_name
}

output "table_name" {
  description = "DynamoDB table name"
  value       = module.dynamodb.table_name
}

output "sqs_queue_url" {
  description = "SQS main queue URL"
  value       = module.messaging.sqs_queue_url
}

output "waf_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = module.waf.waf_acl_arn
}

output "sns_alerts_topic_arn" {
  description = "SNS alerts topic ARN"
  value       = module.observability.sns_topic_arn
}
