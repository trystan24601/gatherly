# Checkov Exceptions & Infrastructure Notes

## Bootstrap Prerequisite

The DynamoDB lock table (`gatherly-terraform-locks`) and the S3 state bucket
(`gatherly-terraform-state-299311846579`) must exist **before** running
`terraform init` with the remote backend configured in `backend.tf`.

Run the bootstrap once from a local machine with admin credentials:

```bash
# 1. Create state bucket (already exists per project setup)
# 2. Create lock table
aws dynamodb create-table \
  --table-name gatherly-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-2

# 3. Deploy OIDC provider + GitHub Actions role
cd infra/terraform/bootstrap
terraform init
terraform apply

# 4. Add GITHUB_ACTIONS_ROLE_ARN to GitHub repo secrets

# 5. Now run normal terraform init with remote backend
cd ../
terraform init -var-file=environments/staging/terraform.tfvars
```

## Accepted Checkov Findings

### CKV_AWS_117 — Lambda not in VPC
**Accepted.** Gatherly Lambda uses API Gateway HTTP API and DynamoDB public
endpoints. Placing Lambda in a VPC adds NAT Gateway cost (~£30/month/AZ) with
no security benefit for this threat model. Revisit if PII processing requirements
change.

### CKV_AWS_116 — Lambda DLQ not configured
**Accepted.** Lambda is invoked synchronously by API Gateway (not async).
Async failures are handled by the SQS DLQ in the messaging module.

### CKV_AWS_50 — X-Ray tracing not enabled on API Gateway
**Accepted.** X-Ray active tracing is enabled on the Lambda function. API
Gateway access logs are enabled. Full request tracing is achievable from Lambda
traces alone for this scale.

### CKV2_AWS_5 — Security Group not attached to resource  
**Accepted.** No VPC/security groups are used (see CKV_AWS_117 above).

### CKV_AWS_86 — CloudFront access logging not enabled
**Accepted.** CloudFront access logs incur S3 storage cost. WAF sampled
requests and CloudWatch metrics provide sufficient visibility at this scale.
Enable before any PCI/GDPR audit.

### CKV_AWS_68 — CloudFront WAF not enabled (if run against CDN module alone)
**Accepted at module level.** WAF is associated at the API Gateway layer via
the WAF module. CloudFront WAF (CLOUDFRONT scope) would require a separate
us-east-1 WAF ACL — deferred until CDN-served API traffic justifies the cost.

### CKV_AWS_111 — IAM policy allows * on resource for GitHub Actions bootstrap
**Accepted.** The bootstrap OIDC role is scoped to the gatherly-github-actions
role and is only used by CI/CD. Tighten resource ARNs after first successful
deploy when all resource ARNs are known.

### CKV_AWS_149 — Secrets Manager secret not using CMK
**Accepted.** AWS-managed keys provide encryption at rest. CMK (KMS) adds
~$1/key/month plus API call costs. Revisit for prod if compliance requires
customer-managed keys.

## tflint

tflint was not available in the build environment. Install it via:

```bash
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
cd infra/terraform && tflint --recursive
```

Recommended `.tflint.hcl`:
```hcl
plugin "aws" {
  enabled = true
  version = "0.30.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
```
