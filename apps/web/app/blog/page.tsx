import Link from "next/link";
import { parseWebLanguage, webDictionary } from "../lib/i18n";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function BlogPage({
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
      
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-14">
        <h1 className="text-3xl font-bold text-[var(--ink)]">{t.blogTitle}</h1>
        <p className="mt-3 text-slate-600">{t.blogDescription}</p>

        {/* Temporary empty state for blog */}
        <p className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          {lang === "id" ? "Belum ada artikel editorial." : "No editorial articles available yet."}
        </p>
      </main>
      
      <Footer lang={lang} />
    </div>
  );
}
