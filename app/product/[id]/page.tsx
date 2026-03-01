import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";
import CartActionButtons from "@/app/components/CartActionButtons";
import ProductGrid from "@/app/components/ProductGrid";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    let product = null;
    let relatedProducts = [];
    let slug = "";

    try {
        // Await params first (Next.js 15 dynamic routing best practice)
        const resolvedParams = await params;
        slug = resolvedParams.id;

        // 1. Fetch the main product data by slug
        const { data } = await api.get('products', { slug: slug });

        // WooCommerce returns an array for queries, extract the first one
        if (data && data.length > 0) {
            product = data[0];
        }

        // 2. Fetch related products (using the first category if available)
        if (product && product.categories && product.categories.length > 0) { // Added product check here
            const categoryId = product.categories[0].id;
            const relatedResponse = await api.get("products", {
                category: categoryId,
                per_page: 4,
                exclude: [product.id], // Don't show the current product in related
                status: "publish",
            });
            relatedProducts = relatedResponse.data;
        }
    } catch (error) {
        console.error(`Error fetching product ${slug || "unknown"}:`, error);
    }

    if (!product) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center p-8 bg-white">
                <h1 className="text-2xl font-bold text-gray-900">Product Not Found</h1>
                <p className="mt-2 text-gray-500">The product you are looking for does not exist or has been removed.</p>
                <Link href="/" className="mt-6 rounded-full bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition">
                    Back to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Breadcrumbs */}
            <div className="mb-6 flex items-center space-x-2 text-sm text-gray-500">
                <Link href="/" className="hover:text-blue-600">Home</Link>
                <span>/</span>
                {product.categories && product.categories.length > 0 && (
                    <>
                    </>
                )}
                <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
            </div>

            {/* Main Product Section - 2 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
                {/* Left Column: Product Image */}
                <div className="flex flex-col space-y-4">
                    <div className="relative aspect-square w-full rounded-2xl bg-white overflow-hidden border border-gray-100 shadow-sm">
                        {product.images && product.images.length > 0 ? (
                            <Image
                                src={product.images[0].src}
                                alt={product.images[0].alt || product.name}
                                fill
                                priority
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-contain p-4"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                                No Image Available
                            </div>
                        )}
                    </div>
                    {/* Optional: Gallery thumbnails could go here */}
                </div>

                {/* Right Column: Product Details */}
                <div className="flex flex-col py-4">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                        {product.name}
                    </h1>

                    <div className="mb-6 border-b border-gray-100 pb-6">
                        <div className="flex items-baseline mb-2">
                            <span className="text-3xl font-black text-gray-900">
                                Rs. {parseFloat(product.price || "0").toLocaleString('en-LK')}
                            </span>
                            {product.regular_price && product.regular_price !== product.price && (
                                <span className="ml-3 text-lg text-gray-400 line-through">
                                    Rs. {parseFloat(product.regular_price).toLocaleString('en-LK')}
                                </span>
                            )}
                        </div>
                        <div className="text-sm font-bold text-gray-600 mb-2">
                            or 3 x Rs. {((parseFloat(product.price || "0") * 1.13) / 3).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with <span className="text-pink-600 font-black italic tracking-tighter bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">KOKO</span>
                        </div>
                        <div className="text-sm font-bold text-gray-600 mb-4">
                            or 4 x Rs. {((parseFloat(product.price || "0") * 1.13) / 4).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with <span className="text-indigo-700 font-black tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">PayZy</span>
                        </div>
                        {product.short_description && (
                            <div
                                className="mt-4 text-sm text-gray-600 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: product.short_description }}
                            />
                        )}
                    </div>

                    <div className="mb-6 space-y-4">
                        <div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${product.stock_status === 'instock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                                {product.stock_quantity ? ` (${product.stock_quantity} available)` : ''}
                            </span>
                        </div>

                        {product.wcfm_store_info && product.wcfm_store_info.store_name ? (
                            <div className="flex items-center border border-gray-100 rounded-xl bg-gray-50 p-4">
                                <span className="text-sm text-gray-500 mr-2">Sold by:</span>
                                <Link
                                    href={`/sellers/${product.wcfm_store_info.store_name.toLowerCase().replace(/\s+/g, '-')}`}
                                    className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors focus:outline-none"
                                >
                                    {product.wcfm_store_info.store_name}
                                </Link>
                            </div>
                        ) : product.store && product.store.shop_name ? (
                            <div className="flex items-center border border-gray-100 rounded-xl bg-gray-50 p-4">
                                <span className="text-sm text-gray-500 mr-2">Sold by:</span>
                                <Link
                                    href={`/sellers/${product.store.shop_name.toLowerCase().replace(/\s+/g, '-')}`}
                                    className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors focus:outline-none"
                                >
                                    {product.store.shop_name}
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center border border-gray-100 rounded-xl bg-gray-50 p-4">
                                <span className="text-sm text-gray-500 mr-2">Sold by:</span>
                                <span className="text-base font-semibold text-gray-900">
                                    ShopX Direct
                                </span>
                            </div>
                        )}
                    </div>

                    <CartActionButtons product={product} />

                    {/* Product Description */}
                    <div className="mt-4 border-t border-gray-100 pt-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                        <div
                            className="prose prose-sm sm:prose-base text-gray-600 max-w-none"
                            dangerouslySetInnerHTML={{ __html: product.description || product.short_description || '<p>No description available.</p>' }}
                        />
                    </div>
                </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div className="mt-24 border-t border-gray-100 pt-16 relative z-10">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
                    <ProductGrid products={relatedProducts} emptyMessage="No related products found." />
                </div>
            )}
        </div>
    );
}
