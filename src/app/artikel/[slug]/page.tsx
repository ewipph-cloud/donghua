import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

type Props = { params: Promise<{ slug: string }> };
type Article = { title: string; slug: string; excerpt: string; body: string; cover_image_url: string | null; created_at: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("articles").select("title,excerpt,cover_image_url").eq("slug", slug).eq("published", true).maybeSingle();
  if (!data) return { title: "Artikel tidak ditemukan" };
  return { title: `${data.title} | Donghua ID`, description: data.excerpt || undefined, openGraph: data.cover_image_url ? { images: [data.cover_image_url] } : undefined };
}

export default async function ArticlePage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("articles").select("title,slug,excerpt,body,cover_image_url,created_at").eq("slug", slug).eq("published", true).maybeSingle();
  if (!data) notFound();
  const article = data as Article;

  return (
    <main className="public-article-page">
      <article className="public-article-shell">
        <Link className="public-articles-back" href="/artikel">← Semua artikel</Link>
        <header>
          <span className="public-article-kicker">ARTIKEL DONGHUA</span>
          <h1>{article.title}</h1>
          {article.excerpt && <p className="public-article-excerpt">{article.excerpt}</p>}
          <time>{new Date(article.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</time>
        </header>
        {article.cover_image_url && <img className="public-article-cover" src={article.cover_image_url} alt={article.title} />}
        <div className="public-article-body">{article.body.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </article>
    </main>
  );
}
