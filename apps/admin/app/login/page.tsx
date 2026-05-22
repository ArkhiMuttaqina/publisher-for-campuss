import { loginAdminAction } from "../actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials: "Enter your admin email and password.",
  invalid_credentials: "Email or password is incorrect.",
  forbidden_role: "This account does not have admin dashboard access.",
  session_required: "Please sign in to continue.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const errorMessage = resolvedSearchParams.error
    ? ERROR_MESSAGES[resolvedSearchParams.error]
    : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
      <section className="grid w-full gap-6 rounded-2xl border border-slate-200/90 bg-white/95 p-8 shadow-lg shadow-slate-200/60 backdrop-blur md:grid-cols-[1.1fr_1fr] md:p-10">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Undafa Publisher
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
            Admin Login
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            Sign in to manage books, editorial workflows, SEO metadata, and
            campus submissions from dashboard.
          </p>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-1 shadow-md transition-all duration-300 hover:border-cyan-300 hover:shadow-xl">
            <div className="relative overflow-hidden rounded-xl">
              <img
                src="/image/campus-logo.png"
                alt="Campus Publisher Platform"
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        <form
          action={loginAdminAction}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Admin Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="admin@campus.local"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />

          <label
            htmlFor="password"
            className="mb-2 mt-4 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign in to Dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
