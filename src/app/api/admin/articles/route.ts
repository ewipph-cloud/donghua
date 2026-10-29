import { articleSchema } from "@/lib/admin/article-schema";
import { getAdminSession } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { databaseErrorResponse } from "@/lib/supabase/http";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  const { data, error } = await session.supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return databaseErrorResponse(error, "Artikel tidak dapat dimuat dari database.");
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

  const parsed = articleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Periksa kembali data artikel.", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { data, error } = await session.supabase
    .from("articles")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) {
    return databaseErrorResponse(error, "Artikel tidak dapat disimpan.", {
      articles_slug_key: "Slug ini sudah digunakan. Pilih slug yang berbeda.",
    });
  }

  return Response.json(data, { status: 201 });
}
