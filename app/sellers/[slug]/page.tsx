import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";
import axios from "axios";

export default async function SellerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    let products: any[] = [];
    let sellerInfo: any = null;
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    // Direct WordPress URL for user/vendor lookup
    const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://shopx.lk";

    try {
        console.log(`[DEBUG] Dynamic Fetch started for slug: ${slug}`);

        let vendorId = null;
        let userData: any = null;

        // 1. DYNAMIC LOOKUP: Find the WordPress User/Vendor by slug
        try {
            const userRes = await axios.get(`${WP_URL}/wp-json/wp/v2/users`, {
                params: { slug: slug }
            });

            if (userRes.data && userRes.data.length > 0) {
                userData = userRes.data[0];
                vendorId = userData.id;
                console.log(`[DEBUG] User found via API: ${userData.name} (ID: ${vendorId})`);
            }
        } catch (err) {
            console.error("[DEBUG] wp/v2/users lookup failed:", err);
        }

        // 2. FALLBACK: If not found by slug, try searching for products with this name to extract vendor info
        if (!vendorId) {
            const searchName = slug.replace(/-/g, ' ');
            console.log(`[DEBUG] Attempting fallback search for: ${searchName}`);

            const initialSearch = await api.get("products", {
                search: searchName,
                per_page: 5,
                status: "publish"
            });

            if (initialSearch.data && initialSearch.data.length > 0) {
                const bestMatch = initialSearch.data.find((p: any) =>
                    (p.wcfm_store_info?.store_name?.toLowerCase().replace(/\s+/g, '-') === slug) ||
                    (p.store?.shop_name?.toLowerCase().replace(/\s+/g, '-') === slug)
                ) || initialSearch.data[0];

                sellerInfo = bestMatch.wcfm_store_info || bestMatch.store;
                vendorId = sellerInfo?.vendor_id || bestMatch.author;
                console.log(`[DEBUG] Fallback found vendorId: ${vendorId}`);
            }
        } else {
            // Map userData to sellerInfo format
            sellerInfo = {
                store_name: userData.name,
                store_logo: userData.avatar_urls?.['96'] || userData.avatar_urls?.['48'],
                store_description: userData.description,
                vendor_id: userData.id,
                gravatar: userData.avatar_urls?.['96']
            };
        }

        // 3. FETCH PRODUCTS: Use the discovered vendorId
        if (vendorId) {

            // Helper function to strictly filter products by Vendor ID natively in Next.js
            // This prevents the WooCommerce REST API from bleeding global products if it ignores the parameter.
            const filterProducts = (rawProducts: any[], targetVendorId: any) => {
                return rawProducts.filter((product: any) => {
                    const productVendorId = product.wcfm_store_info?.vendor_id || product.store?.vendor_id || product.author;
                    return String(productVendorId) === String(targetVendorId);
                });
            };

            // Try 'vendor' parameter (WCFM style)
            const response = await api.get("products", {
                vendor: vendorId,
                per_page: 100, // Fetch more to ensure we have a good pool to filter from
                status: "publish"
            });

            products = filterProducts(response.data, vendorId);

            // Fallback: Try 'author' parameter (standard WooCommerce vendor mapping)
            if (products.length === 0) {
                const authorResponse = await api.get("products", {
                    author: vendorId,
                    per_page: 100,
                    status: "publish"
                });
                products = filterProducts(authorResponse.data, vendorId);
            }

            console.log(`[DEBUG] Final catalog size for ${vendorId}: ${products.length}`);

            // Ensure we have some seller name if still missing
            if (!sellerInfo && products.length > 0) {
                sellerInfo = products[0].wcfm_store_info || products[0].store;
            }
        }
    } catch (error) {
        console.error(`[ERROR] Dynamic Seller Profile (${slug}):`, error);
    }

    if (!sellerInfo && products.length === 0) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center p-8 bg-white">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Store Not Found</h1>
                <p className="mt-2 text-gray-500 max-w-xs text-center">We couldn't find a valid seller profile for "{slug.replace(/-/g, ' ')}".</p>
                <Link href="/" className="mt-8 rounded-full bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200">
                    Back to ShopX Home
                </Link>
            </div>
        );
    }

    const storeName = sellerInfo?.store_name || sellerInfo?.shop_name || slug.replace(/-/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <div className="min-h-screen bg-white">
            {/* Seller Header Section */}
            <div className="bg-gray-50 border-b border-gray-100 py-12 md:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        {/* Seller Logo */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-white shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex items-center justify-center p-3 relative shrink-0 transform hover:scale-105 transition-transform duration-500">
                            <Image
                                src={sellerInfo?.gravatar || sellerInfo?.store_logo || "https://shopx.lk/wp-content/uploads/2026/02/shopx-placeholder.png"}
                                alt={storeName}
                                fill
                                className="object-contain p-4"
                                unoptimized={!!sellerInfo?.gravatar} // Opt-out of optimization for Gravatar if needed, though remotePatterns should work
                            />
                        </div>

                        {/* Seller Text Info */}
                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-gray-900 tracking-tighter mb-4">
                                {storeName}
                            </h1>
                            <div
                                className="text-gray-600 text-sm sm:text-lg max-w-2xl font-medium leading-relaxed mb-8 prose prose-sm sm:prose-base prose-gray"
                                dangerouslySetInnerHTML={{ __html: sellerInfo?.store_description || "Premium ShopX verified vendor. Explore our curated selection of high-quality products available with easy KOKO installments." }}
                            />

                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 text-xs font-black uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Verified Seller
                                </div>
                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-100 text-xs font-black uppercase tracking-wider">
                                    {products.length}+ Items
                                </div>
                                <div className="flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-2 rounded-full border border-pink-100 text-xs font-black uppercase tracking-wider">
                                    KOKO Available
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seller Products Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Store Catalog</h2>
                        <p className="text-gray-500 mt-2 font-medium">Browse through all products from {storeName}</p>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold text-lg">This seller hasn't listed any products yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="group bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 flex flex-col h-full relative"
                            >
                                {/* Product Image */}
                                <div className="relative w-full aspect-square bg-white border-b border-gray-50 overflow-hidden group-hover:bg-gray-50 transition-colors">
                                    <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex flex-col gap-2">
                                        {product.on_sale && (
                                            <div className="bg-white text-red-600 border border-red-100 text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm">
                                                Sale
                                            </div>
                                        )}
                                        <div className="bg-white text-blue-600 border border-blue-100 text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm">
                                            New
                                        </div>
                                    </div>

                                    {product.images && product.images.length > 0 ? (
                                        <Image
                                            src={product.images[0].src}
                                            alt={product.images[0].alt || product.name}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                            className="object-contain p-4 md:p-8 group-hover:scale-110 transition-transform duration-700 ease-out"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-gray-400 font-medium text-xs">No Image Available</div>
                                    )}

                                    <Link href={`/product/${product.slug}`} className="absolute inset-0 z-20"></Link>
                                </div>

                                <div className="p-4 md:p-6 flex flex-col flex-1 bg-white">
                                    <h3 className="text-[13px] md:text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors duration-300">
                                        <Link href={`/product/${product.slug}`} className="relative z-30">
                                            {product.name}
                                        </Link>
                                    </h3>

                                    <div className="mt-auto pt-4 relative z-30">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-base md:text-2xl font-black text-gray-900 tracking-tighter">
                                                Rs. {parseFloat(product.price || "0").toLocaleString('en-LK')}
                                            </span>
                                            {product.regular_price && product.regular_price !== product.price && (
                                                <span className="text-[10px] md:text-xs font-bold text-gray-400 line-through">
                                                    {parseFloat(product.regular_price).toLocaleString('en-LK')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] md:text-[12px] font-bold text-gray-500 mt-2 flex flex-wrap items-center gap-1 leading-tight tracking-tight">
                                            <span>or 3 x Rs. {((parseFloat(product.price || "0") * 1.13) / 3).toLocaleString('en-LK', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} with</span>
                                            <span className="text-pink-600 font-black italic tracking-tighter bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100 scale-90 md:scale-100">KOKO</span>
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
