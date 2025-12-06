"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar"; 
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FolderOpen, Calendar, Package, Save, CheckCircle, AlertCircle, Minus, Plus } from "lucide-react"; 

interface Product {
  id: string;
  name: string;
  unit?: string;
  price?: number;
}

interface SalesEntry {
  product_id: string;
  product_name: string;
  quantity: number;
}

export default function InputPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch("http://localhost:5000/api/products", {
          headers: { Authorization: `Bearer ${token}` }
        });
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
        console.error("Gagal load produk", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []); 

  const MAX_QUANTITY = 99999;

  const handleQuantityChange = (productId: string, value: number) => {
    // Validate: only positive numbers, max limit
    const validValue = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(value) || 0));
    setEntries(prev => ({
      ...prev,
      [productId]: validValue
    }));
  };

  const validateDate = (dateStr: string): boolean => {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Don't allow future dates
    if (selectedDate > today) {
      setMessage({ type: 'error', text: 'Tanggal tidak boleh di masa depan' });
      return false;
    }
    
    // Don't allow dates more than 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (selectedDate < oneYearAgo) {
      setMessage({ type: 'error', text: 'Tanggal tidak boleh lebih dari 1 tahun lalu' });
      return false;
    }
    
    return true;
  };

  const incrementQuantity = (productId: string) => {
    setEntries(prev => ({
      ...prev,
      [productId]: Math.min((prev[productId] || 0) + 1, MAX_QUANTITY)
    }));
  };

  const decrementQuantity = (productId: string) => {
    setEntries(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1)
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage({ type: 'error', text: 'Session habis. Login ulang!' });
        setIsSubmitting(false);
        return;
      }

      // Validate date
      if (!validateDate(saleDate)) {
        setIsSubmitting(false);
        return;
      }

      // Prepare entries data with max limit check
      const salesEntries: SalesEntry[] = products
        .filter(p => entries[p.id] > 0)
        .map(p => ({
          product_id: p.id,
          product_name: p.name,
          quantity: Math.min(entries[p.id], MAX_QUANTITY)
        }));

      if (salesEntries.length === 0) {
        setMessage({ type: 'error', text: 'Isi minimal 1 produk dengan quantity > 0' });
        setIsSubmitting(false);
        return;
      }

      // Warn for high quantities
      const hasHighQty = salesEntries.some(e => e.quantity > 10000);
      if (hasHighQty) {
        const confirmHigh = window.confirm('Ada quantity > 10.000. Yakin data sudah benar?');
        if (!confirmHigh) {
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch("http://localhost:5000/api/sales/bulk", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sale_date: saleDate,
          entries: salesEntries
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan");
      }

      setMessage({ 
        type: 'success', 
        text: `✅ ${salesEntries.length} produk berhasil disimpan!` 
      });

      // Reset entries to 0
      const resetEntries: Record<string, number> = {};
      products.forEach(p => {
        resetEntries[p.id] = 0;
      });
      setEntries(resetEntries);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalProducts = Object.values(entries).filter(v => v > 0).length;
  const totalQuantity = Object.values(entries).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-gray-50 text-black selection:bg-[#DC2626] selection:text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <FolderOpen className="text-[#DC2626]" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black tracking-tight">
                Input Penjualan Harian
              </h1>
              <p className="text-gray-500 text-sm">
                Masukkan jumlah terjual untuk setiap produk
              </p>
            </div>
          </div>
        </div>

        {/* Date Picker Card */}
        <Card className="mb-6 border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Tanggal Penjualan</p>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="font-bold text-lg text-gray-900 bg-transparent border-none focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
              <Badge variant="secondary" className="bg-red-50 text-red-700">
                {new Date(saleDate).toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Alert Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? 
              <CheckCircle className="w-5 h-5" /> : 
              <AlertCircle className="w-5 h-5" />
            }
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Products List */}
        <Card>
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-500" />
                <h3 className="font-bold text-gray-900">Daftar Produk</h3>
              </div>
              <Badge variant="outline">
                {products.length} produk
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-[#DC2626] rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm font-medium">
                  Memuat daftar produk...
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Belum ada produk</p>
                <p className="text-gray-400 text-sm">Tambahkan produk terlebih dahulu</p>
                <Button 
                  className="mt-4 bg-red-600 hover:bg-red-700"
                  onClick={() => router.push('/products')}
                >
                  Tambah Produk
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      entries[product.id] > 0 ? 'bg-green-50/50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {product.unit || 'pcs'}
                        {product.price ? ` • Rp ${product.price.toLocaleString('id-ID')}` : ''}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decrementQuantity(product.id)}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        disabled={entries[product.id] <= 0}
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      
                      <input
                        type="number"
                        value={entries[product.id] > 0 ? entries[product.id] : ''}
                        placeholder="0"
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                        className={`w-20 h-12 text-center text-xl font-bold rounded-lg border-2 transition-colors
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                          placeholder:text-gray-300 placeholder:font-normal
                          ${entries[product.id] > 0 
                            ? 'border-green-300 bg-green-50 text-green-700' 
                            : 'border-gray-200 bg-white text-gray-900'
                          }`}
                        min="0"
                      />
                      
                      <button
                        type="button"
                        onClick={() => incrementQuantity(product.id)}
                        className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & Submit */}
        {products.length > 0 && (
          <Card className="mt-6 border-t-4 border-t-green-500">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Ringkasan Input</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-3xl font-bold text-gray-900">{totalProducts}</span>
                      <span className="text-gray-500 ml-1">produk</span>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div>
                      <span className="text-3xl font-bold text-green-600">{totalQuantity}</span>
                      <span className="text-gray-500 ml-1">total item</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={totalProducts === 0 || isSubmitting}
                  isLoading={isSubmitting}
                  className={`px-8 py-3 text-lg font-bold shadow-lg transition-all ${
                    totalProducts > 0 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Simpan Semua
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
