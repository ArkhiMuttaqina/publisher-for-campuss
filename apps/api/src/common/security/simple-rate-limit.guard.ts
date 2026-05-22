import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

@Injectable()
export class SimpleRateLimitGuard implements CanActivate {
  private readonly windowMs = Number(
    process.env.RATE_LIMIT_WINDOW_MS ?? 60_000,
  );
  private readonly maxRequests = Number(
    process.env.RATE_LIMIT_MAX_REQUESTS ?? 120,
  );

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method: string;
      ip?: string;
      originalUrl?: string;
      url: string;
    }>();

    if (
      request.method === "GET" ||
      request.method === "HEAD" ||
      request.method === "OPTIONS"
    ) {
      return true;
    }

    const now = Date.now();
    const ip = request.ip ?? "unknown";
    const path = request.originalUrl ?? request.url;
    const key = `${ip}:${path}`;

    const current = counters.get(key);
    if (!current || now >= current.resetAt) {
      counters.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    current.count += 1;
    if (current.count > this.maxRequests) {
      throw new HttpException(
        "Rate limit exceeded",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
