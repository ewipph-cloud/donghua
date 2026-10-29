import type { MetadataRoute } from "next";
import { series } from "@/lib/series";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://kedongdong.vercel.app";
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const watchPages = series.map((item) => ({
    url: `${baseUrl}/watch/${item.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...watchPages];
}
