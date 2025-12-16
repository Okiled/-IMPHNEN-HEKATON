"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Flame, Star } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

interface TrendItem {
  name: string;
  growth: string;
  description: string;
  icon: typeof TrendingUp;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

const trendData: TrendItem[] = [
  {
    name: "Es Kopi Susu Gula Aren",
    growth: "+127%",
    description: "Minuman kopi yang sedang viral di kalangan anak muda. Kombinasi kopi, susu, dan gula aren yang menyegarkan.",
    icon: Flame,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    darkBgColor: "bg-orange-900/30",
  },
  {
    name: "Croffle (Croissant Waffle)",
    growth: "+89%",
    description: "Fusion pastry yang menggabungkan kelezatan croissant dengan tekstur waffle. Favorit pecinta kuliner.",
    icon: Star,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    darkBgColor: "bg-yellow-900/30",
  },
  {
    name: "Korean Corn Dog",
    growth: "+156%",
    description: "Street food Korea yang populer dengan isian sosis dan keju mozzarella, dilapisi tepung roti renyah.",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-100",
    darkBgColor: "bg-green-900/30",
  },
];

export function TrendShowcase() {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trendData.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const currentTrend = trendData[currentIndex];
  const IconComponent = currentTrend.icon;

  return (
    <section 
      className={`py-12 transition-colors duration-300 ${
        theme === "dark" ? "bg-gray-900" : "bg-white"
      }`}
      aria-label="Tren makanan populer"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-8">
          <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>
            Tren Makanan Populer
          </h2>
          <p className={`text-sm ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>
            Lihat produk yang sedang naik daun minggu ini
          </p>
        </header>

        <div className="relative min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.article
              key={currentIndex}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className={`p-6 rounded-2xl border ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700 shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
                  : "bg-white border-gray-100 shadow-lg"
              }`}
              aria-live="polite"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <figure 
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                    theme === "dark" ? currentTrend.darkBgColor : currentTrend.bgColor
                  }`}
                  aria-hidden="true"
                >
                  <IconComponent className={`w-7 h-7 ${currentTrend.color}`} />
                </figure>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className={`text-xl font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {currentTrend.name}
                    </h3>
                    <span 
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        theme === "dark" ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-700"
                      }`}
                      aria-label={`Pertumbuhan ${currentTrend.growth}`}
                    >
                      <TrendingUp className="w-4 h-4 mr-1" aria-hidden="true" />
                      {currentTrend.growth}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {currentTrend.description}
                  </p>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        {/* Indicator dots */}
        <nav 
          className="flex justify-center gap-2 mt-6"
          aria-label="Navigasi tren"
        >
          {trendData.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-[#DC2626] w-8"
                  : theme === "dark"
                    ? "bg-gray-600 hover:bg-gray-500"
                    : "bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Lihat tren ${index + 1}: ${trendData[index].name}`}
              aria-current={index === currentIndex ? "true" : "false"}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}
