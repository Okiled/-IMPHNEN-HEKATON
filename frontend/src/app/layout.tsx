import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { NotificationProvider } from "@/components/ui/NotificationToast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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
  title: "Market Pulse - AI-Powered Sales Analytics",
  description: "Platform analisis penjualan berbasis AI untuk UMKM. Pantau performa, prediksi tren, dan optimalkan bisnis Anda.",
  keywords: ["sales analytics", "UMKM", "AI", "business intelligence", "forecasting"],
  authors: [{ name: "Market Pulse Team" }],
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
