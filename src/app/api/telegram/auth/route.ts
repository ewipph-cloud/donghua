import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const requestSchema = z.object({
  initData: z.string().min(1).max(8192),
});

const telegramUserSchema = z.object({
  id: z.number().int().positive().safe(),
  first_name: z.string(),
  username: z.string().optional(),
});

const maxAuthAgeSeconds = 60 * 60 * 24;
const allowedFutureClockSkewSeconds = 30;

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return Response.json({ error: "Autentikasi Telegram belum dikonfigurasi." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format data JSON tidak valid." }, { status: 400 });
  }

  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json({ error: "Data Telegram tidak valid." }, { status: 400 });
  }

  const params = new URLSearchParams(parsedBody.data.initData);
  const values = new Map<string, string>();
  for (const [key, value] of params) {
    if (values.has(key)) {
      return Response.json({ error: "Data Telegram tidak valid." }, { status: 401 });
    }
    values.set(key, value);
  }

  const receivedHash = values.get("hash");
  if (!receivedHash || !/^[\da-f]{64}$/i.test(receivedHash)) {
    return Response.json({ error: "Data Telegram tidak valid." }, { status: 401 });
  }

  const dataCheckString = [...values.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const suppliedHash = Buffer.from(receivedHash, "hex");

  if (!timingSafeEqual(expectedHash, suppliedHash)) {
    return Response.json({ error: "Data Telegram tidak valid." }, { status: 401 });
  }

  const authDate = Number(values.get("auth_date"));
  const currentTime = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(authDate) ||
    authDate > currentTime + allowedFutureClockSkewSeconds ||
    currentTime - authDate > maxAuthAgeSeconds
  ) {
    return Response.json({ error: "Sesi Telegram kedaluwarsa. Buka ulang Mini App." }, { status: 401 });
  }

  let userPayload: unknown;
  try {
    userPayload = JSON.parse(values.get("user") ?? "");
  } catch {
    return Response.json({ error: "Data pengguna Telegram tidak valid." }, { status: 401 });
  }

  const parsedUser = telegramUserSchema.safeParse(userPayload);
  if (!parsedUser.success) {
    return Response.json({ error: "Data pengguna Telegram tidak valid." }, { status: 401 });
  }

  return Response.json({
    user: {
      id: parsedUser.data.id,
      first_name: parsedUser.data.first_name,
      username: parsedUser.data.username ?? null,
    },
    auth_date: authDate,
  });
}
