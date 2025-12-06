import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard analisis penjualan MEGAWAI. Pantau performa bisnis, prediksi penjualan, dan rekomendasi AI real-time.",
  openGraph: {
    title: "Dashboard - MEGAWAI",
    description: "Pantau performa bisnis dengan analisis AI",
    type: "website",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
