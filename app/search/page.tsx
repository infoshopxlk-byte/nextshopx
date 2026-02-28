import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";

    let products = [];
    try {
        if (q) {
            const response = await api.get("products", {
                search: q,
                status: "publish",
            });
            products = response.data;
        }
    } catch (error) {
        console.error("Error fetching search results:", error);
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8 border-b pb-6">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                    Search Results
                </h1>
                <p className="mt-2 text-gray-500 font-medium">
                    {q ? (
                        <>Showing {products.length} results for <span className="text-gray-900 font-bold">"{q}"</span></>
                    ) : (
                        "Please enter a search term to find products."
                    )}
                </p>
            </div>

            {/* Results Grid */}
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No products found</h2>
                    <p className="text-gray-500 max-w-md">
                        We couldn't find anything matching "{q}". Try adjusting your search term or browse our categories.
                    </p>
                    <Link href="/" className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                        Back to Home
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((product: any) => (
                        <div
                            key={product.id}
                            className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-blue-100 transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full relative"
                        >
                            {/* Product Image */}
                            <div className="relative w-full aspect-square bg-gray-50 overflow-hidden group-hover:bg-gray-100 transition-colors duration-300">
                                {/* Badges */}
                                {product.on_sale && (
                                    <div className="absolute top-4 left-4 z-10 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                                        Sale
                                    </div>
                                )}

                                {product.images && product.images.length > 0 ? (
                                    <Image
                                        src={product.images[0].src}
                                        alt={product.images[0].alt || product.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                        className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full text-gray-400 font-medium">
                                        No Image
                                    </div>
                                )}

                                {/* Quick View Overlay */}
                                <Link href={`/product/${product.slug}`} className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                                    <div className="translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white/95 backdrop-blur-sm text-gray-900 font-bold text-sm px-6 py-2.5 rounded-full shadow-xl flex items-center gap-2 hover:bg-blue-600 hover:text-white">
                                        <span className="hidden sm:inline">Quick</span> View
                                    </div>
                                </Link>
                            </div>

                            {/* Product Details */}
                            <div className="p-5 md:p-6 flex flex-col flex-1 z-30 bg-white">
                                <div className="mb-3 flex justify-between items-start">
                                    {product.store && product.store.shop_name ? (
                                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">
                                            {product.store.shop_name}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">
                                            ShopX Direct
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-2 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 transition-colors duration-300">
                                    <Link href={`/product/${product.slug}`} className="before:absolute before:inset-0 before:z-0">
                                        {product.name}
                                    </Link>
                                </h3>

                                <div className="flex items-baseline gap-2 mt-auto pt-2 mb-5 relative z-10 pointer-events-none">
                                    <span className="text-2xl font-black text-gray-900 tracking-tight">
                                        Rs. {parseFloat(product.price || "0").toLocaleString('en-LK')}
                                    </span>
                                    {product.regular_price && product.regular_price !== product.price && (
                                        <span className="text-sm font-bold text-gray-400 line-through">
                                            {parseFloat(product.regular_price).toLocaleString('en-LK')}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto relative z-20">
                                    <Link href={`/product/${product.slug}`} className="block w-full py-3.5 bg-gray-900 text-white text-center font-bold rounded-xl shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:bg-blue-600 transition-all duration-300 active:scale-[0.98] relative overflow-hidden group/btn">
                                        <span className="relative z-10">Product Details</span>
                                        <div className="absolute inset-0 h-full w-full bg-blue-600 transform scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300 origin-left"></div>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
