output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.this.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "frontend_bucket_name" {
  description = "S3 frontend assets bucket name"
  value       = aws_s3_bucket.frontend.bucket
}

output "files_bucket_name" {
  description = "S3 file storage bucket name"
  value       = aws_s3_bucket.files.bucket
}
