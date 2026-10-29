"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Check, LoaderCircle, Newspaper, Plus } from "lucide-react";
import {
  articleRecordSchema,
  type ArticleInput,
  type ArticleRecord,
} from "@/lib/admin/article-schema";
import { contentRecordSchema, type ContentRecord } from "@/lib/admin/content-schema";

const emptyArticle: ArticleInput = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  published: false,
  content_id: null,
  cover_image_url: null,
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminArticles() {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [contents, setContents] = useState<ContentRecord[]>([]);
  const [article, setArticle] = useState<ArticleInput>(emptyArticle);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadArticles = useCallback(async () => {
    setError("");
    try {
      const [articlesResponse, contentsResponse] = await Promise.all([
        fetch("/api/admin/articles", { cache: "no-store" }),
        fetch("/api/admin/content", { cache: "no-store" }),
      ]);
      const [articlesPayload, contentsPayload]: [unknown, unknown] = await Promise.all([
        articlesResponse.json(),
        contentsResponse.json(),
      ]);
      if (!articlesResponse.ok) {
        const message =
          articlesPayload && typeof articlesPayload === "object" && "error" in articlesPayload && typeof articlesPayload.error === "string"
            ? articlesPayload.error
            : "Artikel tidak dapat dimuat.";
        throw new Error(message);
      }
      if (!contentsResponse.ok) {
        throw new Error("Daftar film tidak dapat dimuat.");
      }
      setArticles(articleRecordSchema.array().parse(articlesPayload));
      setContents(contentRecordSchema.array().parse(contentsPayload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Artikel tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArticles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadArticles]);

  function selectContent(contentId: string) {
    const selected = contents.find((item) => item.id === contentId);
    setArticle((current) => ({
      ...current,
      content_id: selected?.id ?? null,
      cover_image_url: selected?.poster_url ?? selected?.banner_url ?? null,
    }));
  }

  async function saveArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(article),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Artikel tidak dapat disimpan.";
        throw new Error(message);
      }

      articleRecordSchema.parse(payload);
      setArticle(emptyArticle);
      setNotice("Artikel berhasil disimpan sebagai draft.");
      await loadArticles();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Artikel tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-heading">
        <div>
          <div className="dashboard-eyebrow"><span /> CONTENT STUDIO</div>
          <h1>Buat <span>artikel</span></h1>
          <p>Tulis dan simpan artikel baru sebagai draft.</p>
        </div>
      </div>

      {error && <div className="dashboard-alert" role="alert"><AlertCircle size={17} />{error}</div>}
      {notice && <div className="dashboard-notice" role="status"><Check size={16} />{notice}</div>}

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <div className="panel-overline">EDITORIAL</div>
            <h2>Artikel baru</h2>
            <p>Isi judul, ringkasan, dan naskah artikel.</p>
          </div>
          <Newspaper size={20} aria-hidden="true" />
        </div>
        <form className="admin-form" onSubmit={saveArticle}>
          <div className="form-grid">
            <label className="form-full">
              Film / Donghua terkait
              <select
                value={article.content_id ?? ""}
                onChange={(event) => selectContent(event.target.value)}
              >
                <option value="">Pilih dari daftar konten</option>
                {contents.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
            {typeof article.cover_image_url === "string" && article.cover_image_url && (
              <div className="form-full article-cover-preview">
                {/* Poster dipakai otomatis dari konten yang dipilih. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={article.cover_image_url} alt="Poster artikel" />
                <small>Poster otomatis dari film yang dipilih</small>
              </div>
            )}
            <label className="form-full">
              Judul artikel
              <input
                required
                minLength={2}
                maxLength={160}
                value={article.title}
                onChange={(event) => setArticle((current) => ({
                  ...current,
                  title: event.target.value,
                  slug: slugify(event.target.value),
                }))}
                placeholder="Masukkan judul artikel"
              />
            </label>
            <label className="form-full">
              Slug URL
              <input
                required
                maxLength={180}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={article.slug}
                onChange={(event) => setArticle((current) => ({ ...current, slug: event.target.value }))}
                placeholder="judul-artikel"
              />
            </label>
            <label className="form-full">
              Ringkasan <span>(opsional, maksimal 300 karakter)</span>
              <textarea
                rows={3}
                maxLength={300}
                value={article.excerpt}
                onChange={(event) => setArticle((current) => ({ ...current, excerpt: event.target.value }))}
                placeholder="Ringkasan singkat artikel..."
              />
            </label>
            <label className="form-full">
              Isi artikel
              <textarea
                required
                minLength={20}
                maxLength={50000}
                rows={14}
                value={article.body}
                onChange={(event) => setArticle((current) => ({ ...current, body: event.target.value }))}
                placeholder="Tulis naskah artikel di sini..."
              />
            </label>
          </div>
          <label className="article-publish-toggle">
            <input
              type="checkbox"
              checked={article.published}
              onChange={(event) => setArticle((current) => ({ ...current, published: event.target.checked }))}
            />
            Publikasikan artikel agar tampil di halaman publik
          </label>
          <footer className="admin-modal-actions">
            <button className="modal-save" type="submit" disabled={saving}>
              {saving ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}
              {saving ? "Menyimpan..." : article.published ? "Publikasikan artikel" : "Simpan sebagai draft"}
            </button>
          </footer>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <div className="panel-overline">ARSIP</div>
            <h2>Artikel tersimpan</h2>
            <p>{articles.length.toLocaleString("id-ID")} artikel</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>JUDUL</th><th>SLUG</th><th>TANGGAL DIBUAT</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="table-loading"><LoaderCircle size={18} /> Memuat artikel...</td></tr>
              ) : articles.length ? articles.map((item) => (
                <tr key={item.id}>
                  <td><div className="content-cell"><span className="episode-icon"><Newspaper size={15} /></span><span><strong>{item.title}</strong><small>{item.excerpt || "Draft artikel"}</small></span></div></td>
                  <td className="table-episode">/{item.slug}</td>
                  <td className="table-episode">{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="table-empty">Belum ada artikel. Buat artikel pertamamu di atas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
