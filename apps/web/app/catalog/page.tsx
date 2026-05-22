import Link from "next/link";
import { fetchPublicBooks } from "../lib/catalog";
import { parseWebLanguage, webDictionary } from "../lib/i18n";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; q?: string; page?: string; category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const lang = parseWebLanguage(resolvedSearchParams.lang);
  const t = webDictionary[lang];
  const books = await fetchPublicBooks();

  const currentQuery = resolvedSearchParams.q || "";
  const currentCategory = resolvedSearchParams.category || "";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-1)] bg-opacity-30">
      <Header lang={lang} />
      
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-14">
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          {t.catalogTitle}
        </h1>
        <p className="mt-3 text-slate-600">{t.catalogDescription}</p>

        {/* Scaffolding for Search and Filter */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <form className="flex w-full flex-1 gap-2">
            <input type="hidden" name="lang" value={lang} />
            <input
              type="search"
              name="q"
              defaultValue={currentQuery}
              placeholder={lang === "id" ? "Cari judul, penulis..." : "Search title, author..."}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
            <select
              name="category"
              defaultValue={currentCategory}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            >
              <option value="">{lang === "id" ? "Semua Kategori" : "All Categories"}</option>
              <option value="fiction">{lang === "id" ? "Fiksi" : "Fiction"}</option>
              <option value="non-fiction">{lang === "id" ? "Non Fiksi" : "Non-Fiction"}</option>
              <option value="academic">{lang === "id" ? "Akademik" : "Academic"}</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              {lang === "id" ? "Cari" : "Search"}
            </button>
          </form>
        </div>

        {books.length === 0 ? (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            {t.catalogEmpty}
          </p>
        ) : (
          <section className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => {
              const title =
                lang === "id"
                  ? (book.titleId ?? book.titleEn)
                  : (book.titleEn ?? book.titleId);
              const summary =
                lang === "id"
                  ? (book.summaryId ?? book.summaryEn ?? book.summary)
                  : (book.summaryEn ?? book.summaryId ?? book.summary);

              return (
                <article
                  key={book.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-[var(--accent)]"
                >
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {title ?? "Untitled"}
                    </h2>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] font-medium text-[var(--accent)]">
                      {(lang === "id"
                        ? (book.category?.nameId ?? book.category?.nameEn)
                        : (book.category?.nameEn ?? book.category?.nameId)) ?? "Uncategorized"}
                    </p>
                    {summary ? (
                      <p className="mt-4 text-sm text-slate-600 line-clamp-3 leading-relaxed">{summary}</p>
                    ) : null}
                  </div>
                  <div className="mt-6">
                    <Link
                      href={{ pathname: `/catalog/${book.id}`, query: { lang } }}
                      className="inline-flex w-full items-center justify-center rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200"
                    >
                      {t.catalogReadDetails}
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Scaffolding for Pagination */}
        {books.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-50" disabled>
              {lang === "id" ? "Sebelumnya" : "Previous"}
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--ink)] text-sm font-medium text-white">
              1
            </span>
            <button className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {lang === "id" ? "Selanjutnya" : "Next"}
            </button>
          </div>
        )}
      </main>
      
      <Footer lang={lang} />
    </div>
  );
}
