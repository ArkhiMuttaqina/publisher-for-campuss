import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envFilePath = resolve(process.cwd(), ".env");
  if (!existsSync(envFilePath)) {
    return;
  }

  const raw = readFileSync(envFilePath, "utf8");
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnv();

function buildDatabaseUrl(env) {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const host = env.DB_HOST;
  const port = env.DB_PORT ?? "5432";
  const user = env.DB_USER;
  const password = env.DB_PASSWORD;
  const name = env.DB_NAME;
  const ssl = String(env.DB_SSL ?? "false").toLowerCase() === "true";

  if (!host || !user || !password || !name) {
    console.error(
      "Missing DB config. Set DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME.",
    );
    process.exit(1);
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const query = ssl ? "?sslmode=require" : "";

  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${name}${query}`;
}

const args = process.argv.slice(2);
const DATABASE_URL = buildDatabaseUrl(process.env);

function runPrisma(bin, binArgs) {
  return spawnSync(bin, binArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL,
    },
  });
}

let result = runPrisma("pnpm", ["exec", "prisma", ...args]);

if (result.error && result.error.code === "ENOENT") {
  result = runPrisma("corepack", ["pnpm", "exec", "prisma", ...args]);
}

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
