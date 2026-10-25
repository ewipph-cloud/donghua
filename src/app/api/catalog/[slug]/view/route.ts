import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { databaseErrorResponse } from "@/lib/supabase/http";

const slugSchema = z
  .string()
  .min(2)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Katalog database belum dikonfigurasi." }, { status: 503 });
  }

  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) {
    return Response.json({ error: "Slug konten tidak valid." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("increment_anime_content_views", {
    content_slug: slug,
  });

  if (error) {
    return databaseErrorResponse(error, "Jumlah tayangan tidak dapat diperbarui.");
  }

  if (!data) {
    return Response.json({ error: "Konten tidak ditemukan." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
