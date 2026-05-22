import { cookies } from "next/headers";
import {
  logoutAdminAction,
  setAdminLanguageAction,
} from "../actions";
import {
  ADMIN_LANG_COOKIE,
  adminDictionary,
  parseAdminLanguage,
} from "../lib/i18n";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-cyan-100 transition focus:border-cyan-500 focus:ring-2";
const textareaClass = `${inputClass} min-h-24`;
const sectionCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/60";

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

const menuItems = [
  { href: "#overview", label: "Overview" },
  { href: "#catalog", label: "Catalog CRUD" },
  { href: "#editorial", label: "Editorial" },
  { href: "#submissions", label: "Submissions" },
  { href: "#seo-media", label: "SEO & Media" },
] as const;

export default async function AdminHomePage() {
  const cookieStore = await cookies();
  const lang = parseAdminLanguage(cookieStore.get(ADMIN_LANG_COOKIE)?.value);
  const t = adminDictionary[lang];

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">

      <div className="space-y-8">
        <FormSection
          id="overview"
          title={t.modulesTitle}
          description="Quick access area with domain modules and actions."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {t.modules.map((moduleName: string) => (
              <article key={moduleName} className={sectionCardClass}>
                <p className="text-sm font-semibold text-slate-900">
                  {moduleName}
                </p>
              </article>
            ))}
          </div>
        </FormSection>








      </div>
    </main>
  );
}
