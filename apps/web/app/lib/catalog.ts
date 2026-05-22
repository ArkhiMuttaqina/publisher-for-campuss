import { webApiRequest } from "./api";

type BookCategory = {
  id: string;
  name?: string;
  nameId?: string;
  nameEn?: string;
};

type BookAuthor = {
  author: {
    id: string;
    name: string;
  };
};

type Publication = {
  id: string;
  status: "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
  isPublic?: boolean;
  publicationDate?: string;
};

type SeoMeta = {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string | null;
};

export type PublicBook = {
  id: string;
  slug: string;
  title?: string;
  titleId?: string;
  titleEn?: string;
  summary?: string;
  summaryId?: string;
  summaryEn?: string;
  category?: BookCategory | null;
  authors?: BookAuthor[];
  publications?: Publication[];
  seoMeta?: SeoMeta | null;
};

function isPublicPublished(book: PublicBook): boolean {
  return Boolean(
    book.publications?.some(
      (publication) =>
        publication.status === "PUBLISHED" && publication.isPublic !== false,
    ),
  );
}

export async function fetchPublicBooks(): Promise<PublicBook[]> {
  const books = await webApiRequest<PublicBook[]>("/books");
  return books.filter(isPublicPublished);
}

export async function fetchPublicBookById(id: string): Promise<PublicBook> {
  return webApiRequest<PublicBook>(`/books/${id}`);
}
