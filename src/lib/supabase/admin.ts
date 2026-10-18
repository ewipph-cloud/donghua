import { createSupabaseServerClient } from "./server";

export async function getAdminSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError?.name === "AuthSessionMissingError") return null;
  if (userError) {
    throw new Error(`Sesi admin tidak dapat diverifikasi: ${userError.message}`);
  }
  if (!user) return null;

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    throw new Error(`Hak akses admin tidak dapat diverifikasi: ${adminError.message}`);
  }

  return admin ? { supabase, user } : null;
}
