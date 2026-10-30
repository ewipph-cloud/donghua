import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import InstallPrompt from "./install-prompt";
import { TelegramProvider } from "@/components/TelegramProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Donghua ID — Jelajahi Dunia Lain",
  description:
    "Temukan donghua favoritmu, ikuti episode terbaru, dan simpan cerita pilihan dalam satu tempat.",
  other: {
    "google-adsense-account": "ca-pub-7311117660161505",
  },
  appleWebApp: {
    capable: true,
    title: "Donghua ID",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7311117660161505"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <TelegramProvider>
          {children}
          <InstallPrompt />
          <Analytics />
        </TelegramProvider>
      </body>
    </html>
  );
}
