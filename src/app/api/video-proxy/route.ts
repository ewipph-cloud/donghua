const MAX_PLAYLIST_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;

function isDailymotionUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === "443") &&
    (hostname === "dmcdn.net" || hostname.endsWith(".dmcdn.net"))
  );
}

async function fetchDailymotion(
  url: URL,
  request: Request,
  redirects = 0,
): Promise<{ response: Response; finalUrl: URL }> {
  const headers = new Headers({
    Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, video/*, */*",
  });
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  const response = await fetch(url, {
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: request.signal,
  });

  if (response.status < 300 || response.status >= 400) {
    return { response, finalUrl: url };
  }

  const location = response.headers.get("location");
  await response.body?.cancel();
  if (!location || redirects >= MAX_REDIRECTS) {
    throw new Error("CDN mengalihkan permintaan terlalu banyak.");
  }

  const nextUrl = new URL(location, url);
  if (!isDailymotionUrl(nextUrl)) {
    throw new Error("CDN mengalihkan ke host yang tidak diizinkan.");
  }

  return fetchDailymotion(nextUrl, request, redirects + 1);
}

async function readPlaylist(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_PLAYLIST_BYTES) {
      await reader.cancel();
      throw new Error("Manifest HLS melebihi batas ukuran.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function proxyUrl(uri: string, baseUrl: URL) {
  if (uri.startsWith("data:")) return uri;

  const targetUrl = new URL(uri, baseUrl);
  if (!isDailymotionUrl(targetUrl)) {
    throw new Error("Manifest HLS berisi host yang tidak diizinkan.");
  }
  return `/api/video-proxy?url=${encodeURIComponent(targetUrl.href)}`;
}

function rewritePlaylist(playlist: string, baseUrl: URL) {
  return playlist
    .replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${proxyUrl(uri, baseUrl)}"`)
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const leadingWhitespace = line.match(/^\s*/)?.[0] ?? "";
      return `${leadingWhitespace}${proxyUrl(trimmed, baseUrl)}`;
    })
    .join("\n");
}

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("url");
  if (!source || source.length > 8192) {
    return Response.json({ error: "URL stream tidak valid." }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(source);
  } catch {
    return Response.json({ error: "URL stream tidak valid." }, { status: 400 });
  }

  if (!isDailymotionUrl(targetUrl)) {
    return Response.json({ error: "Host stream tidak diizinkan." }, { status: 403 });
  }

  try {
    const { response, finalUrl } = await fetchDailymotion(targetUrl, request);
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (response.status >= 400) {
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    if (finalUrl.pathname.toLowerCase().endsWith(".m3u8")) {
      const playlist = await readPlaylist(response);
      if (playlist.startsWith("#EXTM3U")) {
        responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
        return new Response(rewritePlaylist(playlist, finalUrl), {
          status: response.status === 206 ? 200 : response.status,
          headers: responseHeaders,
        });
      }
      responseHeaders.set(
        "Content-Type",
        response.headers.get("content-type") ?? "application/octet-stream",
      );
      return new Response(playlist, { status: response.status, headers: responseHeaders });
    }

    for (const name of ["content-type", "content-range", "accept-ranges", "content-length"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("Dailymotion stream proxy failed.", error);
    return Response.json({ error: "Stream Dailymotion tidak dapat dimuat." }, { status: 502 });
  }
}
