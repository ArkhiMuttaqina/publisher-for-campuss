import { AdminLayout } from "@/components/layout/admin-layout";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
