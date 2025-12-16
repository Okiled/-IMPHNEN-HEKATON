"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IntelligenceDashboard } from "@/components/IntelligenceDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Navbar from '@/components/ui/Navbar';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp, RefreshCcw } from "lucide-react";
import { API_URL } from "@/lib/api";
import { getToken, requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { useTheme } from "@/lib/theme-context";
import { useNotification } from "@/components/ui/NotificationToast";

type DashboardSummary = {
  today: {
    total_quantity: number;
    total_revenue: number;
    sales_count: number;
  };
  changes: {
    quantity_change: number;
    revenue_change: number;
  };
  burst_alerts: Array<{
    product_id: string;
    product_name: string;
    burst_score: number;
    burst_level: string;
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
  }>;
};

type Product = { id: string; name: string; unit?: string };

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notifiedBursts, setNotifiedBursts] = useState<Set<string>>(new Set());

  // Check auth on mount
  useEffect(() => {
    if (!requireAuth(router)) {
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/products", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
        if (!selectedId && data.data?.length > 0 && !searchParams.get('product')) {
          setSelectedId(data.data[0].id);
        }
      }
    } catch (err) {
      logger.error("Gagal load produk:", err);
    }
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch("http://localhost:5000/api/analytics/summary", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (err) {
      logger.error("Gagal load summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    Promise.all([fetchProducts(), fetchSummary()]);
    
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // cek burst alerts dan tampilkan notifikasi
  useEffect(() => {
    if (!summary?.burst_alerts?.length) return;
    
    summary.burst_alerts.forEach(alert => {
      if (!notifiedBursts.has(alert.product_id)) {
        addNotification({
          type: "burst",
          title: "Burst Alert!",
          message: `"${alert.product_name}" mengalami lonjakan penjualan`,
          productName: alert.product_name,
          burstLevel: alert.burst_level,
        });
        
        setNotifiedBursts(prev => new Set([...prev, alert.product_id]));
      }
    });
  }, [summary, notifiedBursts, addNotification]);

  const handleProductSelect = (productId: string) => {
    setSelectedId(productId);
    const url = new URL(window.location.href);
    url.searchParams.set('product', productId);
    window.history.pushState({}, '', url);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { 
      style: "currency", 
      currency: "IDR", 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen selection:bg-red-600 selection:text-white transition-colors duration-300 ${
      theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-slate-900"
    }`}>
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Pantau performa penjualan & analisis AI</p>
          </div>
          <Button 
            onClick={() => { fetchSummary(); fetchProducts(); }} 
            variant="outline" 
            size="sm"
            className="self-start sm:self-auto"
          >
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Dashboard Overview</h1>
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Pantau performa harian & deteksi anomali penjualan.
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={fetchSummary} variant="outline" size="sm" className={`shadow-sm flex items-center gap-2 ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700" : "bg-white"
              }`}>
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </motion.div>
          </motion.div>

          {/* --- KPI SUMMARY CARDS --- */}
          {summary && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <motion.div variants={itemVariants}>
                <Card className={`transition-shadow ${
                  theme === "dark" 
                    ? "bg-gray-800 border-gray-700 hover:shadow-[0_8px_30px_rgba(255,255,255,0.1)]" 
                    : "hover:shadow-md"
                }`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : ""}`}>Total Pendapatan</CardTitle>
                    <span className={`font-bold text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>IDR</span>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : ""}`}>{formatRupiah(summary.today.total_revenue)}</div>
                    <p className={`text-xs flex items-center mt-1 font-medium ${summary.changes.revenue_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.changes.revenue_change >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                      {Math.abs(summary.changes.revenue_change).toFixed(1)}% dari kemarin
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className={`transition-shadow ${
                  theme === "dark" 
                    ? "bg-gray-800 border-gray-700 hover:shadow-[0_8px_30px_rgba(255,255,255,0.1)]" 
                    : "hover:shadow-md"
                }`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : ""}`}>Total Item Terjual</CardTitle>
                    <span className={`font-bold text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>QTY</span>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : ""}`}>{summary.today.total_quantity} pcs</div>
                    <p className={`text-xs flex items-center mt-1 font-medium ${summary.changes.quantity_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {summary.changes.quantity_change >= 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                      {Math.abs(summary.changes.quantity_change).toFixed(1)}% dari kemarin
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className={`transition-shadow ${
                  theme === "dark" 
                    ? "bg-gray-800 border-gray-700 hover:shadow-[0_8px_30px_rgba(255,255,255,0.1)]" 
                    : "hover:shadow-md"
                }`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : ""}`}>Transaksi</CardTitle>
                    <span className={`font-bold text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>TRX</span>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : ""}`}>{summary.today.sales_count}</div>
                    <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Transaksi berhasil hari ini</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Burst Alert */}
        {summary?.burst_alerts && summary.burst_alerts.length > 0 && (
          <Card className="mb-8 border-l-4 border-l-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                  <Zap className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2">🚨 Burst Alert</h3>
                  <div className="space-y-2">
                    {summary.burst_alerts.map((alert) => (
                      <div 
                        key={alert.product_id} 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-3 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{alert.product_name}</span>
                          <span className="text-gray-600 ml-2">mengalami lonjakan!</span>
                          <Badge variant="secondary" className="ml-2 text-xs">{alert.burst_level}</Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleProductSelect(alert.product_id)}
                        >
                          Lihat Analisa
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

          {/* --- MAIN CONTENT GRID (SIDEBAR + CHART) --- */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start"
          >
            {/* Sidebar List Produk */}
            <Card className="lg:col-span-2 lg:sticky lg:top-6 shadow-sm">
              <CardHeader className={`pb-3 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-100"}`}>
                <h3 className={`text-base font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Daftar Produk</h3>
              </CardHeader>
              <CardContent className="p-0">
                <div className={`max-h-[600px] overflow-y-auto p-2 space-y-1 ${
                  theme === "dark" ? "scrollbar-dark" : ""
                }`} style={theme === "dark" ? {
                  scrollbarColor: '#4b5563 #1f2937',
                  scrollbarWidth: 'thin'
                } : {}}>
                  {products.map((p, idx) => (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 truncate ${
                        selectedId === p.id
                          ? theme === "dark" 
                            ? "bg-red-900/40 text-red-400 font-medium border border-red-800 shadow-sm"
                            : "bg-red-50 text-red-700 font-medium border border-red-200 shadow-sm"
                          : theme === "dark"
                            ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                            : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {p.name}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

            {/* Intelligence Dashboard View */}
            <div className="lg:col-span-10">
              <AnimatePresence mode="wait">
                {selectedId ? (
                  <motion.div
                    key={selectedId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IntelligenceDashboard productId={selectedId} />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed text-center ${
                      theme === "dark" 
                        ? "border-gray-700 bg-gray-800/50" 
                        : "border-gray-200 bg-gray-50/50"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className={`p-4 rounded-full shadow-sm mb-4 ${theme === "dark" ? "bg-gray-700" : "bg-white"}`}>
                        <TrendingUp className={`h-8 w-8 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`} />
                      </div>
                      <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Pilih Produk</h3>
                      <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Klik produk dari sidebar untuk melihat analisa.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
