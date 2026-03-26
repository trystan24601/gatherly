data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_route53_zone" "main" {
  name = var.domain_name
}

locals {
  frontend_domain = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  frontend_origin = "https://${local.frontend_domain}"

  common_tags = {
    Environment = var.environment
    Project     = "gatherly"
  }
}

# ---------------------------------------------------------------------------
# ACM certificate for CloudFront (must live in us-east-1)
# ---------------------------------------------------------------------------
resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = local.frontend_domain
  validation_method = "DNS"

  tags = merge(local.common_tags, {
    Name = "gatherly-cloudfront-${var.environment}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60

  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# ---------------------------------------------------------------------------
# Modules
# ---------------------------------------------------------------------------
module "dynamodb" {
  source = "./modules/dynamodb"

  table_name  = "gatherly-${var.environment}"
  environment = var.environment
  tags        = local.common_tags
}

module "messaging" {
  source = "./modules/messaging"

  environment    = var.environment
  hosted_zone_id = data.aws_route53_zone.main.zone_id
  domain_name    = var.domain_name
  tags           = local.common_tags
}

module "secrets" {
  source = "./modules/secrets"

  environment = var.environment
  tags        = local.common_tags
}

module "lambda" {
  source = "./modules/lambda"

  environment                  = var.environment
  table_arn                    = module.dynamodb.table_arn
  sqs_queue_arn                = module.messaging.sqs_queue_arn
  secret_arns                  = [module.secrets.session_secret_arn, module.secrets.ses_smtp_password_arn]
  frontend_origin              = local.frontend_origin
  reserved_concurrent_executions = var.lambda_reserved_concurrency
  tags                         = local.common_tags
}

module "waf" {
  source = "./modules/waf"

  environment           = var.environment
  waf_rate_limit        = var.waf_rate_limit
  api_gateway_stage_arn = module.lambda.api_gateway_stage_arn
  tags                  = local.common_tags
}

module "cdn" {
  source = "./modules/cdn"

  environment         = var.environment
  account_id          = data.aws_caller_identity.current.account_id
  domain_name         = local.frontend_domain
  hosted_zone_id      = data.aws_route53_zone.main.zone_id
  acm_certificate_arn = aws_acm_certificate_validation.cloudfront.certificate_arn
  tags                = local.common_tags

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

module "observability" {
  source = "./modules/observability"

  environment          = var.environment
  lambda_function_name = module.lambda.lambda_function_name
  table_name           = module.dynamodb.table_name
  sqs_queue_name       = module.messaging.sqs_queue_name
  log_retention_days   = var.log_retention_days
  alert_email          = var.alert_email
  tags                 = local.common_tags
}
