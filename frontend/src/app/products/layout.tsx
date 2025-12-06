import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manajemen Produk",
  description: "Kelola katalog produk, lihat ranking performa, dan analisis penjualan dengan AI MEGAWAI.",
  openGraph: {
    title: "Manajemen Produk - MEGAWAI",
    description: "Kelola katalog dan analisis performa produk",
    type: "website",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
