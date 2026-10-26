import { getAdminSession } from "@/lib/supabase/admin";

const MAX_PAGE_SIZE = 1024 * 1024;
const PLAYER_URL =
  /https?:\/\/(?:geo\.dailymotion\.com\/player\/[^"'<>\s]+|player\.nunadrama\.sbs\/index\.php\?[^"'<>\s]+)/gi;
const BASE64_VALUE = /\bvalue=["']([a-z\d+/]{80,4096}={0,2})["']/gi;
const VIDEO_ID = /^[a-z\d]{3,30}$/i;

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

function findDailymotionVideoId(html: string) {
  const markups = [html];
  let decodedValues = 0;

  for (const match of html.matchAll(BASE64_VALUE)) {
    if (decodedValues >= 40) break;
    decodedValues++;
    markups.push(Buffer.from(match[1], "base64").toString("utf8"));
  }

  for (const markup of markups) {
    for (const match of markup.matchAll(PLAYER_URL)) {
      try {
        const playerUrl = new URL(match[0].replaceAll("&amp;", "&"));
        const videoId = playerUrl.searchParams.get("video") ?? "";
        if (VIDEO_ID.test(videoId)) return videoId;
      } catch {
        continue;
      }
    }
  }

  return "";
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

  const hostname = sourceUrl.hostname.replace(/^www\./, "");
  const isCa3dEpisode =
    hostname === "ca3d.site" && /^\/watch\/\d+\/\d+\/?$/.test(sourceUrl.pathname);
  const isAnichinEpisode =
    (hostname === "anichin.moe" || hostname === "anichin.care") &&
    /^\/[a-z0-9-]+\/?$/i.test(sourceUrl.pathname);

  if (
    sourceUrl.protocol !== "https:" ||
    (!isCa3dEpisode && !isAnichinEpisode) ||
    sourceUrl.port ||
    sourceUrl.username ||
    sourceUrl.password
  ) {
    return Response.json(
      { error: "Gunakan tautan episode ca3d.site atau Anichin yang valid." },
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
    return Response.json({ error: "Halaman sumber tidak dapat diakses." }, { status: 502 });
  }

  if (!response.ok || response.status >= 300) {
    return Response.json(
      { error: `Halaman sumber gagal dimuat (${response.status}).` },
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

  const videoId = findDailymotionVideoId(html);
  if (!videoId) {
    return Response.json(
      { error: "ID Dailymotion tidak ditemukan pada halaman tersebut." },
      { status: 404 },
    );
  }

  return Response.json({ videoId });
}
