---
name: hm-nodejs-storage
description: Use when implementing file uploads, downloads, presigned URLs, or setting up S3-compatible object storage (AWS S3, MinIO, DigitalOcean Spaces) as a Fastify plugin.
---

# Storage (S3-compatible Object Storage)

## Overview

Storage is optional S3-backed or local filesystem. The plugin auto-selects the backend: if S3 credentials are present it uses `@aws-sdk/client-s3`; otherwise it falls back to a local `storage/` folder. A `Storage` interface abstracts both backends so services never know which is active.

Core principle: Route handlers and services call `fastify.storage.upload()` — they don't import AWS SDK or `fs` directly.

## Use this skill when

- adding file upload/download to an endpoint
- generating presigned URLs for direct client uploads or downloads
- configuring S3-compatible storage (MinIO, DigitalOcean Spaces, Alibaba Cloud OSS)
- setting up the storage Fastify plugin
- deciding storage key naming strategy

## 1. Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

No `@types` packages needed — AWS SDK v3 ships with TypeScript types.

## 2. Environment variables

S3 vars are **optional**. When omitted, storage falls back to local filesystem.

```typescript
// src/config/env.ts — S3 section
S3_BUCKET: z.string().optional(),                           // omit to use local FS
S3_REGION: z.string().default("us-east-1"),
S3_ENDPOINT: z.string().url().optional(),                   // MinIO: http://localhost:9000
S3_ACCESS_KEY_ID: z.string().optional(),
S3_SECRET_ACCESS_KEY: z.string().optional(),
S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),     // true for MinIO
STORAGE_LOCAL_PATH: z.string().default("./storage"),        // fallback folder
```

`.env.example`:

```env
# S3-compatible storage (optional — falls back to local ./storage folder if not set)
# S3_BUCKET=my-bucket
# S3_REGION=us-east-1
# S3_ENDPOINT=http://localhost:9000
# S3_ACCESS_KEY_ID=minioadmin
# S3_SECRET_ACCESS_KEY=minioadmin
# S3_FORCE_PATH_STYLE=true
STORAGE_LOCAL_PATH=./storage
```

- `S3_ENDPOINT` — set only for non-AWS providers. Omit for real AWS S3
- `S3_FORCE_PATH_STYLE` — MinIO requires `true` (virtual-hosted style doesn't work with local endpoints)

## 3. Storage interface + backends — `storage.ts`

Define a `Storage` interface and provide two implementations. Services only ever see the interface.

```typescript
// src/shared/storage/storage.ts
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env } from "../../config/env.js";

export interface Storage {
  upload(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<string>;
  getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string | null>;
  getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn?: number,
  ): Promise<string | null>;
  delete(key: string): Promise<void>;
}

// S3-backed implementation
export function createS3Storage(s3: S3Client): Storage {
  const bucket = env.S3_BUCKET!;
  return {
    async upload(key, body, contentType) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return key;
    },
    async getSignedDownloadUrl(key, expiresIn = 3600) {
      return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn },
      );
    },
    async getSignedUploadUrl(key, contentType, expiresIn = 3600) {
      return getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn },
      );
    },
    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

// Local filesystem fallback (development / no S3 configured)
export function createLocalStorage(basePath: string): Storage {
  const resolved = resolve(basePath);
  return {
    async upload(key, body) {
      const filePath = resolve(resolved, key);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, body);
      return key;
    },
    async getSignedDownloadUrl(key) {
      // Serve via @fastify/static mounted at /storage
      return `/storage/${key}`;
    },
    async getSignedUploadUrl(_key, _contentType) {
      return null; // not applicable for local filesystem
    },
    async delete(key) {
      await unlink(resolve(resolved, key));
    },
  };
}
```

**References:**

- [AWS SDK v3 — S3Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/) — AWS official docs
- [@aws-sdk/s3-request-presigner](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/) — AWS official docs

## 4. Fastify plugin — `storage.plugin.ts`

The plugin selects the backend based on env vars and exposes a single `fastify.storage` decorator.

```typescript
// src/shared/plugins/storage.plugin.ts
import fp from "fastify-plugin";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import { createS3Storage, createLocalStorage } from "../storage/storage.js";

export const storagePlugin = fp(async (fastify) => {
  if (env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    const s3 = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
    fastify.decorate("storage", createS3Storage(s3));
    fastify.addHook("onClose", () => s3.destroy());
  } else {
    // Falls back to local ./storage folder
    fastify.decorate("storage", createLocalStorage(env.STORAGE_LOCAL_PATH));
  }
});
```

Add type augmentation:

```typescript
// src/shared/types/fastify.d.ts
import type { Storage } from "../storage/storage.js";

declare module "fastify" {
  interface FastifyInstance {
    storage: Storage;
  }
}
```

## 5. Using storage in routes

Access via `fastify.storage` — no S3 SDK imports in route handlers:

```typescript
// src/modules/document/document.route.ts
import type { FastifyPluginAsync } from "fastify";
import { createDocumentService } from "./document.service.js";

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  const service = createDocumentService(fastify.storage);

  fastify.post("/upload", async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: { code: "NO_FILE" } });

    const buffer = await data.toBuffer();
    const key = `documents/${crypto.randomUUID()}-${data.filename}`;
    await fastify.storage.upload(key, buffer, data.mimetype);

    return reply.code(201).send({ data: { key } });
  });

  fastify.get("/:key/download-url", async (request, reply) => {
    const { key } = request.params as { key: string };
    const url = await fastify.storage.getSignedDownloadUrl(key);
    return reply.send({ data: { url } });
  });
};
```

## 6. Storage key naming strategy

```
{resource-type}/{uuid}-{original-filename}
```

Examples:

- `avatars/550e8400-e29b-41d4-a716-446655440000-photo.jpg`
- `documents/660e8400-e29b-41d4-a716-446655440001-invoice.pdf`
- `exports/2024/01/report-2024-01-15.csv`

Rules:

- Always prefix with resource type or category
- UUID prevents key collisions
- Keep original filename for human readability
- Use forward slashes `/` for logical folder structure (S3 treats them as prefixes; local FS creates subdirectories)
- Never use user-supplied filenames directly as keys — sanitize or replace with UUID

## 7. Presigned URLs for direct client upload

For large files, skip the server and let clients upload directly to S3:

1. Client requests a presigned upload URL from the API
2. Server calls `storage.getSignedUploadUrl(key, contentType)`
3. Client PUTs file directly to S3 using the presigned URL
4. Client notifies server that upload is complete

Note: `getSignedUploadUrl` returns `null` for local storage — handle this in services for dev-only flows.

This avoids proxying large files through the app server, reducing memory and bandwidth usage.

## 8. Testing

In tests, S3 env vars are typically not set, so the plugin uses local FS automatically. No mocking needed for basic upload/delete tests. For S3-specific behaviour, inject a mock storage:

```typescript
// tests/helpers/mock-storage.ts
import type { Storage } from "../../src/shared/storage/storage.js";

export function createMockStorage(): Storage {
  return {
    upload: vi.fn().mockResolvedValue("test/file.jpg"),
    getSignedDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://example.com/signed"),
    getSignedUploadUrl: vi.fn().mockResolvedValue("https://example.com/upload"),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}
```

## Common Mistakes

| Mistake                                         | Correct Approach                                                |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Hardcoding S3 as required                       | Make S3 vars optional — fall back to local FS for dev/test      |
| Creating S3Client per request                   | Single instance via Fastify plugin decorator                    |
| Importing AWS SDK directly in services          | Services receive `Storage` interface — no SDK awareness         |
| Using user-supplied filenames as S3 keys        | UUID prefix — prevents path traversal and collisions            |
| Hardcoding bucket name in multiple files        | Single source: `env.S3_BUCKET`                                  |
| Proxying large downloads through the server     | Use presigned URLs — client downloads directly from S3          |
| Missing `forcePathStyle` for MinIO              | Set `S3_FORCE_PATH_STYLE=true` for MinIO and local S3 emulators |
| Not destroying S3Client on app close            | `fastify.addHook("onClose", () => s3.destroy())`                |
| Storing credentials in code                     | Always use env vars: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| Calling `getSignedUploadUrl` without null check | For local storage it returns `null` — check before using as URL |

## Use this skill when

- adding file upload/download to an endpoint
- generating presigned URLs for direct client uploads or downloads
- configuring S3-compatible storage (MinIO, DigitalOcean Spaces, Alibaba Cloud OSS)
- setting up the storage Fastify plugin
- deciding storage key naming strategy

## 1. Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

No `@types` packages needed — AWS SDK v3 ships with TypeScript types.

## 2. Environment variables

Add to `src/config/env.ts`:

```typescript
S3_BUCKET: z.string(),
S3_REGION: z.string().default("us-east-1"),
S3_ENDPOINT: z.string().url().optional(),           // MinIO: http://localhost:9000, DO Spaces: https://sgp1.digitaloceanspaces.com
S3_ACCESS_KEY_ID: z.string(),
S3_SECRET_ACCESS_KEY: z.string(),
S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),  // true for MinIO
```

- `S3_ENDPOINT` — set only for non-AWS providers. Omit for real AWS S3
- `S3_FORCE_PATH_STYLE` — MinIO requires `true` (virtual-hosted style doesn't work with local endpoints)

## 3. Fastify plugin — `storage.plugin.ts`

Register a single `S3Client` instance as a Fastify decorator. Destroy on close.

```typescript
// src/shared/plugins/storage.plugin.ts
import fp from "fastify-plugin";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

export const storagePlugin = fp(async (fastify) => {
  const s3 = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  fastify.decorate("s3", s3);

  fastify.addHook("onClose", () => {
    s3.destroy();
  });
});
```

Add type augmentation:

```typescript
// src/shared/types/fastify.d.ts
import type { S3Client } from "@aws-sdk/client-s3";

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Client;
  }
}
```

**References:**

- [AWS SDK v3 — S3Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/) — AWS official docs

## 4. Storage helper — `storage.ts`

Wrap S3 commands in a clean interface. Services call this helper, never S3 commands directly.

```typescript
// src/shared/storage/storage.ts
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

export function createStorage(s3: S3Client) {
  const bucket = env.S3_BUCKET;

  return {
    async upload(key: string, body: Buffer | Uint8Array, contentType: string) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return key;
    },

    async getSignedDownloadUrl(key: string, expiresIn = 3600) {
      return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn },
      );
    },

    async getSignedUploadUrl(
      key: string,
      contentType: string,
      expiresIn = 3600,
    ) {
      return getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn },
      );
    },

    async delete(key: string) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export type Storage = ReturnType<typeof createStorage>;
```

**References:**

- [@aws-sdk/s3-request-presigner](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/) — AWS official docs

## 5. Using storage in routes

Pass `fastify.s3` to the storage helper in route plugins:

```typescript
// src/modules/document/document.route.ts
import type { FastifyPluginAsync } from "fastify";
import { createStorage } from "../../shared/storage/storage.js";
import { createDocumentService } from "./document.service.js";

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = createStorage(fastify.s3);
  const service = createDocumentService(storage);

  fastify.post("/upload", async (request, reply) => {
    // @fastify/multipart for file uploads
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: { code: "NO_FILE" } });

    const buffer = await data.toBuffer();
    const key = `documents/${crypto.randomUUID()}-${data.filename}`;
    await storage.upload(key, buffer, data.mimetype);

    return reply.code(201).send({ data: { key } });
  });

  fastify.get("/:key/download-url", async (request, reply) => {
    const { key } = request.params as { key: string };
    const url = await storage.getSignedDownloadUrl(key);
    return reply.send({ data: { url } });
  });
};
```

## 6. Storage key naming strategy

```
{resource-type}/{uuid}-{original-filename}
```

Examples:

- `avatars/550e8400-e29b-41d4-a716-446655440000-photo.jpg`
- `documents/660e8400-e29b-41d4-a716-446655440001-invoice.pdf`
- `exports/2024/01/report-2024-01-15.csv`

Rules:

- Always prefix with resource type or category
- UUID prevents key collisions
- Keep original filename for human readability
- Use forward slashes `/` for logical folder structure (S3 treats them as prefixes)
- Never use user-supplied filenames directly as keys — sanitize or replace with UUID

## 7. Presigned URLs for direct client upload

For large files, skip the server and let clients upload directly to S3:

1. Client requests a presigned upload URL from the API
2. Server generates presigned URL via `getSignedUploadUrl()`
3. Client PUTs file directly to S3 using the presigned URL
4. Client notifies server that upload is complete

This avoids proxying large files through the app server, reducing memory and bandwidth usage.

## 8. Testing

Mock the S3Client in tests. Do not hit real S3 during tests.

```typescript
// tests/helpers/mock-s3.ts
export function createMockS3() {
  return {
    send: vi.fn().mockResolvedValue({}),
    destroy: vi.fn(),
  };
}
```

For the storage helper, test the wrapper functions with mocked S3Client:

```typescript
import { describe, it, expect, vi } from "vitest";
import { createStorage } from "../src/shared/storage/storage.js";

describe("storage", () => {
  it("upload sends PutObjectCommand", async () => {
    const s3 = { send: vi.fn().mockResolvedValue({}), destroy: vi.fn() };
    const storage = createStorage(s3 as any);

    const key = await storage.upload(
      "test/file.txt",
      Buffer.from("hello"),
      "text/plain",
    );
    expect(key).toBe("test/file.txt");
    expect(s3.send).toHaveBeenCalledOnce();
  });
});
```

## Common Mistakes

| Mistake                                      | Correct Approach                                                    |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Creating S3Client per request                | Single instance via Fastify plugin decorator                        |
| Importing AWS SDK in services                | Services call `storage.upload()` helper, not SDK directly           |
| Using user-supplied filenames as S3 keys     | Prefix with UUID + sanitize — prevent path traversal and collisions |
| Hardcoding bucket name in multiple files     | Single source of truth: `env.S3_BUCKET`                             |
| Proxying large file downloads through server | Use presigned URLs — client downloads directly from S3              |
| Missing `forcePathStyle` for MinIO           | Set `S3_FORCE_PATH_STYLE=true` for MinIO and local S3 emulators     |
| Not destroying S3Client on app close         | `fastify.addHook("onClose", () => s3.destroy())`                    |
| Storing S3 credentials in code               | Always use env vars: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`     |
