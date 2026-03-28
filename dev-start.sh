#!/usr/bin/env bash
set -e

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}==> Starting Occasion HQ local environment${NC}"

# 1. Copy env file if missing
if [ ! -f .env.local ]; then
  echo -e "${YELLOW}  .env.local not found — copying from .env.local.example${NC}"
  cp .env.local.example .env.local
fi

# 2. Start Docker services (DynamoDB local + Mailhog)
echo -e "${GREEN}==> Starting Docker services${NC}"
docker compose up -d

# 3. Install dependencies
echo -e "${GREEN}==> Installing dependencies${NC}"
npm install

# 4. Bootstrap DynamoDB table + GSIs (idempotent — safe to re-run)
echo -e "${GREEN}==> Bootstrapping DynamoDB${NC}"
npm run db:bootstrap --workspace=backend

# 5. Seed demo data
echo -e "${GREEN}==> Seeding demo data${NC}"
npm run db:seed --workspace=backend

# 6. Start backend + frontend dev servers in parallel
echo -e "${GREEN}==> Starting dev servers${NC}"
echo -e "    API:      http://localhost:3001"
echo -e "    Frontend: http://localhost:5173"
echo -e "    Demo:     http://localhost:5173/demo"
echo ""
npm run dev --workspace=backend & npm run dev --workspace=frontend

wait
