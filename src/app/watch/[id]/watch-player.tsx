"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CirclePlay,
  Clapperboard,
  Maximize,
  Pause,
  Play,
  Settings2,
  Volume2,
} from "lucide-react";
import { imageUrl, type Series } from "@/lib/series";

export function WatchPlayer({
  title,
  episodes,
  databaseWarning,
}: Readonly<{ title: Series; episodes: number[]; databaseWarning: string }>) {
  const [selectedEpisode, setSelectedEpisode] = useState(episodes.at(-1) ?? 1);

  return (
    <main className="watch-shell">
      <header className="watch-topbar">
        <Link href="/" className="watch-back"><ArrowLeft size={17} /> <span>Kembali ke beranda</span></Link>
        <Link href="/" className="watch-mark"><span className="watch-mark-icon"><Clapperboard size={17} /></span><strong>DONGHUA<span>ID</span></strong></Link>
        <span className="watch-live"><i /> PLAYER PREVIEW</span>
      </header>

      <div className="watch-main">
        <div className="watch-breadcrumb"><Link href="/">Beranda</Link><ChevronRight size={13} /><span>{title.title}</span><ChevronRight size={13} /><strong>EP {selectedEpisode.toString().padStart(2, "0")}</strong></div>
        <div className="watch-layout">
          <section className="watch-primary">
            <div className="video-frame">
              <Image src={imageUrl(title.bannerImage ?? title.image, 1400)} alt="" fill sizes="(max-width: 900px) 100vw, 75vw" priority />
              <div className="video-shade" />
              <div className="video-unavailable">
                <span className="video-brand-mark"><Clapperboard size={23} /></span>
                <span className="video-status">PEMUTAR VIDEO</span>
                <h1>Sumber video<br />belum dihubungkan.</h1>
                <p>Halaman pemutar sudah siap. Hubungkan stream berizin untuk mulai menonton.</p>
                <button type="button" disabled aria-label="Pemutar menunggu sumber video"><Play size={19} fill="currentColor" /></button>
                <span className="video-episode-label">{title.title} <i /> Episode {selectedEpisode}</span>
              </div>
              <div className="video-controls" aria-label="Kontrol video">
                <button type="button" disabled aria-label="Putar"><Play size={16} fill="currentColor" /></button>
                <span className="video-progress"><i /></span>
                <span className="video-time">--:-- / --:--</span>
                <button type="button" disabled aria-label="Volume"><Volume2 size={17} /></button>
                <button type="button" disabled aria-label="Pengaturan"><Settings2 size={17} /></button>
                <button type="button" disabled aria-label="Layar penuh"><Maximize size={16} /></button>
              </div>
            </div>

            <div className="watch-title-row">
              <div>
                <div className="watch-tagline"><CirclePlay size={14} /> {title.genre.toUpperCase()} <i /> {title.status.toUpperCase()}</div>
                <h2>{title.title}<span>Episode {selectedEpisode}</span></h2>
                <p>{title.summary}</p>
              </div>
              <Link className="watch-detail-link" href="/#rilisan">Lihat katalog <ChevronRight size={14} /></Link>
            </div>
            <div className={`watch-note${databaseWarning ? " watch-note-warning" : ""}`}><span><Check size={14} /></span><p><strong>{databaseWarning ? "Katalog belum tersambung" : "Antarmuka pemutar tersedia"}</strong><small>{databaseWarning || "Sumber stream belum dikonfigurasi. Episode dan tautan video dapat diatur melalui panel admin."}</small></p></div>
          </section>

          <aside className="watch-episodes">
            <div className="episode-heading">
              <div><span>DAFTAR TAYANG</span><h2>Episode</h2></div>
              <span className="episode-count">{episodes.length}</span>
            </div>
            {episodes.length ? (
              <div className="episode-list">
                {episodes.slice().reverse().map((episodeNumber) => (
                  <button
                    type="button"
                    key={episodeNumber}
                    className={`episode-option${selectedEpisode === episodeNumber ? " episode-selected" : ""}`}
                    onClick={() => setSelectedEpisode(episodeNumber)}
                  >
                    <span className="episode-preview">
                      <Image src={imageUrl(title.image, 180)} alt="" fill sizes="72px" />
                      {selectedEpisode === episodeNumber && <span><Pause size={14} fill="currentColor" /></span>}
                    </span>
                    <span className="episode-option-copy"><strong>Episode {episodeNumber.toString().padStart(2, "0")}</strong><small>{selectedEpisode === episodeNumber ? "Dipilih" : title.title}</small></span>
                    {selectedEpisode === episodeNumber && <Check size={15} className="episode-check" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="episodes-empty"><Clapperboard size={21} /><strong>Belum ada episode</strong><span>Tambahkan episode dari panel admin.</span></div>
            )}
            <Link className="admin-manage-link" href="/admin">Kelola konten <ChevronRight size={14} /></Link>
          </aside>
        </div>
      </div>
      <footer className="watch-footer"><span>© 2026 Donghua ID</span><span>Streaming hanya tersedia untuk konten dengan sumber berizin.</span></footer>
    </main>
  );
}
