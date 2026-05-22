import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE_URL } from "../../lib/api";
import { fetchPublicBookById } from "../../lib/catalog";
import { parseWebLanguage, webDictionary } from "../../lib/i18n";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const book = await fetchPublicBookById(resolvedParams.id);
    const title =
      book.seoMeta?.metaTitle ?? book.titleEn ?? book.titleId ?? "Catalog";
    const description =
      book.seoMeta?.metaDescription ??
      book.summaryEn ??
      book.summaryId ??
      "Campus publication details and secure PDF preview.";

    return {
      title,
      description,
      alternates: book.seoMeta?.canonicalUrl
        ? { canonical: book.seoMeta.canonicalUrl }
        : undefined,
    };
  } catch {
    return {
      title: "Catalog",
      description: "Campus publication details",
    };
  }
}

export default async function CatalogDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const lang = parseWebLanguage(resolvedSearchParams.lang);
  const t = webDictionary[lang];
  const book = await fetchPublicBookById(resolvedParams.id);

  const title =
    lang === "id"
      ? (book.titleId ?? book.titleEn)
      : (book.titleEn ?? book.titleId);
  const summary =
    lang === "id"
      ? (book.summaryId ?? book.summaryEn ?? book.summary)
      : (book.summaryEn ?? book.summaryId ?? book.summary);
  const category =
    lang === "id"
      ? (book.category?.nameId ?? book.category?.nameEn)
      : (book.category?.nameEn ?? book.category?.nameId);
  const authorNames = (book.authors ?? []).map((entry) => entry.author.name);
  const publicationStatus = book.publications?.[0]?.status ?? "DRAFT";
  const previewUrl = `${API_BASE_URL}/media/public/books/${book.id}/preview/file`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <nav className="mb-6 flex gap-4 text-sm text-slate-700">
        <Link href={`/catalog?lang=${lang}`}>{t.detailBackToCatalog}</Link>
        <Link href={`/?lang=${lang}`}>{t.detailBackToHome}</Link>
      </nav>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold text-slate-900">
          {title ?? "Untitled"}
        </h1>
        {summary ? <p className="mt-3 text-slate-700">{summary}</p> : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {t.detailCategoryLabel}
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{category ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {t.detailAuthorsLabel}
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {authorNames.length > 0
                ? authorNames.join(", ")
                : t.detailNoAuthors}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {t.detailPublicationLabel}
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{publicationStatus}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {t.detailPreviewLabel}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t.detailPreviewUnavailable}
        </p>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:border-[var(--accent)]"
        >
          {t.detailOpenPreview}
        </a>
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <iframe
            title="PDF preview"
            src={previewUrl}
            className="h-[640px] w-full"
          />
        </div>
      </section>
    </main>
  );
}
