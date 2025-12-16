"use client";

import Navbar from "@/components/ui/Navbar";
import { HeroSection, FeaturesSection } from "./HeroSection";
import { TrendShowcase } from "./TrendShowcase";
import { useTheme } from "@/lib/theme-context";

export function LandingWrapper() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen selection:bg-[#DC2626] selection:text-white transition-colors duration-300 ${
      theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"
    }`}>
      <Navbar />
      
      <main id="main-content">
        <HeroSection />
        <FeaturesSection />
        <TrendShowcase />
      </main>

      <footer 
        className={`py-8 border-t text-center transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-900 border-gray-800" 
            : "bg-white border-gray-100"
        }`}
        role="contentinfo"
      >
        <p className={theme === "dark" ? "text-gray-500" : "text-gray-500"}>
          © {new Date().getFullYear()} Megaw AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
