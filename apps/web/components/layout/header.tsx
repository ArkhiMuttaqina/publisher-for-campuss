import Link from "next/link";
import { WebLanguage, webDictionary } from "@/app/lib/i18n";

export function Header({ lang }: { lang: WebLanguage }) {
  const t = webDictionary[lang];

  return (
    <header className="border-b border-slate-200 bg-white/50 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href={`/?lang=${lang}`} className="text-xl font-bold text-[var(--ink)] tracking-tight">
            {t.brand}
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <Link href={`/?lang=${lang}`} className="hover:text-[var(--accent)] transition-colors">{t.navHome}</Link>
            <Link href={`/catalog?lang=${lang}`} className="hover:text-[var(--accent)] transition-colors">{t.navCatalog}</Link>
            <Link href={`/blog?lang=${lang}`} className="hover:text-[var(--accent)] transition-colors">{t.navBlog}</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <span className="hidden md:inline">{t.languageLabel}:</span>
          <Link
            href={`?lang=en`}
            className={`px-2 py-1 rounded ${lang === "en" ? "bg-slate-200 font-semibold" : "hover:bg-slate-100"}`}
          >
            EN
          </Link>
          <Link
            href={`?lang=id`}
            className={`px-2 py-1 rounded ${lang === "id" ? "bg-slate-200 font-semibold" : "hover:bg-slate-100"}`}
          >
            ID
          </Link>
        </div>
      </div>
    </header>
  );
}
