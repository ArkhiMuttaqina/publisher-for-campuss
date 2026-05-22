#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Install dependencies"
corepack pnpm install

echo "[2/4] Run database migrations"
corepack pnpm run prisma:migrate

echo "[3/4] Seed database"
corepack pnpm run prisma:seed

echo "[4/4] Start all apps (API, Admin, Web)"
corepack pnpm run dev
