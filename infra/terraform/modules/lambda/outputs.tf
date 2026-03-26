output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "api_gateway_stage_arn" {
  description = "API Gateway stage ARN for WAF association"
  value       = "arn:aws:apigateway:${data.aws_region.current.name}::/apis/${aws_apigatewayv2_api.this.id}/stages/${aws_apigatewayv2_stage.default.id}"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.this.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.this.arn
}

output "lambda_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda.arn
}
