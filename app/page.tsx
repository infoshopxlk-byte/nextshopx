import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";
import { Monitor, Keyboard, Mouse, Headphones, Laptop, Smartphone, Shirt, Utensils, Gamepad2, Armchair, Coffee, Gem, Sparkles, Baby, Tag, Truck, ShieldCheck, HeadphonesIcon } from "lucide-react";
import HeroCarousel from "@/app/components/HeroCarousel";

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

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-x-4 gap-y-10 sm:gap-6 lg:gap-8 justify-center">
            {[
              { name: "Accessories", icon: Laptop, colorFrom: "from-blue-100", textColor: "text-blue-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(37,99,235,0.3)]", href: "/category/accessories" },
              { name: "Cell Phones", icon: Smartphone, colorFrom: "from-sky-100", textColor: "text-sky-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(14,165,233,0.3)]", href: "/category/cell-phones" },
              { name: "Fashion", icon: Shirt, colorFrom: "from-pink-100", textColor: "text-pink-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(236,72,153,0.3)]", href: "/category/fashion" },
              { name: "Kitchen", icon: Utensils, colorFrom: "from-orange-100", textColor: "text-orange-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(249,115,22,0.3)]", href: "/category/kitchen" },
              { name: "Toys & Games", icon: Gamepad2, colorFrom: "from-indigo-100", textColor: "text-indigo-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(99,102,241,0.3)]", href: "/category/games-puzzles" },
              { name: "Furniture", icon: Armchair, colorFrom: "from-amber-100", textColor: "text-amber-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(245,158,11,0.3)]", href: "/category/furniture" },
              { name: "Appliances", icon: Coffee, colorFrom: "from-emerald-100", textColor: "text-emerald-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(16,185,129,0.3)]", href: "/category/appliances" },
              { name: "Jewelry", icon: Gem, colorFrom: "from-purple-100", textColor: "text-purple-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(168,85,247,0.3)]", href: "/category/jewelry" },
              { name: "Beauty", icon: Sparkles, colorFrom: "from-rose-100", textColor: "text-rose-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(244,63,94,0.3)]", href: "/category/beauty" },
              { name: "Baby Care", icon: Baby, colorFrom: "from-cyan-100", textColor: "text-cyan-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(6,182,212,0.3)]", href: "/category/baby-care" },
              { name: "Sale!", icon: Tag, colorFrom: "from-red-200", textColor: "text-red-600", hoverShadow: "group-hover:shadow-[0_15px_30px_-10px_rgba(220,38,38,0.5)]", href: "/category/sale", isSale: true },
            ].map((cat, idx) => (
              <Link key={idx} href={cat.href} className="group flex flex-col items-center">
                <div
                  className={`w-24 h-24 md:w-32 md:h-32 rounded-full relative flex items-center justify-center mb-4 transition-all duration-300 group-hover:-translate-y-2 ${cat.hoverShadow} bg-white/40 backdrop-blur-xl border border-white shadow-xl shadow-gray-200/50 overflow-hidden ${cat.isSale ? 'animate-pulse ring-4 ring-red-100' : ''}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.colorFrom} to-transparent opacity-50`}></div>
                  <cat.icon className={`w-10 h-10 md:w-14 md:h-14 ${cat.textColor} relative z-10 group-hover:scale-110 transition-transform duration-300`} strokeWidth={1.5} />
                </div>
                <span className={`text-sm md:text-base font-bold transition-colors text-center px-2 ${cat.isSale ? 'text-red-600' : 'text-gray-900 group-hover:text-blue-600'}`}>
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section >

      {/* Trust Badges Bar */}
      <section className="w-full bg-gray-50 py-10 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-center gap-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <Truck className="w-10 h-10 text-blue-600" />
              <div>
                <h4 className="font-bold text-gray-900 text-lg">Islandwide Delivery</h4>
                <p className="text-sm text-gray-500 font-medium">Fast & reliable shipping</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <ShieldCheck className="w-10 h-10 text-emerald-600" />
              <div>
                <h4 className="font-bold text-gray-900 text-lg">7 Day Returns</h4>
                <p className="text-sm text-gray-500 font-medium">Shop with confidence</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-5 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <HeadphonesIcon className="w-10 h-10 text-purple-600" />
              <div>
                <h4 className="font-bold text-gray-900 text-lg">Expert Support</h4>
                <p className="text-sm text-gray-500 font-medium">24/7 customer service</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Product Grid */}
      < main id="latest-arrivals" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" >
        <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">Latest Arrivals</h2>

        {
          products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No products found. Please check your WooCommerce connection.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product: any) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-blue-100 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full relative"
                >
                  {/* Product Image */}
                  <div className="relative w-full aspect-square bg-white overflow-hidden group-hover:bg-gray-50 transition-colors duration-300 border-b border-gray-50">
                    {/* Badges */}
                    {product.on_sale ? (
                      <div className="absolute top-3 left-3 z-10 bg-white text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                        Sale
                      </div>
                    ) : (
                      <div className="absolute top-3 left-3 z-10 bg-white text-gray-900 border border-gray-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                        New
                      </div>
                    )}

                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0].src}
                        alt={product.images[0].alt || product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-400 font-medium">
                        No Image
                      </div>
                    )}

                    {/* Quick View Overlay (Lightened) */}
                    <Link href={`/product/${product.slug}`} className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                      <div className="translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white border border-gray-200 text-gray-900 font-bold text-sm px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-600 hover:text-white hover:border-blue-600 pointer-events-auto">
                        <span className="hidden sm:inline">Quick</span> View
                      </div>
                    </Link>
                  </div>

                  {/* Product Details */}
                  <div className="p-5 flex flex-col flex-1 z-30 bg-white">
                    <div className="mb-2 flex justify-between items-start">
                      {/* Vendor Name */}
                      {product.wcfm_store_info && product.wcfm_store_info.store_name ? (
                        <Link href={`/store/${product.wcfm_store_info.store_name.toLowerCase().replace(/\s+/g, '-')}`} className="text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors pointer-events-auto relative z-20">
                          {product.wcfm_store_info.store_name}
                        </Link>
                      ) : product.store && product.store.shop_name ? (
                        <Link href={`/store/${product.store.shop_name.toLowerCase().replace(/\s+/g, '-')}`} className="text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors pointer-events-auto relative z-20">
                          {product.store.shop_name}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">
                          ShopX Direct
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors duration-300">
                      <Link href={`/product/${product.slug}`} className="before:absolute before:inset-0 before:z-0">
                        {product.name}
                      </Link>
                    </h3>

                    <div className="flex flex-col mb-5 relative z-10 pointer-events-none mt-auto">
                      <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-lg md:text-xl font-black text-gray-900 tracking-tight">
                          Rs. {parseFloat(product.price || "0").toLocaleString('en-LK')}
                        </span>
                        {product.regular_price && product.regular_price !== product.price && (
                          <span className="text-xs font-bold text-gray-400 line-through">
                            {parseFloat(product.regular_price).toLocaleString('en-LK')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-gray-500 mt-1.5 flex items-center gap-1">
                        or 3 x Rs. {((parseFloat(product.price || "0") * 1.13) / 3).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with
                        <span className="text-pink-600 font-black italic tracking-tighter bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">KOKO</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </main >
    </div >
  );
}
