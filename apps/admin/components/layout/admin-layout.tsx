import * as React from "react";
import { cn } from "@/lib/utils";
import { logoutAdminAction } from "@/app/actions";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const menuItems = [
    { href: "/", label: "Overview" },
    { href: "/catalog/books", label: "Books" },
    { href: "/catalog/authors", label: "Authors" },
    { href: "/catalog/categories", label: "Categories" },
    { href: "/editorial/blog", label: "Blog" },
    { href: "/governance/submissions", label: "Submissions" },
    { href: "/governance/users", label: "Users" },
    { href: "/seo-media", label: "SEO & Media" },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white shadow-sm flex flex-col">
      <div className="h-14 flex items-center border-b border-slate-100 px-6">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
            Undafa Publisher
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-900"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function Navbar() {
  return (
    <header className="h-14 flex items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center text-sm font-medium text-slate-500">
        Admin Dashboard
      </div>
      <div className="flex items-center gap-4">
        <form action={logoutAdminAction}>
          <button type="submit" className="text-sm font-semibold text-slate-700 transition hover:text-slate-900">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
