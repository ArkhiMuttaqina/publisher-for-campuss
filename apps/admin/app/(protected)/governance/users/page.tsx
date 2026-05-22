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
import { Button } from "@/components/ui/button";
import { updateUserRoleAction } from "@/app/actions";

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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string }>;
}) {
  const headers = await authHeaders();
  let users: any[] = [];
  try {
    const data = await apiRequest<{ items: any[] }>("/users", { headers });
    users = data?.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Failed to fetch users", err);
  }

  const resolvedParams = await searchParams;
  const editingUser = resolvedParams.editId
    ? users.find((u) => String(u.id) === resolvedParams.editId)
    : null;
  const showModal = !!editingUser;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users & Roles</h1>
          <p className="mt-2 text-sm text-slate-600">Manage user roles and permissions.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="group hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs text-slate-500">{u.id}</TableCell>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                      {u.role?.name || "No Role"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/governance/users?editId=${u.id}`}>
                        <Button variant="secondary" size="sm" className="h-8 px-3 text-xs">Edit Role</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No users found.
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
          <Card className="w-full max-w-md shadow-lg border-slate-200 relative overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    Edit User Role
                  </CardTitle>
                  <CardDescription>
                    Assign or update permissions
                  </CardDescription>
                </div>
                <Link href="/governance/users">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-full hover:bg-slate-200">
                    ✕
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <div className="overflow-y-auto p-6 space-y-6">
              <form action={updateUserRoleAction} className="space-y-4">
                <input type="hidden" name="id" value={editingUser.id} />
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-1">
                  <div className="font-medium text-slate-900">{editingUser.fullName}</div>
                  <div className="text-sm text-slate-600">{editingUser.email}</div>
                  <div className="text-xs text-slate-500 pt-1">Current Role: <span className="font-mono">{editingUser.role?.name || "None"}</span></div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">New Role Name</label>
                  <select 
                    name="roleName" 
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" 
                    defaultValue={editingUser.role?.name || ""}
                    required
                  >
                    <option value="" disabled>Select a role...</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="author_manager">Author Manager</option>
                    <option value="user">User</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="submit" className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white">Save Changes</Button>
                  <Link href="/governance/users" className="flex-1">
                    <Button variant="outline" type="button" className="w-full">Cancel</Button>
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
