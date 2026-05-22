import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: buildDatabaseUrl()
        }
      }
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ?? "5432";
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;
  const ssl = (process.env.DB_SSL ?? "false").toLowerCase() === "true";

  if (!host || !user || !password || !name) {
    throw new Error(
      "Database configuration is missing. Set DATABASE_URL or define DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME."
    );
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const params = new URLSearchParams();

  if (ssl) {
    params.set("sslmode", "require");
  }

  const query = params.toString();

  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${name}${query ? `?${query}` : ""}`;
}
