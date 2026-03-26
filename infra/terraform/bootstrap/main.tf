data "aws_caller_identity" "current" {}

# GitHub OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # Thumbprint for token.actions.githubusercontent.com (valid as of 2024)
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

# IAM role assumed by GitHub Actions via OIDC
resource "aws_iam_role" "github_actions" {
  name = "gatherly-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Project   = "gatherly"
    ManagedBy = "terraform-bootstrap"
  }
}

# Policy: deploy permissions for GitHub Actions
resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "gatherly-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:UpdateFunctionCode", "lambda:UpdateFunctionConfiguration", "lambda:GetFunction"]
        Resource = "arn:aws:lambda:eu-west-2:${data.aws_caller_identity.current.account_id}:function:gatherly-api-*"
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::gatherly-frontend-*",
          "arn:aws:s3:::gatherly-frontend-*/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject", "s3:PutObject", "s3:ListBucket",
          "s3:GetBucketVersioning",
        ]
        Resource = [
          "arn:aws:s3:::gatherly-terraform-state-${data.aws_caller_identity.current.account_id}",
          "arn:aws:s3:::gatherly-terraform-state-${data.aws_caller_identity.current.account_id}/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem", "dynamodb:PutItem",
          "dynamodb:DeleteItem", "dynamodb:DescribeTable",
        ]
        Resource = "arn:aws:dynamodb:eu-west-2:${data.aws_caller_identity.current.account_id}:table/gatherly-terraform-locks"
      },
      {
        Sid    = "TerraformDynamoDB"
        Effect = "Allow"
        Action = ["dynamodb:*"]
        Resource = [
          "arn:aws:dynamodb:eu-west-2:${data.aws_caller_identity.current.account_id}:table/gatherly-*",
        ]
      },
      {
        Sid    = "TerraformIAM"
        Effect = "Allow"
        Action = [
          "iam:GetRole", "iam:CreateRole", "iam:DeleteRole", "iam:AttachRolePolicy",
          "iam:DetachRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy",
          "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies",
          "iam:CreatePolicy", "iam:DeletePolicy",
          "iam:GetPolicy", "iam:GetPolicyVersion", "iam:ListPolicyVersions",
          "iam:CreatePolicyVersion", "iam:DeletePolicyVersion",
          "iam:CreateOpenIDConnectProvider", "iam:GetOpenIDConnectProvider",
          "iam:TagRole", "iam:UntagRole", "iam:ListRoleTags",
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/gatherly-*",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/gatherly-*",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com",
        ]
      },
      {
        # iam:PassRole must be scoped — only allow passing gatherly roles to gatherly services
        Sid      = "TerraformIAMPassRole"
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/gatherly-*"
        Condition = {
          StringEquals = {
            "iam:PassedToService" = [
              "lambda.amazonaws.com",
              "apigateway.amazonaws.com",
            ]
          }
        }
      },
      {
        Sid      = "TerraformSecrets"
        Effect   = "Allow"
        Action   = ["secretsmanager:*"]
        Resource = "arn:aws:secretsmanager:eu-west-2:${data.aws_caller_identity.current.account_id}:secret:gatherly/*"
      },
      {
        Sid      = "TerraformSQS"
        Effect   = "Allow"
        Action   = ["sqs:*"]
        Resource = "arn:aws:sqs:eu-west-2:${data.aws_caller_identity.current.account_id}:gatherly-*"
      },
      {
        Sid      = "TerraformSNS"
        Effect   = "Allow"
        Action   = ["sns:*"]
        Resource = "arn:aws:sns:eu-west-2:${data.aws_caller_identity.current.account_id}:gatherly-*"
      },
      {
        Sid      = "TerraformLogs"
        Effect   = "Allow"
        Action   = ["logs:*"]
        Resource = "arn:aws:logs:eu-west-2:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/gatherly-*"
      },
      {
        Sid    = "TerraformCloudWatch"
        Effect = "Allow"
        Action = ["cloudwatch:*"]
        Resource = [
          "arn:aws:cloudwatch::${data.aws_caller_identity.current.account_id}:dashboard/gatherly-*",
          "arn:aws:cloudwatch:eu-west-2:${data.aws_caller_identity.current.account_id}:alarm:gatherly-*",
        ]
      },
      {
        # These AWS services only support Resource: * — scoped by naming convention and OIDC subject
        Sid    = "TerraformGlobalScope"
        Effect = "Allow"
        Action = [
          "apigateway:*",
          "cloudfront:*",
          "route53:*",
          "ses:*",
          "wafv2:*",
          "xray:PutTraceSegments", "xray:PutTelemetryRecords", "xray:GetSamplingRules",
          "xray:GetSamplingTargets", "xray:GetSamplingStatisticSummaries",
          "acm:*",
          "budgets:*",
        ]
        Resource = "*"
      }
    ]
  })
}
