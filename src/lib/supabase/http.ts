type DatabaseError = {
  code?: string;
  message: string;
};

export function databaseErrorResponse(error: DatabaseError, message: string) {
  console.error(message, error);

  if (error.code === "PGRST205") {
    return Response.json(
      { error: "Tabel database belum tersedia. Jalankan supabase/schema.sql pada project Supabase." },
      { status: 503 },
    );
  }

  return Response.json({ error: message }, { status: 500 });
}
