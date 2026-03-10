import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";
import { Monitor, Keyboard, Mouse, Headphones, Laptop, Smartphone, Shirt, Utensils, Gamepad2, Armchair, Coffee, Gem, Sparkles, Baby, Tag, Truck, ShieldCheck, HeadphonesIcon, Wrench } from "lucide-react";
import HeroCarousel from "@/app/components/HeroCarousel";
import ProductGrid from "@/app/components/ProductGrid";

export default async function Home() {
  // Fetch the latest 12 products from WooCommerce
  let products = [];
  try {
    const response = await api.get("products", {
      per_page: 12,
      status: "publish",
    });
    products = response.data;
  } catch (error) {
    console.error("Error fetching products from WooCommerce:", error);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Container for Hero */}
      <div className="w-full bg-white pt-4 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HeroCarousel />
      </div>

      {/* Categories Section */}
      < section className="w-full bg-white py-12" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Browse by Category</h2>
            <p className="mt-2 text-gray-500 text-lg">Find exactly what you need for your setup</p>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-6 sm:gap-6 lg:gap-8 justify-center">
            {[
              { name: "Computer Accessories", icon: Laptop, colorFrom: "from-blue-100", textColor: "text-blue-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(37,99,235,0.3)]", href: "/category/accessories" },
              { name: "Cell Phones", icon: Smartphone, colorFrom: "from-sky-100", textColor: "text-sky-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(14,165,233,0.3)]", href: "/category/cell-phones" },
              { name: "Fashion", icon: Shirt, colorFrom: "from-pink-100", textColor: "text-pink-600", hoverShadow: "group-hover:shadow-[0_15px_30_30px_-10px_rgba(236,72,153,0.3)]", href: "/category/fashion" },
              { name: "Kitchen", icon: Utensils, colorFrom: "from-orange-100", textColor: "text-orange-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(249,115,22,0.3)]", href: "/category/kitchen" },
              { name: "Toys & Games", icon: Gamepad2, colorFrom: "from-indigo-100", textColor: "text-indigo-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(99,102,241,0.3)]", href: "/category/games-puzzles" },
              { name: "Furniture", icon: Armchair, colorFrom: "from-amber-100", textColor: "text-amber-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(245,158,11,0.3)]", href: "/category/furniture" },
              { name: "Appliances", icon: Coffee, colorFrom: "from-emerald-100", textColor: "text-emerald-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(16,185,129,0.3)]", href: "/category/appliances" },
              { name: "Jewelry", icon: Gem, colorFrom: "from-purple-100", textColor: "text-purple-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(168,85,247,0.3)]", href: "/category/jewelry" },
              { name: "Beauty", icon: Sparkles, colorFrom: "from-rose-100", textColor: "text-rose-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(244,63,94,0.3)]", href: "/category/beauty" },
              { name: "Baby Care", icon: Baby, colorFrom: "from-cyan-100", textColor: "text-cyan-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(6,182,212,0.3)]", href: "/category/baby-care" },
              { name: "Hardware Tools", icon: Wrench, colorFrom: "from-slate-200", textColor: "text-slate-700", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(71,85,105,0.3)]", href: "/category/hardware-tools" },
              { name: "Sale!", icon: Tag, colorFrom: "from-red-200", textColor: "text-red-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(220,38,38,0.5)]", href: "/category/sale", isSale: true },
            ].map((cat, idx) => (
              <Link key={idx} href={cat.href} className="group flex flex-col items-center">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full relative flex items-center justify-center mb-3 transition-all duration-300 group-hover:-translate-y-2 ${cat.hoverShadow} bg-white/40 backdrop-blur-xl border border-white shadow-xl shadow-gray-200/50 overflow-hidden ${cat.isSale ? 'animate-pulse ring-4 ring-red-100' : ''}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.colorFrom} to-transparent opacity-50`}></div>
                  <cat.icon className={`w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 ${cat.textColor} relative z-10 group-hover:scale-110 transition-transform duration-300`} strokeWidth={1.5} />
                </div>
                <span className={`text-[11px] sm:text-xs md:text-base font-bold transition-colors text-center px-1 ${cat.isSale ? 'text-red-600' : 'text-gray-900 group-hover:text-blue-600'}`}>
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section >

      {/* Trust Badges Bar */}
      <section className="w-full bg-gray-50 py-8 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="flex items-center justify-start sm:justify-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <Truck className="w-8 h-8 text-blue-600 shrink-0" />
              <div>
                <h4 className="font-bold text-gray-900 text-sm md:text-lg">Islandwide Delivery</h4>
                <p className="text-[10px] md:text-sm text-gray-500 font-medium">Fast & reliable shipping</p>
              </div>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-gray-900 text-sm md:text-lg">7 Day Returns</h4>
                <p className="text-[10px] md:text-sm text-gray-500 font-medium">Shop with confidence</p>
              </div>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <HeadphonesIcon className="w-8 h-8 text-purple-600 shrink-0" />
              <div>
                <h4 className="font-bold text-gray-900 text-sm md:text-lg">Expert Support</h4>
                <p className="text-[10px] md:text-sm text-gray-500 font-medium">24/7 customer service</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Product Grid */}
      <div id="latest-arrivals" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8 border-b pb-4">Latest Arrivals</h2>
        <ProductGrid products={products} emptyMessage="No products found. Please check your WooCommerce connection." />
      </div>
    </div >
  );
}
