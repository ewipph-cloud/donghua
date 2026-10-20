import { z } from "zod";

const optionalUrl = z
  .string()
  .nullable()
  .transform((value) => value ?? "")
  .pipe(
    z
      .string()
      .trim()
      .refine((value) => {
        if (!value) return true;
        const parsed = z.url().safeParse(value);
        return parsed.success && new URL(parsed.data).protocol === "https:";
      }, "Masukkan URL HTTPS yang valid.")
      .transform((value) => value || null),
  );

const optionalImageUrl = optionalUrl.refine((value) => {
  if (!value) return true;
  const hostname = new URL(value).hostname;
  return hostname === "images.unsplash.com" || hostname.endsWith(".supabase.co");
}, "Gunakan gambar dari images.unsplash.com atau Supabase Storage.");

export const contentSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter.").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug minimal 2 karakter.")
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Gunakan huruf kecil, angka, dan tanda hubung."),
  synopsis: z.string().trim().max(1200).default(""),
  genre: z.string().trim().min(2).max(40),
  status: z.enum(["ongoing", "completed", "upcoming"]),
  year: z.number().int().min(1950).max(2100),
  latest_episode: z.string().trim().max(30).default(""),
  rating: z.number().min(0).max(10),
  poster_url: optionalImageUrl,
  banner_url: optionalImageUrl,
  stream_url: optionalUrl,
  stream_url_okru: optionalUrl.default(null),
  stream_url_dailymotion: optionalUrl.default(null),
  stream_url_dailymotion_audio: optionalUrl.default(null),
  featured: z.boolean(),
  published: z.boolean(),
});

export type ContentInput = z.input<typeof contentSchema>;

export type ContentRecord = z.output<typeof contentSchema> & {
  id: string;
  created_at: string;
  updated_at: string;
  views: number;
};
export const contentRecordSchema = contentSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  views: z.number(),
});

export const episodeSchema = z.object({
  content_id: z.string().uuid("Pilih judul yang valid."),
  episode_number: z.number().int().min(0).max(9999),
  title: z.string().trim().max(120).default(""),
  stream_url: optionalUrl,
  stream_url_okru: optionalUrl.default(null),
  stream_url_dailymotion: optionalUrl.default(null),
  stream_url_dailymotion_audio: optionalUrl.default(null),
  published: z.boolean(),
});

export type EpisodeInput = z.input<typeof episodeSchema>;

export type EpisodeRecord = z.output<typeof episodeSchema> & {
  id: string;
  created_at: string;
  updated_at: string;
  content_title: string;
};
export const episodeRecordSchema = episodeSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  content_title: z.string(),
});
