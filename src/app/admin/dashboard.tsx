"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Clapperboard,
  Clock3,
  Eye,
  Film,
  LoaderCircle,
  Pencil,
  Plus,
  Radio,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  contentRecordSchema,
  episodeRecordSchema,
  getOkruVideoId,
  type ContentInput,
  type ContentRecord,
  type EpisodeInput,
  type EpisodeRecord,
} from "@/lib/admin/content-schema";
import { getDailymotionVideoId } from "@/lib/dailymotion";
import { ImageUploadField } from "@/app/admin/image-upload-field";

const emptyContent: ContentInput = {
  title: "",
  slug: "",
  synopsis: "",
  genre: "Fantasi",
  status: "ongoing",
  year: new Date().getFullYear(),
  latest_episode: "",
  rating: 0,
  poster_url: "",
  banner_url: "",
  stream_url: "",
  stream_url_okru: "",
  stream_url_dailymotion: "",
  featured: false,
  published: false,
};

const emptyEpisode: EpisodeInput = {
  content_id: "",
  episode_number: 1,
  title: "",
  stream_url: "",
  stream_url_okru: "",
  stream_url_dailymotion: "",
  published: false,
};

type ModalState =
  | { type: "content"; record: ContentRecord | null }
  | { type: "episode"; record: EpisodeRecord | null }
  | null;

const validationFieldLabels: Record<string, string> = {
  title: "Judul",
  slug: "Slug URL",
  synopsis: "Sinopsis",
  genre: "Genre",
  status: "Status",
  year: "Tahun rilis",
  latest_episode: "Episode terbaru",
  rating: "Rating",
  poster_url: "URL poster",
  banner_url: "URL banner",
  stream_url: "URL stream",
  stream_url_okru: "ID video OK.Ru",
  stream_url_dailymotion: "ID video Dailymotion",
  featured: "Pilihan utama",
  published: "Status publikasi",
};

async function readJson(response: Response): Promise<unknown> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Permintaan gagal (${response.status}).`;
    const details =
      payload && typeof payload === "object" && "details" in payload && payload.details &&
      typeof payload.details === "object"
        ? Object.entries(payload.details)
            .flatMap(([field, messages]) =>
              Array.isArray(messages)
                ? messages
                    .filter((item): item is string => typeof item === "string")
                    .map((item) => `${validationFieldLabels[field] ?? field}: ${item}`)
                : [],
            )
        : [];
    throw new Error(details.length ? `${message} ${details.join(" ")}` : message);
  }
  return payload;
}

async function sendJson(url: string, method: string, payload?: unknown) {
  const response = await fetch(url, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (response.status === 204) {
    if (!response.ok) throw new Error(`Permintaan gagal (${response.status}).`);
    return null;
  }
  return readJson(response);
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function latestEpisodeNumber(value: string) {
  return Number(value.match(/\d+/)?.[0] ?? 1);
}

export function AdminDashboard() {
  const [contents, setContents] = useState<ContentRecord[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [formContent, setFormContent] = useState<ContentInput>(emptyContent);
  const [formEpisode, setFormEpisode] = useState<EpisodeInput>(emptyEpisode);
  const [saving, setSaving] = useState(false);
  const [resolvingDailymotion, setResolvingDailymotion] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(0);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async () => {
    setLoadError("");
    try {
      const [contentResponse, episodeResponse] = await Promise.all([
        fetch("/api/admin/content", { cache: "no-store" }),
        fetch("/api/admin/episodes", { cache: "no-store" }),
      ]);
      const [contentPayload, episodePayload] = await Promise.all([
        readJson(contentResponse),
        readJson(episodeResponse),
      ]);
      setContents(contentRecordSchema.array().parse(contentPayload));
      setEpisodes(episodeRecordSchema.array().parse(episodePayload));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Data tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredContents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("id");
    return contents.filter((content) => {
      const matchesSearch =
        !normalizedSearch ||
        `${content.title} ${content.genre}`.toLocaleLowerCase("id").includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && content.published) ||
        (statusFilter === "draft" && !content.published);
      return matchesSearch && matchesStatus;
    });
  }, [contents, search, statusFilter]);

  const publishedCount = contents.filter((content) => content.published).length;
  const featuredCount = contents.filter((content) => content.featured).length;

  function openContentModal(record: ContentRecord | null) {
    setFormError("");
    setFormContent(record ? {
      title: record.title,
      slug: record.slug,
      synopsis: record.synopsis,
      genre: record.genre,
      status: record.status,
      year: record.year,
      latest_episode: record.latest_episode,
      rating: record.rating,
      poster_url: record.poster_url ?? "",
      banner_url: record.banner_url ?? "",
      stream_url: record.stream_url ?? "",
      stream_url_okru: getOkruVideoId(record.stream_url_okru),
      stream_url_dailymotion: getDailymotionVideoId(record.stream_url_dailymotion) || record.stream_url_dailymotion || "",
      featured: record.featured,
      published: record.published,
    } : { ...emptyContent });
    setModal({ type: "content", record });
  }

  function openEpisodeModal(record: EpisodeRecord | null) {
    setFormError("");
    const contentId = contents[0]?.id ?? "";
    const latestEpisode = latestEpisodeNumber(
      contents.find((content) => content.id === contentId)?.latest_episode ?? "",
    );
    const nextEpisode = episodes.reduce(
      (highest, episode) =>
        episode.content_id === contentId
          ? Math.max(highest, episode.episode_number + 1)
          : highest,
      1,
    );
    setFormEpisode(record ? {
      content_id: record.content_id,
      episode_number: record.episode_number,
      title: record.title,
      stream_url: record.stream_url ?? "",
      stream_url_okru: getOkruVideoId(record.stream_url_okru),
      stream_url_dailymotion: getDailymotionVideoId(record.stream_url_dailymotion) || record.stream_url_dailymotion || "",
      published: record.published,
    } : {
      ...emptyEpisode,
      content_id: contentId,
      episode_number: Math.max(latestEpisode, nextEpisode),
    });
    setModal({ type: "episode", record });
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.type !== "content" || uploadingImages > 0) return;
    const previousImages = modal.record
      ? [modal.record.poster_url, modal.record.banner_url].filter(
          (url): url is string => Boolean(url) && url !== formContent.poster_url && url !== formContent.banner_url,
        )
      : [];
    setSaving(true);
    setFormError("");
    try {
      const payload = await sendJson(
        modal.record ? `/api/admin/content/${modal.record.id}` : "/api/admin/content",
        modal.record ? "PATCH" : "POST",
        formContent,
      );
      contentRecordSchema.parse(payload);
      setModal(null);
      setNotice(modal.record ? "Perubahan konten berhasil disimpan." : "Konten baru berhasil dibuat.");
      if (previousImages.length) {
        try {
          await sendJson("/api/admin/assets", "DELETE", { urls: previousImages });
        } catch (error) {
          setNotice(
            `Konten berhasil disimpan, tetapi gambar lama gagal dihapus: ${
              error instanceof Error ? error.message : "Kesalahan tidak diketahui."
            }`,
          );
        }
      }
      await loadData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Konten gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.type !== "episode") return;
    setSaving(true);
    setFormError("");
    try {
      const payload = await sendJson(
        modal.record ? `/api/admin/episodes/${modal.record.id}` : "/api/admin/episodes",
        modal.record ? "PATCH" : "POST",
        formEpisode,
      );
      const savedEpisode = episodeRecordSchema.omit({ content_title: true }).parse(payload);
      episodeRecordSchema.parse({
        ...savedEpisode,
        content_title: contents.find((item) => item.id === formEpisode.content_id)?.title ?? "Konten",
      });
      setModal(null);
      setNotice(modal.record ? "Perubahan episode berhasil disimpan." : "Episode baru berhasil dibuat.");
      await loadData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Episode gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function resolveDailymotionSource(target: "content" | "episode") {
    const sourceUrl =
      target === "content"
        ? formContent.stream_url_dailymotion
        : formEpisode.stream_url_dailymotion;
    if (!sourceUrl?.trim()) {
      setFormError("Tempel tautan episode Anichin atau ca3d.site terlebih dahulu.");
      return;
    }

    setResolvingDailymotion(true);
    setFormError("");
    try {
      const payload = await sendJson("/api/admin/dailymotion/resolve", "POST", {
        url: sourceUrl.trim(),
      });
      if (
        !payload ||
        typeof payload !== "object" ||
        !("videoId" in payload) ||
        typeof payload.videoId !== "string"
      ) {
        throw new Error("ID Dailymotion tidak ditemukan.");
      }
      const videoId = payload.videoId;
      if (target === "content") {
        setFormContent((form) => ({ ...form, stream_url_dailymotion: videoId }));
      } else {
        setFormEpisode((form) => ({ ...form, stream_url_dailymotion: videoId }));
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "ID Dailymotion gagal dideteksi.");
    } finally {
      setResolvingDailymotion(false);
    }
  }

  async function deleteRecord(
    type: "content" | "episode",
    id: string,
    title: string,
    imageUrls: string[] = [],
  ) {
    if (!window.confirm(`Hapus "${title}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setNotice("");
    try {
      await sendJson(`/api/admin/${type === "content" ? "content" : "episodes"}/${id}`, "DELETE");
      setNotice(
        `${type === "content" ? "Konten" : "Episode"} berhasil dihapus.${
          imageUrls.length ? " Membersihkan file gambar..." : ""
        }`,
      );
      if (imageUrls.length) {
        try {
          await sendJson("/api/admin/assets", "DELETE", { urls: imageUrls });
          setNotice("Konten dan gambar yang tidak lagi digunakan berhasil dibersihkan.");
        } catch (error) {
          setNotice(
            `Konten berhasil dihapus, tetapi gambar lama gagal dihapus: ${
              error instanceof Error ? error.message : "Kesalahan tidak diketahui."
            }`,
          );
        }
      }
      await loadData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Data tidak dapat dihapus.");
    }
  }

  async function togglePublished(content: ContentRecord) {
    setNotice("");
    try {
      const payload = await sendJson(`/api/admin/content/${content.id}`, "PATCH", {
        title: content.title,
        slug: content.slug,
        synopsis: content.synopsis,
        genre: content.genre,
        status: content.status,
        year: content.year,
        latest_episode: content.latest_episode,
        rating: content.rating,
        poster_url: content.poster_url ?? "",
        banner_url: content.banner_url ?? "",
        stream_url: content.stream_url ?? "",
        stream_url_okru: content.stream_url_okru ?? "",
        stream_url_dailymotion: content.stream_url_dailymotion ?? "",
        featured: content.featured,
        published: !content.published,
      });
      contentRecordSchema.parse(payload);
      setNotice(content.published ? "Konten dipindahkan ke draft." : "Konten berhasil dipublikasikan.");
      await loadData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Status publikasi gagal diubah.");
    }
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-heading">
        <div>
          <div className="dashboard-eyebrow"><span /> CONTENT STUDIO</div>
          <h1>Ringkasan <span>dashboard</span></h1>
          <p>Kelola daftar donghua dan episode dari satu tempat.</p>
        </div>
        <button className="dashboard-add-button" type="button" onClick={() => openContentModal(null)}>
          <Plus size={17} /> Tambah konten
        </button>
      </div>

      {loadError && <div className="dashboard-alert" role="alert"><AlertCircle size={17} />{loadError}<button type="button" onClick={() => void loadData()}>Coba lagi</button></div>}
      {notice && <div className="dashboard-notice" role="status"><Check size={16} />{notice}<button type="button" aria-label="Tutup notifikasi" onClick={() => setNotice("")}><X size={15} /></button></div>}

      <section className="admin-stats" aria-label="Statistik konten">
        <article className="admin-stat-card">
          <span className="stat-icon stat-icon-green"><Clapperboard size={18} /></span>
          <span className="stat-label">TOTAL KONTEN</span>
          <strong>{loading ? "—" : contents.length.toLocaleString("id-ID")}</strong>
          <small><Film size={12} /> Seluruh judul</small>
        </article>
        <article className="admin-stat-card">
          <span className="stat-icon stat-icon-blue"><Radio size={18} /></span>
          <span className="stat-label">DITERBITKAN</span>
          <strong>{loading ? "—" : publishedCount.toLocaleString("id-ID")}</strong>
          <small><Activity size={12} /> Terlihat di situs publik</small>
        </article>
        <article className="admin-stat-card">
          <span className="stat-icon stat-icon-yellow"><Star size={18} /></span>
          <span className="stat-label">PILIHAN UTAMA</span>
          <strong>{loading ? "—" : featuredCount.toLocaleString("id-ID")}</strong>
          <small><ArrowUpRight size={12} /> Rekomendasi unggulan</small>
        </article>
        <article className="admin-stat-card">
          <span className="stat-icon stat-icon-violet"><BookOpen size={18} /></span>
          <span className="stat-label">TOTAL EPISODE</span>
          <strong>{loading ? "—" : episodes.length.toLocaleString("id-ID")}</strong>
          <small><Clock3 size={12} /> Episode terdaftar</small>
        </article>
      </section>

      <section className="admin-panel" id="konten">
        <div className="admin-panel-heading">
          <div>
            <div className="panel-overline">DONGHUA & PUBLIKASI</div>
            <h2>Manajemen konten</h2>
            <p>Tambah judul, perbarui metadata, dan atur status publikasi.</p>
          </div>
          <button className="panel-add-button" type="button" onClick={() => openContentModal(null)}><Plus size={15} /> Konten baru</button>
        </div>
        <div className="table-toolbar">
          <label className="admin-search"><Search size={16} /><input aria-label="Cari judul konten" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul atau genre..." /></label>
          <label className="admin-filter"><ArrowDownWideNarrow size={15} /><select aria-label="Filter status publikasi" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option><option value="published">Diterbitkan</option><option value="draft">Draft</option></select><ChevronDown size={13} /></label>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>JUDUL</th><th>STATUS</th><th>GENRE</th><th>EPISODE TERBARU</th><th>VIEWS</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-loading"><LoaderCircle size={18} /> Memuat konten...</td></tr>
              ) : filteredContents.length ? filteredContents.map((content) => (
                <tr key={content.id}>
                  <td><div className="content-cell"><span className="content-poster"><Film size={16} /></span><span><strong>{content.title}</strong><small>/{content.slug}{content.featured && <i> · PILIHAN</i>}</small></span></div></td>
                  <td><span className={`publish-status ${content.published ? "status-published" : "status-draft"}`}><i />{content.published ? "Terbit" : "Draft"}</span></td>
                  <td><span className="table-genre">{content.genre}</span></td>
                  <td className="table-episode">{content.latest_episode || "—"}</td>
                  <td className="table-views"><Eye size={13} /> {content.views.toLocaleString("id-ID")}</td>
                  <td><div className="table-actions">
                    <button type="button" title={content.published ? "Jadikan draft" : "Terbitkan"} aria-label={content.published ? `Jadikan ${content.title} draft` : `Terbitkan ${content.title}`} onClick={() => void togglePublished(content)}><Send size={15} /></button>
                    <button type="button" title="Edit" aria-label={`Edit ${content.title}`} onClick={() => openContentModal(content)}><Pencil size={15} /></button>
                    <button className="action-delete" type="button" title="Hapus" aria-label={`Hapus ${content.title}`} onClick={() => void deleteRecord("content", content.id, content.title, [content.poster_url, content.banner_url].filter((url): url is string => Boolean(url)))}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="table-empty">{search ? "Tidak ada hasil yang cocok." : "Belum ada konten. Tambahkan judul pertamamu."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Menampilkan {filteredContents.length} dari {contents.length} judul</span><span><span className="admin-live-dot" /> Sinkron dengan database</span></div>
      </section>

      <section className="admin-panel" id="episode">
        <div className="admin-panel-heading">
          <div>
            <div className="panel-overline">JADWAL TAYANG</div>
            <h2>Manajemen episode</h2>
            <p>Tambahkan episode dan tautan stream berizin untuk pemutar.</p>
          </div>
          <button className="panel-add-button" type="button" disabled={!contents.length} onClick={() => openEpisodeModal(null)}><Plus size={15} /> Episode baru</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>JUDUL DONGHUA</th><th>EPISODE</th><th>SUMBER STREAM</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="table-loading"><LoaderCircle size={18} /> Memuat episode...</td></tr>
              ) : episodes.length ? episodes.map((episode) => (
                <tr key={episode.id}>
                  <td><div className="content-cell"><span className="episode-icon"><BookOpen size={15} /></span><span><strong>{episode.content_title}</strong><small>{episode.title || `Episode ${episode.episode_number}`}</small></span></div></td>
                  <td className="table-episode">EP {episode.episode_number.toString().padStart(2, "0")}</td>
                  <td><span className={`stream-link${episode.stream_url || episode.stream_url_okru || episode.stream_url_dailymotion ? "" : " stream-missing"}`}>{episode.stream_url || episode.stream_url_okru || episode.stream_url_dailymotion ? "Tautan tersimpan" : "Belum ada sumber"}</span></td>
                  <td><span className={`publish-status ${episode.published ? "status-published" : "status-draft"}`}><i />{episode.published ? "Terbit" : "Draft"}</span></td>
                  <td><div className="table-actions">
                    <button type="button" title="Edit" aria-label={`Edit episode ${episode.episode_number}`} onClick={() => openEpisodeModal(episode)}><Pencil size={15} /></button>
                    <button className="action-delete" type="button" title="Hapus" aria-label={`Hapus episode ${episode.episode_number}`} onClick={() => void deleteRecord("episode", episode.id, `${episode.content_title} EP ${episode.episode_number}`)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="table-empty">{contents.length ? "Belum ada episode. Tambahkan episode untuk mulai menata jadwal." : "Tambahkan konten terlebih dahulu sebelum membuat episode."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="episode-note"><AlertCircle size={14} /> URL server episode dipakai lebih dulu daripada URL server utama. OK.Ru dan Dailymotion dapat disimpan sebagai server alternatif; gunakan tautan HTTPS.</div>
      </section>

      {modal && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
            <header className="admin-modal-header">
              <div><span className="panel-overline">{modal.type === "content" ? "DETAIL DONGHUA" : "JADWAL TAYANG"}</span><h2 id="admin-modal-title">{modal.type === "content" ? modal.record ? "Edit konten" : "Tambah konten" : modal.record ? "Edit episode" : "Tambah episode"}</h2></div>
              <button type="button" aria-label="Tutup formulir" onClick={() => setModal(null)}><X size={18} /></button>
            </header>
            {modal.type === "content" ? (
              <form className="admin-form" onSubmit={saveContent}>
                <div className="form-grid">
                  <label className="form-full">Judul konten<input required minLength={2} maxLength={120} value={formContent.title} onChange={(event) => setFormContent((form) => ({ ...form, title: event.target.value, slug: modal.record ? form.slug : slugify(event.target.value) }))} placeholder="Contoh: Renegade Immortal" /></label>
                  <label>Slug URL<input required value={formContent.slug} onChange={(event) => setFormContent((form) => ({ ...form, slug: event.target.value }))} placeholder="renegade-immortal" /></label>
                  <label>Genre<input required value={formContent.genre} onChange={(event) => setFormContent((form) => ({ ...form, genre: event.target.value }))} placeholder="Fantasi" /></label>
                  <label>Status<select value={formContent.status} onChange={(event) => setFormContent((form) => ({ ...form, status: event.target.value as ContentInput["status"] }))}><option value="ongoing">Sedang tayang</option><option value="completed">Tamat</option><option value="upcoming">Segera hadir</option></select></label>
                  <label>Tahun rilis<input type="number" min="1950" max="2100" value={formContent.year} onChange={(event) => setFormContent((form) => ({ ...form, year: Number(event.target.value) }))} /></label>
                  <label>Episode terbaru<input value={formContent.latest_episode} onChange={(event) => setFormContent((form) => ({ ...form, latest_episode: event.target.value }))} placeholder="EP 24" /></label>
                  <label>Rating (0–10)<input type="number" min="0" max="10" step="0.1" value={formContent.rating} onChange={(event) => setFormContent((form) => ({ ...form, rating: Number(event.target.value) }))} /></label>
                  <label className="form-full">Sinopsis<textarea rows={3} maxLength={1200} value={formContent.synopsis} onChange={(event) => setFormContent((form) => ({ ...form, synopsis: event.target.value }))} placeholder="Ringkasan cerita..." /></label>
                  <ImageUploadField
                    label="Poster"
                    value={formContent.poster_url ?? ""}
                    onChange={(poster_url) => setFormContent((form) => ({ ...form, poster_url }))}
                    onUploadingChange={(uploading) =>
                      setUploadingImages((count) => Math.max(0, count + (uploading ? 1 : -1)))
                    }
                  />
                  <ImageUploadField
                    label="Banner"
                    value={formContent.banner_url ?? ""}
                    onChange={(banner_url) => setFormContent((form) => ({ ...form, banner_url }))}
                    onUploadingChange={(uploading) =>
                      setUploadingImages((count) => Math.max(0, count + (uploading ? 1 : -1)))
                    }
                  />
                  <label className="form-full">URL server lain (opsional)<input type="url" value={formContent.stream_url ?? ""} onChange={(event) => setFormContent((form) => ({ ...form, stream_url: event.target.value }))} placeholder="https://.../video.mp4 atau URL embed" /></label>
                  <label className="form-full">ID video OK.Ru<input type="text" inputMode="numeric" maxLength={2048} value={formContent.stream_url_okru ?? ""} onChange={(event) => setFormContent((form) => ({ ...form, stream_url_okru: event.target.value }))} placeholder="17698476395169" /><small>Masukkan ID berupa angka. URL embed OK.Ru juga bisa ditempel.</small></label>
                  <div className="form-full dailymotion-resolver">
                    <label>ID video Dailymotion atau tautan episode<input type="text" maxLength={2048} value={formContent.stream_url_dailymotion ?? ""} onChange={(event) => setFormContent((form) => ({ ...form, stream_url_dailymotion: event.target.value }))} placeholder="ID, tautan Anichin, atau ca3d.site" /><small>ID Dailymotion langsung diputar dengan embed resmi.</small></label>
                    <button className="resolve-dailymotion-button" type="button" disabled={resolvingDailymotion} onClick={() => void resolveDailymotionSource("content")}>{resolvingDailymotion ? "Mendeteksi ID..." : "Deteksi ID dari Anichin / ca3d.site"}</button>
                  </div>
                </div>
                <div className="form-switches">
                  <label><input type="checkbox" checked={formContent.featured} onChange={(event) => setFormContent((form) => ({ ...form, featured: event.target.checked }))} /><span><strong>Pilihan utama</strong><small>Tampilkan sebagai rekomendasi unggulan</small></span></label>
                  <label><input type="checkbox" checked={formContent.published} onChange={(event) => setFormContent((form) => ({ ...form, published: event.target.checked }))} /><span><strong>Terbitkan konten</strong><small>Konten bisa dilihat pengunjung</small></span></label>
                </div>
                {formError && <div className="form-error" role="alert"><AlertCircle size={15} />{formError}</div>}
                <footer className="admin-modal-actions"><button className="modal-cancel" type="button" onClick={() => setModal(null)}>Batal</button><button className="modal-save" type="submit" disabled={saving || uploadingImages > 0}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}{uploadingImages > 0 ? "Menunggu unggahan..." : saving ? "Menyimpan..." : "Simpan konten"}</button></footer>
              </form>
            ) : (
              <form className="admin-form" onSubmit={saveEpisode}>
                <div className="form-grid">
                  <label className="form-full">Judul donghua<select required value={formEpisode.content_id} onChange={(event) => setFormEpisode((form) => {
                    const contentId = event.target.value;
                    const latestEpisode = latestEpisodeNumber(
                      contents.find((content) => content.id === contentId)?.latest_episode ?? "",
                    );
                    const nextEpisode = episodes.reduce(
                      (highest, episode) =>
                        episode.content_id === contentId
                          ? Math.max(highest, episode.episode_number + 1)
                          : highest,
                      1,
                    );
                    return {
                      ...form,
                      content_id: contentId,
                      episode_number: Math.max(latestEpisode, nextEpisode),
                    };
                  })}>{contents.map((content) => <option key={content.id} value={content.id}>{content.title}</option>)}</select></label>
                  <label>Nomor episode<input type="number" min="0" max="9999" required value={formEpisode.episode_number} onChange={(event) => setFormEpisode((form) => ({ ...form, episode_number: Number(event.target.value) }))} /></label>
                  <label>Judul episode<input value={formEpisode.title} onChange={(event) => setFormEpisode((form) => ({ ...form, title: event.target.value }))} placeholder="Pertemuan baru" /></label>
                  <label className="form-full">URL server lain (opsional)<input type="url" value={formEpisode.stream_url ?? ""} onChange={(event) => setFormEpisode((form) => ({ ...form, stream_url: event.target.value }))} placeholder="https://.../video.mp4 atau URL embed" /></label>
                  <label className="form-full">ID video OK.Ru<input type="text" inputMode="numeric" maxLength={2048} value={formEpisode.stream_url_okru ?? ""} onChange={(event) => setFormEpisode((form) => ({ ...form, stream_url_okru: event.target.value }))} placeholder="17698476395169" /><small>Masukkan ID berupa angka. URL embed OK.Ru juga bisa ditempel.</small></label>
                  <div className="form-full dailymotion-resolver">
                    <label>ID video Dailymotion atau tautan episode<input type="text" maxLength={2048} value={formEpisode.stream_url_dailymotion ?? ""} onChange={(event) => setFormEpisode((form) => ({ ...form, stream_url_dailymotion: event.target.value }))} placeholder="ID, tautan Anichin, atau ca3d.site" /><small>ID Dailymotion langsung diputar dengan embed resmi.</small></label>
                    <button className="resolve-dailymotion-button" type="button" disabled={resolvingDailymotion} onClick={() => void resolveDailymotionSource("episode")}>{resolvingDailymotion ? "Mendeteksi ID..." : "Deteksi ID dari Anichin / ca3d.site"}</button>
                  </div>
                </div>
                <div className="form-switches"><label><input type="checkbox" checked={formEpisode.published} onChange={(event) => setFormEpisode((form) => ({ ...form, published: event.target.checked }))} /><span><strong>Terbitkan episode</strong><small>Episode ditampilkan kepada pengunjung</small></span></label></div>
                <div className="episode-form-note"><AlertCircle size={14} /> Masukkan ID video saja, tanpa URL.</div>
                {formError && <div className="form-error" role="alert"><AlertCircle size={15} />{formError}</div>}
                <footer className="admin-modal-actions"><button className="modal-cancel" type="button" onClick={() => setModal(null)}>Batal</button><button className="modal-save" type="submit" disabled={saving || !contents.length}>{saving ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}{saving ? "Menyimpan..." : "Simpan episode"}</button></footer>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
