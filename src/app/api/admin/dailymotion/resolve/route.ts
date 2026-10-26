import { getDailymotionVideoId } from "@/lib/dailymotion";
import { getAdminSession } from "@/lib/supabase/admin";

const MAX_PAGE_SIZE = 1024 * 1024;
const DAILYMOTION_PLAYER_URL =
  /https?:\/\/geo\.dailymotion\.com\/player\/[^"'<>\s]+/i;

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_PAGE_SIZE) {
        await reader.cancel();
        throw new Error("Halaman sumber terlalu besar.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format data JSON tidak valid." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("url" in body) ||
    typeof body.url !== "string" ||
    body.url.length > 2048
  ) {
    return Response.json({ error: "Masukkan URL halaman sumber." }, { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(body.url);
  } catch {
    return Response.json({ error: "URL halaman sumber tidak valid." }, { status: 400 });
  }

  if (
    sourceUrl.protocol !== "https:" ||
    sourceUrl.hostname !== "ca3d.site" ||
    sourceUrl.port ||
    sourceUrl.username ||
    sourceUrl.password ||
    !/^\/watch\/\d+\/\d+\/?$/.test(sourceUrl.pathname)
  ) {
    return Response.json(
      { error: "Gunakan tautan episode ca3d.site dengan format /watch/ID/episode." },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      headers: { Accept: "text/html" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return Response.json({ error: "Halaman ca3d.site tidak dapat diakses." }, { status: 502 });
  }

  if (!response.ok || response.status >= 300) {
    return Response.json(
      { error: `Halaman ca3d.site gagal dimuat (${response.status}).` },
      { status: 502 },
    );
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PAGE_SIZE) {
    return Response.json({ error: "Halaman sumber terlalu besar." }, { status: 502 });
  }

  let html: string;
  try {
    html = await readLimitedText(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Isi halaman gagal dibaca." },
      { status: 502 },
    );
  }

  const playerUrl = html.match(DAILYMOTION_PLAYER_URL)?.[0]?.replaceAll("&amp;", "&");
  const videoId = playerUrl ? getDailymotionVideoId(playerUrl) : "";
  if (!videoId) {
    return Response.json(
      { error: "ID Dailymotion tidak ditemukan pada halaman tersebut." },
      { status: 404 },
    );
  }

  return Response.json({ videoId });
}
