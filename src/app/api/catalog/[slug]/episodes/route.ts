import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { databaseErrorResponse } from "@/lib/supabase/http";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  const { slug } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: content, error: contentError } = await supabase
    .from("anime_content")
    .select("id")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (contentError) {
    return databaseErrorResponse(contentError, "Judul tidak dapat dimuat.");
  }
  if (!content) return Response.json({ error: "Judul tidak ditemukan." }, { status: 404 });

  const { data, error } = await supabase
    .from("anime_episodes")
    .select("id,episode_number,title,published")
    .eq("content_id", content.id)
    .eq("published", true)
    .order("episode_number", { ascending: true });

  if (error) {
    return databaseErrorResponse(error, "Daftar episode tidak dapat dimuat.");
  }

  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
