import { createClient } from "@supabase/supabase-js";

type EpisodeNotification = {
  subscribers: number;
  sent: number;
  failed: number;
  skipped?: boolean;
};

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
};

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.");
  return token;
}

function createTelegramAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server credentials belum dikonfigurasi.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: { inline_keyboard: Array<Array<Record<string, string>>> },
) {
  const response = await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const result = await response.json() as TelegramApiResponse;
  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? `Telegram sendMessage gagal (${response.status}).`);
  }
}

export async function handleTelegramSubscription(
  telegramUserId: number,
  firstName: string,
  username: string | undefined,
  subscribe: boolean,
) {
  const supabase = createTelegramAdminClient();
  const { error } = await supabase
    .from("telegram_notification_subscriptions")
    .upsert({
      telegram_user_id: String(telegramUserId),
      first_name: firstName.slice(0, 100),
      username: username?.slice(0, 100) ?? null,
      enabled: subscribe,
      updated_at: new Date().toISOString(),
    }, { onConflict: "telegram_user_id" });

  if (error) throw new Error(`Status langganan Telegram gagal disimpan: ${error.message}`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function notifyEpisodeSubscribers(input: {
  contentId: string;
  episodeNumber: number;
  episodeTitle: string;
}): Promise<EpisodeNotification> {
  const supabase = createTelegramAdminClient();
  const { data: content, error: contentError } = await supabase
    .from("anime_content")
    .select("title,slug,published")
    .eq("id", input.contentId)
    .maybeSingle();

  if (contentError) throw new Error(`Data judul notifikasi gagal dimuat: ${contentError.message}`);
  if (!content?.published) return { subscribers: 0, sent: 0, failed: 0, skipped: true };

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("telegram_notification_subscriptions")
    .select("telegram_user_id")
    .eq("enabled", true);

  if (subscriptionsError) {
    throw new Error(`Daftar pelanggan notifikasi gagal dimuat: ${subscriptionsError.message}`);
  }
  if (!subscriptions?.length) return { subscribers: 0, sent: 0, failed: 0 };

  const botUsername = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "anime_ID_bot").replace(/^@/, "");
  const startParam = `watch_${content.slug}_ep_${input.episodeNumber}`;
  const miniAppUrl = `https://t.me/${botUsername}?startapp=${encodeURIComponent(startParam)}`;
  const episodeLabel = input.episodeTitle.trim()
    ? ` — ${escapeHtml(input.episodeTitle.trim().slice(0, 120))}`
    : "";
  const text =
    `🎬 <b>${escapeHtml(content.title)}</b>\n` +
    `Episode ${input.episodeNumber}${episodeLabel} sudah tayang.`;
  let sent = 0;
  let failed = 0;

  for (let offset = 0; offset < subscriptions.length; offset += 25) {
    const batch = subscriptions.slice(offset, offset + 25);
    const results = await Promise.allSettled(batch.map(({ telegram_user_id }) =>
      sendTelegramMessage(
        telegram_user_id,
        text,
        { inline_keyboard: [[{ text: "Tonton episode", url: miniAppUrl }]] },
      ),
    ));

    for (const result of results) {
      if (result.status === "fulfilled") {
        sent += 1;
      } else {
        failed += 1;
        console.error("Notifikasi episode Telegram gagal dikirim.", result.reason);
      }
    }

    if (offset + 25 < subscriptions.length) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return { subscribers: subscriptions.length, sent, failed };
}
