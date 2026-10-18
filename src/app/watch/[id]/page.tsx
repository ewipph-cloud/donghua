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
};

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
  let contentStreamUrl: string | null = null;
  let availableEpisodes: WatchEpisode[] = [];
  let databaseWarning = "";

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("anime_content")
      .select("id,slug,title,latest_episode,genre,rating,views,status,poster_url,banner_url,stream_url,synopsis")
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
        .select("episode_number,stream_url")
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
      contentStreamUrl = data.stream_url;
      availableEpisodes = (episodeRows ?? [])
        .map((episode) => ({
          episodeNumber: episode.episode_number,
          streamUrl: episode.stream_url,
        }))
        .reverse();
    } else if (!databaseWarning) {
      notFound();
    }
  }

  if (!selected) notFound();

  const fallbackEpisode = Number(selected.episode.match(/\d+/)?.[0] ?? 1);
  const episodes = availableEpisodes.length
    ? availableEpisodes
    : isSupabaseConfigured() && !databaseWarning
      ? []
      : Array.from({ length: Math.min(12, fallbackEpisode) }, (_, index) => ({
          episodeNumber: Math.max(1, fallbackEpisode - Math.min(12, fallbackEpisode) + index + 1),
          streamUrl: null,
        }));

  return (
    <WatchPlayer
      title={selected}
      episodes={episodes}
      streamUrl={contentStreamUrl}
      databaseWarning={databaseWarning}
    />
  );
}
