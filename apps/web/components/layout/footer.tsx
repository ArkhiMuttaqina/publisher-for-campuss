import Link from "next/link";
import { WebLanguage, webDictionary } from "@/app/lib/i18n";

export function Footer({ lang }: { lang: WebLanguage }) {
  const t = webDictionary[lang];

  return (
    <footer className="border-t border-slate-200 bg-white mt-20">
      <div className="mx-auto max-w-5xl px-6 py-12 md:flex md:items-center md:justify-between">
        <div className="flex justify-center md:justify-start">
          <p className="text-sm font-semibold text-[var(--ink)]">
            &copy; {new Date().getFullYear()} {t.brand}. All rights reserved.
          </p>
        </div>
        <div className="mt-4 flex justify-center space-x-6 md:mt-0">
          <Link href={`/?lang=${lang}`} className="text-sm text-slate-500 hover:text-[var(--accent)]">
            {t.navHome}
          </Link>
          <Link href={`/catalog?lang=${lang}`} className="text-sm text-slate-500 hover:text-[var(--accent)]">
            {t.navCatalog}
          </Link>
          <Link href={`/blog?lang=${lang}`} className="text-sm text-slate-500 hover:text-[var(--accent)]">
            {t.navBlog}
          </Link>
        </div>
      </div>
    </footer>
  );
}
