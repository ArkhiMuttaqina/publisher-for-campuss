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
import { createSubmissionAction, updateSubmissionStatusAction } from "@/app/actions";

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

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string; new?: string }>;
}) {
  const headers = await authHeaders();
  let submissions: any[] = [];
  let users: any[] = [];
  try {
    const [subData, usersData] = await Promise.all([
      apiRequest<{ items: any[] } | any[]>("/submissions", { headers }),
      apiRequest<{ items: any[] } | any[]>("/users", { headers })
    ]);
    submissions = Array.isArray(subData) ? subData : (subData as any)?.items || [];
    users = Array.isArray(usersData) ? usersData : (usersData as any)?.items || [];
  } catch (err) {
    console.error("Failed to fetch submissions or users", err);
  }

  const resolvedParams = await searchParams;
  const isNew = resolvedParams.new === "true";
  const editingSubmission = resolvedParams.editId
    ? submissions.find((s) => String(s.id) === resolvedParams.editId)
    : null;
  const showModal = isNew || !!editingSubmission;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Submissions</h1>
          <p className="mt-2 text-sm text-slate-600">Moderate submissions and manage their states.</p>
        </div>
        <Link href="/governance/submissions?new=true">
          <Button className="bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm">Test Submission</Button>
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
                <TableHead className="hidden md:table-cell">Submitted By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id} className="group hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs text-slate-500">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      s.status === "APPROVED" ? "bg-green-50 text-green-700 ring-green-600/20" :
                      s.status === "REJECTED" ? "bg-red-50 text-red-700 ring-red-600/20" :
                      s.status === "IN_REVIEW" ? "bg-yellow-50 text-yellow-800 ring-yellow-600/20" :
                      "bg-slate-50 text-slate-600 ring-slate-500/10"
                    }`}>
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-slate-500">{s.submittedByUserId}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/governance/submissions?editId=${s.id}`}>
                        <Button variant="secondary" size="sm" className="h-8 px-3 text-xs">Moderate</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No submissions found.
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
          <Card className="w-full max-w-2xl shadow-lg border-slate-200 relative overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {editingSubmission ? "Moderate Submission" : "Create Test Submission"}
                  </CardTitle>
                  <CardDescription>
                    {editingSubmission
                      ? `Reviewing submission ${editingSubmission.id}`
                      : "Manually add a submission to the system"}
                  </CardDescription>
                </div>
                <Link href="/governance/submissions">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-full hover:bg-slate-200">
                    ✕
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <div className="overflow-y-auto p-6 space-y-6">
              {!editingSubmission ? (
                /* CREATE FORM */
                <form action={createSubmissionAction} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Submitted By</label>
                    <select 
                      name="submittedByUserId" 
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" 
                      required 
                      defaultValue=""
                    >
                      <option value="" disabled>Select User...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium text-slate-700">Title (Fallback)</label>
                      <Input name="title" placeholder="Title" required className="focus:border-cyan-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Title (ID)</label>
                      <Input name="titleId" placeholder="Judul Bahasa Indonesia" className="focus:border-cyan-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Title (EN)</label>
                      <Input name="titleEn" placeholder="English Title" className="focus:border-cyan-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Description (Fallback)</label>
                    <Textarea name="description" placeholder="Description" required className="focus:border-cyan-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Description (ID)</label>
                      <Textarea name="descriptionId" placeholder="Deskripsi ID" className="focus:border-cyan-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Description (EN)</label>
                      <Textarea name="descriptionEn" placeholder="English Description" className="focus:border-cyan-500" />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-800 text-white">Create Test Submission</Button>
                  </div>
                </form>
              ) : (
                /* MODERATE FORM */
                <form action={updateSubmissionStatusAction} className="space-y-4">
                  <input type="hidden" name="id" value={editingSubmission.id} />
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-2">
                    <h3 className="font-medium text-slate-900">{editingSubmission.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-3">{editingSubmission.description}</p>
                    <div className="text-xs text-slate-500 pt-2 font-mono">Submitted by: {editingSubmission.submittedByUserId}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Status</label>
                      <select 
                        name="status" 
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" 
                        defaultValue={editingSubmission.status}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="SUBMITTED">SUBMITTED</option>
                        <option value="IN_REVIEW">IN_REVIEW</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Reviewer</label>
                      <select 
                        name="reviewerId" 
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" 
                        defaultValue={editingSubmission.reviewerId || ""} 
                      >
                        <option value="">None</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Reviewer Notes</label>
                    <Textarea 
                      name="reviewerNotes" 
                      placeholder="Notes to attach to this submission review..." 
                      defaultValue={editingSubmission.reviewerNotes || ""}
                      className="min-h-[120px] focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button type="submit" className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white">Save Decision</Button>
                    <Link href="/governance/submissions" className="flex-1">
                      <Button variant="outline" type="button" className="w-full">Cancel</Button>
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
