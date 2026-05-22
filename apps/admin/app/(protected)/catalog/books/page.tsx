import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/app/lib/api";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { FileUploadDropzone } from "@/components/ui/file-upload-dropzone";
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
import { createBookAction, updateBookAction, deleteBookAction } from "@/app/actions";

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

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string; new?: string }>;
}) {
  const headers = await authHeaders();
  let books: any[] = [];
  let categories: any[] = [];
  let authors: any[] = [];
  try {
    const [booksData, catData, authData] = await Promise.all([
      apiRequest<{ items: any[] } | any[]>("/books", { headers }),
      apiRequest<{ items: any[] } | any[]>("/categories", { headers }),
      apiRequest<{ items: any[] } | any[]>("/authors", { headers }),
    ]);
    
    books = Array.isArray(booksData) ? booksData : (booksData as any)?.items || [];
    categories = Array.isArray(catData) ? catData : (catData as any)?.items || [];
    authors = Array.isArray(authData) ? authData : (authData as any)?.items || [];
  } catch (err) {
    console.error("Failed to fetch books or dependencies", err);
  }

  const resolvedParams = await searchParams;
  const isNew = resolvedParams.new === "true";
  const editingBook = resolvedParams.editId
    ? books.find((b) => String(b.id) === resolvedParams.editId)
    : null;
  const showModal = isNew || !!editingBook;

  if (showModal) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {editingBook ? "Edit Book" : "New Book"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {editingBook
                ? `Updating ${editingBook.title}`
                : "Add a new book record"}
            </p>
          </div>
          <Link href="/catalog/books">
            <Button variant="outline" className="shadow-sm">
              ← Back to Catalog
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-8">
            <form action={editingBook ? updateBookAction : createBookAction} className="space-y-8">
              {editingBook && (
                <input type="hidden" name="id" value={editingBook.id} />
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Title</label>
                  <Input 
                    name="title" 
                    placeholder="Book Title" 
                    defaultValue={editingBook?.title || ""} 
                    required 
                    className="focus:border-cyan-500 h-10"
                  />
                </div>
                
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Slug</label>
                  <Input 
                    name="slug" 
                    placeholder="book-slug" 
                    defaultValue={editingBook?.slug || ""} 
                    required 
                    className="focus:border-cyan-500 h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Summary</label>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <WysiwygEditor 
                    name="summary" 
                    defaultValue={editingBook?.summary || ""}
                    placeholder="Write a compelling summary..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Category</label>
                  <select 
                    name="categoryId" 
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" 
                    defaultValue={editingBook?.categoryId || ""} 
                    required 
                  >
                    <option value="" disabled>Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Publication Year</label>
                  <Input 
                    name="publicationYear" 
                    type="number" 
                    min={1500} 
                    placeholder="YYYY" 
                    defaultValue={editingBook?.publicationYear || ""} 
                    required 
                    className="focus:border-cyan-500 h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Authors</label>
                  <div className="h-[140px] overflow-y-auto rounded-md border border-slate-300 bg-white p-3 space-y-2">
                    {authors.map((a) => {
                      const isChecked = editingBook?.authors?.some((bookAuthor: any) => 
                        bookAuthor.id === a.id || bookAuthor.authorId === a.id || bookAuthor.author?.id === a.id
                      );
                      return (
                        <label key={a.id} className="flex items-center gap-3 text-sm text-slate-700 hover:bg-slate-50 p-2 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="authorIds" 
                            value={a.id} 
                            defaultChecked={isChecked}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                          />
                          {a.name}
                        </label>
                      );
                    })}
                    {authors.length === 0 && (
                      <div className="text-xs text-slate-500 italic p-2">No authors available. Please add authors first.</div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4 col-span-2 md:col-span-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Edition Label</label>
                    <Input 
                      name="editionLabel" 
                      placeholder="e.g. 1st Edition" 
                      defaultValue={editingBook?.editionLabel || ""} 
                      className="focus:border-cyan-500 h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">ISBN</label>
                    <Input 
                      name="isbn" 
                      placeholder="ISBN" 
                      defaultValue={editingBook?.isbn || ""} 
                      className="focus:border-cyan-500 h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-900">Media Uploads</h3>
                  <p className="text-sm text-slate-500">Attach cover images and PDF files (Max 50MB per file).</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUploadDropzone name="coverFile" accept="image/*" label="Upload Cover Image" helperText="JPG, PNG up to 10MB" />
                  <FileUploadDropzone name="fullPdfFile" accept="application/pdf" label="Upload Full PDF" helperText="PDF up to 50MB" />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                <Link href="/catalog/books">
                  <Button variant="outline" type="button" className="px-6">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="px-8 bg-cyan-700 hover:bg-cyan-800 text-white">
                  {editingBook ? "Save Changes" : "Create Book"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TABLE VIEW (Default)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Books</h1>
          <p className="mt-2 text-sm text-slate-600">Manage books in the catalog.</p>
        </div>
        <Link href="/catalog/books?new=true">
          <Button className="bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm">Add New Book</Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead className="hidden md:table-cell">Year</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((b) => (
                <TableRow key={b.id} className="group hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs text-slate-500">{b.id}</TableCell>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500">{b.slug}</TableCell>
                  <TableCell className="hidden md:table-cell">{b.publicationYear}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/catalog/books?editId=${b.id}`}>
                        <Button variant="secondary" size="sm" className="h-8 px-3 text-xs">Edit</Button>
                      </Link>
                      <form action={deleteBookAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <Button type="submit" variant="destructive" size="sm" className="h-8 px-3 text-xs">Delete</Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {books.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No books found.
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
