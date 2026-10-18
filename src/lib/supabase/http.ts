type DatabaseError = {
  code?: string;
  message: string;
};

export function databaseErrorResponse(
  error: DatabaseError,
  message: string,
  constraintMessages: Readonly<Record<string, string>> = {},
) {
  if (error.code === "PGRST205") {
    return Response.json(
      { error: "Tabel database belum tersedia. Jalankan supabase/schema.sql pada project Supabase." },
      { status: 503 },
    );
  }

  if (error.code === "23505") {
    const conflict = Object.entries(constraintMessages).find(([constraint]) =>
      error.message.includes(constraint),
    );
    if (conflict) {
      return Response.json({ error: conflict[1] }, { status: 409 });
    }
  }

  console.error(message, error);
  return Response.json({ error: message }, { status: 500 });
}
