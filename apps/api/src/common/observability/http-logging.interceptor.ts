import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      ip?: string;
      headers: Record<string, string | undefined>;
      requestId?: string;
    }>();
    const response = http.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      tap(() => {
        const logEntry = {
          level: "info",
          event: "http_request",
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          requestId: request.requestId,
          ip: request.ip,
          userAgent: request.headers["user-agent"],
          timestamp: new Date().toISOString(),
        };

        process.stdout.write(`${JSON.stringify(logEntry)}\n`);
      }),
    );
  }
}
