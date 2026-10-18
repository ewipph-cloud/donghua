import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminShell } from "@/app/admin/admin-shell";
import { getAdminSession } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="admin-auth-loading">Memverifikasi akses admin...</div>}>
      <AdminAccessGuard>{children}</AdminAccessGuard>
    </Suspense>
  );
}

async function AdminAccessGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();

  if (!isSupabaseConfigured()) redirect("/admin/login?setup=required");

  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login?access=denied");

  return <AdminShell email={admin.user.email ?? "Admin"}>{children}</AdminShell>;
}
