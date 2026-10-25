"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdSenseUnit } from "@/app/adsense-unit";
import {
  categories,
  imageUrl,
  publicSeriesSchema,
  type Series,
} from "@/lib/series";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlay,
  Clock3,
  Eye,
  Film,
  Flame,
  Menu,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [activeStatus, setActiveStatus] = useState("Semua");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [lightTheme, setLightTheme] = useState(false);
  const [catalogTitles, setCatalogTitles] = useState<Series[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(() => isSupabaseConfigured());
  const [catalogError, setCatalogError] = useState(() =>
    isSupabaseConfigured() ? "" : "Database belum dikonfigurasi.",
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("donghua-saved");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
            setSavedIds(parsed);
          }
        }
        setLightTheme(window.localStorage.getItem("donghua-theme") === "light");
      } catch (error) {
        console.warn("Koleksi tersimpan tidak dapat dimuat dari penyimpanan lokal.", error);
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem("donghua-saved", JSON.stringify(savedIds));
      window.localStorage.setItem("donghua-theme", lightTheme ? "light" : "dark");
      document.documentElement.dataset.theme = lightTheme ? "light" : "dark";
    } catch (error) {
      console.warn("Preferensi situs tidak dapat disimpan.", error);
      document.documentElement.dataset.theme = lightTheme ? "light" : "dark";
    }
  }, [lightTheme, savedIds, storageReady]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let active = true;
    async function loadCatalog() {
      try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Daftar donghua tidak dapat dimuat.";
          throw new Error(message);
        }
        const parsed = publicSeriesSchema.array().safeParse(payload);
        if (!parsed.success) throw new Error("Format daftar donghua dari database tidak sesuai.");
        if (active) {
          setCatalogTitles(parsed.data);
        }
      } catch (error) {
        if (active) {
          setCatalogError(error instanceof Error ? error.message : "Daftar donghua tidak dapat dimuat.");
        }
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    void loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  const dynamicFeatured = catalogTitles.filter((item) => item.featured).slice(0, 3);
  const heroTitles = dynamicFeatured.length ? dynamicFeatured : catalogTitles.slice(0, 3);
  const currentFeature = heroTitles.length ? heroTitles[activeFeature % heroTitles.length] : null;

  useEffect(() => {
    if (
      heroTitles.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveFeature((current) => (current + 1) % heroTitles.length);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroTitles.length]);

  const popularTitles = [...catalogTitles]
    .sort((left, right) => (right.viewCount ?? 0) - (left.viewCount ?? 0))
    .slice(0, 5);
  const filteredSeries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id");
    return catalogTitles.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${item.title} ${item.genre}`.toLocaleLowerCase("id").includes(normalizedQuery);
      const matchesCategory = activeCategory === "Semua" || item.genre === activeCategory;
      const matchesStatus = activeStatus === "Semua" || item.status === activeStatus;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [activeCategory, activeStatus, catalogTitles, query]);

  function toggleSaved(id: string) {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    );
  }

  function changeFeature(direction: number) {
    setActiveFeature((current) => (current + direction + heroTitles.length) % heroTitles.length);
  }

  return (
    <main className={`site-shell${lightTheme ? " theme-light" : ""}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#beranda" aria-label="Donghua ID beranda">
            <span className="brand-mark"><Sparkles size={19} strokeWidth={2.4} /></span>
            <span className="brand-copy">
              <strong>DONGHUA<span>ID</span></strong>
              <small>Jelajahi dunia lain</small>
            </span>
          </a>

          <nav className={`main-nav${menuOpen ? " nav-open" : ""}`} aria-label="Navigasi utama">
            <a className="nav-active" href="#beranda" onClick={() => setMenuOpen(false)}>Beranda</a>
            <a href="#rilisan" onClick={() => setMenuOpen(false)}>Jelajahi</a>
            <a href="#populer" onClick={() => setMenuOpen(false)}>Paling populer</a>
          </nav>

          <div className="header-actions">
            {searchOpen && (
              <label className="header-search">
                <Search size={16} />
                <input
                  autoFocus
                  aria-label="Cari donghua"
                  placeholder="Cari judul..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button type="button" aria-label="Tutup pencarian" onClick={() => { setSearchOpen(false); setQuery(""); }}>
                  <X size={15} />
                </button>
              </label>
            )}
            <button
              className="icon-button search-toggle"
              type="button"
              aria-label={searchOpen ? "Tutup pencarian" : "Cari"}
              onClick={() => setSearchOpen((open) => !open)}
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
            <button
              className={`icon-button${notificationsOpen ? " icon-selected" : ""}`}
              type="button"
              aria-label="Notifikasi"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <button
              className="icon-button saved-shortcut"
              type="button"
              aria-label={`Koleksi saya, ${savedIds.length} judul`}
              onClick={() => { setActiveCategory("Semua"); setActiveStatus("Disimpan"); document.querySelector("#rilisan")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              <Bookmark size={19} />
              {savedIds.length > 0 && <span className="saved-count">{savedIds.length}</span>}
            </button>
            <button
              className="icon-button theme-toggle"
              type="button"
              aria-label="Ganti tema"
              onClick={() => setLightTheme((value) => !value)}
            >
              <span aria-hidden="true">{lightTheme ? "☾" : "☼"}</span>
            </button>
            <button className="icon-button menu-toggle" type="button" aria-label="Buka menu" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {notificationsOpen && (
            <div className="notification-popover">
              <div className="popover-heading"><span>Notifikasi</span><span className="live-pill">TERBARU</span></div>
              <p><span className="notice-icon"><Play size={12} fill="currentColor" /></span><span><strong>Episode baru menanti</strong><small>Renegade Immortal · Episode 164</small></span></p>
              <p><span className="notice-icon notice-purple"><Sparkles size={13} /></span><span><strong>Temukan cerita baru</strong><small>Update pilihan minggu ini sudah hadir.</small></span></p>
            </div>
          )}
        </div>
      </header>

      {currentFeature ? (
        <section className="hero" id="beranda" aria-label="Rekomendasi pilihan">
          <div className="hero-image-wrap" key={currentFeature.id}>
            <Image
              className="hero-image"
              src={imageUrl(currentFeature.bannerImage ?? currentFeature.image, 1800)}
              alt=""
              fill
              priority
              sizes="100vw"
            />
          </div>
          <div className="hero-vignette" />
          <div className="hero-content page-width">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> PILIHAN MINGGU INI <span className="eyebrow-line" /></div>
              <p className="hero-kicker">SEBUAH KISAH TENTANG TAKDIR</p>
              <h1>{currentFeature.title}</h1>
              <p className="hero-description">{currentFeature.summary}</p>
              <div className="hero-meta">
                <span className="rating"><Star size={15} fill="currentColor" /> {currentFeature.rating}</span>
                <span><CirclePlay size={15} /> {currentFeature.episode}</span>
                <span><CalendarDays size={15} /> Update mingguan</span>
                <span className="genre-chip">{currentFeature.genre}</span>
              </div>
              <div className="hero-actions">
                <Link className="button button-primary" href={`/watch/${currentFeature.id}`}>
                  <Play size={16} fill="currentColor" /> Tonton sekarang
                </Link>
                <button className="button button-glass" type="button" onClick={() => toggleSaved(currentFeature.id)}>
                  {savedIds.includes(currentFeature.id) ? <Check size={17} /> : <Bookmark size={17} />}
                  {savedIds.includes(currentFeature.id) ? "Tersimpan" : "Simpan"}
                </button>
              </div>
            </div>
            <div className="hero-controls">
              <button type="button" aria-label="Pilihan sebelumnya" onClick={() => changeFeature(-1)}><ArrowLeft size={17} /></button>
              <div className="hero-dots" aria-label="Slide pilihan">
                {heroTitles.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    className={activeFeature % heroTitles.length === index ? "dot-active" : ""}
                    aria-label={`Pilihan ${index + 1}: ${item.title}`}
                    aria-current={activeFeature % heroTitles.length === index}
                    onClick={() => setActiveFeature(index)}
                  />
                ))}
              </div>
              <button type="button" aria-label="Pilihan berikutnya" onClick={() => changeFeature(1)}><ArrowRight size={17} /></button>
            </div>
            <div className="hero-index"><span>0{(activeFeature % heroTitles.length) + 1}</span> / 0{heroTitles.length}</div>
          </div>
          <div className="hero-bottom-fade" />
        </section>
      ) : (
        <section className="hero hero-empty" id="beranda">
          <div className="page-width hero-empty-content">
            <Film size={27} />
            <h1>{catalogLoading ? "Memuat daftar donghua..." : catalogError ? "Daftar donghua tidak tersedia." : "Belum ada konten diterbitkan."}</h1>
            <p>{catalogLoading || catalogError ? "Konten akan tampil setelah daftar donghua berhasil dimuat." : "Judul yang diterbitkan dari dashboard admin akan tampil di sini."}</p>
          </div>
        </section>
      )}
      {catalogError && <div className="catalog-connection-error page-width" role="status">{catalogError}</div>}

      <div className="page-width content-layout">
        <section className="catalog-section" id="rilisan">
          <div className="section-heading">
            <div>
              <div className="section-overline">PILIHAN UNTUKMU</div>
              <h2>Jelajahi <span>donghua</span></h2>
            </div>
            <button
              className="filter-button"
              type="button"
              onClick={() => setActiveStatus((status) => (status === "Semua" ? "Ongoing" : "Semua"))}
              aria-label="Filter judul yang sedang tayang"
            >
              <SlidersHorizontal size={16} />
              <span>{activeStatus === "Ongoing" ? "Sedang tayang" : "Semua judul"}</span>
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="catalog-toolbar">
            <div className="category-tabs" role="tablist" aria-label="Kategori donghua">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  role="tab"
                  aria-selected={activeCategory === category}
                  className={activeCategory === category ? "category-active" : ""}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <button
              className={`saved-filter${activeStatus === "Disimpan" ? " saved-filter-active" : ""}`}
              type="button"
              onClick={() => setActiveStatus((status) => (status === "Disimpan" ? "Semua" : "Disimpan"))}
            >
              <Bookmark size={14} /> Koleksi saya
            </button>
          </div>

          {!catalogLoading && !catalogError && <AdSenseUnit />}

          {activeStatus === "Disimpan" ? (
            <div className="saved-intro"><Bookmark size={16} /><span>{savedIds.length ? `${savedIds.length} judul dalam koleksimu` : "Belum ada judul tersimpan. Simpan donghua yang ingin kamu tonton nanti."}</span></div>
          ) : null}

          {catalogLoading ? (
            <div className="catalog-loading" role="status">Memuat daftar donghua...</div>
          ) : filteredSeries.length > 0 && activeStatus !== "Disimpan" ? (
            <div className="series-grid">
              {filteredSeries.map((item, index) => (
                <article className="series-card" key={item.id} style={{ animationDelay: `${index * 35}ms` }}>
                  <button className="poster-button" type="button" onClick={() => setSelectedSeries(item)} aria-label={`Lihat detail ${item.title}`}>
                    <div className="poster-art" style={{ backgroundColor: item.color }}>
                      <Image src={imageUrl(item.image, 650)} alt="" fill sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 18vw" />
                      <span className="poster-shade" />
                    </div>
                    <span className="episode-badge">{item.episode}</span>
                    <span className="poster-rating"><Star size={12} fill="currentColor" /> {item.rating}</span>
                    <span className="poster-play"><Play size={19} fill="currentColor" /></span>
                  </button>
                  <div className="card-info">
                    <div className="card-title-row">
                      <button type="button" className="card-title" onClick={() => setSelectedSeries(item)}>{item.title}</button>
                      <button
                        type="button"
                        className={`card-save${savedIds.includes(item.id) ? " card-save-active" : ""}`}
                        aria-label={savedIds.includes(item.id) ? `Hapus ${item.title} dari koleksi` : `Simpan ${item.title}`}
                        onClick={() => toggleSaved(item.id)}
                      >
                        <Bookmark size={16} fill={savedIds.includes(item.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <div className="card-meta"><span>{item.genre}</span><i /> <span><Eye size={12} /> {item.views}</span></div>
                  </div>
                </article>
              ))}
            </div>
          ) : activeStatus === "Disimpan" && catalogTitles.some((item) => savedIds.includes(item.id)) ? (
            <div className="series-grid">
              {catalogTitles.filter((item) => savedIds.includes(item.id)).map((item) => (
                <article className="series-card" key={item.id}>
                  <button className="poster-button" type="button" onClick={() => setSelectedSeries(item)} aria-label={`Lihat detail ${item.title}`}>
                    <div className="poster-art" style={{ backgroundColor: item.color }}>
                      <Image src={imageUrl(item.image, 650)} alt="" fill sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 18vw" />
                      <span className="poster-shade" />
                    </div>
                    <span className="episode-badge">{item.episode}</span>
                    <span className="poster-rating"><Star size={12} fill="currentColor" /> {item.rating}</span>
                    <span className="poster-play"><Play size={19} fill="currentColor" /></span>
                  </button>
                  <div className="card-info">
                    <div className="card-title-row">
                      <button type="button" className="card-title" onClick={() => setSelectedSeries(item)}>{item.title}</button>
                      <button type="button" className="card-save card-save-active" aria-label={`Hapus ${item.title} dari koleksi`} onClick={() => toggleSaved(item.id)}><Bookmark size={16} fill="currentColor" /></button>
                    </div>
                    <div className="card-meta"><span>{item.genre}</span><i /> <span><Eye size={12} /> {item.views}</span></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={22} />
              <strong>Tidak ada judul ditemukan</strong>
              <span>Coba kata kunci atau kategori yang berbeda.</span>
              <button type="button" onClick={() => { setQuery(""); setActiveCategory("Semua"); setActiveStatus("Semua"); }}>Hapus filter</button>
            </div>
          )}

          <div className="catalog-footer">
            <span>Menampilkan <strong>{activeStatus === "Disimpan" ? savedIds.length : filteredSeries.length}</strong> judul pilihan</span>
            <button type="button" onClick={() => { setQuery(""); setActiveCategory("Semua"); setActiveStatus("Semua"); }}>Lihat semua koleksi <ArrowRight size={14} /></button>
          </div>
        </section>

        <aside className="sidebar" id="populer">
          <section className="sidebar-panel">
            <div className="sidebar-heading">
              <div className="sidebar-heading-icon"><Flame size={17} fill="currentColor" /></div>
              <div><span>SEDANG RAMAI</span><h3>Paling populer</h3></div>
              <ArrowDownWideNarrow className="sidebar-sort" size={16} />
            </div>
            <div className="popular-list">
              {popularTitles.length ? popularTitles.map((item, index) => (
                <button className="popular-item" key={item.id} type="button" onClick={() => setSelectedSeries(item)}>
                  <span className={`popular-rank${index < 3 ? " rank-top" : ""}`}>0{index + 1}</span>
                  <span className="popular-thumb" style={{ backgroundColor: item.color }}>
                    <Image src={imageUrl(item.image, 200)} alt="" fill sizes="52px" />
                  </span>
                  <span className="popular-copy"><strong>{item.title}</strong><small>{item.episode} <i /> <Eye size={11} /> {item.views}</small></span>
                  <ArrowRight className="popular-arrow" size={14} />
                </button>
              )) : !catalogLoading && <div className="catalog-loading">Belum ada konten tersedia.</div>}
            </div>
            <a className="sidebar-link" href="#rilisan">Jelajahi peringkat <ArrowRight size={14} /></a>
          </section>

          <section className="weekly-card">
            <div className="weekly-glow" />
            <div className="weekly-label"><Sparkles size={13} /> PILIHAN EDITOR</div>
            <h3>Cerita baru,<br /><span>dunia baru.</span></h3>
            <p>Temukan petualangan yang akan menemanimu minggu ini.</p>
            <button type="button" onClick={() => { setActiveCategory("Fantasi"); document.querySelector("#rilisan")?.scrollIntoView({ behavior: "smooth" }); }}>
              Temukan cerita <ArrowRight size={14} />
            </button>
            <div className="weekly-orbit orbit-one" />
            <div className="weekly-orbit orbit-two" />
          </section>

          <div className="sidebar-note"><Clock3 size={14} /><span>Episode baru diperbarui sepanjang minggu.</span></div>
        </aside>
      </div>

      <footer className="footer page-width">
        <a className="footer-brand" href="#beranda"><span className="brand-mark"><Sparkles size={16} /></span><strong>DONGHUA<span>ID</span></strong></a>
        <p>Donghua pilihan untuk menemani waktu luangmu.</p>
        <span className="footer-copyright">© 2026 Donghua ID</span>
        <p className="footer-disclaimer">Situs ini tidak menyimpan atau menghosting berkas video.</p>
      </footer>

      {selectedSeries && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSeries(null); }}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <button className="modal-close" type="button" aria-label="Tutup detail" onClick={() => setSelectedSeries(null)}><X size={19} /></button>
            <div className="modal-art" style={{ backgroundColor: selectedSeries.color }}>
              <Image src={imageUrl(selectedSeries.image, 1000)} alt="" fill sizes="(max-width: 700px) 100vw, 700px" />
              <span />
            </div>
            <div className="modal-content">
              <span className="modal-kicker">DONGHUA PILIHAN · {selectedSeries.genre.toUpperCase()}</span>
              <h2 id="detail-title">{selectedSeries.title}</h2>
              <div className="modal-meta"><span className="rating"><Star size={14} fill="currentColor" /> {selectedSeries.rating}</span><span><CirclePlay size={14} /> {selectedSeries.episode}</span><span><Eye size={14} /> {selectedSeries.views} tayangan</span></div>
              <p>{selectedSeries.summary}</p>
              <div className="modal-actions">
                <Link className="button button-primary" href={`/watch/${selectedSeries.id}`}>
                  <Play size={16} fill="currentColor" /> Mulai menonton
                </Link>
                <button className="button button-primary" type="button" onClick={() => toggleSaved(selectedSeries.id)}>
                  {savedIds.includes(selectedSeries.id) ? <Check size={16} /> : <Bookmark size={16} />}
                  {savedIds.includes(selectedSeries.id) ? "Tersimpan di koleksi" : "Simpan ke koleksi"}
                </button>
                <button className="button button-glass" type="button" onClick={() => setSelectedSeries(null)}>Kembali ke daftar donghua</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
