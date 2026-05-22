import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/app/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createAuthorAction, updateAuthorAction, deleteAuthorAction } from "@/app/actions";

const ADMIN_AUTH_COOKIE = "admin_auth";

async function authHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  if (!token) {
    redirect("/login?error=session_required");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export default async function AuthorsPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string; new?: string }>;
}) {
  const headers = await authHeaders();
  let authors: any[] = [];
  try {
    const data = await apiRequest<{ items: any[] }>("/authors", { headers });
    authors = data?.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Failed to fetch authors", err);
  }

  const resolvedParams = await searchParams;
  const isNew = resolvedParams.new === "true";
  const editingAuthor = resolvedParams.editId
    ? authors.find((a) => String(a.id) === resolvedParams.editId)
    : null;
  const showModal = isNew || !!editingAuthor;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Authors</h1>
          <p className="mt-2 text-sm text-slate-600">Manage author profiles for the public catalog.</p>
        </div>
        <Link href="/catalog/authors?new=true">
          <Button className="bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm">Add New Author</Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.map((a) => (
                <TableRow key={a.id} className="group hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs text-slate-500">{a.id}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500">{a.slug}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/catalog/authors?editId=${a.id}`}>
                        <Button variant="secondary" size="sm" className="h-8 px-3 text-xs">Edit</Button>
                      </Link>
                      <form action={deleteAuthorAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" variant="destructive" size="sm" className="h-8 px-3 text-xs">Delete</Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {authors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    No authors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pop-up Modal overlay for Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-lg border-slate-200 relative overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {editingAuthor ? "Edit Author" : "New Author"}
                  </CardTitle>
                  <CardDescription>
                    {editingAuthor
                      ? `Updating profile for ${editingAuthor.name}`
                      : "Add a new author to the catalog"}
                  </CardDescription>
                </div>
                <Link href="/catalog/authors">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-full hover:bg-slate-200">
                    ✕
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <div className="overflow-y-auto p-6">
              <form action={editingAuthor ? updateAuthorAction : createAuthorAction} className="space-y-4">
                {editingAuthor && (
                  <input type="hidden" name="id" value={editingAuthor.id} />
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <Input 
                    name="name" 
                    placeholder="Jane Doe" 
                    defaultValue={editingAuthor?.name || ""} 
                    required 
                    className="focus:border-cyan-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Slug</label>
                  <Input 
                    name="slug" 
                    placeholder="jane-doe" 
                    defaultValue={editingAuthor?.slug || ""} 
                    required 
                    className="focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Biography</label>
                  <Textarea 
                    name="biography" 
                    placeholder="A brief biography..." 
                    defaultValue={editingAuthor?.biography || ""} 
                    className="min-h-[120px] focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Avatar URL</label>
                  <Input 
                    name="avatarUrl" 
                    placeholder="https://example.com/avatar.jpg" 
                    defaultValue={editingAuthor?.avatarUrl || ""} 
                    className="focus:border-cyan-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="submit" className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white">
                    {editingAuthor ? "Save Changes" : "Create Author"}
                  </Button>
                  <Link href="/catalog/authors" className="flex-1">
                    <Button variant="outline" type="button" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
