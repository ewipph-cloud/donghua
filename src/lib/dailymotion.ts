export function getDailymotionVideoId(value: string | null | undefined) {
  const input = value?.trim() ?? "";
  if (/^[a-zA-Z0-9]{3,30}$/.test(input)) return input;

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "dai.ly" || hostname.endsWith(".dai.ly")) {
      return url.pathname.split("/").filter(Boolean)[0] ?? "";
    }
    if (hostname === "dailymotion.com" || hostname.endsWith(".dailymotion.com")) {
      return (
        url.searchParams.get("video") ??
        url.pathname.match(/^\/(?:video|embed\/video)\/([^/?]+)/)?.[1] ??
        ""
      ).split("_")[0];
    }
  } catch {
    return "";
  }

  return "";
}

export function getDailymotionEmbedUrl(value: string | null | undefined) {
  const videoId = getDailymotionVideoId(value);
  if (!/^[a-zA-Z0-9]{3,30}$/.test(videoId)) return null;

  const playerUrl = new URL("https://geo.dailymotion.com/player/xtv3w.html");
  playerUrl.searchParams.set("video", videoId);
  return playerUrl.toString();
}

export function isDailymotionCdnUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (hostname === "dmcdn.net" || hostname.endsWith(".dmcdn.net"));
  } catch {
    return false;
  }
}
