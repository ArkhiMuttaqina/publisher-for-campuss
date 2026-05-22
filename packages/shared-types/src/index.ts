export type WorkflowStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected";

export type RoleName =
  | "super_admin"
  | "publisher_admin"
  | "editor"
  | "catalog_manager"
  | "author_manager"
  | "reviewer"
  | "submission_user"
  | "viewer";

export type MediaFileType = "cover" | "full_pdf" | "preview_pdf" | "blog_image";

export type MediaVisibility = "private" | "campus" | "public";

export interface LocalizedText {
  id: string;
  en: string;
}

export interface SeoMetaInput {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
}

export interface SeoMetaUpsert {
  targetType: "book" | "blog" | "author" | "category";
  targetId: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  user: AuthUser;
}

export interface SubmissionInput {
  title: string;
  titleLocalized?: LocalizedText;
  description?: string;
  descriptionLocalized?: LocalizedText;
}

export interface AuthRefresh {
  refreshToken: string;
}

export interface AuthLogout {
  refreshToken: string;
}

export interface AuthorInput {
  name: string;
  slug: string;
  biography?: string;
  biographyLocalized?: LocalizedText;
  avatarUrl?: string;
}
