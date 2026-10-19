import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import InstallPrompt from "./install-prompt";
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
    "Temukan donghua favoritmu, ikuti episode terbaru, dan simpan cerita pilihan dalam satu katalog.",
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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7311117660161505"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  );
}
