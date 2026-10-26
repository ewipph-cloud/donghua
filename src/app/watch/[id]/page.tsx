import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { WatchPlayer } from "@/app/watch/[id]/watch-player";
import { imageUrl, series, type Series } from "@/lib/series";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type WatchPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string | string[] }>;
};

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

function parseEpisodeNumber(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return undefined;
  const episodeNumber = Number(value);
  return episodeNumber > 0 ? episodeNumber : undefined;
}

export async function generateMetadata({ params, searchParams }: WatchPageProps): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let selected = series.find((item) => item.id === id);

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("anime_content")
      .select("slug,title,latest_episode,poster_url,banner_url,synopsis")
      .eq("slug", id)
      .eq("published", true)
      .maybeSingle();

    if (error && error.code !== "PGRST205") {
      console.error("Gagal memuat metadata berbagi halaman tontonan.", error);
    }

    if (data) {
      selected = {
        id: data.slug,
        title: data.title,
        episode: data.latest_episode,
        genre: "",
        rating: "",
        views: "",
        status: "Ongoing",
        image: data.poster_url ?? data.banner_url ?? "photo-1518709268805-4e9042af9f23",
        bannerImage: data.banner_url ?? undefined,
        color: "#373f9c",
        summary: data.synopsis,
      };
    }
  }

  if (!selected) {
    return {
      title: "Donghua ID — Jelajahi Dunia Lain",
      description: "Tonton donghua favoritmu di Donghua ID.",
    };
  }

  const episodeNumber =
    parseEpisodeNumber(query.episode) ??
    Number(selected.episode.match(/\d+/)?.[0] ?? 1);
  const episodeTitle = `${selected.title} Episode ${episodeNumber}`;
  const description = selected.summary || `Tonton ${episodeTitle} di Donghua ID.`;
  const image = imageUrl(selected.bannerImage ?? selected.image, 1200);

  return {
    title: `${episodeTitle} | Donghua ID`,
    description,
    openGraph: {
      title: episodeTitle,
      description,
      type: "website",
      siteName: "Donghua ID",
      images: [{ url: image, width: 1200, height: 630, alt: episodeTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: episodeTitle,
      description,
      images: [image],
    },
  };
}

function getServers(
  streamUrl: string | null,
  streamUrlOkru: string | null,
  streamUrlDailymotion: string | null,
) {
  const servers: (WatchServer | null)[] = [
    streamUrl ? { id: "other" as const, name: "Server lain", url: streamUrl } : null,
    streamUrlOkru ? { id: "okru" as const, name: "OK.Ru", url: streamUrlOkru } : null,
    streamUrlDailymotion
      ? {
          id: "dailymotion" as const,
          name: "Dailymotion",
          url: streamUrlDailymotion,
        }
      : null,
  ];
  return servers.filter((server): server is WatchServer => server !== null);
}

export default function WatchPage({ params, searchParams }: WatchPageProps) {
  return (
    <Suspense fallback={<main className="watch-loading">Memuat halaman tonton...</main>}>
      <WatchPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchPageContent({ params, searchParams }: WatchPageProps) {
  await connection();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedEpisode = parseEpisodeNumber(query.episode);
  let selected = series.find((item) => item.id === id);
  let contentServers: WatchServer[] = [];
  let availableEpisodes: WatchEpisode[] = [];
  let databaseWarning = "";
  let trackViews = false;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("anime_content")
      .select("id,slug,title,latest_episode,genre,rating,views,status,poster_url,banner_url,stream_url,stream_url_okru,stream_url_dailymotion,synopsis")
      .eq("slug", id)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST205" && selected) {
        databaseWarning = "Schema database belum diterapkan. Halaman ini memakai metadata demo.";
      } else {
        console.error("Gagal memuat halaman tonton.", error);
        throw new Error("Konten tidak dapat dimuat.");
      }
    }

    if (data) {
      trackViews = true;
      const { data: episodeRows, error: episodeError } = await supabase
        .from("anime_episodes")
        .select("episode_number,stream_url,stream_url_okru,stream_url_dailymotion")
        .eq("content_id", data.id)
        .eq("published", true)
        .order("episode_number", { ascending: false })
        .limit(24);

      if (episodeError && episodeError.code === "PGRST205") {
        databaseWarning = "Schema database belum diterapkan. Halaman ini memakai metadata demo.";
      } else if (episodeError) {
        console.error("Gagal memuat daftar episode.", episodeError);
        throw new Error("Daftar episode tidak dapat dimuat.");
      }

      selected = {
        id: data.slug,
        title: data.title,
        episode: data.latest_episode,
        genre: data.genre,
        rating: String(data.rating),
        views: `${Number(data.views).toLocaleString("id-ID")} tayangan`,
        viewCount: Number(data.views),
        status: data.status === "completed" ? "Tamat" : data.status === "upcoming" ? "Segera hadir" : "Ongoing",
        image: data.poster_url ?? data.banner_url ?? "photo-1518709268805-4e9042af9f23",
        bannerImage: data.banner_url ?? undefined,
        featured: false,
        color: "#373f9c",
        summary: data.synopsis,
      } satisfies Series;
      contentServers = getServers(
        data.stream_url,
        data.stream_url_okru,
        data.stream_url_dailymotion,
      );
      availableEpisodes = (episodeRows ?? [])
        .map((episode) => ({
          episodeNumber: episode.episode_number,
          streamUrl: episode.stream_url,
          streamUrlOkru: episode.stream_url_okru,
          streamUrlDailymotion: episode.stream_url_dailymotion,
        }))
        .reverse();
    } else if (!databaseWarning) {
      notFound();
    }
  }

  if (!selected) notFound();

  const metadataEpisode = Number(selected.episode.match(/\d+/)?.[0] ?? 0);
  const fallbackEpisode = metadataEpisode || 1;
  let episodes: WatchEpisode[];

  if (availableEpisodes.length) {
    episodes = [...availableEpisodes];
    if (metadataEpisode && !episodes.some((episode) => episode.episodeNumber === metadataEpisode)) {
      episodes.push({
        episodeNumber: metadataEpisode,
        streamUrl: null,
        streamUrlOkru: null,
        streamUrlDailymotion: null,
      });
    }
    episodes.sort((left, right) => left.episodeNumber - right.episodeNumber);
  } else if (isSupabaseConfigured() && !databaseWarning) {
    episodes = metadataEpisode
      ? [{
          episodeNumber: metadataEpisode,
          streamUrl: null,
          streamUrlOkru: null,
          streamUrlDailymotion: null,
        }]
      : [];
  } else {
    episodes = Array.from({ length: Math.min(12, fallbackEpisode) }, (_, index) => ({
      episodeNumber: Math.max(1, fallbackEpisode - Math.min(12, fallbackEpisode) + index + 1),
      streamUrl: null,
      streamUrlOkru: null,
      streamUrlDailymotion: null,
    }));
  }

  return (
    <WatchPlayer
      title={selected}
      episodes={episodes}
      servers={contentServers}
      databaseWarning={databaseWarning}
      trackViews={trackViews}
      initialEpisode={requestedEpisode}
    />
  );
}
