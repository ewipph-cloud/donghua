"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();
  const accessDenied = searchParams.get("access") === "denied";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!configured) {
        throw new Error("Supabase belum dikonfigurasi. Tambahkan kredensial ke .env.local terlebih dahulu.");
      }

      const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.replace("/admin");
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Login gagal. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <header className="login-header">
        <Link href="/" className="login-back"><ArrowLeft size={15} /> Kembali ke situs</Link>
        <div className="login-security"><LockKeyhole size={14} /> KONEKSI TERLINDUNGI</div>
      </header>
      <section className="login-card">
        <Link className="login-brand" href="/" aria-label="Donghua ID">
          <span className="admin-brand-icon"><Sparkles size={20} /></span>
          <span><strong>DONGHUA<span>ID</span></strong><small>CONTENT STUDIO</small></span>
        </Link>
        <div className="login-icon"><ShieldCheck size={24} /></div>
        <p className="login-eyebrow">AREA TERBATAS</p>
        <h1>Selamat datang<br />kembali.</h1>
        <p className="login-description">Masuk ke panel untuk mengelola donghua dan episode.</p>

        {!configured && (
          <div className="login-alert login-setup-alert" role="status">
            Supabase belum terhubung. Salin <code>.env.example</code> menjadi <code>.env.local</code> dan isi URL serta publishable key project Anda.
          </div>
        )}
        {accessDenied && (
          <div className="login-alert" role="alert">Akun ini belum terdaftar sebagai administrator.</div>
        )}
        {error && <div className="login-alert" role="alert">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email administrator</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            placeholder="nama@domain.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="admin-password">Kata sandi</label>
          <div className="login-password">
            <input
              id="admin-password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" aria-label={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setPasswordVisible((visible) => !visible)}>
              {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <button className="login-submit" type="submit" disabled={loading || !configured}>
            {loading ? "Memverifikasi..." : "Masuk ke dashboard"}
            <ArrowLeft size={16} />
          </button>
        </form>
        <p className="login-footnote"><LockKeyhole size={12} /> Hanya akun yang diberi izin admin yang dapat masuk.</p>
      </section>
      <footer className="login-footer">© 2026 Donghua ID · Admin Studio</footer>
    </main>
  );
}
