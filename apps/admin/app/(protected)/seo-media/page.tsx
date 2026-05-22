import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiRequest } from "@/app/lib/api";
import { FileUploadDropzone } from "@/components/ui/file-upload-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { upsertSeoMetaAction, uploadMediaAction } from "@/app/actions";

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

export default async function SeoMediaPage() {
  const headers = await authHeaders();
  let books: any[] = [];
  let blogPosts: any[] = [];

  try {
    const [booksData, blogData] = await Promise.all([
      apiRequest<{ items: any[] } | any[]>("/books", { headers }),
      apiRequest<{ items: any[] } | any[]>("/blog-posts", { headers })
    ]);
    books = Array.isArray(booksData) ? booksData : (booksData as any)?.items || [];
    blogPosts = Array.isArray(blogData) ? blogData : (blogData as any)?.items || [];
  } catch (err) {
    console.error("Failed to fetch dependencies", err);
  }
  await authHeaders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SEO & Media</h1>
          <p className="mt-2 text-sm text-slate-600">Manage metadata and upload governed media assets.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg">SEO Metadata</CardTitle>
            <CardDescription>Upsert SEO metadata for books or blog posts.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={upsertSeoMetaAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Target Type</label>
                <select name="targetType" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" defaultValue="book">
                  <option value="book">Book</option>
                  <option value="blog">Blog</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Target Item</label>
                <select name="targetId" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" required defaultValue="">
                  <option value="" disabled>Select target...</option>
                  <optgroup label="Books">
                    {books.map(b => <option key={`book-${b.id}`} value={b.id}>{b.title}</option>)}
                  </optgroup>
                  <optgroup label="Blog Posts">
                    {blogPosts.map(p => <option key={`blog-${p.id}`} value={p.id}>{p.title}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Meta Title</label>
                <Input name="metaTitle" placeholder="Meta Title" required className="focus:border-cyan-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Meta Description</label>
                <Textarea name="metaDescription" placeholder="Meta Description" required className="focus:border-cyan-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Canonical URL</label>
                <Input name="canonicalUrl" placeholder="https://..." className="focus:border-cyan-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">OG Image URL</label>
                <Input name="ogImageUrl" placeholder="https://..." className="focus:border-cyan-500" />
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-800 text-white">Save SEO Data</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg">Upload Media</CardTitle>
            <CardDescription>Upload cover images and PDF assets.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={uploadMediaAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">File Type</label>
                <select name="fileType" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" defaultValue="cover">
                  <option value="cover">Cover Image</option>
                  <option value="full_pdf">Full PDF</option>
                  <option value="preview_pdf">Preview PDF</option>
                  <option value="author_avatar">Author Avatar</option>
                  <option value="blog_image">Blog Image</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">File Upload</label>
                <FileUploadDropzone name="file" accept="*/*" label="Drop a file or click to upload" helperText="Any standard media file" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Related Book</label>
                <select name="bookId" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" defaultValue="">
                  <option value="">None (Standalone Media)</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Visibility</label>
                  <select name="visibility" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" defaultValue="">
                    <option value="">Default</option>
                    <option value="public">Public</option>
                    <option value="campus_only">Campus Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Locale</label>
                  <select name="locale" className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" defaultValue="">
                    <option value="">Default</option>
                    <option value="id">ID</option>
                    <option value="en">EN</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-2">
                <Button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-800 text-white">Upload Media</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
