# Gatherly

Volunteer management platform for events organisations. Built on AWS serverless infrastructure with a React frontend and Node.js backend.

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js 20 + TypeScript + Express (local) / Lambda (prod)
- **Database**: DynamoDB single-table design
- **Infrastructure**: Terraform + AWS (Lambda, API Gateway, CloudFront, SQS, SES)
- **CI/CD**: GitHub Actions

## Local Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20
- npm 10+

### Getting started

```bash
cp .env.local.example .env.local
docker compose up -d
npm install
npm run db:bootstrap --workspace=backend
npm run db:seed --workspace=backend
```

Services:

| URL | Service |
|---|---|
| http://localhost:5173 | Frontend |
| http://localhost:3001/health | API health check |
| http://localhost:8001 | DynamoDB Admin UI |
| http://localhost:8025 | Mailhog (email capture) |

### Seeded Accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Volunteer | volunteer@example.com | `TestPassword123!` | |
| Org Admin (approved) | admin@gatherlydemohq.com | `TestPassword123!` | Org: Gatherly Demo Runners |
| Org Admin (pending) | admin@pending-org.com | `TestPassword123!` | Org awaiting super admin approval |
| Org Admin (rejected) | admin@rejected-org.com | `TestPassword123!` | Org rejected with reason |
| Super Admin | superadmin@gatherlywork.com | `TestPassword123!` | Can approve/reject orgs at `/admin/organisations` |

Seed data includes: 3 organisations (approved, pending, rejected), 1 published event with 2 roles, 5 users across all roles.

## Environment Variables

See `.env.local.example` for all required variables. Copy to `.env.local` for local development — never commit `.env.local`.

## Commands

```bash
# Backend
npm run dev --workspace=backend          # Start API (port 3001)
npm run test --workspace=backend         # Run unit tests
npm run db:bootstrap --workspace=backend # Create DynamoDB table + GSIs
npm run db:seed --workspace=backend      # Populate demo data

# Frontend
npm run dev --workspace=frontend         # Start dev server (port 5173)
npm run test --workspace=frontend        # Run component tests

# E2E
npm run test --workspace=e2e             # Run Playwright tests
```

## Infrastructure

Terraform modules under `infra/terraform/`. Two environments: `staging` and `prod`.

### First-time setup

1. Create the Terraform state lock table (one-time):
   ```bash
   aws dynamodb create-table \
     --table-name gatherly-terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region eu-west-2
   ```

2. Bootstrap GitHub Actions OIDC role:
   ```bash
   cd infra/terraform/bootstrap
   terraform init && terraform apply
   ```
   Add the output role ARN as `GITHUB_ACTIONS_ROLE_ARN` in GitHub repo secrets.

3. Deploy staging:
   ```bash
   cd infra/terraform
   terraform init
   terraform apply -var-file=environments/staging/terraform.tfvars
   ```

## CI/CD

- **Pull request** → `ci.yml`: lint, typecheck, unit tests, build, Playwright E2E
- **Merge to main** → `deploy-staging.yml`: automated staging deploy
- **Tagged release / manual** → `deploy-prod.yml`: manual approval gate then prod deploy
