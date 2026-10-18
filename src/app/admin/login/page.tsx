import { Suspense } from "react";
import { AdminLoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="admin-login-page"><div className="login-card">Memuat login admin...</div></main>}>
      <AdminLoginForm />
    </Suspense>
  );
}
