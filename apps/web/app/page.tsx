import Link from "next/link";
import { parseWebLanguage, webDictionary } from "./lib/i18n";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const lang = parseWebLanguage(resolvedSearchParams.lang);
  const t = webDictionary[lang];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-1)] bg-opacity-30">
      <Header lang={lang} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-5xl px-6 py-20 md:py-32">
          <div className="space-y-6 text-center md:text-left md:max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
              {t.heroTagline}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-[var(--ink)] md:text-6xl md:leading-[1.1]">
              {t.heroTitle}
            </h1>
            <p className="text-lg text-slate-600 md:text-xl">
              {t.heroDescription}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
              <Link
                href={`/catalog?lang=${lang}`}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 transition-transform active:scale-95"
              >
                {t.ctaCatalog}
              </Link>
              <Link
                href={`/blog?lang=${lang}`}
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-transform active:scale-95"
              >
                {t.ctaBlog}
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Sections (Information Architecture) */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center md:max-w-2xl md:mx-auto">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
                {t.sectionIaTitle}
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                {t.sectionIaDescription}
              </p>
            </div>
            
            <div className="mx-auto mt-16 grid max-w-2xl gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3">
              {t.sectionCards.map((card) => (
                <article
                  key={card.title}
                  className="flex flex-col items-start justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-x-4 mb-4">
                    <h3 className="text-lg font-semibold leading-6 text-slate-900">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-base leading-7 text-slate-600">
                    {card.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
