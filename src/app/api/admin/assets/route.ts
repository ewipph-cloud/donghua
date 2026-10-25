import { getAdminSession } from "@/lib/supabase/admin";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

const bucketName = "content-images";
const maxFileSize = 6 * 1024 * 1024;
const acceptedTypes = {
  "image/jpeg": {
    extension: "jpg",
    signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    signature: (bytes: Uint8Array) =>
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  },
  "image/webp": {
    extension: "webp",
    signature: (bytes: Uint8Array) =>
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  },
  "image/avif": {
    extension: "avif",
    signature: (bytes: Uint8Array) =>
      String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
      ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12))),
  },
} satisfies Record<string, { extension: string; signature: (bytes: Uint8Array) => boolean }>;

function publicImagePath(value: string) {
  let imageUrl: URL;
  let projectUrl: URL;
  try {
    imageUrl = new URL(value);
    projectUrl = new URL(getSupabaseConfig().url);
  } catch {
    return null;
  }

  const prefix = `/storage/v1/object/public/${bucketName}/`;
  if (imageUrl.origin !== projectUrl.origin || !imageUrl.pathname.startsWith(prefix)) return null;

  let path: string;
  try {
    path = decodeURIComponent(imageUrl.pathname.slice(prefix.length));
  } catch {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/i.test(path)
    ? path
    : null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Formulir unggah tidak valid." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Pilih file gambar terlebih dahulu." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > maxFileSize) {
    return Response.json({ error: "Ukuran gambar harus lebih dari 0 dan maksimal 6 MB." }, { status: 413 });
  }

  const typeInfo = acceptedTypes[file.type as keyof typeof acceptedTypes];
  if (!typeInfo) {
    return Response.json({ error: "Gunakan gambar JPG, PNG, WebP, atau AVIF." }, { status: 415 });
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!typeInfo.signature(signature)) {
    return Response.json({ error: "Isi file tidak sesuai dengan tipe gambar." }, { status: 415 });
  }

  const path = `${crypto.randomUUID()}.${typeInfo.extension}`;
  const { error: uploadError } = await session.supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes("bucket")) {
      return Response.json(
        { error: "Bucket gambar belum disiapkan. Jalankan pembaruan supabase/schema.sql di Supabase SQL Editor." },
        { status: 503 },
      );
    }
    console.error("Gagal mengunggah gambar donghua.", uploadError);
    return Response.json({ error: "Gambar tidak dapat diunggah ke Supabase Storage." }, { status: 500 });
  }

  const { data } = session.supabase.storage.from(bucketName).getPublicUrl(path);
  return Response.json({ url: data.publicUrl }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Akses admin diperlukan." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format data JSON tidak valid." }, { status: 400 });
  }

  const parsed = z.object({ urls: z.array(z.string().url()).min(1).max(10) }).safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Daftar file gambar tidak valid." }, { status: 400 });
  }

  const paths = [...new Set(parsed.data.urls.map(publicImagePath).filter((path): path is string => path !== null))];
  if (!paths.length) return Response.json({ deleted: 0 });

  const referencedPaths = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error: queryError } = await session.supabase
      .from("anime_content")
      .select("poster_url, banner_url")
      .range(from, from + pageSize - 1);

    if (queryError) {
      console.error("Gagal memeriksa referensi gambar donghua.", queryError);
      return Response.json({ error: "Penggunaan gambar lama tidak dapat diverifikasi." }, { status: 500 });
    }

    for (const content of data) {
      for (const url of [content.poster_url, content.banner_url]) {
        if (url) {
          const path = publicImagePath(url);
          if (path) referencedPaths.add(path);
        }
      }
    }

    if (data.length < pageSize) break;
  }

  const unusedPaths = paths.filter((path) => !referencedPaths.has(path));
  if (!unusedPaths.length) return Response.json({ deleted: 0 });

  const { error } = await session.supabase.storage.from(bucketName).remove(unusedPaths);
  if (error) {
    console.error("Gagal menghapus gambar lama dari donghua.", error);
    return Response.json({ error: "Gambar lama tidak dapat dihapus dari Supabase Storage." }, { status: 500 });
  }

  return Response.json({ deleted: unusedPaths.length });
}
