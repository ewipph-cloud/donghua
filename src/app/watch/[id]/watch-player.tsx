"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CirclePlay,
  Clapperboard,
  Pause,
  Play,
} from "lucide-react";
import { imageUrl, type Series } from "@/lib/series";

type WatchEpisode = {
  episodeNumber: number;
  streamUrl: string | null;
  streamUrlOkru: string | null;
  streamUrlDailymotion: string | null;
};

type WatchServer = {
  id: "other" | "okru" | "dailymotion";
  name: string;
  url: string;
};

function getPlaybackSource(streamUrl: string) {
  const url = new URL(streamUrl);
  const hostname = url.hostname.toLowerCase();
  const youtubeId =
    hostname === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : hostname === "youtube.com" || hostname.endsWith(".youtube.com")
        ? url.searchParams.get("v") ??
          url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
        : null;

  if (youtubeId) {
    return {
      type: "embed" as const,
      url: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`,
    };
  }

  if (hostname === "ok.ru" || hostname.endsWith(".ok.ru")) {
    const videoId = url.pathname.match(/^\/video\/([^/?]+)/)?.[1];
    if (videoId) {
      return { type: "embed" as const, url: `https://ok.ru/videoembed/${encodeURIComponent(videoId)}` };
    }
  }

  if (hostname === "dai.ly" || hostname === "www.dailymotion.com" || hostname === "dailymotion.com") {
    const videoId = hostname === "dai.ly"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.pathname.match(/^\/video\/([^/?]+)/)?.[1]?.split("_")[0];
    if (videoId) {
      return {
        type: "embed" as const,
        url: `https://www.dailymotion.com/embed/video/${encodeURIComponent(videoId)}`,
      };
    }
  }

  if (url.pathname.toLowerCase().endsWith(".m3u8")) {
    return { type: "hls" as const, url: streamUrl };
  }

  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
    return { type: "video" as const, url: streamUrl };
  }

  if (/\/(?:stream|video|raw|download)\/?$/i.test(url.pathname)) {
    return { type: "video" as const, url: streamUrl };
  }

  return { type: "embed" as const, url: streamUrl };
}

function VideoPlayback({
  streamUrl,
  poster,
  title,
}: Readonly<{ streamUrl: string; poster: string; title: string }>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState(false);
  const source = getPlaybackSource(streamUrl);
  const isDailymotionCdn = (() => {
    const hostname = new URL(streamUrl).hostname.toLowerCase();
    return hostname === "dmcdn.net" || hostname.endsWith(".dmcdn.net");
  })();
  const playbackUrl = isDailymotionCdn
    ? `/api/video-proxy?url=${encodeURIComponent(streamUrl)}`
    : streamUrl;

  useEffect(() => {
    if (source.type !== "hls") return;
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    let hls: import("hls.js").default | null = null;
    let nativeFallbackAttempted = false;

    async function attachStream(videoElement: HTMLVideoElement) {
      try {
        if (
          isDailymotionCdn &&
          videoElement.canPlayType("application/vnd.apple.mpegurl")
        ) {
          nativeFallbackAttempted = true;
          videoElement.src = playbackUrl;
          return;
        }

        const { default: Hls } = await import("hls.js");
        if (disposed) return;

        if (Hls.isSupported()) {
          hls = new Hls();
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              hls?.destroy();
              hls = null;
              if (
                !nativeFallbackAttempted &&
                isDailymotionCdn &&
                videoElement.canPlayType("application/vnd.apple.mpegurl")
              ) {
                nativeFallbackAttempted = true;
                videoElement.src = playbackUrl;
              } else {
                setPlaybackError(true);
              }
            }
          });
          hls.loadSource(playbackUrl);
          hls.attachMedia(videoElement);
        } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
          videoElement.src = streamUrl;
        } else {
          setPlaybackError(true);
        }
      } catch {
        if (!disposed) setPlaybackError(true);
      }
    }

    void attachStream(video);
    return () => {
      disposed = true;
      hls?.destroy();
    };
  }, [isDailymotionCdn, playbackUrl, source.type, streamUrl]);

  if (source.type === "embed") {
    return (
      <iframe
        key={source.url}
        src={source.url}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={title}
        onError={() => setPlaybackError(true)}
      >
        {source.type === "video" && <source src={source.url} />}
      </video>
      {playbackError && (
        <div className="video-playback-error" role="alert">
          <span className="video-playback-error-copy">
            <strong>Video tidak dapat diputar.</strong>
            {isDailymotionCdn && (
              <span>Situs tidak dapat memuat stream Dailymotion dari CDN. Periksa apakah URL masih berlaku dan dapat diakses server.</span>
            )}
          </span>
          {!isDailymotionCdn && <a href={streamUrl} target="_blank" rel="noreferrer">Buka sumber video</a>}
        </div>
      )}
    </>
  );
}

export function WatchPlayer({
  title,
  episodes,
  servers,
  databaseWarning,
}: Readonly<{
  title: Series;
  episodes: WatchEpisode[];
  servers: WatchServer[];
  databaseWarning: string;
}>) {
  const latestMetadataEpisode = Number(title.episode.match(/\d+/)?.[0] ?? 1);
  const latestAvailableEpisode = episodes.at(-1)?.episodeNumber ?? 1;
  const [selectedEpisode, setSelectedEpisode] = useState(
    Math.max(latestMetadataEpisode, latestAvailableEpisode),
  );
  const episode = episodes.find((item) => item.episodeNumber === selectedEpisode);
  const episodeServers = episode
    ? [
        episode.streamUrl ? { id: "other" as const, name: "Server lain", url: episode.streamUrl } : null,
        episode.streamUrlOkru
          ? { id: "okru" as const, name: "OK.Ru", url: episode.streamUrlOkru }
          : null,
        episode.streamUrlDailymotion
          ? { id: "dailymotion" as const, name: "Dailymotion", url: episode.streamUrlDailymotion }
          : null,
      ].filter((server): server is WatchServer => server !== null)
    : [];
  const availableServers = episodeServers.length ? episodeServers : servers;
  const [selectedServerId, setSelectedServerId] = useState<WatchServer["id"] | null>(null);
  const selectedServer = availableServers.find((server) => server.id === selectedServerId) ?? availableServers[0];
  const poster = imageUrl(title.bannerImage ?? title.image, 1400);

  return (
    <main className="watch-shell">
      <header className="watch-topbar">
        <Link href="/" className="watch-back"><ArrowLeft size={17} /> <span>Kembali ke beranda</span></Link>
        <Link href="/" className="watch-mark"><span className="watch-mark-icon"><Clapperboard size={17} /></span><strong>DONGHUA<span>ID</span></strong></Link>
        <span className="watch-live"><i /> {selectedServer ? "STREAMING AKTIF" : "PLAYER PREVIEW"}</span>
      </header>

      <div className="watch-main">
        <div className="watch-breadcrumb"><Link href="/">Beranda</Link><ChevronRight size={13} /><span>{title.title}</span><ChevronRight size={13} /><strong>EP {selectedEpisode.toString().padStart(2, "0")}</strong></div>
        <div className="watch-layout">
          <section className="watch-primary">
            <div className="video-frame">
              {selectedServer ? (
                <VideoPlayback
                  key={`${selectedEpisode}:${selectedServer.id}:${selectedServer.url}`}
                  streamUrl={selectedServer.url}
                  poster={poster}
                  title={`${title.title} Episode ${selectedEpisode}`}
                />
              ) : (
                <>
                  <Image src={poster} alt="" fill sizes="(max-width: 900px) 100vw, 75vw" priority />
                  <div className="video-shade" />
                  <div className="video-unavailable">
                    <span className="video-brand-mark"><Clapperboard size={23} /></span>
                    <span className="video-status">PEMUTAR VIDEO</span>
                    <h1>Sumber video<br />belum dihubungkan.</h1>
                    <p>Tambahkan URL MP4, WebM, HLS, atau embed di panel admin.</p>
                    <button type="button" disabled aria-label="Pemutar menunggu sumber video"><Play size={19} fill="currentColor" /></button>
                    <span className="video-episode-label">{title.title} <i /> Episode {selectedEpisode}</span>
                  </div>
                </>
              )}
            </div>
            {availableServers.length > 0 && (
              <div className="video-server-list" role="group" aria-label="Pilih server video">
                <span className="video-server-label">SERVER VIDEO</span>
                {availableServers.map((server) => (
                  <button
                    key={server.id}
                    type="button"
                    className={`video-server-option${selectedServer?.id === server.id ? " video-server-selected" : ""}`}
                    aria-pressed={selectedServer?.id === server.id}
                    onClick={() => setSelectedServerId(server.id)}
                  >
                    {server.name}
                  </button>
                ))}
              </div>
            )}

            <div className="watch-title-row">
              <div>
                <div className="watch-tagline"><CirclePlay size={14} /> {title.genre.toUpperCase()} <i /> {title.status.toUpperCase()}</div>
                <h2>{title.title}<span>Episode {selectedEpisode}</span></h2>
                <p>{title.summary}</p>
              </div>
              <Link className="watch-detail-link" href="/#rilisan">Lihat katalog <ChevronRight size={14} /></Link>
            </div>
            <div className={`watch-note${databaseWarning ? " watch-note-warning" : ""}`}><span><Check size={14} /></span><p><strong>{databaseWarning ? "Katalog belum tersambung" : selectedServer ? "Sumber video tersedia" : "Menunggu sumber video"}</strong><small>{databaseWarning || (selectedServer ? `Stream aktif melalui server ${selectedServer.name}.` : "Tambahkan URL server di panel admin untuk mulai menonton.")}</small></p></div>
          </section>

          <aside className="watch-episodes">
            <div className="episode-heading">
              <div><span>DAFTAR TAYANG</span><h2>Episode</h2></div>
              <span className="episode-count">{episodes.length}</span>
            </div>
            {episodes.length ? (
              <div className="episode-list">
                {episodes.slice().reverse().map(({ episodeNumber }) => (
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
