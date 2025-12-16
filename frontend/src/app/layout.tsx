import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { NotificationProvider } from "@/components/ui/NotificationToast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteConfig = {
  name: "Megaw AI",
  description: "AI-Powered Sales Intelligence untuk UMKM Indonesia. Prediksi penjualan, analisis tren, dan rekomendasi bisnis cerdas.",
  url: "https://megawai.id",
  ogImage: "/og-image.png",
  keywords: [
    "UMKM",
    "sales intelligence",
    "prediksi penjualan",
    "AI bisnis",
    "analisis penjualan",
    "UMKM Indonesia",
    "forecast penjualan",
    "machine learning UMKM",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - AI Sales Intelligence UMKM`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "Megaw AI Team" }],
  creator: "Megaw AI",
  publisher: "Megaw AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - AI Sales Intelligence`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@megaw_ai",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: siteConfig.url,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${inter.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <ThemeProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
