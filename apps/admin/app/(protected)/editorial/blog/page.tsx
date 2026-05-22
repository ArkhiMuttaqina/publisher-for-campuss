import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/app/lib/api";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { BlogEditorForm } from "@/components/ui/blog-editor-form";
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
import { createBlogPostAction, updateBlogPostAction, publishBlogPostAction, deleteBlogPostAction } from "@/app/actions";

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

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string; new?: string }>;
}) {
  const headers = await authHeaders();
  let posts: any[] = [];
  let currentUser: any = null;
  try {
    const data = await apiRequest<{ items: any[] }>("/blog-posts", { headers });
    posts = data?.items || (Array.isArray(data) ? data : []);
    currentUser = await apiRequest<{ fullName: string }>("/auth/me", { headers });
  } catch (err) {
    console.error("Failed to fetch blog posts or user info", err);
  }

  const resolvedParams = await searchParams;
  const isNew = resolvedParams.new === "true";
  const editingPost = resolvedParams.editId
    ? posts.find((p) => String(p.id) === resolvedParams.editId)
    : null;
  const showModal = isNew || !!editingPost;

  if (showModal) {
    return <BlogEditorForm initialPost={editingPost} currentUser={currentUser} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Editorial - Blog</h1>
          <p className="mt-2 text-sm text-slate-600">Manage and publish blog posts.</p>
        </div>
        <Link href="/editorial/blog?new=true">
          <Button className="bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm">Draft New Post</Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Author</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id} className="group hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs text-slate-500">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      p.status === "published" 
                        ? "bg-green-50 text-green-700 ring-green-600/20" 
                        : "bg-slate-50 text-slate-600 ring-slate-500/10"
                    }`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500">{p.authorName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/editorial/blog?editId=${p.id}`}>
                        <Button variant="secondary" size="sm" className="h-8 px-3 text-xs">Edit</Button>
                      </Link>
                      <form action={deleteBlogPostAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" variant="destructive" size="sm" className="h-8 px-3 text-xs">Delete</Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No posts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
