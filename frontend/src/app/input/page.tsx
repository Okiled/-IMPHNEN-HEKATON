"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FolderOpen, Calendar, Package, Save, CheckCircle, AlertCircle, Minus, Plus, Upload, FileSpreadsheet, Info, History, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import { getToken, getAuthHeaders, requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { useTheme } from "@/lib/theme-context"; 

interface Product {
  id: string;
  name: string;
  unit: string;
}

export default function InputSalesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saleDate, setSaleDate] = useState<string>("");
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [salesHistory, setSalesHistory] = useState<Array<{date: string, product_name: string, quantity: number, unit_price?: number | null, revenue?: number | null}>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth on mount
  useEffect(() => {
    if (!requireAuth(router)) {
      return;
    }
    setIsAuthenticated(true);
    setIsMounted(true);
    setSaleDate(getTodayDate());
  }, [router]);

  useEffect(() => {
    if (!isMounted) return;
    
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        if (!requireAuth(router)) return;

        const res = await fetch(`${API_URL}/api/products`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const result = await res.json();
        
        if (result.success && Array.isArray(result.data)) {
          setProducts(result.data);
          // Initialize all entries to 0
          const initial: Record<string, number> = {};
          result.data.forEach((p: Product) => {
            initial[p.id] = 0;
          });
          setEntries(initial);
        }
      } catch (err) {
        logger.error("Gagal load produk", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchHistory = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API_URL}/api/sales/history?limit=20`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const result = await res.json();
        
        if (result.success && Array.isArray(result.data)) {
          setSalesHistory(result.data);
        }
      } catch (err) {
        logger.error("Gagal load history", err);
      }
    };

    fetchProducts();
    fetchHistory();
  }, [isMounted, router]); 

  const fetchSalesHistory = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/sales/history?limit=20`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const result = await res.json();
      
      if (result.success && Array.isArray(result.data)) {
        setSalesHistory(result.data);
      }
    } catch (err) {
      logger.error("Gagal load history", err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');

      if (!token || !userId) {
        router.push('/login');
        return;
      }

      const res = await fetch(`http://localhost:5000/api/products?user_id=${userId}`, {
        headers: getAuthHeaders()
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
        const initialInputs = new Map<string, number>();
        (data.data || []).forEach((p: Product) => {
          initialInputs.set(p.id, 0);
        });
        setSalesInputs(initialInputs);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast('Gagal memuat produk', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newInputs = new Map(salesInputs);
    newInputs.set(productId, Math.max(0, quantity));
    setSalesInputs(newInputs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const salesData = products
      .filter(p => (salesInputs.get(p.id) || 0) > 0)
      .map(p => ({
        product_id: p.id,
        product_name: p.name,
        quantity: salesInputs.get(p.id) || 0,
        sale_date: saleDate
      }));

    if (salesData.length === 0) {
      showToast('Masukkan minimal 1 produk dengan quantity > 0', 'error');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const sale of salesData) {
        try {
          const res = await fetch('http://localhost:5000/api/sales', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(sale)
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast(`${successCount} data berhasil disimpan!`, 'success');
        const resetInputs = new Map<string, number>();
        products.forEach(p => resetInputs.set(p.id, 0));
        setSalesInputs(resetInputs);
      }

      if (errorCount > 0) {
        showToast(`${errorCount} data gagal disimpan`, 'error');
      }

    } catch (err) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = Array.from(salesInputs.values()).filter(v => v > 0).length;
  const totalQuantity = Array.from(salesInputs.values()).reduce((a, b) => a + b, 0);

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen selection:bg-[#DC2626] selection:text-white transition-colors duration-300 ${
      theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-black"
    }`}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-red-900/30" : "bg-red-100"}`}>
              <FolderOpen className="text-[#DC2626]" size={24} />
            </div>
            <div>
              <h1 className={`text-xl font-bold tracking-tight ${theme === "dark" ? "text-white" : "text-black"}`}>
                Input Penjualan Harian
              </h1>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Masukkan jumlah terjual untuk setiap produk
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

        <div className={`mb-4 p-4 border rounded-xl flex items-start gap-3 ${
          theme === "dark" ? "bg-amber-900/20 border-amber-800" : "bg-amber-50 border-amber-200"
        }`}>
          <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
          <div>
            <p className={`font-medium text-sm ${theme === "dark" ? "text-amber-300" : "text-amber-800"}`}>Penting: Daftarkan Produk Terlebih Dahulu</p>
            <p className={`text-sm mt-1 ${theme === "dark" ? "text-amber-400/80" : "text-amber-700"}`}>
              Sebelum input data penjualan, pastikan semua produk sudah didaftarkan di{' '}
              <a href="/products" className={`underline font-medium ${theme === "dark" ? "hover:text-amber-300" : "hover:text-amber-900"}`}>
                halaman Products
              </a>
              . Data penjualan hanya akan diproses untuk produk yang sudah terdaftar.
            </p>
          </div>
        </div>
      )}

        <div className={`mb-6 p-4 border rounded-xl flex items-start gap-3 ${
          theme === "dark" ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
        }`}>
          <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
          <div>
            <p className={`font-medium text-sm ${theme === "dark" ? "text-blue-300" : "text-blue-800"}`}>Tips untuk hasil AI yang optimal</p>
            <p className={`text-sm mt-1 ${theme === "dark" ? "text-blue-400/80" : "text-blue-600"}`}>
              Disarankan input data penjualan minimal <strong>30 hari berturut-turut</strong> agar AI dapat menganalisis pola dan memberikan prediksi yang lebih akurat.
            </p>
          </div>
        </div>

        <Card className="mb-6 border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className={`w-5 h-5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                <div>
                  <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Upload Data Penjualan</p>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Excel (.xlsx), CSV, atau Word (.docx)</p>
                  <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-400"}`}>
                    Kolom fleksibel: tanggal/date/tgl, nama/produk/menu, qty/jumlah/terjual, harga/price
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading... {Math.round(uploadProgress)}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Pilih File
                    </>
                  )}
                </Button>
              </div>
            </div>
            {isUploading && (
              <div className="mt-3">
                <div className={`h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <Badge variant="outline" className="text-xs self-start sm:self-auto">
                    {new Date(saleDate).toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      day: 'numeric',
                      month: 'short'
                    })}
                  </Badge>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <Card className="mb-6 border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${theme === "dark" ? "text-white" : "text-gray-500"}`} style={theme === "dark" ? { color: "white" } : {}} />
                <div>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>Tanggal Penjualan</p>
                  {saleDate ? (
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      style={theme === "dark" ? { colorScheme: "dark" } : {}}
                      className={`font-bold text-lg bg-transparent border-none focus:outline-none cursor-pointer ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    />
                  ) : (
                    <div className={`h-7 w-32 rounded animate-pulse ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`} />
                  )}
                </div>
              </div>
              {saleDate ? (
                <Badge variant="secondary" className={theme === "dark" ? "bg-red-900/40 text-red-400" : "bg-red-50 text-red-700"}>
                  {new Date(saleDate + 'T00:00:00').toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </Badge>
              ) : (
                <div className={`h-6 w-28 rounded animate-pulse ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`} />
              )}
            </div>
          </CardContent>
        </Card>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? theme === "dark" ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-green-50 border border-green-200 text-green-700'
              : theme === "dark" ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? 
              <CheckCircle className="w-5 h-5" /> : 
              <AlertCircle className="w-5 h-5" />
            }
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <Card>
          <CardHeader className={`border-b ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className={`w-5 h-5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Daftar Produk</h3>
              </div>
              <Badge variant="outline">
                {products.length} produk
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className={`w-8 h-8 border-2 border-t-[#DC2626] rounded-full animate-spin ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}></div>
                <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Memuat daftar produk...
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className={`w-12 h-12 mx-auto mb-3 ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`} />
                <p className={`font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Belum ada produk</p>
                <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>Tambahkan produk terlebih dahulu</p>
                <Button 
                  className="mt-4 bg-red-600 hover:bg-red-700"
                  onClick={() => router.push('/products')}
                >
                  Tambah Produk
                </Button>
              </div>
            ) : (
              <div className={`divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-100"}`}>
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className={`p-4 flex items-center justify-between transition-colors ${
                      entries[product.id] > 0 
                        ? theme === "dark" ? 'bg-green-900/30' : 'bg-green-50/50'
                        : theme === "dark" ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {product.name}
                      </h4>
                      <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        {product.unit || 'pcs'}
                        {product.price ? ` • Rp ${product.price.toLocaleString('id-ID')}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decrementQuantity(product.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        disabled={entries[product.id] <= 0}
                      >
                        <Minus className={`w-4 h-4 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} />
                      </button>
                      
                      <input
                        type="number"
                        value={entries[product.id] > 0 ? entries[product.id] : ''}
                        placeholder="0"
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                        className={`w-20 h-12 text-center text-xl font-bold rounded-lg border-2 transition-colors
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                          ${theme === "dark" 
                            ? entries[product.id] > 0 
                              ? 'border-green-600 bg-green-900/50 text-white placeholder:text-gray-600' 
                              : 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-600'
                            : entries[product.id] > 0 
                              ? 'border-green-300 bg-green-50 text-green-700 placeholder:text-gray-300' 
                              : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-300'
                          }`}
                        min="0"
                      />
                      
                      <button
                        type="button"
                        onClick={() => incrementQuantity(product.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          theme === "dark" ? "bg-red-900/50 hover:bg-red-900/70" : "bg-red-100 hover:bg-red-200"
                        }`}
                      >
                        <Plus className={`w-4 h-4 ${theme === "dark" ? "text-red-400" : "text-red-600"}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {products.length > 0 && (
          <Card className="mt-6 border-t-4 border-t-green-500">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Ringkasan Input</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{totalProducts}</span>
                      <span className={`text-sm ml-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>produk</span>
                    </div>
                    <div className={`w-px h-6 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}></div>
                    <div>
                      <span className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>{totalQuantity}</span>
                      <span className={`text-sm ml-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>total item</span>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    variant="secondary"
                    className="bg-white text-gray-900 hover:bg-gray-100"
                    isLoading={submitting}
                    disabled={totalItems === 0}
                  >
                    Simpan Penjualan
                  </Button>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={totalProducts === 0 || isSubmitting}
                  isLoading={isSubmitting}
                  className={`px-6 py-2.5 text-sm font-bold shadow-lg transition-all ${
                    totalProducts > 0 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : theme === "dark" ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Semua
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {salesHistory.length > 0 && (
          <Card className="mt-8">
            <CardHeader className={`border-b ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <History className={`w-5 h-5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
                <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Riwayat Penjualan Terbaru</h3>
                <Badge variant="outline" className="ml-auto">{salesHistory.length} data</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`border-b ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                    <tr>
                      <th className={`text-left py-3 px-4 font-semibold text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Tanggal</th>
                      <th className={`text-left py-3 px-4 font-semibold text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Produk</th>
                      <th className={`text-right py-3 px-4 font-semibold text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Qty</th>
                      <th className={`text-right py-3 px-4 font-semibold text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Harga Satuan</th>
                      <th className={`text-right py-3 px-4 font-semibold text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Total</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-100"}`}>
                    {salesHistory.map((sale, idx) => (
                      <tr key={idx} className={`transition-colors ${theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-50"}`}>
                        <td className={`py-3 px-4 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                          {new Date(sale.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className={`py-3 px-4 text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{sale.product_name}</td>
                        <td className="py-3 px-4 text-sm text-right">
                          <Badge variant="secondary" className={theme === "dark" ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-700"}>
                            {sale.quantity}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 text-sm text-right ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          {sale.unit_price ? `Rp ${sale.unit_price.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-medium ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                          {sale.revenue ? `Rp ${sale.revenue.toLocaleString('id-ID')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
