"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("Admin panel gagal dimuat.", error);
  }, [error]);

  return (
    <main className="admin-error-page">
      <span className="admin-error-icon"><AlertTriangle size={23} /></span>
      <span className="panel-overline">PANEL ADMIN</span>
      <h1>Dashboard belum dapat dibuka.</h1>
      <p>Periksa konfigurasi Supabase dan pastikan <code>supabase/schema.sql</code> sudah dijalankan pada project yang benar.</p>
      {error.digest && <small>Referensi error: {error.digest}</small>}
      <div>
        <button type="button" onClick={reset}><RefreshCw size={14} /> Coba lagi</button>
        <Link href="/admin/login"><ArrowLeft size={14} /> Kembali ke login</Link>
      </div>
    </main>
  );
}
