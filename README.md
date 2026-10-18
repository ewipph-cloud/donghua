# Donghua ID

Katalog donghua berbahasa Indonesia dengan halaman pemutar, login administrator, serta dashboard untuk mengelola judul dan episode.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Katalog contoh dan UI pemutar dapat dilihat tanpa koneksi backend.

## Menyiapkan Supabase

Admin memakai Supabase Auth dan database. Tanpa konfigurasi ini, login dan dashboard tetap tertutup; akun contoh atau autentikasi palsu tidak disediakan.

1. Buat project Supabase dan salin URL serta publishable key dari **Project Settings → API**.
2. Jalankan isi [`supabase/schema.sql`](./supabase/schema.sql) di Supabase **SQL Editor**.
3. Buat/invite akun administrator melalui **Authentication → Users**.
4. Salin UUID akun tersebut, lalu daftarkan sebagai admin di SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('UUID-AKUN-ADMIN');
   ```

5. Salin `.env.example` menjadi `.env.local`, lalu isi:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

6. Mulai ulang server dev, lalu buka `/admin/login`.

Jangan pernah menaruh `service_role` key di browser, `.env.example`, atau source control. Akses tabel dibatasi oleh row-level security; endpoint admin juga memeriksa sesi dan membership admin di server.

## Fitur admin

- Login dengan email/password Supabase Auth.
- Dashboard ringkasan, jumlah konten/episode, dan status publikasi.
- CRUD judul, pencarian/filter, metadata, upload poster/banner ke bucket Supabase Storage, sinopsis, rating, unggulan, dan publikasi.
- CRUD episode, nomor episode, status publikasi, dan URL stream HTTPS.
- Katalog publik membaca konten terbit dari Supabase setelah konfigurasi tersedia.

Upload poster/banner menerima JPG, PNG, WebP, dan AVIF hingga 6 MB. Setelah memperbarui project, jalankan ulang [`supabase/schema.sql`](./supabase/schema.sql) di Supabase SQL Editor untuk membuat bucket publik `content-images` dan kebijakan upload/hapus khusus admin.

## Pemutar video

Halaman `/watch/[slug]` menggunakan URL stream episode terlebih dahulu, lalu URL stream utama konten sebagai fallback. Pemutar mendukung file MP4, WebM, OGG, stream HLS (`.m3u8`), URL embed provider yang mengizinkan iframe, serta URL video YouTube biasa. Semua URL harus HTTPS dan sumber video harus memiliki izin penggunaan.
