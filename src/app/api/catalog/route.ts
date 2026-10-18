import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { databaseErrorResponse } from "@/lib/supabase/http";

const genreColors: Record<string, string> = {
  aksi: "#5c3430",
  fantasi: "#6e275d",
  petualangan: "#28747b",
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Katalog database belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("anime_content")
    .select("slug,title,latest_episode,genre,rating,views,status,poster_url,banner_url,synopsis,featured")
    .eq("published", true)
    .order("featured", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return databaseErrorResponse(error, "Katalog tidak dapat dimuat.");
  }

  const catalog = data.map((item) => ({
    id: item.slug,
    title: item.title,
    episode: item.latest_episode,
    genre: item.genre,
    rating: String(item.rating),
    views: `${Number(item.views).toLocaleString("id-ID")} tayangan`,
    viewCount: Number(item.views),
    status:
      item.status === "completed"
        ? "Tamat" as const
        : item.status === "upcoming"
          ? "Segera hadir" as const
          : "Ongoing" as const,
    image: item.poster_url ?? item.banner_url ?? "photo-1518709268805-4e9042af9f23",
    bannerImage: item.banner_url ?? undefined,
    featured: item.featured,
    color: genreColors[item.genre.toLocaleLowerCase("id")] ?? "#373f9c",
    summary: item.synopsis,
  }));

  return Response.json(catalog, {
    headers: { "Cache-Control": "no-store" },
  });
}
