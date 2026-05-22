import { z } from "zod";

export const slugSchema = z
  .string()
  .min(3)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const seoMetaSchema = z.object({
  title: z.string().min(10).max(70),
  description: z.string().min(50).max(160),
  canonicalUrl: z.string().url().optional(),
  ogImage: z.string().url().optional(),
});

export const seoMetaUpsertSchema = z.object({
  targetType: z.enum(["book", "blog", "author", "category"]),
  targetId: z.string().min(1),
  metaTitle: z.string().min(10).max(70),
  metaDescription: z.string().min(50).max(160),
  canonicalUrl: z.string().url().optional(),
  ogImageUrl: z.string().url().optional(),
});

export const bookBaseSchema = z.object({
  title: z.string().min(2),
  slug: slugSchema,
  summary: z.string().min(20),
  publicationYear: z.number().int().min(1500).max(3000),
});

export type BookBaseInput = z.infer<typeof bookBaseSchema>;

export const localizedTextSchema = z.object({
  id: z.string().min(1),
  en: z.string().min(1),
});

export const workflowStatusSchema = z.enum([
  "draft",
  "review",
  "approved",
  "published",
  "archived",
]);

export const submissionStatusSchema = z.enum([
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
]);

export const roleNameSchema = z.enum([
  "super_admin",
  "publisher_admin",
  "editor",
  "catalog_manager",
  "author_manager",
  "reviewer",
  "submission_user",
  "viewer",
]);

export const mediaFileTypeSchema = z.enum([
  "cover",
  "full_pdf",
  "preview_pdf",
  "blog_image",
]);
export const mediaVisibilitySchema = z.enum(["private", "campus", "public"]);

export const paginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

export const apiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const apiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(apiErrorDetailSchema).optional(),
  }),
});

export const apiSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: paginationMetaSchema.optional(),
  });

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: roleNameSchema,
});

export const authLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.number().int().positive(),
  user: authUserSchema,
});

export const submissionInputSchema = z.object({
  title: z.string().min(3),
  titleLocalized: localizedTextSchema.optional(),
  description: z.string().min(5).optional(),
  descriptionLocalized: localizedTextSchema.optional(),
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authLogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authorInputSchema = z.object({
  name: z.string().min(2),
  slug: slugSchema,
  biography: z.string().optional(),
  biographyLocalized: localizedTextSchema.optional(),
  avatarUrl: z.string().url().optional(),
});
