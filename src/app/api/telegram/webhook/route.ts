import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { handleTelegramSubscription, sendTelegramMessage } from "@/lib/telegram/bot";

const webhookUpdateSchema = z.object({
  message: z.object({
    text: z.string().optional(),
    from: z.object({
      id: z.number().int().positive().safe(),
      first_name: z.string().max(100),
      username: z.string().max(100).optional(),
    }),
    chat: z.object({
      id: z.number().int().positive().safe(),
      type: z.string(),
    }),
  }).optional(),
});

function validWebhookSecret(received: string | null, expected: string) {
  if (!received) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    return Response.json({ error: "Webhook Telegram belum dikonfigurasi." }, { status: 503 });
  }
  if (!validWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"), secret)) {
    return Response.json({ error: "Akses webhook tidak valid." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Payload webhook tidak valid." }, { status: 400 });
  }

  const parsed = webhookUpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: true });

  const message = parsed.data.message;
  if (!message?.text || message.chat.type !== "private" || message.chat.id !== message.from.id) {
    return Response.json({ ok: true });
  }

  const command = message.text.trim().split(/\s+/, 1)[0].split("@", 1)[0].toLowerCase();
  try {
    if (command === "/start" || command === "/subscribe") {
      await handleTelegramSubscription(
        message.from.id,
        message.from.first_name,
        message.from.username,
        true,
      );

      const webAppUrl = process.env.TELEGRAM_WEB_APP_URL;
      await sendTelegramMessage(
        message.chat.id,
        "✅ Notifikasi episode baru aktif. Kirim /stop kapan saja untuk berhenti.",
        webAppUrl
          ? { inline_keyboard: [[{ text: "Buka Donghua ID", web_app: { url: webAppUrl } }]] }
          : undefined,
      );
    } else if (command === "/stop" || command === "/unsubscribe") {
      await handleTelegramSubscription(
        message.from.id,
        message.from.first_name,
        message.from.username,
        false,
      );
      await sendTelegramMessage(message.chat.id, "Notifikasi episode baru sudah dihentikan. Kirim /start untuk berlangganan lagi.");
    } else if (command === "/help") {
      await sendTelegramMessage(
        message.chat.id,
        "Gunakan /start untuk berlangganan notifikasi episode baru, atau /stop untuk berhenti.",
      );
    }
  } catch (error) {
    console.error("Webhook bot Telegram gagal memproses pesan.", error);
    return Response.json({ error: "Pesan Telegram tidak dapat diproses." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
