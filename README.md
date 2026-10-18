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
- CRUD judul, pencarian/filter, metadata, gambar dari Unsplash atau Supabase Storage, sinopsis, rating, unggulan, dan publikasi.
- CRUD episode, nomor episode, status publikasi, dan URL stream HTTPS.
- Katalog publik membaca konten terbit dari Supabase setelah konfigurasi tersedia.

## Status pemutar

Halaman `/watch/[slug]` dan daftar episode sudah tersedia. Pemutar sengaja belum memuat video: belum ada provider/CDN berizin yang dipilih. Tautan stream yang dimasukkan di dashboard hanya disimpan sebagai metadata hingga integrasi pemutar ditentukan.
