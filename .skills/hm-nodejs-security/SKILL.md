---
name: hm-nodejs-security
description: Use when implementing authentication (JWT), authorization, CORS, rate limiting, HTTP security headers (@fastify/helmet), input sanitization, or securing a Fastify API against OWASP Top 10 vulnerabilities.
---

# Security

## Overview

Fastify security involves multiple defense layers: HTTP headers (`@fastify/helmet`), CORS (`@fastify/cors`), rate limiting (`@fastify/rate-limit`), JWT authentication (`@fastify/jwt`), input validation, and environment secret management. No single layer is sufficient — defense in depth is required.

Core principle: Validate all input, authenticate every protected route, authorize at the resource level, and never trust client-supplied data. Apply OWASP Top 10 mitigations systematically.

## Use this skill when

- setting up authentication (JWT)
- configuring CORS, Helmet, or rate limiting
- implementing role-based authorization
- validating or sanitizing input
- managing secrets and environment variables
- auditing security posture against OWASP Top 10

## 1. HTTP security headers with @fastify/helmet

```typescript
// src/app.ts
import helmet from "@fastify/helmet";

await app.register(helmet);
```

Helmet sets these headers by default:

| Header                            | Protection Against                       |
| --------------------------------- | ---------------------------------------- |
| `Content-Security-Policy`         | XSS, data injection                      |
| `Cross-Origin-Opener-Policy`      | Cross-origin attacks                     |
| `Cross-Origin-Resource-Policy`    | Spectre-like side-channel attacks        |
| `X-Content-Type-Options: nosniff` | MIME-type sniffing                       |
| `X-Frame-Options: SAMEORIGIN`     | Clickjacking                             |
| `Strict-Transport-Security`       | Protocol downgrade, cookie hijacking     |

Register Helmet before any route plugins.

**References:**

- [@fastify/helmet documentation](https://github.com/fastify/fastify-helmet) — Fastify ecosystem. Helmet wrapper for Fastify
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) — OWASP. Recommended HTTP response headers

## 2. CORS configuration

```typescript
// src/config/cors.ts
import type { FastifyCorsOptions } from "@fastify/cors";
import { env } from "./env";

export const corsConfig: FastifyCorsOptions = {
  origin:
    env.CORS_ORIGIN === "*"
      ? "*"
      : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 hours — preflight cache
};
```

```typescript
// src/app.ts
import cors from "@fastify/cors";
import { corsConfig } from "./config/cors";

await app.register(cors, corsConfig);
```

Rules:

- In production, always specify allowed origins — never use `*` with `credentials: true`
- `CORS_ORIGIN` comes from env config (Zod-validated)
- Set `maxAge` to reduce preflight overhead

**References:**

- [MDN — Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) — MDN Web Docs.
- [OWASP — CORS Misconfiguration](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing) — OWASP.

## 3. Rate limiting with @fastify/rate-limit

```typescript
// src/app.ts — global rate limit
import rateLimit from "@fastify/rate-limit";

await app.register(rateLimit, {
  max: 100,
  timeWindow: "15 minutes",
  errorResponseBuilder: (_request, context) => ({
    error: {
      code: "RATE_LIMITED",
      message: `Too many requests. Retry after ${context.after}`,
    },
  }),
});
```

```typescript
// Stricter limit on auth endpoints (route-level override)
fastify.post(
  "/login",
  {
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    preHandler: [validateBody(loginSchema)],
  },
  loginHandler,
);
```

Apply stricter rate limits on authentication endpoints to mitigate brute-force attacks.

**References:**

- [@fastify/rate-limit documentation](https://github.com/fastify/fastify-rate-limit) — Fastify ecosystem. Global and per-route rate limiting
- [OWASP — Brute Force Attack](https://owasp.org/www-community/attacks/Brute_force_attack) — OWASP.

## 4. JWT authentication with @fastify/jwt

### JWT plugin setup

```typescript
// src/shared/plugins/jwt.plugin.ts
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { env } from "@config/env";

export const jwtPlugin = fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN, // '15m'
      issuer: "your-app-name",
      audience: "your-app-name",
    },
    verify: {
      issuer: "your-app-name",
      audience: "your-app-name",
    },
  });
});
```

### Auth preHandler hook

```typescript
// src/shared/hooks/auth.hook.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError } from "@shared/errors/unauthorized.error";

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
    // @fastify/jwt assigns decoded payload to request.user
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
```

### Token generation (auth service)

```typescript
// src/modules/auth/auth.service.ts
export const authService = {
  async login(dto: LoginDto) {
    const user = await userRepository.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const accessToken = fastify.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: "15m" },
    );
    const refreshToken = fastify.jwt.sign(
      { userId: user.id, role: user.role },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: "7d" },
    );

    await authRepository.storeRefreshToken(refreshToken, user.id);

    return { accessToken, refreshToken };
  },
};
```

### Token refresh pattern

```typescript
fastify.post("/refresh", async (request, reply) => {
  const { refreshToken } = request.body as { refreshToken: string };

  const payload = fastify.jwt.verify<{ userId: string; role: string }>(
    refreshToken,
    { secret: env.JWT_REFRESH_SECRET },
  );

  const stored = await authRepository.findRefreshToken(refreshToken);
  if (!stored) throw new UnauthorizedError("Refresh token revoked");

  // Rotate: invalidate old, issue new pair
  await authRepository.deleteRefreshToken(refreshToken);

  const accessToken = fastify.jwt.sign({ userId: payload.userId, role: payload.role });
  const newRefreshToken = fastify.jwt.sign(
    { userId: payload.userId, role: payload.role },
    { secret: env.JWT_REFRESH_SECRET, expiresIn: "7d" },
  );

  await authRepository.storeRefreshToken(newRefreshToken, payload.userId);

  return reply.send({ data: { accessToken, refreshToken: newRefreshToken } });
});
```

JWT best practices (per RFC 8725):

- Short access token expiry (`15m`)
- Refresh tokens stored in DB — enables server-side revocation
- Refresh token rotation — invalidate on each use (detects theft)
- Always set `issuer` and `audience` claims
- Use separate secrets for access and refresh tokens

**References:**

- [RFC 8725 — JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) — IETF, 2020
- [@fastify/jwt documentation](https://github.com/fastify/fastify-jwt) — Fastify ecosystem. JWT plugin for Fastify
- [OWASP — JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html) — OWASP.

## 5. Role-based authorization

```typescript
// src/shared/hooks/authorize.hook.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { ForbiddenError } from "@shared/errors/forbidden.error";

export function authorize(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError("Not authenticated");
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Role '${request.user.role}' is not authorized for this action`,
      );
    }
  };
}
```

```typescript
// Usage
fastify.delete(
  "/:id",
  { preHandler: [authenticate, authorize("admin", "manager")] },
  async (request, reply) => {
    const { id } = request.params as { id: string };
    await orderService.delete(id);
    return reply.code(204).send();
  },
);
```

Authentication answers "who are you?". Authorization answers "what can you do?". Apply in order: `authenticate` → `authorize` → `validateBody/validateParams` → handler.

**References:**

- [OWASP — Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html) — OWASP.
- [NIST — Role-Based Access Control (RBAC)](https://csrc.nist.gov/projects/role-based-access-control) — NIST.

## 6. Input validation and sanitization

Validation (Zod) ensures correct shape and type. Sanitization prevents injection:

```typescript
// Validation at API boundary via Zod schema
export const createUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(1).max(100).trim(),
  password: z.string().min(8).max(128),
});

// Body size limit in Fastify (configure at server level)
const app = Fastify({
  bodyLimit: 10 * 1024 * 1024, // 10mb
});
```

Additional protections:

- Always use parameterized queries (Prisma does this by default — no raw SQL injection risk)
- Set `bodyLimit` to prevent payload DoS
- Use Zod's `.trim()`, `.toLowerCase()` transforms for normalization
- Never use `eval()`, `new Function()`, or `child_process.exec()` with user input
- If using `prisma.$queryRaw`, always use tagged template literals (auto-parameterized)

**References:**

- [OWASP Top 10 — A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/) — OWASP.
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) — OWASP.
- [Fastify — bodyLimit](https://fastify.dev/docs/latest/Reference/Server/#bodylimit) — Fastify official docs.

## 7. Environment secrets management

```typescript
// src/config/env.ts — validate all secrets at startup
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  JWT_SECRET: z.string().min(32),        // Minimum 256-bit secret
  JWT_REFRESH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  // Never have defaults for secrets
});

export const env = envSchema.parse(process.env);
```

Rules:

- Never hardcode secrets in source code
- Never commit `.env` — always commit `.env.example` (with keys, no values)
- Validate all secrets at startup — fail fast if missing
- Use different secrets per environment (dev/staging/production)
- Minimum 32 characters (256 bits) for JWT secrets

**References:**

- [The Twelve-Factor App — III. Config](https://12factor.net/config) — Adam Wiggins.
- [OWASP — Configuration and Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) — OWASP.

## 8. OWASP Top 10 coverage matrix

| OWASP Category                 | Mitigation in this stack                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| A01: Broken Access Control     | `authenticate` + `authorize` preHandlers, role checks                            |
| A02: Cryptographic Failures    | JWT with strong secrets, HTTPS-only, no sensitive data in tokens                  |
| A03: Injection                 | Prisma parameterized queries, Zod validation, no `eval()`                         |
| A04: Insecure Design           | Layer separation (route/service/repo), principle of least privilege               |
| A05: Security Misconfiguration | `@fastify/helmet` headers, `.env` validation, CORS config                         |
| A06: Vulnerable Components     | Regular `npm audit`, keep dependencies updated                                    |
| A07: Auth Failures             | `@fastify/rate-limit` on login, short token expiry, refresh rotation              |
| A08: Data Integrity            | Zod schema validation, typed DTOs, Prisma type safety                             |
| A09: Logging Failures          | Fastify built-in logger + structured logging, log auth events                     |
| A10: SSRF                      | Validate/allowlist any URL inputs, don't proxy arbitrary URLs                     |

**References:**

- [OWASP Top 10:2021](https://owasp.org/www-project-top-ten/) — OWASP.

## Common Mistakes

| Mistake                                 | Correct Approach                                                      |
| --------------------------------------- | --------------------------------------------------------------------- |
| `await app.register(cors)` with no opts | Always specify `origin`, `methods`, `allowedHeaders`                  |
| JWT secret = `"secret"` or `"12345"`    | Minimum 32-char random string, from env variable                      |
| Access token expiry `30d`               | Short-lived: `15m`. Use refresh tokens for long sessions              |
| Password stored as plain text           | Use `bcrypt` or `argon2` with salt: `bcrypt.hash(password, 12)`       |
| No rate limiting on `/login`            | Per-route `config.rateLimit` with strict limits (5 per 15 min)        |
| `authorize` before `authenticate`       | Order: `authenticate` → `authorize` → validate → handler              |
| Checking role in handler body           | Use `authorize('admin')` preHandler — keep authorization declarative  |
| `request.params.id` without validation  | Validate params via Zod: `validateParams(z.object({ id: z.string().uuid() }))` |

## References

- [OWASP Top 10:2021](https://owasp.org/www-project-top-ten/) — OWASP. Definitive web application security risk list
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) — OWASP. Node.js-specific security recommendations
- [RFC 8725 — JWT Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) — IETF, 2020.
- [@fastify/helmet](https://github.com/fastify/fastify-helmet) — Fastify ecosystem. HTTP security headers
- [@fastify/cors](https://github.com/fastify/fastify-cors) — Fastify ecosystem. CORS configuration
- [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit) — Fastify ecosystem. Rate limiting
- [@fastify/jwt](https://github.com/fastify/fastify-jwt) — Fastify ecosystem. JWT authentication
- [The Twelve-Factor App — III. Config](https://12factor.net/config) — Adam Wiggins. Environment-based secret management
- [Auth0 — Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation) — Auth0. Refresh token rotation pattern
