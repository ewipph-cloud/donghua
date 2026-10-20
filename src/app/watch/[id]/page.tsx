import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { WatchPlayer } from "@/app/watch/[id]/watch-player";
import { series, type Series } from "@/lib/series";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type WatchPageProps = {
  params: Promise<{ id: string }>;
};

type WatchEpisode = {
  episodeNumber: number;
  streamUrl: string | null;
  streamUrlOkru: string | null;
  streamUrlDailymotion: string | null;
  streamUrlDailymotionAudio: string | null;
};

type WatchServer = {
  id: "other" | "okru" | "dailymotion";
  name: string;
  url: string;
  audioUrl?: string;
};

function getServers(
  streamUrl: string | null,
  streamUrlOkru: string | null,
  streamUrlDailymotion: string | null,
  streamUrlDailymotionAudio: string | null,
) {
  const servers: (WatchServer | null)[] = [
    streamUrl ? { id: "other" as const, name: "Server lain", url: streamUrl } : null,
    streamUrlOkru ? { id: "okru" as const, name: "OK.Ru", url: streamUrlOkru } : null,
    streamUrlDailymotion
      ? {
          id: "dailymotion" as const,
          name: "Dailymotion",
          url: streamUrlDailymotion,
          audioUrl: streamUrlDailymotionAudio ?? undefined,
        }
      : null,
  ];
  return servers.filter((server): server is WatchServer => server !== null);
}

export default function WatchPage({ params }: WatchPageProps) {
  return (
    <Suspense fallback={<main className="watch-loading">Memuat halaman tonton...</main>}>
      <WatchPageContent params={params} />
    </Suspense>
  );
}

async function WatchPageContent({ params }: WatchPageProps) {
  await connection();

  const { id } = await params;
  let selected = series.find((item) => item.id === id);
  let contentServers: WatchServer[] = [];
  let availableEpisodes: WatchEpisode[] = [];
  let databaseWarning = "";

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("anime_content")
      .select("id,slug,title,latest_episode,genre,rating,views,status,poster_url,banner_url,stream_url,stream_url_okru,stream_url_dailymotion,stream_url_dailymotion_audio,synopsis")
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
      const { data: episodeRows, error: episodeError } = await supabase
        .from("anime_episodes")
        .select("episode_number,stream_url,stream_url_okru,stream_url_dailymotion,stream_url_dailymotion_audio")
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
        data.stream_url_dailymotion_audio,
      );
      availableEpisodes = (episodeRows ?? [])
        .map((episode) => ({
          episodeNumber: episode.episode_number,
          streamUrl: episode.stream_url,
          streamUrlOkru: episode.stream_url_okru,
          streamUrlDailymotion: episode.stream_url_dailymotion,
          streamUrlDailymotionAudio: episode.stream_url_dailymotion_audio,
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
        streamUrlDailymotionAudio: null,
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
          streamUrlDailymotionAudio: null,
        }]
      : [];
  } else {
    episodes = Array.from({ length: Math.min(12, fallbackEpisode) }, (_, index) => ({
      episodeNumber: Math.max(1, fallbackEpisode - Math.min(12, fallbackEpisode) + index + 1),
      streamUrl: null,
      streamUrlOkru: null,
      streamUrlDailymotion: null,
      streamUrlDailymotionAudio: null,
    }));
  }

  return (
    <WatchPlayer
      title={selected}
      episodes={episodes}
      servers={contentServers}
      databaseWarning={databaseWarning}
    />
  );
}
