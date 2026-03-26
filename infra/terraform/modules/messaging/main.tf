# ---------------------------------------------------------------------------
# SQS queues
# ---------------------------------------------------------------------------
resource "aws_sqs_queue" "dlq" {
  name                      = "gatherly-events-dlq-${var.environment}"
  sqs_managed_sse_enabled   = true
  message_retention_seconds = 1209600 # 14 days

  tags = merge(var.tags, { Name = "gatherly-events-dlq-${var.environment}" })
}

resource "aws_sqs_queue" "main" {
  name                      = "gatherly-events-${var.environment}"
  sqs_managed_sse_enabled   = true
  visibility_timeout_seconds = 30

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, { Name = "gatherly-events-${var.environment}" })
}

# ---------------------------------------------------------------------------
# SES domain identity
# ---------------------------------------------------------------------------
resource "aws_ses_domain_identity" "this" {
  domain = var.domain_name
}

resource "aws_route53_record" "ses_verification" {
  zone_id = var.hosted_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.this.verification_token]
}

resource "aws_ses_domain_identity_verification" "this" {
  domain = aws_ses_domain_identity.this.id

  depends_on = [aws_route53_record.ses_verification]
}

# ---------------------------------------------------------------------------
# SES DKIM
# ---------------------------------------------------------------------------
resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = var.hosted_zone_id
  name    = "${aws_ses_domain_dkim.this.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.this.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# ---------------------------------------------------------------------------
# SES mail-from domain
# ---------------------------------------------------------------------------
resource "aws_ses_domain_mail_from" "this" {
  domain           = aws_ses_domain_identity.this.domain
  mail_from_domain = "mail.${var.domain_name}"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = var.hosted_zone_id
  name    = "mail.${var.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.eu-west-1.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = var.hosted_zone_id
  name    = "mail.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}
