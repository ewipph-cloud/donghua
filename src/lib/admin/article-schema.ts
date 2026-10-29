import { z } from "zod";

export const articleSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter.").max(160),
  slug: z
    .string()
    .trim()
    .min(2, "Slug minimal 2 karakter.")
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Gunakan huruf kecil, angka, dan tanda hubung."),
  excerpt: z.string().trim().max(300).default(""),
  body: z.string().trim().min(20, "Isi artikel minimal 20 karakter.").max(50000),
});

export type ArticleInput = z.input<typeof articleSchema>;

export const articleRecordSchema = articleSchema.extend({
  id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ArticleRecord = z.output<typeof articleRecordSchema>;
