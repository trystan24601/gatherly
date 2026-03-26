resource "aws_wafv2_web_acl" "this" {
  name  = "gatherly-waf-${var.environment}"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Managed rule: AWS Common Rule Set (priority 1)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "gatherly-waf-common-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # Rate-based rule (priority 2): 2000 req / 5 min / IP
  rule {
    name     = "RateLimitPerIP"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit                 = var.waf_rate_limit
        aggregate_key_type    = "IP"
        evaluation_window_sec = 300
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "gatherly-waf-rate-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "gatherly-waf-${var.environment}"
    sampled_requests_enabled   = true
  }

  tags = merge(var.tags, { Name = "gatherly-waf-${var.environment}" })
}

resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = var.api_gateway_stage_arn
  web_acl_arn  = aws_wafv2_web_acl.this.arn
}
