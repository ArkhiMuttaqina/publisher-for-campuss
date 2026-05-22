#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Prisma deploy"
corepack pnpm --filter @publisher/api run prisma:deploy

echo "[2/5] Seed run #1"
corepack pnpm --filter @publisher/api run prisma:seed

echo "[3/5] Seed run #2 (re-runnable check)"
corepack pnpm --filter @publisher/api run prisma:seed

echo "[4/5] API unit/integration tests"
corepack pnpm --filter @publisher/api run test

echo "[5/5] API e2e tests"
corepack pnpm --filter @publisher/api run test:e2e

echo "✅ Seed verification finished"
