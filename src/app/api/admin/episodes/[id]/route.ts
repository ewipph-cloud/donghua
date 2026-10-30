import { episodeSchema } from "@/lib/admin/content-schema";
import { getAdminSession } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { databaseErrorResponse } from "@/lib/supabase/http";
import { notifyEpisodeSubscribers } from "@/lib/telegram/bot";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return Response.json({ error: "ID episode tidak valid." }, { status: 400 });
  }

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

  const { data: previous, error: previousError } = await session.supabase
    .from("anime_episodes")
    .select("published")
    .eq("id", id)
    .maybeSingle();

  if (previousError) {
    return databaseErrorResponse(previousError, "Episode tidak dapat diperbarui.");
  }
  if (!previous) return Response.json({ error: "Episode tidak ditemukan." }, { status: 404 });

  const { data, error } = await session.supabase
    .from("anime_episodes")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return databaseErrorResponse(error, "Episode tidak dapat diperbarui.");
  }
  if (!data) return Response.json({ error: "Episode tidak ditemukan." }, { status: 404 });

  let notification: { subscribers: number; sent: number; failed: number; skipped?: boolean } | undefined;
  if (!previous.published && data.published) {
    try {
      notification = await notifyEpisodeSubscribers({
        contentId: data.content_id,
        episodeNumber: data.episode_number,
        episodeTitle: data.title,
      });
    } catch (notifyError) {
      console.error("Episode diperbarui, tetapi notifikasi Telegram gagal diproses.", notifyError);
      notification = { subscribers: 0, sent: 0, failed: 0, skipped: true };
    }
  }

  return Response.json({ ...data, ...(notification ? { notification } : {}) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return Response.json({ error: "ID episode tidak valid." }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from("anime_episodes")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return databaseErrorResponse(error, "Episode tidak dapat dihapus.");
  }
  if (!data) return Response.json({ error: "Episode tidak ditemukan." }, { status: 404 });
  return new Response(null, { status: 204 });
}
