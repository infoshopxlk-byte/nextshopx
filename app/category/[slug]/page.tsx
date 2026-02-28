import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    let products = [];
    let categoryName = "Category";

    // Resolve dynamic params correctly in Next.js 15
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    try {
        // Since WooCommerce Product API filtering by category requires an ID and not a slug natively via `?category=`, 
        // we first fetch the category ID using its slug if the slug isn't "sale":
        let categoryId = null;

        if (slug === "sale") {
            // "Sale" isn't a strict category usually, it's a product status. Filter by on_sale
            categoryName = "Sale Items";
            const response = await api.get("products", {
                on_sale: true,
                per_page: 24,
                status: "publish",
            });
            products = response.data;
        } else {
            // Normal Categories
            const catResponse = await api.get("products/categories", {
                slug: slug
            });

            if (catResponse.data && catResponse.data.length > 0) {
                categoryId = catResponse.data[0].id;
                categoryName = catResponse.data[0].name;

                // Fetch Products for this Category ID
                const prodResponse = await api.get("products", {
                    category: categoryId,
                    per_page: 24,
                    status: "publish",
                });
                products = prodResponse.data;
            } else {
                // Formatting fallback name based on slug
                categoryName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
        }
    } catch (error) {
        console.error(`Error fetching products for category ${slug}:`, error);
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans w-full">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">{categoryName}</h1>
                    <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
                        Explore our selection of top-quality items in the {categoryName} collection designed specially for you.
                    </p>
                </div>

                {/* Product Grid */}
                {products.length === 0 ? (
                    <div className="text-center py-20 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found for "{categoryName}"</h3>
                        <p className="text-gray-500 mb-6">Check back soon, or explore our other exciting categories.</p>
                        <Link href="/" className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                            Return to Home
                        </Link>
                    </div>
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
                )}
            </div>
        </div>
    );
}
