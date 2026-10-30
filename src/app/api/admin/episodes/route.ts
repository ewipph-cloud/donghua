import { episodeSchema } from "@/lib/admin/content-schema";
import { getAdminSession } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { databaseErrorResponse } from "@/lib/supabase/http";
import { notifyEpisodeSubscribers } from "@/lib/telegram/bot";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  const { data, error } = await session.supabase
    .from("anime_episodes")
    .select("*, anime_content(title)")
    .order("updated_at", { ascending: false });

  if (error) {
    return databaseErrorResponse(error, "Episode tidak dapat dimuat dari database.");
  }

  return Response.json(
    data.map((episode) => ({
      ...episode,
      content_title: episode.anime_content?.title ?? "Konten",
      anime_content: undefined,
    })),
  );
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format data JSON tidak valid." }, { status: 400 });
  }

  const parsed = episodeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Periksa kembali data episode.", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { data, error } = await session.supabase
    .from("anime_episodes")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) {
    return databaseErrorResponse(error, "Episode tidak dapat disimpan.");
  }

  let notification: { subscribers: number; sent: number; failed: number; skipped?: boolean } | undefined;
  if (data.published) {
    try {
      notification = await notifyEpisodeSubscribers({
        contentId: data.content_id,
        episodeNumber: data.episode_number,
        episodeTitle: data.title,
      });
    } catch (notifyError) {
      console.error("Episode tersimpan, tetapi notifikasi Telegram gagal diproses.", notifyError);
      notification = { subscribers: 0, sent: 0, failed: 0, skipped: true };
    }
  }

  return Response.json({ ...data, ...(notification ? { notification } : {}) }, { status: 201 });
}
