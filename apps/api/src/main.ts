import { NestFactory } from "@nestjs/core";
import { VersioningType, ValidationPipe } from "@nestjs/common";
import { AppModule } from "./modules/app.module";
import { ApiExceptionFilter } from "./common/http/api-exception.filter";
import { ApiResponseInterceptor } from "./common/http/api-response.interceptor";
import { HttpLoggingInterceptor } from "./common/observability/http-logging.interceptor";
import { requestIdMiddleware } from "./common/observability/request-id.middleware";
import { securityHeadersMiddleware } from "./common/security/security-headers.middleware";
import { SimpleRateLimitGuard } from "./common/security/simple-rate-limit.guard";

function validateRuntimeSecurity(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === "change-this-in-production") {
    throw new Error(
      "JWT_SECRET must be configured with a strong value in production",
    );
  }
}

async function bootstrap(): Promise<void> {
  validateRuntimeSecurity();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
