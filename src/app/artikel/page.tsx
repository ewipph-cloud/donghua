import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Artikel Donghua",
  description: "Berita, ulasan, dan artikel terbaru seputar donghua dan anime.",
};

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  created_at: string;
};

export default async function ArticlesPage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("articles")
    .select("id,title,slug,excerpt,cover_image_url,created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });
  const articles = (data ?? []) as Article[];

  return (
    <main className="public-articles-page">
      <div className="public-articles-shell">
        <Link className="public-articles-back" href="/">← Kembali ke beranda</Link>
        <header className="public-articles-heading">
          <span>WARTA DONGHUA</span>
          <h1>Artikel terbaru</h1>
          <p>Berita, ulasan, dan pembahasan seputar dunia donghua.</p>
        </header>
        {articles.length ? (
          <div className="public-articles-grid">
            {articles.map((article) => (
              <Link key={article.id} className="public-article-card" href={`/artikel/${article.slug}`}>
                {article.cover_image_url && <img src={article.cover_image_url} alt={article.title} />}
                <div>
                  <span>{new Date(article.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <h2>{article.title}</h2>
                  {article.excerpt && <p>{article.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="public-articles-empty">Belum ada artikel yang dipublikasikan.</div>
        )}
      </div>
    </main>
  );
}
