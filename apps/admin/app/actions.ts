"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiRequest, API_BASE_URL } from "./lib/api";
import { ADMIN_LANG_COOKIE, parseAdminLanguage } from "./lib/i18n";

const ADMIN_AUTH_COOKIE = "admin_auth";
const ALLOWED_ADMIN_ROLES = new Set([
  "super_admin",
  "publisher_admin",
  "editor",
  "catalog_manager",
  "author_manager",
  "reviewer",
  "submission_user",
]);

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

export async function loginAdminAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  let loginResponse: LoginResponse;
  try {
    loginResponse = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  } catch {
    redirect("/login?error=invalid_credentials");
  }

  const cookieStore = await cookies();

  if (!ALLOWED_ADMIN_ROLES.has(loginResponse.user.role)) {
    cookieStore.delete(ADMIN_AUTH_COOKIE);
    redirect("/login?error=forbidden_role");
  }

  cookieStore.set(ADMIN_AUTH_COOKIE, loginResponse.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: loginResponse.expiresInSeconds,
  });

  cookieStore.set("admin_refresh", loginResponse.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  redirect("/");
}

export async function logoutAdminAction(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("admin_refresh")?.value;

  if (refreshToken) {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: { refreshToken },
      });
    } catch {
      // Ignore errors if the token is already invalid
    }
  }

  cookieStore.delete(ADMIN_AUTH_COOKIE);
  cookieStore.delete("admin_refresh");
  redirect("/login");
}

export async function setAdminLanguageAction(
  formData: FormData,
): Promise<void> {
  const langInput = String(formData.get("lang") ?? "en");
  const lang = parseAdminLanguage(langInput);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_LANG_COOKIE, lang, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  revalidatePath("/");
}

async function authHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  if (!token) {
    redirect("/login?error=session_required");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function createBlogPostAction(formData: FormData): Promise<{ id?: string, success: boolean }> {
  const title = String(formData.get("title") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const content = String(formData.get("content") ?? "");
  const authorName = String(formData.get("authorName") ?? "");
  const excerpt = String(formData.get("excerpt") ?? "");

  const result = await apiRequest<{ id: string }>("/blog-posts", {
    method: "POST",
    headers: await authHeaders(),
    body: {
      title,
      slug,
      content,
      authorName,
      excerpt: excerpt || undefined,
    },
  });

  revalidatePath("/");
  return { id: result?.id, success: !!result?.id };
}

export async function publishBlogPostAction(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  const status = String(formData.get("status") ?? "draft");

  await apiRequest(`/blog-posts/${postId}/publish`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: { status },
  });

  revalidatePath("/");
}

export async function upsertSeoMetaAction(formData: FormData): Promise<void> {
  const targetType = String(formData.get("targetType") ?? "book");
  const targetId = String(formData.get("targetId") ?? "");
  const metaTitle = String(formData.get("metaTitle") ?? "");
  const metaDescription = String(formData.get("metaDescription") ?? "");
  const canonicalUrl = String(formData.get("canonicalUrl") ?? "");
  const ogImageUrl = String(formData.get("ogImageUrl") ?? "");

  await apiRequest("/seo-meta/upsert", {
    method: "POST",
    headers: await authHeaders(),
    body: {
      metaTitle,
      metaDescription,
      canonicalUrl: canonicalUrl || undefined,
      ogImageUrl: ogImageUrl || undefined,
      bookId: targetType === "book" ? targetId : undefined,
      blogPostId: targetType === "blog" ? targetId : undefined,
    },
  });

  revalidatePath("/");
}

export async function uploadMediaAction(formData: FormData): Promise<void> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("File is required");
  }

  const payload = new FormData();
  payload.append("file", file);
  payload.append("fileType", String(formData.get("fileType") ?? "cover"));

  const bookId = String(formData.get("bookId") ?? "");
  if (bookId) {
    payload.append("bookId", bookId);
  }

  const visibility = String(formData.get("visibility") ?? "");
  if (visibility) {
    payload.append("visibility", visibility);
  }

  const locale = String(formData.get("locale") ?? "");
  if (locale) {
    payload.append("locale", locale);
  }

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    headers: await authHeaders(),
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Upload failed");
  }

  revalidatePath("/");
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const seoTitle = String(formData.get("seoTitle") ?? "");
  const parentId = String(formData.get("parentId") ?? "");

  await apiRequest("/categories", {
    method: "POST",
    headers: await authHeaders(),
    body: {
      name,
      slug,
      seoTitle: seoTitle || undefined,
      parentId: parentId || undefined,
    },
  });

  revalidatePath("/");
}

export async function updateCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const seoTitle = String(formData.get("seoTitle") ?? "");
  const parentId = String(formData.get("parentId") ?? "");

  await apiRequest(`/categories/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: {
      name,
      slug,
      seoTitle: seoTitle || undefined,
      parentId: parentId || undefined,
    },
  });

  revalidatePath("/");
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await apiRequest(`/categories/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  revalidatePath("/");
}

export async function createAuthorAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const biography = String(formData.get("biography") ?? "");
  const avatarUrl = String(formData.get("avatarUrl") ?? "");

  await apiRequest("/authors", {
    method: "POST",
    headers: await authHeaders(),
    body: {
      name,
      slug,
      biography: biography || undefined,
      avatarUrl: avatarUrl || undefined,
    },
  });

  revalidatePath("/");
}

export async function updateAuthorAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const biography = String(formData.get("biography") ?? "");
  const avatarUrl = String(formData.get("avatarUrl") ?? "");

  await apiRequest(`/authors/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: {
      name,
      slug,
      biography: biography || undefined,
      avatarUrl: avatarUrl || undefined,
    },
  });

  revalidatePath("/");
}

export async function deleteAuthorAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await apiRequest(`/authors/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  revalidatePath("/");
}

async function uploadBookFile(bookId: string, file: File | null, fileType: string) {
  if (!file || file.size === 0) return;
  
  const payload = new FormData();
  payload.append("file", file);
  payload.append("fileType", fileType);
  payload.append("bookId", bookId);

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    headers: await authHeaders(),
    body: payload,
  });

  if (!response.ok) {
    console.error(`Failed to upload ${fileType} for book ${bookId}`);
  }
}

export async function createBookAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const summary = String(formData.get("summary") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const publicationYear = Number(formData.get("publicationYear") ?? "0");
  const editionLabel = String(formData.get("editionLabel") ?? "");
  const isbn = String(formData.get("isbn") ?? "");

  const authorIds = formData.getAll("authorIds").map(String).filter(Boolean);

  const newBook = await apiRequest<{id: string}>("/books", {
    method: "POST",
    headers: await authHeaders(),
    body: {
      title,
      slug,
      summary,
      categoryId,
      publicationYear,
      authorIds,
      editionLabel: editionLabel || undefined,
      isbn: isbn || undefined,
    },
  });

  if (newBook && newBook.id) {
    const coverFile = formData.get("coverFile") as File | null;
    const fullPdfFile = formData.get("fullPdfFile") as File | null;

    await uploadBookFile(newBook.id, coverFile, "cover");
    await uploadBookFile(newBook.id, fullPdfFile, "full_pdf");
  }

  revalidatePath("/");
}

export async function updateBookAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const summary = String(formData.get("summary") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const publicationYear = Number(formData.get("publicationYear") ?? "0");
  const editionLabel = String(formData.get("editionLabel") ?? "");
  const isbn = String(formData.get("isbn") ?? "");
  
  const authorIds = formData.getAll("authorIds").map(String).filter(Boolean);

  await apiRequest(`/books/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: {
      title,
      slug,
      summary,
      categoryId,
      publicationYear,
      authorIds,
      editionLabel: editionLabel || undefined,
      isbn: isbn || undefined,
    },
  });

  const coverFile = formData.get("coverFile") as File | null;
  const fullPdfFile = formData.get("fullPdfFile") as File | null;

  await uploadBookFile(id, coverFile, "cover");
  await uploadBookFile(id, fullPdfFile, "full_pdf");

  revalidatePath("/");
}

export async function deleteBookAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await apiRequest(`/books/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  revalidatePath("/");
}

export async function updateBlogPostAction(formData: FormData): Promise<{ success: boolean }> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const content = String(formData.get("content") ?? "");
  const authorName = String(formData.get("authorName") ?? "");
  const excerpt = String(formData.get("excerpt") ?? "");

  await apiRequest(`/blog-posts/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: {
      title,
      slug,
      content,
      authorName,
      excerpt: excerpt || undefined,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteBlogPostAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");

  await apiRequest(`/blog-posts/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  revalidatePath("/");
}

export async function createSubmissionAction(
  formData: FormData,
): Promise<void> {
  const submittedByUserId = String(formData.get("submittedByUserId") ?? "");
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const titleId = String(formData.get("titleId") ?? "");
  const titleEn = String(formData.get("titleEn") ?? "");
  const descriptionId = String(formData.get("descriptionId") ?? "");
  const descriptionEn = String(formData.get("descriptionEn") ?? "");

  await apiRequest("/submissions", {
    method: "POST",
    headers: await authHeaders(),
    body: {
      submittedByUserId,
      title,
      description,
      titleId: titleId || undefined,
      titleEn: titleEn || undefined,
      descriptionId: descriptionId || undefined,
      descriptionEn: descriptionEn || undefined,
    },
  });

  revalidatePath("/");
}

export async function updateSubmissionStatusAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reviewerId = String(formData.get("reviewerId") ?? "");
  const reviewerNotes = String(formData.get("reviewerNotes") ?? "");

  await apiRequest(`/submissions/${id}/status`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: {
      status,
      reviewerId: reviewerId || undefined,
      reviewerNotes: reviewerNotes || undefined,
    },
  });

  revalidatePath("/");
}

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const roleName = String(formData.get("roleName") ?? "");

  await apiRequest(`/users/${id}/role`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: { roleName },
  });

  revalidatePath("/");
}
