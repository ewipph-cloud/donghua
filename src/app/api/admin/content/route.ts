import { contentSchema } from "@/lib/admin/content-schema";
import { getAdminSession } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { databaseErrorResponse } from "@/lib/supabase/http";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  const search = new URL(request.url).searchParams.get("q")?.trim();
  let query = session.supabase
    .from("anime_content")
    .select("*")
    .order("updated_at", { ascending: false });

  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) {
    return databaseErrorResponse(error, "Konten tidak dapat dimuat dari database.");
  }

  return Response.json(data);
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

  const parsed = contentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Periksa kembali data konten.", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { data, error } = await session.supabase
    .from("anime_content")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) {
    return databaseErrorResponse(error, "Konten tidak dapat disimpan.");
  }

  return Response.json(data, { status: 201 });
}
