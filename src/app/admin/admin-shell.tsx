"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ShieldCheck,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin#konten", label: "Konten", icon: Clapperboard },
  { href: "/admin#episode", label: "Episode", icon: BookOpen },
  { href: "/admin/articles", label: "Artikel", icon: Newspaper },
];

export function AdminShell({
  children,
  email,
}: Readonly<{ children: React.ReactNode; email: string }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/admin/login");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Tidak dapat keluar.");
      setSigningOut(false);
    }
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${menuOpen ? " admin-sidebar-open" : ""}`}>
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-icon"><ShieldCheck size={19} /></span>
          <span><strong>DONGHUA<span>ID</span></strong><small>CONTROL ROOM</small></span>
        </Link>
        <div className="admin-nav-label">MENU UTAMA</div>
        <nav className="admin-navigation" aria-label="Navigasi admin">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className={
                (pathname === "/admin" && href === "/admin") ||
                pathname === href
                  ? "admin-nav-active"
                  : ""
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={17} /> <span>{label}</span>
              {href === "/admin" && <span className="admin-nav-indicator" />}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link className="admin-back-link" href="/"><ArrowLeft size={15} /> Lihat situs</Link>
          <div className="admin-account">
            <span className="admin-avatar">{email.slice(0, 1).toUpperCase()}</span>
            <span className="admin-account-copy"><strong>{email}</strong><small>Administrator</small></span>
            <button type="button" aria-label="Keluar dari admin" disabled={signingOut} onClick={signOut}>
              <LogOut size={16} />
            </button>
          </div>
          {error && <p className="admin-sidebar-error">{error}</p>}
        </div>
      </aside>
      {menuOpen && <button className="admin-mobile-scrim" type="button" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)} />}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" type="button" aria-label="Buka navigasi" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div><span className="admin-breadcrumb">PANEL ADMIN</span><span className="admin-breadcrumb-slash">/</span><span>Manajemen</span></div>
          <div className="admin-topbar-right"><span className="admin-live-dot" /> Sistem aktif</div>
        </header>
        <main className="admin-main-content">{children}</main>
      </div>
    </div>
  );
}
