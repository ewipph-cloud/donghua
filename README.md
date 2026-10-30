# Donghua ID

Situs donghua berbahasa Indonesia dengan halaman pemutar, login administrator, serta dashboard untuk mengelola judul dan episode.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. UI pemutar dapat dilihat tanpa koneksi backend.

## PWA

Aplikasi menyediakan manifest, ikon instalasi, service worker, dan halaman offline. Banner instalasi akan muncul pada browser yang belum memasang aplikasi; tombol tutup menyembunyikannya. Di browser yang tidak mendukung prompt instalasi langsung, banner menampilkan petunjuk untuk menambahkan situs ke layar utama. Service worker dan instalasi PWA memerlukan HTTPS, kecuali saat berjalan di `localhost`.

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
- CRUD episode, nomor episode, status publikasi, dan URL server HTTPS (server lain, OK.Ru, dan Dailymotion).
- Daftar publik membaca konten terbit dari Supabase setelah konfigurasi tersedia.

Upload poster/banner menerima JPG, PNG, WebP, dan AVIF hingga 6 MB. Setelah memperbarui project, jalankan ulang [`supabase/schema.sql`](./supabase/schema.sql) di Supabase SQL Editor untuk membuat bucket publik `content-images` dan kebijakan upload/hapus khusus admin.

## Pemutar video

Halaman `/watch/[slug]` menggunakan URL server episode terlebih dahulu, lalu URL server utama konten sebagai fallback. Admin dapat menyimpan URL untuk server lain, OK.Ru, dan Dailymotion; penonton memilih server yang tersedia di halaman tonton. Pemutar mendukung file MP4, WebM, OGG, stream HLS (`.m3u8`), URL embed provider yang mengizinkan iframe, serta URL video YouTube biasa. Manifest CDN Dailymotion (`.m3u8`) dan segmennya dimuat melalui proxy situs agar browser tidak terhalang CORS. URL CDN bertoken tetap dapat kedaluwarsa atau ditolak oleh provider. Semua URL harus HTTPS dan sumber video harus memiliki izin penggunaan.

Setelah memperbarui project, jalankan ulang [`supabase/schema.sql`](./supabase/schema.sql) untuk menambahkan kolom URL server OK.Ru dan Dailymotion pada konten dan episode yang sudah ada.

## Telegram Mini App

Webapp dapat dibuka langsung dari Telegram menggunakan URL HTTPS deployment yang sama. SDK Telegram akan memanggil `ready()` dan memperluas tampilan saat aplikasi dibuka di dalam Telegram.

1. Buat bot melalui [`@BotFather`](https://t.me/BotFather), lalu buka **Bot Settings → Configure Mini App** (atau `/newapp`) dan isi URL HTTPS deployment.
2. Atur tombol menu bot melalui **Bot Settings → Menu Button → Configure menu button** agar pengguna dapat membuka Mini App dari percakapan.
3. Isi `TELEGRAM_BOT_TOKEN` di environment server deployment dengan token bot dari BotFather. Jangan gunakan awalan `NEXT_PUBLIC_` dan jangan kirim token ke browser.
4. Opsional: atur `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` dengan username bot tanpa `@` untuk membagikan tautan Mini App langsung.
5. Provider di `src/components/TelegramProvider.tsx` menyediakan `useTelegram()` dan `useBackButton()`. Favorit serta riwayat tonton memakai Telegram CloudStorage, dengan `localStorage` sebagai fallback di browser biasa atau saat CloudStorage gagal.
6. Endpoint `POST /api/telegram/auth` menerima `{ "initData": "<Telegram.WebApp.initData>" }`, memeriksa signature HMAC dan usia data (maksimal 24 jam), lalu mengembalikan identitas publik Telegram yang tervalidasi. Kirim `initData` mentah dari client; jangan memakai `initDataUnsafe` sebagai bukti autentikasi.

Endpoint tersebut memvalidasi identitas Telegram untuk penggunaan di Mini App, tetapi belum membuat sesi Supabase atau menghubungkan akun Telegram ke akun Supabase.

### Notifikasi episode baru

Notifikasi dapat dikirim ke pengguna pribadi yang menekan **Start** (`/start`) dan grup yang menjalankan `/subscribe@anime_ID_bot`. Pengguna dapat berhenti dengan `/stop`; grup dapat berhenti dengan `/unsubscribe@anime_ID_bot`.

1. Deploy aplikasi dan pastikan `TELEGRAM_BOT_TOKEN` serta `SUPABASE_SECRET_KEY` telah diatur sebagai secret environment variables di hosting.
2. Jalankan ulang `supabase/schema.sql` di Supabase SQL Editor, atau jalankan `supabase/migrations/20261030_telegram_group_notifications.sql` untuk menambahkan dukungan langganan grup. Tabel langganan hanya dapat diakses role `service_role`.
3. Buat nilai acak untuk `TELEGRAM_WEBHOOK_SECRET_TOKEN` (1–256 karakter, hanya huruf, angka, `_`, `-`) dan tambahkan sebagai secret environment variable. Atur `TELEGRAM_WEB_APP_URL` ke URL HTTPS situs.
4. Deploy ulang, lalu daftarkan webhook Telegram ke `https://DOMAIN-ANDA/api/telegram/webhook` dengan secret token yang sama. Contoh dari terminal dengan variabel shell `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_WEBHOOK_SECRET_TOKEN` yang sudah diisi:

   ```sh
   curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -d "url=https://DOMAIN-ANDA/api/telegram/webhook" \
     -d "secret_token=${TELEGRAM_WEBHOOK_SECRET_TOKEN}"
   ```

5. Di BotFather, atur commands `/start - Aktifkan notifikasi episode baru`, `/subscribe - Langganan notifikasi`, `/stop - Hentikan notifikasi`, `/unsubscribe - Hentikan notifikasi grup`, dan `/help - Bantuan`.
6. Pengguna membuka `https://t.me/anime_ID_bot?start=subscribe`, lalu menekan **Start**. Untuk grup, tambahkan bot lalu kirim `/subscribe@anime_ID_bot` (perintah menyebut username bot agar diterima saat privacy mode aktif). Bot harus diizinkan mengirim pesan di grup. Kirim `/unsubscribe@anime_ID_bot` untuk berhenti.
7. Saat admin menerbitkan episode untuk judul yang sudah diterbitkan, bot mengirim tautan episode ke pelanggan personal dan grup yang aktif.

Episode draft tidak mengirim notifikasi. Mengedit episode yang sudah terbit juga tidak mengirim ulang; notifikasi dikirim saat episode dibuat dalam status terbit atau saat statusnya berubah dari draft menjadi terbit. Pantau log hosting untuk kegagalan pengiriman.
