data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# CloudWatch Log Group
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, { Name = "/aws/lambda/${var.lambda_function_name}" })
}

# ---------------------------------------------------------------------------
# SNS alerts topic
# ---------------------------------------------------------------------------
resource "aws_sns_topic" "alerts" {
  name = "gatherly-alerts-${var.environment}"

  tags = merge(var.tags, { Name = "gatherly-alerts-${var.environment}" })
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ---------------------------------------------------------------------------
# CloudWatch Alarm: Lambda error rate > 1%
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "lambda_error_rate" {
  alarm_name          = "LambdaErrorRate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 1
  alarm_description   = "Lambda error rate exceeded 1% over 5 minutes"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  metric_query {
    id          = "error_rate"
    expression  = "IF(invocations > 0, errors / invocations * 100, 0)"
    label       = "Error Rate (%)"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"

      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"

      dimensions = {
        FunctionName = var.lambda_function_name
      }
    }
  }

  tags = merge(var.tags, { Name = "LambdaErrorRate-${var.environment}" })
}

# ---------------------------------------------------------------------------
# CloudWatch Dashboard
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_dashboard" "this" {
  dashboard_name = "gatherly-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Invocations & Errors"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 300 }],
            ["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 300, color = "#d62728" }],
          ]
          view    = "timeSeries"
          stacked = false
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Duration"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p50", period = 300, label = "p50" }],
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p95", period = 300, label = "p95" }],
            ["AWS/Lambda", "Duration", "FunctionName", var.lambda_function_name, { stat = "p99", period = 300, label = "p99" }],
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Throttles"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/Lambda", "Throttles", "FunctionName", var.lambda_function_name, { stat = "Sum", period = 300 }],
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "DynamoDB Capacity"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.table_name, { stat = "Sum", period = 300 }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", var.table_name, { stat = "Sum", period = 300 }],
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "SQS Messages"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/SQS", "NumberOfMessagesSent", "QueueName", var.sqs_queue_name, { stat = "Sum", period = 300 }],
            ["AWS/SQS", "ApproximateNumberOfMessagesNotVisible", "QueueName", var.sqs_queue_name, { stat = "Maximum", period = 300 }],
          ]
          view = "timeSeries"
        }
      },
    ]
  })
}

# ---------------------------------------------------------------------------
# AWS Budgets
# ---------------------------------------------------------------------------
resource "aws_budgets_budget" "this" {
  name         = "gatherly-${var.environment}"
  budget_type  = "COST"
  limit_amount = var.environment == "prod" ? "200" : "50"
  limit_unit   = "GBP"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Environment$${var.environment}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  tags = var.tags
}
